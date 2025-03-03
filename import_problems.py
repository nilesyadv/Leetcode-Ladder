from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import pandas as pd
from bs4 import BeautifulSoup
import time
import logging
import csv
import io
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_FILE = "leetcode_contest_problems.csv"
LAST_RUN_INFO_FILE = "last_scrape_info.txt"

def setup_driver():
    try:
        options = webdriver.ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1920,1080')
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        logger.error(f"Failed to setup Chrome driver: {e}")
        raise

def get_last_problem_number():
    """Get the last problem number from the previous scrape"""
    if not os.path.exists(LAST_RUN_INFO_FILE):
        return None

    with open(LAST_RUN_INFO_FILE, 'r') as f:
        last_number = f.read().strip()
        return int(last_number) if last_number and last_number.isdigit() else None

def update_last_problem_number(highest_problem_number):
    """
    Save the highest problem number to the last_scrape_info file
    after verifying it exists in the CSV
    """
    try:
        # First check if the CSV file exists
        if not os.path.exists(OUTPUT_FILE):
            logger.warning(f"CSV file {OUTPUT_FILE} does not exist. Not updating last_scrape_info.txt.")
            return False

        # Load the CSV to verify the problem number exists
        try:
            df = pd.read_csv(OUTPUT_FILE)

            # Convert Problem Number column to numeric for proper comparison
            if 'Problem Number' in df.columns:
                df['Problem Number'] = pd.to_numeric(df['Problem Number'], errors='coerce')

                # Check if the highest problem number exists in the CSV
                if highest_problem_number in df['Problem Number'].values:
                    # Write the highest problem number to the file
                    with open(LAST_RUN_INFO_FILE, 'w') as f:
                        f.write(str(highest_problem_number))
                    logger.info(f"Updated last_scrape_info.txt with problem number {highest_problem_number}")
                    return True
                else:
                    logger.warning(f"Problem number {highest_problem_number} not found in CSV. Not updating last_scrape_info.txt.")
                    return False
            else:
                logger.warning("'Problem Number' column not found in CSV. Not updating last_scrape_info.txt.")
                return False

        except Exception as e:
            logger.error(f"Error reading CSV to verify problem number: {e}")
            return False

    except Exception as e:
        logger.error(f"Error updating last problem number: {e}")
        return False

def load_existing_data():
    """Load existing data from CSV file if it exists"""
    if os.path.exists(OUTPUT_FILE):
        try:
            return pd.read_csv(OUTPUT_FILE)
        except Exception as e:
            logger.error(f"Error loading existing data: {e}")
    return pd.DataFrame()

def scroll_page(driver, last_problem_number=None):
    """Scroll the page, but stop if we reach problems with numbers less than last_problem_number"""
    try:
        last_height = driver.execute_script("return document.body.scrollHeight")
        found_old_data = False
        scroll_count = 0
        max_scrolls = 100  # Safety limit
        consecutive_old_problems = 0
        required_old_problems = 3  # Number of consecutive old problems to confirm we've reached old data

        while not found_old_data and scroll_count < max_scrolls:
            # Scroll down
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3)
            scroll_count += 1

            # Check if we've reached data we already have
            if last_problem_number:
                soup = BeautifulSoup(driver.page_source, "html.parser")
                problem_rows = soup.find_all('tr', class_='show-hidden-activity-on-hover')

                # Check the last few visible rows
                for row in problem_rows[-10:] if len(problem_rows) > 10 else problem_rows:
                    problem_cell = row.find('td', class_='problem-name-column')
                    if problem_cell:
                        problem_links = problem_cell.find_all('a')
                        for link in problem_links:
                            if 'leetcode.com/problems/' in link.get('href', ''):
                                full_text = ' '.join(link.text.strip().split())
                                try:
                                    number_part = full_text.split()[0]
                                    if number_part.isdigit() and int(number_part) <= last_problem_number:
                                        consecutive_old_problems += 1
                                        logger.info(f"Found problem #{number_part} which is <= last problem #{last_problem_number}, count: {consecutive_old_problems}/{required_old_problems}")

                                        if consecutive_old_problems >= required_old_problems:
                                            logger.info(f"Found {consecutive_old_problems} consecutive old problems. Stopping scroll.")
                                            found_old_data = True
                                            break
                                    else:
                                        consecutive_old_problems = 0  # Reset counter if we find a newer problem
                                except:
                                    pass

                        if found_old_data:
                            break

            # Calculate new scroll height and compare with last scroll height
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                # Try one more time to make sure it's really the end
                time.sleep(3)
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    logger.info("Reached end of page, no more content to load.")
                    break
            last_height = new_height
            logger.info(f"Scrolled to height: {new_height}")

        # Final scroll to ensure everything is loaded
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    except Exception as e:
        logger.error(f"Error while scrolling: {e}")

