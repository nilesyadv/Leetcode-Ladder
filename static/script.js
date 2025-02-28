/* filepath: /Users/nileshkumar/Desktop/Leetcode-Ladder/static/script.js */
// Global variables
let currentRating = '';
let currentSort = { field: 'Problem Number', order: 'desc' }; // Changed default sort
let showTags = localStorage.getItem('showTags') !== 'false';
let searchTimer = null;

// Global functions (moved outside DOMContentLoaded)
function createTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return `<div class="alert alert-info">No problems found matching your criteria.</div>`;
    }
    
    // Get solved problems from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th data-sort="Date">Date</th>
                        <th data-sort="Problem Number">Number</th>
                        <th data-sort="Problem Name">Problem Name</th>
                        <th data-sort="Problem Rating">Rating</th>
                        <th data-sort="Contest Name">Contest</th>
                        <th style="${showTags ? '' : 'display: none;'}">Tags</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach(row => {
        const problemId = row['Problem Number'];
        const isSolved = solvedProblems[problemId] === true;
        const rowClass = isSolved ? 'solved-problem' : '';
        const tags = row.Tags ? row.Tags.split(',').map(tag => 
            `<span class="tag-badge">${tag.trim()}</span>`).join(' ') : '';
        
        const rating = parseInt(row['Problem Rating']);
        const ratingColor = getRatingColor(rating);
        const ratingLabel = getRatingLabel(rating);
            
        html += `
            <tr class="${rowClass}" data-problem-id="${problemId}">
                <td>${row['Date'] || ''}</td>
                <td>${problemId}</td>
                <td>
                    <a href="${row['Problem Link']}" class="problem-link" target="_blank">
                        ${row['Problem Name']}
                    </a>
                </td>
                <td class="rating-cell">
                    <span class="rating-badge" style="color: ${ratingColor}; border-color: ${ratingColor};"
                        data-bs-toggle="tooltip" title="${ratingLabel}">
                        ${rating}
                    </span>
                </td>
                <td>${row['Contest Name'] || ''}</td>
                <td style="${showTags ? '' : 'display: none;'}">${tags}</td>
                <td>
                    <span class="status-badge ${isSolved ? 'solved' : 'unsolved'}">
                        ${isSolved ? 
                            '<i class="bi bi-check2-circle"></i> Solved' : 
                            '<i class="bi bi-circle"></i> Not Solved'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Initialize tooltips after table is created
    setTimeout(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }, 100);
    
    return html;
}

function loadProblems() {
    if (!currentRating) {
        console.log('No current rating selected, cannot load problems');
        return;
    }
    
    console.log(`Loading problems for rating range: ${currentRating}`);
    
    const searchInput = document.getElementById('searchInput');
    const loading = document.getElementById('loading');
    const problemTable = document.getElementById('problemTable');
    
    // If this is the initial load (not a user-triggered sort or search)
    if (!window.userInitiatedAction) {
        // Set default sort
        currentSort = { field: 'Problem Number', order: 'desc' };
        updateSortButtons(); // Update UI to reflect default sort
    }
    
    const search = searchInput ? searchInput.value : '';
    loading.classList.remove('d-none');
    problemTable.innerHTML = '';
    
    // Use the current sort settings
    const params = new URLSearchParams({
        search: search,
        sort: currentSort.field,
        order: currentSort.order
    });
    
    const url = `/problems/${currentRating}?${params}`;
    console.log(`Fetching from: ${url}`);
    
    fetch(url)
        .then(response => {
            console.log(`Response status: ${response.status}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log(`Received ${data.problems ? data.problems.length : 0} problems`);
            const problemStats = document.getElementById('problemStats');
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            problemStats.textContent = `${data.count} problems found`;
            problemTable.innerHTML = createTable(data.problems);
            
            // Set up sort event listeners
            const thElements = problemTable.querySelectorAll('th[data-sort]');
            thElements.forEach(th => {
                th.addEventListener('click', () => {
                    window.userInitiatedAction = true; // Mark as user action
                    const field = th.dataset.sort;
                    sortTable(field);
                });
            });
            
            // Set up solved toggle listeners
            const solvedButtons = problemTable.querySelectorAll('.toggle-solved');
            solvedButtons.forEach(button => {
                button.addEventListener('click', toggleSolved);
            });
        })
        .catch(error => {
            console.error('Error loading problems:', error);
            problemTable.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill"></i> Error loading problems: ${error.message}
                </div>`;
            document.getElementById('problemStats').textContent = '';
        })
        .finally(() => {
            loading.classList.add('d-none');
        });
}

function toggleSolved(e) {
    const problemId = e.target.dataset.problemId;
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    solvedProblems[problemId] = !solvedProblems[problemId];
    localStorage.setItem('solvedProblems', JSON.stringify(solvedProblems));
    
    const row = e.target.closest('tr');
    row.classList.toggle('solved-problem');
    e.target.classList.toggle('btn-outline-secondary');
    e.target.classList.toggle('btn-success');
    e.target.textContent = solvedProblems[problemId] ? 'Solved' : 'Not Solved';
}

// Move createTable outside of DOMContentLoaded to make it globally accessible
function createTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return `<div class="alert alert-info">No problems found matching your criteria.</div>`;
    }
    
    // Get solved problems from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th data-sort="Date">Date</th>
                        <th data-sort="Problem Number">Number</th>
                        <th data-sort="Problem Name">Problem Name</th>
                        <th data-sort="Problem Rating">Rating</th>
                        <th data-sort="Contest Name">Contest</th>
                        <th style="${showTags ? '' : 'display: none;'}">Tags</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach(row => {
        const problemId = row['Problem Number'];
        const isSolved = solvedProblems[problemId] === true;
        const rowClass = isSolved ? 'solved-problem' : '';
        const tags = row.Tags ? row.Tags.split(',').map(tag => 
            `<span class="tag-badge">${tag.trim()}</span>`).join(' ') : '';
        
        const rating = parseInt(row['Problem Rating']);
        const ratingColor = getRatingColor(rating);
        const ratingLabel = getRatingLabel(rating);
            
        html += `
            <tr class="${rowClass}" data-problem-id="${problemId}">
                <td>${row['Date'] || ''}</td>
                <td>${problemId}</td>
                <td>
                    <a href="${row['Problem Link']}" class="problem-link" target="_blank">
                        ${row['Problem Name']}
                    </a>
                </td>
                <td class="rating-cell">
                    <span class="rating-badge" style="color: ${ratingColor}; border-color: ${ratingColor};"
                        data-bs-toggle="tooltip" title="${ratingLabel}">
                        ${rating}
                    </span>
                </td>
                <td>${row['Contest Name'] || ''}</td>
                <td style="${showTags ? '' : 'display: none;'}">${tags}</td>
                <td>
                    <span class="status-badge ${isSolved ? 'solved' : 'unsolved'}">
                        ${isSolved ? 
                            '<i class="bi bi-check2-circle"></i> Solved' : 
                            '<i class="bi bi-circle"></i> Not Solved'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Initialize tooltips after table is created
    setTimeout(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }, 100);
    
    return html;
}

// Other global functions

document.addEventListener('DOMContentLoaded', function() {
    const ratingSelect = document.getElementById('ratingSelect');
    const searchInput = document.getElementById('searchInput');
    const problemTable = document.getElementById('problemTable');
    const problemStats = document.getElementById('problemStats');
    const problemsHeader = document.getElementById('problemsHeader');
    const loading = document.getElementById('loading');
    const themeSwitcher = document.getElementById('themeSwitcher');
    
    // Theme switcher
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-theme');
        themeSwitcher.innerHTML = '<i class="bi bi-sun-fill"></i>';
    }
    
    themeSwitcher.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('darkMode', isDark);
        themeSwitcher.innerHTML = isDark ? 
            '<i class="bi bi-sun-fill"></i>' : 
            '<i class="bi bi-moon-fill"></i>';
    });
    
    // Rating select change
    ratingSelect.addEventListener('change', function() {
        const rating = this.value;
        if (rating) {
            currentRating = rating;
            searchInput.disabled = false;
            searchInput.value = '';
            
            // Reset sort to default when changing rating range
            currentSort = { field: 'Problem Number', order: 'desc' };
            updateSortButtons();
            
            window.userInitiatedAction = false; // Mark as not user initiated
            loadProblems(); // Call the now-global loadProblems function
            
            document.getElementById('problemsHeader').textContent = 
                `Problems with Rating ${rating.replace('_to_', '-')}`;
        } else {
            searchInput.disabled = true;
            problemTable.innerHTML = '';
            problemStats.textContent = '';
            problemsHeader.textContent = 'Select a rating range to view problems';
        }
    });
    
    // Search input
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadProblems, 300);
    });
    
    // Sort table
    function sortTable(field) {
        if (currentSort.field === field) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.order = 'asc';
        }
        loadProblems();
    }

    // Global search form handling
    const globalSearchForm = document.querySelector('.global-search-form');
    const globalSearchInput = document.getElementById('globalSearchInput');
    
    globalSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchTerm = globalSearchInput.value.trim();
        if (searchTerm.length >= 2) {
            performGlobalSearch(searchTerm);
        }
    });
    
    // Handle pressing Enter in global search box
    globalSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = globalSearchInput.value.trim();
            if (searchTerm.length >= 2) {
                performGlobalSearch(searchTerm);
            }
        }
    });

    function toggleTags() {
        showTags = !showTags;
        
        // Update localStorage
        localStorage.setItem('showTags', showTags);
        
        // Update UI
        const btn = document.getElementById('toggleTagsBtn');
        btn.innerHTML = `
            <i class="bi ${showTags ? 'bi-eye' : 'bi-eye-slash'}"></i>
            ${showTags ? 'Hide Tags' : 'Show Tags'}
        `;
        btn.classList.toggle('btn-outline-primary', !showTags);
        btn.classList.toggle('btn-primary', showTags);
        
        // Update tags display in the table
        const tagCells = document.querySelectorAll('td:nth-child(6)');
        tagCells.forEach(cell => {
            cell.style.display = showTags ? '' : 'none';
        });
        
        // Also update the table header
        const tagHeader = document.querySelector('th:nth-child(6)');
        if (tagHeader) {
            tagHeader.style.display = showTags ? '' : 'none';
        }
    }

    function sortByField(field) {
        window.userInitiatedAction = true; // Mark as user action
        
        if (currentSort.field === field) {
            // Toggle order if already sorting by this field
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = field;
            currentSort.order = field === 'Problem Number' ? 'desc' : 'asc'; // Default newest problems first for number
        }
        
        updateSortButtons();
        loadProblems();
    }

    function updateSortButtons() {
        const ratingBtn = document.getElementById('sortRatingBtn');
        const numberBtn = document.getElementById('sortNumberBtn');
        
        ratingBtn.classList.toggle('btn-outline-secondary', currentSort.field !== 'Problem Rating');
        ratingBtn.classList.toggle('btn-secondary', currentSort.field === 'Problem Rating');
        
        numberBtn.classList.toggle('btn-outline-secondary', currentSort.field !== 'Problem Number');
        numberBtn.classList.toggle('btn-secondary', currentSort.field === 'Problem Number');
        
        // Add sort indicators
        const orderIcon = currentSort.order === 'asc' ? '↑' : '↓';
        
        if (currentSort.field === 'Problem Rating') {
            ratingBtn.textContent = `Sort by Rating ${orderIcon}`;
            numberBtn.textContent = 'Sort by Number';
        } else if (currentSort.field === 'Problem Number') {
            numberBtn.textContent = `Sort by Number ${orderIcon}`;
            ratingBtn.textContent = 'Sort by Rating';
        }
    }

    // Add controls for tags and sorting
    // Add inside DOMContentLoaded, after the existing controls section
    function addControls() {
        // Create controls container after the existing row in the main-container
        const mainContainer = document.querySelector('.main-container');
        const firstRow = mainContainer.querySelector('.row');
        
        const controlsRow = document.createElement('div');
        controlsRow.className = 'row mb-3';
        controlsRow.innerHTML = `
            <div class="col-lg-6">
                <div class="card">
                    <div class="card-body d-flex">
                        <div class="btn-group me-3">
                            <button id="toggleTagsBtn" class="btn ${showTags ? 'btn-primary' : 'btn-outline-primary'}">
                                <i class="bi ${showTags ? 'bi-eye' : 'bi-eye-slash'}"></i>
                                ${showTags ? 'Hide Tags' : 'Show Tags'}
                            </button>
                        </div>
                        <div class="btn-group">
                            <button id="sortRatingBtn" class="btn btn-outline-secondary">
                                Sort by Rating
                            </button>
                            <button id="sortNumberBtn" class="btn btn-outline-secondary">
                                Sort by Number
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after the first row
        firstRow.insertAdjacentElement('afterend', controlsRow);
        
        // Set up event handlers
        document.getElementById('toggleTagsBtn').addEventListener('click', toggleTags);
        document.getElementById('sortRatingBtn').addEventListener('click', () => sortByField('Problem Rating'));
        document.getElementById('sortNumberBtn').addEventListener('click', () => sortByField('Problem Number'));
        
        // Update button states based on current sort
        updateSortButtons();
    }

    // Call this right after the DOMContentLoaded fires
    addControls();

    // Call this after the dropdown is populated
    updateRatingSelectColors();

    // Call this to add the rating distribution bar
    addRatingDistributionBar();

    // Call this function in your DOMContentLoaded event
    addLeetCodeUserSearch();
});

// Global search function
function performGlobalSearch(searchTerm) {
    const loading = document.getElementById('loading');
    const problemTable = document.getElementById('problemTable');
    const problemsHeader = document.getElementById('problemsHeader');
    const problemStats = document.getElementById('problemStats');
    
    loading.classList.remove('d-none');
    problemTable.innerHTML = '';
    problemsHeader.textContent = `Search Results`;
    problemStats.textContent = '';
    
    fetch(`/search?q=${encodeURIComponent(searchTerm)}&sort=Problem Number&order=desc`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Set default sort for search results too
            currentSort = { field: 'Problem Number', order: 'desc' };
            updateSortButtons();
            
            problemStats.textContent = data.message;
            
            if (data.problems.length > 0) {
                problemTable.innerHTML = createGlobalSearchTable(data.problems);
                
                // Set up solved toggle listeners
                const solvedButtons = problemTable.querySelectorAll('.toggle-solved');
                solvedButtons.forEach(button => {
                    button.addEventListener('click', toggleSolved);
                });
            } else {
                problemTable.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> ${data.message}
                    </div>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            problemTable.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill"></i> Error: ${error.message}
                </div>`;
        })
        .finally(() => {
            loading.classList.add('d-none');
        });
}

