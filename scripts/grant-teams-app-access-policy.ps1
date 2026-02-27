# Grant Soulvyns app permission to create Teams meetings on behalf of admin@soulvyns.co.za
# Run in PowerShell as a Teams/M365 admin. Requires: Install-Module MicrosoftTeams -Scope CurrentUser
#
# IMPORTANT: The Cs* cmdlets only work in the SAME session as Connect-MicrosoftTeams.
# Do NOT run this script with "powershell -File" - the connection is lost between commands.
# Instead: open PowerShell, run Connect-MicrosoftTeams and sign in, then run the two
# policy commands below (or copy from scripts/grant-teams-app-access-policy-commands.txt).

$ErrorActionPreference = "Stop"
$AppId    = "7ba6dbba-d01e-44c4-80c9-a29b1781e923"   # GRAPH_CLIENT_ID (Soulvyns Web App)
$UserId   = "ce5c3573-2370-4933-b9de-362eefac861c"   # admin@soulvyns.co.za Object ID
$PolicyName = "Soulvyns-Meetings"

Write-Host "Connecting to Microsoft Teams (browser/popup may open for sign-in)..." -ForegroundColor Cyan
Connect-MicrosoftTeams
if (-not $?) { throw "Connect-MicrosoftTeams failed. Sign in with a Teams/M365 admin account and try again." }
Write-Host "If a sign-in window opened, complete sign-in there, then press Enter here to continue." -ForegroundColor Yellow
Read-Host
Write-Host "Creating application access policy: $PolicyName ..." -ForegroundColor Cyan
New-CsApplicationAccessPolicy -Identity $PolicyName -AppIds $AppId -Description "Soulvyns create Teams meetings"

Write-Host "Granting policy to user (admin@soulvyns.co.za)..." -ForegroundColor Cyan
Grant-CsApplicationAccessPolicy -PolicyName $PolicyName -Identity $UserId

Write-Host "Done. Allow up to 30 minutes for the policy to take effect, then try Create test meeting on /dev." -ForegroundColor Green
