import os
import pandas as pd
import json

def generate_static_files():
    # Create static directory
    static_dir = 'docs'  # GitHub Pages uses 'docs' or 'root'
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    
    # Copy static assets
    os.system('cp -r static/* docs/')
    
    # Generate problems JSON
    problems_data = {}
    rating_dir = 'rating_groups'
    
    for file in os.listdir(rating_dir):
        if file.startswith('rating_') and file.endswith('.csv'):
            rating_range = file.replace('rating_', '').replace('.csv', '')
            df = pd.read_csv(os.path.join(rating_dir, file))
            problems_data[rating_range] = df.fillna('').to_dict('records')
    
    # Save as JSON
    with open('docs/problems.json', 'w') as f:
        json.dump(problems_data, f)

    # Create index.html
    html_content = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>LeetCode Contest Problems</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="style.css" rel="stylesheet">
    </head>
    <body>
        <div class="container">
            <h1 class="my-4">LeetCode Contest Problems</h1>
            <div class="row">
                <div class="col-md-4">
                    <select id="ratingSelect" class="form-select">
                        <option value="">Select Rating Range</option>
                    </select>
                </div>
            </div>
            <div id="loading" class="d-none">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            <div id="problemStats"></div>
            <div id="problemTable"></div>
        </div>
        <script src="script.js"></script>
    </body>
    </html>
    '''
    
    with open('docs/index.html', 'w') as f:
        f.write(html_content)

if __name__ == '__main__':
    generate_static_files()