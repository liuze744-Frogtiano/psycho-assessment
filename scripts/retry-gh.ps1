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
    if ($jsonFile) { $args += @("-H", "Content-Type: application/json", "--data-binary", "@$jsonFile") }
    return & curl.exe @args 2>$null
}

$files = @("admin.html", "index.html", "result.html")
$publicDir = "c:\Users\Administrator\Desktop\psychological assessment\public"

foreach ($rel in $files) {
    $full = Join-Path $publicDir $rel
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $b64 = [System.Convert]::ToBase64String($bytes)

    # 获取现有 sha
    $get = GhApiFile "GET" "/repos/$USER/$REPO/contents/$rel`?ref=main" $null
    $sha = $null
    try { $sha = ($get | ConvertFrom-Json).sha } catch {}

    $obj = @{ message = "update: $rel"; content = $b64; branch = "main" }
    if ($sha) { $obj.sha = $sha }
    $json = $obj | ConvertTo-Json -Compress
    Write-JsonNoBom "$TMP\upload.json" $json

    $r = GhApiFile "PUT" "/repos/$USER/$REPO/contents/$rel" "$TMP\upload.json"
    if ($r -match '"sha"') {
        Write-Host "  OK: $rel"
    } else {
        Write-Host "  FAIL: $rel -> $($r.Substring(0,[Math]::Min(150,$r.Length)))"
    }
}

Write-Host "Done"
