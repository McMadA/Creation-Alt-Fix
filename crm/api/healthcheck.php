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
 * 6. Resilient exception boundary preventing blank 500 fatal errors
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return;
    }
    throw new \ErrorException($message, 0, $severity, $file, $line);
});

try {
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
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    // IP-based Rate Limiter (Max 240 calls per 60s per IP to allow multi-domain batches + immediate retries)
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
    if ($rateData['count'] > 240) {
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

    // Optional subpath support (e.g. /liviandesign/ or /besselinginstallatietechniek/)
    $rawPath = $_GET['path'] ?? '/';
    $cleanPath = '/';
    if (!empty($rawPath)) {
        $trimmedPath = '/' . ltrim(trim($rawPath), '/');
        $cleanPath = preg_replace('/[^\w\-.\/]/', '', $trimmedPath);
        if (empty($cleanPath)) $cleanPath = '/';
    }

    // Block private IP ranges / localhost / loopback SSRF
    $resolvedIp = gethostbyname($cleanDomain);
    if ($resolvedIp === $cleanDomain || filter_var($resolvedIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
        echo json_encode([
            'success' => false,
            'reachable' => false,
            'domain' => $cleanDomain,
            'path' => $cleanPath,
            'http_code' => 0,
            'ssl_valid' => false,
            'message' => 'DNS resolutie mislukt of privé/intern IP-bereik geblokkeerd.',
            'latency_ms' => 0
        ]);
        exit;
    }

    $headers = [];
    $url = "https://" . $cleanDomain . $cleanPath;
    $ch = curl_init($url);

    $curlOptions = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_NOBODY => true, // HEAD request
        CURLOPT_FOLLOWLOCATION => false, // Disables redirect SSRF into internal networks
        CURLOPT_TIMEOUT => 6,
        CURLOPT_CONNECTTIMEOUT => 4,
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
    ];

    // DNS Pinning: forces cURL to use the verified IP, defeating TOCTOU DNS rebinding
    $curlOptions[CURLOPT_RESOLVE] = [
        "{$cleanDomain}:443:{$resolvedIp}",
        "{$cleanDomain}:80:{$resolvedIp}"
    ];

    // Restrict protocols to HTTPS and HTTP
    if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS') && defined('CURLPROTO_HTTP')) {
        $curlOptions[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS | CURLPROTO_HTTP;
    }
    if (defined('CURLOPT_REDIR_PROTOCOLS')) {
        $curlOptions[CURLOPT_REDIR_PROTOCOLS] = 0;
    }

    curl_setopt_array($ch, $curlOptions);

    $start = microtime(true);
    $response = curl_exec($ch);
    $elapsedMs = round((microtime(true) - $start) * 1000);

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlErrno = curl_errno($ch);
    $primaryIp = curl_getinfo($ch, CURLINFO_PRIMARY_IP);

    curl_close($ch);

    // Standard libcurl SSL error numbers (eliminates PHP constant compatibility pitfalls):
    // 35: CURLE_SSL_CONNECT_ERROR
    // 51: Peer certificate verification failed (error 51)
    // 58: CURLE_SSL_CERTPROBLEM
    // 59: CURLE_SSL_CIPHER
    // 60: CURLE_SSL_CACERT
    // 77: CURLE_SSL_CACERT_BADFILE
    // 80: CURLE_SSL_SHUTDOWN_FAILED
    // 82: CURLE_SSL_CRL_BADFILE
    // 83: CURLE_SSL_ISSUER_ERROR
    // 90: CURLE_SSL_PINNEDPUBKEYNOTMATCH
    // 91: CURLE_SSL_INVALIDCERTSTATUS
    $sslErrorCodes = [35, 51, 58, 59, 60, 77, 80, 82, 83, 90, 91];
    $isSslError = in_array($curlErrno, $sslErrorCodes, true);
    $sslValid = ($curlErrno === 0 || !$isSslError);

    $reachable = ($curlErrno === 0 && $httpCode >= 200 && $httpCode < 500);

    $xFrame = strtolower($headers['x-frame-options'] ?? '');
    $csp = strtolower($headers['content-security-policy'] ?? '');
    $frameBlocked = (
        strpos($xFrame, 'deny') !== false ||
        strpos($xFrame, 'sameorigin') !== false ||
        preg_match("/frame-ancestors\s+[^;]*(none|'none'|self|'self')/i", $csp) === 1
    );

    $statusMsg = $reachable 
        ? "Bereikbaar (HTTP {$httpCode})" 
        : ($curlError ?: ($httpCode > 0 ? "HTTP status {$httpCode}" : "Verbinding mislukt (cURL code {$curlErrno})"));

    echo json_encode([
        'success' => true,
        'domain' => $cleanDomain,
        'path' => $cleanPath,
        'reachable' => $reachable,
        'http_code' => $httpCode,
        'ssl_valid' => $sslValid,
        'latency_ms' => $elapsedMs,
        'ip' => $primaryIp ?: $resolvedIp,
        'frame_blocked' => $frameBlocked,
        'x_frame_options' => $headers['x-frame-options'] ?? null,
        'message' => $statusMsg
    ], JSON_PRETTY_PRINT);

} catch (\Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'domain' => $cleanDomain ?? '',
        'path' => $cleanPath ?? '/',
        'reachable' => false,
        'http_code' => 500,
        'ssl_valid' => false,
        'latency_ms' => 0,
        'message' => 'Server Healthcheck Fout: ' . $e->getMessage(),
        'error_detail' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
    exit;
}
