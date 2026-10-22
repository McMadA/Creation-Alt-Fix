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

    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, x-caf-auth, x-caf-admin");
    header("Content-Type: application/json; charset=UTF-8");
    header("X-Content-Type-Options: nosniff");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Pragma: no-cache");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }

    // Inspect action and ping parameters
    $action = $_GET['action'] ?? '';
    $slug = $_GET['slug'] ?? '';
    $isAdminPreview = false;

    if ($method === 'POST') {
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $jsonInput = json_decode($rawInput, true);
            if (is_array($jsonInput)) {
                if (empty($action) && !empty($jsonInput['action'])) {
                    $action = strval($jsonInput['action']);
                }
                if (empty($slug) && !empty($jsonInput['slug'])) {
                    $slug = strval($jsonInput['slug']);
                }
                if (!empty($jsonInput['admin']) || !empty($jsonInput['preview'])) {
                    $isAdminPreview = true;
                }
            }
        }
    }

    if (!empty($_GET['admin']) || !empty($_GET['preview'])) {
        $isAdminPreview = true;
    }
    $adminHeader = $_SERVER['HTTP_X_CAF_ADMIN'] ?? '';
    if (!empty($adminHeader)) {
        $isAdminPreview = true;
    }

    // --- ZERO-COOKIE VIEW TRACKING PING (100% AVG / GDPR PROOF) ---
    if ($action === 'ping') {
        $cleanSlug = strtolower(trim($slug));
        if (empty($cleanSlug) || !preg_match('/^[a-z0-9_-]{2,100}$/', $cleanSlug)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Ongeldige slug']);
            exit;
        }

        if ($isAdminPreview) {
            http_response_code(200);
            echo json_encode([
                'ok' => true,
                'slug' => $cleanSlug,
                'skipped' => 'admin_preview'
            ]);
            exit;
        }

        $leadsFilePath = __DIR__ . '/../admin/data/leads.json';
        $factoryLeadsPath = __DIR__ . '/../../factory/data/leads.json';

        if (!file_exists($leadsFilePath) || !is_readable($leadsFilePath)) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Leads database niet gevonden']);
            exit;
        }

        $rawContent = file_get_contents($leadsFilePath);
        $decoded = $rawContent ? json_decode($rawContent, true) : null;
        if (!is_array($decoded) || !isset($decoded['leads']) || !is_array($decoded['leads'])) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Corrupte leads database structuur']);
            exit;
        }

        $foundIdx = -1;
        foreach ($decoded['leads'] as $idx => $lead) {
            if (($lead['slug'] ?? '') === $cleanSlug || ($lead['id'] ?? '') === $cleanSlug) {
                $foundIdx = $idx;
                break;
            }
        }

        if ($foundIdx === -1) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Lead niet gevonden']);
            exit;
        }

        $now = date('c');
        $lead = &$decoded['leads'][$foundIdx];
        $currentViews = intval($lead['viewsCount'] ?? 0);
        $lastViewed = $lead['lastViewedAt'] ?? null;

        // Smart debounce: if viewed within last 10 seconds, do not increment view count again
        $shouldIncrement = true;
        if ($lastViewed) {
            $lastTime = strtotime($lastViewed);
            if ($lastTime && (time() - $lastTime) < 10) {
                $shouldIncrement = false;
            }
        }

        if ($shouldIncrement) {
            $currentViews++;
            $lead['viewsCount'] = $currentViews;
            if (empty($lead['firstViewedAt'])) {
                $lead['firstViewedAt'] = $now;
            }
        }
        $lead['lastViewedAt'] = $now;
        $lead['updatedAt'] = $now;

        $encoded = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        file_put_contents($leadsFilePath, $encoded, LOCK_EX);

        if (file_exists($factoryLeadsPath)) {
            @file_put_contents($factoryLeadsPath, $encoded, LOCK_EX);
        }

        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'slug' => $cleanSlug,
            'viewsCount' => $lead['viewsCount'],
            'lastViewedAt' => $lead['lastViewedAt'],
            'debounced' => !$shouldIncrement
        ]);
        exit;
    }

    if ($method !== 'GET' && $action !== 'record_outreach') {
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

    // --- SECTOR CONVERSION & PROVINCIAL BATCH 2 ANALYTICS (TASK-908) ---
    if ($action === 'analytics' || $action === 'batch2') {
        $leads = is_array($decoded['leads']) ? $decoded['leads'] : [];
        $sectorMap = [
            'dakdekker' => ['id' => 'dakdekker', 'label' => 'Dakdekkers & Zinkwerk', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'loodgieter' => ['id' => 'loodgieter', 'label' => 'Loodgieters & Installatietechniek', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'schilder' => ['id' => 'schilder', 'label' => 'Schilders & Glaszetters', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'stukadoor' => ['id' => 'stukadoor', 'label' => 'Stukadoors & Afbouw', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'hovenier' => ['id' => 'hovenier', 'label' => 'Hoveniers & Stratenmakers', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'elektricien' => ['id' => 'elektricien', 'label' => 'Elektriciens & Verduurzaming', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'klusbedrijf' => ['id' => 'klusbedrijf', 'label' => 'Klus- & Timmerbedrijven', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0],
            'overig' => ['id' => 'overig', 'label' => 'Overige Vaklieden & Diensten', 'totalLeads' => 0, 'viewsCount' => 0, 'sentCount' => 0, 'convertedCount' => 0]
        ];

        $regionalMap = [];

        foreach ($leads as $l) {
            $cat = strtolower(($l['category'] ?? '') . ' ' . ($l['name'] ?? '') . ' ' . ($l['slug'] ?? ''));
            $secKey = 'overig';
            if (strpos($cat, 'dak') !== false || strpos($cat, 'zink') !== false || strpos($cat, 'bitumen') !== false) {
                $secKey = 'dakdekker';
            } elseif (strpos($cat, 'ontstop') !== false || strpos($cat, 'riool') !== false || strpos($cat, 'loodgieter') !== false || strpos($cat, 'installat') !== false || strpos($cat, 'cv') !== false) {
                $secKey = 'loodgieter';
            } elseif (strpos($cat, 'schilder') !== false || strpos($cat, 'glaszet') !== false) {
                $secKey = 'schilder';
            } elseif (strpos($cat, 'stukadoor') !== false || strpos($cat, 'stuc') !== false || strpos($cat, 'spack') !== false) {
                $secKey = 'stukadoor';
            } elseif (strpos($cat, 'hovenier') !== false || strpos($cat, 'tuin') !== false || strpos($cat, 'stratenmaker') !== false || strpos($cat, 'bestrat') !== false) {
                $secKey = 'hovenier';
            } elseif (strpos($cat, 'elektr') !== false || strpos($cat, 'groepenkast') !== false || strpos($cat, 'laadpaal') !== false) {
                $secKey = 'elektricien';
            } elseif (strpos($cat, 'timmer') !== false || strpos($cat, 'klus') !== false || strpos($cat, 'aannem') !== false || strpos($cat, 'bouw') !== false) {
                $secKey = 'klusbedrijf';
            }

            $sectorMap[$secKey]['totalLeads']++;
            $views = max(0, intval($l['viewsCount'] ?? 0));
            $sectorMap[$secKey]['viewsCount'] += $views;

            $st = strtolower($l['status'] ?? '');
            $isSent = ($st === 'sent' || strpos($st, 'sent_') !== false || strpos($st, '_sent') !== false || !empty($l['sentAt']));
            if ($isSent) $sectorMap[$secKey]['sentCount']++;

            $isConverted = ($st === 'deal_closed' || $st === 'accepted' || $st === 'won' || $st === 'client' || !empty($l['isConverted']));
            if ($isConverted) $sectorMap[$secKey]['convertedCount']++;

            $city = trim($l['city'] ?? ($l['region'] ?? 'Onbekend')) ?: 'Onbekend';
            if (!isset($regionalMap[$city])) {
                $regionalMap[$city] = ['city' => $city, 'totalLeads' => 0, 'viewsCount' => 0, 'convertedCount' => 0];
            }
            $regionalMap[$city]['totalLeads']++;
            $regionalMap[$city]['viewsCount'] += $views;
            if ($isConverted) $regionalMap[$city]['convertedCount']++;
        }

        $sectorsList = [];
        foreach ($sectorMap as $s) {
            $convRate = $s['totalLeads'] > 0 ? round(($s['convertedCount'] / $s['totalLeads']) * 100, 1) : 0;
            $s['conversionRate'] = $convRate;
            $sectorsList[] = $s;
        }

        usort($sectorsList, function($a, $b) {
            if ($b['conversionRate'] !== $a['conversionRate']) return ($b['conversionRate'] > $a['conversionRate']) ? 1 : -1;
            if ($b['viewsCount'] !== $a['viewsCount']) return ($b['viewsCount'] > $a['viewsCount']) ? 1 : -1;
            return ($b['totalLeads'] > $a['totalLeads']) ? 1 : -1;
        });

        $activeWithLeads = array_values(array_filter($sectorsList, function($s) { return $s['totalLeads'] > 0; }));
        $topSector = !empty($activeWithLeads) ? $activeWithLeads[0] : null;

        $coreHubs = ['groningen', 'assen', 'drachten', 'emmen', 'hoogezand', 'veendam'];
        $coveredHubs = [];
        foreach ($coreHubs as $hub) {
            foreach ($regionalMap as $cityKey => $val) {
                if (stripos($cityKey, $hub) !== false) {
                    $coveredHubs[] = $hub;
                    break;
                }
            }
        }
        $provincialCoverageScore = round((count($coveredHubs) / count($coreHubs)) * 100);

        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'summary' => [
                'totalLeads' => count($leads),
                'totalViews' => array_sum(array_column($sectorsList, 'viewsCount')),
                'totalSent' => array_sum(array_column($sectorsList, 'sentCount')),
                'totalConverted' => array_sum(array_column($sectorsList, 'convertedCount')),
                'provincialCoverageScore' => $provincialCoverageScore,
                'coveredHubs' => $coveredHubs,
                'targetHubs' => $coreHubs
            ],
            'sectors' => $sectorsList,
            'topConvertingSector' => $topSector,
            'regionalBreakdown' => array_values($regionalMap),
            'generatedAt' => date('c')
        ]);
        exit;
    }

    // --- REGIONAL OUTREACH CAMPAIGN & DISPATCH TELEMETRY (TASK-906) ---
    if ($action === 'outreach') {
        $leads = is_array($decoded['leads']) ? $decoded['leads'] : [];
        $targetCohortSize = 30;
        $standardPrice = 750;

        $uncontactedCount = 0;
        $queuedCount = 0;
        $sentWhatsAppCount = 0;
        $sentEmailCount = 0;
        $viewedCount = 0;
        $inNegotiationCount = 0;
        $dealsClosedCount = 0;
        $declinedCount = 0;
        $totalViews = 0;

        $cohort = [];

        foreach ($leads as $l) {
            $st = strtolower(strval($l['outreachStage'] ?? ($l['status'] ?? '')));
            if ($st === 'skipped' || $st === 'skipped_has_website') {
                continue;
            }

            $views = max(0, intval($l['viewsCount'] ?? 0));
            $totalViews += $views;

            if ($st === 'deal_closed' || $st === 'won' || $st === 'accepted') {
                $dealsClosedCount++;
            } elseif ($st === 'in_negotiation' || $st === 'pending_agreement') {
                $inNegotiationCount++;
            } elseif ($st === 'declined' || $st === 'rejected') {
                $declinedCount++;
            } elseif ($views > 0) {
                $viewedCount++;
            } elseif ($st === 'sent_whatsapp' || (!empty($l['sentAt']) && ($l['outreachChannel'] ?? '') === 'whatsapp')) {
                $sentWhatsAppCount++;
            } elseif ($st === 'sent_email' || (!empty($l['sentAt']) && ($l['outreachChannel'] ?? '') === 'email')) {
                $sentEmailCount++;
            } elseif ($st === 'queued') {
                $queuedCount++;
            } else {
                $uncontactedCount++;
            }

            // Normaliseer telefoonnummer voor weergave
            $phone = strval($l['phone'] ?? ($l['normalizedPhone'] ?? ''));
            $cleanPhone = preg_replace('/[\s\-\(\)\.]/', '', $phone);
            $hasValidMobile = preg_match('/^(?:\+316|00316|06|316)\d{8}$/', $cleanPhone);

            $cohort[] = [
                'id' => $l['id'] ?? '',
                'name' => $l['name'] ?? '',
                'slug' => $l['slug'] ?? '',
                'city' => $l['city'] ?? 'Regio',
                'category' => $l['category'] ?? 'Vakman',
                'phone' => $phone,
                'hasValidMobile' => (bool)$hasValidMobile,
                'status' => $l['status'] ?? 'new',
                'outreachStage' => !empty($l['outreachStage']) ? $l['outreachStage'] : ($views > 0 ? 'viewed' : ($st ?: 'queued')),
                'viewsCount' => $views,
                'sentAt' => $l['sentAt'] ?? null,
                'liveUrl' => $l['liveUrl'] ?? null,
                'isDomainAvailable' => (bool)($l['isDomainAvailable'] ?? false)
            ];

            if (count($cohort) >= $targetCohortSize) {
                break;
            }
        }

        $totalSent = $sentWhatsAppCount + $sentEmailCount + $viewedCount + $inNegotiationCount + $dealsClosedCount;
        $viewRate = $totalSent > 0 ? round((($viewedCount + $inNegotiationCount + $dealsClosedCount) / $totalSent) * 100) : 0;
        $conversionRate = $totalSent > 0 ? round(($dealsClosedCount / $totalSent) * 100) : 0;

        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'campaign' => [
                'id' => 'cohort_w4_w5_regional',
                'name' => 'Regionale MKB Verovering (Week 4 & 5)',
                'targetCohortSize' => $targetCohortSize,
                'actualCohortSize' => count($cohort),
                'sender' => [
                    'name' => 'Allard Veldman',
                    'agency' => 'Creation+Alt+Fix',
                    'city' => 'Hoogezand',
                    'phone' => '06 - 19135453'
                ]
            ],
            'metrics' => [
                'uncontacted' => $uncontactedCount,
                'queued' => $queuedCount,
                'sentWhatsApp' => $sentWhatsAppCount,
                'sentEmail' => $sentEmailCount,
                'viewed' => $viewedCount,
                'inNegotiation' => $inNegotiationCount,
                'dealsClosed' => $dealsClosedCount,
                'declined' => $declinedCount,
                'totalSent' => $totalSent,
                'totalViews' => $totalViews,
                'viewRatePercentage' => $viewRate,
                'conversionRatePercentage' => $conversionRate,
                'closedRevenueEur' => $dealsClosedCount * $standardPrice,
                'pipelinePotentialEur' => ($inNegotiationCount + ($viewedCount * 0.4)) * $standardPrice,
                'targetGoalAchieved' => $dealsClosedCount >= 3
            ],
            'cohort' => $cohort,
            'generatedAt' => date('c')
        ]);
        exit;
    }

    // --- SOCIAL MEDIA & PERSONAL BRANDING (TASK-843) ---
    if ($action === 'social' || $action === 'social_branding') {
        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'campaign' => [
                'id' => 'social_30_days',
                'title' => 'Social Media & Personal Branding (30-Dagen Kalender)',
                'author' => 'Allard Veldman',
                'agency' => 'Creation+Alt+Fix',
                'location' => 'Hoogezand, Groningen',
                'totalDays' => 30,
                'linkedInCount' => 14,
                'instagramCount' => 13,
                'restDaysCount' => 3,
                'estimatedReach' => 13650,
                'estimatedInteractions' => 655
            ],
            'keyScripts' => [
                'script_1_speed_test' => 'De Trage Website Test',
                'script_2_no_login_flow' => 'De Echte Klantflow (No-Login Magic)',
                'script_3_behind_the_scenes' => 'Achter de Schermen: Lead Factory Live Scan'
            ],
            'publishedDays' => [1],
            'status' => 'active',
            'generatedAt' => date('c')
        ]);
        exit;
    }

    // --- RECORD OUTREACH INTERACTION (TASK-906) ---
    if ($action === 'record_outreach') {
        $cleanSlug = strtolower(trim($slug));
        if (empty($cleanSlug) || !preg_match('/^[a-z0-9_-]{2,100}$/', $cleanSlug)) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Ongeldige slug voor outreach registratie']);
            exit;
        }

        $inputStatus = 'sent_whatsapp';
        $inputChannel = 'whatsapp';
        $inputTemplate = 'nuchter_direct';

        if (!empty($jsonInput) && is_array($jsonInput)) {
            if (!empty($jsonInput['status'])) {
                $inputStatus = strval($jsonInput['status']);
            }
            if (!empty($jsonInput['channel'])) {
                $inputChannel = strval($jsonInput['channel']);
            }
            if (!empty($jsonInput['template'])) {
                $inputTemplate = strval($jsonInput['template']);
            }
        }

        $foundIdx = -1;
        foreach ($decoded['leads'] as $idx => $lead) {
            if (($lead['slug'] ?? '') === $cleanSlug || ($lead['id'] ?? '') === $cleanSlug) {
                $foundIdx = $idx;
                break;
            }
        }

        if ($foundIdx === -1) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Lead niet gevonden']);
            exit;
        }

        $now = date('c');
        $lead = &$decoded['leads'][$foundIdx];
        $lead['status'] = $inputStatus;
        $lead['outreachStage'] = $inputStatus;
        if (empty($lead['sentAt']) || strpos($inputStatus, 'sent_') !== false) {
            $lead['sentAt'] = $now;
        }
        $lead['outreachChannel'] = $inputChannel;
        $lead['outreachTemplate'] = $inputTemplate;
        $lead['updatedAt'] = $now;

        $encoded = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        file_put_contents($leadsFilePath, $encoded, LOCK_EX);

        $factoryLeadsPath = __DIR__ . '/../../factory/data/leads.json';
        if (file_exists($factoryLeadsPath)) {
            @file_put_contents($factoryLeadsPath, $encoded, LOCK_EX);
        }

        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'slug' => $cleanSlug,
            'outreachStage' => $lead['outreachStage'],
            'sentAt' => $lead['sentAt'],
            'outreachChannel' => $lead['outreachChannel'],
            'outreachTemplate' => $lead['outreachTemplate']
        ]);
        exit;
    }

    http_response_code(200);
    echo $rawContent;
    exit;

} catch (\Throwable $e) {
    http_response_code(500);
    $safeError = preg_replace('/[a-zA-Z]:\\\\[^\s\'"]+|\/(?:home|var|usr|etc)\/[^\s\'"]+/', '[sanitized_path]', $e->getMessage());
    $safeError = substr(preg_replace('/[\r\n\x00-\x1F\x7F]/', ' ', $safeError), 0, 150);
    echo json_encode([
        'error' => 'Interne serverfout bij ophalen leads',
        'details' => $safeError
    ]);
    exit;
}