def clean_text(text):
    """Clean text by removing extra whitespace and newlines"""
    if text is None:
        return None
    return ' '.join(text.strip().split())

def extract_problem_data(row):
    try:
        # Extract date
        date_div = row.find('td', class_='problem-date-column').find('div')
        date = date_div.text.strip() if date_div else None

        # Extract rating
        rating_span = row.find('td', class_='problem-rating-column').find('span', class_='coder-color')
        rating = rating_span.text.strip() if rating_span else None

        # Extract problem details
        problem_cell = row.find('td', class_='problem-name-column')
        if problem_cell:
            # Find the LeetCode problem link specifically
            problem_links = problem_cell.find_all('a')
            problem_link = None
            problem_number = None
            problem_name = None

            for link in problem_links:
                href = link.get('href', '')
                if 'leetcode.com/problems/' in href:
                    problem_link = href
                    full_text = clean_text(link.text)
                    # Split the text into number and name
                    try:
                        number_part = full_text.split()[0]
                        if number_part.isdigit():
                            problem_number = number_part
                            problem_name = ' '.join(full_text.split()[1:])
                        else:
                            problem_name = full_text
                    except:
                        problem_name = full_text
                    break

            # Extract contest name
            contest_link = problem_cell.find('a', class_='contests')
            contest_name = clean_text(contest_link.text) if contest_link else None
        else:
            problem_link = problem_number = problem_name = contest_name = None

        # Extract tags
        tags_td = row.find_all('td')[-1]  # Last td contains tags
        tags = []
        for tag_link in tags_td.find_all('a'):
            if tag_link.get('class', [''])[0] != 'contests':
                tags.append(clean_text(tag_link.text))
        tags = ', '.join(tags) if tags else None

        return {
            'Date': date,
            'Problem Number': problem_number,
            'Problem Name': problem_name,
            'Problem Rating': rating,
            'Problem Link': problem_link,
            'Contest Name': contest_name,
            'Tags': tags
        }
    except Exception as e:
        logger.error(f"Error extracting data from row: {str(e)}")
        return None

