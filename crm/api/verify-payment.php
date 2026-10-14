<?php
/**
 * Creation+Alt+Fix - Mollie Payment Verification & Status Bridge
 * [TASK-202] Verifies real-time payment settlement from mollie-payments-log.json.
 * 
 * Bridges the gap between Mollie Webhook callbacks and client/admin interfaces.
 * Allows client portal (/status/?paid=true) to immediately verify payment without
 * waiting for asynchronous manual Firestore updates.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Restrict CORS to authorized portal domains and local loopback
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$allowedOrigins = [
    'https://portal.creationaltfix.nl',
    'https://creationaltfix.nl',
    'https://www.creationaltfix.nl'
];
$originMatched = false;
if (!empty($origin)) {
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
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$rawInvoice = $_GET['invoice'] ?? ($_GET['factuurnummer'] ?? '');
$rawProject = $_GET['projectId'] ?? '';

$cleanInvoice = substr(preg_replace('/[^\w\-\/]/', '', trim($rawInvoice)), 0, 32);
$cleanProjectId = substr(preg_replace('/[^\w\-]/', '', trim($rawProject)), 0, 64);

if (empty($cleanInvoice)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Factuurnummer parameter is verplicht']);
    exit;
}

$logFile = __DIR__ . '/mollie-payments-log.json';
if (!file_exists($logFile) || !is_readable($logFile)) {
    echo json_encode([
        'success' => true,
        'paid' => false,
        'invoiceNumber' => $cleanInvoice,
        'message' => 'Geen betaallog aanwezig op de server'
    ]);
    exit;
}

$fp = fopen($logFile, 'r');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Kon betaallog niet openen']);
    exit;
}

$matchedPayment = null;
if (flock($fp, LOCK_SH)) {
    $content = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $logs = !empty($content) ? json_decode($content, true) : [];
    if (is_array($logs)) {
        foreach ($logs as $entry) {
            $entryInv = $entry['invoiceNumber'] ?? '';
            if (strcasecmp($entryInv, $cleanInvoice) === 0) {
                $matchedPayment = $entry;
                break;
            }
        }
    }
} else {
    fclose($fp);
}

if ($matchedPayment && isset($matchedPayment['status']) && strtolower($matchedPayment['status']) === 'paid') {
    echo json_encode([
        'success' => true,
        'paid' => true,
        'invoiceNumber' => $cleanInvoice,
        'paymentId' => $matchedPayment['paymentId'] ?? null,
        'amount' => $matchedPayment['amount'] ?? '0.00',
        'currency' => $matchedPayment['currency'] ?? 'EUR',
        'method' => $matchedPayment['method'] ?? 'ideal',
        'paidAt' => $matchedPayment['paidAt'] ?? date('c'),
        'clientName' => $matchedPayment['clientName'] ?? ''
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'paid' => false,
    'invoiceNumber' => $cleanInvoice,
    'status' => $matchedPayment['status'] ?? 'pending'
]);
