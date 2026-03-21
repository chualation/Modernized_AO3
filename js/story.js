/* STORY.JS - Story interactions (kudos, bookmarks, subscribe, chapter navigation) */

// Only run on reader pages
if (document.body && document.body.dataset.page === "reader") {
  /* KUDOS / BOOKMARK / SUBSCRIBE */
  const urlParams = new URLSearchParams(window.location.search);
  const uploadedWorksKey = "ao3-uploaded-works";
  const authStorageKey = "ao3-auth-user";

  function checkAuthAndWarn() {
    var currentUser = (localStorage.getItem(authStorageKey) || "").trim();
    if (!currentUser) {
      alert("Log in to save your bookmarks, keep track of chapter progress, and personalize your reading experience.");
      return false;
    }
    return true;
  }

  const storyKey = (function () {
    var explicitWorkId = (urlParams.get("workId") || "").trim();
    if (explicitWorkId) {
      return explicitWorkId;
    }

    var params = new URLSearchParams(window.location.search);
    var titleFromQuery = params.get("title") || document.title || "work";
    return titleFromQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "work";
  })();
  const statsStorageKey = `ao3-story-stats-${storyKey}`;
  const commentsStorageKey = `ao3-story-comments-${storyKey}`;
  const commentsUiStorageKey = `ao3-story-comments-ui-${storyKey}`;

  const kudosBtn = document.getElementById("kudosBtn");
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  const subscribeBtn = document.getElementById("subscribeBtn");
  const kudosCount = document.getElementById("kudosCount");
  const bookmarkCount = document.getElementById("bookmarkCount");
  const commentCount = document.getElementById("commentCount");

  function formatCount(value) {
    return value.toLocaleString("en-US");
  }

  function readStoredCount(storageKey, fallbackValue) {
    const storedValue = parseInt(localStorage.getItem(storageKey), 10);

    if (Number.isNaN(storedValue)) {
      return fallbackValue;
    }

    return storedValue;
  }

  function parseCountFromElement(element) {
    if (!element) {
      return 0;
    }

    var parsed = parseInt(String(element.textContent || "").replace(/,/g, ""), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCommentDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function readComments() {
    try {
      var raw = localStorage.getItem(commentsStorageKey);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(function (comment) {
        return comment && typeof comment === "object" && String(comment.content || "").trim();
      });
    } catch (error) {
      return [];
    }
  }

  function writeComments(comments) {
    localStorage.setItem(commentsStorageKey, JSON.stringify(comments));
  }

  function getSampleComments() {
    if (uploadedSeedStats) {
      return [];
    }

    var title = String(urlParams.get("title") || document.title || "").trim();

    var samplesByTitle = {
      "The Stars Between Us": [
        { author: "OrbitReader", content: "The dialogue feels soft and intimate without losing the space setting. Really good opening chapter.", createdAt: "2026-02-18T10:15:00Z" },
        { author: "MayaAndMars", content: "I liked how quiet the emotional beats were here. It fits the story really well.", createdAt: "2026-02-19T14:42:00Z" },
        { author: "CosmosFan42", content: "The atmosphere is strong and easy to picture. I would absolutely keep reading this.", createdAt: "2026-02-20T08:05:00Z" }
      ],
      "Shadows of the Forgotten City": [
        { author: "ArchiveDigger", content: "The premise is great. The buried-city angle makes the whole thing feel tense immediately.", createdAt: "2026-03-02T09:25:00Z" },
        { author: "NightShelf", content: "This has a strong mystery tone without overexplaining everything. Good balance.", createdAt: "2026-03-03T18:10:00Z" }
      ],
      "Coffee Shop Confessions": [
        { author: "WarmMug", content: "Very cozy. The setup is simple, but the voice makes it charming.", createdAt: "2026-02-21T11:30:00Z" },
        { author: "FluffCollector", content: "This is exactly the kind of soft romance I come here for.", createdAt: "2026-02-22T16:55:00Z" }
      ],
      "The Chosen One and You": [
        { author: "WandAndInk", content: "The slow-burn angle works well here. It feels like a fic that takes its time in a good way.", createdAt: "2026-03-05T13:05:00Z" },
        { author: "CommonRoomReader", content: "I like that the tone stays emotional instead of rushing into the romance beats.", createdAt: "2026-03-06T07:45:00Z" },
        { author: "HogwartsHours", content: "Good pacing and easy to follow. The tags fit the story well.", createdAt: "2026-03-07T20:10:00Z" }
      ],
      "Hermione's Brilliance Series": [
        { author: "LibraryWing", content: "A Hermione-focused retelling is such a strong idea. The academic angle really stands out.", createdAt: "2026-03-01T12:20:00Z" },
        { author: "ArithmancyFan", content: "This feels like it understands why Hermione is compelling in the first place.", createdAt: "2026-03-01T19:40:00Z" }
      ]
    };

    var matchedSamples = samplesByTitle[title] || [];

    if (!matchedSamples.length && title) {
      matchedSamples = [
        {
          author: "ArchiveGuest",
          content: "Strong setup so far. The premise is easy to get into and the tone feels consistent.",
          createdAt: "2026-03-04T09:10:00Z"
        },
        {
          author: "LateNightReader",
          content: "This was an easy read in a good way. I liked the pacing and wanted to keep going.",
          createdAt: "2026-03-05T21:35:00Z"
        }
      ];
    }

    return matchedSamples.map(function(comment, index) {
      return Object.assign({ id: "sample-comment-" + index }, comment);
    });
  }

  function readCommentsUiState() {
    try {
      return localStorage.getItem(commentsUiStorageKey) === "open";
    } catch (error) {
      return false;
    }
  }

  function writeCommentsUiState(isOpen) {
    try {
      localStorage.setItem(commentsUiStorageKey, isOpen ? "open" : "closed");
    } catch (error) {
      // Ignore localStorage errors for UI-only preferences.
    }
  }

  function readStatsRecord(baseStats) {
    try {
      var stored = localStorage.getItem(statsStorageKey);
      if (!stored) {
        return {
          kudos: baseStats.kudos,
          bookmarks: baseStats.bookmarks,
          comments: baseStats.comments,
          subscribe: false,
          userKudosGiven: false,
          userBookmarked: false
        };
      }

      var parsed = JSON.parse(stored);

      if (parsed.schemaVersion !== 3) {
        return {
          kudos: baseStats.kudos,
          bookmarks: baseStats.bookmarks,
          comments: baseStats.comments,
          subscribe: parsed.subscribe === true,
          userKudosGiven: false,
          userBookmarked: false
        };
      }

      return {
        kudos: Number.isInteger(parsed.kudos) ? parsed.kudos : baseStats.kudos,
        bookmarks: Number.isInteger(parsed.bookmarks) ? parsed.bookmarks : baseStats.bookmarks,
        comments: Number.isInteger(parsed.comments) ? parsed.comments : baseStats.comments,
        subscribe: parsed.subscribe === true,
        userKudosGiven: parsed.userKudosGiven === true,
        userBookmarked: parsed.userBookmarked === true
      };
    } catch (error) {
      return {
        kudos: baseStats.kudos,
        bookmarks: baseStats.bookmarks,
        comments: baseStats.comments,
        subscribe: false,
        userKudosGiven: false,
        userBookmarked: false
      };
    }
  }

  function writeStatsRecord(stats) {
    localStorage.setItem(statsStorageKey, JSON.stringify(Object.assign({ schemaVersion: 3 }, stats)));
  }

  function syncStatsToUploadedWork(stats) {
    var workIdFromUrl = (urlParams.get("workId") || "").trim();
    var titleFromUrl = (urlParams.get("title") || document.title || "").trim().toLowerCase();
    var fandomFromUrl = (urlParams.get("fandom") || "").trim().toLowerCase();

    if (!workIdFromUrl && !titleFromUrl) {
      return;
    }

    try {
      var raw = localStorage.getItem(uploadedWorksKey);
      if (!raw) {
        return;
      }

      var works = JSON.parse(raw);
      if (!Array.isArray(works) || !works.length) {
        return;
      }

      var updated = false;
      var nextWorks = works.map(function (work) {
        if (!work || typeof work !== "object") {
          return work;
        }

        var idMatches = workIdFromUrl && work.id === workIdFromUrl;
        var titleMatches = !idMatches && String(work.title || "").trim().toLowerCase() === titleFromUrl;
        var fandomMatches = !fandomFromUrl || String(work.fandom || "").trim().toLowerCase() === fandomFromUrl;

        if ((idMatches || titleMatches) && fandomMatches) {
          updated = true;
          return Object.assign({}, work, {
            kudos: stats.kudos,
            bookmarks: stats.bookmarks,
            comments: stats.comments
          });
        }

        return work;
      });

      if (updated) {
        localStorage.setItem(uploadedWorksKey, JSON.stringify(nextWorks));
      }
    } catch (error) {
      // Ignore storage parse errors to avoid breaking reader interactions.
    }
  }

  function readSeedStatsFromUploadedWork() {
    var workIdFromUrl = (urlParams.get("workId") || "").trim();
    var titleFromUrl = (urlParams.get("title") || document.title || "").trim().toLowerCase();
    var fandomFromUrl = (urlParams.get("fandom") || "").trim().toLowerCase();

    if (!workIdFromUrl && !titleFromUrl) {
      return null;
    }

    try {
      var raw = localStorage.getItem(uploadedWorksKey);
      if (!raw) {
        return null;
      }

      var works = JSON.parse(raw);
      if (!Array.isArray(works) || !works.length) {
        return null;
      }

      var match = works.find(function (work) {
        if (!work || typeof work !== "object") {
          return false;
        }

        var idMatches = workIdFromUrl && work.id === workIdFromUrl;
        var titleMatches = !idMatches && String(work.title || "").trim().toLowerCase() === titleFromUrl;
        var fandomMatches = !fandomFromUrl || String(work.fandom || "").trim().toLowerCase() === fandomFromUrl;

        return (idMatches || titleMatches) && fandomMatches;
      });

      if (!match) {
        return null;
      }

      return {
        kudos: Number.isInteger(match.kudos) ? match.kudos : 0,
        bookmarks: Number.isInteger(match.bookmarks) ? match.bookmarks : 0,
        comments: Number.isInteger(match.comments) ? match.comments : 0
      };
    } catch (error) {
      return null;
    }
  }

  function updateActionButton(button, isActive, activeText, inactiveText) {
    if (!button) {
      return;
    }

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.textContent = isActive ? activeText : inactiveText;
  }

  var uploadedSeedStats = readSeedStatsFromUploadedWork();
  var sampleComments = getSampleComments();
  var baseStats = {
    kudos: uploadedSeedStats ? uploadedSeedStats.kudos : parseCountFromElement(kudosCount),
    bookmarks: uploadedSeedStats ? uploadedSeedStats.bookmarks : parseCountFromElement(bookmarkCount),
    comments: uploadedSeedStats ? uploadedSeedStats.comments : sampleComments.length
  };

  var statsRecord = readStatsRecord(baseStats);
  var commentRefs = null;

  function ensureCommentsSection() {
    if (commentRefs) {
      return commentRefs;
    }

    var existingSection = document.getElementById("storyCommentsSection");
    var storyTextSection = document.querySelector(".story-text");
    var chapterNav = document.querySelector(".chapter-nav-bar.bottom") || document.querySelector(".chapter-nav-bar");

    if (!existingSection) {
      if (!storyTextSection) {
        return null;
      }

      existingSection = document.createElement("section");
      existingSection.id = "storyCommentsSection";
      existingSection.className = "story-comments-section";
      existingSection.innerHTML =
        '<div class="story-comments-head">' +
          '<div class="story-comments-heading-group">' +
            '<h3>Comments</h3>' +
            '<span class="story-comments-total" id="storyCommentsTotal">0 comments</span>' +
          '</div>' +
          '<button type="button" id="storyCommentsToggle" class="story-comments-toggle" aria-expanded="false">▼ Show Comments</button>' +
        '</div>' +
        '<div id="storyCommentsContent" class="story-comments-content" hidden>' +
          '<form id="storyCommentForm" class="story-comment-form">' +
            '<label class="story-comment-label" for="storyCommentInput">Leave a comment</label>' +
            '<textarea id="storyCommentInput" class="story-comment-input" rows="4" placeholder="Share your thoughts about this story..."></textarea>' +
            '<div class="story-comment-form-footer">' +
              '<span id="storyCommentIdentity" class="story-comment-identity"></span>' +
              '<button type="submit" class="story-comment-submit">Post Comment</button>' +
            '</div>' +
            '<p id="storyCommentMessage" class="story-comment-message" aria-live="polite"></p>' +
          '</form>' +
          '<p id="storyCommentsEmpty" class="story-comments-empty">No comments yet. Be the first to comment.</p>' +
          '<div id="storyCommentsList" class="story-comments-list"></div>' +
        '</div>';

      if (chapterNav && chapterNav.parentNode) {
        chapterNav.parentNode.insertBefore(existingSection, chapterNav);
      } else if (storyTextSection.parentNode) {
        storyTextSection.parentNode.insertBefore(existingSection, storyTextSection.nextSibling);
      }
    }

    commentRefs = {
      section: existingSection,
      total: document.getElementById("storyCommentsTotal"),
      toggle: document.getElementById("storyCommentsToggle"),
      content: document.getElementById("storyCommentsContent"),
      form: document.getElementById("storyCommentForm"),
      input: document.getElementById("storyCommentInput"),
      identity: document.getElementById("storyCommentIdentity"),
      message: document.getElementById("storyCommentMessage"),
      empty: document.getElementById("storyCommentsEmpty"),
      list: document.getElementById("storyCommentsList")
    };

    if (commentRefs.toggle && commentRefs.content && !commentRefs.toggle.dataset.bound) {
      commentRefs.toggle.dataset.bound = "true";
      commentRefs.toggle.addEventListener("click", function() {
        var isOpen = !commentRefs.content.hasAttribute("hidden");
        if (isOpen) {
          commentRefs.content.setAttribute("hidden", "hidden");
          commentRefs.toggle.setAttribute("aria-expanded", "false");
          commentRefs.toggle.textContent = "▼ Show Comments";
          writeCommentsUiState(false);
        } else {
          commentRefs.content.removeAttribute("hidden");
          commentRefs.toggle.setAttribute("aria-expanded", "true");
          commentRefs.toggle.textContent = "▲ Hide Comments";
          writeCommentsUiState(true);
        }
      });

      if (readCommentsUiState()) {
        commentRefs.content.removeAttribute("hidden");
        commentRefs.toggle.setAttribute("aria-expanded", "true");
        commentRefs.toggle.textContent = "▲ Hide Comments";
      }
    }

    return commentRefs;
  }

  function renderComments() {
    var refs = ensureCommentsSection();
    if (!refs) {
      return;
    }

    var currentUser = (localStorage.getItem(authStorageKey) || "").trim();
    var comments = readComments().concat(sampleComments);
    var totalComments = comments.length;

    if (refs.identity) {
      refs.identity.textContent = currentUser ? ("Commenting as " + currentUser) : "Commenting as Guest Reader";
    }

    if (refs.total) {
      refs.total.textContent = totalComments === 1 ? "1 comment" : formatCount(totalComments) + " comments";
    }

    if (commentCount) {
      commentCount.textContent = formatCount(totalComments);
    }

    if (refs.empty) {
      refs.empty.style.display = comments.length ? "none" : "block";
    }

    if (refs.list) {
      refs.list.innerHTML = comments.map(function (comment) {
        return (
          '<article class="story-comment-item">' +
            '<div class="story-comment-meta">' +
              '<strong>' + escapeHtml(comment.author || "Guest Reader") + '</strong>' +
              '<span>' + escapeHtml(formatCommentDate(comment.createdAt)) + '</span>' +
            '</div>' +
            '<p class="story-comment-body">' + escapeHtml(comment.content || "").replace(/\n/g, '<br />') + '</p>' +
          '</article>'
        );
      }).join("");
    }

    statsRecord.comments = totalComments;
    writeStatsRecord(statsRecord);
    syncStatsToUploadedWork(statsRecord);
  }

  if (kudosCount) {
    kudosCount.textContent = formatCount(statsRecord.kudos);
  }

  if (bookmarkCount) {
    bookmarkCount.textContent = formatCount(statsRecord.bookmarks);
  }

  if (commentCount) {
    commentCount.textContent = formatCount(statsRecord.comments);
  }

  writeStatsRecord(statsRecord);
  syncStatsToUploadedWork(statsRecord);
  renderComments();

  var initialCommentRefs = ensureCommentsSection();
  if (initialCommentRefs && initialCommentRefs.form && initialCommentRefs.input) {
    initialCommentRefs.form.addEventListener("submit", function (event) {
      event.preventDefault();

      var rawContent = initialCommentRefs.input.value || "";
      var trimmedContent = rawContent.trim();

      if (!trimmedContent) {
        if (initialCommentRefs.message) {
          initialCommentRefs.message.textContent = "Write a comment before posting.";
          initialCommentRefs.message.classList.add("error");
        }
        return;
      }

      var comments = readComments();
      var currentUser = (localStorage.getItem(authStorageKey) || "").trim();
      comments.unshift({
        id: "comment-" + Date.now(),
        author: currentUser || "Guest Reader",
        content: trimmedContent,
        createdAt: new Date().toISOString()
      });

      writeComments(comments);
      initialCommentRefs.input.value = "";

      if (initialCommentRefs.message) {
        initialCommentRefs.message.textContent = "Comment posted.";
        initialCommentRefs.message.classList.remove("error");
      }

        if (initialCommentRefs.content && initialCommentRefs.content.hasAttribute("hidden")) {
          initialCommentRefs.content.removeAttribute("hidden");
          if (initialCommentRefs.toggle) {
            initialCommentRefs.toggle.setAttribute("aria-expanded", "true");
            initialCommentRefs.toggle.textContent = "▲ Hide Comments";
          }
          writeCommentsUiState(true);
        }

      renderComments();
    });
  }

  if (kudosBtn && kudosCount) {
    const baseKudos = baseStats.kudos;
    let kudosActive = statsRecord.userKudosGiven;
    let currentKudos = statsRecord.kudos;

    if (currentKudos < baseKudos) {
      currentKudos = baseKudos;
    }

    kudosCount.textContent = formatCount(currentKudos);
    updateActionButton(kudosBtn, kudosActive, "♥ Kudos Left", "♡ Leave Kudos");

    kudosBtn.addEventListener("click", function () {
      kudosActive = !kudosActive;
      currentKudos += kudosActive ? 1 : -1;

      if (currentKudos < baseKudos) {
        currentKudos = baseKudos;
      }

      kudosCount.textContent = formatCount(currentKudos);
      updateActionButton(kudosBtn, kudosActive, "♥ Kudos Left", "♡ Leave Kudos");
      statsRecord.kudos = currentKudos;
      statsRecord.userKudosGiven = kudosActive;
      writeStatsRecord(statsRecord);
      syncStatsToUploadedWork(statsRecord);
    });
  }

  if (bookmarkBtn && bookmarkCount) {
    const baseBookmarks = baseStats.bookmarks;
    let bookmarkActive = statsRecord.userBookmarked;
    let currentBookmarks = statsRecord.bookmarks;

    if (currentBookmarks < baseBookmarks) {
      currentBookmarks = baseBookmarks;
    }

    bookmarkCount.textContent = formatCount(currentBookmarks);
    updateActionButton(bookmarkBtn, bookmarkActive, "✅ Bookmarked", "🔖 Bookmark");

    bookmarkBtn.addEventListener("click", function () {
      if (!checkAuthAndWarn()) return;

      bookmarkActive = !bookmarkActive;
      currentBookmarks += bookmarkActive ? 1 : -1;

      if (currentBookmarks < baseBookmarks) {
        currentBookmarks = baseBookmarks;
      }

      bookmarkCount.textContent = formatCount(currentBookmarks);
      updateActionButton(bookmarkBtn, bookmarkActive, "✅ Bookmarked", "🔖 Bookmark");
      statsRecord.bookmarks = currentBookmarks;
      statsRecord.userBookmarked = bookmarkActive;
      writeStatsRecord(statsRecord);
      syncStatsToUploadedWork(statsRecord);
    });
  }

  if (subscribeBtn) {
    let subscribeActive = statsRecord.subscribe;
    updateActionButton(subscribeBtn, subscribeActive, "✅ Subscribed", "🔔 Subscribe");

    subscribeBtn.addEventListener("click", function () {
      if (!checkAuthAndWarn()) return;
      
      subscribeActive = !subscribeActive;
      updateActionButton(subscribeBtn, subscribeActive, "✅ Subscribed", "🔔 Subscribe");
      statsRecord.subscribe = subscribeActive;
      writeStatsRecord(statsRecord);
    });
  }

  /* CHAPTER SWITCHER */
  function getChapterPanels() {
    return Array.from(document.querySelectorAll(".chapter-panel"));
  }

  function initializeChapterNavigation() {
    const initialChapterPanels = getChapterPanels();

    if (!initialChapterPanels.length) {
      return;
    }

    // Mark as initialized
    window.chapterNavigationInitialized = true;

  // Get work identifier from page title for localStorage
  var workId = document.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  var lastReadKey = 'lastReadChapter-' + workId;
  var urlParams = new URLSearchParams(window.location.search);
  var chapterParam = parseInt(urlParams.get('chapter'), 10);
  var hasChapterParam = Number.isInteger(chapterParam) && chapterParam > 0;

  // Use URL chapter when present, otherwise load last read chapter.
  var savedChapterIndex = localStorage.getItem(lastReadKey);
  if (hasChapterParam) {
    window.currentChapterIndex = chapterParam - 1;
  } else {
    window.currentChapterIndex = savedChapterIndex !== null ? parseInt(savedChapterIndex, 10) : 0;
  }

  if (Number.isNaN(window.currentChapterIndex) || window.currentChapterIndex < 0) {
    window.currentChapterIndex = 0;
  }

  // Ensure currentChapterIndex is within valid range
  if (window.currentChapterIndex >= initialChapterPanels.length) {
    window.currentChapterIndex = initialChapterPanels.length - 1;
  }

  localStorage.setItem(lastReadKey, window.currentChapterIndex);

  const prevChapterBtnBottom = document.getElementById("prevChapterBtnBottom");
  const nextChapterBtnBottom = document.getElementById("nextChapterBtnBottom");
  const chapterCurrentBottom = document.getElementById("chapterCurrentBottom");

  function updateChapterDisplay() {
    const chapterPanels = getChapterPanels();
    if (!chapterPanels.length) {
      return;
    }

    if (window.currentChapterIndex >= chapterPanels.length) {
      window.currentChapterIndex = chapterPanels.length - 1;
    }

    for (let i = 0; i < chapterPanels.length; i++) {
      if (chapterPanels[i]) {
        if (i === window.currentChapterIndex) {
          chapterPanels[i].style.display = "block";
          chapterPanels[i].classList.add("active-chapter");
        } else {
          chapterPanels[i].style.display = "none";
          chapterPanels[i].classList.remove("active-chapter");
        }
      }
    }

    if (chapterCurrentBottom) {
      if (chapterPanels.length === 1) {
        chapterCurrentBottom.textContent = "Only 1 chapter available";
      } else {
        chapterCurrentBottom.textContent = (window.currentChapterIndex + 1) + " / " + chapterPanels.length;
      }
    }

    if (prevChapterBtnBottom) {
      prevChapterBtnBottom.disabled = window.currentChapterIndex === 0;
    }

    if (nextChapterBtnBottom) {
      nextChapterBtnBottom.disabled = window.currentChapterIndex === chapterPanels.length - 1;
    }

    // Update TTS chapter label if function exists
    if (typeof window.updateChapterLabel === "function") {
      window.updateChapterLabel();
    }
  }

  function goToPreviousChapter() {
    const chapterPanels = getChapterPanels();
    if (!chapterPanels.length) {
      return;
    }

    if (window.currentChapterIndex > 0) {
      window.currentChapterIndex -= 1;
      localStorage.setItem(lastReadKey, window.currentChapterIndex);
      updateChapterDisplay();
      if (typeof window.resetTTSForChapterChange === "function") {
        window.resetTTSForChapterChange(window.currentChapterIndex);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToNextChapter() {
    const chapterPanels = getChapterPanels();
    if (!chapterPanels.length) {
      return;
    }

    if (window.currentChapterIndex < chapterPanels.length - 1) {
      window.currentChapterIndex += 1;
      localStorage.setItem(lastReadKey, window.currentChapterIndex);
      updateChapterDisplay();
      if (typeof window.resetTTSForChapterChange === "function") {
        window.resetTTSForChapterChange(window.currentChapterIndex);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (prevChapterBtnBottom) {
    prevChapterBtnBottom.addEventListener("click", goToPreviousChapter);
  }

  if (nextChapterBtnBottom) {
    nextChapterBtnBottom.addEventListener("click", goToNextChapter);
  }

  updateChapterDisplay();
  }

  // Wait for dynamic chapters to be ready if they're being generated
  if (window.dynamicChaptersReady) {
    initializeChapterNavigation();
  } else {
    window.addEventListener('dynamicChaptersReady', function() {
      initializeChapterNavigation();
    });
    // Fallback: initialize after a short delay if event doesn't fire
    setTimeout(function() {
      if (!window.chapterNavigationInitialized) {
        initializeChapterNavigation();
      }
    }, 100);
  }
}
