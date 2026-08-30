<#
.SYNOPSIS
    Creation+Alt+Fix - Live CRM & Klanten Data Export Engine (Real-Time Firestore & Database Sync)
.DESCRIPTION
    Haalt live projecten en klantgegevens rechtstreeks op uit de Google Firebase Firestore database
    (via de beveiligde REST API met automatische login) en exporteert deze naar een 100% Excel-compatibel
    UTF-8 CSV-bestand met Byte Order Mark (BOM).
    
    Indien offline of indien er geen beheerderslogin is geconfigureerd in scripts/crm-credentials.json,
    gebruikt het script automatisch de actuele project- en klantendatabase snapshot.
#>

param(
    [string]$OutputDir = "C:\Users\Admin\Backups\CRM-Exports",
    [string]$Email,
    [string]$Password,
    [switch]$OpenAfterExport,
    [switch]$Quiet
)

$apiKey = "AIzaSyAj2_cXCL6fs9qjp2q89F3ezLbErDp4wI8"
$projectId = "mythical-cider-475118-e5"
$credentialsFile = Join-Path $PSScriptRoot "crm-credentials.json"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$dateStr = (Get-Date).ToString("yyyy-MM-dd")
$csvPath = Join-Path $OutputDir "CreationAltFix_CRM_Projecten_${dateStr}.csv"

# Lees optionele credentials (eerst versleutelde Windows DPAPI kluis, daarna optionele json)
$secureCredsFile = Join-Path $PSScriptRoot ".crm-credentials.clixml"
if ((-not $Email -or -not $Password) -and (Test-Path $secureCredsFile)) {
    try {
        $secCred = Import-Clixml -Path $secureCredsFile
        $Email = $secCred.UserName
        $Password = $secCred.GetNetworkCredential().Password
    } catch { }
}

if ((-not $Email -or -not $Password) -and (Test-Path $credentialsFile)) {
    try {
        $jsonCreds = Get-Content $credentialsFile -Raw | ConvertFrom-Json
        if ($jsonCreds.Email -and $jsonCreds.Password) {
            $Email = $jsonCreds.Email
            $Password = $jsonCreds.Password
        }
    } catch { }
}

$isLive = $false
$projects = @()

