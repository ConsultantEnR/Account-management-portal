import requests
import json
from supabase import create_client, Client

# Configuration Monday.com
MONDAY_API_URL = "https://api.monday.com/v2"
MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew"  # Remplacez par votre token

# Configuration Supabase
SUPABASE_URL = "https://rhzkikpuupjoyfsibqgm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoemtpa3B1dXBqb3lmc2licWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDY3NDcsImV4cCI6MjA5MTIyMjc0N30.t4BWN0hxXpWbyXfZRuZ_VtaEUNv_Kyrd9aMhS5OjO74"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoemtpa3B1dXBqb3lmc2licWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY0Njc0NywiZXhwIjoyMDkxMjIyNzQ3fQ.igmqjpmA6oHKdDenayPkwv6G8xUsQh07MobomsA0PUc"

# IDs des boards Monday
CLIENTS_BOARD_ID = "8028015224"
CONTACTS_BOARD_ID = "2230970528"

# Nom de la table Supabase pour les contacts (doit exister dans la base)
CONTACT_TABLE_NAME = "contacts"
ACCOUNT_TABLE_NAME = "accounts"

# Mappings de noms Monday vers emails/email vers user_ids
PERSON_NAME_TO_EMAIL = {
    "Hend OTHMANI": "hend.othmani@dolfines.com",
    # Ajoutez d'autres mappings si nécessaire.
}

USER_MAPPING = {}


def get_user_mapping(supabase: Client):
    USER_MAPPING.clear()
    try:
        result = supabase.auth.admin.list_users()
        users = None
        if isinstance(result, dict):
            users = result.get("data") or result.get("users")
        elif hasattr(result, "data"):
            users = result.data
        else:
            users = result

        if users is None:
            print("Impossible de lire les utilisateurs Supabase.")
            return

        for user in users:
            if isinstance(user, dict):
                email = user.get("email")
                user_id = user.get("id")
            else:
                email = getattr(user, "email", None)
                user_id = getattr(user, "id", None)
            if email and user_id:
                USER_MAPPING[email] = str(user_id)

        print(f"Récupéré {len(USER_MAPPING)} utilisateurs Supabase.")
    except Exception as e:
        print(f"Erreur récupération utilisateurs: {e}")
        USER_MAPPING.update({
            "dylan.charron@dolfines.com": "uuid-dylan",
            "hend.othmani@dolfines.com": "uuid-hend",
        })


def get_monday_data(board_id, query_fields):
    headers = {
        "Authorization": MONDAY_API_TOKEN,
        "Content-Type": "application/json"
    }
    query = f"""
    query {{
        boards(ids: ["{board_id}"]) {{
            items_page(limit: 500) {{
                items {{
                    id
                    name
                    {query_fields}
                }}
            }}
        }}
    }}
    """
    response = requests.post(MONDAY_API_URL, json={"query": query}, headers=headers)
    if response.status_code != 200:
        print(f"Erreur API Monday: {response.status_code} - {response.text}")
        return {"items": [], "raw": {"error": response.text, "status_code": response.status_code}}

    result = response.json()
    items = []
    if result.get("data") and result["data"].get("boards") and result["data"]["boards"][0] is not None:
        board = result["data"]["boards"][0]
        items = board.get("items_page", {}).get("items", [])
    return {"items": items, "raw": result}


def normalize_column_title(title: str):
    return title.strip().lower() if title else ""


def get_column(item, column_title):
    normalized_title = normalize_column_title(column_title)
    for col in item.get("column_values", []):
        column = col.get("column") or {}
        if normalize_column_title(column.get("title")) == normalized_title:
            return col
    return None


def get_column_text(item, column_title):
    col = get_column(item, column_title)
    if not col:
        return None
    text = col.get("text")
    if text:
        return text.strip()
    value = col.get("value")
    if isinstance(value, str):
        return value.strip('"')
    return None


def get_column_json(item, column_title):
    col = get_column(item, column_title)
    if not col:
        return None
    value = col.get("value")
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return None


def resolve_account_manager_user_id(account_manager_value):
    if not account_manager_value:
        return None
    if "@" in account_manager_value:
        return USER_MAPPING.get(account_manager_value)
    email = PERSON_NAME_TO_EMAIL.get(account_manager_value)
    if email:
        return USER_MAPPING.get(email)
    lower_value = account_manager_value.strip().lower()
    for email, user_id in USER_MAPPING.items():
        if lower_value in email.lower():
            return user_id
    return None


def upsert_into_supabase(supabase: Client, data, table):
    try:
        result = supabase.table(table).upsert(data, on_conflict="id").execute()
        print(f"Upsert dans {table}: {data.get('id')} -> {result}")
    except Exception as e:
        print(f"Erreur upsert Supabase ({table}): {e}")


def import_clients(supabase: Client, test_mode: bool):
    query_fields = """
    column_values {
        id
        column {
            title
        }
        text
        value
    }
    """
    clients_data = get_monday_data(CLIENTS_BOARD_ID, query_fields)
    print("Réponse clients:", clients_data["raw"])

    for item in clients_data["items"]:
        account_manager_value = get_column_text(item, "Account Manager")
        user_id = resolve_account_manager_user_id(account_manager_value)
        account = {
            "id": item["id"],
            "account_name": item["name"],
            "user_id": user_id,
            "account_owner": account_manager_value,
        }
        if not user_id:
            print(f"WARN: Aucun user_id trouvé pour Account Manager '{account_manager_value}' sur le compte '{item['name']}'")
        if test_mode:
            print("[TEST] Client prêt à insérer:", account)
        else:
            upsert_into_supabase(supabase, account, ACCOUNT_TABLE_NAME)


def import_contacts(supabase: Client, test_mode: bool):
    query_fields = """
    column_values {
        id
        column {
            title
        }
        text
        value
    }
    """
    contacts_data = get_monday_data(CONTACTS_BOARD_ID, query_fields)
    print("Réponse contacts:", contacts_data["raw"])

    for item in contacts_data["items"]:
        account_manager_value = get_column_text(item, "Account Manager")
        user_id = resolve_account_manager_user_id(account_manager_value)
        contact = {
            "id": item["id"],
            "name": item["name"],
            "user_id": user_id,
            "account_manager": account_manager_value,
        }
        if not user_id:
            print(f"WARN: Aucun user_id trouvé pour Account Manager '{account_manager_value}' sur le contact '{item['name']}'")
        if test_mode:
            print("[TEST] Contact prêt à insérer:", contact)
        else:
            upsert_into_supabase(supabase, contact, CONTACT_TABLE_NAME)


def main():
    print("Démarrage du script Monday → Supabase...")
    TEST_MODE = False

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("Supabase initialisé avec service role.")

    get_user_mapping(supabase)
    print("Mapping utilisateurs chargé:", USER_MAPPING)

    print("Import clients...")
    import_clients(supabase, TEST_MODE)

    print("Import contacts...")
    import_contacts(supabase, TEST_MODE)

    print("Import terminé.")


if __name__ == "__main__":
    main()
