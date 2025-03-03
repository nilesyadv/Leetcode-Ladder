from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import pandas as pd
import os
import requests
import numpy as np
import math
import json

app = Flask(__name__)
CORS(app)

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.nan, float)) and math.isnan(obj):
            return None  # Convert NaN to null in JSON
        return super(CustomJSONEncoder, self).default(obj)

app.json_encoder = CustomJSONEncoder

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
    try:
        # Get sort parameters from request, default to Problem Number desc
        sort_by = request.args.get('sort', 'Problem Number')
        order = request.args.get('order', 'desc')
        search = request.args.get('search', '').lower()
        
        # Load the appropriate CSV file
        file_path = os.path.join('rating_groups', f'rating_{rating_range}.csv')
        df = pd.read_csv(file_path)
        
        # Debug information about the file
        app.logger.info(f"Reading file for rating {rating_range}")
        app.logger.info(f"File columns: {df.columns.tolist()}")
        app.logger.info(f"File has {len(df)} rows")
        app.logger.info(f"NaN values: {df.isna().sum().to_dict()}")
        
        # Fill NaN values properly for all types of columns
        # For string columns, replace with empty string
        str_cols = df.select_dtypes(include=['object']).columns
        df[str_cols] = df[str_cols].fillna('')
        
        # For numeric columns, replace with 0
        num_cols = df.select_dtypes(include=['number']).columns
        df[num_cols] = df[num_cols].fillna(0)
        
        # Convert all columns to appropriate types to ensure consistency
        for col in df.columns:
            if col in ['Problem Number', 'Problem Rating']:
                df[col] = df[col].astype(int)
            elif col in ['Tags', 'Problem Name', 'Date', 'Contest Name', 'Problem Link']:
                df[col] = df[col].astype(str)
        
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
        
        # Convert to dictionary and then validate to ensure no NaN values remain
        problems_dict = df.to_dict('records')
        
        # Additional check to replace any remaining NaNs
        for problem in problems_dict:
            for key, value in problem.items():
                if isinstance(value, float) and math.isnan(value):
                    problem[key] = None if key in num_cols else ""
        
        return jsonify({
            'problems': problems_dict,
            'count': len(problems_dict),
            'rating_range': rating_range
        })
    except Exception as e:
        app.logger.error(f"Error loading problems for rating {rating_range}: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'problems': [],
            'count': 0,
            'rating_range': rating_range
        })

@app.route('/search')
def global_search():
    search_term = request.args.get('q', '').lower()
    if not search_term or len(search_term) < 2:
        return jsonify({
            'problems': [],
            'count': 0,
            'message': 'Enter at least 2 characters to search'
        })
    
    all_problems = []
    rating_dir = 'rating_groups'
    
    try:
        # Search through all rating files
        for file in os.listdir(rating_dir):
            if file.startswith('rating_') and file.endswith('.csv'):
                file_path = os.path.join(rating_dir, file)
                df = pd.read_csv(file_path)
                df = df.fillna('')
                
                # Filter by search term
                filtered_df = df[
                    df['Problem Name'].str.lower().str.contains(search_term) |
                    df['Tags'].str.lower().str.contains(search_term) |
                    df['Problem Number'].astype(str).str.contains(search_term)
                ]
                
                if not filtered_df.empty:
                    # Add rating range info to each problem
                    rating_range = file.replace('rating_', '').replace('.csv', '')
                    filtered_df['Rating Range'] = rating_range.replace('_to_', '-')
                    all_problems.append(filtered_df)
        
        if all_problems:
            # Combine all results
            result_df = pd.concat(all_problems)
            # Sort by problem number (newest first)
            result_df = result_df.sort_values('Problem Number', ascending=False)
            
            return jsonify({
                'problems': result_df.to_dict('records'),
                'count': len(result_df),
                'message': f'Found {len(result_df)} problems matching "{search_term}"'
            })
        else:
            return jsonify({
                'problems': [],
                'count': 0,
                'message': f'No problems found matching "{search_term}"'
            })
            
    except Exception as e:
        return jsonify({
            'problems': [],
            'count': 0,
            'message': f'Error: {str(e)}'
        })

