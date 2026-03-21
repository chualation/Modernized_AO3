/* TTS SHOW/HIDE */
const ttsWrapper = document.getElementById("ttsWrapper");
const toggleTtsDockBtn = document.getElementById("toggleTtsDockBtn");
const ttsChapterLabel = document.getElementById("ttsChapterLabel");
const aiOrbContainer = document.querySelector(".ai-orb-container");

function parseAudioEnabledFlag(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).toLowerCase().trim();
  if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") {
    return false;
  }
  if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") {
    return true;
  }

  return null;
}

const ttsBootstrapParams = new URLSearchParams(window.location.search);
const audioEnabledFromParam = parseAudioEnabledFlag(ttsBootstrapParams.get("audioEnabled"));
const audioEnabledFromBody = parseAudioEnabledFlag(document.body ? document.body.getAttribute("data-audio-enabled") : null);
const isAudioEnabled = audioEnabledFromParam !== null
  ? audioEnabledFromParam
  : (audioEnabledFromBody !== null ? audioEnabledFromBody : true);

if (!isAudioEnabled) {
  if (ttsWrapper) {
    ttsWrapper.style.display = "none";
  }
  if (aiOrbContainer) {
    aiOrbContainer.style.display = "none";
  }
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

if (isAudioEnabled && toggleTtsDockBtn && ttsWrapper) {
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

  const chapterPanels = document.querySelectorAll(".chapter-panel");
  const chapterCount = chapterPanels.length || 1;
  const chapterIndex = Number.isInteger(window.currentChapterIndex) ? window.currentChapterIndex : 0;
  const normalizedIndex = Math.max(0, Math.min(chapterIndex, chapterCount - 1));
  ttsChapterLabel.textContent = `Chapter ${normalizedIndex + 1} of ${chapterCount}`;
}

const canvas = document.getElementById("aiOrbCanvas");

if (canvas && isAudioEnabled) {
  const ctx = canvas.getContext("2d");

  const playPauseBtn = document.getElementById("playPauseBtn");
  const backBtn = document.getElementById("backBtn");
  const forwardBtn = document.getElementById("forwardBtn");

  const speedRange = document.getElementById("speedRange");
  const volumeRange = document.getElementById("volumeRange");
  const speedValue = document.getElementById("speedValue");
  const voiceLanguage = document.getElementById("voiceLanguage");
  const voiceAccent = document.getElementById("voiceAccent");
  const voiceGender = document.getElementById("voiceGender");
  const ttsParams = new URLSearchParams(window.location.search);
  const preferredAudioLanguage =
    ttsParams.get("audioLanguage") ||
    (document.body ? document.body.getAttribute("data-audio-language") : "") ||
    "";

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
  let audioSettingsRefreshTimer = null;

  let paragraphMap = [];
  let currentHighlightedParagraph = null;
  let chapterProgress = {};
  let paragraphNavigationContainer = null;
  let isAutoAdvancingChapter = false;
  let translationCache = {};
  let isApplyingVoiceChange = false;
  let hasAppliedInitialLanguage = false;

  const LANGUAGE_ORDER = ["en", "es", "fr", "de", "it", "pt", "hi", "tl", "zh", "ja", "ko", "ar"];
  const LANGUAGE_LABELS = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    hi: "Hindi",
    zh: "Chinese (Mandarin)",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    vi: "Vietnamese",
    th: "Thai",
    id: "Indonesian",
    ms: "Malay",
    tl: "Filipino",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    ml: "Malayalam",
    kn: "Kannada",
    mr: "Marathi",
    gu: "Gujarati",
    pa: "Punjabi",
    ur: "Urdu",
    fa: "Persian",
    tr: "Turkish",
    el: "Greek",
    uk: "Ukrainian",
    ru: "Russian",
    pl: "Polish",
    cs: "Czech",
    sk: "Slovak",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    hr: "Croatian",
    sr: "Serbian",
    nl: "Dutch",
    sv: "Swedish",
    da: "Danish",
    no: "Norwegian",
    fi: "Finnish",
    he: "Hebrew",
    af: "Afrikaans"
  };

  const FEMALE_VOICE_HINTS = [
    "female", "woman", "girl", "zira", "aria", "jenny", "susan", "hazel", "samantha", "victoria", "karen", "siri", "anna", "emma", "lucia", "maria", "sofia", "helena", "mei", "na", "chloe",
    "mujer", "femme", "frau", "donna", "mulher", "nữ", "女", "여자", "महिला", "kadın", "feminin"
  ];

  const MALE_VOICE_HINTS = [
    "male", "man", "boy", "david", "mark", "george", "james", "daniel", "alex", "thomas", "michael", "john", "paul", "diego", "carlos", "jorge", "miguel", "takumi", "hiro", "liam", "oliver",
    "hombre", "homme", "herr", "uomo", "homem", "nam", "男", "남자", "पुरुष", "erkek", "masculin"
  ];

  const PREFERRED_ACCENTS_BY_LANGUAGE = {
    en: ["US", "GB", "AU", "CA", "IN", "IE", "NZ", "ZA", "PH", "SG"],
    es: ["ES", "MX", "AR", "CO", "CL", "US"],
    fr: ["FR", "CA", "BE", "CH"],
    de: ["DE", "AT", "CH"],
    it: ["IT", "CH"],
    pt: ["BR", "PT"],
    ar: ["SA", "EG", "AE", "MA"],
    zh: ["CN", "TW", "HK"],
    ja: ["JP"],
    ko: ["KR"],
    hi: ["IN"]
  };

  // Language-based accents for English (voices from other languages reading English)
  const LANGUAGE_ACCENTS_FOR_ENGLISH = [
    { code: "zh", label: "Chinese accent" },
    { code: "ja", label: "Japanese accent" },
    { code: "ko", label: "Korean accent" },
    { code: "es", label: "Spanish accent" },
    { code: "fr", label: "French accent" },
    { code: "de", label: "German accent" },
    { code: "it", label: "Italian accent" },
    { code: "pt", label: "Portuguese accent" },
    { code: "hi", label: "Hindi accent" },
    { code: "ar", label: "Arabic accent" },
    { code: "ru", label: "Russian accent" },
    { code: "th", label: "Thai accent" },
    { code: "vi", label: "Vietnamese accent" }
  ];

  function getCurrentChapterIndex() {
    const activeChapter = document.querySelector(".chapter-panel.active-chapter");
    if (Number.isInteger(window.currentChapterIndex)) {
      return window.currentChapterIndex;
    }

    if (!activeChapter) return 0;

    const idMatch = (activeChapter.id || "").match(/chapter(\d+)/i);
    if (idMatch) {
      return Math.max(0, parseInt(idMatch[1], 10) - 1);
    }

    const allChapters = Array.from(document.querySelectorAll(".chapter-panel"));
    const fallbackIndex = allChapters.indexOf(activeChapter);
    return fallbackIndex >= 0 ? fallbackIndex : 0;
  }

  function saveCurrentChapterProgress() {
    const chapterIndex = getCurrentChapterIndex();
    chapterProgress[chapterIndex] = spokenCharIndex;
  }

  function loadChapterProgress(chapterIndex) {
    return chapterProgress[chapterIndex] || 0;
  }

  function getChapterPanelCount() {
    return document.querySelectorAll(".chapter-panel").length;
  }

  function canAdvanceToNextChapter() {
    const chapterCount = getChapterPanelCount();
    const currentIndex = getCurrentChapterIndex();
    return chapterCount > 0 && currentIndex < chapterCount - 1;
  }

  function tryAdvanceToNextChapterWithAudio() {
    if (isAutoAdvancingChapter || !canAdvanceToNextChapter()) {
      return false;
    }

    const nextChapterBtn = document.getElementById("nextChapterBtnBottom");
    if (!nextChapterBtn || nextChapterBtn.disabled) {
      return false;
    }

    isAutoAdvancingChapter = true;
    nextChapterBtn.click();

    setTimeout(function () {
      isAutoAdvancingChapter = false;
      isManualStop = false;

      // Auto-advance should always narrate the next chapter from its start.
      spokenCharIndex = 0;
      if (progressBar) {
        progressBar.value = 0;
      }
      if (progressStart) {
        progressStart.textContent = "0%";
      }

      startSpeechFromProgress();
    }, 80);

    return true;
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

    const chapterCount = getChapterPanelCount();
    if (chapterCount <= 0) return;

    const chapterIndex = clamp(getCurrentChapterIndex(), 0, chapterCount - 1);
    ttsChapterLabel.textContent = `Chapter ${chapterIndex + 1} of ${chapterCount}`;
  }

  function getStoryText() {
    const activeStoryText = getActiveStoryTextElement();

    if (!activeStoryText) {
      return "";
    }

    const heading = activeStoryText.querySelector("h3");
    const titleText = heading ? heading.innerText.trim().replace(/\s+/g, " ") : "";

    const paragraphs = activeStoryText.querySelectorAll("p");
    const normalizedParts = Array.from(paragraphs)
      .map(function (p) {
        return p.innerText.trim().replace(/\s+/g, " ");
      })
      .filter(function (text) {
        return text.length > 0;
      });

    if (titleText) {
      normalizedParts.unshift(titleText);
    }

    return normalizedParts.join(" ");
  }

  function getStoryContentParts() {
    const activeStoryText = getActiveStoryTextElement();
    if (!activeStoryText) {
      return {
        titleText: "",
        paragraphElements: [],
        paragraphTexts: []
      };
    }

    const heading = activeStoryText.querySelector("h3");
    const titleText = heading ? heading.innerText.trim().replace(/\s+/g, " ") : "";
    const paragraphElements = Array.from(activeStoryText.querySelectorAll("p"));
    const paragraphTexts = paragraphElements.map(function (p) {
      return p.innerText.trim().replace(/\s+/g, " ");
    });

    return {
      titleText: titleText,
      paragraphElements: paragraphElements,
      paragraphTexts: paragraphTexts
    };
  }

  function getTranslationCacheKey(languagePrefix, titleText, paragraphTexts) {
    const chapterIndex = getCurrentChapterIndex();
    const sourceSignature = `${titleText}\n${paragraphTexts.join("\n")}`;
    return `${chapterIndex}|${languagePrefix}|${sourceSignature}`;
  }

  async function translateTextSegment(sourceText, targetLanguage) {
    if (!sourceText) {
      return "";
    }

    const tl = getLanguagePrefix(targetLanguage) || targetLanguage;
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=" +
      encodeURIComponent(tl) +
      "&q=" +
      encodeURIComponent(sourceText);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn("Translation API error:", response.status, response.statusText);
        throw new Error("Translation request failed");
      }

      const data = await response.json();
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        console.warn("Unexpected translation response format");
        throw new Error("Unexpected translation response");
      }

      const translated = data[0]
        .map(function (segment) {
          return Array.isArray(segment) && segment[0] ? segment[0] : "";
        })
        .join("")
        .trim()
        .replace(/\s+/g, " ");

      if (!translated) {
        console.warn("Translation returned empty result");
        return sourceText;
      }

      return translated;
    } catch (error) {
      console.error("Translation error:", error.message);
      return sourceText;
    }
  }

  function buildNarrationFromParts(titleText, paragraphElements, paragraphTexts) {
    paragraphMap = [];

    let charCount = titleText ? titleText.length + 1 : 0;

    paragraphElements.forEach(function (element, index) {
      const text = paragraphTexts[index] || "";
      if (!text) {
        return;
      }

      const startChar = charCount;
      const endChar = startChar + text.length - 1;

      paragraphMap.push({
        element: element,
        startChar: startChar,
        endChar: endChar
      });

      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "button");
      element.setAttribute("aria-label", "Jump audio to this paragraph");
      element.classList.add("tts-jump-paragraph");

      charCount = endChar + 2;
    });

    const parts = paragraphTexts.filter(function (text) {
      return text.length > 0;
    });
    if (titleText) {
      parts.unshift(titleText);
    }

    fullText = parts.join(" ");
    currentTextLength = fullText.length;
  }

  async function prepareNarrationContent() {
    const selectedLanguage = getSelectedLanguage();
    const languagePrefix = getLanguagePrefix(selectedLanguage);
    const selectedAccent = getSelectedAccent();
    const contentParts = getStoryContentParts();

    if (!contentParts.paragraphElements.length) {
      fullText = "";
      currentTextLength = 0;
      paragraphMap = [];
      return;
    }

    // For English OR English with language-based accent, don't translate
    if (languagePrefix === "en") {
      buildNarrationFromParts(
        contentParts.titleText,
        contentParts.paragraphElements,
        contentParts.paragraphTexts
      );
      return;
    }

    const cacheKey = getTranslationCacheKey(
      languagePrefix,
      contentParts.titleText,
      contentParts.paragraphTexts
    );
    const cachedTranslation = translationCache[cacheKey];

    if (cachedTranslation) {
      buildNarrationFromParts(
        cachedTranslation.titleText,
        contentParts.paragraphElements,
        cachedTranslation.paragraphTexts
      );
      return;
    }

    updateStatus(`Translating to ${selectedLanguage.toUpperCase()}...`);

    try {
      const translatedTitle = contentParts.titleText
        ? await translateTextSegment(contentParts.titleText, languagePrefix)
        : "";

      const translatedParagraphs = [];
      for (let i = 0; i < contentParts.paragraphTexts.length; i++) {
        const translated = await translateTextSegment(contentParts.paragraphTexts[i], languagePrefix);
        translatedParagraphs.push(translated);
      }

      translationCache[cacheKey] = {
        titleText: translatedTitle,
        paragraphTexts: translatedParagraphs
      };

      buildNarrationFromParts(
        translatedTitle,
        contentParts.paragraphElements,
        translatedParagraphs
      );
      updateStatus("Ready");
    } catch (error) {
      console.error("Translation pipeline error:", error);
      updateStatus("Translation failed. Using original text.");
      buildNarrationFromParts(
        contentParts.titleText,
        contentParts.paragraphElements,
        contentParts.paragraphTexts
      );
    }
  }

  function buildParagraphMap() {
    paragraphMap = [];
    const activeStoryText = getActiveStoryTextElement();
    if (!activeStoryText) return;

    const heading = activeStoryText.querySelector("h3");
    const titleText = heading ? heading.innerText.trim().replace(/\s+/g, " ") : "";

    const paragraphs = activeStoryText.querySelectorAll("p");
    let charCount = titleText ? titleText.length + 1 : 0;

    paragraphs.forEach(function (p) {
      const text = p.innerText.trim().replace(/\s+/g, " ");
      if (!text) {
        return;
      }

      const startChar = charCount;
      const endChar = startChar + text.length - 1;

      paragraphMap.push({
        element: p,
        startChar: startChar,
        endChar: endChar
      });

      p.setAttribute("tabindex", "0");
      p.setAttribute("role", "button");
      p.setAttribute("aria-label", "Jump audio to this paragraph");
      p.classList.add("tts-jump-paragraph");

      charCount = endChar + 2;
    });
  }

  function jumpToCharIndex(targetIndex, shouldAutoPlay) {
    const clampedIndex = clamp(targetIndex, 0, currentTextLength);

    spokenCharIndex = clampedIndex;
    updateProgressDisplayByChars(clampedIndex);
    highlightCurrentParagraph(clampedIndex);

    if (speechSynthesis.speaking || speechSynthesis.paused || shouldAutoPlay) {
      isManualStop = true;
      cancelSpeechState();
      stopAnimationLoop();
      drawOrbIdle();
      isManualStop = false;
      startSpeechFromProgress();
    }
  }

  function handleParagraphNavigation(targetParagraph) {
    if (!targetParagraph) {
      return;
    }

    if (!fullText || currentTextLength <= 0) {
      fullText = getStoryText();
      currentTextLength = fullText.length;
    }

    if (!fullText || currentTextLength <= 0) {
      return;
    }

    if (paragraphMap.length === 0) {
      buildParagraphMap();
    }

    const paragraphEntry = paragraphMap.find(function (entry) {
      return entry.element === targetParagraph;
    });

    if (!paragraphEntry) {
      return;
    }

    jumpToCharIndex(paragraphEntry.startChar, true);
  }

  function handleParagraphClick(event) {
    const targetParagraph = event.target.closest("p.tts-jump-paragraph");
    if (!targetParagraph) {
      return;
    }

    handleParagraphNavigation(targetParagraph);
  }

  function handleParagraphKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const targetParagraph = event.target.closest("p.tts-jump-paragraph");
    if (!targetParagraph) {
      return;
    }

    event.preventDefault();
    handleParagraphNavigation(targetParagraph);
  }

  function bindParagraphNavigation() {
    const activeStoryText = getActiveStoryTextElement();

    if (paragraphNavigationContainer && paragraphNavigationContainer !== activeStoryText) {
      paragraphNavigationContainer.removeEventListener("dblclick", handleParagraphClick);
      paragraphNavigationContainer.removeEventListener("keydown", handleParagraphKeydown);
    }

    if (!activeStoryText) {
      paragraphNavigationContainer = null;
      return;
    }

    if (paragraphNavigationContainer !== activeStoryText) {
      activeStoryText.addEventListener("dblclick", handleParagraphClick);
      activeStoryText.addEventListener("keydown", handleParagraphKeydown);
      paragraphNavigationContainer = activeStoryText;
    }
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

  function updatePlayPauseButton(isPlaying) {
    if (!playPauseBtn) return;
    
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    const btnText = playPauseBtn.querySelector('.btn-text');
    
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'inline';
      btnText.textContent = 'Pause';
    } else {
      playIcon.style.display = 'inline';
      pauseIcon.style.display = 'none';
      btnText.textContent = 'Play';
    }
  }

  function normalizeLangTag(lang) {
    return (lang || "").toLowerCase();
  }

  function getLanguagePrefix(lang) {
    return normalizeLangTag(lang).split("-")[0];
  }

  function getAccentPart(lang) {
    const pieces = normalizeLangTag(lang).split("-");
    return pieces.length > 1 ? pieces[1].toUpperCase() : "";
  }

  function getAccentLabel(accentCode) {
    const labels = {
      US: "US accent",
      GB: "UK accent",
      AU: "Australian accent",
      IN: "Indian accent",
      CA: "Canadian accent",
      IE: "Irish accent",
      ZA: "South African accent",
      NZ: "New Zealand accent",
      ES: "Spain accent",
      MX: "Mexican accent",
      FR: "France accent",
      DE: "German accent",
      IT: "Italian accent",
      BR: "Brazilian accent",
      PT: "Portuguese accent",
      JP: "Japanese accent",
      KR: "Korean accent",
      CN: "Chinese accent",
      TW: "Taiwanese accent",
      HK: "Hong Kong accent",
      SA: "Saudi accent",
      EG: "Egyptian accent",
      AE: "Emirati accent",
      MA: "Moroccan accent",
      CH: "Swiss accent",
      AT: "Austrian accent",
      BE: "Belgian accent",
      AR: "Argentinian accent",
      CO: "Colombian accent",
      CL: "Chilean accent",
      PH: "Filipino accent",
      SG: "Singaporean accent"
    };

    return labels[accentCode] || accentCode;
  }

  function voiceMatchesLanguage(voice, selectedLanguage) {
    const voiceLang = normalizeLangTag(voice.lang);
    const targetLang = normalizeLangTag(selectedLanguage);

    if (!voiceLang || !targetLang) {
      return false;
    }

    return voiceLang === targetLang || getLanguagePrefix(voiceLang) === getLanguagePrefix(targetLang);
  }

  function getSelectedLanguage() {
    if (voiceLanguage && voiceLanguage.value) {
      return voiceLanguage.value;
    }
    return "en";
  }

  function isEnglishLanguageSelected() {
    return getLanguagePrefix(getSelectedLanguage()) === "en";
  }

  function getSelectedGender() {
    if (voiceGender && voiceGender.value) {
      return voiceGender.value;
    }
    return "female";
  }

  function getSelectedAccent() {
    if (voiceAccent && voiceAccent.value) {
      return voiceAccent.value;
    }

    return "any";
  }

  function getPreferredLanguageValue() {
    const normalized = normalizeLangTag(preferredAudioLanguage);
    if (!normalized) {
      return "";
    }

    if (normalized === "filipino" || normalized === "filipino-tl") {
      return "tl";
    }

    if (normalized === "tl" || normalized.startsWith("tl-")) {
      return "tl";
    }

    const prefix = getLanguagePrefix(normalized);
    return prefix && prefix.length === 2 ? prefix : "";
  }

  function applyInitialPreferredLanguage() {
    if (!voiceLanguage || hasAppliedInitialLanguage) {
      return;
    }

    const preferredValue = getPreferredLanguageValue();
    if (!preferredValue) {
      hasAppliedInitialLanguage = true;
      return;
    }

    const hasPreferredOption = Array.from(voiceLanguage.options).some(function (option) {
      return option.value === preferredValue && !option.disabled;
    });

    if (hasPreferredOption) {
      voiceLanguage.value = preferredValue;
      repopulateAccentOptions();
    }

    hasAppliedInitialLanguage = true;
  }

  function isLanguageAccent(accentValue) {
    // Check if the accent is a language code (2 chars) rather than regional code
    return accentValue && accentValue.length === 2 && accentValue !== "any";
  }

  function repopulateAccentOptions() {
    if (!voiceAccent) {
      return;
    }

    if (!isEnglishLanguageSelected()) {
      voiceAccent.innerHTML = "";

      const disabledOption = document.createElement("option");
      disabledOption.value = "any";
      disabledOption.textContent = "(Accents for English only)";
      voiceAccent.appendChild(disabledOption);
      voiceAccent.value = "any";
      voiceAccent.disabled = true;
      return;
    }

    voiceAccent.disabled = false;

    const existingAccent = voiceAccent.value || "any";
    const selectedLanguage = getSelectedLanguage();
    
    // Collect available regional accents (en-US, en-GB, etc.)
    const availableRegionalAccents = [];
    voices.forEach(function (voice) {
      if (!voiceMatchesLanguage(voice, selectedLanguage)) {
        return;
      }

      const accent = getAccentPart(voice.lang);
      if (accent && availableRegionalAccents.indexOf(accent) === -1) {
        availableRegionalAccents.push(accent);
      }
    });

    // Collect available language-based accents (voices from other languages)
    const availableLanguageAccents = [];
    LANGUAGE_ACCENTS_FOR_ENGLISH.forEach(function (langAccent) {
      const hasVoice = voices.some(function (voice) {
        return getLanguagePrefix(voice.lang) === langAccent.code;
      });
      if (hasVoice) {
        availableLanguageAccents.push(langAccent);
      }
    });

    voiceAccent.innerHTML = "";

    // Add "Auto accent" option
    const autoOption = document.createElement("option");
    autoOption.value = "any";
    autoOption.textContent = "Auto accent";
    voiceAccent.appendChild(autoOption);

    // Add regional accents section (only available ones)
    availableRegionalAccents.forEach(function (accent) {
      const option = document.createElement("option");
      option.value = accent;
      option.textContent = getAccentLabel(accent);
      voiceAccent.appendChild(option);
    });

    // Add language-based accents (only available ones)
    availableLanguageAccents.forEach(function (langAccent) {
      const option = document.createElement("option");
      option.value = langAccent.code;
      option.textContent = langAccent.label;
      voiceAccent.appendChild(option);
    });

    const hasExisting = Array.from(voiceAccent.options).some(function (option) {
      return option.value === existingAccent && !option.disabled;
    });

    if (hasExisting) {
      voiceAccent.value = existingAccent;
      return;
    }

    voiceAccent.value = "any";
  }

  function repopulateLanguageOptions() {
    if (!voiceLanguage) {
      return;
    }

    const existingValue = voiceLanguage.value || "en";
    const availableByPrefix = {};

    voices.forEach(function (voice) {
      const fullLang = normalizeLangTag(voice.lang);
      const prefix = fullLang.split("-")[0];
      if (prefix && prefix.length === 2) {
        availableByPrefix[prefix] = true;
      }
    });

    voiceLanguage.innerHTML = "";

    LANGUAGE_ORDER.forEach(function (prefix) {
      if (!availableByPrefix[prefix]) {
        return;
      }

      const option = document.createElement("option");
      option.value = prefix;
      option.textContent = LANGUAGE_LABELS[prefix] || prefix.toUpperCase();
      voiceLanguage.appendChild(option);
    });

    const extraPrefixes = Object.keys(availableByPrefix)
      .filter(function (prefix) {
        return LANGUAGE_ORDER.indexOf(prefix) === -1 && prefix.length === 2;
      })
      .sort();

    extraPrefixes.forEach(function (prefix) {
      const option = document.createElement("option");
      option.value = prefix;
      option.textContent = LANGUAGE_LABELS[prefix] || prefix.toUpperCase();
      voiceLanguage.appendChild(option);
    });

    // Keep Filipino selectable even when TL voices are unavailable so translated narration can still run.
    if (!availableByPrefix.tl) {
      const filipinoOption = document.createElement("option");
      filipinoOption.value = "tl";
      filipinoOption.textContent = "Filipino";
      voiceLanguage.appendChild(filipinoOption);
    }

    if (!voiceLanguage.options.length) {
      const fallbackOption = document.createElement("option");
      fallbackOption.value = "en";
      fallbackOption.textContent = "English";
      fallbackOption.disabled = true;
      voiceLanguage.appendChild(fallbackOption);
    }

    const canKeepExisting = Array.from(voiceLanguage.options).some(function (option) {
      return option.value === existingValue && !option.disabled;
    });

    if (canKeepExisting) {
      voiceLanguage.value = existingValue;
      return;
    }

    const firstEnabled = Array.from(voiceLanguage.options).find(function (option) {
      return !option.disabled;
    });

    if (firstEnabled) {
      voiceLanguage.value = firstEnabled.value;
    }
  }

  function populateVoices() {
    voices = speechSynthesis.getVoices();
    repopulateLanguageOptions();
    applyInitialPreferredLanguage();
    repopulateAccentOptions();
    activeVoice = pickVoiceForSelection();
  }

  function scoreVoice(voice) {
    const name = (voice.name || "").toLowerCase();
    const lang = normalizeLangTag(voice.lang);
    const selectedLanguage = getSelectedLanguage();
    const selectedAccent = getSelectedAccent();
    const selectedGender = getSelectedGender();
    let score = 0;

    // Handle language-based accents for English (e.g., Chinese accent reading English)
    if (isEnglishLanguageSelected() && isLanguageAccent(selectedAccent)) {
      // We want a voice from the accent language
      if (getLanguagePrefix(lang) === selectedAccent) {
        score += 120; // Strong match for accent language
      } else {
        score -= 50; // Penalize non-matching languages
      }
    } else {
      // Normal language matching
      if (voiceMatchesLanguage(voice, selectedLanguage)) {
        score += 120;
      } else if (getLanguagePrefix(lang) === getLanguagePrefix(selectedLanguage)) {
        score += 80;
      }
    }

    // Gender matching
    if (selectedGender === "female") {
      if (FEMALE_VOICE_HINTS.some(function (hint) { return name.includes(hint); })) {
        score += 35;
      }
      if (MALE_VOICE_HINTS.some(function (hint) { return name.includes(hint); })) {
        score -= 8;
      }
    } else if (selectedGender === "male") {
      if (MALE_VOICE_HINTS.some(function (hint) { return name.includes(hint); })) {
        score += 35;
      }
      if (FEMALE_VOICE_HINTS.some(function (hint) { return name.includes(hint); })) {
        score -= 8;
      }
    }

    if (voice.default) score += 20;

    // Regional accent matching (only for non-language accents)
    if (isEnglishLanguageSelected() && selectedAccent !== "any" && !isLanguageAccent(selectedAccent)) {
      const voiceAccentCode = getAccentPart(lang);
      if (voiceAccentCode === selectedAccent) {
        score += 45;
      } else {
        score -= 6;
      }
    }

    return score;
  }

  function pickVoiceForSelection() {
    if (!voices.length) return null;

    let bestVoice = null;
    let bestScore = -Infinity;

    const selectedLanguage = getSelectedLanguage();
    const selectedAccent = getSelectedAccent();

    // For English with language-based accent, look for voices in the accent language
    let candidateVoices;
    if (isEnglishLanguageSelected() && isLanguageAccent(selectedAccent)) {
      candidateVoices = voices.filter(function (voice) {
        return getLanguagePrefix(voice.lang) === selectedAccent;
      });

      if (!candidateVoices.length) {
        console.warn(`No voices found for ${selectedAccent} accent`);
        // Fallback to English voices
        candidateVoices = voices.filter(function (voice) {
          return voiceMatchesLanguage(voice, selectedLanguage);
        });
      }
    } else {
      // Normal language matching
      candidateVoices = voices.filter(function (voice) {
        return voiceMatchesLanguage(voice, selectedLanguage);
      });
    }

    if (!candidateVoices.length) {
      return null;
    }

    candidateVoices.forEach(function (voice) {
      const score = scoreVoice(voice);
      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    });

    if (bestVoice) {
      const voiceName = bestVoice.name || "Unknown";
      const voiceLang = bestVoice.lang || "Unknown";
      
      if (isEnglishLanguageSelected() && isLanguageAccent(selectedAccent)) {
        console.log(`Using ${selectedAccent.toUpperCase()} accent for English - Voice: ${voiceName} (${voiceLang})`);
      } else {
        console.log(`Selected voice: ${voiceName} (${voiceLang})`);
      }
    }

    return bestVoice;
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
      highlightCurrentParagraph(spokenCharIndex);

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
    return fullText.slice(startIndex);
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
    utterance.lang = activeVoice && activeVoice.lang ? activeVoice.lang : getSelectedLanguage();

    if (activeVoice) utterance.voice = activeVoice;

    utterance.onstart = function () {
      isSpeaking = true;
      isPaused = false;
      hasBoundaryEvents = false;
      
      // Show status with accent info if applicable
      const selectedAccent = getSelectedAccent();
      if (isEnglishLanguageSelected() && isLanguageAccent(selectedAccent)) {
        const accentInfo = LANGUAGE_ACCENTS_FOR_ENGLISH.find(function(a) { return a.code === selectedAccent; });
        const accentLabel = accentInfo ? accentInfo.label : selectedAccent;
        updateStatus(`Speaking with ${accentLabel}`);
      } else {
        updateStatus("Speaking");
      }
      
      ttsWrapper.classList.add("speaking");
      highlightCurrentParagraph(startIndex);
      startAnimationLoop();
      startSmoothProgressTracking(startIndex);
      updatePlayPauseButton(true);
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
        updatePlayPauseButton(false);
        return;
      }

      spokenCharIndex = currentTextLength;
      updateProgressDisplayByChars(spokenCharIndex);

      // Auto-advance only when narration naturally reaches chapter end.
      if (tryAdvanceToNextChapterWithAudio()) {
        return;
      }

      isSpeaking = false;
      isPaused = false;
      updateStatus("Finished");
      stopAnimationLoop();
      stopSmoothProgressTracking();
      ttsWrapper.classList.remove("speaking");
      drawOrbIdle();
      updatePlayPauseButton(false);
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
      updatePlayPauseButton(false);
    };

    speechSynthesis.speak(utterance);
  }

  async function startSpeechFromProgress() {
    await prepareNarrationContent();

    if (!fullText) {
      return;
    }

    bindParagraphNavigation();

    if (!voices.length) {
      populateVoices();
    }

    activeVoice = pickVoiceForSelection();

    if (!activeVoice) {
      const selectedLang = getSelectedLanguage();
      console.warn(`No voice found for language: ${selectedLang}. Using fallback.`);
      updateStatus(`No voice for ${selectedLang}. Will attempt with default voice.`);
    }

    const startIndex = getCharIndexFromBar();

    cancelSpeechState();
    speakFromCharIndex(startIndex);
  }

  function skipBySeconds(seconds) {
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
    buildParagraphMap();
    bindParagraphNavigation();

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

  async function applyVoiceSelectionChange() {
    // Prevent concurrent voice changes
    if (isApplyingVoiceChange) {
      console.log("Voice change already in progress, skipping...");
      return;
    }
    
    isApplyingVoiceChange = true;

    try {
      // Capture the playing state BEFORE any changes
      const wasPlaying = isSpeaking || (speechSynthesis.speaking && !speechSynthesis.paused);
      const currentParagraphElement = currentHighlightedParagraph;
      
      // Stop current playback if active
      if (wasPlaying) {
        isManualStop = true;
        cancelSpeechState();
        stopAnimationLoop();
        drawOrbIdle();
        clearHighlight();
        updatePlayPauseButton(false);
      }

      // Show translating status
      const selectedLanguage = getSelectedLanguage();
      const languagePrefix = getLanguagePrefix(selectedLanguage);
      if (languagePrefix !== "en") {
        updateStatus(`Translating to ${LANGUAGE_LABELS[languagePrefix] || selectedLanguage}...`);
      }

      // Re-translate content for new language
      await prepareNarrationContent();

      // Update voice for new language
      activeVoice = pickVoiceForSelection();

      // Resume playback if it was playing before
      if (wasPlaying) {
        isManualStop = false;
        
        // Try to resume from the same paragraph
        if (currentParagraphElement && paragraphMap.length > 0) {
          const paragraphEntry = paragraphMap.find(function (entry) {
            return entry.element === currentParagraphElement;
          });

          if (paragraphEntry) {
            speakFromCharIndex(paragraphEntry.startChar);
            return;
          }
        }
        
        // Fallback: restart from current progress or beginning
        startSpeechFromProgress();
      } else {
        updateStatus("Ready");
      }
    } finally {
      isApplyingVoiceChange = false;
    }
  }

  function applyAudioSettingsChange() {
    if (!(speechSynthesis.speaking && !speechSynthesis.paused)) {
      return;
    }

    isManualStop = true;
    cancelSpeechState();
    stopAnimationLoop();
    drawOrbIdle();
    isManualStop = false;
    speakFromCharIndex(spokenCharIndex);
  }

  function scheduleAudioSettingsRefresh() {
    if (audioSettingsRefreshTimer) {
      clearTimeout(audioSettingsRefreshTimer);
    }

    audioSettingsRefreshTimer = setTimeout(function () {
      applyAudioSettingsChange();
      audioSettingsRefreshTimer = null;
    }, 140);
  }

  if (voiceLanguage) {
    voiceLanguage.addEventListener("change", function () {
      repopulateAccentOptions();
      applyVoiceSelectionChange().catch(function(error) {
        console.error("Error applying voice selection change:", error);
        updateStatus("Error changing language");
      });
    });
  }

  if (voiceAccent) {
    voiceAccent.addEventListener("change", function () {
      applyVoiceSelectionChange().catch(function(error) {
        console.error("Error applying voice selection change:", error);
        updateStatus("Error changing accent");
      });
    });
  }

  if (voiceGender) {
    voiceGender.addEventListener("change", function () {
      applyVoiceSelectionChange().catch(function(error) {
        console.error("Error applying voice selection change:", error);
        updateStatus("Error changing voice");
      });
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", function () {
      // If currently paused or stopped, resume/start
      if (!isSpeaking && (!speechSynthesis.speaking || speechSynthesis.paused)) {
        isManualStop = false;
        startSpeechFromProgress();
      } 
      // If currently speaking, pause
      else if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        isPaused = true;
        isSpeaking = false;
        updateStatus("Paused");
        stopAnimationLoop();
        stopSmoothProgressTracking();
        ttsWrapper.classList.remove("speaking");
        drawOrbIdle();
        clearHighlight();
        updatePlayPauseButton(false);
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
      scheduleAudioSettingsRefresh();
    });

    speedRange.addEventListener("change", function () {
      applyAudioSettingsChange();
    });
  }

  if (volumeRange) {
    volumeRange.addEventListener("input", function () {
      scheduleAudioSettingsRefresh();
    });

    volumeRange.addEventListener("change", function () {
      applyAudioSettingsChange();
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
  resetTTSForChapterChange(getCurrentChapterIndex());
  bindParagraphNavigation();
  updateChapterLabel();
  updateStatus("Idle");
  drawOrbIdle();
}

updateChapterDisplay();