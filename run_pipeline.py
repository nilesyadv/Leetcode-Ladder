import logging
import subprocess
import sys

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_pipeline():
    # Run import_problems.py
    logger.info("Running import_problems.py...")
    result = subprocess.run([sys.executable, 'import_problems.py'], capture_output=False)  # Changed to False
    
    if result.returncode == 0:
        logger.info("import_problems.py completed successfully.")
    else:
        logger.error("import_problems.py failed with exit code %d", result.returncode)
        return False
    
    # Run rating_separator.py
    logger.info("Running rating_separator.py...")
    result = subprocess.run([sys.executable, 'rating_separator.py'], capture_output=False)  # Changed to False
    
    if result.returncode == 0:
        logger.info("rating_separator.py completed successfully.")
    else:
        logger.error("rating_separator.py failed with exit code %d", result.returncode)
        return False
    
    logger.info("Full pipeline completed successfully.")
    return True

if __name__ == "__main__":
    run_pipeline()