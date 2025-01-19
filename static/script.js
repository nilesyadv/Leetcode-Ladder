let problemsData = null;

document.addEventListener('DOMContentLoaded', async function() {
    const ratingSelect = document.getElementById('ratingSelect');
    const problemTable = document.getElementById('problemTable');
    const problemStats = document.getElementById('problemStats');
    const loading = document.getElementById('loading');

    if (!ratingSelect || !problemTable || !problemStats || !loading) {
        console.error('Required elements not found');
        return;
    }

    try {
        const response = await fetch('problems.json');
        problemsData = await response.json();
        
        // Populate rating select
        Object.keys(problemsData)
            .sort((a, b) => parseInt(a.split('_')[0]) - parseInt(b.split('_')[0]))
            .forEach(rating => {
                const option = document.createElement('option');
                option.value = rating;
                option.textContent = `Rating: ${rating.replace('_to_', ' to ')}`;
                ratingSelect.appendChild(option);
            });
    } catch (error) {
        console.error('Error loading problems:', error);
    }

    ratingSelect.addEventListener('change', function() {
        const rating = this.value;
        if (rating && problemsData) {
            loading.classList.remove('d-none');
            problemTable.innerHTML = '';
            problemStats.innerHTML = '';

            const problems = problemsData[rating];
            problemTable.innerHTML = createTable(problems);
            problemStats.innerHTML = 
                `Found ${problems.length} problems in rating range ${rating.replace('_to_', ' to ')}`;
            
            loading.classList.add('d-none');
        }
    });
});

function createTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '<div class="alert alert-info">No problems found in this rating range.</div>';
    }

    const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');

    let html = `
    <table class="table table-striped table-hover">
        <thead class="table-light">
            <tr>
                <th onclick="sortTable('Date')">Date</th>
                <th onclick="sortTable('Problem Number')">Number</th>
                <th onclick="sortTable('Problem Name')">Name</th>
                <th onclick="sortTable('Problem Rating')">Rating</th>
                <th onclick="sortTable('Contest Name')">Contest</th>
                <th>Tags</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
    `;

    data.forEach(row => {
        const tags = row.Tags ? row.Tags.split(',').map(tag => 
            `<span class="tag-badge">${tag.trim()}</span>`).join(' ') : '';
        
        const problemId = row['Problem Number'];
        const isSolved = solvedProblems[problemId];
        const rowClass = isSolved ? 'solved-problem' : '';
            
        html += `
        <tr class="${rowClass}" data-problem-id="${problemId}">
            <td>${row['Date'] || ''}</td>
            <td>${problemId}</td>
            <td><a href="${row['Problem Link']}" class="problem-link" target="_blank">${row['Problem Name']}</a></td>
            <td class="rating-cell">${row['Problem Rating']}</td>
            <td>${row['Contest Name'] || ''}</td>
            <td>${tags}</td>
            <td>
                <button class="btn btn-sm ${isSolved ? 'btn-success' : 'btn-outline-secondary'} toggle-solved">
                    ${isSolved ? 'Solved' : 'Not Solved'}
                </button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
}

// Add click handler for solve toggle
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-solved')) {
        const row = e.target.closest('tr');
        const problemId = row.dataset.problemId;
        const solvedProblems = JSON.parse(localStorage.getItem('solvedProblems') || '{}');
        
        solvedProblems[problemId] = !solvedProblems[problemId];
        localStorage.setItem('solvedProblems', JSON.stringify(solvedProblems));
        
        row.classList.toggle('solved-problem');
        e.target.classList.toggle('btn-outline-secondary');
        e.target.classList.toggle('btn-success');
        e.target.textContent = solvedProblems[problemId] ? 'Solved' : 'Not Solved';
    }
});