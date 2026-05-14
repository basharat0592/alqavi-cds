import requests

url = "http://localhost:8000/api/v1/cms/config/subscribe_newsletter/"
data = {"email": "test-bot@example.com"}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
