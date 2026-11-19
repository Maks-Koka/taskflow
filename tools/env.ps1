# Додає до PATH поточної сесії інструменти, які winget поставив у
# нестандартні каталоги (helm, minikube, gh, argocd).
# Використання:  . .\tools\env.ps1

$candidates = @(
    'C:\Users\Lenovo\AppData\Local\Microsoft\WinGet\Packages\Helm.Helm_Microsoft.Winget.Source_8wekyb3d8bbwe\windows-amd64',
    'C:\Program Files\Kubernetes\Minikube',
    'C:\Program Files\GitHub CLI',
    "$env:USERPROFILE\bin",
    'C:\Users\Lenovo\AppData\Local\Programs\DockerDesktop\resources\bin'
)

foreach ($dir in $candidates) {
    if ((Test-Path $dir) -and ($env:PATH -notlike "*$dir*")) {
        $env:PATH = "$dir;$env:PATH"
    }
}

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

foreach ($tool in 'docker', 'kubectl', 'minikube', 'helm', 'gh', 'argocd') {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host ("{0,-10} {1}" -f $tool, $cmd.Source) }
    else      { Write-Host ("{0,-10} не знайдено" -f $tool) }
}