@app.route('/api/leetcode/user/<username>')
def leetcode_user_profile(username):
    app.logger.info(f"Fetching LeetCode profile for username: {username}")
    
    query = """
    query userPublicProfile($username: String!) {
        matchedUser(username: $username) {
            username
            profile {
                ranking
                reputation
                starRating
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
        app.logger.info("Sending request to LeetCode GraphQL API")
        response = requests.post(
            'https://leetcode.com/graphql',
            json={
                'query': query,
                'variables': {'username': username}
            },
            headers={
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            },
            timeout=10  # Increased timeout
        )
        
        app.logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if 'errors' in data:
                app.logger.error(f"LeetCode API returned error: {data['errors'][0]['message']}")
                return jsonify({'error': data['errors'][0]['message']}), 404
                
            app.logger.info(f"Successfully retrieved data for {username}")
            return jsonify(data['data'])
        else:
            app.logger.error(f"LeetCode API returned status {response.status_code}")
            return jsonify({'error': f"LeetCode API returned status {response.status_code}"}), response.status_code
            
    except requests.exceptions.Timeout:
        app.logger.error("Timeout when connecting to LeetCode API")
        return jsonify({'error': "Timeout when connecting to LeetCode API. Please try again later."}), 504
    except requests.exceptions.ConnectionError:
        app.logger.error("Connection error when connecting to LeetCode API")
        return jsonify({'error': "Failed to connect to LeetCode API. Please check your internet connection."}), 503
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# @app.route('/api/leetcode/solved/<username>')
# def leetcode_solved_problems(username):
#     app.logger.info(f"Fetching solved problems for username: {username}")
    
#     query = """
#     query userSolvedProblems($username: String!) {
#         matchedUser(username: $username) {
#             submitStats: submitStatsGlobal {
#                 acSubmissionNum {
#                     difficulty
#                     count
#                 }
#             }
#         }
#         recentAcSubmissionList(username: $username, limit: 2000) {
#             id
#             title
#             titleSlug
#         }
#         allQuestionsCount {
#             difficulty
#             count
#         }
#     }"""
    
#     try:
#         app.logger.info("Sending request to LeetCode GraphQL API")
#         response = requests.post(
#             'https://leetcode.com/graphql',
#             json={
#                 'query': query,
#                 'variables': {'username': username}
#             },
#             headers={
#                 'Content-Type': 'application/json',
#                 'Referer': 'https://leetcode.com',
#                 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
#             },
#             timeout=15
#         )
        
#         app.logger.info(f"Response status: {response.status_code}")
        
#         if response.status_code == 200:
#             data = response.json()
#             if 'errors' in data:
#                 app.logger.error(f"LeetCode API returned error: {data['errors'][0]['message']}")
#                 return jsonify({'error': data['errors'][0]['message']}), 404
                
#             app.logger.info(f"Successfully retrieved solved problems for {username}")
#             return jsonify(data['data'])
#         else:
#             app.logger.error(f"LeetCode API returned status {response.status_code}")
#             return jsonify({'error': f"LeetCode API returned status {response.status_code}"}), response.status_code
            
#     except requests.exceptions.Timeout:
#         app.logger.error("Timeout when connecting to LeetCode API")
#         return jsonify({'error': "Timeout when connecting to LeetCode API. Please try again later."}), 504
#     except requests.exceptions.ConnectionError:
#         app.logger.error("Connection error when connecting to LeetCode API")
#         return jsonify({'error': "Failed to connect to LeetCode API. Please check your internet connection."}), 503
#     except Exception as e:
#         app.logger.error(f"Unexpected error: {str(e)}")
#         return jsonify({'error': str(e)}), 500

# @app.route('/api/problem-mapping')
# def problem_mapping():
#     try:
#         # Read all CSV files and combine them to create a mapping
#         all_problems = []
#         rating_dir = 'rating_groups'
        
#         for file in os.listdir(rating_dir):
#             if file.startswith('rating_') and file.endswith('.csv'):
#                 file_path = os.path.join('rating_groups', file)
#                 df = pd.read_csv(file_path)
#                 all_problems.extend(df[['Problem Number', 'Problem Name']].to_dict('records'))
        
#         # Create mapping of problem name to problem ID
#         problem_map = {}
#         for problem in all_problems:
#             problem_map[problem['Problem Name']] = str(problem['Problem Number'])
        
#         return jsonify({'mapping': problem_map})
    
#     except Exception as e:
#         app.logger.error(f"Error generating problem mapping: {str(e)}")
#         return jsonify({'error': str(e)}), 500

@app.route('/api/problem-distribution')
def problem_distribution():
    try:
        # Get the distribution of problems by rating range
        rating_dir = 'rating_groups'
        distribution = {}
        
        for file in os.listdir(rating_dir):
            if file.startswith('rating_') and file.endswith('.csv'):
                range_str = file.replace('rating_', '').replace('.csv', '')
                file_path = os.path.join(rating_dir, file)
                
                try:
                    df = pd.read_csv(file_path)
                    count = len(df)
                    distribution[range_str] = count
                except Exception as e:
                    app.logger.error(f"Error reading {file}: {str(e)}")
                    distribution[range_str] = 0
        
        return jsonify({
            'distribution': distribution,
            'total': sum(distribution.values())
        })
    except Exception as e:
        app.logger.error(f"Error generating problem distribution: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False)