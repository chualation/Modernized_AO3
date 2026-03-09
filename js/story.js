/* STORY.JS - Story interactions (kudos, bookmarks, subscribe, chapter navigation) */

// Only run on reader pages
if (document.body && document.body.dataset.page === "reader") {
  /* KUDOS / BOOKMARK / SUBSCRIBE */
  const storyKey = "the-stars-between-us";
  const kudosBtn = document.getElementById("kudosBtn");
  const bookmarkBtn = document.getElementById("bookmarkBtn");
  const subscribeBtn = document.getElementById("subscribeBtn");
  const kudosCount = document.getElementById("kudosCount");
  const bookmarkCount = document.getElementById("bookmarkCount");

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

  function updateActionButton(button, isActive, activeText, inactiveText) {
    if (!button) {
      return;
    }

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.textContent = isActive ? activeText : inactiveText;
  }

  if (kudosBtn && kudosCount) {
    const baseKudos = parseInt(kudosCount.textContent.replace(/,/g, ""), 10) || 0;
    let kudosActive = localStorage.getItem(`${storyKey}-kudos`) === "true";
    let currentKudos = readStoredCount(
      `${storyKey}-kudos-count`,
      baseKudos + (kudosActive ? 1 : 0)
    );

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
      localStorage.setItem(`${storyKey}-kudos`, String(kudosActive));
      localStorage.setItem(`${storyKey}-kudos-count`, String(currentKudos));
    });
  }

  if (bookmarkBtn && bookmarkCount) {
    const baseBookmarks = parseInt(bookmarkCount.textContent.replace(/,/g, ""), 10) || 0;
    let bookmarkActive = localStorage.getItem(`${storyKey}-bookmark`) === "true";
    let currentBookmarks = readStoredCount(
      `${storyKey}-bookmark-count`,
      baseBookmarks + (bookmarkActive ? 1 : 0)
    );

    if (currentBookmarks < baseBookmarks) {
      currentBookmarks = baseBookmarks;
    }

    bookmarkCount.textContent = formatCount(currentBookmarks);
    updateActionButton(bookmarkBtn, bookmarkActive, "✅ Bookmarked", "🔖 Bookmark");

    bookmarkBtn.addEventListener("click", function () {
      bookmarkActive = !bookmarkActive;
      currentBookmarks += bookmarkActive ? 1 : -1;

      if (currentBookmarks < baseBookmarks) {
        currentBookmarks = baseBookmarks;
      }

      bookmarkCount.textContent = formatCount(currentBookmarks);
      updateActionButton(bookmarkBtn, bookmarkActive, "✅ Bookmarked", "🔖 Bookmark");
      localStorage.setItem(`${storyKey}-bookmark`, String(bookmarkActive));
      localStorage.setItem(`${storyKey}-bookmark-count`, String(currentBookmarks));
    });
  }

  if (subscribeBtn) {
    let subscribeActive = localStorage.getItem(`${storyKey}-subscribe`) === "true";
    updateActionButton(subscribeBtn, subscribeActive, "✅ Subscribed", "🔔 Subscribe");

    subscribeBtn.addEventListener("click", function () {
      subscribeActive = !subscribeActive;
      updateActionButton(subscribeBtn, subscribeActive, "✅ Subscribed", "🔔 Subscribe");
      localStorage.setItem(`${storyKey}-subscribe`, String(subscribeActive));
    });
  }

  /* CHAPTER SWITCHER */
  const chapterPanels = [
    document.getElementById("chapter1"),
    document.getElementById("chapter2")
  ];

  // Get work identifier from page title for localStorage
  var workId = document.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  var lastReadKey = 'lastReadChapter-' + workId;

  // Load last read chapter from localStorage, default to chapter 1 (index 0)
  var savedChapterIndex = localStorage.getItem(lastReadKey);
  window.currentChapterIndex = savedChapterIndex !== null ? parseInt(savedChapterIndex, 10) : 0;

  // Ensure currentChapterIndex is within valid range
  if (window.currentChapterIndex >= chapterPanels.length) {
    window.currentChapterIndex = chapterPanels.length - 1;
  }

  const prevChapterBtnBottom = document.getElementById("prevChapterBtnBottom");
  const nextChapterBtnBottom = document.getElementById("nextChapterBtnBottom");
  const chapterCurrentBottom = document.getElementById("chapterCurrentBottom");

  function updateChapterDisplay() {
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
      chapterCurrentBottom.textContent = (window.currentChapterIndex + 1) + " / " + chapterPanels.length;
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
