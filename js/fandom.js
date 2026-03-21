/* FANDOM.JS - Fandom page filtering functionality */

// Initialize fandom page features if on fandom page
function initFandomPage() {
  var searchInput = document.getElementById('fandomSearchInput');
  var searchBtn = document.querySelector('.fandom-search-btn');
  var categoryBtns = document.querySelectorAll('.category-btn');
  var fandomItems = document.querySelectorAll('.fandom-item');
  var fandomsList = document.querySelector('.popular-fandoms-list');

  if (!searchInput || !searchBtn) {
    return; // Exit if elements not found
  }

  var currentCategory = 'all';

  var currentCategory = 'all';

  // --- ADD THIS TO DYNAMICALLY CREATE & UPDATE FANDOMS ---
  // 1. Retrieve uploaded works
  var uploadedWorks = [];
  try {
    var rawWorks = localStorage.getItem('ao3-uploaded-works');
    if (rawWorks) {
      uploadedWorks = JSON.parse(rawWorks);
    }
  } catch (error) {
    console.error("Could not load uploaded works", error);
  }

  // Helper to safely display text
  function escapeHtml(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Count uploaded works by fandom and store category
  var uploadedFandomStats = {};
  if (Array.isArray(uploadedWorks)) {
    uploadedWorks.forEach(function(work) {
      if (!work || !work.fandom) return;
      var fName = work.fandom.trim();
      var fNameLower = fName.toLowerCase();
      
      if (!uploadedFandomStats[fNameLower]) {
        uploadedFandomStats[fNameLower] = {
          name: fName,
          category: work.categoryName || 'Other Media', // fallback category for new fandoms
          count: 0
        };
      }
      uploadedFandomStats[fNameLower].count++;
    });
  }

  // Update existing hardcoded fandoms
  var existingFandomNames = [];
  fandomItems.forEach(function(item) {
    var fandomName = item.querySelector('.fandom-name').textContent.trim();
    var fNameLower = fandomName.toLowerCase();
    existingFandomNames.push(fNameLower);
    
    var countElement = item.querySelector('.work-count');
    
    if (!item.hasAttribute('data-base-count')) {
      item.setAttribute('data-base-count', countElement.textContent.trim());
    }
    var baseCount = parseInt(item.getAttribute('data-base-count'), 10) || 0;
    
    var newUploadsCount = uploadedFandomStats[fNameLower] ? uploadedFandomStats[fNameLower].count : 0;
    countElement.textContent = baseCount + newUploadsCount;
  });

  // Create new fandom cards for completely new fandoms
  Object.keys(uploadedFandomStats).forEach(function(fNameLower) {
    if (existingFandomNames.indexOf(fNameLower) === -1) {
      var stats = uploadedFandomStats[fNameLower];
      var newLink = document.createElement('a');
      newLink.href = 'browse-works.html';
      newLink.className = 'fandom-item';
      newLink.setAttribute('data-category', stats.category);
      
      newLink.innerHTML = 
        '<div class="fandom-info">' +
          '<h4 class="fandom-name">' + escapeHtml(stats.name) + '</h4>' +
          '<span class="fandom-category">' + escapeHtml(stats.category) + '</span>' +
        '</div>' +
        '<div class="fandom-stats">' +
          '<span class="work-count">' + stats.count + '</span>' +
          '<span class="work-label">' + (stats.count === 1 ? 'work' : 'works') + '</span>' +
        '</div>';
      
      if (fandomsList) {
        fandomsList.insertBefore(newLink, fandomsList.firstChild); // Adds to the very top of the list!
      }
    }
  });

  // Re-query the fandom list so the search bar and clicks work on the new cards!
  fandomItems = document.querySelectorAll('.fandom-item');

  // Create no-results message element
  var noResultsMsg = document.createElement('div');
  noResultsMsg.className = 'no-fandoms-message';
  noResultsMsg.innerHTML = '<p>No fandoms found. Try adjusting your search or category filters.</p>';
  noResultsMsg.style.display = 'none';
  if (fandomsList) {
    fandomsList.parentNode.insertBefore(noResultsMsg, fandomsList);
  }

  // Search functionality
  function performSearch() {
    var searchTerm = searchInput.value.toLowerCase().trim();
    var visibleCount = 0;
    
    fandomItems.forEach(function(item) {
      var fandomName = item.querySelector('.fandom-name').textContent.toLowerCase();
      var fandomCategory = item.getAttribute('data-category');
      var matchesSearch = fandomName.indexOf(searchTerm) !== -1 || searchTerm === '';
      var matchesCategory = currentCategory === 'all' || fandomCategory === currentCategory;
      
      if (matchesSearch && matchesCategory) {
        item.classList.remove('hidden');
        visibleCount++;
        // Stagger animation
        setTimeout(function() {
          item.style.animation = 'none';
          setTimeout(function() {
            item.style.animation = '';
          }, 10);
        }, 10);
      } else {
        item.classList.add('hidden');
      }
    });

    // Show/hide no results message
    if (visibleCount === 0) {
      noResultsMsg.style.display = 'block';
      if (fandomsList) fandomsList.style.display = 'none';
    } else {
      noResultsMsg.style.display = 'none';
      if (fandomsList) fandomsList.style.display = 'flex';
    }
  }

  // Category filter functionality
  function filterByCategory(category) {
    currentCategory = category;
    
    // Update active button state
    categoryBtns.forEach(function(btn) {
      if (btn.getAttribute('data-category') === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    performSearch();
  }

  // Event listeners
  searchBtn.addEventListener('click', performSearch);
  
  searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      performSearch();
    } else {
      // Real-time search as user types
      performSearch();
    }
  });

  categoryBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var category = this.getAttribute('data-category');
      filterByCategory(category);
    });
  });

  // Stagger animation for fandom items on page load
  fandomItems.forEach(function(item, index) {
    item.style.animation = 'slideDown 0.5s ease ' + (0.4 + index * 0.05) + 's both';
  });

  // Restore category/fandom context from query params when navigating back from a work.
  var queryParams = new URLSearchParams(window.location.search);
  var categoryParam = queryParams.get('category');
  var fandomParam = queryParams.get('fandom');

  if (categoryParam) {
    filterByCategory(categoryParam);
  }

  if (fandomParam && searchInput) {
    searchInput.value = fandomParam;
    performSearch();
  }

  // Handle fandom item clicks to pass fandom info to browse-works page
  fandomItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      var fandomName = this.querySelector('.fandom-name').textContent.trim();
      var fandomCategory = this.getAttribute('data-category');
      localStorage.setItem('selectedFandom', fandomName);
      localStorage.setItem('selectedFandomCategory', fandomCategory);
      e.preventDefault();
      window.location.href = 'browse-works.html?fandom=' + encodeURIComponent(fandomName) + '&category=' + encodeURIComponent(fandomCategory);
    });
  });
}

// Initialize fandom page when DOM is ready
if (document.body && document.body.getAttribute('data-page') === 'fandoms') {
  initFandomPage();
}
