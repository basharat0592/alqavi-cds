import urllib.request
import urllib.parse
import json
import sys

def test_login(username, password):
    url = "http://127.0.0.1:8000/api/v1/users/token/"
    payload = {
        "username": username,
        "password": password
    }
    data = json.dumps(payload).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    
    print(f"Testing API login for {username}...")
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Status Code: {status}")
            print(f"Response: {body}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(f"Response: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        test_login("admin", "admin12")
    else:
        test_login(sys.argv[1], sys.argv[2])
