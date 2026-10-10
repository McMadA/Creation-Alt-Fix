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
    $rawInput = file_get_contents('php://input', false, null, 0, 10240);
    if (!empty($rawInput)) {
        $jsonBody = json_decode($rawInput, true);
        if (is_array($jsonBody) && !empty($jsonBody['id'])) {
            $paymentId = $jsonBody['id'];
        }
    }
}

if (!$paymentId || !preg_match('/^tr_[a-zA-Z0-9]{5,32}$/', $paymentId)) {
    http_response_code(400);
    exit('Missing or invalid payment ID format');
}

$apiKey = getenv('MOLLIE_API_KEY') ?: '';

// Fallback: lees MOLLIE_API_KEY uit .env bestand in bovenliggende crm map
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
    error_log("[Mollie Webhook] Fout: MOLLIE_API_KEY ontbreekt op de server.");
    exit('Server Configuration Error: Missing MOLLIE_API_KEY');
}

// Vraag payment details op via cURL naar api.mollie.com
$ch = curl_init("https://api.mollie.com/v2/payments/" . urlencode($paymentId));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
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
curl_close($ch);

if ($httpCode === 200) {
    $payment = json_decode($response, true);
    $status = $payment['status'] ?? 'unknown';
    $invoiceNumber = preg_replace('/[^\w\-\/]/', '', $payment['metadata']['invoiceNumber'] ?? 'ONBEKEND');
    $clientName = substr(strip_tags(trim($payment['metadata']['clientName'] ?? 'Klant')), 0, 80);

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

    $logFile = __DIR__ . '/mollie-payments-log.json';
    $fp = fopen($logFile, 'c+');
    if ($fp) {
        if (flock($fp, LOCK_EX)) {
            rewind($fp);
            $content = stream_get_contents($fp);
            $existingLogs = !empty($content) ? json_decode($content, true) : [];
            if (!is_array($existingLogs)) {
                $existingLogs = [];
            }

            // Dedupliceer of update bestaand record
            $found = false;
            foreach ($existingLogs as &$existing) {
                if (isset($existing['paymentId']) && $existing['paymentId'] === $paymentId) {
                    $existing = $record;
                    $found = true;
                    break;
                }
            }
            unset($existing);

            if (!$found) {
                array_unshift($existingLogs, $record);
            }

            // Beperk geheugengrootte tot maximaal 100 records
            if (count($existingLogs) > 100) {
                $existingLogs = array_slice($existingLogs, 0, 100);
            }

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($existingLogs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);
        @chmod($logFile, 0600);
    }
} else {
    error_log("[Mollie Webhook] Kon payment {$paymentId} niet verifiëren bij Mollie API (HTTP {$httpCode}).");
}

// Altijd HTTP 200 OK terugsturen naar Mollie om herhaalde retries te voorkomen
http_response_code(200);
echo 'OK';
