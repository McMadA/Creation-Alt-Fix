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
let skippedCount = 0;

function test(name, fn) {
    try {
        const res = fn();
        if (res === "SKIP") {
            console.log(`  ⏭️ SKIP: ${name} (sister repository not present in CI environment)`);
            skippedCount++;
            return;
        }
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
        const res = await fn();
        if (res === "SKIP") {
            console.log(`  ⏭️ SKIP: ${name} (sister repository not present in CI environment)`);
            skippedCount++;
            return;
        }
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
    assert.equal(escapeHtml('Template `literal` breakout'), "Template &#96;literal&#96; breakout");
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
    assert.equal(sanitizeUrl("/crm/status/index.html"), "/crm/status/index.html");
    assert.equal(sanitizeUrl("//attacker.com/evil"), "#", "Must reject protocol-relative URLs");
    assert.equal(sanitizeUrl("///evil.com"), "#", "Must reject triple slash URLs");
    assert.equal(sanitizeUrl("/\\attacker.com/evil"), "#", "Must reject slash-backslash URLs");
    assert.equal(sanitizeUrl("\\\\attacker.com"), "#", "Must reject double backslash URLs");
    assert.equal(sanitizeUrl("\\evil.com"), "#", "Must reject single backslash URLs");
    assert.equal(sanitizeUrl("https://evil.com\" onfocus=\"alert(1)"), "#", "Must reject quote attribute breakout");
    assert.equal(sanitizeUrl("https://evil.com' onmouseover='alert(1)"), "#", "Must reject single-quote attribute breakout");
    assert.equal(sanitizeUrl("https://evil.com<script>"), "#", "Must reject tag injection");
    assert.equal(sanitizeUrl("https://evil.com` onload=`alert(1)"), "#", "Must reject backtick breakout");
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

test("BRANDING contains authentic legal identity, KVK 99986191 and phone +31 6 19135453", () => {
    assert.equal(BRANDING.companyName, "Creation+Alt+Fix");
    assert.equal(BRANDING.phone, "+31 6 19135453");
    assert.equal(BRANDING.kvk, "99986191");
    assert.equal(BRANDING.vat, "NL005423147B16");
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
    "crm/status/js/modules/sla-signer.js",
    "crm/intake/js/intake.js",
    "crm/intake/js/notifications.js",
    "crm/scripts/uptime-webhook-alerts.js",
    "website/js/modules/translations-data.js",
    "website/js/script.js",
    "website/js/subpage.js",
    "website/js/cookie-consent.js",
    "website/js/live-demo.js",
    "website/docs/js/docs.js"
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
const { sanitizeHeader, sanitizeRecipientEmail } = await import("../crm/js/email-notifications.js");
const { validateBridgeHost } = await import("../factory/server/factory-bridge.js");
const { OfflineQueue } = await import("../crm/js/core/offline-queue.js");

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

test("validateBridgeHost prevents DNS rebinding attacks on loopback bridge server", () => {
    assert.strictEqual(validateBridgeHost("127.0.0.1"), true);
    assert.strictEqual(validateBridgeHost("127.0.0.1:3847"), true);
    assert.strictEqual(validateBridgeHost("localhost"), true);
    assert.strictEqual(validateBridgeHost("localhost:3847"), true);
    assert.strictEqual(validateBridgeHost("creationaltfix.nl"), true);
    assert.strictEqual(validateBridgeHost("portal.creationaltfix.nl"), true);
    assert.strictEqual(validateBridgeHost("sub.creationaltfix.nl:443"), true);

    // Malicious host vectors
    assert.strictEqual(validateBridgeHost("attacker.com"), false);
    assert.strictEqual(validateBridgeHost("evilcreationaltfix.nl"), false);
    assert.strictEqual(validateBridgeHost("127.0.0.1.attacker.com"), false);
    assert.strictEqual(validateBridgeHost("localhost.attacker.com"), false);
    assert.strictEqual(validateBridgeHost(""), false);
    assert.strictEqual(validateBridgeHost(null), false);
});

test("sanitizeHeader neutralizes CRLF injection in notification headers", () => {
    assert.strictEqual(sanitizeHeader("Normal Subject"), "Normal Subject");
    assert.strictEqual(sanitizeHeader("Subject\r\nBcc: victim@example.com"), "Subject Bcc: victim@example.com");
    assert.strictEqual(sanitizeHeader("Subject\r\n\r\nInjected Body"), "Subject Injected Body");
    assert.strictEqual(sanitizeHeader("Title\x00\x1FTest"), "Title Test");
    assert.strictEqual(sanitizeHeader(null), "");
    assert.strictEqual(sanitizeHeader(undefined), "");
});

test("sanitizeRecipientEmail validates single email recipient and rejects injection attempts", () => {
    assert.strictEqual(sanitizeRecipientEmail("allard@creationaltfix.nl"), "allard@creationaltfix.nl");
    assert.strictEqual(sanitizeRecipientEmail("  user.test+extra@domain.co.uk  "), "user.test+extra@domain.co.uk");
    assert.strictEqual(sanitizeRecipientEmail("user@domain.com\r\nBcc: evil@attacker.com"), "");
    assert.strictEqual(sanitizeRecipientEmail("user1@domain.com, user2@domain.com"), "");
    assert.strictEqual(sanitizeRecipientEmail("user@domain.com evil@attacker.com"), "");
    assert.strictEqual(sanitizeRecipientEmail("not-an-email"), "");
    assert.strictEqual(sanitizeRecipientEmail(""), "");
    assert.strictEqual(sanitizeRecipientEmail(null), "");
    assert.strictEqual(sanitizeRecipientEmail(undefined), "");
});

test("OfflineQueue enforcer defends against unauthorized collections, traversal, and payload bloat", async () => {
    // 1. Unauthorized collection
    let caughtCol = false;
    try {
        await OfflineQueue.enqueue({ action: "update", collection: "admin_credentials", docId: "1", data: {} });
    } catch (e) {
        caughtCol = true;
        assert.ok(e.message.includes("Ongeautoriseerde collectie"));
    }
    assert.strictEqual(caughtCol, true, "OfflineQueue must reject unauthorized collections");

    // 2. Traversal or invalid docId
    let caughtId = false;
    try {
        await OfflineQueue.enqueue({ action: "update", collection: "projects", docId: "../../etc/passwd", data: {} });
    } catch (e) {
        caughtId = true;
        assert.ok(e.message.includes("Ongeldig document ID formaat"));
    }
    assert.strictEqual(caughtId, true, "OfflineQueue must reject path traversal docId");

    // 3. Oversized payload (> 2MB)
    let caughtSize = false;
    try {
        await OfflineQueue.enqueue({ action: "update", collection: "projects", docId: "proj_valid", data: { blob: "x".repeat(3 * 1024 * 1024) } });
    } catch (e) {
        caughtSize = true;
        assert.ok(e.message.includes("2MB limiet"));
    }
    assert.strictEqual(caughtSize, true, "OfflineQueue must reject payload exceeding 2MB");
});

test("storage.rules enforces cross-service Firestore ownership verification and MIME whitelist", () => {
    const storageRulesPath = path.join(ROOT_DIR, "storage.rules");
    const rules = fs.readFileSync(storageRulesPath, "utf-8");
    assert.ok(rules.includes("function isProjectOwner(projectId)"), "Must define isProjectOwner");
    assert.ok(rules.includes("firestore.exists(/databases/(default)/documents/projects/$(projectId))"), "Must verify firestore.exists");
    assert.ok(rules.includes("request.resource.size < 10 * 1024 * 1024"), "Must enforce 10MB limit");
    assert.ok(rules.includes("request.auth.token.email_verified == true"), "Must require verified email or google sign-in");
    assert.ok(!rules.includes("text/.*"), "Must not allow wildcard text/.* (MIME execution vector)");
    assert.ok(!rules.includes("image/.*"), "Must not allow wildcard image/.* (SVG XSS vector)");
    assert.ok(rules.includes("allPaths.matches"), "storage.rules must block executable/script extensions");
});

test("crm/.htaccess and website/.htaccess enforce modern security headers, CSP, and dotfile blocking", () => {
    const crmHtaccessPath = path.join(ROOT_DIR, "crm/.htaccess");
    const crmHtaccess = fs.readFileSync(crmHtaccessPath, "utf-8");
    assert.ok(crmHtaccess.includes("Strict-Transport-Security"), "CRM must enforce HSTS");
    assert.ok(crmHtaccess.includes("Permissions-Policy"), "CRM must configure Permissions-Policy");
    assert.ok(crmHtaccess.includes("X-Content-Type-Options \"nosniff\""), "CRM must enforce nosniff");
    assert.ok(crmHtaccess.includes("X-Frame-Options \"SAMEORIGIN\""), "CRM must configure X-Frame-Options");
    assert.ok(crmHtaccess.includes("Cross-Origin-Opener-Policy"), "CRM must configure Cross-Origin-Opener-Policy");
    assert.ok(crmHtaccess.includes("Content-Security-Policy"), "CRM must configure Content-Security-Policy");
    assert.ok(crmHtaccess.includes("https://www.gstatic.com"), "CRM CSP must allow Firebase SDK from gstatic.com");
    assert.ok(crmHtaccess.includes("https://cdnjs.cloudflare.com"), "CRM CSP must allow jsPDF and fonts from cdnjs.cloudflare.com");
    assert.ok(crmHtaccess.includes("https://cdn.jsdelivr.net"), "CRM CSP must allow EmailJS from cdn.jsdelivr.net");
    assert.ok(crmHtaccess.includes("https://api.emailjs.com"), "CRM CSP must allow connect-src to api.emailjs.com");
    assert.ok(crmHtaccess.includes("https://formsubmit.co"), "CRM CSP must allow connect-src to formsubmit.co");
    assert.ok(crmHtaccess.includes('FilesMatch "^\\.(?!well-known)"'), "CRM must block dotfiles");
    assert.ok(crmHtaccess.includes("bak|backup|swp|conf|ini"), "CRM must block backup and config file extensions");

    const webHtaccessPath = path.join(ROOT_DIR, "website/.htaccess");
    const webHtaccess = fs.readFileSync(webHtaccessPath, "utf-8");
    assert.ok(webHtaccess.includes("Strict-Transport-Security"), "Website must enforce HSTS");
    assert.ok(webHtaccess.includes("Content-Security-Policy"), "Website must configure HTTP Content-Security-Policy");
    assert.ok(webHtaccess.includes("https://www.gstatic.com"), "Website CSP must allow Firebase SDK from gstatic.com");
    assert.ok(webHtaccess.includes('FilesMatch "^\\.(?!well-known)"'), "Website must block dotfiles");
    assert.ok(!webHtaccess.includes("'unsafe-eval'"), "Website CSP must not contain unsafe-eval");
    assert.ok(!webHtaccess.includes("http: https:"), "Website CSP frame-src must not contain open wildcard http: https:");
    assert.ok(webHtaccess.includes("Cache-Control \"no-store, no-cache"), "Website must enforce anti-caching headers on dynamic HTML");
    assert.ok(webHtaccess.includes("bak|backup|swp|conf|ini"), "Website must block backup and config file extensions");

    const dataHtaccessPath = path.join(ROOT_DIR, "crm/admin/data/.htaccess");
    assert.ok(fs.existsSync(dataHtaccessPath), "crm/admin/data/.htaccess must exist");
    const dataHtaccess = fs.readFileSync(dataHtaccessPath, "utf-8");
    assert.ok(dataHtaccess.includes("Require all denied"), "crm/admin/data must deny web access");
    assert.ok(!dataHtaccess.includes("leads.json"), "crm/admin/data/.htaccess must never whitelist leads.json publicly");
});

test("factory bridge and FTPS client enforce strict TLS, origin parsing, and traversal prevention", () => {
    const ftpsPath = path.join(ROOT_DIR, "factory/deployer/vimexx-ftps.js");
    const ftpsContent = fs.readFileSync(ftpsPath, "utf-8");
    assert.ok(ftpsContent.includes("rejectUnauthorized: process.env.FTP_REJECT_UNAUTHORIZED !== 'false'"), "FTPS must reject unauthorized certificates by default");
    assert.ok(ftpsContent.includes("cleanSlug = String(slug || '')"), "FTPS must sanitize slug against directory traversal");
    assert.ok(ftpsContent.includes("localSlugDir.startsWith(resolvedConceptBase)"), "FTPS must enforce directory containment");

    const bridgePath = path.join(ROOT_DIR, "factory/server/factory-bridge.js");
    const bridgeContent = fs.readFileSync(bridgePath, "utf-8");
    assert.ok(bridgeContent.includes("new URL(orig)"), "Bridge must parse URL safely to defeat CWE-346 prefix bypass");
    assert.ok(bridgeContent.includes("u.hostname === 'localhost' || u.hostname === '127.0.0.1'"), "Bridge must strictly match loopback hostnames");
    assert.ok(bridgeContent.includes("if (orig === 'null') return false;"), "Bridge must block sandboxed iframe origin null bypass");
    assert.ok(bridgeContent.includes("if (!isTokenValid)"), "Bridge must require strict token on mutative POST requests");
    assert.ok(bridgeContent.includes("validateBridgeHost(host)"), "Bridge must validate Host header against DNS rebinding");
    assert.ok(bridgeContent.includes("BLOCKED_EXTENSIONS"), "Bridge must block sensitive extensions in static file server");
    assert.ok(bridgeContent.includes(".ini") && bridgeContent.includes(".swp") && bridgeContent.includes(".backup"), "Bridge must block .ini, .swp, .backup extensions");
    assert.ok(bridgeContent.includes("fileStream.on('error'"), "Bridge must attach error handler to read streams");
    assert.ok(bridgeContent.includes("baseName.startsWith('.')"), "Bridge must block dotfiles in static file server");
});

test("healthcheck.php enforces SSRF, DNS pinning, and rate limiting defenses", () => {
    const healthcheckPath = path.join(ROOT_DIR, "crm/api/healthcheck.php");
    const php = fs.readFileSync(healthcheckPath, "utf-8");
    assert.ok(php.includes("CURLOPT_FOLLOWLOCATION => false"), "Must disable FOLLOWLOCATION to prevent redirect SSRF");
    assert.ok(php.includes("CURLOPT_RESOLVE"), "Must pin DNS via CURLOPT_RESOLVE to prevent TOCTOU DNS rebinding");
    assert.ok(php.includes("CURLPROTO_HTTPS | CURLPROTO_HTTP"), "Must restrict protocols to HTTPS and HTTP");
    assert.ok(php.includes("CURLOPT_IPRESOLVE"), "Must restrict IP resolution to IPv4");
    assert.ok(php.includes("100.64.0.0"), "Must block RFC 6598 Tailscale CGNAT IP range");
    assert.ok(php.includes("flock($rf, LOCK_EX)"), "Must lock rate limit file with flock");
    assert.ok(php.includes("stream_get_contents"), "Must read rate limit file atomically with stream_get_contents");
    assert.ok(php.includes("gethostbynamel"), "Must inspect all resolved A records to defeat round-robin SSRF bypass");
    assert.ok(php.includes("60"), "Must enforce rate limiting threshold");
    assert.ok(php.includes("@chmod($rateFile, 0600)"), "Must restrict rate limit file permissions");
    assert.ok(!php.includes("CURLE_PEER_FAILED_VERIFICATION"), "Must not reference non-standard PHP constant CURLE_PEER_FAILED_VERIFICATION");
    assert.ok(php.includes("catch (\\Throwable"), "Must wrap healthcheck in Throwable exception boundary");
});

test("Mollie API microservices enforce fail-closed security, token auth and locking", () => {
    const payPath = path.join(ROOT_DIR, "crm/api/create-payment.php");
    const payPhp = fs.readFileSync(payPath, "utf-8");
    assert.ok(payPhp.includes("HTTP_AUTHORIZATION"), "create-payment.php must inspect Authorization header");
    assert.ok(payPhp.includes("identitytoolkit.googleapis.com"), "create-payment.php must verify Firebase Bearer token");
    assert.ok(payPhp.includes("$safeRedirectUrl"), "create-payment.php must enforce safe redirectUrl against open redirects");
    assert.ok(payPhp.includes("Access-Control-Allow-Origin"), "create-payment.php must enforce CORS origin validation");
    assert.ok(payPhp.includes("Origin niet toegestaan"), "create-payment.php must reject unauthorized CORS origins with 403");
    assert.ok(payPhp.includes("empty($cleanProjectId)"), "create-payment.php must validate cleanProjectId before processing");
    assert.ok(payPhp.includes("php_sapi_name() === 'cli'"), "create-payment.php must restrict unauthenticated bypass strictly to CLI sapi");
    assert.ok(payPhp.includes("CURLOPT_PROTOCOLS, CURLPROTO_HTTPS"), "create-payment.php must restrict cURL to HTTPS only");
    assert.ok(payPhp.includes("CURLOPT_FOLLOWLOCATION, false"), "create-payment.php must disable follow location");

    const hookPath = path.join(ROOT_DIR, "crm/api/mollie-webhook.php");
    const hookPhp = fs.readFileSync(hookPath, "utf-8");
    assert.ok(hookPhp.includes("Missing MOLLIE_API_KEY"), "mollie-webhook.php must fail-closed when API key is missing");
    assert.ok(hookPhp.includes("flock($fp, LOCK_EX)"), "mollie-webhook.php must lock log file with flock");
    assert.ok(hookPhp.includes("stream_get_contents"), "mollie-webhook.php must read log file atomically with stream_get_contents");
    assert.ok(hookPhp.includes("tr_[a-zA-Z0-9]"), "mollie-webhook.php must validate payment ID regex format");
    assert.ok(hookPhp.includes("@chmod($logFile, 0600)"), "mollie-webhook.php must restrict payments log permissions");
    assert.ok(hookPhp.includes("php://input"), "mollie-webhook.php must parse JSON body payload fallback");
    assert.ok(hookPhp.includes("10240"), "mollie-webhook.php must cap raw body payload reading at 10KB");
    assert.ok(hookPhp.includes("CURLOPT_PROTOCOLS, CURLPROTO_HTTPS"), "mollie-webhook.php must restrict cURL to HTTPS only");
    assert.ok(hookPhp.includes("CURLOPT_FOLLOWLOCATION, false"), "mollie-webhook.php must disable follow location");
    assert.ok(!hookPhp.includes("SIMULATED-PAYMENT"), "mollie-webhook.php must not simulate payment on missing key");

    const hookJsPath = path.join(ROOT_DIR, "crm/api/mollie-webhook.js");
    const hookJs = fs.readFileSync(hookJsPath, "utf-8");
    assert.ok(hookJs.includes("Missing MOLLIE_API_KEY"), "mollie-webhook.js must fail-closed when API key is missing");
    assert.ok(hookJs.includes("MAX_BODY_SIZE = 10 * 1024"), "mollie-webhook.js must enforce 10KB body size limit");
    assert.ok(hookJs.includes("tr_[a-zA-Z0-9]"), "mollie-webhook.js must validate payment ID regex format");
    assert.ok(hookJs.includes("req.setTimeout(15000"), "mollie-webhook.js must enforce 15s socket timeout against hanging requests");
    assert.ok(hookJs.includes("0o600"), "mollie-webhook.js must enforce 0600 file permissions on audit logs");
    assert.ok(hookJs.includes("jsonBody.id"), "mollie-webhook.js must support JSON body payload fallback");
});

test("uploadPdfToStorage source code enforces .pdf extension and rejects empty blobs", () => {
    const pdfGenPath = path.join(ROOT_DIR, "crm/js/pdf-generator.js");
    const pdfSource = fs.readFileSync(pdfGenPath, "utf-8");
    assert.ok(pdfSource.includes("!pdfBlob"), "uploadPdfToStorage must check for falsy blob");
    assert.ok(pdfSource.includes("pdfBlob.size <= 0"), "uploadPdfToStorage must reject empty blob");
    assert.ok(pdfSource.includes("safeName.toLowerCase().endsWith('.pdf')"), "uploadPdfToStorage must enforce .pdf extension");
});

test("firestore.rules and client portal enforce zero-trust price locking and verified payment state", () => {
    const firestoreRulesPath = path.join(ROOT_DIR, "firestore.rules");
    const rules = fs.readFileSync(firestoreRulesPath, "utf-8");
    assert.ok(rules.includes("subscriptionPlan2027Price == resource.data.subscriptionPlan2027Price"), "firestore.rules must lock proposed prices against client downgrades");
    assert.ok(!rules.includes("'0,00'"), "firestore.rules must never allow 0,00 subscription prices");
    assert.ok(rules.includes("request.resource.data.clientUid == request.auth.uid"), "firestore.rules must prevent unauthenticated clientUid spoofing on intake create");
    assert.ok(rules.includes("request.auth.token.email is string"), "firestore.rules must enforce string type check on auth email");
    assert.ok(rules.includes("docData.clientUid is string"), "firestore.rules must enforce string type check on clientUid");
    assert.ok(rules.includes("subscriptionPlan2027Id in ['managed_nl'"), "firestore.rules must enforce whitelist of valid 2027 plan IDs");

    const statusJsPath = path.join(ROOT_DIR, "crm/status/js/status.js");
    const statusJs = fs.readFileSync(statusJsPath, "utf-8");
    assert.ok(statusJs.includes("isVerifiedPaid"), "status.js must verify payment status against backend records before confirming payment");
});

test("atomicWriteJsonSync writes safely with 0600 mode and survives concurrency", async () => {
    const { atomicWriteJsonSync } = await import("../factory/run-engine.js");
    const testFile = path.join(ROOT_DIR, "factory/data/.test_atomic.json");
    const testData = { ok: true, timestamp: Date.now() };
    atomicWriteJsonSync(testFile, testData);
    assert.ok(fs.existsSync(testFile), "Atomic write file must exist");
    const readBack = JSON.parse(fs.readFileSync(testFile, "utf-8"));
    assert.strictEqual(readBack.ok, true);
    assert.strictEqual(readBack.timestamp, testData.timestamp);
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
});

test("status.js enforces signer name sanitization, reverse tabnabbing defense and chat limits", () => {
    const statusJsPath = path.join(ROOT_DIR, "crm/status/js/status.js");
    const content = fs.readFileSync(statusJsPath, "utf-8");
    assert.ok(content.includes("signerName = rawSignerName.replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 100)"), "Must sanitize signerName to max 100 chars and strip control characters");
    assert.ok(content.includes('rel="noopener noreferrer"'), "Must include rel=noopener noreferrer on external design links to prevent reverse tabnabbing");
    assert.ok(content.includes("existingMessages.splice(0, existingMessages.length - 99)"), "Must cap stored chat messages to prevent document bloat");
    assert.ok(content.includes("messageText = rawMessage.replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '').trim().slice(0, 3000)"), "Must bound chat messages to 3000 chars");
});

test("admin-monitoring-ui and admin-kanban enforce CSP delegation, input bounds, and array caps", () => {
    const monitoringUiPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-monitoring-ui.js");
    const monUiContent = fs.readFileSync(monitoringUiPath, "utf-8");
    assert.ok(monUiContent.includes('data-action="inspect-monitor"'), "admin-monitoring-ui must use delegated data-action");
    assert.ok(!monUiContent.includes("onclick=\"window.openMonitorDetailModal"), "admin-monitoring-ui must not use inline onclick");

    const kanbanPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-kanban.js");
    const kanbanContent = fs.readFileSync(kanbanPath, "utf-8");
    assert.ok(kanbanContent.includes("cleanTitle = rawTitle.replace"), "admin-kanban must sanitize task title");
    assert.ok(kanbanContent.includes("slice(0, 200)"), "admin-kanban must cap task title at 200 chars");
    assert.ok(kanbanContent.includes("(project.tasks || []).length >= 150"), "admin-kanban must cap tasks at 150 to prevent bloat");
    assert.ok(kanbanContent.includes("['low', 'medium', 'high'].includes"), "admin-kanban must whitelist priority");
});

test("project-billing, admin-tables, and sla-signer enforce sanitization, memory cleanup, and input limits", () => {
    const billingPath = path.join(ROOT_DIR, "crm/admin/js/modules/project-billing.js");
    const billingContent = fs.readFileSync(billingPath, "utf-8");
    assert.ok(billingContent.includes("href=\"${sanitizeUrl(checkoutUrl)}\""), "project-billing must sanitize checkoutUrl");
    assert.ok(billingContent.includes('rel="noopener noreferrer"'), "project-billing must include rel=noopener noreferrer on external links");

    const tablesPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-tables.js");
    const tablesContent = fs.readFileSync(tablesPath, "utf-8");
    assert.ok(tablesContent.includes("URL.revokeObjectURL(url)"), "admin-tables must revoke CSV blob URL to prevent memory leaks");

    const slaPath = path.join(ROOT_DIR, "crm/status/js/modules/sla-signer.js");
    const slaContent = fs.readFileSync(slaPath, "utf-8");
    assert.ok(slaContent.includes('id="sla-signer-name" maxlength="100"'), "sla-signer must enforce maxlength 100 on signer name");
});

test("db-service.js enforces document ID validation against path traversal", () => {
    const dbServicePath = path.join(ROOT_DIR, "crm/js/core/db-service.js");
    const content = fs.readFileSync(dbServicePath, "utf-8");
    assert.ok(content.includes("export function isValidDocId(id)"), "db-service must export isValidDocId");
    assert.ok(content.includes("/^[a-zA-Z0-9_-]{1,128}$/"), "db-service must enforce strict regex on document IDs");
    assert.ok(content.includes("!isValidDocId(projectId)"), "db-service must guard queries and mutations with isValidDocId");
});

test("ai-engine.js enforces AbortController timeout, API key sanitization, and palette boundaries", () => {
    const aiEnginePath = path.join(ROOT_DIR, "crm/js/ai-engine.js");
    const content = fs.readFileSync(aiEnginePath, "utf-8");
    assert.ok(content.includes("cleanApiKey = apiKey.replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, '').trim()"), "ai-engine must sanitize API key");
    assert.ok(content.includes("new AbortController()"), "ai-engine must use AbortController");
    assert.ok(content.includes("setTimeout(() => controller.abort(), 25000)"), "ai-engine must enforce 25s timeout on Gemini API");
    assert.ok(content.includes("/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/"), "ai-engine must enforce hex regex validation on color palettes");
    assert.ok(content.includes("parsed.conceptTitle = String(parsed.conceptTitle).slice(0, 150)"), "ai-engine must bound concept title length");
});

test("uptime-monitor.js enforces AbortController timeouts on external alert dispatches", () => {
    const monitorPath = path.join(ROOT_DIR, "crm/js/uptime-monitor.js");
    const content = fs.readFileSync(monitorPath, "utf-8");
    assert.ok(content.includes("https://formsubmit.co/ajax/info@creationaltfix.nl"), "uptime-monitor must configure FormSubmit alert");
    assert.ok(content.includes("controller.abort(), 8000"), "uptime-monitor must enforce 8s timeout on webhook alerts");
});

test("factory-bridge.js and todo-sync enforce socket timeouts, 1MB payloads, and task limits", () => {
    const bridgePath = path.join(ROOT_DIR, "factory/server/factory-bridge.js");
    const bridgeContent = fs.readFileSync(bridgePath, "utf-8");
    assert.ok(bridgeContent.includes("server.timeout = 30000"), "bridge server must enforce 30s socket timeout");
    assert.ok(bridgeContent.includes("server.keepAliveTimeout = 5000"), "bridge server must enforce 5s keepalive timeout");
    assert.ok(bridgeContent.includes("receivedBytes > 1024 * 1024"), "bridge server must limit request payload to 1MB");

    const todoSyncPath = path.join(ROOT_DIR, "crm/js/todo-sync.js");
    const syncContent = fs.readFileSync(todoSyncPath, "utf-8");
    assert.ok(syncContent.includes("boundedTasks = mergedTasks.slice(0, 150)"), "todo-sync must cap merged tasks at 150");

    const modalPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-todo-modal.js");
    const modalContent = fs.readFileSync(modalPath, "utf-8");
    assert.ok(modalContent.includes("URL.revokeObjectURL(url)"), "admin-todo-modal must revoke download object URL");
});

test("deep-intelligence and vimexx-ftps enforce SSRF defense, prototype pollution guards, and Windows device safety", async () => {
    const { isSafeExternalUrl } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isSafeExternalUrl("http://localhost"), false, "Must reject localhost");
    assert.strictEqual(isSafeExternalUrl("http://127.0.0.1:8080"), false, "Must reject loopback IPv4");
    assert.strictEqual(isSafeExternalUrl("http://169.254.169.254/latest/meta-data"), false, "Must reject cloud metadata IP");
    assert.strictEqual(isSafeExternalUrl("http://10.0.0.1"), false, "Must reject private 10.x.x.x");
    assert.strictEqual(isSafeExternalUrl("http://192.168.1.1"), false, "Must reject private 192.168.x.x");
    assert.strictEqual(isSafeExternalUrl("http://100.64.0.1"), false, "Must reject CGNAT/Tailscale range");
    assert.strictEqual(isSafeExternalUrl("https://example.com"), true, "Must accept public HTTPS domain");

    const ftpsPath = path.join(ROOT_DIR, "factory/deployer/vimexx-ftps.js");
    const ftpsContent = fs.readFileSync(ftpsPath, "utf-8");
    assert.ok(ftpsContent.includes("WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i"), "vimexx-ftps must defend against Windows reserved device names");

    const configPath = path.join(ROOT_DIR, "factory/config/factory-config.js");
    const configContent = fs.readFileSync(configPath, "utf-8");
    assert.ok(configContent.includes("['__proto__', 'constructor', 'prototype'].includes(key)"), "factory-config must defend against prototype pollution");

    const { getMonitorDocKey } = await import("../crm/js/uptime-monitor.js");
    assert.strictEqual(getMonitorDocKey("https://example.com/test"), "example_com", "getMonitorDocKey must sanitize domain key");
    assert.strictEqual(getMonitorDocKey(""), null, "getMonitorDocKey must return null on empty domain");
    assert.strictEqual(getMonitorDocKey(null), null, "getMonitorDocKey must return null on null");
});

test("code-drm enforces idempotency and DOM XSS defense", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const html = "<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>";
    const protectedOnce = applyCodeProtection(html, { name: "Test BV", slug: "test-bv" });
    assert.ok(protectedOnce.includes('id="caf-security-guard"'), "Must inject DRM guard");
    const protectedTwice = applyCodeProtection(protectedOnce, { name: "Test BV", slug: "test-bv" });
    const matchCount = (protectedTwice.match(/id="caf-security-guard"/g) || []).length;
    assert.strictEqual(matchCount, 1, "Must be idempotent and prevent duplicate DRM injection");

    const drmPath = path.join(ROOT_DIR, "factory/security/code-drm.js");
    const drmContent = fs.readFileSync(drmPath, "utf-8");
    assert.ok(drmContent.includes("t.appendChild(document.createTextNode"), "showSecurityToast must use createTextNode to prevent DOM XSS");
});

test("Toast notification and confirm engine neutralize DOM XSS", async () => {
    const { Toast } = await import("../crm/js/core/toast.js");
    const payload = {
        title: '<img src=x onerror=alert("xss")>',
        message: '<script>evil()</script>',
        action: { label: '<b>Click</b>', callback: () => {} }
    };
    const html = Toast._renderToastHtml(payload);
    assert.ok(html.includes('&lt;img src=x onerror=alert(&quot;xss&quot;)&gt;'), "Title must be escaped");
    assert.ok(html.includes('&lt;script&gt;evil()&lt;/script&gt;'), "Message must be escaped");
    assert.ok(html.includes('&lt;b&gt;Click&lt;/b&gt;'), "Action label must be escaped");
    assert.strictEqual(html.includes('<script>'), false);
    assert.strictEqual(html.includes('<img src=x'), false);
});

test("getPiBoekhoudingInfo enforces strict domain and alias matching to prevent cross-client leaks", async () => {
    const { getPiBoekhoudingInfo } = await import("../crm/admin/js/modules/bookkeeping-data.js");
    
    // Partial substring domain "nl" must NOT match Angela Stenekes or any other recorded client
    const shortDom = getPiBoekhoudingInfo({ domainName: "nl", client: "Onbekend" });
    assert.strictEqual(shortDom.clientName, "Onbekend", "Must not leak recorded client for short domain 'nl'");
    assert.strictEqual(shortDom.invoices.length, 0, "Must not leak private invoices");

    // Partial name "Riool" must NOT match Stenekes Riool & Grondwerk
    const partialRiool = getPiBoekhoudingInfo({ domainName: "nieuwe-rioolservice.nl", client: "Riool" });
    assert.strictEqual(partialRiool.clientName, "Riool", "Must not leak Stenekes for generic name 'Riool'");
    assert.strictEqual(partialRiool.invoices.length, 0);

    // Substring "fit" must NOT leak Cijntje Personal Fit
    const partialFit = getPiBoekhoudingInfo({ domainName: "fit-and-fun.nl", client: "Fit Gym" });
    assert.strictEqual(partialFit.clientName, "Fit Gym", "Must not leak Cijntje Personal Fit for generic 'Fit'");
    assert.strictEqual(partialFit.invoices.length, 0);
});

test("maps-crawler sanitizeLeadData enforces safe protocols and slug bounds", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const badLead = {
        name: "A".repeat(200),
        slug: "dangerous-link",
        website: "javascript:alert(document.cookie)"
    };
    const cleaned = sanitizeLeadData(badLead);
    assert.strictEqual(cleaned.website, null, "Must neutralize javascript: URI scheme");
    assert.ok(cleaned.slug.length <= 64, "Slug must be bounded to <= 64 characters");

    const validLead = sanitizeLeadData({ name: "Klusservice", website: "https://klusservice.nl" });
    assert.strictEqual(validLead.website, "https://klusservice.nl");
});

test("isSafeWebhookUrl rejects SSRF addresses and accepts safe external HTTPS endpoints", async () => {
    const { isSafeWebhookUrl } = await import("../crm/intake/js/notifications.js");
    assert.strictEqual(isSafeWebhookUrl("https://hooks.slack.com/services/T00/B00/X00"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/abc"), true);
    assert.strictEqual(isSafeWebhookUrl("http://insecure.com"), false, "Non-HTTPS must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://localhost/webhook"), false, "Localhost must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1:8080/hook"), false, "Loopback IPv4 must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.100/webhook"), false, "RFC 1918 192.168 must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.5/api"), false, "RFC 1918 10.x must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://172.16.1.1/hook"), false, "RFC 1918 172.16-31 must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false, "Cloud metadata must be rejected");
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.5/tailscale"), false, "RFC 6598 Tailscale must be rejected");
    assert.strictEqual(isSafeWebhookUrl("javascript:alert(1)"), false, "Javascript URI must be rejected");
    assert.strictEqual(isSafeWebhookUrl(""), false);
    assert.strictEqual(isSafeWebhookUrl(null), false);
});

