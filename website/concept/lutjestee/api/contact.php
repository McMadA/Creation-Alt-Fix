<?php
/**
 * Vakantiewoning Lutje Stee - Secure Contact & Reservation Form Handler
 * Fam. E.J. Doornbos - Hoofdweg 103, 9626 AC Schildwolde
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Methode niet toegestaan.']);
    exit;
}

// 1. Anti-spam Honeypot check
if (!empty($_POST['website'])) {
    echo json_encode(['success' => true, 'message' => 'Hartelijk dank voor uw reserveringsaanvraag!']);
    exit;
}

// 2. Sanitize and validate inputs (CRLF Injection & XSS Mitigations - CWE-93)
$naam = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', '', strip_tags(trim($_POST['naam'] ?? ''))), 0, 100);
$rawEmail = preg_replace('/[\r\n\x00-\x1F\x7F,; ]/', '', trim($_POST['email'] ?? ''));
$email = filter_var($rawEmail, FILTER_VALIDATE_EMAIL);
$telefoon = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', '', strip_tags(trim($_POST['telefoon'] ?? ''))), 0, 30);
$aankomst = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', '', strip_tags(trim($_POST['aankomst'] ?? ''))), 0, 50);
$vertrek = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', '', strip_tags(trim($_POST['vertrek'] ?? ''))), 0, 50);
$personen = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', '', strip_tags(trim($_POST['personen'] ?? '1-2'))), 0, 20);
$bericht = substr(strip_tags(trim($_POST['bericht'] ?? '')), 0, 5000);

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

// 3. Compose Email
$to = 'lutjestee@deholterij.nl';
$subject = '=?UTF-8?B?' . base64_encode('Nieuwe aanvraag vakantiewoning Lutje Stee van ' . $naam) . '?=';

$body = "Er is een nieuwe reserveringsaanvraag binnengekomen via www.lutjestee.nl:\n\n";
$body .= "Naam gast:       " . $naam . "\n";
$body .= "E-mail:          " . $email . "\n";
$body .= "Telefoon:        " . ($telefoon ?: 'Niet opgegeven') . "\n";
$body .= "Aankomstdatum:   " . ($aankomst ?: 'Nog niet gespecificeerd') . "\n";
$body .= "Vertrekdatum:    " . ($vertrek ?: 'Nog niet gespecificeerd') . "\n";
$body .= "Aantal personen: " . $personen . "\n";
$body .= "Datum/Tijd:      " . date('d-m-Y H:i') . "\n\n";
$body .= "Opmerkingen of vraag:\n";
$body .= "--------------------------------------------------\n";
$body .= ($bericht ?: 'Geen extra opmerkingen') . "\n";
$body .= "--------------------------------------------------\n";

$headers = [];
$headers[] = 'From: Lutje Stee Website <no-reply@lutjestee.nl>';
$headers[] = 'Reply-To: ' . $naam . ' <' . $email . '>';
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'X-Mailer: ConceptMailer/2.0';

$sent = @mail($to, $subject, $body, implode("\r\n", $headers));
$isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']) || strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false;

if ($sent || $isLocal) {
    echo json_encode([
        'success' => true,
        'message' => 'Hartelijk dank voor uw reserveringsaanvraag! Wij nemen zo spoedig mogelijk contact met u op over de beschikbaarheid.'
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Het versturen is tijdelijk mislukt. Neem alstublieft direct contact op via 0598 423902 of lutjestee@deholterij.nl.'
    ]);
}
