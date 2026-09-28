<?php
/**
 * Creation+Alt+Fix - Server-Side Healthcheck & cURL Probe Endpoint
 * [TASK-827] Live Webserver Uptime, SSL & HTTP Code Resolver
 * 
 * Hardened Security Features:
 * 1. Origin-validated CORS (denies wildcards)
 * 2. Strict DNS Pinning via CURLOPT_RESOLVE (defeats TOCTOU DNS rebinding)
 * 3. Disabled CURLOPT_FOLLOWLOCATION (defeats redirect SSRF to loopback/private services)
 * 4. Protocol restriction to HTTPS/HTTP only
 * 5. IP-based rate limiting & private RFC1918 / Cloud Metadata SSRF filtering
 */

// Restrict CORS to authorized origins
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://creationaltfix.nl',
    'https://www.creationaltfix.nl',
    'https://portal.creationaltfix.nl'
];
$originMatched = false;
if (!empty($origin)) {
    foreach ($allowedOrigins as $allowed) {
        if ($origin === $allowed || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
            header("Access-Control-Allow-Origin: " . $origin);
            header("Vary: Origin");
            $originMatched = true;
            break;
        }
    }
}
if (!$originMatched) {
    header("Access-Control-Allow-Origin: https://creationaltfix.nl");
}

header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// IP-based Rate Limiter (Max 60 calls per minute per IP to prevent DoS)
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$rateFile = sys_get_temp_dir() . '/caf_hc_' . md5($clientIp);
$now = time();
$rateData = ['count' => 0, 'window' => $now];

if (file_exists($rateFile)) {
    $raw = @file_get_contents($rateFile);
    if ($raw) {
        $parsed = @json_decode($raw, true);
        if (is_array($parsed) && isset($parsed['window']) && ($now - $parsed['window']) < 60) {
            $rateData = $parsed;
        }
    }
}
$rateData['count']++;
if ($rateData['count'] > 60) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Te veel verzoeken (rate limit bereikt). Probeer het over een minuut opnieuw.'
    ]);
    exit;
}
@file_put_contents($rateFile, json_encode($rateData));

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
        'message' => 'DNS resolutie mislukt of privé/intern IP-bereik geblokkeerd.',
        'latency_ms' => 0
    ]);
    exit;
}

$headers = [];
$url = "https://" . $cleanDomain . "/";
$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_NOBODY => true, // HEAD request
    CURLOPT_FOLLOWLOCATION => false, // Disables redirect SSRF into internal networks
    CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
    CURLOPT_REDIR_PROTOCOLS => 0,
    // DNS Pinning: forces cURL to use the verified IP, defeating TOCTOU DNS rebinding
    CURLOPT_RESOLVE => [
        "{$cleanDomain}:443:{$resolvedIp}",
        "{$cleanDomain}:80:{$resolvedIp}"
    ],
    CURLOPT_TIMEOUT => 5,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT => 'CreationAltFix-UptimeMonitor/2.0 (+https://creationaltfix.nl)',
    CURLOPT_HEADERFUNCTION => function($curl, $header) use (&$headers) {
        $len = strlen($header);
        $parts = explode(':', $header, 2);
        if (count($parts) === 2) {
            $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
        }
        return $len;
    }
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

$xFrame = strtolower($headers['x-frame-options'] ?? '');
$csp = strtolower($headers['content-security-policy'] ?? '');
$frameBlocked = (
    strpos($xFrame, 'deny') !== false ||
    strpos($xFrame, 'sameorigin') !== false ||
    preg_match("/frame-ancestors\s+[^;]*(none|'none'|self|'self')/i", $csp) === 1
);

echo json_encode([
    'success' => true,
    'domain' => $cleanDomain,
    'reachable' => $reachable,
    'http_code' => $httpCode,
    'ssl_valid' => $sslValid,
    'latency_ms' => $elapsedMs,
    'ip' => $primaryIp ?: $resolvedIp,
    'frame_blocked' => $frameBlocked,
    'x_frame_options' => $headers['x-frame-options'] ?? null,
    'message' => $reachable ? "Bereikbaar (HTTP {$httpCode})" : ($curlError ?: "HTTP status {$httpCode}")
], JSON_PRETTY_PRINT);
