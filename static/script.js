/* filepath: /Users/nileshkumar/Desktop/Leetcode-Ladder/static/script.js */
// Global variables
let currentRating = '';
let currentSort = { field: 'Problem Number', order: 'desc' }; // Changed default sort
let showTags = localStorage.getItem('showTags') !== 'false';
let searchTimer = null;

// Add this style for solved problems highlighting
const style = document.createElement('style');
style.textContent = `
    .solved-problem {
        background-color: rgba(25, 135, 84, 0.1) !important;
    }
    
    .solved-problem .problem-link {
        text-decoration: line-through;
        color: #198754;
    }
    
    .solved-counter {
        vertical-align: middle;
    }
    
    .toggle-status-btn {
        min-width: 80px;
    }
    
    /* Custom rating badge colors */
    .bg-purple {
        background-color: #6f42c1 !important;
    }
    
    .bg-orange {
        background-color: #fd7e14 !important;
    }
    
    /* Add rating badge style */
    .rating-badge {
        display: inline-block;
        color: #fff;
        border-radius: 0.25rem;
        padding: 0.25em 0.5em;
        font-size: 0.875em;
        font-weight: 700;
        text-align: center;
    }
`;
document.head.appendChild(style);

// Add this function for the rating badge color class
function getRatingColorClass(rating) {
    if (rating < 1200) return 'bg-secondary'; // Newbie
    if (rating < 1400) return 'bg-success';   // Pupil
    if (rating < 1600) return 'bg-info';      // Specialist
    if (rating < 1900) return 'bg-primary';   // Expert
    if (rating < 2100) return 'bg-purple';    // Candidate Master
    if (rating < 2400) return 'bg-warning';   // Master
    if (rating < 2600) return 'bg-orange';    // International Master
    if (rating < 3000) return 'bg-danger';    // Grandmaster
    return 'bg-danger';                       // Legendary Grandmaster
}

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
        const ratingClass = getRatingColorClass(rating);
        
        html += `
            <tr class="${rowClass}" data-problem-id="${problemId}">
                <td>${row.Date || ''}</td>
                <td>${problemId}</td>
                <td>
                    <a href="${row['Problem Link'] || `https://leetcode.com/problems/${row.titleSlug || ''}`}" 
                       target="_blank" class="problem-link">
                        ${row['Problem Name']}
                    </a>
                </td>
                <td><span class="rating-badge ${ratingClass}">${row['Problem Rating'] || 'N/A'}</span></td>
                <td>${row['Contest Name'] || ''}</td>
                <td style="${showTags ? '' : 'display: none;'}">${tags}</td>
                <td>
                    <button class="btn btn-sm ${isSolved ? 'btn-success' : 'btn-outline-success'} toggle-status-btn"
                            onclick="toggleProblemStatus(${problemId}, this)">
                        ${isSolved ? 'Solved' : 'Unsolved'}
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
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
            if (!response.ok) {
                console.error('Error response headers:', response.headers);
                return response.text().then(text => {
                    console.error('Error response body:', text);
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log(`Received ${data.problems ? data.problems.length : 0} problems`);
            const problemStats = document.getElementById('problemStats');
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            problemStats.textContent = `${data.count} problems found`;
            const tableHtml = createTable(data.problems);
            problemTable.innerHTML = tableHtml;
            
            // Add solved counter to the header
            addSolvedCounter(data.problems);
            
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

function addSolvedCounter(problems) {
    const problemsHeader = document.querySelector('.card-header');
    if (!problemsHeader) return;
    
    // Get fresh data from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    const totalProblems = problems.length;
    
    // Count only problems from the CURRENT dataset that are marked as solved
    const solvedInCurrentSet = problems.reduce((count, problem) => {
        if (solvedProblems[problem['Problem Number']] === true) {
            return count + 1;
        }
        return count;
    }, 0);
    
    // Remove existing counter if any
    const existingCounter = problemsHeader.querySelector('.solved-counter');
    if (existingCounter) existingCounter.remove();
    
    // Create the counter element
    const counterElement = document.createElement('div');
    counterElement.className = 'solved-counter ms-2 d-inline-block';
    counterElement.innerHTML = `
        <span class="badge bg-success">
            ${solvedInCurrentSet} / ${totalProblems} solved
        </span>
    `;
    
    // Add it to the header
    const headerTitle = problemsHeader.querySelector('h5');
    if (headerTitle) {
        headerTitle.appendChild(counterElement);
    } else {
        problemsHeader.appendChild(counterElement);
    }
    
    console.log(`Updated counter: ${solvedInCurrentSet} / ${totalProblems}`);
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


// Other global functions

// Move the updateSortButtons function definition outside of any other function
// Place it at the top of your script with other global functions
function updateSortButtons() {
    const ratingBtn = document.getElementById('sortRatingBtn');
    const numberBtn = document.getElementById('sortNumberBtn');
    
    if (!ratingBtn || !numberBtn) return; // Guard clause in case elements don't exist yet
    
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

document.addEventListener('DOMContentLoaded', function() {
    const ratingSelect = document.getElementById('ratingSelect');
    const searchInput = document.getElementById('searchInput');
    const problemTable = document.getElementById('problemTable');
    const problemStats = document.getElementById('problemStats');
    const problemsHeader = document.getElementById('problemsHeader');
    const loading = document.getElementById('loading');

    
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
                `Problems With Rating ${rating.replace('_to_', '-')}`;
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
        
        // Call the global function - no need to define it locally
        updateSortButtons();
        loadProblems();
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

        // Add the clear solved button
        const controlsArea = document.querySelector('.card-header .float-end');
        if (controlsArea) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn btn-sm btn-outline-danger ms-2';
            clearBtn.innerHTML = '<i class="bi bi-trash"></i> Reset Progress';
            clearBtn.onclick = confirmClearSolved;
            
            controlsArea.appendChild(clearBtn);
        }
    }

    function confirmClearSolved() {
        if (confirm('Are you sure you want to reset all your solved problem progress? This cannot be undone.')) {
            // Clear localStorage
            localStorage.setItem('solvedProblems', '{}');
            
            // Update UI - remove solved class from all rows
            document.querySelectorAll('.solved-problem').forEach(row => {
                row.classList.remove('solved-problem');
                
                // Reset the button
                const button = row.querySelector('.toggle-status-btn');
                if (button) {
                    button.classList.replace('btn-success', 'btn-outline-success');
                    button.textContent = 'Unsolved';
                }
            });
            
            // Update the counter
            updateSolvedCountDisplay();
            
            // Show confirmation
            alert('Progress has been reset.');
        }
    }

    // Call this right after the DOMContentLoaded fires
    addControls();

    // Call this after the dropdown is populated
    updateRatingSelectColors();

    // // Call this to add the rating distribution bar
    // addRatingDistributionBar();

    // Call this function in your DOMContentLoaded event
    addLeetCodeUserSearch();

    // Add this line at the end
    centerNavbarSearchBar();
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
    navbarRight.appendChild(userSearchLi);
    
    // Set up event handler
    document.getElementById('leetcodeUserForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('leetcodeUsername').value.trim();
        if (username) {
            fetchLeetCodeUserProfile(username);
        }
    });
}

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
    
    // Calculate the total
    solveStats.total = solveStats.easy + solveStats.medium + solveStats.hard;
    
    // Get contest rating
    const contestRating = data.userContestRanking ? data.userContestRanking.rating : null;
    const contestRatingFormatted = contestRating ? Math.round(contestRating) : 'N/A';
    const contestRatingColor = contestRating ? getRatingColor(contestRating) : '#666';
    const contestRatingLabel = contestRating ? getRatingLabel(contestRating) : 'Unrated';
    
    // User avatar
    const avatarUrl = user.profile.userAvatar || 'https://assets.leetcode.com/users/default_avatar.jpg';
    
    // Create a more compact and cleaner profile card HTML - REMOVED CLOSE BUTTON
    profileCard.innerHTML = `
        <div class="card-header d-flex align-items-center py-2">
            <div class="d-flex align-items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="me-2">
                    <path d="M16.102 17.93l-2.697 2.607c-.466.467-1.111.662-1.823.662s-1.357-.195-1.824-.662l-4.332-4.363c-.467-.467-.702-1.15-.702-1.863s.235-1.357.702-1.824l4.319-4.38c.467-.467 1.125-.661 1.837-.661s1.357.195 1.824.661l2.697 2.606c.514.515 1.365.497 1.9-.038.535-.536.553-1.387.039-1.901l-2.609-2.636a5.055 5.055 0 0 0-3.831-1.427c-1.459 0-2.781.538-3.786 1.543l-4.329 4.398C2.087 11.793 1.5 13.164 1.5 14.634c0 1.47.545 2.842 1.59 3.888l4.344 4.376c1.005 1.005 2.327 1.543 3.786 1.543 1.459 0 2.781-.538 3.786-1.543l2.697-2.606c.515-.515.498-1.366-.037-1.901-.534-.535-1.387-.552-1.902-.038z"/>
                    <path d="M20.811 13.01H10.189a1.25 1.25 0 1 1 0-2.5h10.622a1.25 1.25 0 1 1 0 2.5z"/>
                </svg>
                <span class="mb-0 fw-bold">LeetCode Profile: ${user.username}</span>
            </div>
        </div>
        <div class="card-body py-3">
            <div class="d-flex align-items-center mb-3">
                <img src="${avatarUrl}" alt="${user.username}" 
                     class="rounded-circle me-3" style="width: 50px; height: 50px;">
                <div class="d-flex flex-column align-items-center">
                    <div class="rating-label small text-muted mb-1">Contest Rating</div>
                    <div class="rating-pill" style="background-color: ${contestRatingColor};">
                        ${contestRatingFormatted !== 'N/A' ? contestRatingFormatted : '-'}
                    </div>
                    <div class="text-muted small mt-1">
                        ${data.userContestRanking ? 
                            `Global Rank: #${data.userContestRanking.globalRanking || 'N/A'}` : 
                            'No contest participation'}
                    </div>
                </div>
                <div class="ms-auto text-end">
                    <div class="d-flex align-items-center justify-content-end">
                        <span class="me-2">Problems Solved:</span>
                        <span class="fw-bold">${solveStats.total}</span>
                    </div>
                    <div class="d-flex gap-2 mt-1">
                        <span class="badge bg-success-subtle text-success">E: ${solveStats.easy}</span>
                        <span class="badge bg-warning-subtle text-warning">M: ${solveStats.medium}</span>
                        <span class="badge bg-danger-subtle text-danger">H: ${solveStats.hard}</span>
                    </div>
                </div>
            </div>
            <div class="text-center">
                <a href="https://leetcode.com/${user.username}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-box-arrow-up-right"></i> View Profile
                </a>
            </div>
        </div>
    `;
    
    // Add custom CSS for the rating pill
    if (!document.getElementById('ratingPillStyle')) {
        const style = document.createElement('style');
        style.id = 'ratingPillStyle';
        style.textContent = `
            .rating-pill {
                display: inline-block;
                padding: 0.25rem 0.6rem;
                border-radius: 1rem;
                color: white;
                font-weight: bold;
                font-size: 0.9rem;
                min-width: 45px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove the close button event handler - no longer needed
    
    // Add personalized recommendations if rating is available
    if (contestRating) {
        addPersonalizedRecommendations(contestRating, user.username);
    }
}

// Updated function for personalized recommendations
function addPersonalizedRecommendations(userRating, username) {
    // Calculate the recommended rating range (+200 from user's rating)
    const baseRating = Math.floor(userRating / 100) * 100;
    const recommendedLowerBound = baseRating + 200;
    const recommendedUpperBound = recommendedLowerBound + 99;
    
    // Format the range for display and for selecting the right rating range
    const recommendedRangeValue = `${recommendedLowerBound}_to_${recommendedUpperBound}`;

    // Auto-load the recommended problems (without creating a separate card)
    autoLoadRecommendedProblems(recommendedRangeValue, username, userRating);
}

// Updated function to automatically load recommended problems with personalized header
async function autoLoadRecommendedProblems(ratingRange, username = null, userRating = null) {
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
    
    // Update the header text with recommendation context if username is provided
    const problemsHeader = document.getElementById('problemsHeader');
    if (problemsHeader) {
        if (username && userRating) {
            const displayRange = ratingRange.replace('_to_', '-');
            problemsHeader.innerHTML = `
            Problems With Rating ${displayRange} 
            <small class="text-muted ms-2">
                • Recommended Ladder For You
            </small>
        `;
            
        } else {
            problemsHeader.textContent = `Problems With Rating ${ratingRange.replace('_to_', '-')}`;
        }
    }
    
    // Mark as not user initiated
    window.userInitiatedAction = false;
    
    // Add a small delay before loading problems to avoid connection issues
    await new Promise(resolve => setTimeout(resolve, 100));
    
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

// Replace the syncSolvedProblems function with this simplified version
function syncSolvedProblems(username) {
    // Instead of fetching data, just show a message about manual tracking
    const syncStatusContainer = document.getElementById('syncStatusContainer');
    if (syncStatusContainer) {
        syncStatusContainer.innerHTML = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <strong>Manual Tracking Enabled</strong>
                <p>Problems are tracked manually. Mark solved problems using the "Solved" button on each problem.</p>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

// 3. Remove the updateAllProblemStatus function since it was related to syncing
// Or simplify it if you want to keep it for other purposes
function updateAllProblemStatus() {
    // This can be left empty or removed entirely
}

// Add a function to create a rating distribution bar
function addRatingDistributionBar() {
    // Create a container for the distribution bar
    const mainContainer = document.querySelector('.main-container');
    const firstRow = mainContainer.querySelector('.row');
    
    const distributionRow = document.createElement('div');
    distributionRow.className = 'row mb-4';
    distributionRow.innerHTML = `
        <div class="col-12">
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi bi-bar-chart-line"></i> Problem Rating Distribution
                    </h5>
                    <button class="btn btn-sm btn-outline-secondary" id="collapseDistributionBtn">
                        <i class="bi bi-chevron-up"></i>
                    </button>
                </div>
                <div class="card-body" id="distributionContent">
                    <div class="distribution-loading text-center py-3">
                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                        <span class="ms-2">Loading distribution data...</span>
                    </div>
                    <div class="distribution-container" style="height: 60px;"></div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after the first row
    firstRow.insertAdjacentElement('afterend', distributionRow);
    
    // Add toggle functionality
    const collapseBtn = document.getElementById('collapseDistributionBtn');
    const distributionContent = document.getElementById('distributionContent');
    
    // Check localStorage for preferred state
    const isCollapsed = localStorage.getItem('distributionCollapsed') === 'true';
    
    if (isCollapsed) {
        distributionContent.style.display = 'none';
        collapseBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
    }
    
    collapseBtn.addEventListener('click', function() {
        const isCurrentlyCollapsed = distributionContent.style.display === 'none';
        
        if (isCurrentlyCollapsed) {
            distributionContent.style.display = '';
            collapseBtn.innerHTML = '<i class="bi bi-chevron-up"></i>';
            localStorage.setItem('distributionCollapsed', 'false');
        } else {
            distributionContent.style.display = 'none';
            collapseBtn.innerHTML = '<i class="bi bi-chevron-down"></i>';
            localStorage.setItem('distributionCollapsed', 'true');
        }
    });
    
    // Fetch the distribution data
    fetch('/api/problem-distribution')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            document.querySelector('.distribution-loading').remove();
            
            // Create the distribution bar
            createDistributionBar(data.distribution);
        })
        .catch(error => {
            console.error('Error loading distribution:', error);
            document.querySelector('.distribution-loading').innerHTML = `
                <div class="alert alert-danger mb-0">
                    <i class="bi bi-exclamation-triangle-fill"></i> Error loading distribution: ${error.message}
                </div>
            `;
        });
}

// Helper function to create the distribution bar visualization
function createDistributionBar(distribution) {
    const container = document.querySelector('.distribution-container');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Find the max count for scaling
    const maxCount = Math.max(...Object.values(distribution));
    
    // Sort rating ranges
    const sortedRanges = Object.keys(distribution).sort((a, b) => {
        const aStart = parseInt(a.split('_to_')[0]);
        const bStart = parseInt(b.split('_to_')[0]);
        return aStart - bStart;
    });
    
    // Create a bar for each rating range
    sortedRanges.forEach(range => {
        const count = distribution[range];
        const height = (count / maxCount) * 100;
        
        const startRating = parseInt(range.split('_to_')[0]);
        const color = getRatingColor(startRating);
        const label = getRatingLabel(startRating);
        
        const bar = document.createElement('div');
        bar.className = 'distribution-bar';
        bar.style.height = `${height}%`;
        bar.style.backgroundColor = color;
        bar.title = `${range.replace('_to_', '-')}: ${count} problems`;
        
        // Create a tooltip with Bootstrap
        const tooltip = new bootstrap.Tooltip(bar, {
            title: `${range.replace('_to_', '-')}: ${count} problems (${label})`,
            placement: 'top'
        });
        
        // Make the bar clickable to select that rating range
        bar.addEventListener('click', () => {
            const ratingSelect = document.getElementById('ratingSelect');
            if (ratingSelect) {
                ratingSelect.value = range;
                ratingSelect.dispatchEvent(new Event('change'));
            }
        });
        
        container.appendChild(bar);
    });
    
    // Add CSS for the distribution bar
    const style = document.createElement('style');
    style.textContent = `
        .distribution-container {
            display: flex;
            align-items: flex-end;
            height: 60px;
            gap: 2px;
        }
        .distribution-bar {
            flex: 1;
            min-width: 10px;
            cursor: pointer;
            transition: all 0.2s;
            border-top-left-radius: 3px;
            border-top-right-radius: 3px;
        }
        .distribution-bar:hover {
            opacity: 0.8;
            transform: scaleY(1.05);
        }
    `;
    document.head.appendChild(style);
}

// Add this function to center the search bar in the navbar
function centerNavbarSearchBar() {
    // Get the navbar elements
    const navbar = document.querySelector('.navbar-collapse');
    const searchForm = document.querySelector('.global-search-form');
    
    if (!navbar || !searchForm) return;
    
    // Apply specific centering styles
    const style = document.createElement('style');
    style.textContent = `
        .navbar-collapse {
            display: flex !important;
            justify-content: space-between !important;
        }
        
        .global-search-form {
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
        }
        
        @media (max-width: 991px) {
            .global-search-form {
                position: static !important;
                transform: none !important;
                margin: 0.5rem 0 !important;
            }
        }
    `;
    document.head.appendChild(style);
}

function toggleProblemStatus(problemId, button) {
    console.log(`Toggling problem ${problemId}`);
    
    // Get current solved problems
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    // Toggle the problem's solved status
    const isSolved = !solvedProblems[problemId];
    
    if (isSolved) {
        solvedProblems[problemId] = true;
        button.classList.replace('btn-outline-success', 'btn-success');
        button.textContent = 'Solved';
        console.log(`Problem ${problemId} marked as solved`);
    } else {
        delete solvedProblems[problemId];
        button.classList.replace('btn-success', 'btn-outline-success');
        button.textContent = 'Unsolved';
        console.log(`Problem ${problemId} marked as unsolved`);
    }
    
    // Update the row's appearance
    const row = button.closest('tr');
    if (row) {
        row.classList.toggle('solved-problem', isSolved);
    }
    
    // Save to localStorage
    localStorage.setItem('solvedProblems', JSON.stringify(solvedProblems));
    console.log('Updated localStorage');
    
    // Count total solved problems (for debugging)
    const totalSolved = Object.keys(solvedProblems).filter(key => solvedProblems[key]).length;
    console.log(`Total solved problems: ${totalSolved}`);
    
    // Update solved count if displayed
    updateSolvedCountDisplay();
}

function updateSolvedCountDisplay() {
    const solvedCountSpan = document.querySelector('.solved-counter .badge');
    if (!solvedCountSpan) return;
    
    // Get fresh data from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    // Get the total from the display
    const displayText = solvedCountSpan.textContent;
    const totalMatch = displayText.match(/\/\s*(\d+)/);
    if (!totalMatch) return;
    
    const total = totalMatch[1];
    
    // Count solved problems but only for the visible table
    const visibleProblemIds = [];
    document.querySelectorAll('tr[data-problem-id]').forEach(row => {
        visibleProblemIds.push(row.dataset.problemId);
    });
    
    // Count only problems that are both in the current view and marked as solved
    const solvedCount = visibleProblemIds.filter(id => solvedProblems[id] === true).length;
    
    // Update the display
    solvedCountSpan.textContent = `${solvedCount} / ${total} solved`;
    console.log(`Counter updated to: ${solvedCount} / ${total}`);
}