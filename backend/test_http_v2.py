import urllib.request
import json

url = "http://127.0.0.1:8000/api/v1/users/token/"
data = {
    "username": "admin",
    "password": "admin12"
}

print(f"Testing login at {url} with {data['username']}...")
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Response: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Response: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Request failed: {e}")
