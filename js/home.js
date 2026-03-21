/* HOME.JS - Home page filtering functionality */

function initHomeFilters() {
  if (!document.body || document.body.getAttribute('data-page') !== 'home') {
    return;
  }

  var filterCheckboxes = document.querySelectorAll('.filter-panel input[type="checkbox"][data-filter-group]');
  var sidebarSearchInput = document.getElementById('homeSearchWithin');
  var includeTagsInput = document.getElementById('homeIncludeTags');
  var excludeTagsInput = document.getElementById('homeExcludeTags');
  var clearFiltersButton = document.getElementById('clearHomeFilters');
  var noResultsMessage = document.getElementById('noResultsMessage');

  function getCards() {
    return document.querySelectorAll('.work-list .work-card');
  }

  var defaultCards = getCards();

  if (!defaultCards.length) {
    return;
  }

  var activeFilters = {
    rating: [],
    warnings: [],
    categories: [],
    words: [],
    status: []
  };
  var searchTerm = '';
  var includeTags = [];
  var excludeTags = [];

  function normalizeComparable(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeLooseComparable(value) {
    return normalizeComparable(value).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseCommaTags(value) {
    return String(value || '')
      .split(',')
      .map(function(tag) {
        return normalizeComparable(tag);
      })
      .filter(function(tag) {
        return !!tag;
      });
  }

  function getUpdatedDateFromCard(card) {
    var updatedElement = card.querySelector('.updated-meta strong');
    if (!updatedElement) {
      return null;
    }

    var parsedDate = new Date(updatedElement.textContent || '');
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate;
  }

  function isRecentlyUpdated(card) {
    var updatedDate = getUpdatedDateFromCard(card);
    if (!updatedDate) {
      return false;
    }

    var msSinceUpdate = Date.now() - updatedDate.getTime();
    var daysSinceUpdate = msSinceUpdate / (1000 * 60 * 60 * 24);

    return daysSinceUpdate >= 0 && daysSinceUpdate <= 45;
  }

  function isOneShot(card) {
    var statsRow = card.querySelector('.stats-row');
    var statsText = statsRow ? statsRow.textContent || '' : '';
    var chaptersMatch = statsText.match(/Chapters:\s*(\d+)\s*\/\s*(\d+|\?)/i);

    if (!chaptersMatch) {
      return false;
    }

    var currentChapters = parseInt(chaptersMatch[1], 10) || 0;
    var totalChapters = chaptersMatch[2] === '?' ? null : (parseInt(chaptersMatch[2], 10) || 0);

    return currentChapters === 1 && totalChapters === 1;
  }

  function matchesWordRange(words, filterValue) {
    if (filterValue === 'under-5000') {
      return words < 5000;
    }
    if (filterValue === '5000-20000') {
      return words >= 5000 && words <= 20000;
    }
    if (filterValue === '20000-50000') {
      return words >= 20000 && words <= 50000;
    }
    if (filterValue === '50000-plus') {
      return words >= 50000;
    }
    if (filterValue === '10000-plus') {
      return words >= 10000;
    }
    return false;
  }

  function matchesStatusFilter(card, filterValue) {
    var normalizedFilter = normalizeComparable(filterValue);
    var statusValue = normalizeComparable(card.getAttribute('data-status') || '');

    if (normalizedFilter === 'complete works') {
      return statusValue.indexOf('complete') !== -1;
    }

    if (normalizedFilter === 'works in progress') {
      return statusValue.indexOf('progress') !== -1 || statusValue.indexOf('wip') !== -1 || statusValue.indexOf('ongoing') !== -1;
    }

    if (normalizedFilter === 'recently updated') {
      return isRecentlyUpdated(card);
    }

    if (normalizedFilter === 'one-shots') {
      return isOneShot(card);
    }

    return statusValue === normalizedFilter;
  }

  function matchesCardValueForGroup(card, filterGroup, filterValue) {
    if (filterGroup === 'words') {
      var words = parseInt(card.getAttribute('data-words') || '0', 10);
      return matchesWordRange(words, filterValue);
    }

    if (filterGroup === 'categories') {
      return normalizeComparable(card.getAttribute('data-category')) === normalizeComparable(filterValue);
    }

    if (filterGroup === 'warnings') {
      var warningValue = normalizeLooseComparable(card.getAttribute('data-warnings') || '');
      var warningFilter = normalizeLooseComparable(filterValue);

      if (warningFilter === 'graphic depictions of violence' || warningFilter === 'graphic violence') {
        return warningValue.indexOf('graphic violence') !== -1 || warningValue.indexOf('graphic depictions of violence') !== -1;
      }

      if (warningFilter === 'creator chose not to use archive warnings') {
        return warningValue.indexOf('creator chose not to use archive warnings') !== -1 ||
          warningValue.indexOf('chose not to warn') !== -1 ||
          warningValue.indexOf('archive warnings could apply') !== -1 ||
          warningValue.indexOf('warnings may be listed in tags') !== -1;
      }

      if (warningValue.indexOf('archive warnings apply') !== -1 && warningValue.indexOf('no archive warnings apply') === -1) {
        if (warningFilter === 'graphic violence' ||
            warningFilter === 'major character death' ||
            warningFilter === 'rape non con' ||
            warningFilter === 'underage') {
          return true;
        }
      }

      if (warningFilter === 'rape non con' || warningFilter === 'rape') {
        return warningValue.indexOf('rape') !== -1 || warningValue.indexOf('non con') !== -1;
      }

      return warningValue.indexOf(warningFilter) !== -1;
    }

    if (filterGroup === 'status') {
      return matchesStatusFilter(card, filterValue);
    }

    return normalizeComparable(card.getAttribute('data-' + filterGroup)) === normalizeComparable(filterValue);
  }

  function refreshActiveFiltersFromCheckboxes() {
    Object.keys(activeFilters).forEach(function(key) {
      activeFilters[key] = [];
    });

    filterCheckboxes.forEach(function(checkbox) {
      if (!checkbox.checked) {
        return;
      }

      var group = checkbox.getAttribute('data-filter-group');
      if (!activeFilters[group]) {
        activeFilters[group] = [];
      }

      activeFilters[group].push(checkbox.value);
    });
  }

  function matchesSearch(card) {
    if (!searchTerm) {
      return true;
    }

    var title = card.querySelector('h3');
    var fandom = card.querySelector('.work-fandom');
    var summary = card.querySelector('.work-summary');
    var tags = card.querySelector('.tag-row');
    var searchableText = [
      title ? title.textContent : '',
      fandom ? fandom.textContent : '',
      summary ? summary.textContent : '',
      tags ? tags.textContent : ''
    ].join(' ').toLowerCase();

    return searchableText.indexOf(searchTerm) !== -1;
  }

  function matchesTagFilters(card) {
    var cardTags = String(card.getAttribute('data-tags') || '')
      .split(',')
      .map(function(tag) {
        return normalizeComparable(tag);
      })
      .filter(function(tag) {
        return !!tag;
      });

    var containsIncluded = includeTags.every(function(tag) {
      return cardTags.some(function(cardTag) {
        return cardTag.indexOf(tag) !== -1;
      });
    });

    if (!containsIncluded) {
      return false;
    }

    var hasExcludedTag = excludeTags.some(function(tag) {
      return cardTags.some(function(cardTag) {
        return cardTag.indexOf(tag) !== -1;
      });
    });

    return !hasExcludedTag;
  }

  function updateNoResultsState() {
    var cards = getCards();
    var hasVisibleCard = false;

    cards.forEach(function(card) {
      if (card.style.display !== 'none') {
        hasVisibleCard = true;
      }
    });

    if (noResultsMessage) {
      noResultsMessage.style.display = hasVisibleCard ? 'none' : 'block';
    }
  }

  function updateFilterOptionAvailability() {
    filterCheckboxes.forEach(function(checkbox) {
      var optionLabel = checkbox.closest('.filter-option');
      checkbox.disabled = false;
      if (optionLabel) {
        optionLabel.style.opacity = '';
      }
    });
  }

  function updateDisplay() {
    var cards = getCards();

    cards.forEach(function(card) {
      var shouldShow = true;

      Object.keys(activeFilters).forEach(function(filterGroup) {
        var selectedValues = Array.isArray(activeFilters[filterGroup]) ? activeFilters[filterGroup] : [];

        if (!selectedValues.length || !shouldShow) {
          return;
        }

        var matchesGroup = selectedValues.some(function(filterValue) {
          return matchesCardValueForGroup(card, filterGroup, filterValue);
        });

        if (!matchesGroup) {
          shouldShow = false;
        }
      });

      if (shouldShow && !matchesSearch(card)) {
        shouldShow = false;
      }

      if (shouldShow && !matchesTagFilters(card)) {
        shouldShow = false;
      }

      card.style.display = shouldShow ? '' : 'none';
    });

    updateNoResultsState();
  }

  filterCheckboxes.forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
      refreshActiveFiltersFromCheckboxes();
      updateDisplay();
    });
  });

  if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('input', function() {
      searchTerm = String(sidebarSearchInput.value || '').trim().toLowerCase();
      updateDisplay();
    });
  }

  if (includeTagsInput) {
    includeTagsInput.addEventListener('input', function() {
      includeTags = parseCommaTags(includeTagsInput.value);
      updateDisplay();
    });
  }

  if (excludeTagsInput) {
    excludeTagsInput.addEventListener('input', function() {
      excludeTags = parseCommaTags(excludeTagsInput.value);
      updateDisplay();
    });
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', function() {
      filterCheckboxes.forEach(function(checkbox) {
        checkbox.checked = false;
      });

      if (sidebarSearchInput) {
        sidebarSearchInput.value = '';
      }

      if (includeTagsInput) {
        includeTagsInput.value = '';
      }

      if (excludeTagsInput) {
        excludeTagsInput.value = '';
      }

      searchTerm = '';
      includeTags = [];
      excludeTags = [];

      refreshActiveFiltersFromCheckboxes();
      updateDisplay();
    });
  }

  updateFilterOptionAvailability();
  refreshActiveFiltersFromCheckboxes();
  updateDisplay();
}

initHomeFilters();
