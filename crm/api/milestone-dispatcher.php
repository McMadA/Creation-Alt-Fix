<?php
/**
 * Creation+Alt+Fix - Server-Side Milestone Dispatcher Endpoint
 * [TASK-909] Geautomatiseerde WhatsApp & E-mail Milestone Triggers
 * 
 * Hardened Security Features:
 * 1. Origin-validated CORS (denies wildcards)
 * 2. IP-based Rate Limiter (Max 60 requests per 60 seconds per IP with atomic file lock)
 * 3. Method validation (POST only, preflight OPTIONS)
 * 4. CWE-93 CRLF Header Injection Mitigatie (strips control characters & line breaks)
 * 5. Strict input boundary validation (projectId, clientEmail, milestoneKey, portalLink)
 * 6. Atomic dispatch logging with secure 0600 permissions
 * 7. Resilient exception boundary preventing blank 500 fatal errors
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
    // 1. Restrict CORS to authorized origins
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
        header("Access-Control-Allow-Origin: https://portal.creationaltfix.nl");
    }

    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");
    header("X-Content-Type-Options: nosniff");
    header("Referrer-Policy: strict-origin-when-cross-origin");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Methode niet toegestaan. Alleen POST verzoeken worden verwerkt.'
        ]);
        exit;
    }

    // 2. IP-based Rate Limiter (Max 60 requests per 60s per IP)
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $rateFile = sys_get_temp_dir() . '/caf_md_' . md5($clientIp);
    $now = time();
    $rateData = ['count' => 0, 'window' => $now];

    $rf = @fopen($rateFile, 'c+');
    if ($rf) {
        if (@flock($rf, LOCK_EX)) {
            @rewind($rf);
            $raw = @stream_get_contents($rf);
            if ($raw) {
                $parsed = @json_decode($raw, true);
                if (is_array($parsed) && isset($parsed['window']) && ($now - $parsed['window']) < 60) {
                    $rateData = $parsed;
                }
            }
            $rateData['count']++;
            if ($rateData['count'] > 60) {
                @flock($rf, LOCK_UN);
                @fclose($rf);
                http_response_code(429);
                echo json_encode([
                    'success' => false,
                    'error' => 'Te veel verzoeken (rate limit bereikt). Probeer het over een minuut opnieuw.'
                ]);
                exit;
            }
            @ftruncate($rf, 0);
            @rewind($rf);
            @fwrite($rf, json_encode($rateData));
            @fflush($rf);
            @flock($rf, LOCK_UN);
        }
        @fclose($rf);
        @chmod($rateFile, 0600);
    }

    // 3. Read and Decode JSON Payload
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Geen data ontvangen in verzoek.'
        ]);
        exit;
    }

    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Ongeldig JSON formaat.'
        ]);
        exit;
    }

    // 4. Input Sanitization & Whitelisting
    $projectId = trim($input['projectId'] ?? '');
    if (empty($projectId) || !preg_match('/^[a-zA-Z0-9_\-\.]{1,100}$/', $projectId)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Ongeldig of ontbrekend Project ID.'
        ]);
        exit;
    }

    $clientEmail = trim($input['clientEmail'] ?? '');
    // CWE-93 Mitigation: Strip CRLF & Control characters from email
    $clientEmail = preg_replace('/[\r\n\x00-\x1F\x7F]/', '', $clientEmail);
    if (empty($clientEmail) || !filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Ongeldig e-mailadres van de klant.'
        ]);
        exit;
    }

    $clientName = trim($input['clientName'] ?? 'Klant');
    $clientName = preg_replace('/[\r\n\x00-\x1F\x7F]/', ' ', $clientName);
    $clientName = strip_tags(substr($clientName, 0, 100));

    $clientPhone = preg_replace('/\D/', '', $input['clientPhone'] ?? '');

    $allowedMilestones = [
        'proposal_ready',
        'design_ready',
        'development_started',
        'payment_waiting',
        'project_completed',
        'custom'
    ];
    $milestoneKey = trim($input['milestoneKey'] ?? 'proposal_ready');
    if (!in_array($milestoneKey, $allowedMilestones, true)) {
        $milestoneKey = 'custom';
    }

    $rawSubject = trim($input['subject'] ?? 'Update voor je project');
    $safeSubject = preg_replace('/[\r\n\x00-\x1F\x7F]/', ' ', $rawSubject);
    $safeSubject = substr(preg_replace('/\s+/', ' ', $safeSubject), 0, 150);

    $portalLink = trim($input['portalLink'] ?? '');
    if (!empty($portalLink) && !filter_var($portalLink, FILTER_VALIDATE_URL)) {
        $portalLink = 'https://portal.creationaltfix.nl/crm/status/';
    }

    $htmlBody = $input['htmlBody'] ?? '';
    if (strlen($htmlBody) > 60000) {
        $htmlBody = substr($htmlBody, 0, 60000);
    }

    // 5. Server-Side Email Delivery
    $emailSent = false;
    $emailError = null;

    if (!empty($htmlBody)) {
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: Creation+Alt+Fix <noreply@creationaltfix.nl>',
            'Reply-To: Creation+Alt+Fix <info@creationaltfix.nl>',
            'X-Mailer: CreationAltFix-MilestoneDispatcher/2.0',
            'X-Project-ID: ' . $projectId,
            'X-Milestone: ' . $milestoneKey
        ];

        // Format subject with UTF-8 base64 encoding to prevent encoding corruption in mail clients
        $encodedSubject = '=?UTF-8?B?' . base64_encode($safeSubject) . '?=';
        $headerStr = implode("\r\n", $headers);

        // Attempt mail delivery
        $emailSent = @mail($clientEmail, $encodedSubject, $htmlBody, $headerStr);
        if (!$emailSent) {
            $lastErr = error_get_last();
            $emailError = $lastErr['message'] ?? 'mail() geretourneerd false (mogelijk lokale testomgeving zonder SMTP)';
        }
    }

    // 6. Atomic Dispatch Logging
    $logFile = __DIR__ . '/milestone-dispatch-log.json';
    $logEntry = [
        'timestamp' => date('c'),
        'projectId' => $projectId,
        'clientEmail' => $clientEmail,
        'clientName' => $clientName,
        'clientPhone' => $clientPhone,
        'milestoneKey' => $milestoneKey,
        'subject' => $safeSubject,
        'emailSent' => $emailSent,
        'emailError' => $emailError,
        'clientIp' => $clientIp
    ];

    $lf = @fopen($logFile, 'c+');
    if ($lf) {
        if (@flock($lf, LOCK_EX)) {
            @rewind($lf);
            $rawLogs = @stream_get_contents($lf);
            $logs = [];
            if ($rawLogs) {
                $parsedLogs = @json_decode($rawLogs, true);
                if (is_array($parsedLogs)) {
                    $logs = $parsedLogs;
                }
            }
            // Keep last 250 log entries to prevent excessive file size
            $logs[] = $logEntry;
            if (count($logs) > 250) {
                $logs = array_slice($logs, -250);
            }
            @ftruncate($lf, 0);
            @rewind($lf);
            @fwrite($lf, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            @fflush($lf);
            @flock($lf, LOCK_UN);
        }
        @fclose($lf);
        @chmod($logFile, 0600);
    }

    // 7. Success Response
    echo json_encode([
        'success' => true,
        'dispatched' => true,
        'emailSent' => $emailSent,
        'emailError' => $emailError,
        'projectId' => $projectId,
        'milestoneKey' => $milestoneKey,
        'clientEmail' => $clientEmail,
        'timestamp' => $logEntry['timestamp']
    ], JSON_PRETTY_PRINT);

} catch (\Throwable $e) {
    http_response_code(200);
    $safeErrorMsg = preg_replace('/[a-zA-Z]:\\\\[^\s\'"]+|\/(?:home|var|usr|etc)\/[^\s\'"]+/', '[sanitized_path]', $e->getMessage());
    $safeErrorMsg = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', ' ', $safeErrorMsg), 0, 150);
    echo json_encode([
        'success' => false,
        'dispatched' => false,
        'emailSent' => false,
        'error' => 'Milestone Dispatch Fout: ' . $safeErrorMsg
    ], JSON_PRETTY_PRINT);
    exit;
}
