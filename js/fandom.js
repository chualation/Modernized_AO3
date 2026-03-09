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

  // Handle fandom item clicks to pass fandom info to browse-works page
  fandomItems.forEach(function(item) {
    item.addEventListener('click', function(e) {
      var fandomName = this.querySelector('.fandom-name').textContent.trim();
      var fandomCategory = this.getAttribute('data-category');
      localStorage.setItem('selectedFandom', fandomName);
      localStorage.setItem('selectedFandomCategory', fandomCategory);
      e.preventDefault();
      window.location.href = 'browse-works.html?fandom=' + encodeURIComponent(fandomName);
    });
  });
}

// Initialize fandom page when DOM is ready
if (document.body && document.body.getAttribute('data-page') === 'fandoms') {
  initFandomPage();
}
