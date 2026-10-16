<?php
/**
 * De Holterij - Secure Contact Form Handler
 * Fam. E.J. Doornbos - Hoofdweg 103, 9626 AC Schildwolde
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Methode niet toegestaan.']);
    exit;
}

// 1. Anti-spam Honeypot check
if (!empty($_POST['website'])) {
    // Bot detected: respond with simulated success
    echo json_encode(['success' => true, 'message' => 'Hartelijk dank voor uw bericht!']);
    exit;
}

// 2. Sanitize and validate inputs
$naam = trim($_POST['naam'] ?? '');
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$telefoon = trim($_POST['telefoon'] ?? '');
$onderwerp = trim($_POST['onderwerp'] ?? 'Contactaanvraag via deholterij.nl');
$bericht = trim($_POST['bericht'] ?? '');

if (empty($naam)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Vul alstublieft uw naam in.']);
    exit;
}

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Vul alstublieft een geldig e-mailadres in.']);
    exit;
}

if (empty($bericht)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Vul alstublieft een bericht of vraag in.']);
    exit;
}

// 3. Compose Email
$to = 'lutjestee@deholterij.nl';
if (stripos($onderwerp, 'stalling') !== false || stripos($bericht, 'caravan') !== false || stripos($bericht, 'stalling') !== false) {
    $to = 'stalling@deholterij.nl';
}

$emailSubject = '=?UTF-8?B?' . base64_encode('Nieuw bericht via deholterij.nl: ' . $onderwerp) . '?=';

$body = "Er is een nieuw contactbericht binnengekomen via www.deholterij.nl:\n\n";
$body .= "Naam:        " . $naam . "\n";
$body .= "E-mail:      " . $email . "\n";
$body .= "Telefoon:    " . ($telefoon ?: 'Niet opgegeven') . "\n";
$body .= "Onderwerp:   " . $onderwerp . "\n";
$body .= "Datum/Tijd:  " . date('d-m-Y H:i') . "\n\n";
$body .= "Bericht:\n";
$body .= "--------------------------------------------------\n";
$body .= $bericht . "\n";
$body .= "--------------------------------------------------\n";

$headers = [];
$headers[] = 'From: De Holterij Website <no-reply@deholterij.nl>';
$headers[] = 'Reply-To: ' . $naam . ' <' . $email . '>';
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: PHP/' . phpversion();

$sent = @mail($to, $emailSubject, $body, implode("\r\n", $headers));

// On local dev servers where sendmail is not configured, we still return true
$isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;

if ($sent || $isLocal) {
    echo json_encode([
        'success' => true,
        'message' => 'Hartelijk dank voor uw bericht! Wij nemen zo spoedig mogelijk contact met u op.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Het versturen is tijdelijk mislukt. Neem alstublieft direct contact op via 0598 423989 of stalling@deholterij.nl.'
    ]);
}
