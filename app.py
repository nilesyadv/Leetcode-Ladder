from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.floating)):
            return int(obj) if isinstance(obj, np.integer) else float(obj)
        elif pd.isna(obj):
            return ''
        return super().default(obj)

app = Flask(__name__)
app.json_encoder = CustomJSONEncoder
CORS(app)

def get_available_ratings():
    ratings = []
    rating_dir = 'rating_groups'
    for file in os.listdir(rating_dir):
        if file.startswith('rating_') and file.endswith('.csv'):
            range_str = file.replace('rating_', '').replace('.csv', '')
            ratings.append(range_str)
    
    # Sort ratings based on the starting number in the range
    return sorted(ratings, key=lambda x: int(x.split('_to_')[0]))

@app.route('/')
def index():
    ratings = get_available_ratings()
    return render_template('index.html', ratings=ratings)

@app.route('/problems/<rating_range>')
def get_problems(rating_range):
    file_path = f'rating_groups/rating_{rating_range}.csv'
    if os.path.exists(file_path):
        try:
            df = pd.read_csv(file_path)
            # Handle NaN values
            df = df.fillna('')
            
            sort_by = request.args.get('sort')
            search = request.args.get('search', '').lower()
            
            if search:
                df = df[
                    df['Problem Name'].str.lower().str.contains(search) |
                    df['Tags'].str.lower().str.contains(search) |
                    df['Problem Number'].astype(str).str.contains(search)
                ]
            
            if sort_by:
                ascending = request.args.get('order', 'asc') == 'asc'
                df = df.sort_values(sort_by, ascending=ascending)
            
            # Convert to list of dicts for JSON serialization
            problems = df.to_dict('records')
            
            return jsonify({
                'problems': problems,
                'count': len(problems),
                'rating_range': rating_range
            })
        except Exception as e:
            return jsonify({
                'problems': [],
                'count': 0,
                'rating_range': rating_range,
                'error': str(e)
            }), 500
    return jsonify({
        'problems': [],
        'count': 0,
        'rating_range': rating_range
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)