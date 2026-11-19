# Renders every captured command log (reports/logs/**/*.log) into a
# terminal-styled HTML page under reports/html, so the output of the real
# commands can be screenshotted for the lab reports.
#
# Usage:  pwsh -File tools/Render-Logs.ps1

$ErrorActionPreference = 'Stop'

$root     = Split-Path -Parent $PSScriptRoot
$logsDir  = Join-Path $root 'reports\logs'
$htmlDir  = Join-Path $root 'reports\html'

New-Item -ItemType Directory -Force $htmlDir | Out-Null

function ConvertTo-HtmlText([string]$text) {
    $text = $text -replace '&', '&amp;'
    $text = $text -replace '<', '&lt;'
    $text = $text -replace '>', '&gt;'
    return $text
}

$template = @'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>__TITLE__</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0;
    background: #0b0e13;
    font-family: ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  }
  .frame {
    margin: 18px;
    border: 1px solid #2a323d;
    border-radius: 10px;
    overflow: hidden;
    background: #11151c;
    box-shadow: 0 10px 40px rgba(0,0,0,.45);
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #1b2129;
    border-bottom: 1px solid #2a323d;
  }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .r { background: #ff5f57; } .y { background: #febc2e; } .g { background: #28c840; }
  .title {
    margin-left: 10px;
    color: #9aa7b8;
    font-size: 12.5px;
    letter-spacing: .3px;
  }
  pre {
    margin: 0;
    padding: 16px 18px;
    color: #d7dee9;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .cmd { color: #6ec1ff; font-weight: 600; }
  .ok  { color: #3ecf8e; }
  .err { color: #ff7b72; }
  .dim { color: #7c8899; }
</style>
</head>
<body>
  <div class="frame">
    <div class="bar">
      <span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>
      <span class="title">__TITLE__</span>
    </div>
    <pre>__BODY__</pre>
  </div>
</body>
</html>
'@

$logs = Get-ChildItem -Path $logsDir -Filter '*.log' -Recurse -ErrorAction SilentlyContinue
if (-not $logs) {
    Write-Host 'No logs found.'
    exit 0
}

foreach ($log in $logs) {
    $relative = $log.FullName.Substring($logsDir.Length).TrimStart('\')
    $lab      = Split-Path -Parent $relative
    $name     = [System.IO.Path]::GetFileNameWithoutExtension($log.Name)

    $outDir = if ($lab) { Join-Path $htmlDir $lab } else { $htmlDir }
    New-Item -ItemType Directory -Force $outDir | Out-Null

    $raw   = Get-Content -Raw -Encoding UTF8 $log.FullName
    $lines = ($raw -split "`r?`n") | ForEach-Object {
        $escaped = ConvertTo-HtmlText $_
        if ($_ -match '^\s*(PS\s|\$\s|>\s|#\s)') {
            '<span class="cmd">' + $escaped + '</span>'
        }
        elseif ($_ -match '^\$ ') {
            '<span class="cmd">' + $escaped + '</span>'
        }
        elseif ($_ -match '(?i)\b(error|failed|fatal|refused|CrashLoopBackOff|ImagePullBackOff)\b') {
            '<span class="err">' + $escaped + '</span>'
        }
        elseif ($_ -match '(?i)\b(Running|Healthy|Synced|passed|PASS|ok|Completed|Successfully|DONE)\b') {
            '<span class="ok">' + $escaped + '</span>'
        }
        else {
            $escaped
        }
    }

    $title = if ($lab) { "$lab / $name" } else { $name }
    $html  = $template.Replace('__TITLE__', (ConvertTo-HtmlText $title)).Replace('__BODY__', ($lines -join "`n"))

    $outFile = Join-Path $outDir ($name + '.html')
    [System.IO.File]::WriteAllText($outFile, $html, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "rendered: $outFile"
}