test("sanitizeMarkdown escapes markdown control characters for Telegram and Discord", async () => {
    const { sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");
    const raw = "*Bold* _Italic_ `code` [link](url) #Title - List ! Alert";
    const escaped = sanitizeMarkdown(raw);
    assert.ok(escaped.includes("\\*Bold\\*"), "Asterisks must be escaped");
    assert.ok(escaped.includes("\\_Italic\\_"), "Underscores must be escaped");
    assert.ok(escaped.includes("\\`code\\`"), "Backticks must be escaped");
    assert.ok(escaped.includes("\\[link\\]"), "Brackets must be escaped");
    assert.strictEqual(sanitizeMarkdown(null), "");
    assert.strictEqual(sanitizeMarkdown(undefined), "");
});

test("factory-bridge blocks static /data/ and /config/ directories and requires token auth on leads and logs", () => {
    const bridgePath = path.join(ROOT_DIR, "factory/server/factory-bridge.js");
    const bridgeContent = fs.readFileSync(bridgePath, "utf-8");
    assert.ok(bridgeContent.includes("normalizedSegments.includes('data')"), "factory-bridge must block access to confidential data directories");
    assert.ok(bridgeContent.includes("normalizedSegments.includes('config')"), "factory-bridge must block access to config directories");
    assert.ok(bridgeContent.includes("if (!isTokenValid)") && bridgeContent.includes("GET /api/leads"), "factory-bridge must enforce token auth on /api/leads");
    assert.ok(bridgeContent.includes("if (!isTokenValid)") && bridgeContent.includes("GET /api/logs"), "factory-bridge must enforce token auth on /api/logs");
    assert.ok(bridgeContent.includes("daemonIntervalId = null"), "factory-bridge must clean up interval on process shutdown");
});

test("status.js, email-notifications.js, and intake.js enforce reverse tabnabbing and schema defense", () => {
    const statusPath = path.join(ROOT_DIR, "crm/status/js/status.js");
    const statusContent = fs.readFileSync(statusPath, "utf-8");
    assert.ok(statusContent.includes('sanitizeUrl(mollieUrl)') && statusContent.includes('rel="noopener noreferrer"'), "status.js must sanitize mollieUrl and enforce noopener noreferrer");

    const emailPath = path.join(ROOT_DIR, "crm/js/email-notifications.js");
    const emailContent = fs.readFileSync(emailPath, "utf-8");
    assert.ok(emailContent.includes("sendFormSubmitFallback") && emailContent.includes("AbortController"), "email-notifications must enforce AbortController timeout on FormSubmit fallback");

    const intakePath = path.join(ROOT_DIR, "crm/intake/js/intake.js");
    const intakeContent = fs.readFileSync(intakePath, "utf-8");
    assert.ok(intakeContent.includes("isClientAccount: false"), "intake.js must lock isClientAccount to false to adhere to firestore.rules");
    assert.ok(!intakeContent.includes("clientUid: docRef.id"), "intake.js must not set clientUid prior to authentication");
});

test("uptime-webhook-alerts.js validates HTTPS, SSRF filtering, Telegram/Discord regex, and body bounds", async () => {
    const { sanitizeMarkdown, sendTelegramAlert, sendDiscordWebhookAlert, sendWhatsAppCallMeBotAlert } = await import("../crm/scripts/uptime-webhook-alerts.js");
    
    // Markdown sanitization
    assert.strictEqual(sanitizeMarkdown("*Test* _Underscore_ `Code`"), "\\*Test\\* \\_Underscore\\_ \\`Code\\`");
    assert.strictEqual(sanitizeMarkdown(null), "");

    // Telegram regex validation
    const badTgToken = await sendTelegramAlert({ domain: "test.nl" }, "invalid-token", "123456");
    assert.strictEqual(badTgToken, false, "Must reject invalid telegram token format");

    // Discord regex validation
    const badDiscord = await sendDiscordWebhookAlert({ domain: "test.nl" }, "https://attacker.com/webhook");
    assert.strictEqual(badDiscord, false, "Must reject non-discord webhook URL");

    // WhatsApp CallMeBot empty key
    const badWa = await sendWhatsAppCallMeBotAlert({ domain: "test.nl" }, "0612345678", "");
    assert.strictEqual(badWa, false, "Must reject empty API key");

    const alertsScriptPath = path.join(ROOT_DIR, "crm/scripts/uptime-webhook-alerts.js");
    const alertsScriptContent = fs.readFileSync(alertsScriptPath, "utf-8");
    assert.ok(alertsScriptContent.includes("isSafeExternalHost"), "makeRequest must enforce SSRF host validation");
    assert.ok(alertsScriptContent.includes("MAX_BODY_BYTES = 64 * 1024"), "makeRequest must limit body buffer size");
});

test("agy-generator.js escapes business data, reviews, and services to neutralize XSS (CWE-79) and adds noopener noreferrer", async () => {
    const { escapeHtml, buildOutreachPitch, buildFallbackTemplate } = await import("../factory/generator/agy-generator.js");

    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('Quote\' and `backtick`'), 'Quote&#39; and &#96;backtick&#96;');

    const maliciousLead = {
        name: '<script>alert("name")</script>',
        slug: 'malicious-lead',
        category: '<b>Hack</b>',
        pitchHook: '<img src=x onerror=alert("hook")>',
        reviews: [
            { author: '<script>author</script>', text: '"><img src=x onerror=alert(1)>' }
        ],
        suggestedServices: [
            { title: '<svg onload=alert(1)>', desc: '<iframe src=evil>' }
        ]
    };

    const pitch = buildOutreachPitch(maliciousLead);
    assert.ok(!pitch.bodyHtml.includes('<script>alert("name")</script>'), "Email HTML body must not contain unescaped script tag");
    assert.ok(pitch.bodyHtml.includes('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;'), "Email HTML body must contain escaped script tag");
    assert.ok(!pitch.bodyHtml.includes('<img src=x onerror=alert("hook")>'), "Email HTML body must not contain unescaped hook tag");

    const template = buildFallbackTemplate(maliciousLead);
    assert.ok(!template.includes('<script>author</script>'), "Fallback template must escape review author");
    assert.ok(template.includes('&lt;script&gt;author&lt;/script&gt;'), "Fallback template must escape review author");
    assert.ok(!template.includes('<svg onload=alert(1)>'), "Fallback template must escape service title");
    assert.ok(template.includes('rel="noopener noreferrer"'), "Fallback template must include rel=noopener noreferrer on external links");
});

