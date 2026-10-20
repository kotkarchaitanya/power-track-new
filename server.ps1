# PowerTrack Local HTTP & REST API Server
# Zero external dependencies - Runs natively on Windows PowerShell 5.1 / 7+

param(
    [int]$Port = 8085
)

$Host.UI.RawUI.WindowTitle = "⚡ PowerTrack Server - http://localhost:$Port"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$dataFile = Join-Path $scriptDir "data.json"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "             ⚡ POWERTRACK SERVER RUNNING                " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " URL: http://localhost:$Port/" -ForegroundColor Green
Write-Host " Serving directory: $scriptDir" -ForegroundColor White
Write-Host " Data file: $dataFile" -ForegroundColor White
Write-Host " Press Ctrl+C in this window to stop the server." -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure data.json exists
if (-not (Test-Path $dataFile)) {
    Write-Host "Warning: data.json not found! Creating default data..." -ForegroundColor Yellow
    # (data.json already exists in workspace)
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Error starting listener on $prefix : $_" -ForegroundColor Red
    Write-Host "Trying fallback port 8088..." -ForegroundColor Yellow
    $Port = 8088
    $prefix = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

function Send-Response {
    param(
        [System.Net.HttpListenerResponse]$response,
        [int]$statusCode,
        [string]$contentType,
        [byte[]]$contentBytes
    )
    $response.StatusCode = $statusCode
    $response.ContentType = $contentType
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
    $response.ContentLength64 = $contentBytes.Length
    $response.OutputStream.Write($contentBytes, 0, $contentBytes.Length)
    $response.OutputStream.Close()
}

function Send-JsonResponse {
    param(
        [System.Net.HttpListenerResponse]$response,
        [int]$statusCode,
        [object]$data
    )
    $json = $data | ConvertTo-Json -Depth 10 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    Send-Response -response $response -statusCode $statusCode -contentType "application/json; charset=utf-8" -contentBytes $bytes
}

function Read-RequestBody {
    param([System.Net.HttpListenerRequest]$request)
    if ($request.ContentLength64 -gt 0) {
        $buffer = New-Object byte[] $request.ContentLength64
        $readCount = 0
        while ($readCount -lt $request.ContentLength64) {
            $read = $request.InputStream.Read($buffer, $readCount, $request.ContentLength64 - $readCount)
            if ($read -le 0) { break }
            $readCount += $read
        }
        return [System.Text.Encoding]::UTF8.GetString($buffer, 0, $readCount)
    }
    return ""
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.AbsolutePath
        $method = $request.HttpMethod

        # CORS preflight
        if ($method -eq "OPTIONS") {
            Send-Response -response $response -statusCode 200 -contentType "text/plain" -contentBytes ([byte[]]@())
            continue
        }

        # ---------------- API ROUTES ----------------
        if ($urlPath.StartsWith("/api/")) {
            if ($urlPath -eq "/api/data" -and $method -eq "GET") {
                if (Test-Path $dataFile) {
                    $jsonText = [System.IO.File]::ReadAllText($dataFile, [System.Text.Encoding]::UTF8)
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonText)
                    Send-Response -response $response -statusCode 200 -contentType "application/json; charset=utf-8" -contentBytes $bytes
                } else {
                    Send-JsonResponse -response $response -statusCode 404 -data @{ error = "data.json not found" }
                }
                continue
            }

            if ($urlPath -eq "/api/save" -and $method -eq "POST") {
                $body = Read-RequestBody -request $request
                if ($body) {
                    [System.IO.File]::WriteAllText($dataFile, $body, [System.Text.Encoding]::UTF8)
                    Send-JsonResponse -response $response -statusCode 200 -data @{ success = $true; message = "Data updated successfully" }
                } else {
                    Send-JsonResponse -response $response -statusCode 400 -data @{ success = $false; error = "Empty payload" }
                }
                continue
            }

            if ($urlPath -eq "/api/login" -and $method -eq "POST") {
                $body = Read-RequestBody -request $request
                $creds = $body | ConvertFrom-Json
                if ($creds.username -eq "admin" -and $creds.password -eq "admin123") {
                    Send-JsonResponse -response $response -statusCode 200 -data @{ success = $true; token = "powertrack-admin-token-authenticated"; username = "admin" }
                } else {
                    Send-JsonResponse -response $response -statusCode 401 -data @{ success = $false; message = "Invalid username or password" }
                }
                continue
            }

            # Unhandled API endpoint
            Send-JsonResponse -response $response -statusCode 404 -data @{ error = "API endpoint not found" }
            continue
        }

        # ---------------- STATIC FILE SERVING ----------------
        $localPath = $urlPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($localPath) -or $localPath -eq "/") {
            $localPath = "index.html"
        }
        
        $filePath = Join-Path $scriptDir $localPath

        # If not found directly, check if it's an asset requested with a subroute prefix (e.g. /admin/css/style.css)
        if (-not (Test-Path $filePath -PathType Leaf)) {
            if ($localPath -match "(css/.+|js/.+|assets/.+|data\.json|favicon\.ico)") {
                $candidate = Join-Path $scriptDir $matches[1]
                if (Test-Path $candidate -PathType Leaf) {
                    $filePath = $candidate
                }
            }
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $cType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $cType = $mimeTypes[$ext]
            }
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            Send-Response -response $response -statusCode 200 -contentType $cType -contentBytes $fileBytes
        } else {
            # 404 fallback to index.html for SPA if not static file
            $fallback = Join-Path $scriptDir "index.html"
            if (Test-Path $fallback) {
                $fileBytes = [System.IO.File]::ReadAllBytes($fallback)
                Send-Response -response $response -statusCode 200 -contentType "text/html; charset=utf-8" -contentBytes $fileBytes
            } else {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
                Send-Response -response $response -statusCode 404 -contentType "text/plain" -contentBytes $notFound
            }
        }
    } catch {
        # Loop continues on transient errors
    }
}
