<?php
/**
 * Creation+Alt+Fix - Mollie iDEAL Payment Creator Endpoint
 * DirectAdmin PHP endpoint voor het initiëren van Mollie iDEAL betalingen.
 * Wordt aangeroepen vanuit het CRM Admin Werkstation.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Ongeldige JSON payload']);
    exit;
}

$projectId = trim($data['projectId'] ?? '');
$invoiceNumber = trim($data['invoiceNumber'] ?? ($data['factuurnummer'] ?? ''));
$clientName = trim($data['clientName'] ?? ($data['klant_naam'] ?? 'Klant'));
$amountIncl = floatval($data['amountIncl'] ?? ($data['bedrag_incl'] ?? 0));
$description = trim($data['description'] ?? ($data['beschrijving'] ?? ""));

if (empty($invoiceNumber) || $amountIncl <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Factuurnummer en een positief bedrag zijn verplicht']);
    exit;
}

if (empty($description)) {
    $description = "Factuur {$invoiceNumber} - Creation+Alt+Fix ({$clientName})";
}

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
$payload = [
    'amount' => [
        'currency' => 'EUR',
        'value' => number_format($amountIncl, 2, '.', '')
    ],
    'description' => $description,
    'redirectUrl' => !empty($input['redirect_url']) 
        ? $input['redirect_url'] 
        : (!empty($input['redirectUrl']) 
            ? $input['redirectUrl'] 
            : ("https://portal.creationaltfix.nl/status/?id=" . urlencode($projectId) . "&paid=true&invoice=" . urlencode($invoiceNumber))),
    'webhookUrl' => "https://portal.creationaltfix.nl/crm/api/mollie-webhook.php",
    'metadata' => [
        'projectId' => $projectId,
        'invoiceNumber' => $invoiceNumber,
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
    $detail = $mollieData['detail'] ?? ($mollieData['error'] ?? 'Onbekende fout van Mollie API');
    echo json_encode([
        'error' => "Mollie API fout: {$detail}",
        'mollie_response' => $mollieData
    ]);
}
