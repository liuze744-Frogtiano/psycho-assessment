$USER = "liuze744-Frogtiano"
if (-not $env:GITHUB_TOKEN) { Write-Error "缺少环境变量 GITHUB_TOKEN，请先设置后再运行（参考 .env.example）。"; exit 1 }
$TOKEN = $env:GITHUB_TOKEN
$REPO = "psycho-assessment"
$AUTH = $USER + ":" + $TOKEN
$BASE = "https://api.github.com"

function GhApi($method, $path, $body) {
    $args = @("-s", "-u", $AUTH, "-X", $method, "$BASE$path", "-H", "Accept: application/vnd.github+json", "-H", "User-Agent: deploy-script")
    if ($body) {
        $args += @("-H", "Content-Type: application/json", "-d", $body)
    }
    $out = & curl.exe @args 2>$null
    return $out
}

Write-Host "Step 1: create repo"
$body = '{"name":"psycho-assessment","description":"psycho assessment frontend","private":false,"auto_init":false}'
$r = GhApi "POST" "/user/repos" $body
Write-Host "  repo response length: $($r.Length)"

Write-Host "Step 2: upload files"
$publicDir = "c:\Users\Administrator\Desktop\psychological assessment\public"
$files = Get-ChildItem -Path $publicDir -Recurse -File
foreach ($f in $files) {
    $rel = $f.FullName.Substring($publicDir.Length + 1).Replace("\", "/")
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $b64 = [System.Convert]::ToBase64String($bytes)
    $jsonBody = @{ message = "deploy: $rel"; content = $b64; branch = "main" } | ConvertTo-Json -Compress

    $r = GhApi "PUT" "/repos/$USER/$REPO/contents/$rel" $jsonBody
    if ($r -match 'sha') {
        Write-Host "  OK: $rel"
    } else {
        $get = GhApi "GET" "/repos/$USER/$REPO/contents/$rel`?ref=main" $null
        try {
            $sha = ($get | ConvertFrom-Json).sha
        } catch { $sha = $null }
        if ($sha) {
            $updateBody = @{ message = "update: $rel"; content = $b64; sha = $sha; branch = "main" } | ConvertTo-Json -Compress
            $r = GhApi "PUT" "/repos/$USER/$REPO/contents/$rel" $updateBody
            Write-Host "  updated: $rel"
        } else {
            Write-Host "  FAILED: $rel"
        }
    }
}

Write-Host "Step 3: enable GitHub Pages"
$pagesBody = '{"source":{"branch":"main","path":"/"}}'
$r = GhApi "POST" "/repos/$USER/$REPO/pages" $pagesBody
Write-Host "  pages response: $($r.Substring(0,[Math]::Min(200,$r.Length)))"

Write-Host ""
Write-Host "=== DONE ==="
Write-Host "Repo: https://github.com/$USER/$REPO"
Write-Host "Pages: https://$USER.github.io/$REPO/"
Write-Host "(Pages takes 1-2 min to activate)"
