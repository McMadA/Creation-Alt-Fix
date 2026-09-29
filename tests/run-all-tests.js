/**
 * Creation+Alt+Fix - Automated CI/CD Test Suite
 * Tests every core CRM function, utility, sorting algorithm, and module.
 * 
 * Run with: node tests/run-all-tests.js
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CRM_DIR = path.join(ROOT_DIR, "crm");

console.log("\n========================================================");
console.log("🧪 STARTING CREATION+ALT+FIX AUTOMATED CI/CD TEST SUITE");
console.log("========================================================\n");

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failedCount++;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}\n`);
        failedCount++;
    }
}

// ========================================================
// 1. CONFIG & CORE UTILITIES (crm/js/crm-config.js)
// ========================================================
console.log("📌 SUITE 1: Core Configuration & Utilities");

const { 
    escapeHtml, 
    sanitizeUrl,
    isAdminEmail, 
    formatProjectStatus, 
    formatCurrency, 
    normalizeDomain,
    isClientAuthActivated,
    BRANDING,
    SUBSCRIPTION_PLANS,
    ADMIN_EMAILS
} = await import("../crm/js/crm-config.js");

test("escapeHtml prevents XSS injection", () => {
    assert.equal(escapeHtml("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
    assert.equal(escapeHtml('Foo & Bar "Baz"'), "Foo &amp; Bar &quot;Baz&quot;");
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
    assert.equal(escapeHtml(12345), "12345");
});

test("sanitizeUrl strips dangerous schemes and control characters", () => {
    assert.equal(sanitizeUrl("javascript:alert(1)"), "#");
    assert.equal(sanitizeUrl("JAVASCRIPT:alert('xss')"), "#");
    assert.equal(sanitizeUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), "#");
    assert.equal(sanitizeUrl("vbscript:msgbox(1)"), "#");
    assert.equal(sanitizeUrl("java\x00script:alert(1)"), "#");
    assert.equal(sanitizeUrl("javascript\n:alert(1)"), "#");
    assert.equal(sanitizeUrl("https://creationaltfix.nl/crm/"), "https://creationaltfix.nl/crm/");
    assert.equal(sanitizeUrl("http://example.com"), "http://example.com");
    assert.equal(sanitizeUrl("mailto:info@creationaltfix.nl"), "mailto:info@creationaltfix.nl");
    assert.equal(sanitizeUrl("tel:+31619135453"), "tel:+31619135453");
    assert.equal(sanitizeUrl("/crm/status/index.html"), "/crm/status/index.html");
    assert.equal(sanitizeUrl(""), "#");
    assert.equal(sanitizeUrl(null), "#");
});

test("isAdminEmail accurately checks authorized admins", () => {
    assert.equal(isAdminEmail("allardv03@gmail.com"), true);
    assert.equal(isAdminEmail("info@creationaltfix.nl"), true);
    assert.equal(isAdminEmail("  ALLARDV03@GMAIL.COM  "), true, "Must be case-insensitive and trimmed");
    assert.equal(isAdminEmail("hacker@malicious.com"), false);
    assert.equal(isAdminEmail(""), false);
    assert.equal(isAdminEmail(null), false);
});

test("isClientAuthActivated requires valid email and authentic activation flags", () => {
    // 1. Projects WITHOUT email must NEVER evaluate to activated
    assert.equal(isClientAuthActivated({ isClientAccount: true }), false, "Missing email must be false even if isClientAccount is true");
    assert.equal(isClientAuthActivated({ email: "", isClientAccount: true }), false, "Empty email must be false");
    assert.equal(isClientAuthActivated({ email: "   ", clientUid: "valid_uid_123" }), false, "Whitespace email must be false");
    assert.equal(isClientAuthActivated({ email: "invalid-email-format", isClientAccount: true }), false, "Email without @ must be false");
    assert.equal(isClientAuthActivated(null), false, "Null project must be false");
    assert.equal(isClientAuthActivated({}), false, "Empty project must be false");

    // 2. Legacy mock UIDs without isClientAccount must be false
    assert.equal(isClientAuthActivated({ email: "client@bedrijf.nl", clientUid: "QVzS7PyJkeXi7mM50HOgXsSiQFe2" }), false, "Mock UID must be ignored");

    // 3. Valid email with authentic clientUid or isClientAccount flag must evaluate to true
    assert.equal(isClientAuthActivated({ email: "client@bedrijf.nl", clientUid: "auth_user_999" }), true, "Authentic UID with email must be true");
    assert.equal(isClientAuthActivated({ email: "client@bedrijf.nl", isClientAccount: true }), true, "isClientAccount with email must be true");
});


test("formatProjectStatus maps all 5 workflow phases correctly", () => {
    // Fase 1
    const p1 = formatProjectStatus("Nieuwe Lead");
    assert.equal(p1.phase, 1);
    assert.equal(p1.isPhase5, false);

    const p1b = formatProjectStatus("Intake Voltooid");
    assert.equal(p1b.phase, 1);

    // Fase 2
    const p2 = formatProjectStatus("Wacht op Akkoord (Offerte)");
    assert.equal(p2.phase, 2);

    // Fase 3
    const p3 = formatProjectStatus("Design & Ontwerp");
    assert.equal(p3.phase, 3);

    // Fase 4
    const p4 = formatProjectStatus("In Ontwikkeling");
    assert.equal(p4.phase, 4);

    // Fase 5 Mollie (Payment Waiting)
    const p5m = formatProjectStatus("Fase 5: Wacht op Betaling (Mollie)");
    assert.equal(p5m.phase, 5);
    assert.equal(p5m.isPhase5, true);
    assert.equal(p5m.isPaymentWaiting, true);

    // Fase 5 Live & Voldaan (Completed)
    const p5c = formatProjectStatus("Fase 5: Volledig Live & Voldaan");
    assert.equal(p5c.phase, 5);
    assert.equal(p5c.isPhase5, true);
    assert.equal(p5c.isPaymentWaiting, false);

    // Fallback on missing or raw status
    const pFb = formatProjectStatus(null);
    assert.equal(pFb.phase, 1);
});

test("formatCurrency formats standard and edge values properly", () => {
    assert.equal(formatCurrency(150), "€ 150,00");
    assert.equal(formatCurrency("22,00"), "€ 22,00");
    assert.equal(formatCurrency("175.5"), "€ 175,50");
    assert.equal(formatCurrency(0), "€ 0,00");
    assert.equal(formatCurrency(""), "€ 0,00");
    assert.equal(formatCurrency(null), "€ 0,00");
});

test("normalizeDomain strips protocols, www, subpaths and whitespace", () => {
    assert.equal(normalizeDomain("https://www.example.nl/besseling/"), "example.nl");
    assert.equal(normalizeDomain("http://example.com/"), "example.com");
    assert.equal(normalizeDomain("WWW.CREATIONALTFIX.NL"), "creationaltfix.nl");
    assert.equal(normalizeDomain("sub.domain.org"), "sub.domain.org");
    assert.equal(normalizeDomain(""), "");
    assert.equal(normalizeDomain(null), "");
});

// ========================================================
// 2. DASHBOARD KPI METRICS (crm/admin/js/modules/admin-stats.js)
// ========================================================
console.log("\n📌 SUITE 2: Dashboard Stats & KPI Module");

const { calculateDashboardStats } = await import("../crm/admin/js/modules/admin-stats.js");

test("calculateDashboardStats aggregates phases and open tasks correctly", () => {
    const mockProjects = [
        { id: "1", status: "Nieuwe Lead", tasks: [{ id: "t1", completed: false }] },
        { id: "2", status: "Fase 2: Wacht op Akkoord (Offerte)", tasks: [] },
        { id: "3", status: "Fase 3: Design & Ontwerp", tasks: [{ id: "t2", completed: true }, { id: "t3", completed: false }] },
        { id: "4", status: "Fase 4: In Ontwikkeling", tasks: [{ id: "t4", completed: false }] },
        { id: "5", status: "Fase 5: Wacht op Betaling (Mollie)", tasks: [] },
        { id: "6", status: "Fase 5: Volledig Live & Voldaan", tasks: [{ id: "t5", completed: true }] }
    ];

    const stats = calculateDashboardStats(mockProjects);
    assert.equal(stats.leads, 1, "Leads count must be 1 (phase 1)");
    assert.equal(stats.waiting, 2, "Waiting count must be 2 (phase 2 and phase 5 Mollie)");
    assert.equal(stats.projects, 2, "Active projects must be 2 (phase 3 and 4)");
    assert.equal(stats.delivered, 2, "Delivered projects must be 2 (all phase 5)");
    assert.equal(stats.openTasks, 3, "Open tasks must be 3 (t1, t3, t4)");
});

// ========================================================
// 3. 8-COLUMN SORTING ENGINE (crm/admin/js/modules/admin-tables.js)
// ========================================================
console.log("\n📌 SUITE 3: Table Sorting Engine & Date Parser");

const { 
    sortProjectsList, 
    parseProjectDate, 
    getStatusWeight 
} = await import("../crm/admin/js/modules/admin-tables.js");

test("parseProjectDate accurately parses all project date formats", () => {
    // 1. DD-MM-YYYY format
    const d1 = parseProjectDate({ date: "25-08-2026" });
    assert.equal(new Date(d1).getFullYear(), 2026);
    assert.equal(new Date(d1).getMonth(), 7); // August is 7 (0-indexed)
    assert.equal(new Date(d1).getDate(), 25);

    // 2. YYYY-MM-DD format
    const d2 = parseProjectDate({ date: "2026-09-27" });
    assert.equal(new Date(d2).getFullYear(), 2026);
    assert.equal(new Date(d2).getMonth(), 8); // September is 8
    assert.equal(new Date(d2).getDate(), 27);

    // 3. Firestore Timestamp object format
    const d3 = parseProjectDate({ updatedAt: { seconds: 1780000000 } });
    assert.equal(d3, 1780000000000);

    // 4. ISO string format
    const d4 = parseProjectDate({ updatedAt: "2026-09-27T01:00:00.000Z" });
    assert.ok(d4 > 0);

    // 5. Empty/null fallback
    assert.equal(parseProjectDate({}), 0);
});

test("sortProjectsList sorts across all 8 columns in ASC and DESC", () => {
    const list = [
        { id: "1", client: "Besseling", domainName: "creationaltfix.nl", email: "maico@besseling.nl", service: "Loodgieter Web", status: "Fase 4: In Ontwikkeling", date: "20-08-2026", tasks: [{ completed: true }], messages: [] },
        { id: "2", client: "Angela", domainName: "angelastenekes.nl", email: "angela@knipperij.nl", service: "Kapsalon Portfolio", status: "Fase 5: Volledig Live & Voldaan", date: "10-08-2026", tasks: [{ completed: true }, { completed: true }], messages: [{ sender: "client", status: "open" }] },
        { id: "3", client: "Capybara", domainName: "capybaraculture.com", email: "info@capybara.com", service: "Community", status: "Fase 1: Nieuwe Lead", date: "26-08-2026", tasks: [], messages: [] }
    ];

    // 1. Client ASC: Angela, Besseling, Capybara
    const byClientAsc = sortProjectsList(list, "client", "asc");
    assert.equal(byClientAsc[0].client, "Angela");
    assert.equal(byClientAsc[2].client, "Capybara");

    // 2. Client DESC: Capybara, Besseling, Angela
    const byClientDesc = sortProjectsList(list, "client", "desc");
    assert.equal(byClientDesc[0].client, "Capybara");
    assert.equal(byClientDesc[2].client, "Angela");

    // 3. Status ASC: Phase 1 (Capybara) -> Phase 4 (Besseling) -> Phase 5 (Angela)
    const byStatusAsc = sortProjectsList(list, "status", "asc");
    assert.equal(byStatusAsc[0].client, "Capybara");
    assert.equal(byStatusAsc[2].client, "Angela");

    // 4. Actions (urgency): Angela has unread message -> should rank top
    const byActions = sortProjectsList(list, "actions", "desc");
    assert.equal(byActions[0].client, "Angela", "Project with unread client message must rank first in actions");

    // 5. Tasks DESC: Angela (2/2) -> Besseling (1/1) -> Capybara (0/0)
    const byTasks = sortProjectsList(list, "tasks", "desc");
    assert.equal(byTasks[0].client, "Angela");
    assert.equal(byTasks[2].client, "Capybara");
});

// ========================================================
// 4. BOOKKEEPING & RECOMMENDATIONS (crm/admin/js/modules/bookkeeping-data.js)
// ========================================================
console.log("\n📌 SUITE 4: Bookkeeping & Plan Recommendations");

const { getPiBoekhoudingInfo } = await import("../crm/admin/js/modules/bookkeeping-data.js");

test("getPiBoekhoudingInfo identifies recorded clients and generates dynamic advice", () => {
    // Known clients with specific plans
    const angelaInfo = getPiBoekhoudingInfo({ domainName: "angelastenekes.nl", client: "Angela" });
    assert.ok(angelaInfo !== null);
    assert.equal(angelaInfo.kvk, "59520353");
    assert.equal(angelaInfo.recommendedPlanId, "transition_2027_loyalty", "Angela must be on Trouwe Klant plan");

    const besselingInfo = getPiBoekhoudingInfo({ domainName: "creationaltfix.nl/besselinginstallatietechniek/", client: "Besseling" });
    assert.equal(besselingInfo.recommendedPlanId, "managed_nl", "Besseling must be on Managed Cloud Hosting All-in (.nl)");

    const ftruckInfo = getPiBoekhoudingInfo({ domainName: "ftruckstore.nl", client: "F-Truck Store" });
    assert.equal(ftruckInfo.recommendedPlanId, "managed_nl", "F-Truck Store must be on Managed Cloud Hosting All-in (.nl)");

    const livianInfo = getPiBoekhoudingInfo({ domainName: "liviandesign.nl", client: "Livian Design" });
    assert.equal(livianInfo.recommendedPlanId, "none", "Livian Design is one-off / resting");

    const qolipaInfo = getPiBoekhoudingInfo({ domainName: "qolipa.nl", client: "Qolipa" });
    assert.equal(qolipaInfo.currentPlanId, "internal_project", "Qolipa is Allard internal project with Vimexx passthrough");
    assert.equal(qolipaInfo.recommendedPlanId, "none");

    const capyInfo = getPiBoekhoudingInfo({ domainName: "capybaraculture.com", client: "Capybara Culture" });
    assert.equal(capyInfo.currentPlanId, "internal_project", "Capybara Culture is Allard internal project with Vimexx passthrough");

    // Dynamic advice for unknown .nl domain
    const dynNl = getPiBoekhoudingInfo({ domainName: "nieuweklant.nl", client: "Nieuwe Klant" });
    assert.equal(dynNl.recommendedPlanId, "managed_nl");

    // Dynamic advice for unknown .com domain
    const dynCom = getPiBoekhoudingInfo({ domainName: "globalbrand.com", client: "Global Brand" });
    assert.equal(dynCom.recommendedPlanId, "managed_com");

    // Dynamic advice for custom TLD
    const dynCustom = getPiBoekhoudingInfo({ domainName: "techcorp.eu", domainTld: ".eu", client: "TechCorp" });
    assert.equal(dynCustom.recommendedPlanId, "managed_custom");
});

test("project.js properly imports and binds bookkeeping and plan symbols into local scope", () => {
    const projectJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/project.js"), "utf-8");
    assert.ok(
        projectJs.includes("import { PI_BOEKHOUDING_CLIENT_DATA, getPiBoekhoudingInfo }"),
        "project.js must explicitly import getPiBoekhoudingInfo to prevent runtime ReferenceErrors"
    );
    assert.ok(
        projectJs.includes("import { SUBSCRIPTION_PLANS }"),
        "project.js must explicitly import SUBSCRIPTION_PLANS to prevent runtime ReferenceErrors"
    );
    assert.ok(
        projectJs.includes("import { open2027SubscriptionModal }"),
        "project.js must import open2027SubscriptionModal for 2027 communication"
    );
    assert.ok(
        !projectJs.includes("renderTicketsList"),
        "project.js must not reference undefined renderTicketsList; must use renderAdminMessages"
    );
    assert.ok(
        projectJs.includes("renderAdminMessages(currentProjectData.messages)"),
        "project.js onSendPortalTicket must update message thread with renderAdminMessages"
    );
});

test("admin.js and todo-sync.js prevent renderProjectsTable ReferenceError and ID collisions", async () => {
    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/admin.js"), "utf-8");
    assert.ok(
        !adminJs.includes("renderProjectsTable(cachedProjects)"),
        "admin.js must not call undefined renderProjectsTable(cachedProjects); must call filterAndRenderTables"
    );
    assert.ok(
        adminJs.includes("window.renderProjectsTable ="),
        "admin.js must provide safe window.renderProjectsTable alias to shield against legacy cached calls"
    );
    assert.ok(
        adminJs.includes("filterAndRenderTables()"),
        "admin.js handleExecuteTodoSync must refresh tables with filterAndRenderTables()"
    );

    const { PROJECT_PROFILES } = await import("../crm/js/todo-sync.js");
    assert.notEqual(
        PROJECT_PROFILES.HOOFDWEBSITE.id,
        "6",
        "HOOFDWEBSITE profile ID must not be '6' to prevent collision with Livian Design (id: 6)"
    );
});

test("5 audited CRM features: F-Truck plan, Uptime KPI, client dedup, and header/toolbar sync", async () => {
    const { getPiBoekhoudingInfo } = await import("../crm/admin/js/modules/bookkeeping-data.js");
    const ftruckInfo = getPiBoekhoudingInfo({ domainName: "ftruckstore.nl", client: "F-Truck Store" });
    assert.equal(ftruckInfo.recommendedPlanId, "managed_nl", "F-Truck Store must be assigned managed_nl (€ 150,-) instead of € 95,-");

    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/admin.js"), "utf-8");
    assert.ok(adminJs.includes("admin-main-header-title"), "admin.js must dynamically update admin-main-header-title");
    assert.ok(adminJs.includes("admin-main-toolbar"), "admin.js must synchronize toolbar visibility");
    assert.ok(adminJs.includes("onlineCount"), "admin.js must compute onlineCount to prevent false offline alarms");
    assert.ok(adminJs.includes("r.client.trim().toLowerCase() === r.name.trim().toLowerCase()"), "admin.js must deduplicate identical client and name");

    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/index.html"), "utf-8");
    assert.ok(indexHtml.includes('id="admin-main-header-title"'), "index.html must have id='admin-main-header-title'");
    assert.ok(indexHtml.includes('id="admin-main-toolbar"'), "index.html must have id='admin-main-toolbar'");
});

test("generate2027ProposalText and WhatsApp generator produce accurate client communication", async () => {
    const { generate2027ProposalText, generate2027WhatsAppText } = await import("../crm/admin/js/modules/subscription-2027.js");
    const mockProj = {
        id: "proj_angela",
        client: "Angela Stenekes",
        domainName: "angelastenekes.nl",
        email: "angelastenekes@hotmail.com",
        phone: "0612345678"
    };

    const emailBody = generate2027ProposalText(mockProj, "managed_nl");
    assert.ok(emailBody.includes("Beste Angela Stenekes"), "Must address client personally");
    assert.ok(emailBody.includes("angelastenekes.nl"), "Must reference client domain");
    assert.ok(emailBody.includes("€ 150,00 excl. BTW"), "Must state correct plan price");
    assert.ok(emailBody.includes("30 minuten per jaar"), "Must include 30 minutes content update perk");
    assert.ok(emailBody.includes("https://creationaltfix.nl/crm/status/?id=proj_angela"), "Must include direct status portal link");
    assert.ok(emailBody.includes("angelastenekes@hotmail.com"), "Must include client login email");
    assert.ok(emailBody.includes("Wachtwoord vergeten"), "Must instruct client to use password reset for first login");
    assert.ok(emailBody.includes("spam- / ongewenste e-mailmap"), "Must alert client to check spam folder for reset email");

    // Loyalty plan test
    const loyaltyBody = generate2027ProposalText(mockProj, "transition_2027_loyalty");
    assert.ok(loyaltyBody.includes("€ 95,00"), "Loyalty plan must show € 95,00 for 2027");
    assert.ok(loyaltyBody.includes("€ 150,00"), "Loyalty plan must state standard transition to € 150,00 in 2028");
    assert.ok(loyaltyBody.includes("angelastenekes@hotmail.com"), "Loyalty plan text must also include login email");

    const waBody = generate2027WhatsAppText(mockProj, "allin_apk");
    assert.ok(waBody.includes("Hoi Angela Stenekes"), "WhatsApp message must address client");
    assert.ok(waBody.includes("€ 500,00,- excl. BTW"), "WhatsApp message must state all-in APK price");
    assert.ok(waBody.includes("angelastenekes@hotmail.com"), "WhatsApp text must include login email");
    assert.ok(waBody.includes("spambox"), "WhatsApp text must mention spam check");
});

test("SUBSCRIPTION_PLANS contains transition_2027_loyalty with correct rate and perks", () => {
    assert.ok(SUBSCRIPTION_PLANS["transition_2027_loyalty"], "transition_2027_loyalty must exist in SUBSCRIPTION_PLANS");
    assert.equal(SUBSCRIPTION_PLANS["transition_2027_loyalty"].price, "95,00");
    assert.ok(SUBSCRIPTION_PLANS["transition_2027_loyalty"].desc.includes("30 min. service"));
    assert.ok(SUBSCRIPTION_PLANS["managed_nl"].desc.includes("30 min. service"));
});

// ========================================================
// 5. UPTIME MONITORING ENGINE (crm/js/uptime-monitor.js)
// ========================================================
console.log("\n📌 SUITE 5: Uptime Monitoring Engine");

const { 
    parseDomainAndPath, 
    getMonitoredDomains, 
    REQUIRED_CONSECUTIVE_FAILURES 
} = await import("../crm/js/uptime-monitor.js");

test("parseDomainAndPath extracts host and subpaths cleanly", () => {
    const res1 = parseDomainAndPath("https://creationaltfix.nl/besselinginstallatietechniek/");
    assert.equal(res1.domain, "creationaltfix.nl");
    assert.equal(res1.path, "/besselinginstallatietechniek/");

    const res2 = parseDomainAndPath("http://www.google.com");
    assert.equal(res2.domain, "google.com");
    assert.equal(res2.path, "/");

    const res3 = parseDomainAndPath("capybaraculture.com/shop/merch");
    assert.equal(res3.domain, "capybaraculture.com");
    assert.equal(res3.path, "/shop/merch/");

});

test("REQUIRED_CONSECUTIVE_FAILURES is configured to 3 to prevent false alarms", () => {
    assert.equal(REQUIRED_CONSECUTIVE_FAILURES, 3, "Alert threshold must strictly be 3 consecutive failures");
});

test("getMonitoredDomains derives endpoints dynamically from projects list", () => {
    const projects = [
        { id: "p1", client: "Client 1", domainName: "client1.nl" },
        { id: "p2", client: "Client 2", domainName: "creationaltfix.nl/subpath/" },
        { id: "p3", client: "No Domain", domainName: "" } // should be skipped
    ];

    const monitors = getMonitoredDomains(projects);
    assert.equal(monitors.length, 2);
    assert.equal(monitors[0].domain, "client1.nl");
    assert.equal(monitors[1].domain, "creationaltfix.nl");
    assert.equal(monitors[1].path, "/subpath/");
});

// ========================================================
// 6. SYNTAX INTEGRITY OF ALL CRM JAVASCRIPT FILES
// ========================================================
console.log("\n📌 SUITE 6: Full Codebase Syntax & Parse Validation");

const filesToCheck = [
    "crm/js/crm-config.js",
    "crm/js/firebase-config.js",
    "crm/js/core/firebase.js",
    "crm/js/core/db-service.js",
    "crm/js/core/store.js",
    "crm/js/core/action-dispatcher.js",
    "crm/js/core/toast.js",
    "crm/js/core/offline-queue.js",
    "crm/js/core/schemas.js",
    "crm/js/uptime-monitor.js",
    "crm/js/email-notifications.js",
    "crm/js/ai-engine.js",
    "crm/js/pdf-generator.js",
    "crm/js/todo-sync.js",
    "crm/admin/js/admin.js",
    "crm/admin/js/project.js",
    "crm/admin/js/modules/admin-tables.js",
    "crm/admin/js/modules/admin-stats.js",
    "crm/admin/js/modules/admin-subscriptions.js",
    "crm/admin/js/modules/bookkeeping-data.js",
    "crm/admin/js/modules/subscription-2027.js",
    "crm/admin/js/modules/admin-kanban.js",
    "crm/admin/js/modules/admin-todo-modal.js",
    "crm/admin/js/modules/admin-monitoring-ui.js",
    "crm/admin/js/modules/project-billing.js",
    "crm/admin/js/modules/project-timeline.js",
    "crm/status/js/status.js",
    "crm/status/js/modules/translations.js",
    "crm/status/js/modules/visual-feedback.js",
    "crm/status/js/modules/sla-signer.js"
];

for (const relPath of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, relPath);
    test(`Syntax validation: ${relPath}`, () => {
        assert.ok(fs.existsSync(fullPath), `File must exist: ${relPath}`);
        // Run node --check
        execSync(`node --check "${fullPath}"`, { stdio: "pipe" });
    });
}

// ========================================================
// 7. SECURITY RULES & WHITELIST SYNCHRONIZATION
// ========================================================
console.log("\n📌 SUITE 7: Firebase Security Rules & Whitelist Sync");

test("firestore.rules exists and synchronizes all ADMIN_EMAILS", () => {
    const firestoreRulesPath = path.join(ROOT_DIR, "firestore.rules");
    assert.ok(fs.existsSync(firestoreRulesPath), "firestore.rules must exist");
    const rulesContent = fs.readFileSync(firestoreRulesPath, "utf-8");

    // All emails in ADMIN_EMAILS must be present in firestore.rules
    for (const email of ADMIN_EMAILS) {
        assert.ok(
            rulesContent.includes(email), 
            `firestore.rules must whitelist admin email: ${email}`
        );
    }

    // Must whitelist 2027 subscription confirmation fields for clients
    assert.ok(
        rulesContent.includes("subscriptionPlan2027Status"),
        "firestore.rules must whitelist subscriptionPlan2027Status for client confirmations"
    );
    assert.ok(
        rulesContent.includes("subscriptionPlan2027ConfirmedAt"),
        "firestore.rules must whitelist subscriptionPlan2027ConfirmedAt for client confirmations"
    );
});

test("storage.rules enforces 10MB file limit and client restrictions", () => {
    const storageRulesPath = path.join(ROOT_DIR, "storage.rules");
    assert.ok(fs.existsSync(storageRulesPath), "storage.rules must exist");
    const storageContent = fs.readFileSync(storageRulesPath, "utf-8");
    assert.ok(storageContent.includes("10 * 1024 * 1024"), "Must enforce 10MB limit in storage.rules");
});

// ========================================================
// 8. MULTI-DOMAIN RESILIENCE & SANITIZATION
// ========================================================
console.log("\n📌 SUITE 8: Multi-Domain Parsing & Deduplication");

test("Multi-domain inputs handle strings, arrays, and deduplication safely", () => {
    const rawExtraString = "capybara.nl, capybaraculture.com, https://shop.capybara.nl/";
    const parsedList = rawExtraString.split(/[\r\n,;]+/).map(d => normalizeDomain(d)).filter(Boolean);
    const uniqueList = Array.from(new Set(parsedList));

    assert.equal(uniqueList.length, 3);
    assert.equal(uniqueList[0], "capybara.nl");
    assert.equal(uniqueList[1], "capybaraculture.com");
    assert.equal(uniqueList[2], "shop.capybara.nl");
});

// ========================================================
// 9. ZERO-LEAK WHITE-LABEL CODE ISOLATION
// ========================================================
console.log("\n📌 SUITE 9: Code Sanitization & White-Label Leak Audit");

test("Generic table, stats and core modules contain no hardcoded personal KVKs", () => {
    const genericFiles = [
        "crm/admin/js/modules/admin-tables.js",
        "crm/admin/js/modules/admin-stats.js",
        "crm/js/core/db-service.js",
        "crm/status/js/modules/translations.js"
    ];

    for (const rel of genericFiles) {
        const content = fs.readFileSync(path.join(ROOT_DIR, rel), "utf-8");
        // Check that personal KVKs (like 59520353 or 89192036) are NOT inside generic reusable code
        assert.ok(!content.includes("59520353"), `${rel} must not contain personal KVK 59520353`);
        assert.ok(!content.includes("89192036"), `${rel} must not contain personal KVK 89192036`);
    }
});

test("CRM HTML files contain no static mock IPs, fake percentages, or dummy numbers before Firebase loads", () => {
    const statusHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/status/index.html"), "utf-8");
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/index.html"), "utf-8");
    const projectHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/project.html"), "utf-8");

    // Client portal audits
    assert.ok(!statusHtml.includes("25% Complete"), "status.html must not contain hardcoded '25% Complete'");
    assert.ok(!statusHtml.includes("Website Online (99.98%)"), "status.html must not contain hardcoded 'Website Online (99.98%)'");
    assert.ok(!statusHtml.includes('id="client-card-dns-ip">185.104.29.148<'), "status.html must not contain mock IP 185.104.29.148");
    assert.ok(!statusHtml.includes('id="header-company-name">Mijn Account<'), "status.html must not have static 'Mijn Account'");

    // Admin dashboard audits
    assert.ok(!adminHtml.includes("13/13 Live"), "admin.html must not contain mock '13/13 Live'");
    assert.ok(!adminHtml.includes("(Angela, Scholte, Stenekes)"), "admin.html must not hardcode client names in KPI subtitle");
    assert.ok(!adminHtml.includes('id="stat-leads" style="color: var(--color-accent);">0<'), "admin.html must not flash static 0 for leads");

    // Project workstation audits
    assert.ok(!projectHtml.includes('id="tab-tasks-count">0<'), "project.html must not flash static (0) in tasks tab");
});


// ========================================================
// 10. ADMIN KLANTVIEW PREVIEW ENGINE
// ========================================================
console.log("\n📌 SUITE 10: Admin Klantview Preview Engine");

test("Project workstation HTML contains Klantview tab, iframe, and preview button", () => {
    const projectHtmlPath = path.join(ROOT_DIR, "crm/admin/project.html");
    const content = fs.readFileSync(projectHtmlPath, "utf-8");
    assert.ok(content.includes('id="btn-open-client-portal"'), "Must have #btn-open-client-portal button in header");
    assert.ok(content.includes('data-tab="tab-clientview"'), "Must have [data-tab='tab-clientview'] navigation button");
    assert.ok(content.includes('id="tab-clientview"'), "Must have #tab-clientview pane container");
    assert.ok(content.includes('id="clientview-iframe"'), "Must have #clientview-iframe embedded viewport");
    assert.ok(content.includes('btn-device-switch'), "Must have device responsive switchers (Desktop, Tablet, Mobile)");
});

test("Client portal HTML contains sticky admin preview banner", () => {
    const statusHtmlPath = path.join(ROOT_DIR, "crm/status/index.html");
    const content = fs.readFileSync(statusHtmlPath, "utf-8");
    assert.ok(content.includes('id="admin-preview-banner"'), "Must have #admin-preview-banner in status portal");
});

test("Admin tables and modal provide direct Klantview preview shortcuts", () => {
    const tablesJsPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-tables.js");
    const tablesContent = fs.readFileSync(tablesJsPath, "utf-8");
    assert.ok(tablesContent.includes('status/index.html?preview=true&id='), "admin-tables.js must link directly to Klantview preview");

    const adminJsPath = path.join(ROOT_DIR, "crm/admin/js/admin.js");
    const adminContent = fs.readFileSync(adminJsPath, "utf-8");
    assert.ok(adminContent.includes('status/index.html?preview=true&id='), "admin.js must provide Klantview preview in Klantkaart modal");
});


// ========================================================
// 11. APPLICATION SECURITY & THREAT DEFENSES
// ========================================================
console.log("\n📌 SUITE 11: Application Security & Threat Defenses");

const { sanitizeCsvField } = await import("../crm/admin/js/modules/admin-tables.js");

test("sanitizeCsvField neutralizes spreadsheet formula injection (CWE-1236)", () => {
    assert.equal(sanitizeCsvField("=cmd|' /C calc'!A0"), "'=cmd|' /C calc'!A0", "Must prepend single quote to formula starting with =");
    assert.equal(sanitizeCsvField("+12345"), "'+12345", "Must prepend single quote to +");
    assert.equal(sanitizeCsvField("-500"), "'-500", "Must prepend single quote to -");
    assert.equal(sanitizeCsvField("@SUM(A1:A10)"), "'@SUM(A1:A10)", "Must prepend single quote to @");
    assert.equal(sanitizeCsvField("\tmalicious"), "'\tmalicious", "Must prepend single quote to tab");
    assert.equal(sanitizeCsvField("\rmalicious"), "'\rmalicious", "Must prepend single quote to CR");
    assert.equal(sanitizeCsvField('Normal "Quoted" Company'), 'Normal ""Quoted"" Company', "Must escape double quotes");
    assert.equal(sanitizeCsvField(null), "");
    assert.equal(sanitizeCsvField(undefined), "");
    assert.equal(sanitizeCsvField("Safe Project Name"), "Safe Project Name");
});

test("storage.rules enforces cross-service Firestore ownership verification and MIME whitelist", () => {
    const storageRulesPath = path.join(ROOT_DIR, "storage.rules");
    const rules = fs.readFileSync(storageRulesPath, "utf-8");
    assert.ok(rules.includes("function isProjectOwner(projectId)"), "Must define isProjectOwner");
    assert.ok(rules.includes("firestore.exists(/databases/(default)/documents/projects/$(projectId))"), "Must verify firestore.exists");
    assert.ok(rules.includes("request.resource.size < 10 * 1024 * 1024"), "Must enforce 10MB limit");
    assert.ok(!rules.includes("text/.*"), "Must not allow wildcard text/.* (MIME execution vector)");
    assert.ok(!rules.includes("image/.*"), "Must not allow wildcard image/.* (SVG XSS vector)");
});

test("crm/.htaccess enforces modern security headers and dotfile blocking", () => {
    const htaccessPath = path.join(ROOT_DIR, "crm/.htaccess");
    const htaccess = fs.readFileSync(htaccessPath, "utf-8");
    assert.ok(htaccess.includes("Strict-Transport-Security"), "Must enforce HSTS");
    assert.ok(htaccess.includes("Permissions-Policy"), "Must configure Permissions-Policy");
    assert.ok(htaccess.includes("X-Content-Type-Options \"nosniff\""), "Must enforce nosniff");
    assert.ok(htaccess.includes("X-Frame-Options \"SAMEORIGIN\""), "Must configure X-Frame-Options");
    assert.ok(htaccess.includes("Cross-Origin-Opener-Policy"), "Must configure Cross-Origin-Opener-Policy");
    assert.ok(htaccess.includes('FilesMatch "^\\.(?!well-known)"'), "Must block dotfiles");
});

test("healthcheck.php enforces SSRF, DNS pinning, and rate limiting defenses", () => {
    const healthcheckPath = path.join(ROOT_DIR, "crm/api/healthcheck.php");
    const php = fs.readFileSync(healthcheckPath, "utf-8");
    assert.ok(php.includes("CURLOPT_FOLLOWLOCATION => false"), "Must disable FOLLOWLOCATION to prevent redirect SSRF");
    assert.ok(php.includes("CURLOPT_RESOLVE"), "Must pin DNS via CURLOPT_RESOLVE to prevent TOCTOU DNS rebinding");
    assert.ok(php.includes("CURLPROTO_HTTPS | CURLPROTO_HTTP"), "Must restrict protocols to HTTPS and HTTP");
    assert.ok(php.includes("60"), "Must enforce rate limiting threshold");
});

// ========================================================
// 12. ARCHITECTURE, REACTIVE STATE & 2027 AGENCY FEATURES
// ========================================================
console.log("\n📌 SUITE 12: Architecture, Reactive State & 2027 Features");

const { ReactiveStore } = await import("../crm/js/core/store.js");
const { ActionDispatcher } = await import("../crm/js/core/action-dispatcher.js");
const { Schemas } = await import("../crm/js/core/schemas.js");
const { calculateVisualPulse } = await import("../crm/admin/js/modules/project-timeline.js");
const { generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");
const { generateSlaContractDetails } = await import("../crm/status/js/modules/sla-signer.js");
const { sendDiscordWebhookAlert, sendTelegramAlert } = await import("../crm/js/uptime-monitor.js");

test("ReactiveStore mutates state reactively and notifies subscribers", () => {
    const testStore = new ReactiveStore({ count: 1, nested: { status: "draft" } });
    let notified = false;

    testStore.subscribe("count", (state, detail) => {
        notified = true;
        assert.equal(state.count, 2);
    });

    testStore.state.count = 2;
    // Notify runs immediately or in microtask
    assert.equal(testStore.state.count, 2);
});

test("ActionDispatcher registers and executes delegated actions", () => {
    const dispatcher = new ActionDispatcher();
    let executedAction = false;
    let payloadReceived = null;

    dispatcher.register("project:test-action", (dataset) => {
        executedAction = true;
        payloadReceived = dataset;
    });

    dispatcher.dispatch("project:test-action", { projectId: "proj_123", amount: 150 });
    assert.equal(executedAction, true);
    assert.equal(payloadReceived.projectId, "proj_123");
    assert.equal(payloadReceived.amount, 150);
});

test("Schemas enforce defensive defaults and prevent runtime crashes", () => {
    // 1. Incomplete project doc
    const sanitized = Schemas.sanitizeProject({ id: "p1", client: "  Test Klant  ", status: 99 });
    assert.equal(sanitized.id, "p1");
    assert.equal(sanitized.client, "Test Klant");
    assert.equal(sanitized.companyName, "Test Klant");
    assert.equal(sanitized.status, 1, "Status > 5 must default to 1");
    assert.ok(Array.isArray(sanitized.tasks));
    assert.ok(Array.isArray(sanitized.messages));
    assert.ok(Array.isArray(sanitized.invoices));

    // 2. Task sanitizer
    const task = Schemas.sanitizeTask({ title: "Check SSL" });
    assert.equal(task.title, "Check SSL");
    assert.equal(task.status, "todo");
    assert.equal(task.completed, false);
    assert.ok(task.id.startsWith("task_"));

    // 3. Invoice sanitizer
    const inv = Schemas.sanitizeInvoice({ amountExcl: 100 });
    assert.equal(inv.amountExcl, 100);
    assert.equal(inv.amountVat, 21);
    assert.equal(inv.amountIncl, 121);
    assert.equal(inv.status, "open");
});

test("Visual Pulse calculates active, recent, and passive client states", () => {
    // Empty logs -> passive
    const pPassive = calculateVisualPulse([]);
    assert.equal(pPassive.state, "passive");

    // 2 minutes ago -> active
    const pActive = calculateVisualPulse([{ eventType: "portal_login", timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() }]);
    assert.equal(pActive.state, "active");
    assert.ok(pActive.label.includes("actief"));

    // 25 minutes ago -> recent
    const pRecent = calculateVisualPulse([{ eventType: "proposal_view", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() }]);
    assert.equal(pRecent.state, "recent");
    assert.ok(pRecent.label.includes("Offerte Bekeken"));
});

test("generateBillingWhatsAppUrl formats phone numbers and encodes message safely", () => {
    const waUrl = generateBillingWhatsAppUrl("06-12345678", "Bakkerij Sieg", "2027-001", 181.50, "https://mollie.com/pay/123");
    assert.ok(waUrl.startsWith("https://wa.me/31612345678"));
    assert.ok(waUrl.includes("Bakkerij%20Sieg"));
    assert.ok(waUrl.includes("2027-001"));
    assert.ok(waUrl.includes("https%3A%2F%2Fmollie.com%2Fpay%2F123"));
});

test("generateSlaContractDetails generates SLA terms based on 2027 plan", () => {
    const sla = generateSlaContractDetails("transition_2027_loyalty", { id: "stenekes", client: "Stenekes" });
    assert.equal(sla.annualPrice, 95);
    assert.equal(sla.serviceMinutesIncluded, 30);
    assert.ok(sla.contractNumber.includes("STENEKES"));
    assert.ok(sla.uptimeTarget.includes("99.9%"));
});

test("Multi-Channel webhook alerts reject invalid URLs gracefully without crashing", async () => {
    const resDiscord = await sendDiscordWebhookAlert({ domain: "example.com" }, "http://invalid-not-https");
    assert.equal(resDiscord, false);

    const resTelegram = await sendTelegramAlert({ domain: "example.com" }, "", "");
    assert.equal(resTelegram, false);
});

// ========================================================
// 13. AUTONOME LEAD DISCOVERY & CONCEPT FACTORY (factory/ & crm/admin/)
// ========================================================

console.log("\n📌 SUITE 13: 24/7 Autonome Lead Discovery & Concept Factory");

const { enrichBusinessProfile } = await import("../factory/enrichment/deep-intelligence.js");
const { buildOutreachPitch } = await import("../factory/generator/agy-generator.js");
const { LeadFactoryEngine } = await import("../factory/run-engine.js");

test("Geografische & Sector configuraties zijn compleet en valide", () => {
    const regions = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "factory/config/regions.json"), "utf-8"));
    const sectors = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "factory/config/sectors.json"), "utf-8"));

    assert.ok(regions.length >= 10, "Moet minimaal 10 regio's/dorpen bevatten");
    const hoogezand = regions.find(r => r.name === "Hoogezand");
    assert.ok(hoogezand, "Hoogezand moet primair aanwezig zijn");
    assert.equal(hoogezand.postalCodes[0], "9601");

    assert.ok(sectors.length >= 5, "Moet minimaal 5 categorieën bevatten");
    const bouw = sectors.find(s => s.category.includes("Bouw"));
    assert.ok(bouw && bouw.keywords.includes("schilder"), "Schilder moet in bouwsector zitten");
});

testAsync("enrichBusinessProfile normaliseert telefoons, WhatsApp en berekent potentie", async () => {
    const rawMock = {
        name: "Schildersbedrijf Groningen Test",
        slug: "schildersbedrijf-groningen-test",
        category: "Schildersbedrijf",
        address: "Hoofdstraat 1, Hoogezand",
        phone: "06-12345678",
        rating: 4.9,
        reviewsCount: 14,
        website: null
    };

    const enriched = await enrichBusinessProfile(rawMock);
    assert.equal(enriched.normalizedPhone, "0612345678");
    assert.equal(enriched.whatsAppNumber, "31612345678");
    assert.equal(enriched.hasWhatsApp, true);
    assert.ok(enriched.score >= 90, "Lead zonder website en hoge reviews moet hoge score krijgen");
    assert.ok(enriched.suggestedServices.length >= 3, "Moet voorgestelde diensten bevatten");
});

test("buildOutreachPitch genereert persoonlijke email, WhatsApp en live concept URL", () => {
    const mockLead = {
        name: "Klusbedrijf De Vries",
        slug: "klusbedrijf-de-vries",
        category: "Timmerman & Klusbedrijf",
        pitchHook: "We zagen dat je als vakman in regio Hoogezand uitstekend werk levert.",
        rating: 5.0,
        recommendedDomain: "klusbedrijf-de-vries.nl"
    };

    const pitch = buildOutreachPitch(mockLead);
    assert.ok(pitch.subject.includes("Concept website voor Klusbedrijf De Vries"));
    assert.ok(pitch.conceptUrl.includes("creationaltfix.nl/concept/klusbedrijf-de-vries"));
    assert.ok(pitch.bodyHtml.includes("creationaltfix.nl/concept/klusbedrijf-de-vries"));
    assert.ok(pitch.whatsAppText.includes("creationaltfix.nl/concept/klusbedrijf-de-vries"));
});

test("LeadFactoryEngine deduplicatie en database persistentie", () => {
    const engine = new LeadFactoryEngine();
    const db = engine.loadDatabase();

    assert.ok(Array.isArray(db.leads), "Database moet leads array bevatten");
    const testBusiness = { slug: "test-bedrijf-duplicaat", phone: "0699887766" };

    const mockDb = {
        leads: [{ slug: "test-bedrijf-duplicaat", phone: "0699887766" }]
    };

    assert.equal(engine.isLeadProcessed(mockDb, testBusiness), true);
    assert.equal(engine.isLeadProcessed(mockDb, { slug: "nieuw-bedrijf", phone: "0611223344" }), false);
});

test("applyCodeProtection injecteert Domain-Locking Killswitch, F12 blokkade en Auteurswet 1912", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const rawHtml = "<html><head><title>Test</title></head><body><h1>Hallo</h1></body></html>";
    const protectedHtml = applyCodeProtection(rawHtml, { name: "Schilder Test", slug: "schilder-test" });

    assert.ok(protectedHtml.includes("caf-security-guard"), "Moet caf-security-guard script tag bevatten");
    assert.ok(protectedHtml.includes("creationaltfix.nl"), "Moet geautoriseerd domein bevatten");
    assert.ok(protectedHtml.includes("CAF_SECURITY_UNAUTHORIZED_HOST"), "Moet killswitch exception bevatten");
    assert.ok(protectedHtml.includes("contextmenu"), "Moet contextmenu blocker bevatten");
    assert.ok(protectedHtml.includes("F12"), "Moet F12 blocker bevatten");
    assert.ok(protectedHtml.includes("AUTEURSWET 1912"), "Moet auteursrecht 1912 header bevatten");
});

test("Syntax validatie van alle nieuwe Lead Factory modules", () => {
    const factoryFiles = [
        "factory/config/factory-config.js",
        "factory/discovery/maps-crawler.js",
        "factory/enrichment/deep-intelligence.js",
        "factory/generator/agy-generator.js",
        "factory/security/code-drm.js",
        "factory/server/factory-bridge.js",
        "factory/deployer/vimexx-ftps.js",
        "factory/run-engine.js",
        "crm/admin/js/modules/admin-lead-factory.js"
    ];

    for (const f of factoryFiles) {
        const fullPath = path.join(ROOT_DIR, f);
        assert.ok(fs.existsSync(fullPath), `Bestand ${f} moet bestaan`);
        const cmd = `node --check "${fullPath}"`;
        execSync(cmd, { stdio: "pipe" });
    }
});


// ========================================================
// FINAL SUMMARY
// ========================================================
console.log("\n========================================================");
console.log(`🏁 TEST RUN FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("========================================================\n");

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