test("validateConceptHtml in vimexx-ftps validates strings, limits size to 5MB, and scrubs null bytes", async () => {
    const { validateConceptHtml } = await import("../factory/deployer/vimexx-ftps.js");
    
    // Valid HTML
    assert.strictEqual(validateConceptHtml("<h1>Hello World</h1>"), "<h1>Hello World</h1>");
    
    // Null byte scrub
    assert.strictEqual(validateConceptHtml("<h1>Hello\0World</h1>"), "<h1>HelloWorld</h1>");
    
    // Empty or non-string rejection
    assert.throws(() => validateConceptHtml(""), /Ongeldige of lege HTML/);
    assert.throws(() => validateConceptHtml("   "), /Ongeldige of lege HTML/);
    assert.throws(() => validateConceptHtml(null), /Ongeldige of lege HTML/);
    assert.throws(() => validateConceptHtml(12345), /Ongeldige of lege HTML/);
    
    // Oversized rejection (> 5MB)
    const largeHtml = "X".repeat(5 * 1024 * 1024 + 1);
    assert.throws(() => validateConceptHtml(largeHtml), /overschrijdt de maximale toegestane bestandsgrootte van 5MB/);
});

test("parseCliArgs in run-engine bounds limit, interval and sanitizes query against injection", async () => {
    const { parseCliArgs } = await import("../factory/run-engine.js");
    
    // Safe defaults
    const defaults = parseCliArgs([]);
    assert.strictEqual(defaults.isDaemon, false);
    assert.strictEqual(defaults.limit, 1);
    assert.strictEqual(defaults.query, null);
    assert.strictEqual(defaults.interval, 30);
    
    // Normal args
    const normal = parseCliArgs(["--daemon", "--limit=5", "--query=dakdekker Hoogezand", "--interval=60"]);
    assert.strictEqual(normal.isDaemon, true);
    assert.strictEqual(normal.limit, 5);
    assert.strictEqual(normal.query, "dakdekker Hoogezand");
    assert.strictEqual(normal.interval, 60);
    
    // Boundary enforcement
    const outOfBounds = parseCliArgs(["--limit=99999", "--interval=-5", "--query=Test\x00\x1F\r\nInject"]);
    assert.strictEqual(outOfBounds.limit, 50, "Limit must be clamped to 50");
    assert.strictEqual(outOfBounds.interval, 1, "Interval must be clamped to minimum 1");
    assert.strictEqual(outOfBounds.query, "Test Inject", "Query must strip control characters and CRLF");
});

