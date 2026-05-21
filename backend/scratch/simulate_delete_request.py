import requests

login_url = "http://localhost:8000/api/v1/users/token/"
delete_url = "http://localhost:8000/api/v1/cms/sections/67/" # Category Filter Bar ID from the ORM output

# 1. Login
payload = {
    "username": "admin",
    "password": "adminpassword"
}
try:
    response = requests.post(login_url, json=payload)
    print("Login status:", response.status_code)
    print("Login content:", response.content)
    data = response.json()
    token = data.get("access")
    print("Access token retrieved:", token is not None)
    
    if token:
        # 2. Try delete
        headers = {
            "Authorization": f"Bearer {token}"
        }
        del_resp = requests.delete(delete_url, headers=headers)
        print("DELETE status:", del_resp.status_code)
        print("DELETE response content:", del_resp.content)
except Exception as e:
    print("Error:", e)
