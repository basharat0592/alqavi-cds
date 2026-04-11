import requests
import json

url = "http://127.0.0.1:8000/api/v1/users/token/"
data = {
    "username": "admin",
    "password": "admin12"
}

print(f"Testing login at {url} with {data['username']}...")
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
