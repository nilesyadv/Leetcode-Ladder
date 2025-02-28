from app import app as application

# This allows both Render and local development to work
app = application

if __name__ == "__main__":
    application.run()