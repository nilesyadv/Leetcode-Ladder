import pandas as pd
import os

def separate_by_exact_ratings(csv_file='leetcode_contest_problems.csv', output_dir='rating_groups'):
    # Create output directory
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Read CSV
    df = pd.read_csv(csv_file)
    total_problems = len(df)
    
    # Convert ratings to numeric
    df['Problem Rating'] = pd.to_numeric(df['Problem Rating'], errors='coerce')
    
    # Find min and max ratings
    min_rating = int(df['Problem Rating'].min() // 100 * 100)
    max_rating = int((df['Problem Rating'].max() // 100 + 1) * 100)
    
    problems_distributed = 0

    # Create groups in 100-point intervals
    for start in range(min_rating, max_rating, 100):
        end = start + 99
        
        # Filter problems in current range
        problems = df[(df['Problem Rating'] >= start) & 
                     (df['Problem Rating'] <= end)]
        
        if not problems.empty:
            # Sort by rating
            problems = problems.sort_values(['Problem Number', 'Problem Rating'], 
                                      ascending=[False, True])
            
            # Create filename with rating range
            filename = f'rating_{start}_to_{end}.csv'
            output_file = os.path.join(output_dir, filename)
            
            # Save to CSV
            problems.to_csv(output_file, index=False)
            problems_distributed += len(problems)
            print(f"Rating {start}-{end}: {len(problems)} problems saved to {filename}")
    
    # Handle unrated problems separately
    unrated = df[df['Problem Rating'].isna()]
    if not unrated.empty:
        unrated = unrated.sort_values('Problem Number', ascending=False)
        unrated.to_csv(os.path.join(output_dir, 'unrated_problems.csv'), index=False)
        problems_distributed += len(unrated)
        print(f"Unrated problems: {len(unrated)} saved to unrated_problems.csv")

    print("\nSummary:")
    print(f"Total problems in original file: {total_problems}")
    print(f"Total problems distributed: {problems_distributed}")
    if total_problems != problems_distributed:
        print(f"Discrepancy: {total_problems - problems_distributed} problems")
        # Additional analysis if there's a discrepancy
        ratings_distribution = df['Problem Rating'].value_counts().sort_index()
        print("\nRatings distribution:")
        print(ratings_distribution)

if __name__ == "__main__":
    separate_by_exact_ratings()