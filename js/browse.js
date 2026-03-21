/* BROWSE.JS - Browse works page filtering by fandom */

function initBrowsePage() {
  // Get fandom name from URL parameter
  var urlParams = new URLSearchParams(window.location.search);
  var selectedFandom = urlParams.get('fandom') || localStorage.getItem('selectedFandom');
  var selectedFandomCategory = urlParams.get('category') || localStorage.getItem('selectedFandomCategory') || 'all';
  var selectedQuery = (urlParams.get('q') || '').trim();
  var UPLOADED_WORKS_KEY = 'ao3-uploaded-works';
  var pageTitle = document.querySelector('.page-title');
  var pageSubtitle = document.querySelector('.page-subtitle');
  var browseList = document.querySelector('.browse-list');
  var browseNoResults = document.getElementById('browseNoResults');
  var relatedSearchesCard = document.getElementById('relatedSearchesCard');
  var browseBackBtn = document.getElementById('browseBackBtn');

  if (browseBackBtn) {
    browseBackBtn.addEventListener('click', function() {
      var hasSameOriginReferrer = false;

      try {
        hasSameOriginReferrer = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
      } catch (error) {
        hasSameOriginReferrer = false;
      }

      if (window.history.length > 1 && hasSameOriginReferrer) {
        window.history.back();
        return;
      }

      if (selectedFandom || selectedFandomCategory !== 'all') {
        window.location.href = 'browse-fandom.html';
        return;
      }

      window.location.href = 'index.html';
    });
  }

  // Ensure related searches card is visible by default
  if (relatedSearchesCard) {
    relatedSearchesCard.style.display = '';
  }

  // Related fandoms by category
  var relatedFandomsByCategory = {
    'Books & Literature': ['Harry Potter', 'Game of Thrones', 'The Lord of the Rings'],
    'Movies': ['Marvel Cinematic Universe', 'Star Wars', 'The Lord of the Rings'],
    'TV Shows': ['Supernatural', 'Sherlock', 'Doctor Who', 'Good Omens'],
    'Video Games': ['The Witcher', 'Minecraft'],
    'Anime & Manga': ['Attack on Titan', 'My Hero Academia', 'Naruto'],
    'Music & Bands': ['BTS']
  };

  function normalizeTag(value) {
    return (value || '').toLowerCase().trim();
  }

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

  function getWordCountFromMeta(meta) {
    var match = String(meta || '').match(/(\d[\d,]*)\s*words/i);
    if (!match) {
      return 0;
    }

    return parseInt(match[1].replace(/,/g, ''), 10) || 0;
  }

  function getUploadedWorksForFandom(fandomName) {
    var raw = localStorage.getItem(UPLOADED_WORKS_KEY);

    if (!raw) {
      return [];
    }

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(function(work) {
        return work && typeof work === 'object' && String(work.fandom || '').toLowerCase() === String(fandomName || '').toLowerCase();
      });
    } catch (error) {
      return [];
    }
  }

  function getAllUploadedWorks() {
    var raw = localStorage.getItem(UPLOADED_WORKS_KEY);

    if (!raw) {
      return [];
    }

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(function(work) {
        return work && typeof work === 'object';
      });
    } catch (error) {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value) {
    var parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return '0';
    }
    return parsed.toLocaleString('en-US');
  }

  function getRatingBadge(rating) {
    if (rating === 'General Audiences') {
      return '<span class="rating-badge badge-green">G</span>';
    }
    if (rating === 'Teen And Up Audiences') {
      return '<span class="rating-badge badge-yellow">T</span>';
    }
    if (rating === 'Mature') {
      return '<span class="rating-badge badge-orange">M</span>';
    }
    if (rating === 'Explicit') {
      return '<span class="rating-badge badge-red">E</span>';
    }
    return '<span class="rating-badge badge-blue">?</span>';
  }

  function getWarningBadge(warnings) {
    var warningText = String(warnings || '').toLowerCase();

    if (!warningText || warningText.indexOf('no archive warnings apply') !== -1) {
      return '<span class="rating-badge badge-blue">&#10003;</span>';
    }

    if (warningText.indexOf('graphic violence') !== -1 ||
        warningText.indexOf('major character death') !== -1 ||
        warningText.indexOf('underage') !== -1 ||
        warningText.indexOf('rape') !== -1) {
      return '<span class="rating-badge badge-purple">!</span>';
    }

    return '<span class="rating-badge badge-orange">?</span>';
  }

  function getCategoryBadge(category) {
    if (category === 'F/F') {
      return '<span class="rating-badge" style="background:#d02c74">F</span>';
    }
    if (category === 'F/M') {
      return '<span class="rating-badge" style="background:#8e35d3">H</span>';
    }
    if (category === 'Gen') {
      return '<span class="rating-badge badge-green">G</span>';
    }
    if (category === 'M/M') {
      return '<span class="rating-badge" style="background:#2d63c8">M</span>';
    }
    if (category === 'Multi') {
      return '<span class="rating-badge" style="background:#6f57c5">A</span>';
    }
    return '<span class="rating-badge" style="background:#4f4f4f">O</span>';
  }

  function getStatusBadge(status) {
    if (String(status || '').toLowerCase().indexOf('complete') !== -1) {
      return '<span class="rating-badge badge-green">✓</span>';
    }
    return '<span class="rating-badge badge-red">✕</span>';
  }

  function parseGenreTagsFromMeta(meta, fandomName) {
    return String(meta || '')
      .split('•')
      .map(function(part) {
        return String(part || '').trim();
      })
      .filter(function(part) {
        if (!part) {
          return false;
        }
        if (/words/i.test(part)) {
          return false;
        }
        if (fandomName && part.toLowerCase() === String(fandomName).toLowerCase()) {
          return false;
        }
        return true;
      });
  }

  function renderWorkCardLayout(card, config) {
    if (!card) {
      return;
    }

    var tags = Array.isArray(config.tags) ? config.tags.filter(function(tag) { return !!tag; }) : [];
    var visibleTags = tags.slice(0, 3);
    var overflowCount = tags.length - visibleTags.length;

    var tagsHtml = visibleTags.map(function(tag) {
      return '<span class="tag">' + escapeHtml(tag) + '</span>';
    }).join('');

    if (overflowCount > 0) {
      tagsHtml += '<span class="tag">+' + overflowCount + ' more</span>';
    }

    if (!tagsHtml) {
      tagsHtml = '<span class="tag">No additional tags</span>';
    }

    var wordLabel = formatNumber(config.words);
    var chapterLabel = config.chapters ? String(config.chapters) + '/' + String(config.chapters) : '1/1';

    card.classList.add('work-card');
    card.innerHTML =
      '<div class="work-icons grid-icons">' +
        getRatingBadge(config.rating) +
        getWarningBadge(config.warnings) +
        getCategoryBadge(config.category) +
        getStatusBadge(config.status) +
      '</div>' +
      '<div class="work-content">' +
        '<div class="work-heading">' +
          '<div>' +
            '<h3><a href="' + escapeHtml(config.link) + '">' + escapeHtml(config.title) + '</a> <span class="author-inline">by ' + escapeHtml(config.author) + '</span></h3>' +
            '<p class="work-fandom">' + escapeHtml(config.fandom) + '</p>' +
          '</div>' +
          '<div class="updated-meta">' +
            '<span>Updated</span>' +
            '<strong>' + escapeHtml(config.updated) + '</strong>' +
          '</div>' +
        '</div>' +
        '<p class="work-summary">' + escapeHtml(config.summary) + '</p>' +
        '<div class="tag-row"><span class="label">Tags:</span>' + tagsHtml + '</div>' +
        '<div class="stats-row">' +
          '<span>Language: ' + escapeHtml(config.language) + '</span>' +
          '<span>Words: ' + wordLabel + '</span>' +
          '<span>Chapters: ' + escapeHtml(chapterLabel) + '</span>' +
          '<span>Hits: ' + formatNumber(config.hits) + '</span>' +
          '<span>Kudos: ' + formatNumber(config.kudos) + '</span>' +
        '</div>' +
      '</div>';
  }

  function updateRelatedSearches(currentFandom, category) {
    var relatedSearchesCard = document.getElementById('relatedSearchesCard');
    var relatedSearchesList = document.getElementById('relatedSearchesList');
    
    if (!relatedSearchesList || !relatedSearchesCard) {
      return;
    }

    // Get related fandoms from the same category, excluding current fandom
    var relatedFandoms = [];
    if (category && relatedFandomsByCategory[category]) {
      relatedFandoms = relatedFandomsByCategory[category].filter(function(fandom) {
        return fandom !== currentFandom;
      });
    }

    // Add some popular fandoms from other categories
    var allFandoms = ['Harry Potter', 'Marvel Cinematic Universe', 'Supernatural', 'Star Wars', 
                      'Doctor Who', 'The Witcher', 'Attack on Titan', 'My Hero Academia'];
    allFandoms.forEach(function(fandom) {
      if (fandom !== currentFandom && relatedFandoms.indexOf(fandom) === -1 && relatedFandoms.length < 8) {
        relatedFandoms.push(fandom);
      }
    });

    // Update the title to be more specific
    var titleElement = relatedSearchesCard.querySelector('h3');
    if (titleElement) {
      titleElement.textContent = 'Related Fandoms';
    }

    // Clear and populate the list
    relatedSearchesList.innerHTML = '';
    relatedFandoms.forEach(function(fandom) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = 'browse-works.html?fandom=' + encodeURIComponent(fandom) + '&category=' + encodeURIComponent(category || 'all');
      a.textContent = fandom;
      li.appendChild(a);
      relatedSearchesList.appendChild(li);
    });

    // Show the card
    relatedSearchesCard.style.display = 'block';
  }

  function updateNoResultsState() {
    if (!browseList) {
      return;
    }

    var cards = browseList.querySelectorAll('.browse-card');
    var hasVisibleCard = false;

    cards.forEach(function(card) {
      if (card.style.display !== 'none') {
        hasVisibleCard = true;
      }
    });

    if (hasVisibleCard) {
      document.body.classList.remove('browse-empty');
      if (browseNoResults) {
        browseNoResults.textContent = 'No works found for this selection.';
      }
    } else {
      document.body.classList.add('browse-empty');
    }
  }

  function initBrowseInteractions() {
    var filterCheckboxes = document.querySelectorAll('.filter-panel input[type="checkbox"][data-filter-group]');
    var sidebarSearchInput = document.getElementById('browseSearchWithin');
    var includeTagsInput = document.getElementById('browseIncludeTags');
    var excludeTagsInput = document.getElementById('browseExcludeTags');
    var clearFiltersButton = document.getElementById('clearBrowseFilters');
    var searchForm = document.querySelector('.search-form');
    var searchInput = searchForm ? searchForm.querySelector('input[type="text"]') : null;

    function getCards() {
      return document.querySelectorAll('.browse-list .browse-card');
    }

    var defaultCards = getCards();

    defaultCards.forEach(function(card) {
      card.addEventListener('click', function(event) {
        if (event.target.tagName.toLowerCase() === 'a') {
          return;
        }
        var mainLink = card.querySelector('h3 a');
        if (mainLink && mainLink.href) {
          window.location.href = mainLink.href;
        }
      });

      card.style.display = '';
    });

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
    var searchTerm = selectedQuery.toLowerCase();
    var includeTags = [];
    var excludeTags = [];

    function parseCommaTags(value) {
      return String(value || '')
        .split(',')
        .map(function(tag) {
          return normalizeTag(tag);
        })
        .filter(function(tag) {
          return !!tag;
        });
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
        var value = checkbox.value;

        if (!activeFilters[group]) {
          activeFilters[group] = [];
        }

        activeFilters[group].push(value);
      });
    }

    function matchesSearch(card) {
      if (!searchTerm) {
        return true;
      }

      var title = card.querySelector('h3');
      var meta = card.querySelector('.browse-meta') || card.querySelector('.work-fandom');
      var summary = card.querySelector('.browse-text') || card.querySelector('.work-summary');
      var tags = card.querySelector('.tag-row');
      var searchableText = [
        title ? title.textContent : '',
        meta ? meta.textContent : '',
        summary ? summary.textContent : '',
        tags ? tags.textContent : ''
      ].join(' ').toLowerCase();

      return searchableText.indexOf(searchTerm) !== -1;
    }

    function matchesTagFilters(card) {
      var cardTags = String(card.getAttribute('data-tags') || '')
        .split(',')
        .map(function(tag) {
          return normalizeTag(tag);
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

      var hasActiveFilters = Object.keys(activeFilters).some(function(filterGroup) {
        return Array.isArray(activeFilters[filterGroup]) && activeFilters[filterGroup].length > 0;
      }) || includeTags.length > 0 || excludeTags.length > 0 || !!searchTerm;

      if (hasActiveFilters) {
        document.body.classList.add('browse-filtering');
      } else {
        document.body.classList.remove('browse-filtering');
      }

      updateNoResultsState();
    }

    if (filterCheckboxes.length) {
      filterCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
          refreshActiveFiltersFromCheckboxes();
          updateDisplay();
        });
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

        includeTags = [];
        excludeTags = [];
        searchTerm = '';
        refreshActiveFiltersFromCheckboxes();
        updateDisplay();
      });
    }

    if (sidebarSearchInput) {
      sidebarSearchInput.addEventListener('input', function() {
        searchTerm = (sidebarSearchInput.value || '').trim().toLowerCase();
        updateDisplay();
      });
    }

    if (searchInput) {
      searchInput.value = selectedQuery;
      if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
          event.preventDefault();
          searchTerm = (searchInput.value || '').trim().toLowerCase();
          if (sidebarSearchInput) {
            sidebarSearchInput.value = searchInput.value || '';
          }
          updateDisplay();
        });
      }
    }

    if (sidebarSearchInput && selectedQuery) {
      sidebarSearchInput.value = selectedQuery;
    }

    // Ensure all cards are visible initially
    getCards().forEach(function(card) {
      card.style.display = '';
    });

    updateFilterOptionAvailability();
    refreshActiveFiltersFromCheckboxes();
    updateDisplay();
  }

  // Define works for each fandom
  var fandomWorks = {
    'Harry Potter': [
      {
        title: 'The Chosen One and You',
        meta: 'Harry Potter • Slow Burn • Angst • 112,430 words',
        text: 'A completed Harry Potter x Reader story balancing Y/N tension, angst, and soft fluff moments.',
        chapters: 10,
        rating: 'Teen And Up Audiences',
        status: 'Complete Works',
        words: 112430,
        category: 'F/M',
        tags: ['Y/N', 'Slow Burn', 'Angst', 'Fluff'],
        audioLanguage: 'tl'
      },
      {
        title: 'Hermione\'s Brilliance Series',
        meta: 'Harry Potter • Fantasy • Action • 298,750 words',
        text: 'A complete retelling focusing on Hermione Granger\'s extraordinary magical research and discoveries.',
        chapters: 2,
        link: 'work-hp2.html'
      },
      {
        title: 'The Marauders\' Legacy',
        meta: 'Harry Potter • Friendship • Adventure • 187,650 words',
        text: 'Follow the adventures of James, Sirius, Remus, and Peter during their years at Hogwarts.',
        chapters: 15
      },
      {
        title: 'Potions and Promises',
        meta: 'Harry Potter • Romance • Drama • 92,340 words',
        text: 'A slow-burn romance set in the dungeons featuring unexpected pairings and potion accidents.',
        chapters: 8
      },
      {
        title: 'The Weasley Chronicles',
        meta: 'Harry Potter • Family • Humor • 134,890 words',
        text: 'A collection of stories centered on the chaotic, loving Weasley family through the years.',
        chapters: 11
      },
      {
        title: 'Dark Magic Unveiled',
        meta: 'Harry Potter • Mystery • Thriller • 156,780 words',
        text: 'An Auror investigation into illegal dark magic practices in post-war wizarding Britain.',
        chapters: 13
      }
    ],
    'Marvel Cinematic Universe': [
      {
        title: 'Avengers: The Long Road Home',
        meta: 'MCU • Action • Drama • 87,654 words',
        text: 'Post-endgame recovery as the Avengers learn to live in a changed world.',
        chapters: 6,
        link: 'work-book3.html'
      },
      {
        title: 'Loki\'s Redemption Arc',
        meta: 'MCU • Character Study • Fantasy • 56,432 words',
        text: 'A deep exploration of Loki\'s journey from villain to hero across multiple timelines.',
        chapters: 12,
        link: 'work.html'
      },
      {
        title: 'Winter Soldier: Memories Reformed',
        meta: 'MCU • Action • Angst • 143,210 words',
        text: 'Bucky Barnes struggles with recovered memories while facing new threats.',
        chapters: 17
      },
      {
        title: 'Spider-Man: Friendly Neighborhood',
        meta: 'MCU • Adventure • Coming of Age • 78,950 words',
        text: 'Peter Parker balances high school life with being a superhero in Queens.',
        chapters: 9
      },
      {
        title: 'Black Widow: Red in the Ledger',
        meta: 'MCU • Spy Thriller • Drama • 112,670 words',
        text: 'Natasha Romanoff confronts her past while taking on a dangerous new mission.',
        chapters: 14
      }
    ],
    'Supernatural': [
      {
        title: 'The Final Hunt',
        meta: 'Supernatural • Horror • Action • 102,345 words',
        text: 'Sam and Dean face their greatest challenge yet in this fan-favorite continuation.',
        chapters: 10,
        link: 'work-book2.html'
      },
      {
        title: 'Angel\'s Watch',
        meta: 'Supernatural • Drama • Romance • 78,234 words',
        text: 'A story exploring Castiel\'s growing humanity and complicated feelings.',
        chapters: 7,
        link: 'work-book3.html'
      },
      {
        title: 'Hunter\'s Legacy',
        meta: 'Supernatural • Family • Action • 134,890 words',
        text: 'The next generation of hunters learns the family business from Sam and Dean.',
        chapters: 16
      },
      {
        title: 'Crossroads Consequences',
        meta: 'Supernatural • Horror • Mystery • 91,230 words',
        text: 'A series of mysterious deaths leads the Winchesters to a powerful demon.',
        chapters: 11
      },
      {
        title: 'Bobby\'s Last Case',
        meta: 'Supernatural • Drama • Mystery • 67,450 words',
        text: 'An untold story from Bobby Singer\'s past comes back to haunt the team.',
        chapters: 8
      }
    ],
    'Star Wars': [
      {
        title: 'Rey\'s New Jedi Order',
        meta: 'Star Wars • Sci-Fi • Adventure • 234,567 words',
        text: 'Rey builds a new Jedi Academy and faces unforeseen challenges from the past.',
        chapters: 18,
        link: 'work.html'
      },
      {
        title: 'The Smuggler\'s Salvation',
        meta: 'Star Wars • Adventure • Romance • 123,456 words',
        text: 'A space adventure spanning multiple star systems with unlikely allies.',
        chapters: 9,
        link: 'work-book2.html'
      },
      {
        title: 'Mandalorian: The Way Forward',
        meta: 'Star Wars • Action • Western • 167,890 words',
        text: 'A lone bounty hunter navigates the outer rim with a mysterious child.',
        chapters: 12
      },
      {
        title: 'Clone Wars: Untold Battles',
        meta: 'Star Wars • War • Drama • 198,450 words',
        text: 'Stories from the Clone Wars that never made it into the official records.',
        chapters: 19
      },
      {
        title: 'Sith Apprentice',
        meta: 'Star Wars • Dark • Thriller • 89,670 words',
        text: 'A young force-sensitive falls under the influence of the dark side.',
        chapters: 10
      },
      {
        title: 'Rebels: Hope in Darkness',
        meta: 'Star Wars • Adventure • Rebellion • 145,320 words',
        text: 'A ragtag group of rebels fights against the Empire in the outer territories.',
        chapters: 15
      }
    ],
    'Sherlock': [
      {
        title: 'The Missing Cases',
        meta: 'Sherlock • Mystery • Thriller • 156,789 words',
        text: 'Unpublished adventures of Sherlock Holmes never before documented by Watson.',
        chapters: 14,
        link: 'work-book3.html'
      },
      {
        title: 'Modern Day Mysteries Vol. 5',
        meta: 'Sherlock • Crime • Drama • 89,234 words',
        text: 'New cases for the modern consulting detective in contemporary London.',
        chapters: 11,
        link: 'work.html'
      },
      {
        title: 'Baker Street Chronicles',
        meta: 'Sherlock • Mystery • Friendship • 124,560 words',
        text: 'The everyday moments and extraordinary cases at 221B Baker Street.',
        chapters: 13
      },
      {
        title: 'The Mind Palace Affair',
        meta: 'Sherlock • Psychological • Thriller • 78,910 words',
        text: 'Sherlock faces a villain who can manipulate memories and perceptions.',
        chapters: 9
      },
      {
        title: 'Watson\'s Journal',
        meta: 'Sherlock • Character Study • Drama • 92,340 words',
        text: 'Untold stories from John Watson\'s perspective during their cases together.',
        chapters: 10
      }
    ],
    'Doctor Who': [
      {
        title: 'The Doctor\'s Dilemma',
        meta: 'Doctor Who • Sci-Fi • Adventure • 234,123 words',
        text: 'The Doctor faces a paradox that could unravel all of time itself.',
        chapters: 20,
        link: 'work-book2.html'
      },
      {
        title: 'Companion Chronicles',
        meta: 'Doctor Who • Adventure • Romance • 178,901 words',
        text: 'Stories of the Doctor\'s companions and the adventures they never told.',
        chapters: 13,
        link: 'work-book3.html'
      },
      {
        title: 'TARDIS Tales',
        meta: 'Doctor Who • Adventure • Humor • 112,450 words',
        text: 'Short adventures across time and space with unexpected twists.',
        chapters: 16
      },
      {
        title: 'The Time War Journals',
        meta: 'Doctor Who • War • Drama • 201,890 words',
        text: 'Firsthand accounts from the Last Great Time War.',
        chapters: 18
      },
      {
        title: 'Gallifrey\'s Last Stand',
        meta: 'Doctor Who • Epic • Drama • 167,340 words',
        text: 'The final days of Gallifrey before the Time War ended.',
        chapters: 14
      },
      {
        title: 'Adventures in Time',
        meta: 'Doctor Who • Adventure • Sci-Fi • 89,560 words',
        text: 'A collection of the Doctor\'s strangest encounters.',
        chapters: 11
      }
    ],
    'The Witcher': [
      {
        title: 'Geralt\'s Greatest Hunts',
        meta: 'The Witcher • Fantasy • Action • 201,345 words',
        text: 'Previously untold tales of Geralt\'s monster hunts across the Continent.',
        chapters: 16,
        link: 'work.html'
      },
      {
        title: 'Destiny and Choice',
        meta: 'The Witcher • Fantasy • Romance • 145,678 words',
        text: 'An exploration of destiny and free will in the world of the Witcher.',
        chapters: 8,
        link: 'work-book2.html'
      },
      {
        title: 'Yennefer\'s Journey',
        meta: 'The Witcher • Fantasy • Drama • 156,890 words',
        text: 'Follow Yennefer through her transformation and quest for power.',
        chapters: 12
      },
      {
        title: 'Ciri: Child of Destiny',
        meta: 'The Witcher • Adventure • Coming of Age • 189,450 words',
        text: 'Ciri\'s training and adventures before reuniting with Geralt.',
        chapters: 15
      },
      {
        title: 'Tales from Kaer Morhen',
        meta: 'The Witcher • Fantasy • Brotherhood • 98,760 words',
        text: 'Stories of the Witchers during their winter stays at Kaer Morhen.',
        chapters: 10
      }
    ],
    'Attack on Titan': [
      {
        title: 'Beyond the Walls',
        meta: 'Attack on Titan • Adventure • Action • 267,890 words',
        text: 'The Survey Corps discovers new lands and unforeseen dangers beyond the walls.',
        chapters: 22,
        link: 'work-book3.html'
      },
      {
        title: 'Eren\'s Shadow',
        meta: 'Attack on Titan • Drama • Thriller • 156,432 words',
        text: 'A psychological exploration of Eren\'s internal conflict and dual nature.',
        chapters: 17,
        link: 'work.html'
      },
      {
        title: 'Wings of Freedom',
        meta: 'Attack on Titan • Action • War • 198,760 words',
        text: 'The fight for humanity\'s freedom reaches its most desperate hour.',
        chapters: 20
      },
      {
        title: 'Levi Squad Chronicles',
        meta: 'Attack on Titan • Action • Drama • 134,890 words',
        text: 'Elite soldiers face impossible odds in humanity\'s strongest squad.',
        chapters: 14
      },
      {
        title: 'Paths Unseen',
        meta: 'Attack on Titan • Mystery • Supernatural • 112,340 words',
        text: 'Exploring the mysterious paths that connect all Eldians.',
        chapters: 11
      }
    ],
    'My Hero Academia': [
      {
        title: 'Plus Ultra: Rising Heroes',
        meta: 'My Hero Academia • Action • School Life • 142,510 words',
        text: 'Class 1-A takes on advanced rescue missions while balancing rivalry and friendship.',
        chapters: 12,
        link: 'work-book2.html'
      },
      {
        title: 'The Weight of One For All',
        meta: 'My Hero Academia • Drama • Character Study • 96,880 words',
        text: 'Midoriya faces the emotional cost of heroism in a quieter, introspective arc.',
        chapters: 9,
        link: 'work-book3.html'
      },
      {
        title: 'Villain Rehabilitation',
        meta: 'My Hero Academia • Drama • Redemption • 123,670 words',
        text: 'A controversial program attempts to rehabilitate young villains.',
        chapters: 13
      },
      {
        title: 'Pro Heroes: The Next Generation',
        meta: 'My Hero Academia • Action • Adventure • 167,890 words',
        text: 'Following the careers of Class 1-A as professional heroes.',
        chapters: 16
      },
      {
        title: 'Quirk Evolution',
        meta: 'My Hero Academia • Sci-Fi • Action • 89,450 words',
        text: 'Students discover their quirks evolving in unexpected ways.',
        chapters: 10
      },
      {
        title: 'UA Festival Chaos',
        meta: 'My Hero Academia • Action • Competition • 78,320 words',
        text: 'The sports festival takes an unexpected turn with new challenges.',
        chapters: 8
      }
    ],
    'Good Omens': [
      {
        title: 'Ineffable Road Trip',
        meta: 'Good Omens • Humor • Adventure • 61,230 words',
        text: 'Crowley and Aziraphale accidentally prevent three apocalypses in one weekend.',
        chapters: 7,
        link: 'work.html'
      },
      {
        title: 'Tea, Temptation, and Trouble',
        meta: 'Good Omens • Comedy • Romance • 48,420 words',
        text: 'A soft and chaotic post-canon story about bookshops, miracles, and feelings.',
        chapters: 6,
        link: 'work-book3.html'
      },
      {
        title: 'The Bentley Chronicles',
        meta: 'Good Omens • Humor • Adventure • 54,780 words',
        text: 'Adventures told from the perspective of Crowley\'s beloved car.',
        chapters: 5
      },
      {
        title: 'Angelic and Demonic Mishaps',
        meta: 'Good Omens • Comedy • Supernatural • 67,890 words',
        text: 'A series of supernatural incidents that only our favorite duo can handle.',
        chapters: 8
      },
      {
        title: 'The Second Coming',
        meta: 'Good Omens • Adventure • Drama • 89,560 words',
        text: 'Another attempt at Armageddon that goes hilariously wrong.',
        chapters: 9
      }
    ],
    'Game of Thrones': [
      {
        title: 'Wolves of the North',
        meta: 'Game of Thrones • Fantasy • Political Intrigue • 188,340 words',
        text: 'The Stark children reunite early and rewrite the balance of power in Westeros.',
        chapters: 14,
        link: 'work-book2.html'
      },
      {
        title: 'Ashes of the Dragon Throne',
        meta: 'Game of Thrones • Drama • War • 174,900 words',
        text: 'After the war, rival houses race to shape a fragile new realm.',
        chapters: 13,
        link: 'work.html'
      },
      {
        title: 'The Dragon Queen\'s Return',
        meta: 'Game of Thrones • Epic • Fantasy • 201,560 words',
        text: 'An alternate timeline where Daenerys makes different choices.',
        chapters: 17
      },
      {
        title: 'Jon Snow: King Beyond the Wall',
        meta: 'Game of Thrones • Adventure • Drama • 156,780 words',
        text: 'Jon chooses a different path and becomes leader of the Free Folk.',
        chapters: 15
      },
      {
        title: 'The Night King\'s Secret',
        meta: 'Game of Thrones • Mystery • Horror • 112,340 words',
        text: 'Uncovering the true origin and motives of the Night King.',
        chapters: 11
      },
      {
        title: 'Cersei\'s Gambit',
        meta: 'Game of Thrones • Political Thriller • Drama • 134,670 words',
        text: 'A deep dive into Cersei\'s political maneuvering and schemes.',
        chapters: 12
      }
    ],
    'The Lord of the Rings': [
      {
        title: 'Echoes of Gondor',
        meta: 'The Lord of the Rings • Adventure • Epic Fantasy • 132,070 words',
        text: 'Aragorn and friends uncover a hidden threat in the White Mountains.',
        chapters: 10,
        link: 'work-book3.html'
      },
      {
        title: 'The Last Song of Rivendell',
        meta: 'The Lord of the Rings • Fantasy • Drama • 109,260 words',
        text: 'A tale of elves preparing to leave Middle-earth and what they leave behind.',
        chapters: 8,
        link: 'work-book2.html'
      },
      {
        title: 'Gimli and Legolas: An Unlikely Friendship',
        meta: 'The Lord of the Rings • Friendship • Adventure • 98,450 words',
        text: 'The deepening bond between dwarf and elf through their journeys.',
        chapters: 9
      },
      {
        title: 'The Shire After the Ring',
        meta: 'The Lord of the Rings • Slice of Life • Drama • 78,340 words',
        text: 'How the hobbits rebuilt and changed the Shire after returning home.',
        chapters: 7
      },
      {
        title: 'Rohan\'s Finest Hour',
        meta: 'The Lord of the Rings • War • Epic • 145,670 words',
        text: 'The untold stories of the Riders of Rohan during the War of the Ring.',
        chapters: 13
      },
      {
        title: 'Gandalf\'s Journey',
        meta: 'The Lord of the Rings • Adventure • Wisdom • 167,890 words',
        text: 'Following Gandalf through his travels before and during the Fellowship.',
        chapters: 16
      }
    ],
    'Minecraft': [
      {
        title: 'Redstone Chronicles',
        meta: 'Minecraft • Adventure • Survival • 54,660 words',
        text: 'A team of builders and explorers map ancient ruins beneath the Overworld.',
        chapters: 6,
        link: 'work.html'
      },
      {
        title: 'Netherbound',
        meta: 'Minecraft • Action • Mystery • 73,440 words',
        text: 'Portal glitches trap a group of players in a hostile Nether fortress maze.',
        chapters: 7,
        link: 'work-book2.html'
      },
      {
        title: 'The Ender Dragon\'s Tale',
        meta: 'Minecraft • Fantasy • Adventure • 89,120 words',
        text: 'A deeper look at the End dimension and the dragon\'s true purpose.',
        chapters: 9
      },
      {
        title: 'Village Defense',
        meta: 'Minecraft • Action • Strategy • 67,890 words',
        text: 'Players must protect a village from increasingly dangerous raids.',
        chapters: 8
      },
      {
        title: 'The Ocean Monument Mystery',
        meta: 'Minecraft • Underwater • Mystery • 56,340 words',
        text: 'Diving deep to uncover the secrets of the ocean monuments.',
        chapters: 5
      },
      {
        title: 'Skyblock Survival',
        meta: 'Minecraft • Survival • Challenge • 43,210 words',
        text: 'Starting with nothing on a floating island, players must survive and thrive.',
        chapters: 4
      }
    ],
    'Naruto': [
      {
        title: 'Will of Fire Reborn',
        meta: 'Naruto • Action • Ninja Adventure • 165,320 words',
        text: 'A new generation of shinobi uncovers secrets tied to the First Hokage.',
        chapters: 13,
        link: 'work-book3.html'
      },
      {
        title: 'Threads of the Hidden Leaf',
        meta: 'Naruto • Drama • Friendship • 118,570 words',
        text: 'An ensemble story following Team 7 through alternate missions and outcomes.',
        chapters: 11,
        link: 'work.html'
      },
      {
        title: 'The Uchiha Redemption',
        meta: 'Naruto • Drama • Family • 143,890 words',
        text: 'Exploring the Uchiha clan\'s history and a path to redemption.',
        chapters: 14
      },
      {
        title: 'Kakashi\'s Hidden Stories',
        meta: 'Naruto • Adventure • Mystery • 98,760 words',
        text: 'Untold missions from Kakashi\'s time as an ANBU operative.',
        chapters: 10
      },
      {
        title: 'Sakura\'s Strength',
        meta: 'Naruto • Character Study • Action • 112,340 words',
        text: 'Following Sakura\'s journey to become one of the strongest kunoichi.',
        chapters: 12
      },
      {
        title: 'The Akatsuki Chronicles',
        meta: 'Naruto • Dark • Drama • 156,120 words',
        text: 'Inside the Akatsuki organization: motives, relationships, and conflicts.',
        chapters: 15
      }
    ],
    'BTS': [
      {
        title: 'Midnight Broadcast',
        meta: 'BTS • Slice of Life • Music • 42,380 words',
        text: 'Late-night radio sessions bring unexpected comfort and connection to seven artists.',
        chapters: 5,
        link: 'work-book2.html'
      },
      {
        title: 'On Stage, Off Script',
        meta: 'BTS • Drama • Found Family • 57,920 words',
        text: 'Tour life, private fears, and chosen family in a character-driven ensemble story.',
        chapters: 6,
        link: 'work-book3.html'
      },
      {
        title: 'Studio Sessions',
        meta: 'BTS • Music • Creative Process • 67,450 words',
        text: 'Behind the scenes of creating music and the bonds formed in the process.',
        chapters: 7
      },
      {
        title: 'World Tour Diaries',
        meta: 'BTS • Travel • Friendship • 89,760 words',
        text: 'Personal moments and adventures during a worldwide tour.',
        chapters: 9
      },
      {
        title: 'The Leader\'s Burden',
        meta: 'BTS • Character Study • Drama • 54,320 words',
        text: 'A deep dive into the responsibilities and challenges of leadership.',
        chapters: 6
      },
      {
        title: 'Seven Voices, One Heart',
        meta: 'BTS • Found Family • Emotional • 76,890 words',
        text: 'How seven individuals became a family through music and mutual support.',
        chapters: 8
      }
    ]
  };

  var selectedBuiltInWorks = selectedFandom && fandomWorks[selectedFandom] ? fandomWorks[selectedFandom] : [];
  var selectedUploadedWorks = selectedFandom ? getUploadedWorksForFandom(selectedFandom) : [];

  if (selectedFandom && (selectedBuiltInWorks.length || selectedUploadedWorks.length)) {
    document.body.classList.add('browse-filtered');
    document.body.classList.remove('browse-empty');
    var works = selectedUploadedWorks.concat(selectedBuiltInWorks);
    
    // Update page title and subtitle
    if (pageTitle) {
      pageTitle.textContent = selectedFandom + ' Works';
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = 'Browse ' + works.length + ' works from the ' + selectedFandom + ' fandom.';
    }

    // Update related searches based on fandom category
    updateRelatedSearches(selectedFandom, selectedFandomCategory);

    // Clear existing browse list if it exists
    if (browseList) {
      browseList.innerHTML = '';

      // Add filtered works
      works.forEach(function(work, index) {
        var article = document.createElement('article');
        article.className = 'browse-card work-card';
        var wordCount = typeof work.words === 'number' ? work.words : getWordCountFromMeta(work.meta);
        var rating = work.rating || 'Teen And Up Audiences';
        var warnings = work.warnings || 'No Archive Warnings Apply';
        var completionStatus = work.status || 'Complete Works';
        var relationshipCategory = work.category || 'F/M';
        
        var computedTags = Array.isArray(work.tags) && work.tags.length ? work.tags : parseGenreTagsFromMeta(work.meta, selectedFandom);
        var tags = computedTags.join(',');

        article.setAttribute('data-rating', rating);
        article.setAttribute('data-warnings', warnings);
        article.setAttribute('data-status', completionStatus);
        article.setAttribute('data-category', relationshipCategory);
        article.setAttribute('data-words', String(wordCount));
        article.setAttribute('data-tags', tags);

        var chapterTarget = typeof work.startChapter === 'number' ? work.startChapter : (index + 1);
        if (work.chapters && chapterTarget > work.chapters) {
          chapterTarget = work.chapters;
        }
        var isUserWork = !!work.uploadedBy || String(work.id || '').indexOf('user-work-') === 0;
        var displayAuthor = work.uploadedBy || work.author || (selectedFandom.replace(/\s+/g, '') + 'Writer');
        var displayLanguage = work.language || 'English';
        var displayUpdated = work.updated || '20 Feb 2026';
        var displayHits = typeof work.hits === 'number'
          ? work.hits
          : (isUserWork ? 0 : Math.max(wordCount * 2, 16000));
        var displayKudos = typeof work.kudos === 'number'
          ? work.kudos
          : (isUserWork ? 0 : Math.max(Math.floor(wordCount / 6), 1500));
        var displayBookmarks = typeof work.bookmarks === 'number'
          ? work.bookmarks
          : (isUserWork ? 0 : Math.max(Math.floor(wordCount / 12), 600));
        var displayComments = typeof work.comments === 'number'
          ? work.comments
          : (isUserWork ? 0 : Math.min(work.chapters || 3, 3));
        var chapterQuery = chapterTarget > 0 ? ('?chapter=' + chapterTarget) : '';
        var workLink = '';
        if (work.title) {
          var params = new URLSearchParams();
          params.set('workId', work.id || '');
          params.set('title', work.title);
          params.set('fandom', selectedFandom);
          params.set('category', selectedFandomCategory);
          params.set('author', displayAuthor);
          params.set('meta', work.meta || '');
          params.set('summary', work.text || '');
          params.set('content', work.content || '');
          params.set('chapters', String(work.chapters || 4));
          params.set('chapter', String(chapterTarget > 0 ? chapterTarget : 1));
          params.set('rating', rating);
          params.set('warnings', warnings);
          params.set('status', completionStatus);
          params.set('tags', tags);
          params.set('language', displayLanguage);
          params.set('updated', displayUpdated);
          params.set('hits', String(displayHits));
          params.set('kudos', String(displayKudos));
          params.set('bookmarks', String(displayBookmarks));
          params.set('comments', String(displayComments));
          params.set('audioLanguage', work.audioLanguage || 'en');
          params.set('audioEnabled', work.audioEnabled === false ? '0' : '1');
          workLink = 'work-fandom.html?' + params.toString();
        } else {
          workLink = work.link ? (work.link + chapterQuery) : '';
        }
        var summaryTags = Array.isArray(work.tags) && work.tags.length
          ? work.tags
          : parseGenreTagsFromMeta(work.meta, selectedFandom);

        renderWorkCardLayout(article, {
          title: work.title || 'Untitled Work',
          link: workLink || '#',
          author: displayAuthor,
          fandom: selectedFandom,
          summary: work.text || 'No summary provided.',
          tags: summaryTags,
          words: wordCount,
          chapters: work.chapters || 1,
          rating: rating,
          warnings: warnings,
          category: relationshipCategory,
          status: completionStatus,
          language: displayLanguage,
          updated: displayUpdated,
          hits: displayHits,
          kudos: displayKudos
        });

        article.addEventListener('click', function(event) {
          if (event.target.tagName.toLowerCase() === 'a') {
            return;
          }
          var mainLink = article.querySelector('h3 a');
          if (mainLink && mainLink.href) {
            window.location.href = mainLink.href;
          }
        });

        browseList.appendChild(article);
      });

      updateNoResultsState();
    }

    // Clear localStorage after using it
    localStorage.removeItem('selectedFandom');
    localStorage.removeItem('selectedFandomCategory');
  } else if (!selectedFandom) {
    document.body.classList.remove('browse-filtered');
    document.body.classList.remove('browse-empty');
    var allUploadedWorks = getAllUploadedWorks();

    if (browseList && allUploadedWorks.length) {
      allUploadedWorks.forEach(function(work) {
        var article = document.createElement('article');
        article.className = 'browse-card work-card';

        var wordCount = typeof work.words === 'number' ? work.words : getWordCountFromMeta(work.meta);
        var rating = work.rating || 'Teen And Up Audiences';
        var warnings = work.warnings || 'No Archive Warnings Apply';
        var completionStatus = work.status || 'Complete Works';
        var relationshipCategory = work.category || 'F/M';
        var tags = Array.isArray(work.tags) ? work.tags.join(',') : String(work.tags || '');
        var displayFandom = work.fandom || 'Original Work';
        var displayAuthor = work.uploadedBy || work.author || (displayFandom.replace(/\s+/g, '') + 'Writer');

        var computedTags = Array.isArray(work.tags) && work.tags.length ? work.tags : parseGenreTagsFromMeta(work.meta, displayFandom);
        var tags = computedTags.join(',');

        article.setAttribute('data-rating', rating);
        article.setAttribute('data-warnings', warnings);
        article.setAttribute('data-status', completionStatus);
        article.setAttribute('data-category', relationshipCategory);
        article.setAttribute('data-words', String(wordCount));
        article.setAttribute('data-tags', tags);

        var params = new URLSearchParams();
        params.set('workId', work.id || '');
        params.set('title', work.title || 'Untitled Work');
        params.set('fandom', displayFandom);
        params.set('category', 'Books & Literature');
        params.set('author', displayAuthor);
        params.set('meta', work.meta || '');
        params.set('summary', work.text || '');
        params.set('content', work.content || '');
        params.set('chapters', String(work.chapters || 1));
        params.set('chapter', '1');
        params.set('rating', rating);
        params.set('warnings', warnings);
        params.set('status', completionStatus);
        params.set('tags', tags);
        params.set('language', work.language || 'English');
        params.set('updated', work.updated || '20 Feb 2026');
        params.set('hits', String(typeof work.hits === 'number' ? work.hits : 0));
        params.set('kudos', String(typeof work.kudos === 'number' ? work.kudos : 0));
        params.set('bookmarks', String(typeof work.bookmarks === 'number' ? work.bookmarks : 0));
        params.set('comments', String(typeof work.comments === 'number' ? work.comments : 0));
        params.set('audioLanguage', work.audioLanguage || 'en');
        params.set('audioEnabled', work.audioEnabled === false ? '0' : '1');

        renderWorkCardLayout(article, {
          title: work.title || 'Untitled Work',
          link: 'work-fandom.html?' + params.toString(),
          author: displayAuthor,
          fandom: displayFandom,
          summary: work.text || 'No summary provided.',
          tags: Array.isArray(work.tags) && work.tags.length
            ? work.tags
            : parseGenreTagsFromMeta(work.meta, displayFandom),
          words: wordCount,
          chapters: work.chapters || 1,
          rating: rating,
          warnings: warnings,
          category: relationshipCategory,
          status: completionStatus,
          language: work.language || 'English',
          updated: work.updated || '20 Feb 2026',
          hits: typeof work.hits === 'number' ? work.hits : 0,
          kudos: typeof work.kudos === 'number' ? work.kudos : 0
        });

        article.addEventListener('click', function(event) {
          if (event.target.tagName.toLowerCase() === 'a') {
            return;
          }
          var mainLink = article.querySelector('h3 a');
          if (mainLink && mainLink.href) {
            window.location.href = mainLink.href;
          }
        });

        browseList.appendChild(article);
      });
    }

    // Show all featured works if no fandom selected
    if (pageTitle) {
      pageTitle.textContent = selectedQuery ? 'Search Results' : 'Browse Works';
    }
    if (pageSubtitle) {
      if (selectedQuery) {
        pageSubtitle.textContent = 'Showing results for "' + selectedQuery + '" across featured and user-published works.';
      } else {
        pageSubtitle.textContent = 'A broader archive view showing featured and recently updated works.';
      }
    }

    // Show default popular fandoms in related searches
    var relatedSearchesCard = document.getElementById('relatedSearchesCard');
    var relatedSearchesList = document.getElementById('relatedSearchesList');
    if (relatedSearchesCard && relatedSearchesList) {
      var titleElement = relatedSearchesCard.querySelector('h3');
      if (titleElement) {
        titleElement.textContent = 'Popular Fandoms';
      }
      relatedSearchesCard.style.display = '';  // Reset to default display
    }

    updateNoResultsState();
  } else {
    document.body.classList.add('browse-filtered');

    if (pageTitle) {
      pageTitle.textContent = 'Browse Works';
    }

    if (pageSubtitle) {
      pageSubtitle.textContent = 'No works are currently available for this fandom.';
    }

    if (browseList) {
      browseList.innerHTML = '';
    }

    if (browseNoResults) {
      browseNoResults.textContent = 'No works found for the selected fandom.';
    }

    document.body.classList.add('browse-empty');
    localStorage.removeItem('selectedFandom');
    localStorage.removeItem('selectedFandomCategory');
  }

  initBrowseInteractions();
}

// Initialize browse page when DOM is ready
if (document.body && document.body.getAttribute('data-page') === 'browse') {
  initBrowsePage();
}
