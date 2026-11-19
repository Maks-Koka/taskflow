# Обрізає знімок екрана знизу і справа, прибираючи однотонне тло сторінки
# з логом. Потрібно, бо вікно браузера має фіксовану висоту, а логи різні.
#
# Usage: pwsh -File tools/Crop-Screenshot.ps1 -Path in.jpg -OutPath out.png [-Pad 14]

param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$OutPath,
    [int]$Pad = 14
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Path))
try {
    # Колір тла беремо з лівого нижнього кута — там завжди порожнє поле.
    $bg = $src.GetPixel(2, $src.Height - 2)

    function Test-RowIsBackground([System.Drawing.Bitmap]$bmp, [int]$y, $bg) {
        for ($x = 0; $x -lt $bmp.Width; $x += 7) {
            $p = $bmp.GetPixel($x, $y)
            if ([math]::Abs($p.R - $bg.R) -gt 8 -or
                [math]::Abs($p.G - $bg.G) -gt 8 -or
                [math]::Abs($p.B - $bg.B) -gt 8) { return $false }
        }
        return $true
    }

    $bottom = $src.Height - 1
    while ($bottom -gt 10 -and (Test-RowIsBackground $src $bottom $bg)) { $bottom-- }
    $height = [math]::Min($src.Height, $bottom + 1 + $Pad)

    $rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $height
    $dst  = $src.Clone($rect, $src.PixelFormat)
    try {
        $dir = Split-Path -Parent $OutPath
        if ($dir) { New-Item -ItemType Directory -Force $dir | Out-Null }
        $dst.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $dst.Dispose() }

    Write-Host ("cropped {0}x{1} -> {2}x{3}  {4}" -f $src.Width, $src.Height, $src.Width, $height, $OutPath)
} finally {
    $src.Dispose()
}