// Create table for global search results
function createGlobalSearchTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return `<div class="alert alert-info">No problems found matching your criteria.</div>`;
    }
    
    // Get solved problems from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Number</th>
                        <th>Problem Name</th>
                        <th>Rating</th>
                        <th>Range</th>
                        <th>Contest</th>
                        <th style="${showTags ? '' : 'display: none;'}">Tags</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach(row => {
        const problemId = row['Problem Number'];
        const isSolved = solvedProblems[problemId] === true;
        const rowClass = isSolved ? 'solved-problem' : '';
        const tags = row.Tags ? row.Tags.split(',').map(tag => 
            `<span class="tag-badge">${tag.trim()}</span>`).join(' ') : '';
        
        const rating = parseInt(row['Problem Rating']);
        const ratingColor = getRatingColor(rating);
        const ratingLabel = getRatingLabel(rating);
            
        html += `
            <tr class="${rowClass}" data-problem-id="${problemId}">
                <td>${row['Date'] || ''}</td>
                <td>${problemId}</td>
                <td>
                    <a href="${row['Problem Link']}" class="problem-link" target="_blank">
                        ${row['Problem Name']}
                    </a>
                </td>
                <td class="rating-cell">
                    <span class="rating-badge" style="color: ${ratingColor}; border-color: ${ratingColor};"
                        data-bs-toggle="tooltip" title="${ratingLabel}">
                        ${rating}
                    </span>
                </td>
                <td><span class="badge bg-secondary">${row['Rating Range']}</span></td>
                <td>${row['Contest Name'] || ''}</td>
                <td style="${showTags ? '' : 'display: none;'}">${tags}</td>
                <td>
                    <span class="status-badge ${isSolved ? 'solved' : 'unsolved'}">
                        ${isSolved ? 
                            '<i class="bi bi-check2-circle"></i> Solved' : 
                            '<i class="bi bi-circle"></i> Not Solved'}
                    </span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Initialize tooltips after table is created
    setTimeout(() => {
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
            new bootstrap.Tooltip(tooltip);
        });
    }, 100);
    
    return html;
}

// Add this function to script.js to get the color based on rating
function getRatingColor(rating) {
    if (rating < 1200) return '#808080'; // Gray (Newbie)
    if (rating < 1400) return '#008000'; // Green (Pupil)
    if (rating < 1600) return '#03a89e'; // Cyan (Specialist)
    if (rating < 1900) return '#0000ff'; // Blue (Expert)
    if (rating < 2100) return '#a0a'; // Purple (Candidate Master)
    if (rating < 2400) return '#ff8c00'; // Orange (Master)
    if (rating < 2600) return '#ff8c00'; // Orange (International Master)
    if (rating < 3000) return '#ff0000'; // Red (Grandmaster)
    return '#ff0000'; // Red (International Grandmaster / Legendary Grandmaster)
}

// Get rating label for a given rating
function getRatingLabel(rating) {
    if (rating < 1200) return 'Newbie';
    if (rating < 1400) return 'Pupil';
    if (rating < 1600) return 'Specialist';
    if (rating < 1900) return 'Expert';
    if (rating < 2100) return 'Candidate Master';
    if (rating < 2400) return 'Master';
    if (rating < 2600) return 'International Master';
    if (rating < 3000) return 'Grandmaster';
    return 'Legendary Grandmaster';
}

function updateRatingSelectColors() {
    const options = document.querySelectorAll('#ratingSelect option');
    
    options.forEach(option => {
        if (!option.value) return; // Skip placeholder option
        
        const rangeParts = option.value.split('_to_');
        if (rangeParts.length !== 2) return;
        
        const lowerBound = parseInt(rangeParts[0]);
        const color = getRatingColor(lowerBound);
        
        option.style.color = color;
        option.style.fontWeight = 'bold';
    });
}

// Add this right after the global search form in your navbar
function addLeetCodeUserSearch() {
    const navbarRight = document.querySelector('.navbar-nav.ms-auto');
    
    const userSearchLi = document.createElement('li');
    userSearchLi.className = 'nav-item dropdown';
    userSearchLi.innerHTML = `
        <a class="nav-link dropdown-toggle" href="#" id="userSearchDropdown" role="button" 
           data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-person-circle"></i> User Search
        </a>
        <div class="dropdown-menu dropdown-menu-end p-3" style="width: 300px;">
            <form id="leetcodeUserForm" class="px-1 py-2">
                <div class="mb-3">
                    <label for="leetcodeUsername" class="form-label">LeetCode Username</label>
                    <div class="input-group">
                        <input type="text" class="form-control" id="leetcodeUsername" 
                               placeholder="Enter username">
                        <button class="btn btn-primary" type="submit">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;
    
    // Insert before the theme switcher
    const themeSwitcherLi = document.querySelector('#themeSwitcher').parentElement;
    navbarRight.insertBefore(userSearchLi, themeSwitcherLi);
    
    // Set up event handler
    document.getElementById('leetcodeUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('leetcodeUsername').value.trim();
        if (username) {
            fetchLeetCodeUserProfile(username);
        }
    });
}

