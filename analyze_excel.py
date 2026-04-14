import pandas as pd
import os

# Chemins des fichiers Excel (placez les fichiers dans le même répertoire que ce script)
clients_file = 'CLIENTS_1776167050.xlsx'
contacts_file = 'CONTACTS_1776167067.xlsx'

# Fonction pour lire et afficher la structure d'un Excel
def analyze_excel(file_path, sheet_name=0):
    if os.path.exists(file_path):
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        print(f"\n=== Analyse de {file_path} ===")
        print(f"Colonnes: {list(df.columns)}")
        print(f"Nombre de lignes: {len(df)}")
        print("Aperçu des premières lignes:")
        print(df.head())
        return df
    else:
        print(f"Fichier {file_path} non trouvé.")
        return None

# Analyser les fichiers
clients_df = analyze_excel(clients_file)
contacts_df = analyze_excel(contacts_file)