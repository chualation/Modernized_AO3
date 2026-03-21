/* UPLOAD.JS - Writer dashboard work publishing */

(function () {
  if (!document.body || document.body.getAttribute("data-page") !== "writer-dashboard") {
    return;
  }

  /* ── CONSTANTS ──────────────────────────────────────────── */
  var AUTH_STORAGE_KEY    = "ao3-auth-user";
  var UPLOADED_WORKS_KEY  = "ao3-uploaded-works";
  var DRAFT_KEY           = "writerDraft";
  var DRAFT_LIBRARY_KEY   = "ao3-writer-draft-library";
  var PREVIEW_KEY         = "previewWork";

  var LANG_NAMES = {
    tl: "Filipino", en: "English",    es: "Spanish",
    fr: "French",   de: "German",     ja: "Japanese",
    ko: "Korean",   zh: "Chinese",    pt: "Portuguese",
    hi: "Hindi",    ta: "Tamil",      th: "Thai",
    ar: "Arabic",   id: "Indonesian", vi: "Vietnamese",
    tr: "Turkish",  ru: "Russian",    it: "Italian"
  };
  var SUPPORTED_AUDIO_LANGS = Object.keys(LANG_NAMES);

  /* ── AUTH GUARD ─────────────────────────────────────────── */
  var username = (localStorage.getItem(AUTH_STORAGE_KEY) || "").trim();
  if (!username) {
    window.location.href = "login.html";
    return;
  }

  /* ── ELEMENT REFS ───────────────────────────────────────── */
  var form          = document.getElementById("uploadWorkForm");
  var previewBtn    = document.getElementById("previewWorkBtn");
  var newWorkBtn    = document.getElementById("postNewWorkBtn");
  var saveDraftBtn  = document.getElementById("saveDraftBtn");
  var messageEl     = document.getElementById("writerMessage");
  var draftStatusEl = document.getElementById("draftStatus");
  var chapterEditorsEl = document.getElementById("chapterEditors");
  var addChapterBtn = document.getElementById("addChapterBtn");
  var wordCountEl   = document.getElementById("workWordCount");
  var writerDraftListEl = document.getElementById("writerDraftList");
  var writerDraftEmptyEl = document.getElementById("writerDraftEmpty");
  var writerLibraryListEl = document.getElementById("writerLibraryList");
  var writerLibraryEmptyEl = document.getElementById("writerLibraryEmpty");
  var writerPreviewCardEl = document.getElementById("writerPreviewCard");
  var previewSummaryEl = document.getElementById("previewSummary");
  var submitBtn = form ? form.querySelector("button[type='submit']") : null;
  var ratingEl = document.getElementById("workRating");
  var warningsEl = document.getElementById("workWarnings");
  var statusEl = document.getElementById("workStatus");
  var categoryEl = document.getElementById("workCategory");
  var ratingSymbolEl = document.getElementById("workRatingSymbol");
  var warningsSymbolEl = document.getElementById("workWarningsSymbol");
  var statusSymbolEl = document.getElementById("workStatusSymbol");
  var categorySymbolEl = document.getElementById("workCategorySymbol");
  var currentEditingId = "";
  var currentDraftId = "";
  var committedEditorState = "";
  var suppressBeforeUnloadPrompt = false;
  var initialEditorState = "";
  var draftAutosaveTimer = null;

  /* ── HELPERS ────────────────────────────────────────────── */
  function setMessage(text, isError) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className   = "writer-message" + (isError ? " error" : "");
  }

  function getClockLabel() {
    return new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setDraftStatus(text) {
    if (!draftStatusEl) {
      return;
    }
    draftStatusEl.textContent = text || "";
  }

  function countWords(text) {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  function getChapterEntries() {
    if (!chapterEditorsEl) {
      return [];
    }

    return Array.from(chapterEditorsEl.querySelectorAll(".chapter-editor")).map(function (editor, index) {
      var titleInput = editor.querySelector(".chapter-title-input");
      var contentInput = editor.querySelector(".chapter-content-input");
      return {
        title: (titleInput && titleInput.value ? titleInput.value : ("Chapter " + (index + 1))).trim(),
        content: (contentInput && contentInput.value ? contentInput.value : "").trim()
      };
    });
  }

  function getCombinedContentFromChapters(chapters) {
    return (chapters || []).map(function (chapter) {
      return String(chapter.content || "").trim();
    }).filter(function (content) {
      return !!content;
    }).join("\n\n");
  }

  function getTotalWordsFromChapters(chapters) {
    return (chapters || []).reduce(function (sum, chapter) {
      return sum + countWords(String(chapter.content || ""));
    }, 0);
  }

  function updateWordCountFromChapters() {
    if (!wordCountEl) {
      return;
    }
    wordCountEl.value = getTotalWordsFromChapters(getChapterEntries());
  }

  function renumberChapterEditors() {
    if (!chapterEditorsEl) {
      return;
    }

    var editors = Array.from(chapterEditorsEl.querySelectorAll(".chapter-editor"));

    editors.forEach(function (editor, index) {
      var chapterNumber = index + 1;
      var heading = editor.querySelector(".chapter-editor-heading");
      var titleInput = editor.querySelector(".chapter-title-input");
      var removeBtn = editor.querySelector(".chapter-remove-btn");
      var moveUpBtn = editor.querySelector(".chapter-move-btn[data-chapter-action='up']");
      var moveDownBtn = editor.querySelector(".chapter-move-btn[data-chapter-action='down']");

      if (heading) {
        heading.textContent = "Chapter " + chapterNumber;
      }
      if (titleInput && !titleInput.value.trim()) {
        titleInput.value = "Chapter " + chapterNumber;
      }
      if (removeBtn) {
        removeBtn.hidden = editors.length <= 1;
      }
      if (moveUpBtn) {
        moveUpBtn.disabled = index === 0;
      }
      if (moveDownBtn) {
        moveDownBtn.disabled = index === editors.length - 1;
      }
    });
  }

  function appendChapterEditor(chapterData) {
    if (!chapterEditorsEl) {
      return;
    }

    var chapterCount = chapterEditorsEl.querySelectorAll(".chapter-editor").length;
    var chapterNumber = chapterCount + 1;
    var wrapper = document.createElement("div");
    wrapper.className = "chapter-editor";
    wrapper.innerHTML =
      '<div class="chapter-editor-head">' +
        '<strong class="chapter-editor-heading">Chapter ' + chapterNumber + '</strong>' +
        '<div class="chapter-editor-actions">' +
          '<button type="button" class="chapter-move-btn" data-chapter-action="up" aria-label="Move chapter up">↑</button>' +
          '<button type="button" class="chapter-move-btn" data-chapter-action="down" aria-label="Move chapter down">↓</button>' +
          '<button type="button" class="chapter-remove-btn">Remove</button>' +
        '</div>' +
      '</div>' +
      '<label>Chapter Title<input class="chapter-title-input" type="text" placeholder="Chapter title" /></label>' +
      '<label>Chapter Content<textarea class="chapter-content-input" rows="8" placeholder="Write this chapter here..."></textarea></label>';

    var titleInput = wrapper.querySelector(".chapter-title-input");
    var contentInput = wrapper.querySelector(".chapter-content-input");
    if (titleInput) {
      titleInput.value = (chapterData && chapterData.title) ? chapterData.title : ("Chapter " + chapterNumber);
    }
    if (contentInput) {
      contentInput.value = (chapterData && chapterData.content) ? chapterData.content : "";
    }

    chapterEditorsEl.appendChild(wrapper);
    renumberChapterEditors();
    updateWordCountFromChapters();
  }

  function resetChapterEditors(chapters) {
    if (!chapterEditorsEl) {
      return;
    }

    chapterEditorsEl.innerHTML = "";
    var source = Array.isArray(chapters) && chapters.length ? chapters : [{ title: "Chapter 1", content: "" }];
    source.forEach(function (chapter) {
      appendChapterEditor(chapter);
    });
    renumberChapterEditors();
    updateWordCountFromChapters();
  }

  function collectTags() {
    var checked = Array.from(
      document.querySelectorAll(".writer-tags-checkboxes input[type='checkbox']:checked")
    ).map(function (cb) { return cb.value.trim(); }).filter(Boolean);

    var extraInput = document.getElementById("workExtraTags");
    var extra = (extraInput ? extraInput.value : "")
      .split(",").map(function (t) { return t.trim(); }).filter(Boolean);

    return Array.from(new Set(checked.concat(extra)));
  }

  function collectLangs() {
    return SUPPORTED_AUDIO_LANGS.slice();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    var parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? "0" : parsed.toLocaleString("en-US");
  }

  function getBadgeHtml(text, className, style) {
    var styleAttr = style ? ' style="' + style + '"' : "";
    return '<span class="rating-badge ' + className + '"' + styleAttr + '>' + escapeHtml(text) + '</span>';
  }

  function getSymbolPreviewMarkup(type, value) {
    var normalized = String(value || "").toLowerCase().trim();

    if (type === "rating") {
      if (normalized === "general audiences") return getBadgeHtml("G", "badge-green") + "<span>General Audiences</span>";
      if (normalized === "teen and up audiences") return getBadgeHtml("T", "badge-yellow") + "<span>Teen And Up Audiences</span>";
      if (normalized === "mature") return getBadgeHtml("M", "badge-orange") + "<span>Mature</span>";
      if (normalized === "explicit") return getBadgeHtml("E", "badge-red") + "<span>Explicit: only suitable for adults</span>";
      return '<span class="writer-symbol-empty"></span><span>The work was not given any rating</span>';
    }

    if (type === "warnings") {
      if (normalized.indexOf("creator chose") !== -1) {
        return getBadgeHtml("?", "badge-orange") + "<span>The author chose not to warn for content, or Archive Warnings could apply.</span>";
      }
      if (normalized.indexOf("archive warnings apply") !== -1) {
        return getBadgeHtml("!", "badge-red") + "<span>At least one warning applies: graphic violence, major character death, rape, or underage sex.</span>";
      }
      if (normalized.indexOf("warnings may be listed") !== -1) {
        return getBadgeHtml("i", "badge-blue") + "<span>Warnings may be listed in tags, relationships, or the Additional Tags section.</span>";
      }
      return '<span class="writer-symbol-empty"></span><span>No warning selected</span>';
    }

    if (type === "status") {
      if (normalized.indexOf("progress") !== -1 || normalized.indexOf("wip") !== -1) return getBadgeHtml("X", "badge-red") + "<span>This is a work in progress or incomplete/unfulfilled.</span>";
      if (normalized.indexOf("complete") !== -1) return getBadgeHtml("✓", "badge-green") + "<span>This work is completed/this prompt is filled.</span>";
      return '<span class="writer-symbol-empty"></span><span>This work\'s status is unknown.</span>';
    }

    if (type === "category") {
      if (normalized === "f/f") return getBadgeHtml("F", "", "background:#d02c74") + "<span>F/F</span>";
      if (normalized === "f/m") return getBadgeHtml("M", "", "background:#8e35d3") + "<span>F/M</span>";
      if (normalized === "gen") return getBadgeHtml("G", "badge-green") + "<span>Gen: no romantic/sexual relationships, or not the main focus</span>";
      if (normalized === "m/m") return getBadgeHtml("N", "", "background:#2d63c8") + "<span>M/M</span>";
      if (normalized === "multi") return getBadgeHtml("A", "", "background:#6f57c5") + "<span>Multi: more than one type of relationship</span>";
      if (normalized === "other") return getBadgeHtml("?", "", "background:#4f4f4f") + "<span>Other relationships</span>";
      return '<span class="writer-symbol-empty"></span><span>The work was not put in any categories</span>';
    }

    return "";
  }

  function refreshSymbolPreviews() {
    if (ratingSymbolEl && ratingEl) {
      ratingSymbolEl.innerHTML = getSymbolPreviewMarkup("rating", ratingEl.value);
    }
    if (warningsSymbolEl && warningsEl) {
      warningsSymbolEl.innerHTML = getSymbolPreviewMarkup("warnings", warningsEl.value);
    }
    if (statusSymbolEl && statusEl) {
      statusSymbolEl.innerHTML = getSymbolPreviewMarkup("status", statusEl.value);
    }
    if (categorySymbolEl && categoryEl) {
      categorySymbolEl.innerHTML = getSymbolPreviewMarkup("category", categoryEl.value);
    }
  }

  function renderInlinePreview(data) {
    if (!writerPreviewCardEl || !previewSummaryEl || !data) {
      return;
    }

    var chapterBlocks = (Array.isArray(data.chaptersData) ? data.chaptersData : []).map(function (chapter, index) {
      var title = (chapter && chapter.title ? chapter.title : ("Chapter " + (index + 1))).trim();
      var content = String((chapter && chapter.content) || "").trim();
      var excerpt = content.length > 340 ? (content.slice(0, 340) + "...") : content;

      return (
        '<article class="writer-inline-chapter">' +
          '<h4>' + escapeHtml(title || ("Chapter " + (index + 1))) + '</h4>' +
          '<p>' + escapeHtml(excerpt || "No chapter content yet.") + '</p>' +
        '</article>'
      );
    }).join("");

    if (!chapterBlocks) {
      chapterBlocks = '<p class="writer-inline-empty">No chapter content yet.</p>';
    }

    var tagsHtml = (data.tags || []).map(function (tag) {
      return '<span class="tag">' + escapeHtml(tag) + '</span>';
    }).join("");

    previewSummaryEl.innerHTML =
      '<div class="writer-inline-preview-meta">' +
        '<p><strong>Title:</strong> ' + escapeHtml(data.title || "Untitled Work") + '</p>' +
        '<p><strong>Fandom:</strong> ' + escapeHtml(data.fandom || "Unknown") + '</p>' +
        '<p><strong>Rating:</strong> ' + escapeHtml(data.rating || "") + ' • <strong>Warnings:</strong> ' + escapeHtml(data.warnings || "") + '</p>' +
        '<p><strong>Status:</strong> ' + escapeHtml(data.status || "") + ' • <strong>Category:</strong> ' + escapeHtml(data.category || "") + '</p>' +
        '<p><strong>Words:</strong> ' + formatNumber(data.words || 0) + ' • <strong>Chapters:</strong> ' + String(data.chapters || 1) + '</p>' +
      '</div>' +
      '<div class="writer-inline-preview-tags">' +
        '<strong>Tags:</strong> ' + (tagsHtml || '<span class="writer-inline-empty">No tags</span>') +
      '</div>' +
      '<div class="writer-inline-preview-chapters">' + chapterBlocks + '</div>';

    writerPreviewCardEl.hidden = false;
  }

  function getEditorState() {
    var extraEl = document.getElementById("workExtraTags");
    var audioEl = document.getElementById("workAudioEnabled");

    return {
      editingId: currentEditingId,
      draftId: currentDraftId,
      title: (document.getElementById("workTitle").value || "").trim(),
      fandom: (document.getElementById("workFandom").value || "").trim(),
      rating: (document.getElementById("workRating").value || "").trim(),
      warnings: (document.getElementById("workWarnings").value || "").trim(),
      status: (document.getElementById("workStatus").value || "").trim(),
      category: (document.getElementById("workCategory").value || "").trim(),
      chaptersData: getChapterEntries(),
      extra: (extraEl ? extraEl.value : "").trim(),
      audioEnabled: !!(audioEl && audioEl.checked),
      checkedTags: Array.from(document.querySelectorAll(".writer-tags-checkboxes input:checked"))
        .map(function (input) {
          return input.value;
        })
        .sort()
    };
  }

  function serializeEditorState(state) {
    return JSON.stringify(state || getEditorState());
  }

  function markEditorStateCommitted(state) {
    committedEditorState = serializeEditorState(state || getEditorState());
  }

  function hasUnsavedEditorChanges() {
    return serializeEditorState(getEditorState()) !== committedEditorState;
  }

  function confirmDiscardUnsavedChanges() {
    if (!hasUnsavedEditorChanges()) {
      return true;
    }

    return window.confirm("You have unsaved changes. Leave this editor and discard them?");
  }

  function getNowLabel() {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function getDefaultAudioLangs() {
    return SUPPORTED_AUDIO_LANGS.slice();
  }

  function getBuiltInTagValues() {
    return Array.from(document.querySelectorAll(".writer-tags-checkboxes input[type='checkbox']"))
      .map(function (checkbox) {
        return checkbox.value;
      });
  }

  function gatherFormData() {
    var chaptersData = getChapterEntries();
    var content = getCombinedContentFromChapters(chaptersData);
    return {
      title:        (document.getElementById("workTitle").value        || "").trim(),
      fandom:       (document.getElementById("workFandom").value       || "").trim(),
      rating:       (document.getElementById("workRating").value       || "").trim(),
      warnings:     (document.getElementById("workWarnings").value     || "").trim(),
      status:       (document.getElementById("workStatus").value       || "").trim(),
      category:     (document.getElementById("workCategory").value     || "").trim(),
      words:        getTotalWordsFromChapters(chaptersData),
      content:      content,
      chaptersData: chaptersData,
      chapters:     chaptersData.length,
      tags:         collectTags(),
      audioEnabled: !!(document.getElementById("workAudioEnabled") || {}).checked,
      audioLangs:   getDefaultAudioLangs()
    };
  }

  function validateWorkData(data) {
    if (!data.title || !data.fandom || !data.rating || !data.warnings || !data.status || !data.category)
      return "Please complete all required fields before publishing.";
    if (!data.chaptersData.length || !data.content)
      return "Please add story content before publishing.";
    return "";
  }

  /* ── LOCALSTORAGE WORKS ─────────────────────────────────── */
  function getStoredWorks() {
    try {
      var raw = localStorage.getItem(UPLOADED_WORKS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function saveStoredWorks(works) {
    localStorage.setItem(UPLOADED_WORKS_KEY, JSON.stringify(works));
  }

  function getStoredDraftLibrary() {
    try {
      var raw = localStorage.getItem(DRAFT_LIBRARY_KEY);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredDraftLibrary(drafts) {
    localStorage.setItem(DRAFT_LIBRARY_KEY, JSON.stringify(drafts));
  }

  function getDraftsByCurrentWriter() {
    return getStoredDraftLibrary().filter(function (draft) {
      return draft && draft.uploadedBy === username;
    });
  }

  function findDraftById(draftId) {
    return getStoredDraftLibrary().find(function (draft) {
      return draft && draft.id === draftId && draft.uploadedBy === username;
    }) || null;
  }

  /* ── BUILD WORK OBJECT ──────────────────────────────────── */
  function buildWorkObject(data) {
    var summary = data.content.replace(/\s+/g, " ").slice(0, 220) +
                  (data.content.length > 220 ? "..." : "");
    var tagA    = data.tags[0] || "Drama";
    var tagB    = data.tags[1] || "Romance";
    var langLabel = "Auto (All Supported Languages)";

    return {
      id:           "user-work-" + Date.now(),
      uploadedBy:   username,
      title:        data.title,
      fandom:       data.fandom,
      categoryName: "Books & Literature",
      category:     data.category,
      rating:       data.rating,
      warnings:     data.warnings,
      status:       data.status,
      words:        data.words,
      tags:         data.tags,
      text:         summary,
      content:      data.content,
      chaptersData: data.chaptersData,
      chapters:     data.chapters || 1,
      language:     langLabel,
      updated:      getNowLabel(),
      hits:         0,
      kudos:        0,
      bookmarks:    0,
      comments:     0,
      audioEnabled: data.audioEnabled,
      audioLangs:   data.audioLangs,
      audioLanguage: data.audioLangs[0] || "en",
      meta: data.fandom + " • " + tagA + " • " + tagB + " • " +
            data.words.toLocaleString("en-US") + " words" +
            (data.audioEnabled ? " • Audio: " + langLabel : "")
    };
  }

  /* ── BUILD READER LINK ──────────────────────────────────── */
  function buildReaderLink(work) {
    var params = new URLSearchParams();
    params.set("workId",        work.id || "");
    params.set("title",         work.title);
    params.set("fandom",        work.fandom);
    params.set("category",      work.categoryName || "Books & Literature");
    params.set("author",        work.uploadedBy || username);
    params.set("meta",          work.meta);
    params.set("summary",       work.text || "");
    params.set("content",       work.content || "");
    params.set("chapters",      String(work.chapters || 1));
    params.set("chapter",       "1");
    params.set("rating",        work.rating);
    params.set("warnings",      work.warnings || "No Archive Warnings Apply");
    params.set("status",        work.status);
    params.set("tags",          (work.tags || []).join(", "));
    params.set("language",      work.language || "English");
    params.set("updated",       work.updated || "");
    params.set("hits",          String(work.hits || 0));
    params.set("kudos",         String(work.kudos || 0));
    params.set("bookmarks",     String(work.bookmarks || 0));
    params.set("comments",      String(work.comments || 0));
    params.set("audioLanguage", work.audioLanguage || "en");
    params.set("audioLangs",    (work.audioLangs  || []).join(","));
    params.set("audioEnabled",  work.audioEnabled === false ? "0" : "1");
    return "work-fandom.html?" + params.toString();
  }

  /* ── DRAFT SAVE / RESTORE ───────────────────────────────── */
  function collectDraftState() {
    return {
      draftId:      currentDraftId,
      title:        document.getElementById("workTitle").value,
      fandom:       document.getElementById("workFandom").value,
      rating:       document.getElementById("workRating").value,
      warnings:     document.getElementById("workWarnings").value,
      status:       document.getElementById("workStatus").value,
      category:     document.getElementById("workCategory").value,
      wc:           wordCountEl ? wordCountEl.value : "0",
      content:      getCombinedContentFromChapters(getChapterEntries()),
      chaptersData: getChapterEntries(),
      extra:        (document.getElementById("workExtraTags") || {}).value || "",
      audioEnabled: !!(document.getElementById("workAudioEnabled") || {}).checked,
      checkedTags:  Array.from(
        document.querySelectorAll(".writer-tags-checkboxes input:checked")
      ).map(function (i) { return i.value; }),
      checkedLangs: getDefaultAudioLangs(),
      editingId:    currentEditingId
    };
  }

  function hasMeaningfulDraft(state) {
    var chapters = Array.isArray(state.chaptersData) ? state.chaptersData : [];
    var hasChapterText = chapters.some(function (chapter) {
      return !!String((chapter && chapter.content) || "").trim();
    });

    return !!(
      String(state.title || "").trim() ||
      String(state.fandom || "").trim() ||
      String(state.extra || "").trim() ||
      hasChapterText
    );
  }

  function renderDraftLibrary() {
    if (!writerDraftListEl || !writerDraftEmptyEl) {
      return;
    }

    var drafts = getDraftsByCurrentWriter();

    if (!drafts.length) {
      writerDraftListEl.innerHTML = "";
      writerDraftEmptyEl.style.display = "block";
      return;
    }

    writerDraftEmptyEl.style.display = "none";
    writerDraftListEl.innerHTML = drafts.map(function (draft) {
      var draftState = draft.state || {};
      var title = String(draftState.title || draft.title || "Untitled Draft");
      var fandom = String(draftState.fandom || "Unknown");
      var words = parseInt(draftState.wc || "0", 10) || 0;
      var chapterCount = Array.isArray(draftState.chaptersData) && draftState.chaptersData.length
        ? draftState.chaptersData.length
        : 1;

      return (
        '<article class="writer-library-item">' +
          '<div class="writer-library-item-head">' +
            '<h4 class="writer-library-item-title">' + escapeHtml(title) + '</h4>' +
            '<span>' + escapeHtml(draft.updated || "") + '</span>' +
          '</div>' +
          '<p class="writer-library-item-meta">' +
            'Fandom: ' + escapeHtml(fandom) +
            ' • Words: ' + formatNumber(words) +
            ' • Chapters: ' + formatNumber(chapterCount) +
          '</p>' +
          '<div class="writer-library-item-links">' +
            '<button type="button" class="writer-library-action" data-draft-action="load" data-draft-id="' + escapeHtml(draft.id || "") + '">Continue Editing</button>' +
            '<button type="button" class="writer-library-action" data-draft-action="rename" data-draft-id="' + escapeHtml(draft.id || "") + '">Rename</button>' +
            '<button type="button" class="writer-library-action danger" data-draft-action="delete" data-draft-id="' + escapeHtml(draft.id || "") + '">Delete Draft</button>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function saveDraft(showMessage) {
    var state = collectDraftState();
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));

    if (!hasMeaningfulDraft(state)) {
      if (showMessage) {
        setMessage("Nothing to save yet. Add title or chapter content first.", true);
      }
      return;
    }

    var drafts = getStoredDraftLibrary();
    var nowLabel = getNowLabel() + " " + getClockLabel();
    var nextDraftId = currentDraftId || ("draft-work-" + Date.now());
    var nextRecord = {
      id: nextDraftId,
      uploadedBy: username,
      title: String(state.title || "Untitled Draft"),
      updated: nowLabel,
      state: Object.assign({}, state, { draftId: nextDraftId })
    };

    var replaced = false;
    drafts = drafts.map(function (draft) {
      if (draft && draft.id === nextDraftId && draft.uploadedBy === username) {
        replaced = true;
        return nextRecord;
      }
      return draft;
    });

    if (!replaced) {
      drafts.unshift(nextRecord);
    }

    currentDraftId = nextDraftId;
    saveStoredDraftLibrary(drafts);
    renderDraftLibrary();
    setDraftStatus("Draft saved at " + getClockLabel());
    if (showMessage) {
      setMessage("Draft saved to your Draft Library.", false);
    }
  }

  function scheduleDraftAutosave() {
    if (draftAutosaveTimer) {
      clearTimeout(draftAutosaveTimer);
    }

    setDraftStatus("Saving draft...");
    draftAutosaveTimer = setTimeout(function () {
      saveDraft(false);
      draftAutosaveTimer = null;
    }, 450);
  }

  function restoreDraftState(state) {
    if (!state) return;
    currentDraftId = state.draftId || currentDraftId || "";
    currentEditingId = state.editingId || "";
    document.getElementById("workTitle").value    = state.title    || "";
    document.getElementById("workFandom").value   = state.fandom   || "";
    document.getElementById("workRating").value   = state.rating   || "";
    document.getElementById("workWarnings").value = state.warnings || "No Archive Warnings Apply";
    document.getElementById("workStatus").value   = state.status   || "";
    document.getElementById("workCategory").value = state.category || "";
    resetChapterEditors(state.chaptersData || [{ title: "Chapter 1", content: state.content || "" }]);
    var extraEl = document.getElementById("workExtraTags");
    if (extraEl) extraEl.value                    = state.extra    || "";
    var audioEl = document.getElementById("workAudioEnabled");
    if (audioEl) audioEl.checked                  = !!state.audioEnabled;

    document.querySelectorAll(".writer-tags-checkboxes input[type='checkbox']")
      .forEach(function (cb) {
        cb.checked = (state.checkedTags || []).indexOf(cb.value) !== -1;
      });

    updateWordCountFromChapters();

    updateSubmitState();
  }

  function updateSubmitState() {
    if (submitBtn) {
      submitBtn.textContent = currentEditingId ? "Update Work" : "Publish Work";
    }

    if (newWorkBtn) {
      newWorkBtn.textContent = currentEditingId ? "Cancel Editing" : "+ New Work";
    }
  }

  function resetFormState() {
    currentEditingId = "";
    currentDraftId = "";
    sessionStorage.removeItem(DRAFT_KEY);
    if (form) {
      form.reset();
    }
    resetChapterEditors([{ title: "Chapter 1", content: "" }]);
    document.querySelectorAll(".writer-tags-checkboxes input[type='checkbox']")
      .forEach(function (checkbox) {
        checkbox.checked = checkbox.hasAttribute("checked");
      });
    var audioEl = document.getElementById("workAudioEnabled");
    if (audioEl) {
      audioEl.checked = true;
    }
    if (writerPreviewCardEl) {
      writerPreviewCardEl.hidden = true;
    }
    if (previewSummaryEl) {
      previewSummaryEl.innerHTML = "";
    }
    setDraftStatus("");
    refreshSymbolPreviews();
    updateSubmitState();
    markEditorStateCommitted();
  }

  function populateFormForEdit(work) {
    if (!work) {
      return;
    }

    currentDraftId = "";

    currentEditingId = work.id || "";
    document.getElementById("workTitle").value = work.title || "";
    document.getElementById("workFandom").value = work.fandom || "";
    document.getElementById("workRating").value = work.rating || "";
    document.getElementById("workWarnings").value = work.warnings || "No Archive Warnings Apply";
    document.getElementById("workStatus").value = work.status || "";
    document.getElementById("workCategory").value = work.category || "";
    var chapterSource = Array.isArray(work.chaptersData) && work.chaptersData.length
      ? work.chaptersData
      : [{ title: "Chapter 1", content: work.content || "" }];
    resetChapterEditors(chapterSource);
    if (wordCountEl) {
      wordCountEl.value = work.words || getTotalWordsFromChapters(chapterSource);
    }

    var builtInTags = getBuiltInTagValues();
    var workTags = Array.isArray(work.tags) ? work.tags : [];

    document.querySelectorAll(".writer-tags-checkboxes input[type='checkbox']")
      .forEach(function (checkbox) {
        checkbox.checked = workTags.indexOf(checkbox.value) !== -1;
      });

    var extraEl = document.getElementById("workExtraTags");
    if (extraEl) {
      extraEl.value = workTags.filter(function (tag) {
        return builtInTags.indexOf(tag) === -1;
      }).join(", ");
    }

    var audioEl = document.getElementById("workAudioEnabled");
    if (audioEl) {
      audioEl.checked = work.audioEnabled !== false;
    }

    refreshSymbolPreviews();
    updateSubmitState();
    setMessage("Editing \"" + (work.title || "Untitled Work") + "\".", false);
    markEditorStateCommitted();
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    var firstChapterTextarea = chapterEditorsEl ? chapterEditorsEl.querySelector(".chapter-content-input") : null;
    if (firstChapterTextarea) {
      firstChapterTextarea.focus();
    }
  }

  function findWorkById(workId) {
    return getStoredWorks().find(function (work) {
      return work && work.id === workId && work.uploadedBy === username;
    }) || null;
  }

  function getWorksByCurrentWriter() {
    return getStoredWorks().filter(function (work) {
      return work && work.uploadedBy === username;
    });
  }

  function renderWriterLibrary() {
    if (!writerLibraryListEl || !writerLibraryEmptyEl) {
      return;
    }

    var authoredWorks = getWorksByCurrentWriter();

    if (!authoredWorks.length) {
      writerLibraryListEl.innerHTML = "";
      writerLibraryEmptyEl.style.display = "block";
      return;
    }

    writerLibraryEmptyEl.style.display = "none";
    writerLibraryListEl.innerHTML = authoredWorks.map(function (work) {
      var readerLink = buildReaderLink(work);
      return (
        '<article class="writer-library-item">' +
          '<div class="writer-library-item-head">' +
            '<h4 class="writer-library-item-title">' + escapeHtml(work.title || "Untitled Work") + '</h4>' +
            '<span>' + escapeHtml(work.updated || "") + '</span>' +
          '</div>' +
          '<p class="writer-library-item-meta">' +
            'Fandom: ' + escapeHtml(work.fandom || "Unknown") +
            ' • Words: ' + formatNumber(work.words || 0) +
            ' • Kudos: ' + formatNumber(work.kudos || 0) +
          '</p>' +
          '<div class="writer-library-item-links">' +
            '<a href="' + escapeHtml(readerLink) + '">View Story</a>' +
            '<a href="browse-works.html?fandom=' + encodeURIComponent(work.fandom || "") + '&category=Books%20%26%20Literature">Open in Browse</a>' +
            '<button type="button" class="writer-library-action" data-library-action="edit" data-work-id="' + escapeHtml(work.id || "") + '">Edit</button>' +
            '<button type="button" class="writer-library-action danger" data-library-action="delete" data-work-id="' + escapeHtml(work.id || "") + '">Delete</button>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  /* ── CHAPTER EVENTS / LIVE WORD COUNT ──────────────────── */
  if (chapterEditorsEl) {
    chapterEditorsEl.addEventListener("input", function (event) {
      if (event.target && (event.target.classList.contains("chapter-content-input") || event.target.classList.contains("chapter-title-input"))) {
        updateWordCountFromChapters();
      }
    });

    chapterEditorsEl.addEventListener("click", function (event) {
      var moveBtn = event.target.closest(".chapter-move-btn");
      if (moveBtn) {
        var chapterCardToMove = moveBtn.closest(".chapter-editor");
        if (!chapterCardToMove || !chapterCardToMove.parentElement) {
          return;
        }

        var moveDirection = moveBtn.getAttribute("data-chapter-action");
        if (moveDirection === "up") {
          var previous = chapterCardToMove.previousElementSibling;
          if (previous) {
            chapterCardToMove.parentElement.insertBefore(chapterCardToMove, previous);
          }
        } else if (moveDirection === "down") {
          var next = chapterCardToMove.nextElementSibling;
          if (next) {
            chapterCardToMove.parentElement.insertBefore(next, chapterCardToMove);
          }
        }

        renumberChapterEditors();
        updateWordCountFromChapters();
        scheduleDraftAutosave();
        return;
      }

      var removeBtn = event.target.closest(".chapter-remove-btn");
      if (!removeBtn) {
        return;
      }

      var editors = chapterEditorsEl.querySelectorAll(".chapter-editor");
      if (editors.length <= 1) {
        setMessage("At least one chapter is required.", true);
        return;
      }

      var chapterCard = removeBtn.closest(".chapter-editor");
      if (chapterCard) {
        chapterCard.remove();
      }

      renumberChapterEditors();
      updateWordCountFromChapters();
      scheduleDraftAutosave();
      setMessage("", false);
    });
  }

  if (addChapterBtn) {
    addChapterBtn.addEventListener("click", function () {
      appendChapterEditor({});
      var editors = chapterEditorsEl ? chapterEditorsEl.querySelectorAll(".chapter-editor") : [];
      var latest = editors.length ? editors[editors.length - 1].querySelector(".chapter-content-input") : null;
      if (latest) {
        latest.focus();
      }
    });
  }

  // Initialize editor with at least one chapter block.
  resetChapterEditors([{ title: "Chapter 1", content: "" }]);

  if (form) {
    form.addEventListener("input", function () {
      scheduleDraftAutosave();
    });

    form.addEventListener("change", function () {
      scheduleDraftAutosave();
    });
  }

  [ratingEl, warningsEl, statusEl, categoryEl].forEach(function (selectEl) {
    if (!selectEl) {
      return;
    }

    selectEl.addEventListener("change", function () {
      refreshSymbolPreviews();
    });
  });

  /* ── RESTORE DRAFT ON LOAD ──────────────────────────────── */
  initialEditorState = serializeEditorState(getEditorState());
  var savedDraft = sessionStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try { restoreDraftState(JSON.parse(savedDraft)); } catch (e) {}
    setDraftStatus("Draft restored from this session.");
  }
  renderDraftLibrary();
  renderWriterLibrary();
  updateSubmitState();
  refreshSymbolPreviews();
  if (savedDraft) {
    committedEditorState = initialEditorState;
  } else {
    markEditorStateCommitted();
  }

  window.addEventListener("beforeunload", function (event) {
    saveDraft(false);

    if (suppressBeforeUnloadPrompt || !hasUnsavedEditorChanges()) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  document.addEventListener("click", function (event) {
    var targetLink = event.target.closest("a[href]");
    if (!targetLink) {
      return;
    }

    var href = targetLink.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || targetLink.hasAttribute("download") || targetLink.target === "_blank") {
      return;
    }

    if (!confirmDiscardUnsavedChanges()) {
      event.preventDefault();
      return;
    }

    saveDraft(false);
  });

  window.addEventListener("pagehide", function () {
    saveDraft(false);
  });

  if (writerDraftListEl) {
    writerDraftListEl.addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-draft-action]");
      if (!actionButton) {
        return;
      }

      var draftId = actionButton.getAttribute("data-draft-id") || "";
      var action = actionButton.getAttribute("data-draft-action") || "";
      var targetDraft = findDraftById(draftId);

      if (!targetDraft) {
        setMessage("That draft could not be found.", true);
        renderDraftLibrary();
        return;
      }

      if (action === "load") {
        if (!confirmDiscardUnsavedChanges()) {
          return;
        }
        restoreDraftState(targetDraft.state || {});
        setMessage("Draft loaded. Continue editing.", false);
        setDraftStatus("Editing draft last saved at " + String(targetDraft.updated || ""));
        markEditorStateCommitted();
        if (form) {
          form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      if (action === "rename") {
        var currentTitle = String((targetDraft.state && targetDraft.state.title) || targetDraft.title || "Untitled Draft");
        var updatedTitle = window.prompt("Rename this draft:", currentTitle);

        if (updatedTitle === null) {
          return;
        }

        updatedTitle = String(updatedTitle || "").trim();
        if (!updatedTitle) {
          setMessage("Draft title cannot be empty.", true);
          return;
        }

        var renamedDrafts = getStoredDraftLibrary().map(function (draft) {
          if (!draft || draft.id !== draftId || draft.uploadedBy !== username) {
            return draft;
          }

          var nextState = Object.assign({}, draft.state || {}, { title: updatedTitle });
          return Object.assign({}, draft, {
            title: updatedTitle,
            updated: getNowLabel() + " " + getClockLabel(),
            state: nextState
          });
        });

        saveStoredDraftLibrary(renamedDrafts);

        if (currentDraftId === draftId) {
          document.getElementById("workTitle").value = updatedTitle;
          scheduleDraftAutosave();
        }

        renderDraftLibrary();
        setMessage("Draft renamed.", false);
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete this draft? This cannot be undone.")) {
          return;
        }

        var nextDrafts = getStoredDraftLibrary().filter(function (draft) {
          return !(draft && draft.id === draftId && draft.uploadedBy === username);
        });
        saveStoredDraftLibrary(nextDrafts);

        if (currentDraftId === draftId) {
          currentDraftId = "";
        }

        renderDraftLibrary();
        setMessage("Draft deleted.", false);
      }
    });
  }

  if (writerLibraryListEl) {
    writerLibraryListEl.addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-library-action]");
      if (!actionButton) {
        return;
      }

      var workId = actionButton.getAttribute("data-work-id") || "";
      var action = actionButton.getAttribute("data-library-action") || "";
      var targetWork = findWorkById(workId);

      if (!targetWork) {
        setMessage("That story could not be found.", true);
        renderWriterLibrary();
        return;
      }

      if (action === "edit") {
        if (!targetWork || (currentEditingId !== workId && !confirmDiscardUnsavedChanges())) {
          return;
        }
        populateFormForEdit(targetWork);
        return;
      }

      if (action === "delete") {
        if (!window.confirm("Delete \"" + (targetWork.title || "Untitled Work") + "\"? This cannot be undone.")) {
          return;
        }

        var nextWorks = getStoredWorks().filter(function (work) {
          return !(work && work.id === workId && work.uploadedBy === username);
        });
        saveStoredWorks(nextWorks);

        if (currentEditingId === workId) {
          resetFormState();
          setMessage("Story deleted. Editor reset.", false);
        } else {
          setMessage("Story deleted.", false);
        }

        renderWriterLibrary();
      }
    });
  }

  /* ── SHOW SUCCESS IF REDIRECTED AFTER PUBLISH ───────────── */
  if (new URLSearchParams(window.location.search).get("published") === "1") {
    setMessage("Work published successfully!");
    history.replaceState(null, "", window.location.pathname);
  }

  /* ── NEW WORK BUTTON ────────────────────────────────────── */
  if (newWorkBtn) {
    newWorkBtn.addEventListener("click", function () {
      if (!confirmDiscardUnsavedChanges()) {
        return;
      }
      resetFormState();
      setMessage("");
      var firstChapterTextarea = chapterEditorsEl ? chapterEditorsEl.querySelector(".chapter-content-input") : null;
      if (firstChapterTextarea) firstChapterTextarea.focus();
      if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", function () {
      saveDraft(true);
    });
  }

  /* ── PREVIEW BUTTON ─────────────────────────────────────── */
  if (previewBtn) {
    previewBtn.addEventListener("click", function () {
      var data = gatherFormData();

      if (!data.title || !data.content) {
        setMessage("Please fill in at least a title and story content to preview.", true);
        return;
      }

      // Save full draft so form is restored when user returns
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraftState()));

      // Save preview payload for work-preview.html
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify({
        title:    data.title,
        fandom:   data.fandom,
        rating:   data.rating,
        warnings: data.warnings,
        status:   data.status,
        category: data.category,
        wc:       data.words,
        content:  data.content,
        chaptersData: data.chaptersData,
        tags:     data.tags,
        langs:    data.audioLangs
      }));

      renderInlinePreview(data);
      setMessage("Preview generated below. Review it before publishing.", false);
      if (writerPreviewCardEl) {
        writerPreviewCardEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  /* ── PUBLISH (form submit) ──────────────────────────────── */
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data  = gatherFormData();
      var error = validateWorkData(data);
      if (error) { setMessage(error, true); return; }

      var works = getStoredWorks();
      var work;

      if (currentEditingId) {
        var existingWork = findWorkById(currentEditingId);
        if (!existingWork) {
          setMessage("The story you are editing no longer exists.", true);
          resetFormState();
          renderWriterLibrary();
          return;
        }

        work = Object.assign({}, existingWork, buildWorkObject(data), {
          id: existingWork.id,
          uploadedBy: existingWork.uploadedBy,
          updated: getNowLabel(),
          hits: existingWork.hits || 0,
          kudos: existingWork.kudos || 0,
          bookmarks: existingWork.bookmarks || 0,
          comments: existingWork.comments || 0
        });

        works = works.map(function (item) {
          if (item && item.id === currentEditingId && item.uploadedBy === username) {
            return work;
          }
          return item;
        });
      } else {
        work  = buildWorkObject(data);
        works.unshift(work);
      }

      saveStoredWorks(works);
      if (currentDraftId) {
        var remainingDrafts = getStoredDraftLibrary().filter(function (draft) {
          return !(draft && draft.id === currentDraftId && draft.uploadedBy === username);
        });
        saveStoredDraftLibrary(remainingDrafts);
        currentDraftId = "";
        renderDraftLibrary();
      }
      renderWriterLibrary();

      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(PREVIEW_KEY);
      setDraftStatus("");

      setMessage(currentEditingId ? "Work updated! Redirecting to your story page…" : "Work published! Redirecting to your story page…");
      currentEditingId = "";
      updateSubmitState();
      markEditorStateCommitted({
        editingId: "",
        draftId: "",
        title: "",
        fandom: (document.getElementById("workFandom").value || "").trim(),
        rating: (document.getElementById("workRating").value || "").trim(),
        warnings: (document.getElementById("workWarnings").value || "").trim(),
        status: (document.getElementById("workStatus").value || "").trim(),
        category: (document.getElementById("workCategory").value || "").trim(),
        chaptersData: getChapterEntries(),
        extra: "",
        audioEnabled: !!((document.getElementById("workAudioEnabled") || {}).checked),
        checkedTags: Array.from(document.querySelectorAll(".writer-tags-checkboxes input:checked"))
          .map(function (input) { return input.value; })
          .sort()
      });
      suppressBeforeUnloadPrompt = true;

      setTimeout(function () {
        window.location.href = buildReaderLink(work);
      }, 700);
    });
  }

})();