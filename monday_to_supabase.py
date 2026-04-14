import requests
import json
import re
from supabase import create_client, Client

# Configuration Monday.com
MONDAY_API_URL = "https://api.monday.com/v2"
MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY0NTM1OTE2OCwiYWFpIjoxMSwidWlkIjo4MTk2MDk3MiwiaWFkIjoiMjAyNi0wNC0xNFQxMTo1MDowNS42NjhaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6ODc3ODczNCwicmduIjoidXNlMSJ9.dfGpJlTXvRf17QYHKKfRcOAKfAA4D_YwKT4W3WxC_Ew"  # Remplacez par votre token

# Configuration Supabase
SUPABASE_URL = "https://rhzkikpuupjoyfsibqgm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoemtpa3B1dXBqb3lmc2licWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NDY3NDcsImV4cCI6MjA5MTIyMjc0N30.t4BWN0hxXpWbyXfZRuZ_VtaEUNv_Kyrd9aMhS5OjO74"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoemtpa3B1dXBqb3lmc2licWdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY0Njc0NywiZXhwIjoyMDkxMjIyNzQ3fQ.igmqjpmA6oHKdDenayPkwv6G8xUsQh07MobomsA0PUc"

# IDs des boards Monday
CLIENTS_BOARD_ID = "18210354538"
CONTACTS_BOARD_ID = "2230970528"

def list_monday_boards():
    headers = {
        "Authorization": MONDAY_API_TOKEN,
        "Content-Type": "application/json"
    }
    query = """
    query {
        boards(limit: 100) {
            id
            name
        }
    }
    """
    response = requests.post(MONDAY_API_URL, json={"query": query}, headers=headers)
    if response.status_code == 200:
        result = response.json()
        if 'data' in result and 'boards' in result['data']:
            print("Boards disponibles dans votre espace Monday.com :")
            for board in result['data']['boards']:
                print(f"ID: {board['id']} - Nom: {board['name']}")
        else:
            print("Aucun board trouvé.")
    else:
        print(f"Erreur API: {response.status_code} - {response.text}")

# Pour lister les boards, décommentez la ligne ci-dessous et exécutez le script
# list_monday_boards()
# exit()  # Arrêtez après la liste pour choisir les IDs

# Nom de la table Supabase pour les contacts (doit exister dans la base)
CONTACT_TABLE_NAME = "contacts"
ACCOUNT_TABLE_NAME = "accounts"

# Mappings de noms Monday vers emails/email vers user_ids
PERSON_NAME_TO_EMAIL = {
    "Hend OTHMANI": "hend.othmani@dolfines.com",
    # Ajoutez d'autres mappings si nécessaire.
}

USER_MAPPING = {}
USER_NAME_MAPPING = {}


