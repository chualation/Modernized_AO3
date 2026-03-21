/* UI.JS - UI toggles and interactions */

// Sidebar toggle
const sidebarToggle = document.getElementById("sidebarToggle");
const pageLayout = document.getElementById("pageLayout");

if (sidebarToggle && pageLayout) {
  sidebarToggle.addEventListener("click", function () {
    pageLayout.classList.toggle("no-sidebar");
  });
}

// Global search routing for non-browse pages
const pageType = document.body ? document.body.getAttribute("data-page") : "";
if (pageType !== "browse") {
  document.querySelectorAll(".search-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.querySelector("input[type='text']");
      var query = input ? String(input.value || "").trim() : "";
      var target = "browse-works.html";

      if (query) {
        target += "?q=" + encodeURIComponent(query);
      }

      window.location.href = target;
    });
  });
}

// Filter collapse toggles
const filterToggles = document.querySelectorAll(".filter-toggle");

filterToggles.forEach(function (toggle) {
  toggle.addEventListener("click", function () {
    const filterBlock = toggle.closest(".collapsible");

    if (filterBlock) {
      if (filterBlock.classList.contains("closed")) {
        filterBlock.classList.remove("closed");
        filterBlock.classList.add("open");
      } else {
        filterBlock.classList.remove("open");
        filterBlock.classList.add("closed");
      }
    }
  });
});

// Story details toggle
const toggleDetailsBtn = document.getElementById("toggleDetailsBtn");
const storyDetailsContent = document.getElementById("storyDetailsContent");

if (toggleDetailsBtn && storyDetailsContent) {
  toggleDetailsBtn.addEventListener("click", function () {
    if (storyDetailsContent.style.display === "none") {
      storyDetailsContent.style.display = "block";
      toggleDetailsBtn.textContent = "▲ Hide Full Details";
    } else {
      storyDetailsContent.style.display = "none";
      toggleDetailsBtn.textContent = "▼ Show Full Details";
    }
  });
}

// Symbols popup modal
function initSymbolsPopup() {
  var symbolBadges = document.querySelectorAll(".rating-badge");
  if (!symbolBadges.length) {
    return;
  }

  var overlay = document.createElement("div");
  overlay.className = "symbols-modal-overlay";
  overlay.id = "symbolsModalOverlay";
  overlay.innerHTML =
    '<div class="symbols-modal" role="dialog" aria-modal="true" aria-labelledby="symbolsModalTitle">' +
      '<div class="symbols-modal-header">' +
        '<h2 id="symbolsModalTitle" class="symbols-modal-title">Symbols We Use on the Archive</h2>' +
        '<button type="button" class="symbols-modal-close" id="symbolsModalClose" aria-label="Close symbols guide">X</button>' +
      '</div>' +
      '<p class="symbols-modal-note">Click any symbol badge to open this guide.</p>' +

      '<section class="symbols-block">' +
        '<div class="symbols-block-head">' +
          '<div class="symbols-icon-grid">' +
            '<span class="rating-badge badge-green">G</span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
          '</div>' +
          '<h3 class="symbols-block-title">Content Rating</h3>' +
        '</div>' +
        '<ul class="symbols-list">' +
          '<li class="symbols-item"><span class="rating-badge badge-green">G</span><span>General Audiences</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-yellow">T</span><span>Teen And Up Audiences</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-orange">M</span><span>Mature</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-red">E</span><span>Explicit: only suitable for adults</span></li>' +
          '<li class="symbols-item"><span class="symbols-grid-empty"></span><span>The work was not given any rating</span></li>' +
        '</ul>' +
      '</section>' +

      '<section class="symbols-block">' +
        '<div class="symbols-block-head">' +
          '<div class="symbols-icon-grid">' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="rating-badge badge-red">!</span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
          '</div>' +
          '<h3 class="symbols-block-title">Content Warnings</h3>' +
        '</div>' +
        '<ul class="symbols-list">' +
          '<li class="symbols-item"><span class="rating-badge badge-orange">?</span><span>The author chose not to warn for content, or Archive Warnings could apply.</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-red">!</span><span>At least one warning applies: graphic violence, major character death, rape, or underage sex.</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-blue">i</span><span>Warnings may be listed in tags, relationships, or the Additional Tags section.</span></li>' +
        '</ul>' +
      '</section>' +

      '<section class="symbols-block">' +
        '<div class="symbols-block-head">' +
          '<div class="symbols-icon-grid">' +
            '<span class="rating-badge badge-green">O</span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
          '</div>' +
          '<h3 class="symbols-block-title">Relationships, Pairings, Orientations</h3>' +
        '</div>' +
        '<ul class="symbols-list">' +
          '<li class="symbols-item"><span class="rating-badge" style="background:#d02c74">F</span><span>F/F: female/female relationships</span></li>' +
          '<li class="symbols-item"><span class="rating-badge" style="background:#8e35d3">M</span><span>F/M: female/male relationships</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-green">G</span><span>Gen: no romantic/sexual relationships, or not the main focus</span></li>' +
          '<li class="symbols-item"><span class="rating-badge" style="background:#2d63c8">N</span><span>M/M: male/male relationships</span></li>' +
          '<li class="symbols-item"><span class="rating-badge" style="background:#6f57c5">A</span><span>Multi: more than one type of relationship</span></li>' +
          '<li class="symbols-item"><span class="rating-badge" style="background:#4f4f4f">?</span><span>Other relationships</span></li>' +
          '<li class="symbols-item"><span class="symbols-grid-empty"></span><span>The work was not put in any categories</span></li>' +
        '</ul>' +
      '</section>' +

      '<section class="symbols-block">' +
        '<div class="symbols-block-head">' +
          '<div class="symbols-icon-grid">' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="symbols-grid-empty"></span>' +
            '<span class="rating-badge badge-green">✓</span>' +
          '</div>' +
          '<h3 class="symbols-block-title">Is The Work Finished?</h3>' +
        '</div>' +
        '<ul class="symbols-list">' +
          '<li class="symbols-item"><span class="rating-badge badge-red">X</span><span>This is a work in progress or incomplete/unfulfilled.</span></li>' +
          '<li class="symbols-item"><span class="rating-badge badge-green">✓</span><span>This work is completed/this prompt is filled.</span></li>' +
          '<li class="symbols-item"><span class="symbols-grid-empty"></span><span>This work\'s status is unknown.</span></li>' +
        '</ul>' +
      '</section>' +
    '</div>';

  document.body.appendChild(overlay);

  var closeBtn = document.getElementById("symbolsModalClose");

  function closeModal() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function openModal() {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  symbolBadges.forEach(function (badge) {
    badge.style.cursor = "pointer";
    badge.setAttribute("title", "Show symbol guide");
    badge.addEventListener("click", function (event) {
      // Prevent card click handlers from navigating away before the modal opens.
      event.preventDefault();
      event.stopPropagation();
      openModal();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && overlay.classList.contains("open")) {
      closeModal();
    }
  });
}

initSymbolsPopup();
