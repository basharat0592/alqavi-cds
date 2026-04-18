import urllib.request
import urllib.error

url = "http://127.0.0.1:8000/api/v1/company/suppliers/"
try:
    response = urllib.request.urlopen(url)
    print(f"Status Code: {response.getcode()}")
    print(f"Content: {response.read()[:50]}...")
except urllib.error.HTTPError as e:
    print(f"Status Code: {e.code}")
    print(f"Content: {e.read()}")
except Exception as e:
    print(f"Error: {e}")
