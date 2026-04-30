#!/bin/bash
# Install dependencies if not already installed
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
