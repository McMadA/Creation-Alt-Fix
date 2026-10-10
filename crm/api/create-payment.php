<?php
/**
 * Creation+Alt+Fix - Mollie iDEAL Payment Creator Endpoint
 * DirectAdmin PHP endpoint voor het initiëren van Mollie iDEAL betalingen.
 * Wordt aangeroepen vanuit het CRM Admin Werkstation.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Restrict CORS to authorized portal domains and loopback development
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://portal.creationaltfix.nl',
    'https://creationaltfix.nl',
    'https://www.creationaltfix.nl'
];
$originMatched = false;
if (!empty($origin)) {
    if (in_array($origin, $allowedOrigins, true) || preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Vary: Origin");
        $originMatched = true;
    }
    if (!$originMatched) {
        http_response_code(403);
        echo json_encode(['error' => 'Origin niet toegestaan']);
        exit;
    }
} else {
    header("Access-Control-Allow-Origin: https://portal.creationaltfix.nl");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

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
    echo json_encode(['error' => 'Ongeautoriseerd: Alleen beheerders met een geldig Firebase ID token mogen betaallinks genereren.']);
    exit;
}

$rawBody = file_get_contents('php://input', false, null, 0, 10240);
$data = json_decode($rawBody, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige JSON payload']);
    exit;
}

$projectId = trim($data['projectId'] ?? '');
$invoiceNumber = trim($data['invoiceNumber'] ?? ($data['factuurnummer'] ?? ''));
$clientName = substr(strip_tags(trim($data['clientName'] ?? ($data['klant_naam'] ?? 'Klant'))), 0, 80);
$amountIncl = floatval($data['amountIncl'] ?? ($data['bedrag_incl'] ?? 0));
$rawDesc = trim($data['description'] ?? ($data['beschrijving'] ?? ""));

$cleanProjectId = preg_replace('/[^\w\-]/', '', $projectId);
$cleanInvNumber = preg_replace('/[^\w\-\/]/', '', $invoiceNumber);

if (empty($cleanProjectId) || empty($cleanInvNumber) || $amountIncl < 0.01 || $amountIncl > 50000) {
    http_response_code(400);
    echo json_encode(['error' => 'Factuurnummer en een positief bedrag (max. € 50.000,-) zijn verplicht']);
    exit;
}

if (empty($rawDesc)) {
    $description = "Factuur {$invoiceNumber} - Creation+Alt+Fix ({$clientName})";
} else {
    $description = $rawDesc;
}
// Strip HTML tags, control tekens en begrenzen tot Mollie API limiet (128 tekens)
$description = substr(preg_replace('/[\x00-\x1F\x7F]/', '', strip_tags($description)), 0, 128);

// 1. Sleutel ophalen uit environment of .env
$apiKey = getenv('MOLLIE_API_KEY') ?: '';
if (empty($apiKey)) {
    $envFile = dirname(__DIR__) . '/.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || $line[0] === '#') continue;
            if (strpos($line, '=') !== false) {
                list($k, $v) = explode('=', $line, 2);
                if (trim($k) === 'MOLLIE_API_KEY') {
                    $apiKey = trim($v, " \t\n\r\0\x0B\"'");
                    break;
                }
            }
        }
    }
}

if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(['error' => 'Geen MOLLIE_API_KEY geconfigureerd op de server']);
    exit;
}

// 2. Betaal-payload voor Mollie samenstellen
// Forceer redirect URL strikt naar portal domein om open-redirect te voorkomen
$cleanProjectId = preg_replace('/[^\w\-]/', '', $projectId);
$cleanInvNumber = preg_replace('/[^\w\-\/]/', '', $invoiceNumber);
$safeRedirectUrl = "https://portal.creationaltfix.nl/status/?id=" . urlencode($cleanProjectId) . "&paid=true&invoice=" . urlencode($cleanInvNumber);

$payload = [
    'amount' => [
        'currency' => 'EUR',
        'value' => number_format($amountIncl, 2, '.', '')
    ],
    'description' => $description,
    'redirectUrl' => $safeRedirectUrl,
    'webhookUrl' => "https://portal.creationaltfix.nl/crm/api/mollie-webhook.php",
    'metadata' => [
        'projectId' => $cleanProjectId,
        'invoiceNumber' => $cleanInvNumber,
        'clientName' => $clientName
    ]
];

// 3. Verstuur POST request naar Mollie API v2
$ch = curl_init('https://api.mollie.com/v2/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {$apiKey}",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
if (defined('CURLOPT_PROTOCOLS') && defined('CURLPROTO_HTTPS')) {
    curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
}
if (defined('CURLOPT_REDIR_PROTOCOLS')) {
    curl_setopt($ch, CURLOPT_REDIR_PROTOCOLS, 0);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => "cURL fout naar Mollie: {$curlErr}"]);
    exit;
}

$mollieData = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300 && isset($mollieData['_links']['checkout']['href'])) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'payment_id' => $mollieData['id'],
        'checkout_url' => $mollieData['_links']['checkout']['href'],
        'status' => $mollieData['status'] ?? 'open',
        'invoiceNumber' => $invoiceNumber
    ]);
} else {
    http_response_code($httpCode >= 400 ? $httpCode : 500);
    $detail = substr(strip_tags($mollieData['detail'] ?? ($mollieData['error'] ?? 'Onbekende fout van Mollie API')), 0, 200);
    echo json_encode([
        'error' => "Mollie API fout: {$detail}"
    ]);
}