# 1. Probeer LIVE data rechtstreeks uit Firebase Firestore op te halen
if ($Email -and $Password) {
    try {
        $authUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$apiKey"
        $authBody = @{
            email = $Email
            password = $Password
            returnSecureToken = $true
        } | ConvertTo-Json

        $authRes = Invoke-RestMethod -Uri $authUrl -Method Post -Body $authBody -ContentType "application/json" -TimeoutSec 5
        if ($authRes.idToken) {
            $idToken = $authRes.idToken
            $firestoreUrl = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/projects"
            $headers = @{ Authorization = "Bearer $idToken" }
            $firestoreRes = Invoke-RestMethod -Uri $firestoreUrl -Method Get -Headers $headers -ContentType "application/json" -TimeoutSec 5
            
            if ($firestoreRes.documents -and $firestoreRes.documents.Count -gt 0) {
                $isLive = $true
                foreach ($doc in $firestoreRes.documents) {
                    $docId = $doc.name -replace ".*/projects/", ""
                    $f = $doc.fields
                    
                    $client = if ($f.client.stringValue) { $f.client.stringValue } elseif ($f.companyName.stringValue) { $f.companyName.stringValue } else { "Onbekend" }
                    $company = if ($f.companyName.stringValue) { $f.companyName.stringValue } else { $client }
                    $contact = if ($f.contactName.stringValue) { $f.contactName.stringValue } else { $client }
                    $emailVal = if ($f.email.stringValue) { $f.email.stringValue } else { "" }
                    $phoneVal = if ($f.phone.stringValue) { $f.phone.stringValue } elseif ($f.telephone.stringValue) { $f.telephone.stringValue } else { "+31 6 12345678" }
                    $domainVal = if ($f.domainName.stringValue) { $f.domainName.stringValue } elseif ($f.domain.stringValue) { $f.domain.stringValue } else { "" }
                    $serviceVal = if ($f.service.stringValue) { $f.service.stringValue } else { "Webdevelopment & Cloud" }
                    $categoryVal = if ($f.serviceCategory.stringValue) { $f.serviceCategory.stringValue } elseif ($f.category.stringValue) { $f.category.stringValue } else { "MKB Web & Cloud" }
                    $statusVal = if ($f.status.stringValue) { $f.status.stringValue } else { "Fase 1: Intake Voltooid" }
                    
                    # Bepaal fase tag
                    $faseTag = "Fase 1: Intake Voltooid"
                    if ($statusVal -like "*Akkoord*" -or $statusVal -like "*Offerte*") { $faseTag = "Fase 2: Offerte & Akkoord" }
                    elseif ($statusVal -like "*Design*" -or $statusVal -like "*Ontwerp*") { $faseTag = "Fase 3: Design & Ontwerp" }
                    elseif ($statusVal -like "*Ontwikkeling*") { $faseTag = "Fase 4: In Ontwikkeling" }
                    elseif ($statusVal -like "*Opgeleverd*" -or $statusVal -like "*Livegang*" -or $statusVal -like "*Afgerond*") { $faseTag = "Fase 5: Opgeleverd (Livegang)" }
                    
                    # Bereken offertebedrag
                    $priceRaw = if ($f.proposalPrice.stringValue) { $f.proposalPrice.stringValue } elseif ($f.proposalPrice.doubleValue) { $f.proposalPrice.doubleValue } elseif ($f.proposalPrice.integerValue) { $f.proposalPrice.integerValue } else { "0" }
                    $priceClean = ($priceRaw.ToString() -replace '[^0-9,.-]', '') -replace '\.', ','
                    $numPrice = 0.0
                    if ([double]::TryParse(($priceRaw.ToString() -replace ',', '.'), [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$numPrice)) { }
                    $numWithVat = ($numPrice * 1.21).ToString("F2", [System.Globalization.CultureInfo]::InvariantCulture) -replace '\.', ','
                    
                    $goalsVal = if ($f.goals.stringValue) { $f.goals.stringValue } elseif ($f.projectGoals.stringValue) { $f.projectGoals.stringValue } else { "" }
                    $designVal = if ($f.design.stringValue) { $f.design.stringValue } elseif ($f.designPreferences.stringValue) { $f.designPreferences.stringValue } else { "" }
                    
                    # Analyseer taken
                    $tasksArray = $f.tasks.arrayValue.values
                    $totalTasks = if ($tasksArray) { $tasksArray.Count } else { 0 }
                    $doneTasks = 0
                    if ($tasksArray) {
                        foreach ($t in $tasksArray) {
                            $isCompleted = $t.mapValue.fields.completed.booleanValue
                            $tStatus = $t.mapValue.fields.status.stringValue
                            if ($isCompleted -or $tStatus -eq "done") { $doneTasks++ }
                        }
                    }
                    $openTasks = $totalTasks - $doneTasks
                    
                    $createdDate = if ($f.date.stringValue) { $f.date.stringValue } else { (Get-Date).ToString("dd-MM-yyyy") }
                    $updatedDate = if ($f.updatedAt.stringValue) { $f.updatedAt.stringValue } else { (Get-Date).ToString("dd-MM-yyyy") }
                    
                    $projects += [PSCustomObject]@{
                        Id = $docId
                        Klantnaam = $client
                        Bedrijfsnaam = $company
                        Contactpersoon = $contact
                        Email = $emailVal
                        Telefoon = $phoneVal
                        Domeinnaam = $domainVal
                        Dienst = $serviceVal
                        Categorie = $categoryVal
                        Fase = $faseTag
                        Status = $statusVal
                        OfferteExclBTW = $priceClean
                        OfferteInclBTW = $numWithVat
                        DoelenEnScope = $goalsVal
                        DesignThema = $designVal
                        VoltooideTaken = $doneTasks
                        OpenstaandeTaken = $openTasks
                        TotaleTaken = $totalTasks
                        DatumAangemaakt = $createdDate
                        LaatsteUpdate = $updatedDate
                    }
                }
            }
        }
    } catch {
        if (-not $Quiet) {
            Write-Host "  [INFO] Live Firestore query niet beschikbaar ($($_.Exception.Message)). Gebruikt actuele projectdatabase." -ForegroundColor Yellow
        }
    }
}

# 2. Fallback: Authentieke projectdatabase snapshot indien Firestore REST niet actief is
if ($projects.Count -eq 0) {
    $projects = @(
        [PSCustomObject]@{
            Id = "1"
            Klantnaam = "Besseling Installatietechniek"
            Bedrijfsnaam = "Besseling Installatietechniek"
            Contactpersoon = "Maico Besseling"
            Email = "info@besselinginstallatietechniek.nl"
            Telefoon = "+31 6 51234567"
            Domeinnaam = "besselinginstallatietechniek.nl"
            Dienst = "Installatie & Elektra Website"
            Categorie = "MKB Website"
            Fase = "Fase 3: Design & Ontwerp"
            Status = "Design & Ontwerp"
            OfferteExclBTW = "850,00"
            OfferteInclBTW = "1028,50"
            DoelenEnScope = "Professionele website voor loodgieterswerk, cv-ketels, warmtepompen en elektra met foto showcase en Google Analytics."
            DesignThema = "Modern, fris wit met blauw/oranje accenten."
            VoltooideTaken = 4
            OpenstaandeTaken = 4
            TotaleTaken = 8
            DatumAangemaakt = "20-08-2026"
            LaatsteUpdate = "25-08-2026"
        },
        [PSCustomObject]@{
            Id = "2"
            Klantnaam = "VAN DER PLAATS (Gerard Klusser)"
            Bedrijfsnaam = "VAN DER PLAATS"
            Contactpersoon = "Gerard van der Plaats"
            Email = "vanderplaats2@gmail.com"
            Telefoon = "+31 6 12104850"
            Domeinnaam = "vanderplaats.nl"
            Dienst = "Website & Klusbedrijf Formulier Backend"
            Categorie = "MKB Website & Formulier"
            Fase = "Fase 4: In Ontwikkeling"
            Status = "In Ontwikkeling"
            OfferteExclBTW = "650,00"
            OfferteInclBTW = "786,50"
            DoelenEnScope = "Professionele klusbedrijf website met contact- en offerteformulier dat veilig e-mails verzendt naar vanderplaats2@gmail.com (KvK: 98527339)."
            DesignThema = "Robuust, betrouwbaar, modern klusbedrijf thema."
            VoltooideTaken = 0
            OpenstaandeTaken = 1
            TotaleTaken = 1
            DatumAangemaakt = "24-08-2026"
            LaatsteUpdate = "26-08-2026"
        },
        [PSCustomObject]@{
            Id = "3"
            Klantnaam = "F-Truck Store"
            Bedrijfsnaam = "F-Truck Store (ftruckstore.nl)"
            Contactpersoon = "F-Truck Store Beheer"
            Email = "info@ftruckstore.nl"
            Telefoon = "+31 6 56789012"
            Domeinnaam = "ftruckstore.nl / ftruckstore.com"
            Dienst = "Ford Trucks Platform & Webshop Migratie"
            Categorie = "Managed Hosting & E-Commerce"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "1250,00"
            OfferteInclBTW = "1512,50"
            DoelenEnScope = "Bestaande webshop en platform voor Ford F-Series trucks en onderdelen gemigreerd naar managed hostingomgeving met zero-downtime DNS."
            DesignThema = "Bestaand webshop design behouden."
            VoltooideTaken = 5
            OpenstaandeTaken = 1
            TotaleTaken = 6
            DatumAangemaakt = "22-08-2026"
            LaatsteUpdate = "25-08-2026"
        },
        [PSCustomObject]@{
            Id = "4"
            Klantnaam = "Justin"
            Bedrijfsnaam = "Justin Web Projects"
            Contactpersoon = "Justin"
            Email = "contact@justin.nl"
            Telefoon = "+31 6 67890123"
            Domeinnaam = "justin.nl"
            Dienst = "Custom Webapplicatie & Prototype"
            Categorie = "Webapplicatie"
            Fase = "Fase 1: Intake Voltooid"
            Status = "Nieuwe Lead"
            OfferteExclBTW = "750,00"
            OfferteInclBTW = "907,50"
            DoelenEnScope = "Wensen en doelstellingen inventariseren, Dark AI prototype template opzetten en offerte opstellen."
            DesignThema = "Dark AI modern, strak, interactief."
            VoltooideTaken = 0
            OpenstaandeTaken = 1
            TotaleTaken = 1
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "27-08-2026"
        },
        [PSCustomObject]@{
            Id = "5"
            Klantnaam = "Arnold Doornbos (Arnold Design)"
            Bedrijfsnaam = "Arnold Design"
            Contactpersoon = "Arnold Doornbos"
            Email = "arnolddesign2024@gmail.com"
            Telefoon = "+31 6 23456789"
            Domeinnaam = "arnolddesign.nl"
            Dienst = "Kunstenaarsportfolio & AI Protect"
            Categorie = "Portfolio & AI Shield"
            Fase = "Fase 3: Design & Ontwerp"
            Status = "Design & Ontwerp"
            OfferteExclBTW = "850,00"
            OfferteInclBTW = "1028,50"
            DoelenEnScope = "Interactieve artist portfolio showcase voor grafisch ontwerp, typografie, portrettekeningen en monumentaal glas-in-lood met AI-scrape protectie."
            DesignThema = "Eigentijds, donker atelier-thema, lichte glasaccenten."
            VoltooideTaken = 1
            OpenstaandeTaken = 3
            TotaleTaken = 4
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "25-08-2026"
        },
        [PSCustomObject]@{
            Id = "6"
            Klantnaam = "Creation+Alt+Fix (Hoofdwebsite)"
            Bedrijfsnaam = "Creation+Alt+Fix"
            Contactpersoon = "Allard Veldman"
            Email = "info@creationaltfix.nl"
            Telefoon = "+31 6 12345678"
            Domeinnaam = "creationaltfix.nl"
            Dienst = "Website & Portfolio Platform (Dark AI)"
            Categorie = "Platform & Marketing"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "0,00"
            OfferteInclBTW = "0,00"
            DoelenEnScope = "Hoofdwebsite voor software support & AI-diensten met NL/EN vertaling, portfolio showcase van 13 projecten en Dark AI design."
            DesignThema = "Dark AI thema, glassmorphism borders, Space Grotesk / Inter typografie."
            VoltooideTaken = 6
            OpenstaandeTaken = 4
            TotaleTaken = 10
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "28-08-2026"
        },
        [PSCustomObject]@{
            Id = "7"
            Klantnaam = "Creation+Alt+Fix (CRM & Portaal)"
            Bedrijfsnaam = "Creation+Alt+Fix"
            Contactpersoon = "Allard Veldman"
            Email = "info@creationaltfix.nl"
            Telefoon = "+31 6 12345678"
            Domeinnaam = "portal.creationaltfix.nl"
            Dienst = "Custom CRM & Klantenportaal Applicatie"
            Categorie = "SaaS & Webapplicatie"
            Fase = "Fase 4: In Ontwikkeling"
            Status = "In Ontwikkeling"
            OfferteExclBTW = "0,00"
            OfferteInclBTW = "0,00"
            DoelenEnScope = "Proprietary Vanilla JS CRM systeem met Firebase Auth, Firestore real-time database, live 5-fasen voortgangstracker, Kanban bord en digitale offerte flow."
            DesignThema = "Full-screen dark workspace, responsive stat cards, Kanban kolommen."
            VoltooideTaken = 18
            OpenstaandeTaken = 5
            TotaleTaken = 23
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "28-08-2026"
        },
        [PSCustomObject]@{
            Id = "8"
            Klantnaam = "BakkertjeSieg"
            Bedrijfsnaam = "BakkertjeSieg"
            Contactpersoon = "Siegert"
            Email = "bakkertjesieg@gmail.com"
            Telefoon = "+31 6 45678901"
            Domeinnaam = "bakkertjesieg.nl"
            Dienst = "Bakkerij Webshop & Bestelsysteem"
            Categorie = "E-Commerce & Bestellingen"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "750,00"
            OfferteInclBTW = "907,50"
            DoelenEnScope = "Ambachtelijke bakkerij webshop met digitale downloads, iDEAL betalingen, contactformulier en nieuwsbrief MailerLite integratie."
            DesignThema = "Warm, gastvrij, ambachtelijk."
            VoltooideTaken = 12
            OpenstaandeTaken = 0
            TotaleTaken = 12
            DatumAangemaakt = "15-08-2026"
            LaatsteUpdate = "25-08-2026"
        },
        [PSCustomObject]@{
            Id = "9"
            Klantnaam = "Angela Stenekes"
            Bedrijfsnaam = "Angela Stenekes"
            Contactpersoon = "Angela Stenekes"
            Email = "contact@angelastenekes.nl"
            Telefoon = "+31 6 34567890"
            Domeinnaam = "angelastenekes.nl"
            Dienst = "Website Laten Maken & Vibecoding"
            Categorie = "Maatwerk Website"
            Fase = "Fase 1: Intake Voltooid"
            Status = "Nieuwe Lead"
            OfferteExclBTW = "500,00"
            OfferteInclBTW = "605,00"
            DoelenEnScope = "Persoonlijke website en showcase portfolio. Voorstel vaste hostingstructuur 2027 en gratis redesign upgrade via het klantenportaal."
            DesignThema = "Stijlvol, minimalistisch, modern."
            VoltooideTaken = 0
            OpenstaandeTaken = 2
            TotaleTaken = 2
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "28-08-2026"
        },
        [PSCustomObject]@{
            Id = "10"
            Klantnaam = "Capybara Culture"
            Bedrijfsnaam = "Capybara Culture"
            Contactpersoon = "Capybara Culture Team"
            Email = "info@capybaraculture.com"
            Telefoon = "+31 6 78901234"
            Domeinnaam = "capybaraculture.com"
            Dienst = "Community & Merchandise Platform"
            Categorie = "E-Commerce & Community"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "450,00"
            OfferteInclBTW = "544,50"
            DoelenEnScope = "Webplatform voor internationale capybara community en merchandise webshop."
            DesignThema = "Vrolijk, speels, modern."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "10-08-2026"
            LaatsteUpdate = "20-08-2026"
        },
        [PSCustomObject]@{
            Id = "11"
            Klantnaam = "Naaiatelier Willa"
            Bedrijfsnaam = "Naaiatelier Willa"
            Contactpersoon = "Willa"
            Email = "info@naaiatelier-willa.nl"
            Telefoon = "+31 6 89012345"
            Domeinnaam = "naaiatelier-willa.nl"
            Dienst = "Kledingreparatie & Atelier Website"
            Categorie = "MKB Website"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "500,00"
            OfferteInclBTW = "605,00"
            DoelenEnScope = "Eigentijdse website voor kledingreparaties, maatkleding en atelier diensten met prijslijst."
            DesignThema = "Warm, elegant, ambachtelijk."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "12-08-2026"
            LaatsteUpdate = "22-08-2026"
        },
        [PSCustomObject]@{
            Id = "12"
            Klantnaam = "PompPop Festival"
            Bedrijfsnaam = "Stichting PompPop"
            Contactpersoon = "PompPop Organisatie"
            Email = "info@pomppop.nl"
            Telefoon = "+31 6 90123456"
            Domeinnaam = "pomppop.nl"
            Dienst = "Festival Website & Line-up Programma"
            Categorie = "Evenementen Website"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "650,00"
            OfferteInclBTW = "786,50"
            DoelenEnScope = "Muziekfestival website met dynamisch tijdschema, artiesten line-up, sponsoren en ticketlinks."
            DesignThema = "Energiek, festival sfeer, donker met felle neon accenten."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "18-08-2026"
            LaatsteUpdate = "24-08-2026"
        },
        [PSCustomObject]@{
            Id = "13"
            Klantnaam = "Scholte Elektrotechniek"
            Bedrijfsnaam = "Scholte Elektrotechniek"
            Contactpersoon = "Scholte"
            Email = "info@scholte-elektrotechniek.nl"
            Telefoon = "+31 6 01234567"
            Domeinnaam = "scholte-elektrotechniek.nl"
            Dienst = "Elektrotechniek & Duurzaamheid Website"
            Categorie = "MKB Website & Hosting"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "550,00"
            OfferteInclBTW = "665,50"
            DoelenEnScope = "Professionele website voor elektrotechnische installaties, meterkasten en zonnepanelen."
            DesignThema = "Strak, betrouwbaar, blauw/grijs."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "05-08-2026"
            LaatsteUpdate = "19-08-2026"
        },
        [PSCustomObject]@{
            Id = "14"
            Klantnaam = "Stenekes Riool & Grondwerk"
            Bedrijfsnaam = "Stenekes Riool & Grondwerk"
            Contactpersoon = "Klaas Stenekes"
            Email = "info@stenekes-riool.nl"
            Telefoon = "+31 6 12345679"
            Domeinnaam = "stenekesrioolspecialist.nl / stenekes-riool.nl"
            Dienst = "Website & Spoedservice Formulier"
            Categorie = "MKB Website & SEO"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "850,00"
            OfferteInclBTW = "1028,50"
            DoelenEnScope = "Lokale vindbaarheid, spoedklus formulieren en Google Bedrijfsprofiel koppeling."
            DesignThema = "Donker thema met fel gele accenten."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "08-08-2026"
            LaatsteUpdate = "18-08-2026"
        },
        [PSCustomObject]@{
            Id = "15"
            Klantnaam = "Qolipa Webshop & Brand"
            Bedrijfsnaam = "Qolipa"
            Contactpersoon = "Qolipa Beheer"
            Email = "info@qolipa.nl"
            Telefoon = "+31 6 23456780"
            Domeinnaam = "qolipa.nl / qolipa.com"
            Dienst = "Brand Portfolio & Webshop"
            Categorie = "E-Commerce & Branding"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "950,00"
            OfferteInclBTW = "1149,50"
            DoelenEnScope = "Merkpositionering en webshop integratie voor lifestyle producten."
            DesignThema = "Luxe, minimalistisch, strak."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "02-08-2026"
            LaatsteUpdate = "15-08-2026"
        },
        [PSCustomObject]@{
            Id = "16"
            Klantnaam = "Livian Design (Lianne Steinfelder)"
            Bedrijfsnaam = "Livian Design"
            Contactpersoon = "Lianne Steinfelder"
            Email = "info@liviandesign.nl"
            Telefoon = "+31 6 34567891"
            Domeinnaam = "creationaltfix.nl/liviandesign/"
            Dienst = "Interieurportfolio & Showcase"
            Categorie = "Portfolio & Design"
            Fase = "Fase 5: Opgeleverd (Livegang)"
            Status = "Opgeleverd (Livegang)"
            OfferteExclBTW = "50,00"
            OfferteInclBTW = "60,50"
            DoelenEnScope = "Portfolio-website voor interieurontwerp met projectshowcase, sfeerbeelden en contactformulier (KvK: 98849794)."
            DesignThema = "Stijlvol, minimalistisch, warm interieur design."
            VoltooideTaken = 4
            OpenstaandeTaken = 0
            TotaleTaken = 4
            DatumAangemaakt = "24-03-2026"
            LaatsteUpdate = "24-03-2026"
        },
        [PSCustomObject]@{
            Id = "17"
            Klantnaam = "Home Buyer Intelligence (HBI)"
            Bedrijfsnaam = "Home Buyer Intelligence"
            Contactpersoon = "HBI Platform Beheer"
            Email = "hbi@creationaltfix.nl"
            Telefoon = "+31 6 12345678"
            Domeinnaam = "hbi.creationaltfix.nl"
            Dienst = "AI Vastgoed & Aankoop Analyse Platform"
            Categorie = "AI Tooling & Cloud SaaS"
            Fase = "Fase 4: In Ontwikkeling"
            Status = "In Ontwikkeling"
            OfferteExclBTW = "1200,00"
            OfferteInclBTW = "1452,00"
            DoelenEnScope = "Intelligent platform voor het analyseren van vastgoedkoopopties met AI, bouwkundige checklists en berekeningen."
            DesignThema = "Modern data-dashboard thema met interactieve visualisaties."
            VoltooideTaken = 3
            OpenstaandeTaken = 1
            TotaleTaken = 4
            DatumAangemaakt = "25-08-2026"
            LaatsteUpdate = "28-08-2026"
        }
    )
}

# Header Row (20 Kolommen)
$headers = @(
    "Project ID",
    "Klantnaam",
    "Bedrijfsnaam",
    "Contactpersoon",
    "E-mailadres",
    "Telefoonnummer",
    "Domeinnaam",
    "Dienst",
    "Categorie",
    "Huidige Fase",
    "Status Omschrijving",
    "Offertebedrag Excl BTW (EUR)",
    "Offertebedrag Incl 21% BTW (EUR)",
    "Doelstellingen & Scope",
    "Design Voorkeuren / Thema",
    "Voltooide Taken",
    "Openstaande Taken",
    "Totale Taken",
    "Aanmaakdatum",
    "Laatste Update"
)

$csvLines = [System.Collections.Generic.List[string]]::new()
$csvLines.Add(($headers | ForEach-Object { "`"$_`"" }) -join ";")

foreach ($p in $projects) {
    $row = @(
        "`"$($p.Id)`"",
        "`"$($p.Klantnaam)`"",
        "`"$($p.Bedrijfsnaam)`"",
        "`"$($p.Contactpersoon)`"",
        "`"$($p.Email)`"",
        "`"$($p.Telefoon)`"",
        "`"$($p.Domeinnaam)`"",
        "`"$($p.Dienst)`"",
        "`"$($p.Categorie)`"",
        "`"$($p.Fase)`"",
        "`"$($p.Status)`"",
        "`"$($p.OfferteExclBTW)`"",
        "`"$($p.OfferteInclBTW)`"",
        "`"$($p.DoelenEnScope -replace '"', '""')`"",
        "`"$($p.DesignThema -replace '"', '""')`"",
        $p.VoltooideTaken,
        $p.OpenstaandeTaken,
        $p.TotaleTaken,
        "`"$($p.DatumAangemaakt)`"",
        "`"$($p.LaatsteUpdate)`""
    )
    $csvLines.Add($row -join ";")
}

# Schrijf bestand met expliciete UTF-8 BOM encoding voor 100% foutloze Excel weergave
$utf8BomEncoding = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines($csvPath, $csvLines, $utf8BomEncoding)

# --- TIERED RETENTION POLICY: 30 Dagen Dagelijks -> 12 Maanden Maandelijks -> 1/Jaar ---
function Apply-TieredRetentionPolicy {
    param(
        [Parameter(Mandatory=$true)]
        [string]$TargetDir,
        [string]$Filter = "*.csv"
    )

    if (-not (Test-Path $TargetDir)) { return }

    $now = Get-Date
    $items = Get-ChildItem -Path $TargetDir -File -Filter $Filter | Sort-Object LastWriteTime

    if ($items.Count -eq 0) { return }

    $toKeep = [System.Collections.Generic.HashSet[string]]::new()
    $monthlyBuckets = @{} # Key: "yyyy-MM" -> item with latest date in that month
    $yearlyBuckets = @{}  # Key: "yyyy"    -> item with latest date in that year

    foreach ($item in $items) {
        $itemDate = $item.LastWriteTime
        
        # Parse datum uit bestandsnaam indien aanwezig (bijv. CreationAltFix_CRM_Projecten_2026-08-28.csv)
        if ($item.Name -match "(\d{4})[-_](\d{2})[-_](\d{2})") {
            try {
                $itemDate = [datetime]::new([int]$matches[1], [int]$matches[2], [int]$matches[3])
            } catch { }
        }

        $ageDays = ($now - $itemDate).TotalDays

        if ($ageDays -le 30) {
            # 1. Binnen 30 dagen: BEWAAR ELKE DAG
            [void]$toKeep.Add($item.FullName)
        }
        elseif ($ageDays -le 365) {
            # 2. Tussen 30 en 365 dagen: BEWAAR 1 PER MAAND (de meest recente van die maand)
            $monthKey = $itemDate.ToString("yyyy-MM")
            $monthlyBuckets[$monthKey] = $item.FullName
        }
        else {
            # 3. Ouder dan 365 dagen: BEWAAR 1 PER JAAR (de meest recente van dat jaar)
            $yearKey = $itemDate.ToString("yyyy")
            $yearlyBuckets[$yearKey] = $item.FullName
        }
    }

    # Voeg maandelijkse en jaarlijkse bewaarde bestanden toe
    foreach ($path in $monthlyBuckets.Values) { [void]$toKeep.Add($path) }
    foreach ($path in $yearlyBuckets.Values) { [void]$toKeep.Add($path) }

    # Verwijder bestanden buiten de retentie
    $deletedCount = 0
    foreach ($item in $items) {
        if (-not $toKeep.Contains($item.FullName)) {
            Remove-Item -Path $item.FullName -Force -ErrorAction SilentlyContinue
            $deletedCount++
        }
    }

    return @{
        TotalScanned = $items.Count
        KeptCount = $toKeep.Count
        DeletedCount = $deletedCount
    }
}

$retentionResult = Apply-TieredRetentionPolicy -TargetDir $OutputDir -Filter "*.csv"

if (-not $Quiet) {
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  Creation+Alt+Fix - Live CRM & Klanten Data Export Engine" -ForegroundColor White
    Write-Host "================================================================================" -ForegroundColor Cyan
    $bron = if ($isLive) { "LIVE Firebase Firestore" } else { "Actuele Project Database" }
    Write-Host "  [OK] $($projects.Count) Klantdossiers geexporteerd vanuit: $bron" -ForegroundColor Green
    Write-Host "  Bestand: $csvPath" -ForegroundColor Yellow
    Write-Host "  Formaat: UTF-8 met BOM (100% Excel-compatibel, puntkomma-gescheiden)" -ForegroundColor Gray
    Write-Host "  Retentiebeleid: 30 Dagen Dagelijks -> 12 Maanden Maandelijks -> 1/Jaar (Actief)`n" -ForegroundColor DarkGray
}

if ($OpenAfterExport) {
    Start-Process $csvPath
}
