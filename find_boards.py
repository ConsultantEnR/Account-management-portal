import requests, json
MONDAY_API_URL = 'https://api.monday.com/v2'
MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew'
query = '''query { boards(limit: 200) { id name } }'''
resp = requests.post(MONDAY_API_URL, json={'query': query}, headers={'Authorization': MONDAY_API_TOKEN, 'Content-Type': 'application/json'})
if resp.status_code == 200:
    data = resp.json()
    if 'data' in data and 'boards' in data['data']:
        clients = [b for b in data['data']['boards'] if 'client' in b['name'].lower()]
        contacts = [b for b in data['data']['boards'] if 'contact' in b['name'].lower()]
        print("Boards contenant 'client' dans le nom:")
        for b in clients:
            print(f"ID: {b['id']} - Nom: {b['name']}")
        print("\nBoards contenant 'contact' dans le nom:")
        for b in contacts:
            print(f"ID: {b['id']} - Nom: {b['name']}")
    else:
        print("Aucun board trouvé.")
else:
    print(f"Erreur: {resp.status_code} - {resp.text}")
