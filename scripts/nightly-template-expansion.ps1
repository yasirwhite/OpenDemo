# Launcher for the nightly template-expansion runbook.
# Registered in Windows Task Scheduler (daily 19:00) as "OpenDemo Nightly Template Expansion":
#   schtasks /Create /TN "OpenDemo Nightly Template Expansion" /SC DAILY /ST 19:00 ^
#     /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File <repo>\scripts\nightly-template-expansion.ps1"
# The runbook itself lives in docs/runbooks/nightly-template-expansion.md — edit that, not this.

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

# The Claude CLI ships inside the VS Code extension; resolve the newest installed version
# so extension updates don't break the schedule.
$ext = Get-ChildItem "$env:USERPROFILE\.vscode\extensions" -Directory -Filter "anthropic.claude-code-*" -ErrorAction Stop |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
$claude = Join-Path $ext.FullName "resources\native-binary\claude.exe"
if (-not (Test-Path $claude)) { throw "claude.exe not found under $($ext.FullName)" }

$logDir = Join-Path $repo ".demo-build\nightly"
New-Item -ItemType Directory -Force $logDir | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd"

$prompt = "You are the nightly template-expansion operator for OpenDemo, running unattended at company close. Read docs/runbooks/nightly-template-expansion.md and execute it end to end for tonight ($stamp). Parallelize with subagents to stay inside the 2-hour budget, but never sacrifice quality for count."

& $claude --dangerously-skip-permissions -p $prompt *>> (Join-Path $logDir "runs.log")
