/* TTS SHOW/HIDE */
const ttsWrapper = document.getElementById("ttsWrapper");
const toggleTtsDockBtn = document.getElementById("toggleTtsDockBtn");
const ttsChapterLabel = document.getElementById("ttsChapterLabel");

if (toggleTtsDockBtn && ttsWrapper) {
  toggleTtsDockBtn.addEventListener("click", function () {
    ttsWrapper.classList.toggle("collapsed");

    if (ttsWrapper.classList.contains("collapsed")) {
      toggleTtsDockBtn.textContent = "✦ Show Audio";
    } else {
      toggleTtsDockBtn.textContent = "✦ Hide Audio";
    }
  });
}

function updateChapterLabel() {
  if (!ttsChapterLabel) {
    return;
  }

  if (currentChapterIndex === 0) {
    ttsChapterLabel.textContent = "Chapter 1 of 2";
  } else if (currentChapterIndex === 1) {
    ttsChapterLabel.textContent = "Chapter 2 of 2";
  }
}

const canvas = document.getElementById("aiOrbCanvas");

if (canvas) {
  const ctx = canvas.getContext("2d");

  const playBtn = document.getElementById("playBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const backBtn = document.getElementById("backBtn");
  const forwardBtn = document.getElementById("forwardBtn");

  const speedRange = document.getElementById("speedRange");
  const volumeRange = document.getElementById("volumeRange");
  const speedValue = document.getElementById("speedValue");
  const voiceMood = document.getElementById("voiceMood");

  const progressBar = document.getElementById("progressBar");
  const progressStart = document.getElementById("progressStart");
  const ttsStatus = document.getElementById("ttsStatus");
  const ttsChapterLabel = document.getElementById("ttsChapterLabel");

  let voices = [];
  let utterance = null;
  let activeVoice = null;

  let isSpeaking = false;
  let isPaused = false;
  let isManualStop = false;

  let speechEnergy = 0;
  let pulseBoost = 0;
  let time = 0;
  let animationFrameId = null;

  let fullText = "";
  let currentTextLength = 0;
  let spokenCharIndex = 0;
  let speechStartTimestamp = 0;
  let approxDurationMs = 1;
  let rafProgressId = null;
  let hasBoundaryEvents = false;

  let paragraphMap = [];
  let currentHighlightedParagraph = null;
  let chapterProgress = {};

  function getCurrentChapterIndex() {
    const activeChapter = document.querySelector(".chapter-panel.active-chapter");
    if (!activeChapter) return 0;
    if (activeChapter.id === "chapter1") return 0;
    if (activeChapter.id === "chapter2") return 1;
    return 0;
  }

  function saveCurrentChapterProgress() {
    const chapterIndex = getCurrentChapterIndex();
    chapterProgress[chapterIndex] = spokenCharIndex;
  }

  function loadChapterProgress(chapterIndex) {
    return chapterProgress[chapterIndex] || 0;
  }

  function getActiveStoryTextElement() {
    const activeChapter = document.querySelector(".chapter-panel.active-chapter");
    if (activeChapter) {
      return activeChapter.querySelector("div[id^='storyText']");
    }
    return null;
  }

  function updateChapterLabel() {
    if (!ttsChapterLabel) return;

    const activeChapter = document.querySelector(".chapter-panel.active-chapter");
    if (!activeChapter) return;

    if (activeChapter.id === "chapter1") {
      ttsChapterLabel.textContent = "Chapter 1 of 2";
    } else if (activeChapter.id === "chapter2") {
      ttsChapterLabel.textContent = "Chapter 2 of 2";
    }
  }

  function getStoryText() {
    const activeStoryText = getActiveStoryTextElement();
    if (activeStoryText) {
      return activeStoryText.innerText.trim().replace(/\s+/g, " ");
    }
    return "";
  }

  function buildParagraphMap() {
    paragraphMap = [];
    const activeStoryText = getActiveStoryTextElement();
    if (!activeStoryText) return;

    const paragraphs = activeStoryText.querySelectorAll("p");
    let charCount = 0;

    paragraphs.forEach(function (p) {
      const text = p.innerText.trim().replace(/\s+/g, " ");
      const startChar = charCount;
      const endChar = charCount + text.length;

      paragraphMap.push({
        element: p,
        startChar: startChar,
        endChar: endChar
      });

      charCount = endChar + 1;
    });
  }

  function highlightCurrentParagraph(charIndex) {
    if (paragraphMap.length === 0) return;

    let targetParagraph = null;

    for (let i = 0; i < paragraphMap.length; i++) {
      if (charIndex >= paragraphMap[i].startChar && charIndex <= paragraphMap[i].endChar) {
        targetParagraph = paragraphMap[i].element;
        break;
      }
    }

    if (targetParagraph !== currentHighlightedParagraph) {
      if (currentHighlightedParagraph) {
        currentHighlightedParagraph.classList.remove("reading-highlight");
      }

      if (targetParagraph) {
        targetParagraph.classList.add("reading-highlight");
        targetParagraph.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      currentHighlightedParagraph = targetParagraph;
    }
  }

  function clearHighlight() {
    if (currentHighlightedParagraph) {
      currentHighlightedParagraph.classList.remove("reading-highlight");
      currentHighlightedParagraph = null;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateStatus(text) {
    if (ttsStatus) {
      ttsStatus.setAttribute("data-status", text);
    }
  }

  function populateVoices() {
    voices = speechSynthesis.getVoices();
    activeVoice = pickVoiceForPreset();
  }

  function scoreVoice(voice, preset) {
    const name = (voice.name || "").toLowerCase();
    const lang = (voice.lang || "").toLowerCase();
    let score = 0;

    if (lang.startsWith("en")) score += 100;
    if (voice.default) score += 20;

    if (preset === "narrator") {
      if (name.includes("david") || name.includes("mark") || name.includes("george")) score += 20;
    } else if (preset === "soft" || preset === "warm") {
      if (name.includes("zira") || name.includes("hazel") || name.includes("susan")) score += 20;
    } else if (preset === "energetic") {
      if (name.includes("aria") || name.includes("jenny")) score += 20;
    }

    return score;
  }

  function pickVoiceForPreset() {
    if (!voices.length) return null;

    const preset = voiceMood ? voiceMood.value : "calm";
    let bestVoice = voices[0];
    let bestScore = -Infinity;

    voices.forEach(function (voice) {
      const score = scoreVoice(voice, preset);
      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    });

    return bestVoice;
  }

  function applyVoicePreset() {
    const preset = voiceMood ? voiceMood.value : "calm";

    if (preset === "calm") {
      speedRange.value = "0.95";
    } else if (preset === "warm") {
      speedRange.value = "1.00";
    } else if (preset === "narrator") {
      speedRange.value = "0.85";
    } else if (preset === "soft") {
      speedRange.value = "0.82";
    } else if (preset === "energetic") {
      speedRange.value = "1.15";
    }

    speedValue.textContent = `${parseFloat(speedRange.value).toFixed(1)}x`;
    activeVoice = pickVoiceForPreset();
  }

  function updateProgressDisplayByChars(charIndex) {
    if (!progressBar || currentTextLength <= 0) return;
    const ratio = clamp(charIndex / currentTextLength, 0, 1);
    progressBar.value = Math.round(ratio * 1000);
    if (progressStart) {
      progressStart.textContent = `${Math.round(ratio * 100)}%`;
    }
    saveCurrentChapterProgress();
  }

  function getCharIndexFromBar() {
    if (!progressBar || currentTextLength <= 0) return 0;
    const ratio = parseInt(progressBar.value, 10) / 1000;
    return Math.floor(ratio * currentTextLength);
  }

  function estimateDurationMs(textLength) {
    const speed = parseFloat(speedRange.value);
    const charsPerSecond = 16 * speed;
    return (textLength / charsPerSecond) * 1000;
  }

  function startSmoothProgressTracking(startIndex) {
    stopSmoothProgressTracking();

    speechStartTimestamp = performance.now();
    approxDurationMs = estimateDurationMs(currentTextLength - startIndex);

    function tick(now) {
      if (!isSpeaking || isPaused) return;

      if (hasBoundaryEvents) {
        rafProgressId = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - speechStartTimestamp;
      const ratio = clamp(elapsed / approxDurationMs, 0, 1);
      const currentApproxIndex = startIndex + Math.floor((currentTextLength - startIndex) * ratio);

      spokenCharIndex = Math.max(spokenCharIndex, currentApproxIndex);
      updateProgressDisplayByChars(spokenCharIndex);

      rafProgressId = requestAnimationFrame(tick);
    }

    rafProgressId = requestAnimationFrame(tick);
  }

  function stopSmoothProgressTracking() {
    if (rafProgressId) {
      cancelAnimationFrame(rafProgressId);
      rafProgressId = null;
    }
  }

  function cancelSpeechState() {
    speechSynthesis.cancel();
    isSpeaking = false;
    isPaused = false;
    stopSmoothProgressTracking();
    ttsWrapper.classList.remove("speaking");
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 130;
    const displayHeight = canvas.clientHeight || 130;

    canvas.width = Math.floor(displayWidth * dpr);
    canvas.height = Math.floor(displayHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawOrbIdle() {
    const w = canvas.clientWidth || 130;
    const h = canvas.clientHeight || 130;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.26;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(201, 141, 141, 0.18)";
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(207, 112, 112, 0.9)";
    ctx.stroke();
  }

  function simulateSpeechEnergy() {
    if (!isSpeaking || isPaused) {
      speechEnergy += (0 - speechEnergy) * 0.08;
      return;
    }

    const target =
      0.20 +
      Math.sin(time * 0.10) * 0.06 +
      Math.sin(time * 0.03 + 1.5) * 0.05 +
      Math.random() * 0.08 +
      pulseBoost;

    speechEnergy += (clamp(target, 0.04, 0.7) - speechEnergy) * 0.16;
    pulseBoost *= 0.84;
  }

  function drawOrb() {
    const w = canvas.clientWidth || 130;
    const h = canvas.clientHeight || 130;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.26;

    ctx.clearRect(0, 0, w, h);

    const points = 140;
    let i;

    ctx.beginPath();
    for (i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;

      const wave1 = Math.sin(angle * 4 + time * 0.04) * 3.2;
      const wave2 = Math.sin(angle * 7 - time * 0.025) * 1.8;
      const amplitude = speechEnergy * 10;
      const radius = baseRadius + wave1 + wave2 + amplitude;

      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(215, 116, 116, 0.95)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius - 7 + speechEnergy * 1.8, 0, Math.PI * 2);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(235, 179, 179, 0.8)";
    ctx.stroke();
  }

  function animate() {
    time += 1;
    simulateSpeechEnergy();
    drawOrb();
    animationFrameId = requestAnimationFrame(animate);
  }

  function startAnimationLoop() {
    if (!animationFrameId) animate();
  }

  function stopAnimationLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function getTextFromCharIndex(startIndex) {
    if (!fullText || startIndex <= 0) return fullText;
    return fullText.slice(startIndex).trim();
  }

  function speakFromCharIndex(startIndex) {
    const remainingText = getTextFromCharIndex(startIndex);

    if (!remainingText) {
      isSpeaking = false;
      isPaused = false;
      updateStatus("Finished");
      updateProgressDisplayByChars(currentTextLength);
      stopAnimationLoop();
      stopSmoothProgressTracking();
      ttsWrapper.classList.remove("speaking");
      drawOrbIdle();
      return;
    }

    spokenCharIndex = startIndex;

    utterance = new SpeechSynthesisUtterance(remainingText);
    utterance.rate = parseFloat(speedRange.value);
    utterance.pitch = 1;
    utterance.volume = parseFloat(volumeRange.value);

    if (activeVoice) utterance.voice = activeVoice;

    utterance.onstart = function () {
      isSpeaking = true;
      isPaused = false;
      hasBoundaryEvents = false;
      updateStatus("Speaking");
      ttsWrapper.classList.add("speaking");
      startAnimationLoop();
      startSmoothProgressTracking(startIndex);
    };

    utterance.onboundary = function (event) {
      if (typeof event.charIndex === "number") {
        hasBoundaryEvents = true;
        spokenCharIndex = startIndex + event.charIndex;
        updateProgressDisplayByChars(spokenCharIndex);
        highlightCurrentParagraph(spokenCharIndex);
      }
      pulseBoost = 0.18 + Math.random() * 0.18;
    };

    utterance.onend = function () {
      clearHighlight();

      if (isManualStop) {
        isManualStop = false;
        stopAnimationLoop();
        stopSmoothProgressTracking();
        ttsWrapper.classList.remove("speaking");
        drawOrbIdle();
        return;
      }

      spokenCharIndex = currentTextLength;
      updateProgressDisplayByChars(spokenCharIndex);

      isSpeaking = false;
      isPaused = false;
      updateStatus("Finished");
      stopAnimationLoop();
      stopSmoothProgressTracking();
      ttsWrapper.classList.remove("speaking");
      drawOrbIdle();
    };

    utterance.onerror = function () {
      clearHighlight();
      isSpeaking = false;
      isPaused = false;
      updateStatus("Error");
      stopAnimationLoop();
      stopSmoothProgressTracking();
      ttsWrapper.classList.remove("speaking");
      drawOrbIdle();
    };

    speechSynthesis.speak(utterance);
  }

  function startSpeechFromProgress() {
    fullText = getStoryText();
    currentTextLength = fullText.length;

    if (!fullText) {
      return;
    }

    buildParagraphMap();
    activeVoice = pickVoiceForPreset();

    const startIndex = getCharIndexFromBar();

    cancelSpeechState();
    speakFromCharIndex(startIndex);
  }

  function skipBySeconds(seconds) {
    fullText = getStoryText();
    currentTextLength = fullText.length;

    if (!fullText || currentTextLength <= 0) return;

    const speed = parseFloat(speedRange.value);
    const charsPerSecond = 16 * speed;
    const charOffset = Math.round(charsPerSecond * seconds);

    let targetIndex = spokenCharIndex + charOffset;
    targetIndex = clamp(targetIndex, 0, currentTextLength);

    updateProgressDisplayByChars(targetIndex);

    if (speechSynthesis.speaking || speechSynthesis.paused) {
      isManualStop = true;
      cancelSpeechState();
      stopAnimationLoop();
      drawOrbIdle();
      isManualStop = false;
      speakFromCharIndex(targetIndex);
    } else {
      spokenCharIndex = targetIndex;
    }
  }

  function resetTTSForChapterChange(newChapterIndex) {
    isManualStop = true;
    cancelSpeechState();
    stopAnimationLoop();
    drawOrbIdle();
    clearHighlight();

    fullText = getStoryText();
    currentTextLength = fullText.length;
    paragraphMap = [];

    const savedProgress = loadChapterProgress(newChapterIndex);
    spokenCharIndex = savedProgress;

    if (progressBar && currentTextLength > 0) {
      const ratio = clamp(savedProgress / currentTextLength, 0, 1);
      progressBar.value = Math.round(ratio * 1000);
      if (progressStart) {
        progressStart.textContent = `${Math.round(ratio * 100)}%`;
      }
    } else if (progressBar) {
      progressBar.value = 0;
      if (progressStart) progressStart.textContent = "0%";
    }

    updateChapterLabel();
    updateStatus("Idle");
  }

  window.resetTTSForChapterChange = resetTTSForChapterChange;

  if (voiceMood) {
    voiceMood.addEventListener("change", function () {
      applyVoicePreset();
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      isManualStop = false;
      startSpeechFromProgress();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        isPaused = true;
        isSpeaking = false;
        updateStatus("Paused");
        stopAnimationLoop();
        stopSmoothProgressTracking();
        ttsWrapper.classList.remove("speaking");
        drawOrbIdle();
        clearHighlight();
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      skipBySeconds(-3);
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener("click", function () {
      skipBySeconds(3);
    });
  }

  if (speedRange && speedValue) {
    speedRange.addEventListener("input", function () {
      speedValue.textContent = `${parseFloat(speedRange.value).toFixed(1)}x`;
    });
  }

  if (progressBar) {
    progressBar.addEventListener("input", function () {
      const ratio = parseInt(progressBar.value, 10) / 1000;
      if (progressStart) {
        progressStart.textContent = `${Math.round(ratio * 100)}%`;
      }
    });

    progressBar.addEventListener("change", function () {
      fullText = getStoryText();
      currentTextLength = fullText.length;

      spokenCharIndex = getCharIndexFromBar();

      if (speechSynthesis.speaking || speechSynthesis.paused) {
        isManualStop = true;
        cancelSpeechState();
        stopAnimationLoop();
        drawOrbIdle();
        isManualStop = false;
        speakFromCharIndex(spokenCharIndex);
      } else {
        updateProgressDisplayByChars(spokenCharIndex);
      }
    });
  }

  window.speechSynthesis.onvoiceschanged = populateVoices;
  window.addEventListener("resize", function () {
    resizeCanvas();
    if (!isSpeaking) {
      drawOrbIdle();
    }
  });

  resizeCanvas();
  populateVoices();
  applyVoicePreset();
  resetTTSForChapterChange(getCurrentChapterIndex());
  updateChapterLabel();
  updateStatus("Idle");
  drawOrbIdle();
}

updateChapterDisplay();