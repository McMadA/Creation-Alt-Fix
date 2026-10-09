<?php
/**
 * Creation+Alt+Fix - Mollie iDEAL Webhook Endpoint (TASK-201)
 * Native PHP webhook endpoint voor DirectAdmin webserver.
 * Ontvangt Mollie callbacks op https://portal.creationaltfix.nl/crm/api/mollie-webhook.php
 */

header('Content-Type: text/plain; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

$paymentId = $_POST['id'] ?? null;
if (!$paymentId) {
    http_response_code(400);
    exit('Missing payment ID');
}

$apiKey = getenv('MOLLIE_API_KEY') ?: '';

$logFile = __DIR__ . '/mollie-payments-log.json';
$existingLogs = file_exists($logFile) ? json_decode(file_get_contents($logFile), true) : [];
if (!is_array($existingLogs)) {
    $existingLogs = [];
}

if (!empty($apiKey)) {
    // Vraag payment details op via cURL naar api.mollie.com
    $ch = curl_init("https://api.mollie.com/v2/payments/{$paymentId}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer {$apiKey}",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $payment = json_decode($response, true);
        $status = $payment['status'] ?? 'unknown';
        $invoiceNumber = $payment['metadata']['invoiceNumber'] ?? 'ONBEKEND';
        $clientName = $payment['metadata']['clientName'] ?? 'Klant';

        $record = [
            'paymentId' => $paymentId,
            'invoiceNumber' => $invoiceNumber,
            'clientName' => $clientName,
            'status' => $status,
            'amount' => $payment['amount']['value'] ?? '0.00',
            'currency' => $payment['amount']['currency'] ?? 'EUR',
            'method' => $payment['method'] ?? 'ideal',
            'paidAt' => ($status === 'paid') ? date('c') : null,
            'updatedAt' => date('c')
        ];

        array_unshift($existingLogs, $record);
        file_put_contents($logFile, json_encode($existingLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
} else {
    // Fallback log
    $record = [
        'paymentId' => $paymentId,
        'invoiceNumber' => 'SIMULATED-PAYMENT',
        'status' => 'paid',
        'updatedAt' => date('c')
    ];
    array_unshift($existingLogs, $record);
    file_put_contents($logFile, json_encode($existingLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

// Altijd HTTP 200 OK terugsturen naar Mollie
http_response_code(200);
echo 'OK';