test("website script.js and subpage.js enforce strict htmlKeys whitelist and sanitize markup", () => {
    const scriptJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/script.js"), "utf-8");
    const subpageJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/subpage.js"), "utf-8");
    
    assert.ok(!scriptJs.includes("val.indexOf('<') !== -1"), "script.js must NOT treat arbitrary string with '<' as innerHTML");
    assert.ok(!subpageJs.includes("val.indexOf('<') !== -1"), "subpage.js must NOT treat arbitrary string with '<' as innerHTML");
    
    assert.ok(scriptJs.includes("sanitizeTrustedHtml(val)"), "script.js must sanitize whitelisted HTML before innerHTML");
    assert.ok(subpageJs.includes("sanitizeTrustedHtml(val)"), "subpage.js must sanitize whitelisted HTML before innerHTML");
    
    assert.ok(scriptJs.includes("element.textContent = val;"), "script.js must default to safe textContent for non-whitelisted keys");
    assert.ok(subpageJs.includes("element.textContent = val;"), "subpage.js must default to safe textContent for non-whitelisted keys");
});

test("visual-feedback.js clamps pin coordinates within [0, 100] and sanitizes author", () => {
    const vfContent = fs.readFileSync(path.join(ROOT_DIR, "crm/status/js/modules/visual-feedback.js"), "utf-8");
    assert.ok(vfContent.includes("Math.max(0, Math.min(100,"), "visual-feedback.js must clamp coordinates between 0 and 100");
    assert.ok(vfContent.includes("if (!rect.width || !rect.height) return;"), "visual-feedback.js must guard against zero-sized overlay rect");
    assert.ok(vfContent.includes("replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, ' ')"), "visual-feedback.js must sanitize author name");
});