def normalize_name(text: str | None):
    if not text:
        return ""
    normalized = text.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def get_user_mapping(supabase: Client):
    USER_MAPPING.clear()
    USER_NAME_MAPPING.clear()
    try:
        result = supabase.auth.admin.list_users()
        users = None
        if isinstance(result, dict):
            users = result.get("data") or result.get("users")
        elif hasattr(result, "data"):
            users = result.data # type: ignore
        else:
            users = result

        if users is None:
            print("Impossible de lire les utilisateurs Supabase.")
            return

        for user in users:
            if isinstance(user, dict):
                email = user.get("email")
                user_id = user.get("id")
                metadata = user.get("user_metadata") or {}
            else:
                email = getattr(user, "email", None)
                user_id = getattr(user, "id", None)
                metadata = getattr(user, "user_metadata", None) or {}

            if email and user_id:
                lower_email = email.lower()
                USER_MAPPING[lower_email] = str(user_id)
                display_name = metadata.get("full_name") if isinstance(metadata, dict) else None
                if display_name:
                    USER_NAME_MAPPING[normalize_name(display_name)] = lower_email
                else:
                    local_part = lower_email.split("@")[0].replace(".", " ").replace("_", " ")
                    USER_NAME_MAPPING[normalize_name(local_part)] = lower_email

        print(f"Récupéré {len(USER_MAPPING)} utilisateurs Supabase.")
    except Exception as e:
        print(f"Erreur récupération utilisateurs: {e}")
        USER_MAPPING.update({
            "dylan.charron@dolfines.com": "uuid-dylan",
            "hend.othmani@dolfines.com": "uuid-hend",
        })
        USER_NAME_MAPPING.update({
            "dylan charron": "dylan.charron@dolfines.com",
            "hend othmani": "hend.othmani@dolfines.com",
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


def normalize_column_title(title: str | None):
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


def get_account_manager_value(item):
    possible_titles = [
        "Account Manager",
        "Responsable Commercial",
        "Responsable Client",
        "Account Owner",
        "Commercial",
        "Owner"
    ]
    for title in possible_titles:
        value = get_column_text(item, title)
        if value:
            return value
    return None


def extract_emails(value: str):
    if not value:
        return []
    return re.findall(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", value)


def get_column_email(item, column_title):
    raw_text = get_column_text(item, column_title)
    if raw_text:
        emails = extract_emails(raw_text)
        if emails:
            return emails[0]

    json_value = get_column_json(item, column_title)
    if isinstance(json_value, dict):
        for key in ("email", "emails", "text"):
            if key in json_value and isinstance(json_value[key], str):
                emails = extract_emails(json_value[key])
                if emails:
                    return emails[0]
        if "personsAndTeams" in json_value:
            persons = json_value.get("personsAndTeams")
            if isinstance(persons, list):
                for person in persons:
                    if isinstance(person, dict):
                        email = person.get("email")
                        if email:
                            return email
    return None


def collect_board_manager_emails(board_id):
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
    boards = get_monday_data(board_id, query_fields)
    found_emails = set()
    if not boards or not boards.get("items"):
        return found_emails

    for item in boards["items"]:
        possible_titles = [
            "Account Manager",
            "Responsable Commercial",
            "Responsable Client",
            "Account Owner",
            "Commercial",
            "Owner"
        ]
        for title in possible_titles:
            email = get_column_email(item, title)
            if email:
                found_emails.add(email.lower())

    return found_emails


def print_manager_emails():
    print("Emails trouvés pour les managers / owners sur le board Clients :")
    clients_emails = collect_board_manager_emails(CLIENTS_BOARD_ID)
    for email in sorted(clients_emails):
        print(f"- {email}")

    print("\nEmails trouvés pour les managers / owners sur le board Contacts :")
    contacts_emails = collect_board_manager_emails(CONTACTS_BOARD_ID)
    for email in sorted(contacts_emails):
        print(f"- {email}")

    if not clients_emails and not contacts_emails:
        print("Aucun email détecté dans les colonnes de manager/owner. Si ces colonnes sont des personnes Monday, elles ne fournissent souvent pas l'email directement.")


def resolve_account_manager_user_id(account_manager_value):
    if not account_manager_value:
        return None
    value = account_manager_value.strip()
    lower_value = value.lower()
    if "@" in lower_value:
        return USER_MAPPING.get(lower_value)

    email = PERSON_NAME_TO_EMAIL.get(value)
    if email:
        return USER_MAPPING.get(email.lower())

    normalized_value = normalize_name(value)
    if normalized_value in USER_NAME_MAPPING:
        return USER_MAPPING.get(USER_NAME_MAPPING[normalized_value])

    tokens = normalized_value.split()
    for name_key, email in USER_NAME_MAPPING.items():
        if all(token in name_key for token in tokens):
            return USER_MAPPING.get(email)

    for user_email, user_id in USER_MAPPING.items():
        if all(token in user_email for token in tokens):
            return user_id

    return None


def upsert_into_supabase(supabase: Client, data, table):
    try:
        supabase.table(table).upsert(data, on_conflict="id").execute()
        return True
    except Exception as e:
        print(f"Erreur upsert Supabase ({table}): {e}")
        return False


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
    print(f"Réponse clients: {len(clients_data['items'])} items récupérés.")

    inserted = 0
    missing_user = 0
    for item in clients_data["items"]:
        account_manager_value = get_account_manager_value(item)
        user_id = resolve_account_manager_user_id(account_manager_value)
        account = {
            "id": item["id"],
            "account_name": item["name"],
            "user_id": user_id,
            "account_owner": account_manager_value,
        }
        if not user_id:
            missing_user += 1
            print(f"WARN: Aucun user_id trouvé pour Account Manager '{account_manager_value}' sur le compte '{item['name']}'")
            continue
        if test_mode:
            print("[TEST] Client prêt à insérer:", account)
        else:
            if upsert_into_supabase(supabase, account, ACCOUNT_TABLE_NAME):
                inserted += 1

    print(f"Clients importés: {inserted}/{len(clients_data['items'])} (missing_user={missing_user})")


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
    print(f"Réponse contacts: {len(contacts_data['items'])} items récupérés.")

    inserted = 0
    missing_user = 0
    for item in contacts_data["items"]:
        account_manager_value = get_account_manager_value(item)
        user_id = resolve_account_manager_user_id(account_manager_value)
        contact = {
            "id": item["id"],
            "name": item["name"],
            "user_id": user_id,
            "account_manager": account_manager_value,
        }
        if not user_id:
            missing_user += 1
            print(f"WARN: Aucun user_id trouvé pour Account Manager '{account_manager_value}' sur le contact '{item['name']}'")
            continue
        if test_mode:
            print("[TEST] Contact prêt à insérer:", contact)
        else:
            if upsert_into_supabase(supabase, contact, CONTACT_TABLE_NAME):
                inserted += 1

    print(f"Contacts importés: {inserted}/{len(contacts_data['items'])} (missing_user={missing_user})")


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
