<#
Register a Windows Scheduled Task that runs `monday_to_supabase.py --watch --interval 3600`
every hour without manual intervention.

Usage:
  PowerShell -ExecutionPolicy Bypass -File .\setup_hourly_sync.ps1

Requirements:
- Python executable available in PATH
- The script `monday_to_supabase.py` located in the same repository folder
- Run once to install or update the scheduled task
#>

$taskName = "MondayToSupabaseHourlySync"
$repoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $repoPath "monday_to_supabase.py"

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Error "Impossible de trouver python.exe dans le PATH. Assurez-vous que Python est installé et accessible."
    exit 1
}

$action = New-ScheduledTaskAction -Execute $pythonCmd.Path -Argument "`"$scriptPath`" --watch --interval 3600"
$trigger = New-ScheduledTaskTrigger -Daily -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 60) -RepetitionDuration (New-TimeSpan -Days 1)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Synchronise automatiquement les données Monday vers Supabase toutes les 60 minutes." -Force

Write-Host "Tâche planifiée '$taskName' installée. Elle exécutera le script toutes les 60 min."
Write-Host "Pour voir la tâche : Get-ScheduledTask -TaskName $taskName"