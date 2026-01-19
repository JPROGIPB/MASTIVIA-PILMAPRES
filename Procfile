# Procfile for Render deployment
# This tells Render how to start the application

web: gunicorn server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
