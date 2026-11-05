# =============================================================================
# SMART GROCERY & BUDGET SAFETY TRACKER - POWERSHELL HTTP SERVER
# Berjalan di port 3000 tanpa memerlukan Node.js / Python tambahan di Windows
# =============================================================================

$port = 3000
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host "[Smart Grocery Server Aktif]" -ForegroundColor Green
    Write-Host "Akses aplikasi di browser: $prefix" -ForegroundColor Cyan
    Write-Host "Tekan Ctrl+C di terminal ini untuk menghentikan server." -ForegroundColor Yellow
    Write-Host "===========================================================" -ForegroundColor Green

    $baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    if (-not $baseDir) { $baseDir = Get-Location }

    $mimeTypes = @{
        ".html" = "text/html; charset=utf-8"
        ".js"   = "application/javascript; charset=utf-8"
        ".css"  = "text/css; charset=utf-8"
        ".json" = "application/json; charset=utf-8"
        ".svg"  = "image/svg+xml"
        ".png"  = "image/png"
        ".jpg"  = "image/jpeg"
        ".ico"  = "image/x-icon"
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or [string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "/index.html"
        }

        # Normalize relative path
        $cleanPath = $urlPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $filePath = Join-Path $baseDir $cleanPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.ContentType = "text/plain"
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }

        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
    $listener.Close()
}

