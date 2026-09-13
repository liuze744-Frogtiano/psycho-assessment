$USER = "liuze744-Frogtiano"
if (-not $env:GITHUB_TOKEN) { Write-Error "缺少环境变量 GITHUB_TOKEN，请先设置后再运行（参考 .env.example）。"; exit 1 }
$TOKEN = $env:GITHUB_TOKEN
$REPO = "psycho-assessment"
$AUTH = $USER + ":" + $TOKEN
$BASE = "https://api.github.com"
$TMP = $env:TEMP
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-JsonNoBom($path, $content) {
    [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

function GhApiFile($method, $path, $jsonFile) {
    $args = @("-s", "-u", $AUTH, "-X", $method, "$BASE$path", "-H", "Accept: application/vnd.github+json", "-H", "User-Agent: deploy-script")
    if ($jsonFile) {
        $args += @("-H", "Content-Type: application/json", "--data-binary", "@$jsonFile")
    }
    return & curl.exe @args 2>$null
}

Write-Host "Step 1: repo ready"

Write-Host "Step 2: upload files"
$publicDir = "c:\Users\Administrator\Desktop\psychological assessment\public"
$files = Get-ChildItem -Path $publicDir -Recurse -File
foreach ($f in $files) {
    $rel = $f.FullName.Substring($publicDir.Length + 1).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)

    $obj = @{ message = "deploy: $rel"; content = $b64; branch = "main" }
    $json = $obj | ConvertTo-Json -Compress
    Write-JsonNoBom "$TMP\upload.json" $json

    $r = GhApiFile "PUT" "/repos/$USER/$REPO/contents/$rel" "$TMP\upload.json"
    if ($r -match '"sha"') {
        Write-Host "  OK: $rel"
    } else {
        Write-Host "  FAIL: $rel"
    }
}

Write-Host "Step 3: enable Pages"
Write-JsonNoBom "$TMP\pages.json" '{"source":{"branch":"main","path":"/"}}'
$r = GhApiFile "POST" "/repos/$USER/$REPO/pages" "$TMP\pages.json"
Write-Host "  pages: $($r.Substring(0,[Math]::Min(150,$r.Length)))"

Write-Host ""
Write-Host "=== DONE ==="
Write-Host "Pages URL: https://$USER.github.io/$REPO/"