// Call this function in your DOMContentLoaded event
addLeetCodeUserSearch();

async function fetchLeetCodeUserProfile(username) {
    // Show loading indicator
    showUserLoadingIndicator(username);
    
    try {
        console.log(`Fetching profile for ${username}...`);
        const response = await fetch(`/api/leetcode/user/${username}`);
        
        // Log response details for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
            displayUserProfile(data);
        } else {
            const errorMsg = data.error || `Failed with status: ${response.status}`;
            console.error('API error:', errorMsg);
            showUserError(errorMsg);
        }
    } catch (error) {
        console.error('Network error when fetching profile:', error);
        showUserError(`Network error: ${error.message}. Check browser console for details.`);
    }
}

function showUserLoadingIndicator(username) {
    // Remove any existing recommendation cards first
    removeExistingRecommendationCard();
    
    // Create or update user profile card with loading state
    let profileCard = document.getElementById('userProfileCard');
    
    if (!profileCard) {
        // Create new card if it doesn't exist
        profileCard = document.createElement('div');
        profileCard.id = 'userProfileCard';
        profileCard.className = 'card mb-4';
        
        // Insert after the controls row
        const controlsRow = document.querySelector('.row.mb-3');
        controlsRow.insertAdjacentElement('afterend', profileCard);
    }
    
    profileCard.innerHTML = `
        <div class="card-body text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Fetching profile for ${username}...</p>
        </div>
    `;
}

