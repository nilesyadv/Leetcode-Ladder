# LeetCode Ladder

A structured approach to mastering LeetCode problems through rating-based ladders.

## Table of Contents

- [Introduction](#introduction)
- [System Architecture](#system-architecture)
- [Data Pipeline](#data-pipeline)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Deployment](#deployment)
- [Future Enhancements](#future-enhancements)

## Introduction

LeetCode Ladder is a web application designed to help programmers practice LeetCode problems in a structured way based on problem difficulty ratings. It provides a systematic approach to improving coding skills by organizing problems into rating ladders, similar to competitive programming platforms.

The application scrapes problem data from contest problems, organizes them by rating, and presents them in a user-friendly interface where users can track their progress.

## System Architecture

The application follows a client-server architecture:

- **Backend**: Flask-based Python server that serves problem data via REST API endpoints
- **Frontend**: HTML/CSS/JavaScript client that consumes the API and provides the user interface
- **Data Storage**: CSV files for problem data, SQLite database (optional) for user authentication
- **Data Pipeline**: Automated scraping and classification of LeetCode problems

## Data Pipeline

### Data Scraping

The data scraping process is implemented in `import_problems.py`:

- **Source**: Problems are scraped from clist.by, which aggregates problems from LeetCode contests
- **Technology**: Uses Selenium and BeautifulSoup for web scraping
- **Incremental Updates**: Uses `last_scrape_info.txt` to track the last scraped problem ID
- **Process**:
  - Opens the webpage and scrolls to load all problems
  - Extracts relevant problem data (problem number, name, rating, contest, tags, etc.)
  - Compares with existing data to avoid duplicates
  - Appends new problems to the dataset

```python
def extract_problem_data(row):
    # Extracts date, rating, problem details, tags
    date = row.find('td', class_='problem-date-column').find('div').text.strip()
    rating = row.find('td', class_='problem-rating-column').find('span').text.strip()
    
    # Extract problem number, name, link
    problem_cell = row.find('td', class_='problem-name-column')
    problem_link = problem_cell.find('a')['href']
    problem_number = extract_number_from_link(problem_link)
    problem_name = clean_text(problem_cell.find('a').text)
    
    # Extract contest name and tags
    contest_name = problem_cell.find('a', class_='contests').text.strip()
    tags = [tag.text.strip() for tag in row.find_all('td')[-1].find_all('a', class_='tag')]
    
    return {
        'Date': date,
        'Problem Number': problem_number,
        'Problem Name': problem_name,
        'Problem Rating': rating,
        'Problem Link': problem_link,
        'Contest Name': contest_name,
        'Tags': ', '.join(tags)
    }
```

### Problem Classification

After scraping, problems are classified by rating ranges in `rating_separator.py`:

- **Rating Ranges**: Problems are grouped in 100-point intervals (e.g., 1300-1399, 1400-1499)
- **Output**: Generates CSV files in the `rating_groups` folder, one per rating range
- **Process**:
  - Reads the master CSV file
  - Groups problems by rating ranges
  - Sorts problems within each range
  - Creates separate CSV files for each rating range

```python
def separate_by_exact_ratings(csv_file='leetcode_contest_problems.csv', output_dir='rating_groups'):
    # Create rating groups in 100-point intervals
    for start in range(min_rating, max_rating, 100):
        end = start + 99
        problems = df[(df['Problem Rating'] >= start) & (df['Problem Rating'] <= end)]
        
        if not problems.empty:
            # Sort and save to CSV
            problems = problems.sort_values(['Problem Number', 'Problem Rating'], ascending=[False, True])
            filename = f'rating_{start}_to_{end}.csv'
            problems.to_csv(os.path.join(output_dir, filename), index=False)
```

### Automated Updates

The data pipeline is automated using GitHub Actions:

- **Schedule**: Runs weekly (every Wednesday at midnight UTC)
- **Workflow File**: `weekly-update.yml`
- **Pipeline Steps**:
  - Checkout repository
  - Set up Python environment
  - Install dependencies
  - Run the full pipeline script (`run_pipeline.py`)
  - Commit and push changes

```yaml
name: Weekly Problem Update
on:
  schedule:
    - cron: '0 0 * * 3'
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run pipeline script
        run: python run_pipeline.py
      - name: Commit and push if changes
        run: |
          git config --global user.name 'GitHub Actions'
          git commit -m "Weekly automatic update ($(date +%Y-%m-%d))"
          git push
```

## Backend Implementation

The backend is implemented in Flask (`routes.py`):

### API Endpoints

- **Main Page**: `/` - Serves the main application HTML
- **Problem Data**: `/problems/<rating_range>` - Returns JSON data for problems in a rating range
- **Global Search**: `/search` - Searches problems across all rating ranges
- **LeetCode User Profile**: `/api/leetcode/user/<username>` - Gets user profile data from LeetCode API

### Problem Serving Logic

- **Rating Range Selection**: Problems are served based on the requested rating range
- **Sorting**: Supports custom sorting by different fields (number, rating, date, etc.)
- **Filtering**: Supports filtering by search term within a rating range
- **Error Handling**: Robust error handling for file operations and API calls

```python
@app.route('/problems/<rating_range>')
def get_problems(rating_range):
    try:
        # Get sort parameters and search term
        sort_by = request.args.get('sort', 'Problem Number')
        order = request.args.get('order', 'desc')
        search = request.args.get('search', '').lower()
        
        # Load the appropriate CSV file
        file_path = os.path.join('rating_groups', f'rating_{rating_range}.csv')
        df = pd.read_csv(file_path)
        
        # Apply search filter if provided
        if search:
            filter_mask = df['Problem Name'].str.lower().str.contains(search) | \
                          df['Problem Number'].astype(str).str.contains(search) | \
                          df['Tags'].str.lower().str.contains(search, na=False)
            df = df[filter_mask]
        
        # Apply sorting
        ascending = order.lower() == 'asc'
        if sort_by in df.columns:
            df = df.sort_values(by=sort_by, ascending=ascending)
        
        # Return JSON response
        return jsonify({
            'problems': df.to_dict('records'),
            'count': len(df),
            'rating_range': rating_range
        })
    except Exception as e:
        # Error handling
        return jsonify({
            'error': str(e),
            'problems': [],
            'count': 0,
            'rating_range': rating_range
        })
```

### LeetCode API Integration

- **User Profiles**: Fetches user profile data from LeetCode GraphQL API
- **Contest Ratings**: Gets contest participation and rating data
- **Error Handling**: Handles API timeouts, connection errors, and rate limiting

```python
@app.route('/api/leetcode/user/<username>')
def leetcode_user_profile(username):
    query = """
    query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                ranking
                reputation
                userAvatar
            }
            submitStats: submitStatsGlobal {
                acSubmissionNum {
                    difficulty
                    count
                }
            }
        }
        userContestRanking(username: $username) {
            rating
            attendedContestsCount
            globalRanking
        }
    }"""
    
    try:
        # Request to LeetCode GraphQL API
        response = requests.post(
            'https://leetcode.com/graphql',
            json={'query': query, 'variables': {'username': username}},
            headers={'Content-Type': 'application/json', 'Referer': 'https://leetcode.com'},
            timeout=10
        )
        
        # Process and return response
        if response.status_code == 200:
            return jsonify(response.json()['data'])
        else:
            return jsonify({'error': f"LeetCode API error: {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

## Frontend Implementation

### UI Components

- **Main Layout**: Responsive design with Bootstrap framework
- **Navigation**: Navigation bar with search, LeetCode link, and theme toggle
- **Problem Selection**: Rating range selector and search box
- **Problem Table**: Interactive table with sorting and filtering
- **User Profile Card**: Displays user profile and contest rating information

### Problem Display

- **Problem Table**: Displays problems in a sortable and filterable table
- **Rating Badges**: Color-coded badges indicating problem difficulty
- **Problem Links**: Direct links to LeetCode problem pages
- **Tags Display**: Optional display of problem tags (can be toggled)

```javascript
function createTable(data) {
    // Create HTML table from problem data
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
    
    // Generate table rows from data
    data.forEach(row => {
        // Generate table row HTML with problem details
    });
    
    return html;
}
```

### User Interactions

- **Rating Selection**: Change the displayed problems by selecting a rating range
- **Search**: Filter problems by name, number, or tags
- **Sorting**: Sort problems by different columns
- **Solved Status**: Mark problems as solved/unsolved
- **Tags Display**: Toggle visibility of problem tags
- **User Profile**: Search for LeetCode users and view their profiles

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Rating select change handler
    ratingSelect.addEventListener('change', function() {
        const rating = this.value;
        if (rating) {
            currentRating = rating;
            searchInput.disabled = false;
            searchInput.value = '';
            loadProblems();
        }
    });
    
    // Search input handler
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadProblems, 300);
    });
    
    // Add other event handlers for user interactions
});
```

### Solved Problem Tracking

- **Manual Tracking**: Toggle solved/unsolved status of individual problems
- **Local Storage**: Save solved status in browser localStorage
- **Visual Indicator**: Highlight solved problems with different styling
- **Progress Counter**: Show count of solved problems in the current set

```javascript
function toggleProblemStatus(problemId, button) {
    // Get current solved problems from localStorage
    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
    
    // Toggle the problem's solved status
    const isSolved = !solvedProblems[problemId];
    
    // Update button appearance and localStorage
    if (isSolved) {
        solvedProblems[problemId] = true;
        button.classList.replace('btn-outline-success', 'btn-success');
        button.textContent = 'Solved';
    } else {
        delete solvedProblems[problemId];
        button.classList.replace('btn-success', 'btn-outline-success');
        button.textContent = 'Unsolved';
    }
    
    // Update row styling and save to localStorage
    const row = button.closest('tr');
    row.classList.toggle('solved-problem', isSolved);
    localStorage.setItem('solvedProblems', JSON.stringify(solvedProblems));
    
    // Update the counter display
    updateSolvedCountDisplay();
}
```

### User Profiles

- **LeetCode Integration**: Fetch user profiles from LeetCode API
- **Profile Display**: Show user details, submission stats, and contest rating
- **Personalized Recommendations**: Suggest appropriate problem ratings based on user's contest rating

```javascript
function displayUserProfile(data) {
    // Create profile card with user data
    const user = data.matchedUser;
    
    // Calculate solve stats and contest rating
    const solveStats = {
        easy: user.submitStats.acSubmissionNum[0].count,
        medium: user.submitStats.acSubmissionNum[1].count,
        hard: user.submitStats.acSubmissionNum[2].count,
        total: user.submitStats.acSubmissionNum.reduce((sum, item) => sum + item.count, 0)
    };
    
    const contestRating = data.userContestRanking ? data.userContestRanking.rating : null;
    
    // Create and display profile card HTML
    // ...
    
    // Add personalized recommendations based on contest rating
    if (contestRating) {
        addPersonalizedRecommendations(contestRating, user.username);
    }
}
```

## Deployment

### Local Development

Setup:
1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Run data pipeline: `python run_pipeline.py`

Run Development Server:
1. Start Flask server: `flask run`
2. Access at http://localhost:5000

### Production Deployment

Server Configuration:
- Use Gunicorn as WSGI server: `gunicorn -c gunicorn_config.py app:app`
- Configure with `gunicorn_config.py` settings

Requirements:
- Production: `requirements.txt` (complete set)
- Minimal deployment: `requirements-render.txt` (minimal set for hosting platforms)

Environment Variables:
- Set `PORT` for the listening port
- Set `FLASK_ENV` to production

## Future Enhancements

- **User Authentication**: Implement user accounts to save progress across devices
- **Recommendation System**: Advanced problem recommendations based on user performance
- **Problem Categories**: Group problems by algorithms and data structures
- **Learning Paths**: Create guided paths for different skill levels
- **Community Features**: Allow users to share solutions and discuss problems