def main():
    driver = None
    try:
        # Load existing data
        existing_df = load_existing_data()

        # Get the highest problem number from the previous scrape
        last_problem_number = get_last_problem_number()

        # If no last problem number is stored but we have existing data, get it from there
        if last_problem_number is None and not existing_df.empty and 'Problem Number' in existing_df.columns:
            try:
                # Convert to numeric first to handle any non-numeric values
                existing_df['Problem Number'] = pd.to_numeric(existing_df['Problem Number'], errors='coerce')
                last_problem_number = int(existing_df['Problem Number'].max())
                logger.info(f"Using highest problem number from existing data: {last_problem_number}")
            except Exception as e:
                logger.warning(f"Could not determine highest problem number from existing data: {e}")

        if last_problem_number:
            logger.info(f"Last scraped problem number: {last_problem_number}")
        else:
            logger.info("No previous scrape information found. Will scrape all available data.")

        driver = setup_driver()
        url = "https://clist.by/problems/?search=resource%3ALeetcode"

        logger.info("Opening webpage...")
        driver.get(url)

        # Wait for table to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "table-float-head"))
        )

        logger.info("Scrolling through page...")
        scroll_page(driver, last_problem_number)

        logger.info("Extracting data...")
        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Find all problem rows
        rows = soup.find_all('tr', class_='show-hidden-activity-on-hover')
        logger.info(f"Found {len(rows)} problems on the page")

        rows_data = []
        highest_problem_number = last_problem_number if last_problem_number else 0
        skipped_count = 0

        for row in rows:
            row_data = extract_problem_data(row)
            if row_data and row_data['Problem Number']:
                try:
                    problem_number = int(row_data['Problem Number'])

                    # Update highest problem number if needed
                    if problem_number > highest_problem_number:
                        highest_problem_number = problem_number

                    # Skip if we already have this problem
                    if last_problem_number and problem_number <= last_problem_number:
                        skipped_count += 1
                        continue

                    rows_data.append(row_data)
                except (ValueError, TypeError):
                    # If problem number can't be converted to int, still include it
                    rows_data.append(row_data)
            elif row_data:
                # Include rows without problem numbers too
                rows_data.append(row_data)

        logger.info(f"Skipped {skipped_count} problems that were already scraped")

        if not rows_data:
            logger.info("No new problems found since last scrape.")
            return

        # Create DataFrame with new data
        new_df = pd.DataFrame(rows_data)

        # Clean the DataFrame
        for column in new_df.columns:
            if new_df[column].dtype == 'object':
                new_df[column] = new_df[column].apply(clean_text)

        # Log initial number of rows
        initial_rows = len(new_df)
        logger.info(f"Initial number of new rows: {initial_rows}")

        # Remove rows with missing problem names or numbers
        new_df = new_df.dropna(subset=['Problem Name', 'Problem Number'])

        # Log number of rows removed
        removed_rows = initial_rows - len(new_df)
        if removed_rows > 0:
            logger.warning(f"Removed {removed_rows} rows with missing problem names or numbers")

        # Additional validation: ensure problem numbers are numeric
        new_df = new_df[new_df['Problem Number'].apply(lambda x: str(x).isdigit())]

        # Convert Problem Number to numeric for sorting
        new_df['Problem Number'] = pd.to_numeric(new_df['Problem Number'])

        # Reorder columns
        columns_order = ['Date', 'Problem Number', 'Problem Name', 'Problem Rating',
                        'Problem Link', 'Contest Name', 'Tags']
        new_df = new_df[columns_order]

        # Combine with existing data
        if not existing_df.empty:
            # Ensure Problem Number is numeric in existing data too
            if 'Problem Number' in existing_df.columns:
                existing_df['Problem Number'] = pd.to_numeric(existing_df['Problem Number'], errors='coerce')

            # Remove duplicates based on Problem Number
            combined_df = pd.concat([new_df, existing_df])
            combined_df = combined_df.drop_duplicates(subset=['Problem Number'], keep='first')

            # Sort by Problem Number in descending order (latest first)
            combined_df = combined_df.sort_values('Problem Number', ascending=False)
        else:
            # Sort new data by Problem Number in descending order
            combined_df = new_df.sort_values('Problem Number', ascending=False)

        # Log the highest problem number we've found
        logger.info(f"Highest problem number found during this scrape: {highest_problem_number}")

        try:
            # Write to CSV with proper encoding and quoting
            combined_df.to_csv(OUTPUT_FILE,
                     index=False,
                     encoding='utf-8',
                     quoting=csv.QUOTE_MINIMAL,
                     escapechar='\\',
                     na_rep='')
            logger.info(f"Data saved successfully to {OUTPUT_FILE}")

            # Only after successful CSV save, update the last problem number file
            if highest_problem_number > 0:
                success = update_last_problem_number(highest_problem_number)
                if success:
                    logger.info(f"Last problem number updated to {highest_problem_number}")
                else:
                    logger.warning("Failed to update last problem number")

        except Exception as e:
            logger.error(f"Error saving data to CSV: {e}")
            logger.warning("Not updating last problem number due to CSV save failure")

        # Print summary
        logger.info("\nData Summary:")
        logger.info(f"New problems added: {len(new_df)}")
        logger.info(f"Total rows in final CSV: {len(combined_df)}")
        logger.info(f"Columns: {', '.join(combined_df.columns)}")
        logger.info(f"Highest problem number: {highest_problem_number}")
        logger.info("\nFirst few rows of extracted data:")
        print(new_df.head().to_string())

    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()

# Created/Modified files during execution:
# - leetcode_contest_problems.csv
# - last_scrape_info.txt