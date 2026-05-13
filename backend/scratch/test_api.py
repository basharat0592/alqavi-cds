import requests

def check_api():
    try:
        resp = requests.get('http://127.0.0.1:8000/api/v1/products/items/')
        print(f"Status: {resp.status_code}")
        print(f"Content: {resp.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_api()
