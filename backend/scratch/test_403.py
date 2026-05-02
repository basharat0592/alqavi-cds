import urllib.request
import urllib.error

url = "http://127.0.0.1:8000/api/v1/sales/purchases/?exclude_received=true"
try:
    response = urllib.request.urlopen(url)
    print(f"Status Code: {response.getcode()}")
    print(f"Content: {response.read()}")
except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    print(f"Content: {e.read()}")
    print(f"Headers: {e.headers}")
except Exception as e:
    print(f"Error: {e}")
