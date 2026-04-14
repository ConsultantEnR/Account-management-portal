import requests

MONDAY_API_URL = 'https://api.monday.com/v2'
MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew'
headers = {
    'Authorization': MONDAY_API_TOKEN,
    'Content-Type': 'application/json'
}

for gql_type in ['Board', 'Group', 'Item', 'ItemsResponse', 'ColumnValue']:
    query = f"""
    query {{
        __type(name: \"{gql_type}\") {{
            name
            fields {{
                name
                type {{
                    name
                    kind
                    ofType {{
                        name
                        kind
                    }}
                }}
            }}
        }}
    }}
    """
    response = requests.post(MONDAY_API_URL, json={'query': query}, headers=headers)
    print('TYPE:', gql_type, response.status_code)
    print(response.text)
    print('---')