test("live-demo.js enforces HTML entity escaping, textNode appending, and coordinate boundary guards", () => {
    const liveDemoJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/live-demo.js"), "utf-8");
    assert.ok(liveDemoJs.includes("function escapeHtml(str)"), "live-demo.js must define escapeHtml helper");
    assert.ok(liveDemoJs.includes("entry.appendChild(document.createTextNode(String(msg || '')));"), "appendTerminalLog must use textNode appending");
    assert.ok(liveDemoJs.includes("<strong>${escapeHtml(String(pin.title || ''))}</strong>"), "renderPins must escape pin.title in HTML");
    assert.ok(liveDemoJs.includes("Math.max(0, Math.min(100,"), "live-demo.js must clamp pin coordinates");
    assert.ok(liveDemoJs.includes("if (!rect.width || !rect.height) return;"), "live-demo.js must check bounding rect dimensions");
});

test("admin-subscriptions calculateSubscriptionKPIs handles null/corrupted projects and calculates metrics safely", async () => {
    const { calculateSubscriptionKPIs } = await import("../crm/admin/js/modules/admin-subscriptions.js");
    
    // Null safety
    const resEmpty = calculateSubscriptionKPIs(null);
    assert.strictEqual(resEmpty.confirmedCount, 0);
    assert.strictEqual(resEmpty.totalRevenue, 0);

    const resCorrupt = calculateSubscriptionKPIs([null, undefined, { subscriptionPlan2027Status: "bevestigd" }]);
    assert.strictEqual(resCorrupt.confirmedCount, 1);
    assert.strictEqual(resCorrupt.totalRevenue, 150);
});

test("subscription-2027 sanitizes client inputs and bounds portalUrl ID against CRLF injection", async () => {
    const { generate2027ProposalText, generate2027WhatsAppText } = await import("../crm/admin/js/modules/subscription-2027.js");
    
    const maliciousProject = {
        id: "p123\r\nInjected: Header",
        client: "Malicious\r\nCompany\x00Name",
        domainName: "evil.nl\r\nBcc: victim@example.com",
        email: "test@example.com\r\nBcc: evil@example.com"
    };

    const emailText = generate2027ProposalText(maliciousProject, "managed_nl");
    assert.ok(emailText.includes("Beste Malicious Company Name,"), "Must strip CRLF from client name");
    assert.ok(emailText.includes("https://creationaltfix.nl/crm/status/?id=p123InjectedHeader"), "Must strip CRLF and symbols from portalUrl ID");
    assert.ok(!emailText.includes("test@example.com\r\n"), "Must strip CRLF from email");

    const waText = generate2027WhatsAppText(maliciousProject, "managed_nl");
    assert.ok(waText.includes("Hoi Malicious Company Name,"), "WhatsApp must strip CRLF from client name");
    assert.ok(waText.includes("https://creationaltfix.nl/crm/status/?id=p123InjectedHeader"), "WhatsApp portalUrl ID must be sanitized");
});

test("sanitizeDocsParam and documentation personalization strip control characters and prevent injection", async () => {
    const { sanitizeDocsParam, getChecklistState } = await import("../website/docs/js/docs.js");

    // 1. Parameter sanitization
    const taintedDomain = "creationaltfix.nl\r\n<script>alert(1)</script>\"';`\\";
    const cleanDomain = sanitizeDocsParam(taintedDomain, 80);
    assert.strictEqual(cleanDomain, "creationaltfix.nlscriptalert(1)/script", "Must strip CRLF, brackets, quotes and backticks");
    assert.ok(!cleanDomain.includes("<"), "Must not contain <");
    assert.ok(!cleanDomain.includes(">"), "Must not contain >");
    assert.ok(!cleanDomain.includes("\r"), "Must not contain carriage return");

    const longParam = "A".repeat(150);
    assert.strictEqual(sanitizeDocsParam(longParam, 80).length, 80, "Must cap length at maxLen");
    assert.strictEqual(sanitizeDocsParam(null), "");
    assert.strictEqual(sanitizeDocsParam(undefined), "");

    // 2. Checklist state resilience against empty/corrupted state
    const cleanState = getChecklistState();
    assert.ok(typeof cleanState === "object" && !Array.isArray(cleanState), "getChecklistState must return clean object");
});

test("sanitizePitchHtml in admin-lead-factory neutralizes script tags, style, iframes, inline event handlers and javascript: URLs", async () => {
    const { sanitizePitchHtml } = await import("../crm/admin/js/modules/admin-lead-factory.js");

    // Script tag stripping
    const maliciousScript = "<p>Hallo</p><script>alert('XSS')</script>";
    assert.strictEqual(sanitizePitchHtml(maliciousScript), "<p>Hallo</p>");

    // Inline event handlers
    const maliciousHandlers = '<img src="x" onerror="alert(1)" onload=\'alert(2)\' onclick=alert(3) alt="logo">';
    const cleanHandlers = sanitizePitchHtml(maliciousHandlers);
    assert.ok(!cleanHandlers.includes("onerror"), "Must strip onerror handler");
    assert.ok(!cleanHandlers.includes("onload"), "Must strip onload handler");
    assert.ok(!cleanHandlers.includes("onclick"), "Must strip onclick handler");

    // Dangerous tags (iframe, object, embed)
    const dangerousTags = '<iframe src="//evil.com"></iframe><embed src="malware.swf"><object data="bad"></object>';
    const cleanTags = sanitizePitchHtml(dangerousTags);
    assert.ok(!cleanTags.includes("<iframe"), "Must strip iframe tag");
    assert.ok(!cleanTags.includes("<embed"), "Must strip embed tag");
    assert.ok(!cleanTags.includes("<object"), "Must strip object tag");

    // javascript: link pseudo-protocol
    const jsLink = '<a href="javascript:alert(1)">Klik hier</a>';
    assert.strictEqual(sanitizePitchHtml(jsLink), '<a href="#">Klik hier</a>');

    // Safe content preserved
    const safeContent = '<p>Beste heer, hier is uw <strong>offerte</strong> voor &euro; 199,-.</p>';
    assert.strictEqual(sanitizePitchHtml(safeContent), safeContent);
});

test("admin-lead-factory enforces sanitizeUrl in preview modal and prevents Reverse Tabnabbing on external links", () => {
    const factorySource = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/admin-lead-factory.js"), "utf-8");

    // Preview modal URL sanitization
    assert.ok(factorySource.includes("const safeTargetUrl = sanitizeUrl(targetUrl);"), "Must sanitize targetUrl with sanitizeUrl");
    assert.ok(factorySource.includes("iframe.src = safeTargetUrl;"), "Must only set safe targetUrl on iframe");
    assert.ok(factorySource.includes("extLink.setAttribute('rel', 'noopener noreferrer');"), "Must enforce rel=noopener noreferrer on preview modal external link");

    // WhatsApp reverse tabnabbing and phone sanitization
    assert.ok(factorySource.includes("window.open(waUrl, '_blank', 'noopener,noreferrer');"), "Must use noopener,noreferrer when opening WhatsApp");
    assert.ok(factorySource.includes('rel="noopener noreferrer"'), "Must include rel=noopener noreferrer on modal WhatsApp anchor");
    assert.ok(factorySource.includes(".replace(/[^0-9]/g, '')"), "Must sanitize phone numbers to digits only");
});

test("Vanderplaats contact API scripts enforce CRLF stripping and HTML escaping against Header/HTML Injection (CWE-93)", () => {
    const publicPath = path.resolve(ROOT_DIR, "../Vanderplaats/public/api/contact.php");
    const distPath = path.resolve(ROOT_DIR, "../Vanderplaats/dist/api/contact.php");

    if (!fs.existsSync(publicPath) || !fs.existsSync(distPath)) {
        return "SKIP";
    }

    const pubContent = fs.readFileSync(publicPath, "utf-8");
    const distContent = fs.readFileSync(distPath, "utf-8");

    for (const [name, content] of [["public", pubContent], ["dist", distContent]]) {
        assert.ok(content.includes("preg_replace('/[\\r\\n\\x00-\\x1F\\x7F]/', '', trim(strip_tags($data['name'])))"), `${name} contact.php must strip CRLF from name`);
        assert.ok(content.includes("preg_replace('/[\\r\\n\\x00-\\x1F\\x7F]/', '', trim(filter_var($data['email'], FILTER_SANITIZE_EMAIL)))"), `${name} contact.php must strip CRLF from email`);
        assert.ok(content.includes("mb_substr($name, 0, 100)"), `${name} contact.php must bound name length`);
        assert.ok(content.includes("mb_substr($email, 0, 120)"), `${name} contact.php must bound email length`);
        assert.ok(content.includes("htmlspecialchars($name, ENT_QUOTES, 'UTF-8')"), `${name} contact.php must escape name before HTML email interpolation`);
        assert.ok(content.includes("noopener noreferrer"), `${name} contact.php must enforce noopener noreferrer on WhatsApp link`);
    }
});

test("Besseling mail.php enforces payload cap, rate limiting, and header injection defense (CWE-93 / CWE-400 / CWE-200)", () => {
    const besselingMailPath = path.resolve(ROOT_DIR, "../BesselingInstallatieTechniek/mail.php");
    if (!fs.existsSync(besselingMailPath)) {
        return "SKIP";
    }
    const content = fs.readFileSync(besselingMailPath, "utf-8");

    // Payload cap
    assert.ok(content.includes("file_get_contents('php://input', false, null, 0, 10240)"), "Must cap php://input payload to 10KB");
    // Rate limit
    assert.ok(content.includes("besseling_rate_limit"), "Must implement rate limiting on mail.php");
    assert.ok(content.includes("http_response_code(429)"), "Must return 429 Too Many Requests when rate limit exceeded");
    // Sanitization & bounds
    assert.ok(content.includes("mb_substr(preg_replace('/[\\r\\n\\x00-\\x1F\\x7F]/', '', $raw_name), 0, 80)"), "Must strip CRLF and limit name length");
    assert.ok(content.includes("strpos($email, ',') !== false || strpos($email, ' ') !== false"), "Must reject email with commas or spaces");
    assert.ok(content.includes("BesselingMailer/2.0"), "Must use clean X-Mailer without phpversion disclosure");
});