function showUserError(message) {
    // Remove any existing recommendation cards
    removeExistingRecommendationCard();
    
    const profileCard = document.getElementById('userProfileCard');
    if (profileCard) {
        profileCard.innerHTML = `
            <div class="card-body text-center">
                <div class="text-danger">
                    <i class="bi bi-exclamation-triangle-fill" style="font-size: 2rem;"></i>
                    <p class="mt-2">${message}</p>
                </div>
            </div>
        `;
    }
}

function displayUserProfile(data) {
    if (!data.matchedUser) {
        showUserError('User not found');
        return;
    }
    
    const user = data.matchedUser;
    const profileCard = document.getElementById('userProfileCard');
    
    // Get solve counts by difficulty
    const solveStats = {
        easy: 0,
        medium: 0,
        hard: 0
    };
    
    // Correctly parse the submission stats
    user.submitStats.acSubmissionNum.forEach(stat => {
        if (stat.difficulty === "Easy") solveStats.easy = stat.count;
        else if (stat.difficulty === "Medium") solveStats.medium = stat.count;
        else if (stat.difficulty === "Hard") solveStats.hard = stat.count;
    });
    
    // Calculate the total (sum of the individual difficulty counts)
    solveStats.total = solveStats.easy + solveStats.medium + solveStats.hard;
    
    // Get contest rating
    const contestRating = data.userContestRanking ? data.userContestRanking.rating : null;
    const contestRatingFormatted = contestRating ? Math.round(contestRating) : 'N/A';
    const contestRatingColor = contestRating ? getRatingColor(contestRating) : '#666';
    const contestRatingLabel = contestRating ? getRatingLabel(contestRating) : 'Unrated';
    
    // User avatar
    const avatarUrl = user.profile.userAvatar || 'https://assets.leetcode.com/users/default_avatar.jpg';
    
    // Create basic profile card HTML
    profileCard.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                <i class="bi bi-person-circle"></i> LeetCode Profile
            </h5>
            <button type="button" class="btn-close" aria-label="Close" id="closeProfileCard"></button>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-4 text-center">
                    <img src="${avatarUrl}" alt="${user.username}" 
                         class="rounded-circle mb-3" style="width: 100px; height: 100px;">
                    <h5>${user.username}</h5>
                    <p>Ranking: <b>${user.profile.ranking || 'N/A'}</b></p>
                </div>
                <div class="col-md-4">
                    <h5 class="text-center mb-3">Problem Solving</h5>
                    <div class="d-flex justify-content-between">
                        <span>Total Solved:</span>
                        <span class="fw-bold">${solveStats.total}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>Easy:</span>
                        <span class="fw-bold text-success">${solveStats.easy}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>Medium:</span>
                        <span class="fw-bold text-warning">${solveStats.medium}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>Hard:</span>
                        <span class="fw-bold text-danger">${solveStats.hard}</span>
                    </div>
                </div>
                <div class="col-md-4 text-center">
                    <h5 class="mb-3">Contest Rating</h5>
                    <div class="rating-display" style="border-color: ${contestRatingColor}; color: ${contestRatingColor};">
                        ${contestRatingFormatted}
                    </div>
                    <p class="mt-2">${contestRatingLabel}</p>
                    ${data.userContestRanking ? 
                        `<p class="text-muted small">Global Rank: ${data.userContestRanking.globalRanking || 'N/A'}</p>` : 
                        '<p class="text-muted small">No contest participation</p>'}
                </div>
            </div>
            <div class="text-center mt-3">
                <a href="https://leetcode.com/${user.username}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-box-arrow-up-right"></i> View on LeetCode
                </a>
            </div>
        </div>
    `;
    
    // Add event handler for close button
    document.getElementById('closeProfileCard').addEventListener('click', () => {
        profileCard.remove();
        removeExistingRecommendationCard(); // Remove recommendation card when profile is closed
    });
    
    // Automatically sync solved problems whenever a profile is loaded
    syncSolvedProblems(user.username);
    
    // Add personalized recommendations if rating is available
    if (contestRating) {
        addPersonalizedRecommendations(contestRating, user.username);
    }
}

// Updated function for personalized recommendations
function addPersonalizedRecommendations(userRating, username) {
    // First, remove any existing recommendation cards to prevent stacking
    removeExistingRecommendationCard();
    
    // Calculate the recommended rating range (+200 from user's rating)
    const baseRating = Math.floor(userRating / 100) * 100;
    const recommendedLowerBound = baseRating + 200;
    const recommendedUpperBound = recommendedLowerBound + 99;
    
    // Format the range for display and for selecting the right rating range
    const recommendedRangeDisplay = `${recommendedLowerBound}-${recommendedUpperBound}`;
    const recommendedRangeValue = `${recommendedLowerBound}_to_${recommendedUpperBound}`;
    
    // Get difficulty label and color for the recommended range
    const recommendedRatingLabel = getRatingLabel(recommendedLowerBound);
    const recommendedRatingColor = getRatingColor(recommendedLowerBound);
    
    // Create recommendation card
    const recommendationCard = document.createElement('div');
    recommendationCard.id = 'recommendationCard';
    recommendationCard.className = 'card mb-4';
    recommendationCard.innerHTML = `
        <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
                <i class="bi bi-stars"></i> Personalized Recommendations for ${username}
            </h5>
            <button type="button" class="btn-close btn-close-white" aria-label="Close" id="closeRecommendationCard"></button>
        </div>
        <div class="card-body">
            <div class="alert alert-info mb-0">
                <i class="bi bi-lightbulb"></i> 
                <strong>Improve your skills:</strong> Based on your current rating of 
                <span class="fw-bold">${Math.round(userRating)}</span>, we've loaded problems 
                in the <span class="recommendation-range fw-bold">${recommendedRangeDisplay}</span> rating range 
                (<span style="color: ${recommendedRatingColor}; font-weight: bold;">${recommendedRatingLabel}</span> level).
            </div>
        </div>
    `;
    
    // Insert after profile card
    const profileCard = document.getElementById('userProfileCard');
    profileCard.insertAdjacentElement('afterend', recommendationCard);
    
    // Add event handler for close button
    document.getElementById('closeRecommendationCard').addEventListener('click', () => {
        removeExistingRecommendationCard();
    });
    
    // Auto-load the recommended problems
    autoLoadRecommendedProblems(recommendedRangeValue);
}

// Helper function to remove existing recommendation card
function removeExistingRecommendationCard() {
    const existingCard = document.getElementById('recommendationCard');
    if (existingCard) {
        existingCard.remove();
    }
}

// Updated function to automatically load recommended problems
function autoLoadRecommendedProblems(ratingRange) {
    console.log(`Auto-loading problems for rating range: ${ratingRange}`);
    
    // Select the rating range in the dropdown
    const ratingSelect = document.getElementById('ratingSelect');
    if (!ratingSelect) {
        console.error('Rating select dropdown not found!');
        return;
    }
    
    // Set the value in the dropdown
    ratingSelect.value = ratingRange;
    
    // Update current rating global variable
    currentRating = ratingRange;
    
    // Always set default sort for recommended problems
    currentSort = { field: 'Problem Number', order: 'desc' };
    updateSortButtons();
    
    // Enable search input if it was disabled
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.value = ''; // Clear any existing search
    }
    
    // Update the header text
    const problemsHeader = document.getElementById('problemsHeader');
    if (problemsHeader) {
        problemsHeader.textContent = `Problems with Rating ${ratingRange.replace('_to_', '-')}`;
    }
    
    // Mark as not user initiated
    window.userInitiatedAction = false;
    
    // Load problems
    loadProblems();
    
    // Scroll to the problems section
    setTimeout(() => {
        const problemsContainer = document.getElementById('problemsContainer');
        if (problemsContainer) {
            problemsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }, 500);
}

async function syncSolvedProblems(username) {
    try {
        // Display syncing status
        const syncStatus = document.createElement('div');
        syncStatus.id = 'syncStatus';
        syncStatus.className = 'sync-status';
        syncStatus.innerHTML = `
            <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            <span class="ms-2">Syncing solved problems from LeetCode...</span>
        `;
        
        const profileCard = document.getElementById('userProfileCard');
        const cardBody = profileCard.querySelector('.card-body');
        cardBody.appendChild(syncStatus);
        
        // Step 1: Get the mapping from problem names to problem numbers
        const mappingResponse = await fetch('/api/problem-mapping');
        if (!mappingResponse.ok) {
            try {
                const errorData = await mappingResponse.json();
                throw new Error(errorData.error || `Failed with status: ${mappingResponse.status}`);
            } catch (jsonError) {
                throw new Error(`Failed to load problem mapping (Status ${mappingResponse.status})`);
            }
        }
        
        const mappingData = await mappingResponse.json();
        if (!mappingData.mapping) {
            throw new Error('Invalid mapping data format returned from server');
        }
        
        const problemMap = mappingData.mapping;
        
        // Step 2: Get the user's solved problems from LeetCode
        const solvedResponse = await fetch(`/api/leetcode/solved/${username}`);
        if (!solvedResponse.ok) {
            throw new Error('Failed to fetch solved problems');
        }
        
        const solvedData = await solvedResponse.json();
        
        if (!solvedData.recentAcSubmissionList) {
            throw new Error('No solved problems data available');
        }
        
        // Step 3: Process the solved problems
        const solvedProblems = {};
        let syncedCount = 0;
        
        solvedData.recentAcSubmissionList.forEach(submission => {
            const problemTitle = submission.title;
            const problemId = problemMap[problemTitle];
            
            if (problemId) {
                solvedProblems[problemId] = true;
                syncedCount++;
            }
        });
        
        // Step 4: Save the solved problems to localStorage
        localStorage.setItem('solvedProblems', JSON.stringify(solvedProblems));
        localStorage.setItem('lastSyncUsername', username);
        localStorage.setItem('lastSyncTime', new Date().toISOString());
        
        // Step 5: Update all problems in the current view
        updateAllProblemStatus();
        
        // Step 6: Show success message
        syncStatus.className = 'sync-status success';
        syncStatus.innerHTML = `
            <i class="bi bi-check-circle-fill text-success"></i>
            <span class="ms-2">Synced ${syncedCount} problems from ${username}'s LeetCode account</span>
        `;
        
        // Auto-remove the message after 5 seconds
        setTimeout(() => {
            if (syncStatus && syncStatus.parentNode) {
                syncStatus.remove();
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error syncing solved problems:', error);
        
        const syncStatus = document.getElementById('syncStatus') || document.createElement('div');
        syncStatus.id = 'syncStatus';
        syncStatus.className = 'sync-status error';
        syncStatus.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill text-danger"></i>
            <span class="ms-2">Error: ${error.message}</span>
        `;
        
        const profileCard = document.getElementById('userProfileCard');
        if (profileCard) {
            const cardBody = profileCard.querySelector('.card-body');
            if (!document.getElementById('syncStatus')) {
                cardBody.appendChild(syncStatus);
            }
        }
    }
}

// Update the status of all problems currently displayed
function updateAllProblemStatus() {
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    const problemRows = document.querySelectorAll('tr[data-problem-id]');
    
    problemRows.forEach(row => {
        const problemId = row.dataset.problemId;
        const isSolved = solvedProblems[problemId] === true;
        
        // Update row class
        row.classList.toggle('solved-problem', isSolved);
        
        // Update button
        const solvedBtn = row.querySelector('.toggle-solved');
        if (solvedBtn) {
            solvedBtn.classList.toggle('btn-outline-secondary', !isSolved);
            solvedBtn.classList.toggle('btn-success', isSolved);
            solvedBtn.textContent = isSolved ? 'Solved' : 'Not Solved';
            
            // Add the "verified" icon for synced problems
            if (isSolved) {
                solvedBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i>Solved`;
            } else {
                solvedBtn.textContent = 'Not Solved';
            }
        }
    });
}