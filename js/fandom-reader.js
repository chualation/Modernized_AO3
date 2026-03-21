/* FANDOM-READER.JS - Dynamic reader page for fandom books */

(function () {
  if (!document.body || document.body.dataset.page !== "reader") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const title = params.get("title");
  const UPLOADED_WORKS_KEY = "ao3-uploaded-works";

  // Only apply dynamic rendering when opened from browse fandom works.
  if (!title) {
    return;
  }

  function readStoredUploadedWork() {
    const requestedWorkId = params.get("workId") || "";
    const requestedFandom = params.get("fandom") || "";

    try {
      const raw = localStorage.getItem(UPLOADED_WORKS_KEY);
      if (!raw) {
        return null;
      }

      const works = JSON.parse(raw);
      if (!Array.isArray(works)) {
        return null;
      }

      if (requestedWorkId) {
        const byId = works.find(function (work) {
          return work && work.id === requestedWorkId;
        });

        if (byId) {
          return byId;
        }
      }

      return works.find(function (work) {
        if (!work || typeof work !== "object") {
          return false;
        }

        const sameTitle = String(work.title || "").toLowerCase() === String(title || "").toLowerCase();
        const sameFandom = !requestedFandom || String(work.fandom || "").toLowerCase() === String(requestedFandom || "").toLowerCase();
        return sameTitle && sameFandom;
      }) || null;
    } catch (error) {
      return null;
    }
  }

  const storedWork = readStoredUploadedWork();
  const fandom = params.get("fandom") || (storedWork && storedWork.fandom) || "Fandom Work";
  const summary = params.get("summary") || (storedWork && storedWork.text) || "A featured fan work with a complete chapter experience.";
  const meta = params.get("meta") || (storedWork && storedWork.meta) || `${fandom} • Adventure • Drama • 35,000 words`;
  const rating = params.get("rating") || (storedWork && storedWork.rating) || "Teen And Up Audiences";
  const warnings = params.get("warnings") || (storedWork && storedWork.warnings) || "No Archive Warnings Apply";
  const status = params.get("status") || (storedWork && storedWork.status) || "Complete Works";
  const tags = params.get("tags") || ((storedWork && Array.isArray(storedWork.tags)) ? storedWork.tags.join(", ") : "Adventure, Drama");
  const audioLanguage = params.get("audioLanguage") || (storedWork && storedWork.audioLanguage) || "en";
  const authorName = params.get("author") || (storedWork && storedWork.uploadedBy) || `${fandom}Archivist`;
  const language = params.get("language") || (storedWork && storedWork.language) || "English";
  const updated = params.get("updated") || (storedWork && storedWork.updated) || "20 Feb 2026";

  const parsedKudos = parseInt(params.get("kudos") || ((storedWork && storedWork.kudos) || ""), 10);
  const parsedHits = parseInt(params.get("hits") || ((storedWork && storedWork.hits) || ""), 10);
  const parsedBookmarks = parseInt(params.get("bookmarks") || ((storedWork && storedWork.bookmarks) || ""), 10);
  const parsedComments = parseInt(params.get("comments") || ((storedWork && storedWork.comments) || ""), 10);
  const kudos = Number.isInteger(parsedKudos) ? parsedKudos : 0;
  const hits = Number.isInteger(parsedHits) ? parsedHits : 0;
  const bookmarks = Number.isInteger(parsedBookmarks) ? parsedBookmarks : 0;
  const comments = Number.isInteger(parsedComments) ? parsedComments : 0;

  const parsedChapters = parseInt(params.get("chapters") || ((storedWork && storedWork.chapters) || ""), 10);
  const requestedChapterCount = Number.isInteger(parsedChapters) && parsedChapters > 0
    ? Math.min(parsedChapters, 12)
    : 1;

  const content = params.get("content") || (storedWork && storedWork.content) || "";

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

  const audioEnabledFromParam = parseAudioEnabledFlag(params.get("audioEnabled"));
  const audioEnabled = audioEnabledFromParam !== null
    ? audioEnabledFromParam
    : !storedWork || storedWork.audioEnabled !== false;

  function safeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function formatCount(value) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? "0" : parsed.toLocaleString("en-US");
  }

  function getWordCountLabel(metaLine) {
    const match = metaLine.match(/(\d[\d,]*)\s*words/i);
    return match ? match[1] : "35,000";
  }

  function getWordCountFromContent(text) {
    if (!text) {
      return 0;
    }

    return text
      .split(/\s+/)
      .map(function (token) { return token.trim(); })
      .filter(function (token) { return !!token; }).length;
  }

  function getMetaTags(metaLine) {
    const parts = metaLine
      .split("•")
      .map(function (part) {
        return safeText(part);
      })
      .filter(function (part) {
        return part && !/words/i.test(part);
      });

    // Remove fandom from tags if present as first token.
    if (parts.length && parts[0].toLowerCase() === safeText(fandom).toLowerCase()) {
      parts.shift();
    }

    if (!parts.length) {
      return ["Adventure", "Drama", "Mystery"];
    }

    return parts;
  }

  function buildChapterTitle(index) {
    const labels = [
      "The Call",
      "Shifting Alliances",
      "A Hidden Clue",
      "Crossroads",
      "The Breakthrough",
      "Nightfall Plans",
      "Fallout",
      "Second Wind",
      "Truth and Consequence",
      "Turning Point",
      "Final Push",
      "Aftermath"
    ];
    return labels[(index - 1) % labels.length];
  }

  function buildChapterParagraphs(index, tags) {
    const primaryTag = tags[0] || "Adventure";
    const secondaryTag = tags[1] || "Drama";
    const tertiaryTag = tags[2] || "Mystery";
    
    const arcPhase = index === 1
      ? "opening move"
      : index === requestedChapterCount
        ? "final fallout"
        : index > Math.floor(requestedChapterCount * 0.65)
          ? "late-game escalation"
          : "mid-arc unraveling";

    return [
      `Chapter ${index} begins with an ${arcPhase} in the ${fandom} setting, where the emotional tone leans into ${primaryTag.toLowerCase()} and the pressure is already visible. ${summary}`,
      `The core cast is split between immediate survival and long-term consequences, and that split drives the chapter's central conflict. Promises are tested, new alliances are negotiated, and one trusted assumption starts to crack.`,
      `As clues accumulate, the ${secondaryTag.toLowerCase()} thread sharpens: what looked like a contained incident now appears tied to something older and better hidden. The protagonists realize they are not reacting anymore; they are being steered.`,
      `Midway through the chapter, a personal choice reframes the stakes. Instead of chasing a clean victory, the characters accept that every gain costs something, and that cost lands hardest on the people trying to protect everyone else.`,
      `The chapter closes on a strong hook shaped by ${tertiaryTag.toLowerCase()}: a reveal, a warning, or a deliberate betrayal that pushes the next chapter forward with clearer urgency and higher risk.`
    ];
  }

  function splitContentIntoParagraphs(rawContent) {
    return String(rawContent || "")
      .replace(/\r\n?/g, "\n")
      .split(/\n{2,}/)
      .map(function (block) {
        return block.replace(/\s+/g, " ").trim();
      })
      .filter(function (block) {
        return !!block;
      });
  }

  function buildChapterBodies() {
    if (storedWork && Array.isArray(storedWork.chaptersData) && storedWork.chaptersData.length) {
      return storedWork.chaptersData.map(function (chapter, index) {
        return {
          title: safeText(chapter && chapter.title) || (`Chapter ${index + 1}`),
          paragraphs: splitContentIntoParagraphs(chapter && chapter.content)
        };
      }).map(function (chapter, index) {
        if (!chapter.paragraphs.length) {
          chapter.paragraphs = ["No chapter content provided."];
        }
        if (!chapter.title) {
          chapter.title = `Chapter ${index + 1}`;
        }
        return chapter;
      });
    }

    if (content) {
      const contentParagraphs = splitContentIntoParagraphs(content);

      if (contentParagraphs.length) {
        return [{
          title: "Chapter 1: Published Story",
          paragraphs: contentParagraphs
        }];
      }
    }

    const generatedTags = getMetaTags(meta);
    const generatedBodies = [];

    for (let i = 1; i <= requestedChapterCount; i++) {
      generatedBodies.push({
        title: `Chapter ${i}: ${buildChapterTitle(i)}`,
        paragraphs: buildChapterParagraphs(i, generatedTags)
      });
    }

    return generatedBodies;
  }

  const chapterBodies = buildChapterBodies();
  const chapterCount = chapterBodies.length;

  function getRelationshipText() {
    if (storedWork && storedWork.category) {
      return storedWork.category;
    }

    const tagsFromMeta = getMetaTags(meta);
    return tagsFromMeta.slice(0, 2).join(", ") || "Adventure, Drama";
  }

  function updateHeaderAndMeta() {
    document.body.setAttribute("data-audio-language", audioLanguage);
    document.body.setAttribute("data-audio-enabled", audioEnabled ? "1" : "0");
    document.title = title;

    const h2 = document.querySelector(".story-header h2");
    if (h2) {
      h2.textContent = title;
    }

    const author = document.querySelector(".story-author span");
    if (author) {
      author.textContent = authorName;
    }

    const fandomField = document.querySelector("#storyDetailsContent p strong");
    const fandomValue = document.querySelector("#storyDetailsContent p span");
    if (fandomField && fandomField.textContent.includes("Fandom") && fandomValue) {
      fandomValue.textContent = fandom;
    }

    const metaInline = document.querySelector(".story-meta-inline");
    if (metaInline) {
      const chapterLabel = chapterCount === 1 ? "Chapter" : "Chapters";
      const metaWordLabel = getWordCountLabel(meta);
      const contentWordCount = getWordCountFromContent(content);
      const wordLabel = contentWordCount > 0 ? formatCount(contentWordCount) : metaWordLabel;

      metaInline.innerHTML =
        `<span><strong>Rating:</strong> ${safeText(rating)}</span>` +
        `<span>•</span>` +
        `<span><strong>Words:</strong> ${wordLabel}</span>` +
        `<span>•</span>` +
        `<span><strong>${chapterLabel}:</strong> ${chapterCount}/${chapterCount}</span>` +
        `<span>•</span>` +
        `<span><strong>Kudos:</strong> <span id="kudosCount">${formatCount(kudos)}</span></span>` +
        `<span>•</span>` +
        `<span><strong>Hits:</strong> ${formatCount(hits)}</span>`;
    }

    const detailRows = document.querySelectorAll("#storyDetailsContent p");
    if (detailRows.length >= 4) {
      detailRows[0].innerHTML = `<strong>Fandom:</strong> <span>${safeText(fandom)}</span>`;
      detailRows[1].innerHTML = `<strong>Warnings:</strong> <span>${safeText(warnings)}</span>`;
      detailRows[2].innerHTML = `<strong>Relationships:</strong> <span>${safeText(getRelationshipText())}</span>`;
      detailRows[3].innerHTML = `<strong>Additional Tags:</strong> <span>${safeText(tags)}</span>`;
      if (detailRows.length >= 5) {
        detailRows[4].innerHTML = `<strong>Published:</strong> <span>${safeText(updated)}</span>`;
      }
      if (detailRows.length >= 6) {
        detailRows[5].innerHTML = `<strong>Status:</strong> <span>${safeText(status)}</span>`;
      }
      if (detailRows.length >= 7) {
        detailRows[6].innerHTML =
          `<strong>Comments:</strong> <span id="commentCount">${formatCount(comments)}</span>` +
          `<strong> • Bookmarks:</strong> <span id="bookmarkCount">${formatCount(bookmarks)}</span>`;
      }
    }
  }

  function updateBackLink() {
    const backLink = document.querySelector(".story-top-nav a");
    if (!backLink) {
      return;
    }

    backLink.href = "browse-works.html";
    backLink.textContent = "← Back to Works";
  }

  function renderChapters() {
    const storyTextSection = document.querySelector(".story-text");
    if (!storyTextSection) {
      return;
    }

    storyTextSection.innerHTML = "";

    for (let i = 1; i <= chapterCount; i++) {
      const chapterBody = chapterBodies[i - 1] || { title: `Chapter ${i}`, paragraphs: [summary] };
      const chapterPanel = document.createElement("div");
      chapterPanel.id = `chapter${i}`;
      chapterPanel.className = i === 1 ? "chapter-panel active-chapter" : "chapter-panel";
      chapterPanel.dataset.title = chapterBody.title;
      if (i !== 1) {
        chapterPanel.style.display = "none";
      }

      const chapterTextId = i === 1 ? "storyText" : `storyTextChapter${i}`;
      const chapterWrap = document.createElement("div");
      chapterWrap.id = chapterTextId;

      const heading = document.createElement("h3");
      heading.textContent = chapterBody.title;
      chapterWrap.appendChild(heading);

      chapterBody.paragraphs.forEach(function (text) {
        const p = document.createElement("p");
        p.textContent = text;
        chapterWrap.appendChild(p);
      });

      chapterPanel.appendChild(chapterWrap);
      storyTextSection.appendChild(chapterPanel);
    }

    // Note: Button states are managed by story.js
    const ttsChapterLabel = document.getElementById("ttsChapterLabel");
    if (ttsChapterLabel) {
      ttsChapterLabel.textContent = `Chapter 1 of ${chapterCount}`;
    }
  }

  updateHeaderAndMeta();
  updateBackLink();
  renderChapters();

  // Signal that dynamic chapters are ready
  window.dynamicChaptersReady = true;
  window.dispatchEvent(new Event('dynamicChaptersReady'));
})();
