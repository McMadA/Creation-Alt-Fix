<?php
/**
 * Creation+Alt+Fix - Server-Side Healthcheck & cURL Probe Endpoint
 * [TASK-827] Live Webserver Uptime, SSL & HTTP Code Resolver
 * 
 * Provides:
 * 1. Low-latency cURL probe directly from the Vimexx server environment
 * 2. Real HTTP status code verification (200, 301, 404, 500)
 * 3. SSL certificate validation & handshake verification
 * 4. Safe domain sanitization & SSRF protection
 */

// Allow CORS from CRM portals & localhost
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$rawDomain = $_GET['domain'] ?? '';
$cleanDomain = strtolower(trim($rawDomain));
$cleanDomain = preg_replace('#^https?://#', '', $cleanDomain);
$cleanDomain = explode('/', $cleanDomain)[0];

if (empty($cleanDomain) || !preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/i', $cleanDomain)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Ongeldig domein opgegeven.'
    ]);
    exit;
}

// Block private IP ranges / localhost / loopback SSRF
$resolvedIp = gethostbyname($cleanDomain);
if ($resolvedIp === $cleanDomain || filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    echo json_encode([
        'success' => false,
        'reachable' => false,
        'domain' => $cleanDomain,
        'http_code' => 0,
        'ssl_valid' => false,
        'message' => 'DNS resolutie mislukt of privé IP-bereik geblokkeerd.',
        'latency_ms' => 0
    ]);
    exit;
}

$url = "https://" . $cleanDomain . "/";
$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_NOBODY => true, // HEAD request
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_TIMEOUT => 5,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT => 'CreationAltFix-UptimeMonitor/2.0 (+https://creationaltfix.nl)',
    CURLOPT_HEADER => false
]);

$start = microtime(true);
$response = curl_exec($ch);
$elapsedMs = round((microtime(true) - $start) * 1000);

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
$primaryIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);

curl_close($ch);

$reachable = ($curlErrno === 0 && $httpCode >= 200 && $httpCode < 400);
$sslValid = ($curlErrno !== CURLE_SSL_CONNECT_ERROR && $curlErrno !== CURLE_PEER_FAILED_VERIFICATION);

echo json_encode([
    'success' => true,
    'domain' => $cleanDomain,
    'reachable' => $reachable,
    'http_code' => $httpCode,
    'ssl_valid' => $sslValid,
    'latency_ms' => $elapsedMs,
    'ip' => $primaryIp ?: $resolvedIp,
    'message' => $reachable ? "Bereikbaar (HTTP {$httpCode})" : ($curlError ?: "HTTP status {$httpCode}")
], JSON_PRETTY_PRINT);
