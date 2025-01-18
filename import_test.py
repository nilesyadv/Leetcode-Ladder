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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

def scroll_page(driver):
    try:
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            # Scroll down
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(3)  # Increased wait time

            # Calculate new scroll height and compare with last scroll height
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                # Try one more time to make sure it's really the end
                time.sleep(3)
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
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

# ... (previous imports and setup remain the same)

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
        driver = setup_driver()
        url = "https://clist.by/problems/?search=contest%3AWeekly+Contest+%7C%7C+Biweekly+Contest"

        logger.info("Opening webpage...")
        driver.get(url)

        # Wait for table to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "table-float-head"))
        )

        logger.info("Scrolling through page...")
        scroll_page(driver)

        logger.info("Extracting data...")
        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Find all problem rows
        rows = soup.find_all('tr', class_='show-hidden-activity-on-hover')
        logger.info(f"Found {len(rows)} problems")

        rows_data = []
        for row in rows:
            row_data = extract_problem_data(row)
            if row_data:
                rows_data.append(row_data)

        df = pd.DataFrame(rows_data)

        # Clean the DataFrame
        for column in df.columns:
            if df[column].dtype == 'object':
                df[column] = df[column].apply(clean_text)

        # Log initial number of rows
        initial_rows = len(df)
        logger.info(f"Initial number of rows: {initial_rows}")

        # Remove rows with missing problem names or numbers
        df = df.dropna(subset=['Problem Name', 'Problem Number'])

        # Log number of rows removed
        removed_rows = initial_rows - len(df)
        if removed_rows > 0:
            logger.warning(f"Removed {removed_rows} rows with missing problem names or numbers")

        # Additional validation: ensure problem numbers are numeric
        df = df[df['Problem Number'].apply(lambda x: str(x).isdigit())]

        # Reorder columns
        columns_order = ['Date', 'Problem Number', 'Problem Name', 'Problem Rating',
                        'Problem Link', 'Contest Name', 'Tags']
        df = df[columns_order]

        # Write to CSV with proper encoding and quoting
        output_file = "leetcode_contest_problems.csv"
        df.to_csv(output_file,
                 index=False,
                 encoding='utf-8',
                 quoting=csv.QUOTE_MINIMAL,
                 escapechar='\\',
                 na_rep='')

        logger.info(f"Data saved successfully to {output_file}")

        # Print summary
        logger.info("\nData Summary:")
        logger.info(f"Total rows in final CSV: {len(df)}")
        logger.info(f"Columns: {', '.join(df.columns)}")
        logger.info("\nFirst few rows of extracted data:")
        print(df.head().to_string())

        # Print sample of data types and non-null counts
        logger.info("\nData Info:")
        buffer = io.StringIO()
        df.info(buf=buffer)
        logger.info(buffer.getvalue())

    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()

# Created/Modified files during execution:
# - leetcode_contest_problems.csv