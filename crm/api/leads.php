<?php
/**
 * Creation+Alt+Fix - Secure Leads Data API Endpoint
 * Serves canonical leads from crm/admin/data/leads.json to the authenticated CRM Admin Dashboard.
 * 
 * Hardened Security Features:
 * 1. Strict CORS validation (authorized portal domains & local development loopbacks only)
 * 2. Blocks direct unauthenticated web crawler scraping
 * 3. Safe read of leads.json from the protected data directory
 * 4. Anti-caching HTTP headers ensuring fresh real-time CRM queue view
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
    $origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $allowedOrigins = [
        'https://creationaltfix.nl',
        'https://www.creationaltfix.nl',
        'https://portal.creationaltfix.nl'
    ];
    $originMatched = false;
    
    if (!empty($origin)) {
        // Strip trailing path/query if checking referer
        $parsedOrigin = parse_url($origin);
        $originHost = ($parsedOrigin['scheme'] ?? 'https') . '://' . ($parsedOrigin['host'] ?? '');
        if (!empty($parsedOrigin['port'])) {
            $originHost .= ':' . $parsedOrigin['port'];
        }

        foreach ($allowedOrigins as $allowed) {
            if ($originHost === $allowed || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $originHost)) {
                header("Access-Control-Allow-Origin: " . $originHost);
                header("Vary: Origin");
                $originMatched = true;
                break;
            }
        }
    }

    if (!$originMatched) {
        header("Access-Control-Allow-Origin: https://portal.creationaltfix.nl");
    }

    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-caf-auth");
    header("Content-Type: application/json; charset=UTF-8");
    header("X-Content-Type-Options: nosniff");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }

    // Server-Side Authentication Guard: Verify Firebase ID token for Admin whitelist
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
    }

    $idToken = '';
    if (preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
        $idToken = $matches[1];
    }

    $firebaseApiKey = getenv('FIREBASE_WEB_API_KEY') ?: 'AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8';
    $isAuthenticatedAdmin = false;

    if (!empty($idToken)) {
        $ch = curl_init("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" . $firebaseApiKey);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['idToken' => $idToken]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) {
            curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
        }
        $verifyRes = curl_exec($ch);
        $verifyCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($verifyCode === 200) {
            $parsed = json_decode($verifyRes, true);
            $userEmail = strtolower($parsed['users'][0]['email'] ?? '');
            $allowedAdmins = ['allardv03@gmail.com', 'info@creationaltfix.nl'];
            if (in_array($userEmail, $allowedAdmins, true)) {
                $isAuthenticatedAdmin = true;
            }
        }
    }

    // Strikte authenticatie: webverzoeken vereisen een geverifieerd admin token.
    // Alleen CLI scripts (php_sapi_name === 'cli') hebben lokale testtoegang.
    $isCli = (php_sapi_name() === 'cli');

    if (!$isAuthenticatedAdmin && !$isCli) {
        http_response_code(401);
        echo json_encode(['error' => 'Ongeautoriseerd: Alleen beheerders met een geldig Firebase ID token mogen leads opvragen.']);
        exit;
    }

    // Path to canonical leads database in protected admin data folder
    $leadsFilePath = __DIR__ . '/../admin/data/leads.json';

    if (!file_exists($leadsFilePath) || !is_readable($leadsFilePath)) {
        http_response_code(200);
        echo json_encode([
            'updatedAt' => date('c'),
            'totalScanned' => 0,
            'totalQualified' => 0,
            'totalGenerated' => 0,
            'totalSent' => 0,
            'leads' => []
        ]);
        exit;
    }

    $rawContent = file_get_contents($leadsFilePath);
    if ($rawContent === false || trim($rawContent) === '') {
        http_response_code(500);
        echo json_encode(['error' => 'Leads database is leeg of onleesbaar']);
        exit;
    }

    // Validate JSON structure
    $decoded = json_decode($rawContent, true);
    if (!is_array($decoded) || !isset($decoded['leads'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Corrupte leads database structuur']);
        exit;
    }

    http_response_code(200);
    echo $rawContent;
    exit;

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Interne serverfout bij ophalen leads',
        'details' => $e->getMessage()
    ]);
    exit;
}
