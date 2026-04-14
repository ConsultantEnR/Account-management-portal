# Account-management-portal
Portail interne de gestion des comptes clients Dolfines SA

## Synchronisation automatique

Pour synchroniser les données Monday vers Supabase toutes les 60 minutes sans intervention manuelle :

1. Assurez-vous que Python est installé et accessible depuis le PATH.
2. Placez-vous dans le dossier du dépôt.
3. Exécutez :
   ```powershell
   PowerShell -ExecutionPolicy Bypass -File .\setup_hourly_sync.ps1
   ```
4. La tâche planifiée Windows `MondayToSupabaseHourlySync` sera créée et exécutera le script toutes les heures.

Le script utilisé est `monday_to_supabase.py` et il redémarre la synchronisation toutes les 60 minutes via l’option `--watch --interval 3600`.
