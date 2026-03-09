/* BROWSE.JS - Browse works page filtering by fandom */

function initBrowsePage() {
  // Get fandom name from URL parameter
  var urlParams = new URLSearchParams(window.location.search);
  var selectedFandom = urlParams.get('fandom') || localStorage.getItem('selectedFandom');
  var pageTitle = document.querySelector('.page-title');
  var pageSubtitle = document.querySelector('.page-subtitle');
  var browseList = document.querySelector('.browse-list');
  var browseNoResults = document.getElementById('browseNoResults');

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
    var optionButtons = document.querySelectorAll('.browse-option-label[data-filter-group]');
    var defaultCards = document.querySelectorAll('.browse-list .browse-card');

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
    });

    if (!optionButtons.length || !defaultCards.length || document.body.classList.contains('browse-filtered')) {
      return;
    }

    function applyFilter(group, value) {
      defaultCards.forEach(function(card) {
        if (group === 'clear') {
          card.style.display = 'block';
          return;
        }

        if (group === 'words') {
          var words = parseInt(card.getAttribute('data-words') || '0', 10);
          var shouldShow = false;

          if (value === 'under-1000') {
            shouldShow = words < 1000;
          } else if (value === '1000-5000') {
            shouldShow = words >= 1000 && words <= 5000;
          } else if (value === '5000-10000') {
            shouldShow = words >= 5000 && words <= 10000;
          } else if (value === '10000-50000') {
            shouldShow = words >= 10000 && words <= 50000;
          } else if (value === '50000-plus') {
            shouldShow = words >= 50000;
          }

          card.style.display = shouldShow ? 'block' : 'none';
          return;
        }

        var cardValue = card.getAttribute('data-' + group);
        if (cardValue === value) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      if (group === 'clear') {
        document.body.classList.remove('browse-filtering');
      } else {
        document.body.classList.add('browse-filtering');
      }

      updateNoResultsState();
    }

    optionButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        optionButtons.forEach(function(btn) {
          btn.classList.remove('is-active');
        });

        button.classList.add('is-active');
        applyFilter(button.getAttribute('data-filter-group'), button.getAttribute('data-filter-value'));
      });
    });
  }

  // Define works for each fandom
  var fandomWorks = {
    'Harry Potter': [
      {
        title: 'The Chosen One\'s Unexpected Journey',
        meta: 'Harry Potter • Romance • Adventure • 125,430 words',
        text: 'An alternate perspective on Harry\'s seventh year with unexpected romance and deeper magic.',
        chapters: 8,
        link: 'work.html'
      },
      {
        title: 'Hermione\'s Brilliance Series',
        meta: 'Harry Potter • Fantasy • Action • 298,750 words',
        text: 'A complete retelling focusing on Hermione Granger\'s extraordinary magical research and discoveries.',
        chapters: 15,
        link: 'work-book2.html'
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
      }
    ]
  };

  if (selectedFandom && fandomWorks[selectedFandom]) {
    document.body.classList.add('browse-filtered');
    document.body.classList.remove('browse-empty');
    var works = fandomWorks[selectedFandom];
    
    // Update page title and subtitle
    if (pageTitle) {
      pageTitle.textContent = selectedFandom + ' Works';
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = 'Browse ' + works.length + ' works from the ' + selectedFandom + ' fandom.';
    }

    // Clear existing browse list if it exists
    if (browseList) {
      browseList.innerHTML = '';

      // Add filtered works
      works.forEach(function(work) {
        var article = document.createElement('article');
        article.className = 'browse-card';
        var chapterText = work.chapters ? '<span class="work-chapters"><strong> • Chapters:</strong> ' + work.chapters + '</span>' : '';
        var titleHTML = work.link ? '<a href="' + work.link + '">' + work.title + '</a>' : work.title;
        article.innerHTML = '<h3>' + titleHTML + '</h3>' +
                            '<p class="browse-meta">' + work.meta + chapterText + '</p>' +
                            '<p class="browse-text">' + work.text + '</p>';

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
    // Show all featured works if no fandom selected
    if (pageTitle) {
      pageTitle.textContent = 'Browse Works';
    }
    if (pageSubtitle) {
      pageSubtitle.textContent = 'A broader archive view showing featured and recently updated works.';
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
