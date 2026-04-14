import requests, json
MONDAY_API_URL = 'https://api.monday.com/v2'
MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew'
query = '''query { boards(limit: 50) { id name } }'''
resp = requests.post(MONDAY_API_URL, json={'query': query}, headers={'Authorization': MONDAY_API_TOKEN, 'Content-Type': 'application/json'})
print(resp.status_code)
if resp.status_code == 200:
    data = resp.json()
    if 'data' in data and 'boards' in data['data']:
        for board in data['data']['boards']:
            print(f"ID: {board['id']} - Name: {board['name']}")
    else:
        print("No boards found:", json.dumps(data, indent=2))
else:
    print("Error:", resp.text)
