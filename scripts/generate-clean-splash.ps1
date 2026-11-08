Add-Type -AssemblyName System.Drawing

$targets = @(
  @{ dir = "drawable"; w = 480; h = 800 },
  @{ dir = "drawable-port-mdpi"; w = 320; h = 480 },
  @{ dir = "drawable-port-hdpi"; w = 480; h = 800 },
  @{ dir = "drawable-port-xhdpi"; w = 720; h = 1280 },
  @{ dir = "drawable-port-xxhdpi"; w = 960; h = 1600 },
  @{ dir = "drawable-port-xxxhdpi"; w = 1280; h = 1920 },
  @{ dir = "drawable-land-mdpi"; w = 480; h = 320 },
  @{ dir = "drawable-land-hdpi"; w = 800; h = 480 },
  @{ dir = "drawable-land-xhdpi"; w = 1280; h = 720 },
  @{ dir = "drawable-land-xxhdpi"; w = 1600; h = 960 },
  @{ dir = "drawable-land-xxxhdpi"; w = 1920; h = 1280 }
)

$baseDir = "android/app/src/main/res"
$bg = [System.Drawing.Color]::FromArgb(255, 11, 11, 12)

foreach ($t in $targets) {
  $targetPath = Join-Path $baseDir (Join-Path $t.dir "splash.png")
  $bmp = New-Object System.Drawing.Bitmap($t.w, $t.h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $brush = New-Object System.Drawing.SolidBrush($bg)
  $g.FillRectangle($brush, 0, 0, $t.w, $t.h)
  $g.Dispose()
  $brush.Dispose()
  $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "Generated clean splash: $targetPath ($($t.w)x$($t.h))"
}

