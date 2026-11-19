# Helper used while running the labs: executes a shell command, prints its
# output and appends both the command line and its output to a log file under
# reports/logs/<lab>/<name>.log. Those logs are rendered into terminal-styled
# screenshots by tools/Render-Logs.ps1.
#
# Usage:
#   . .\tools\Capture.ps1
#   New-LabLog -Lab lab1 -Name 01-compose-ps -Title 'Стан контейнерів'
#   Invoke-Capture 'docker compose ps'
#   Invoke-Capture 'docker compose logs --tail 20 tasks-api'

$script:LabLogPath = $null

function New-LabLog {
    param(
        [Parameter(Mandatory)][string]$Lab,
        [Parameter(Mandatory)][string]$Name,
        [string]$Title = ''
    )
    $root = Split-Path -Parent $PSScriptRoot
    $dir  = Join-Path $root "reports\logs\$Lab"
    New-Item -ItemType Directory -Force $dir | Out-Null
    $script:LabLogPath = Join-Path $dir "$Name.log"

    $header = @()
    if ($Title) { $header += "# $Title" }
    $header += "# $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $header += ''
    [System.IO.File]::WriteAllLines($script:LabLogPath, $header, (New-Object System.Text.UTF8Encoding $false))
    return $script:LabLogPath
}

function Invoke-Capture {
    param(
        [Parameter(Mandatory, Position = 0)][string]$Command,
        [switch]$Quiet
    )
    if (-not $script:LabLogPath) { throw 'Call New-LabLog first.' }

    $output = & { Invoke-Expression $Command } 2>&1 | Out-String
    $output = $output -replace "`r`n", "`n"

    $block = @("$ $Command", $output.TrimEnd(), '')
    Add-Content -Path $script:LabLogPath -Value $block -Encoding UTF8

    if (-not $Quiet) {
        Write-Host "$ $Command"
        Write-Host $output.TrimEnd()
    }
}

function Add-CaptureNote {
    param([Parameter(Mandatory)][string]$Text)
    if (-not $script:LabLogPath) { throw 'Call New-LabLog first.' }
    Add-Content -Path $script:LabLogPath -Value @("# $Text", '') -Encoding UTF8
}