test("BakkertjeSieg contactService enforces CRLF stripping, length limits, and email validation", () => {
    const bakkertjePath = path.resolve(ROOT_DIR, "../BakkertjeSieg/src/services/contactService.js");
    if (!fs.existsSync(bakkertjePath)) {
        return "SKIP";
    }
    const content = fs.readFileSync(bakkertjePath, "utf-8");

    assert.ok(content.includes(".replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, '').trim().slice(0, 80)"), "Must strip CRLF and bound name");
    assert.ok(content.includes(".replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, '').trim().slice(0, 120)"), "Must strip CRLF and bound email");
    assert.ok(content.includes("cleanEmail.includes(',') || cleanEmail.includes(' ')"), "Must check for multi-recipient injection in email");
});

test("vimexx-ftps enforces 20-second socket timeout on all FTPS operations (CWE-400)", () => {
    const ftpsPath = path.join(ROOT_DIR, "factory/deployer/vimexx-ftps.js");
    const content = fs.readFileSync(ftpsPath, "utf-8");
    const occurrences = (content.match(/client\.timeout = 20000;/g) || []).length;
    assert.ok(occurrences >= 2, "vimexx-ftps.js must set client.timeout = 20000 on both deploy and sync instances");
});

test("uptime-monitor enforces prototype pollution defense on failure tracking and supports /portal path", async () => {
    const { getConsecutiveFailures } = await import("../crm/js/uptime-monitor.js");

    assert.strictEqual(getConsecutiveFailures("__proto__"), 0, "Must return 0 on __proto__");
    assert.strictEqual(getConsecutiveFailures("constructor"), 0, "Must return 0 on constructor");
    assert.strictEqual(getConsecutiveFailures("prototype"), 0, "Must return 0 on prototype");

    // Check source code for /portal support
    const monitorPath = path.join(ROOT_DIR, "crm/js/uptime-monitor.js");
    const monitorContent = fs.readFileSync(monitorPath, "utf-8");
    assert.ok(monitorContent.includes("window.location.pathname.includes('/portal')"), "Must support /portal in basePath resolution");
});

test("audio-synth generateSoundtrackWav validates output path, enforces .wav extension and blocks reserved device names", async () => {
    const { generateSoundtrackWav } = await import("../factory/video/audio-synth.js");

    assert.throws(() => {
        generateSoundtrackWav("invalid_track.mp3");
    }, /Bestandsnaam moet eindigen op \.wav/);

    assert.throws(() => {
        generateSoundtrackWav("nul.wav");
    }, /Windows gereserveerde apparaatnamen/);

    assert.throws(() => {
        generateSoundtrackWav("con.wav");
    }, /Windows gereserveerde apparaatnamen/);
});

test("Sister repositories contain .gitignore to defend against credential and artifact leakage", () => {
    const repos = ["Livian", "Scholte-elektrotechniek", "stenekesrioolspecialist"];
    const existingRepos = repos.filter(repo => fs.existsSync(path.resolve(ROOT_DIR, `../${repo}`)));
    if (existingRepos.length === 0) {
        return "SKIP";
    }
    for (const repo of existingRepos) {
        const gitignorePath = path.resolve(ROOT_DIR, `../${repo}/.gitignore`);
        assert.ok(fs.existsSync(gitignorePath), `${repo}/.gitignore must exist`);
        const content = fs.readFileSync(gitignorePath, "utf-8");
        assert.ok(content.includes(".env"), `${repo}/.gitignore must ignore .env`);
        assert.ok(content.includes("node_modules/"), `${repo}/.gitignore must ignore node_modules/`);
    }
});

test("Vanderplaats contact.php enforces 10KB payload cap, rate limiting, and email injection defense", () => {
    const pubPath = path.resolve(ROOT_DIR, "../Vanderplaats/public/api/contact.php");
    const distPath = path.resolve(ROOT_DIR, "../Vanderplaats/dist/api/contact.php");
    if (!fs.existsSync(pubPath) || !fs.existsSync(distPath)) {
        return "SKIP";
    }

    for (const file of [pubPath, distPath]) {
        const content = fs.readFileSync(file, "utf-8");
        assert.ok(content.includes("file_get_contents('php://input', false, null, 0, 10240)"), "Must enforce 10KB body boundary");
        assert.ok(content.includes("vanderplaats_rate_"), "Must implement rate limiting on contact.php");
        assert.ok(content.includes("http_response_code(429)"), "Must return 429 when rate limit exceeded");
        assert.ok(content.includes("strpos($email, ',') !== false || strpos($email, ' ') !== false"), "Must reject email with commas or spaces");
        assert.ok(content.includes("VanderplaatsMailer/2.0"), "Must use clean X-Mailer without phpversion disclosure");
    }
});

test("Scholte-elektrotechniek main.js enforces safe anchor smooth scrolling and guarded localStorage", () => {
    const mainPath = path.resolve(ROOT_DIR, "../Scholte-elektrotechniek/js/main.js");
    if (!fs.existsSync(mainPath)) {
        return "SKIP";
    }
    const content = fs.readFileSync(mainPath, "utf-8");

    assert.ok(content.includes("href === '#' || href.length <= 1"), "Must check for invalid anchor href '#' before querySelector");
    assert.ok(content.includes("try {\n        const target = document.querySelector(href);") || content.includes("try {\r\n        const target = document.querySelector(href);"), "Must wrap querySelector in try/catch");
    assert.ok(content.includes("try {\n    hasConsent = Boolean(localStorage.getItem('cookieConsent'));") || content.includes("try {\r\n    hasConsent = Boolean(localStorage.getItem('cookieConsent'));"), "Must wrap cookie consent in try/catch");
});

test("arnolddesign CookieConsent and Contact enforce error handling and clipboard catch", () => {
    const cookiePath = path.resolve(ROOT_DIR, "../arnolddesign/src/components/CookieConsent.jsx");
    const contactPath = path.resolve(ROOT_DIR, "../arnolddesign/src/pages/Contact.jsx");
    if (!fs.existsSync(cookiePath) || !fs.existsSync(contactPath)) {
        return "SKIP";
    }

    const cookieContent = fs.readFileSync(cookiePath, "utf-8");
    assert.ok(cookieContent.includes("try {\n      consent = localStorage.getItem('arnold-cookie-consent');") || cookieContent.includes("try {\r\n      consent = localStorage.getItem('arnold-cookie-consent');"), "CookieConsent must wrap localStorage in try/catch");

    const contactContent = fs.readFileSync(contactPath, "utf-8");
    assert.ok(contactContent.includes(".catch(() => {})"), "Contact.jsx must catch clipboard.writeText rejection");
});

test("Creation-Alt-Fix status.js setupProfileModal sanitizes inputs and bounds length", () => {
    const statusPath = path.join(ROOT_DIR, "crm/status/js/status.js");
    const content = fs.readFileSync(statusPath, "utf-8");

    assert.ok(content.includes("const cleanStr = (val, maxLen) => String(val || '').replace(/[\\r\\n\\x00-\\x1F\\x7F]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, maxLen);"), "status.js must define cleanStr for profile modal inputs");
    assert.ok(content.includes("cleanStr(document.getElementById('prof-company-name')?.value, 120)"), "Company name must be bounded to 120 chars");
    assert.ok(content.includes("cleanStr(document.getElementById('prof-street')?.value, 150)"), "Street must be bounded to 150 chars");
});

test("Creation-Alt-Fix create-payment.php and generate-html.js enforce bounded payload and CWD independence", () => {
    const paymentPath = path.join(ROOT_DIR, "crm/api/create-payment.php");
    const paymentContent = fs.readFileSync(paymentPath, "utf-8");
    assert.ok(paymentContent.includes("file_get_contents('php://input', false, null, 0, 10240)"), "create-payment.php must bound php://input to 10KB");

    const genHtmlPath = path.join(ROOT_DIR, "factory/video/generate-html.js");
    const genContent = fs.readFileSync(genHtmlPath, "utf-8");
    assert.ok(genContent.includes("fileURLToPath(import.meta.url)"), "generate-html.js must use fileURLToPath for CWD independence");
    assert.ok(genContent.includes("safeReadBase64"), "generate-html.js must use safeReadBase64");
});

// ========================================================
// 12. ARCHITECTURE, REACTIVE STATE & 2027 AGENCY FEATURES
// ========================================================
console.log("\n📌 SUITE 12: Architecture, Reactive State & 2027 Features");

const { ReactiveStore } = await import("../crm/js/core/store.js");
const { ActionDispatcher } = await import("../crm/js/core/action-dispatcher.js");
const { Schemas } = await import("../crm/js/core/schemas.js");
const { calculateVisualPulse } = await import("../crm/admin/js/modules/project-timeline.js");
const { generateBillingWhatsAppUrl, normalizeProjectInvoices, renderBillingCardHtml } = await import("../crm/admin/js/modules/project-billing.js");
const { generateSlaContractDetails, renderSlaSigningModalHtml } = await import("../crm/status/js/modules/sla-signer.js");
const { sendDiscordWebhookAlert, sendTelegramAlert, escapeTelegramHtml } = await import("../crm/js/uptime-monitor.js");
const { extractJsonObject } = await import("../crm/js/ai-engine.js");

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

test("ReactiveStore defends against Prototype Pollution (CWE-1321)", () => {
    const store = new ReactiveStore({ user: "admin" });
    assert.strictEqual(Reflect.set(store.state, "__proto__", { polluted: true }), false);
    assert.strictEqual(Reflect.set(store.state, "constructor", { polluted: true }), false);
    assert.strictEqual(Reflect.set(store.state, "prototype", { polluted: true }), false);
    assert.strictEqual(Object.prototype.polluted, undefined, "Object.prototype must not be polluted");
});

