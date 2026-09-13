$USER = "liuze744-Frogtiano"
if (-not $env:GITHUB_TOKEN) { Write-Error "缺少环境变量 GITHUB_TOKEN，请先设置后再运行（参考 .env.example）。"; exit 1 }
$TOKEN = $env:GITHUB_TOKEN
$REPO = "psycho-assessment"
$AUTH = $USER + ":" + $TOKEN
$BASE = "https://api.github.com"
$TMP = $env:TEMP

function GhApiFile($method, $path, $jsonFile) {
    $args = @("-s", "-u", $AUTH, "-X", $method, "$BASE$path", "-H", "Accept: application/vnd.github+json", "-H", "User-Agent: deploy-script")
    if ($jsonFile) {
        $args += @("-H", "Content-Type: application/json", "--data-binary", "@$jsonFile")
    }
    return & curl.exe @args 2>$null
}

Write-Host "Step 1: check repo"
$r = GhApiFile "GET" "/repos/$USER/$REPO" $null
if ($r -match 'Not Found') {
    Write-Host "  repo not found, creating..."
    '{"name":"psycho-assessment","description":"psycho assessment","private":false}' | Out-File -FilePath "$TMP\create.json" -Encoding utf8
    $r = GhApiFile "POST" "/user/repos" "$TMP\create.json"
}
Write-Host "  repo ready"

Write-Host "Step 2: upload files"
$publicDir = "c:\Users\Administrator\Desktop\psychological assessment\public"
$files = Get-ChildItem -Path $publicDir -Recurse -File
foreach ($f in $files) {
    $rel = $f.FullName.Substring($publicDir.Length + 1).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)

    # 先检查文件是否存在
    $get = GhApiFile "GET" "/repos/$USER/$REPO/contents/$rel`?ref=main" $null
    $existing = $null
    try { $existing = $get | ConvertFrom-Json } catch {}

    $obj = @{ message = "deploy: $rel"; content = $b64; branch = "main" }
    if ($existing -and $existing.sha) {
        $obj.sha = $existing.sha
        $obj.message = "update: $rel"
    }
    $obj | ConvertTo-Json -Compress | Out-File -FilePath "$TMP\upload.json" -Encoding utf8

    $r = GhApiFile "PUT" "/repos/$USER/$REPO/contents/$rel" "$TMP\upload.json"
    if ($r -match 'sha') {
        Write-Host "  OK: $rel"
    } else {
        Write-Host "  FAIL: $rel -> $($r.Substring(0,[Math]::Min(120,$r.Length)))"
    }
}

Write-Host "Step 3: enable Pages"
'{"source":{"branch":"main","path":"/"}}' | Out-File -FilePath "$TMP\pages.json" -Encoding utf8
$r = GhApiFile "POST" "/repos/$USER/$REPO/pages" "$TMP\pages.json"
Write-Host "  pages: $($r.Substring(0,[Math]::Min(150,$r.Length)))"

Write-Host ""
Write-Host "=== DONE ==="
Write-Host "Pages URL: https://$USER.github.io/$REPO/"
