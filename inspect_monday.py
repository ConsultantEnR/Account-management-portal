import requests, json
MONDAY_API_URL = 'https://api.monday.com/v2'
MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew'
board_id = '8028015224'
query = '''query { boards(ids:["''' + board_id + '''"]) { items_page(limit: 500) { items { id name column_values { id column { title } text value } } } } }'''
resp = requests.post(MONDAY_API_URL, json={'query': query}, headers={'Authorization': MONDAY_API_TOKEN, 'Content-Type': 'application/json'})
print(resp.status_code)
print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
