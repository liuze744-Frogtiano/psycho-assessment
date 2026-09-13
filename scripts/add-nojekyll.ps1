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

# 上传 .nojekyll 文件
$rel = ".nojekyll"
$obj = @{ message = "add .nojekyll"; content = ""; branch = "main" }
$json = $obj | ConvertTo-Json -Compress
Write-JsonNoBom "$TMP\upload.json" $json
$r = GhApiFile "PUT" "/repos/$USER/$REPO/contents/$rel" "$TMP\upload.json"
if ($r -match '"sha"') {
    Write-Host "OK: .nojekyll uploaded"
} else {
    # 可能已存在，获取 sha 更新
    $get = GhApiFile "GET" "/repos/$USER/$REPO/contents/$rel`?ref=main" $null
    try {
        $sha = ($get | ConvertFrom-Json).sha
        $obj.sha = $sha
        $json = $obj | ConvertTo-Json -Compress
        Write-JsonNoBom "$TMP\upload.json" $json
        $r = GhApiFile "PUT" "/repos/$USER/$REPO/contents/$rel" "$TMP\upload.json"
        Write-Host "updated: .nojekyll"
    } catch {
        Write-Host "FAIL: .nojekyll -> $($r.Substring(0,[Math]::Min(150,$r.Length)))"
    }
}