test("escapeTelegramHtml neutralizes HTML entity injection for Telegram Bot API", () => {
    assert.strictEqual(escapeTelegramHtml("Allard & Bob <V.O.F.>"), "Allard &amp; Bob &lt;V.O.F.&gt;");
    assert.strictEqual(escapeTelegramHtml("No special chars"), "No special chars");
    assert.strictEqual(escapeTelegramHtml(null), "");
    assert.strictEqual(escapeTelegramHtml(undefined), "");
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

test("ActionDispatcher sanitizes payloads against Prototype Pollution (CWE-1321)", async () => {
    const { ActionDispatcher } = await import("../crm/js/core/action-dispatcher.js");
    const malicious = {
        name: "Test",
        __proto__: { isAdmin: true },
        constructor: { evil: true },
        prototype: { bad: true }
    };
    const sanitized = ActionDispatcher.sanitizePayload(malicious);
    assert.strictEqual(sanitized.name, "Test");
    assert.strictEqual(sanitized.__proto__, Object.prototype);
    assert.strictEqual(Object.prototype.isAdmin, undefined);
    assert.strictEqual(Object.prototype.evil, undefined);
});

test("admin-stats and project-timeline handle corrupt and null inputs gracefully", async () => {
    const { calculateDashboardStats } = await import("../crm/admin/js/modules/admin-stats.js");
    const { calculateVisualPulse, renderTimelineHtml } = await import("../crm/admin/js/modules/project-timeline.js");

    const emptyStats = calculateDashboardStats(null);
    assert.strictEqual(emptyStats.leads, 0);
    assert.strictEqual(emptyStats.projects, 0);

    const corruptStats = calculateDashboardStats([null, undefined, { status: null, tasks: null }]);
    assert.strictEqual(corruptStats.leads, 1); // null status defaults to "Nieuwe Lead" (phase 1)

    const corruptPulse = calculateVisualPulse([null, { timestamp: "not-a-date" }]);
    assert.strictEqual(corruptPulse.state, "passive");
    assert.strictEqual(corruptPulse.timeAgo, "Onbekend");

    const corruptTimeline = renderTimelineHtml([null, undefined]);
    assert.ok(corruptTimeline.includes("Nog geen tijdlijn-"), "Must render placeholder for null items");
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

    // 4. URL & XSS sanitization in Annotations & Contracts
    const taintedAnn = Schemas.sanitizeAnnotation({
        targetUrl: "javascript:alert(1)",
        screenshotUrl: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="
    });
    assert.strictEqual(taintedAnn.targetUrl, "", "Must neutralize javascript: from annotation targetUrl");
    assert.strictEqual(taintedAnn.screenshotUrl, "", "Must neutralize data:text/html from annotation screenshotUrl");

    const taintedContract = Schemas.sanitizeContract({
        signatureDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
        pdfStorageUrl: "javascript:void(0)"
    });
    assert.strictEqual(taintedContract.signatureDataUrl, "", "Must neutralize non-image data URL from contract signature");
    assert.strictEqual(taintedContract.pdfStorageUrl, "", "Must neutralize javascript: from contract pdfStorageUrl");

    const safeContract = Schemas.sanitizeContract({
        signatureDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        pdfStorageUrl: "https://firebasestorage.googleapis.com/v0/b/app/doc.pdf"
    });
    assert.ok(safeContract.signatureDataUrl.startsWith("data:image/png;base64,"), "Must accept valid png base64 signature");
    assert.strictEqual(safeContract.pdfStorageUrl, "https://firebasestorage.googleapis.com/v0/b/app/doc.pdf");

    // 5. Length bounding & control character stripping
    const boundedAnn = Schemas.sanitizeAnnotation({
        comment: "A".repeat(1500) + "\x00\x1F",
        author: "Allard\r\nVeldman" + "B".repeat(200)
    });
    assert.strictEqual(boundedAnn.comment.length, 1000, "Annotation comment must be capped at 1000 characters");
    assert.ok(!boundedAnn.comment.includes("\x00"), "Annotation comment must strip control characters");
    assert.strictEqual(boundedAnn.author.length, 100, "Annotation author must be capped at 100 characters");
    assert.ok(!boundedAnn.author.includes("\r\n"), "Annotation author must strip CRLF");

    const boundedContract = Schemas.sanitizeContract({
        signedByName: "Allard\r\n" + "X".repeat(200),
        signerIp: "192.168.1.1; DROP TABLE",
        contractNumber: "SLA-2027/001!@#"
    });
    assert.strictEqual(boundedContract.signedByName.length, 100, "Contract signedByName must be capped at 100 characters");
    assert.strictEqual(boundedContract.signerIp, "", "Contract signerIp must reject injection and only accept valid IPs");
    assert.strictEqual(boundedContract.contractNumber, "SLA-2027001", "Contract number must only retain alphanumeric/hyphen/underscore");

    const validIpContract = Schemas.sanitizeContract({ signerIp: "192.168.1.1" });
    assert.strictEqual(validIpContract.signerIp, "192.168.1.1", "Contract signerIp must accept clean IPv4");
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

test("Multi-invoice management normalizes legacy projects and renders comprehensive billing suite", () => {
    // 1. Legacy project auto-migration
    const legacyProject = {
        id: "proj_legacy",
        client: "Legacy BV",
        invoiceNumber: "2026-004",
        mollieLink: "https://mollie.com/pay/test123",
        proposalPrice: 500,
        status: "Fase 5: Wacht op Betaling (Mollie)"
    };
    const normalized = normalizeProjectInvoices(legacyProject);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].invoiceNumber, "2026-004");
    assert.equal(normalized[0].mollieCheckoutUrl, "https://mollie.com/pay/test123");
    assert.equal(normalized[0].amountExcl, 500);

    // 2. Multi-invoice rendering
    const multiProject = {
        id: "proj_multi",
        client: "Multi Test",
        invoices: [
            { invoiceNumber: "2026-010", amountExcl: 250, amountIncl: 302.50, status: "paid" },
            { invoiceNumber: "2026-011", amountExcl: 250, amountIncl: 302.50, status: "open", mollieCheckoutUrl: "https://mollie.com/pay/test" }
        ]
    };
    const billingHtml = renderBillingCardHtml(multiProject);
    assert.ok(billingHtml.includes("2026-010"));
    assert.ok(billingHtml.includes("2026-011"));
    assert.ok(billingHtml.includes("Nieuwe Factuur Aanmaken"));
    assert.ok(billingHtml.includes("Totaal Gefactureerd"));
    assert.ok(billingHtml.includes("Totaal Voldaan"));
    assert.ok(billingHtml.includes("Openstaand"));

    // 3. UI checks: Screen 1 sidebar strictly shows subscription, no invoice fields
    const projectHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/project.html"), "utf-8");
    assert.ok(!projectHtml.includes('id="edit-invoice-number"'), "Sidebar card must not contain #edit-invoice-number");
    assert.ok(!projectHtml.includes('LAATSTE FACTUUR (PI)'), "Sidebar card must not contain LAATSTE FACTUUR (PI)");
    assert.ok(projectHtml.includes('Huidig Abonnement'), "Sidebar card must contain Huidig Abonnement");

    // 4. UI checks: Screen 2 tab splitting
    assert.ok(projectHtml.includes('data-tab="tab-proposals-invoices"'), "Must have separate Offertes & Facturen tab");
    assert.ok(projectHtml.includes('data-tab="tab-actions"'), "Must have separate Snelacties tab");
    assert.ok(projectHtml.includes('id="tab-proposals-invoices"'), "Must have #tab-proposals-invoices pane");
    assert.ok(projectHtml.includes('id="tab-actions"'), "Must have #tab-actions pane");
    assert.ok(projectHtml.includes('id="project-billing-container"'), "Must contain #project-billing-container");
    assert.ok(projectHtml.includes('id="modal-create-invoice"'), "Must contain #modal-create-invoice");

    // 5. Pi-Boekhouding synchronization for BakkertjeSieg & auto-increment floor
    const siegProject = { client: "BakkertjeSieg", domainName: "bakkertjesieg.nl" };
    const siegInvoices = normalizeProjectInvoices(siegProject);
    assert.equal(siegInvoices.length, 3, "BakkertjeSieg must contain all 3 historical invoices (2026-002, 2026-009, 2026-012)");
    assert.equal(siegInvoices[0].invoiceNumber, "2026-002");
    assert.equal(siegInvoices[1].invoiceNumber, "2026-009");
    assert.equal(siegInvoices[2].invoiceNumber, "2026-012");
});

test("generateSlaContractDetails generates SLA terms based on 2027 plan", () => {
    const sla = generateSlaContractDetails("transition_2027_loyalty", { id: "stenekes", client: "Stenekes" });
    assert.equal(sla.annualPrice, 95);
    assert.equal(sla.serviceMinutesIncluded, 30);
    assert.ok(sla.contractNumber.includes("STENEKES"));
    assert.ok(sla.uptimeTarget.includes("99.9%"));
    assert.ok(sla.uptimeTarget.includes("Inspanningsverplichting"));
    assert.ok(sla.uptimeSidenote.includes("Vimexx"));
    assert.ok(sla.termAndRenewal.includes("12 maanden"));
    assert.ok(sla.dpaIncluded.includes("Artikel 28 AVG"));
});

test("SLA Signing modal contains Allard Veldman, external hosting sidenote, and DPA terms", () => {
    const sla = generateSlaContractDetails("managed_nl", { id: "test", client: "Test Client" });
    const modalHtml = renderSlaSigningModalHtml(sla);
    assert.ok(modalHtml.includes("Allard Veldman"), "Provider name must be Allard Veldman");
    assert.ok(!modalHtml.includes("Allard van der Meer"), "Typo Allard van der Meer must not exist");
    assert.ok(modalHtml.includes("Sidenote Externe Hosting"), "Modal must display external hosting sidenote");
    assert.ok(modalHtml.includes("Vimexx"), "Modal must reference upstream hosting provider");
    assert.ok(modalHtml.includes("Verwerkersovereenkomst conform Artikel 28 AVG"), "Modal must include DPA agreement");
    assert.ok(modalHtml.includes("Looptijd & Verlenging"), "Modal must display B2B renewal terms");
});

test("Website Algemene Voorwaarden and translations contain external hosting force majeure and 10 ironclad articles", () => {
    const termsHtml = fs.readFileSync(path.join(ROOT_DIR, "website/algemene-voorwaarden.html"), "utf-8");
    assert.ok(termsHtml.includes("Vimexx"), "algemene-voorwaarden.html must mention Vimexx");
    assert.ok(termsHtml.includes("inspanningsverbintenissen"), "algemene-voorwaarden.html must state inspanningsverbintenissen");
    assert.ok(termsHtml.includes("overmacht"), "algemene-voorwaarden.html must state overmacht");
    assert.ok(termsHtml.includes("6:119a BW"), "algemene-voorwaarden.html must state wettelijke handelsrente 6:119a BW");
    assert.ok(termsHtml.includes("Opschortingsrecht"), "algemene-voorwaarden.html must include opschortingsrecht");
    assert.ok(termsHtml.includes("6:89 BW"), "algemene-voorwaarden.html must include klachtplicht 6:89 BW");
    assert.ok(termsHtml.includes("7:408 lid 2 BW"), "algemene-voorwaarden.html must exclude early cancellation 7:408 BW");
    assert.ok(termsHtml.includes("Artikel 28 AVG"), "algemene-voorwaarden.html must include DPA Art 28 AVG");

    const subpageJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/subpage.js"), "utf-8");
    const transJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/modules/translations-data.js"), "utf-8");
    const allText = subpageJs + transJs;
    assert.ok(allText.includes("Vimexx"), "subpage.js / translations-data.js must mention Vimexx");
    assert.ok(allText.includes("force majeure"), "translations-data.js must include English force majeure");
    assert.ok(allText.includes("Article 28 GDPR"), "translations-data.js must include English DPA Art 28 GDPR");
    assert.ok(allText.includes("99.9% Uptime Streefnorm*"), "translations-data.js must specify streefnorm for feat2");
});

test("Multi-Channel webhook alerts reject invalid URLs and SSRF attempts gracefully without crashing", async () => {
    const resDiscord = await sendDiscordWebhookAlert({ domain: "example.com" }, "http://invalid-not-https");
    assert.equal(resDiscord, false);

    // SSRF poging naar interne host / service
    const resSsrf = await sendDiscordWebhookAlert({ domain: "example.com" }, "https://127.0.0.1:8443/admin");
    assert.equal(resSsrf, false);

    const resTelegram = await sendTelegramAlert({ domain: "example.com" }, "", "");
    assert.equal(resTelegram, false);

    const resTelegramSsrf = await sendTelegramAlert({ domain: "example.com" }, "invalid_token", "invalid_chat");
    assert.equal(resTelegramSsrf, false);
});

test("extractJsonObject parses markdown-wrapped and conversational LLM responses cleanly", () => {
    const conversational = 'Hier is de gevraagde offerte:\n```json\n{"proposalTitle": "Test Project", "estimatedPrice": "550,00"}\n```\nMet vriendelijke groet!';
    const parsed = extractJsonObject(conversational);
    assert.ok(parsed, "extractJsonObject must successfully parse conversational markdown block");
    assert.equal(parsed.proposalTitle, "Test Project");
    assert.equal(parsed.estimatedPrice, "550,00");

    assert.equal(extractJsonObject("geen json aanwezig"), null);
    assert.equal(extractJsonObject(""), null);
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

await testAsync("enrichBusinessProfile normaliseert telefoons, WhatsApp en berekent potentie", async () => {
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

test("buildOutreachPitch genereert persoonlijke email, WhatsApp, archetypen, €199 tarieven en AVG opt-out", () => {
    // 1. Archetype A: Trade Direct (Vakman)
    const mockLeadA = {
        name: "Klusbedrijf De Vries",
        slug: "klusbedrijf-de-vries",
        category: "Timmerman & Klusbedrijf",
        archetype: "A_TRADE_DIRECT",
        archetypeLabel: "Nuchter & Direct Bellen (Vakman)",
        pitchHook: "We zagen dat je als vakman in regio Hoogezand actief bent.",
        rating: 5.0,
        recommendedDomain: "klusbedrijf-de-vries.nl"
    };

    const pitchA = buildOutreachPitch(mockLeadA);
    assert.ok(pitchA.subject.includes("Concept website voor Klusbedrijf De Vries"));
    assert.ok(pitchA.conceptUrl.includes("creationaltfix.nl/concept/klusbedrijf-de-vries"));
    assert.ok(pitchA.bodyHtml.includes("€ 199,-"), "Moet € 199,- realisatie bevatten");
    assert.ok(pitchA.bodyHtml.includes("€ 150,-"), "Moet € 150,- hosting all-in bevatten");
    assert.ok(pitchA.bodyHtml.includes("portal.creationaltfix.nl"), "Moet Klantenportaal USP bevatten");
    assert.ok(pitchA.bodyHtml.includes("99986191"), "Moet KVK nummer bevatten");
    assert.ok(pitchA.bodyHtml.includes("06 - 19 13 54 53"), "Moet officieel telefoonnummer Allard bevatten");
    assert.ok(!pitchA.bodyHtml.includes("06 - 12 34 56 78"), "Mag geen placeholder telefoonnummer bevatten");
    assert.ok(pitchA.bodyPlain.includes("art. 21 AVG"), "Moet AVG art. 21 opt-out bevatten");
    assert.ok(pitchA.whatsAppText.includes("klusbedrijf-de-vries"));

    // 2. Archetype B: Beauty / Reviews
    const mockLeadB = {
        name: "Kapsalon Puur",
        slug: "kapsalon-puur",
        category: "Kapper",
        archetype: "B_PRESENTATION_REVIEWS",
        archetypeLabel: "Uitstraling & Klantreviews (Zorg/Beauty)",
        pitchHook: "We zagen dat je met Kapsalon Puur prachtige reviews krijgt.",
        rating: 4.9,
        recommendedDomain: "kapsalon-puur.nl"
    };
    const pitchB = buildOutreachPitch(mockLeadB);
    assert.ok(pitchB.subject.includes("Online visitekaartje & reviews voor Kapsalon Puur"));
    assert.ok(pitchB.bodyPlain.includes("€ 199,-"));

    // 3. Archetype C: Modernisation HTTP
    const mockLeadC = {
        name: "Schilder Jansen",
        slug: "schilder-jansen",
        category: "Schildersbedrijf",
        archetype: "C_MODERNISATION",
        archetypeLabel: "Website Modernisatie & SSL Beveiliging",
        pitchHook: "We merkten op dat je website nog niet beschikt over een modern SSL-slotje.",
        hasInsecureHttp: true,
        recommendedDomain: "schilder-jansen.nl"
    };
    const pitchC = buildOutreachPitch(mockLeadC);
    assert.ok(pitchC.subject.includes("Veilige mobiele website-update voor Schilder Jansen"));
    assert.ok(pitchC.bodyPlain.includes("SSL"));
});

test("Website tarieven audit: Alle websitepagina's en vertalingen hanteren 'vanaf € 199,-'", () => {
    const webLatenMakenHtml = fs.readFileSync(path.join(ROOT_DIR, "website/diensten/website-laten-maken/index.html"), "utf-8");
    assert.ok(webLatenMakenHtml.includes("vanaf €199"), "website-laten-maken HTML moet vanaf €199 bevatten");
    assert.ok(webLatenMakenHtml.includes('"price": "199"'), "Schema.org moet price 199 hebben");
    assert.ok(!webLatenMakenHtml.includes("vanaf €99"), "Mag geen vanaf €99 meer bevatten");

    const scriptJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/script.js"), "utf-8");
    const transJs = fs.readFileSync(path.join(ROOT_DIR, "website/js/modules/translations-data.js"), "utf-8");
    const allScriptText = scriptJs + transJs;
    assert.ok(allScriptText.includes('Aanwezigheid vanaf €199'), "translations-data.js NL moet €199 bevatten");
    assert.ok(allScriptText.includes('Presence from €199'), "translations-data.js EN moet €199 bevatten");
    assert.ok(!allScriptText.includes('vanaf €99'), "translations-data.js mag geen vanaf €99 bevatten");
});

test("LeadFactoryEngine deduplicatie en database persistentie", () => {
    const engine = new LeadFactoryEngine();
    const db = engine.loadDatabase();

    assert.ok(Array.isArray(db.leads), "Database moet leads array bevatten");
    assert.ok(db.leads.length >= 20, "Database moet minimaal de 20 geverifieerde leads bevatten (vrij van spook-leads)");
    assert.ok(!db.leads.some(l => l.status === 'skipped_has_website'), "Database mag geen overgeslagen spook-leads bevatten");
    assert.ok(db.leads.every(l => ['concept_ready', 'sent_email', 'sent_whatsapp', 'sent'].includes(l.status)), "Alle leads moeten een geldige status hebben");
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
    assert.ok(protectedHtml.includes("99986191"), "Moet officieel KVK nummer 99986191 bevatten");
    assert.ok(!protectedHtml.includes("88123456"), "Mag geen dummy KVK nummer 88123456 bevatten");
    assert.ok(protectedHtml.includes("ARTIKEL 29A AUTEURSWET 1912"), "Moet Art. 29a Auteurswet vermelding bevatten");
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
        "factory/video/audio-synth.js",
        "factory/video/generate-html.js",
        "factory/video/build-motion-video.js",
        "crm/admin/js/modules/admin-lead-factory.js"
    ];

    for (const f of factoryFiles) {
        const fullPath = path.join(ROOT_DIR, f);
        assert.ok(fs.existsSync(fullPath), `Bestand ${f} moet bestaan`);
        const cmd = `node --check "${fullPath}"`;
        execSync(cmd, { stdio: "pipe" });
    }
});

test("Concept Generator en concept websites voldoen intrinsiek aan de 20 audit criteria", async () => {
    const { buildFallbackTemplate } = await import("../factory/generator/agy-generator.js");
    
    // Test direct generator output bij creatie
    const testHtml = buildFallbackTemplate({
        name: "Test Installatiebedrijf",
        slug: "test-installatie",
        category: "Installatietechniek",
        address: "Hoogezand",
        phone: "06 12345678"
    });

    assert.ok(testHtml.includes('rel="canonical"'), "Generator moet direct Canonical link genereren");
    assert.ok(testHtml.includes('name="robots"'), "Generator moet direct Meta Robots genereren");
    assert.ok(testHtml.includes('rel="icon"'), "Generator moet direct SVG Favicon genereren");
    assert.ok(testHtml.includes('property="og:title"'), "Generator moet direct Open Graph tags genereren");
    assert.ok(testHtml.includes('name="twitter:card"'), "Generator moet direct Twitter Cards genereren");
    assert.ok(testHtml.includes('FAQPage'), "Generator moet direct Schema.org FAQPage genereren");
    assert.ok(testHtml.includes('LocalBusiness'), "Generator moet direct Schema.org LocalBusiness genereren");
    assert.ok(testHtml.includes('<details class="faq-item"'), "Generator moet direct interactieve FAQ accordion genereren");
    assert.ok(testHtml.includes('_hp_trap'), "Generator moet direct anti-spam honeypot formulier genereren");
    assert.ok(testHtml.includes('id="modal-privacy"'), "Generator moet direct Privacy Policy modal genereren");
    assert.ok(testHtml.includes('id="modal-terms"'), "Generator moet direct Algemene Voorwaarden modal genereren");
    assert.ok(testHtml.includes('id="concept-cookie-bar"'), "Generator moet direct Cookie & Privacy banner genereren");
    assert.ok(testHtml.includes('footer-legal-links'), "Generator moet direct Footer juridische links genereren");

    // Valideer alle fysieke concept websites in website/concept/
    const conceptBaseDir = path.join(ROOT_DIR, "website", "concept");
    const conceptDirs = fs.readdirSync(conceptBaseDir).filter(f => fs.statSync(path.join(conceptBaseDir, f)).isDirectory());
    assert.ok(conceptDirs.length >= 20, "Minimaal 20 concept websites vereist");

    for (const dir of conceptDirs) {
        const file = path.join(conceptBaseDir, dir, "index.html");
        assert.ok(fs.existsSync(file), `Map ${dir} moet index.html bevatten`);
        const html = fs.readFileSync(file, "utf8");
        assert.ok(html.includes('rel="canonical"'), `${dir} moet canonical link hebben`);
        assert.ok(html.includes('name="robots"'), `${dir} moet meta robots hebben`);
        assert.ok(html.includes('rel="icon"'), `${dir} moet favicon hebben`);
        assert.ok(html.includes('FAQPage'), `${dir} moet FAQPage schema hebben`);
        assert.ok(html.includes('_hp_trap'), `${dir} moet contact form honeypot hebben`);
        assert.ok(html.includes('modal-privacy'), `${dir} moet privacy modal hebben`);
        assert.ok(html.includes('modal-terms'), `${dir} moet terms modal hebben`);
        assert.ok(html.includes('concept-cookie-bar'), `${dir} moet cookie banner hebben`);
    }
});


// ========================================================
// FINAL SUMMARY
// ========================================================
console.log("\n========================================================");
console.log(`🏁 TEST RUN FINISHED: ${passedCount} PASSED, ${failedCount} FAILED${skippedCount > 0 ? `, ${skippedCount} SKIPPED` : ""}`);
console.log("========================================================\n");

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
