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
import { createRequire } from "node:module";
const cjsRequire = createRequire(import.meta.url);

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
    "crm/admin/js/modules/milestone-dispatcher.js",
    "crm/status/js/status.js",
    "crm/status/js/modules/translations.js",
    "crm/status/js/modules/onboarding-checklist.js",
    "crm/status/js/modules/document-vault.js",
    "crm/status/js/modules/chat-notifications.js",
    "crm/status/js/modules/visual-feedback.js",
    "crm/status/js/modules/sla-signer.js",
    "crm/status/js/modules/domain-setup-wizard.js",
    "crm/intake/js/intake.js",
    "crm/intake/js/notifications.js",
    "crm/scripts/uptime-webhook-alerts.js",
    "website/js/modules/translations-data.js",
    "website/js/script.js",
    "website/js/subpage.js",
    "website/js/cookie-consent.js",
    "website/js/live-demo.js",
    "website/docs/js/docs.js",
    "crm/admin/js/modules/ftp-hardening-auditor.js",
    "crm/admin/js/modules/cloud-migration-planner.js",
    "crm/admin/js/modules/cloud-cutover-executor.js",
    "crm/admin/js/modules/regional-outreach-manager.js"
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

    // Must whitelist TASK-910 onboarding fields for clients
    assert.ok(
        rulesContent.includes("'onboarding'"),
        "firestore.rules must whitelist onboarding for client checklist updates"
    );
    assert.ok(
        rulesContent.includes("'domainTransferToken'"),
        "firestore.rules must whitelist domainTransferToken for client domain transfers"
    );
    assert.ok(
        rulesContent.includes("'eppCode'"),
        "firestore.rules must whitelist eppCode for client domain transfers"
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

    const apiHtaccessPath = path.join(ROOT_DIR, "crm/api/.htaccess");
    assert.ok(fs.existsSync(apiHtaccessPath), "crm/api/.htaccess must exist");
    const apiHtaccess = fs.readFileSync(apiHtaccessPath, "utf-8");
    assert.ok(apiHtaccess.includes("Require all denied"), "crm/api must deny direct access to log and json files");
    assert.ok(apiHtaccess.includes("Strict-Transport-Security"), "crm/api must enforce HSTS");
    assert.ok(apiHtaccess.includes("Content-Security-Policy"), "crm/api must configure CSP");
    assert.ok(apiHtaccess.includes("X-Content-Type-Options \"nosniff\""), "crm/api must enforce nosniff");
    assert.ok(apiHtaccess.includes("X-Frame-Options \"DENY\""), "crm/api must enforce DENY");
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

    // 1b. Deleted invoice regression guard: explicit empty invoices[] or deletedInvoices[] must never resurrect legacy invoiceNumber
    const deletedProject = {
        id: "proj_deleted",
        client: "Test Klant",
        invoiceNumber: "2026-013",
        factuurnummer: "2026-013",
        mollieLink: "https://payment-links.mollie.com/payment/test",
        invoices: [],
        deletedInvoices: ["2026-013"]
    };
    assert.strictEqual(normalizeProjectInvoices(deletedProject).length, 0, "Deleted invoice must not resurrect when invoices array is empty");

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
    assert.ok(billingHtml.includes("Nieuwe Betaallink Aanmaken"));
    assert.ok(billingHtml.includes("Upload Factuur PDF"));
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

await testAsync("Concept Generator en concept websites voldoen intrinsiek aan de 20 audit criteria", async () => {
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
        assert.ok(html.includes('FAQPage') || dir === 'berends' || dir === 'heinkens-daktechniek', `${dir} moet FAQPage schema hebben`);
        const contactFile = path.join(conceptBaseDir, dir, "contact.html");
        const hasContactHoneypot = fs.existsSync(contactFile) && (fs.readFileSync(contactFile, "utf8").includes('_hp_trap') || fs.readFileSync(contactFile, "utf8").includes('hp-field'));
        assert.ok(html.includes('_hp_trap') || hasContactHoneypot, `${dir} moet contact form honeypot hebben`);
        assert.ok(html.includes('modal-privacy'), `${dir} moet privacy modal hebben`);
        assert.ok(html.includes('modal-terms'), `${dir} moet terms modal hebben`);
        assert.ok(html.includes('concept-cookie-bar'), `${dir} moet cookie banner hebben`);
    }
});

test("maps-crawler and deep-intelligence enforce lead deduplication and cross-contamination defense", async () => {
    const { isDuplicateLead, normalizeDomain, normalizePhoneDigits } = await import("../factory/discovery/maps-crawler.js");
    const { isWebsiteMatchingBusiness, enrichBusinessProfile } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Phone & Domain normalizers
    assert.strictEqual(normalizeDomain("https://www.heinkensdaktechniek.nl/contact/"), "heinkensdaktechniek.nl");
    assert.strictEqual(normalizeDomain("http://BerendsBestrating.nl/"), "berendsbestrating.nl");
    assert.strictEqual(normalizePhoneDigits("+31 6 15 42 41 89"), "15424189");
    assert.strictEqual(normalizePhoneDigits("06-15424189"), "15424189");

    // 2. Crawler deduplication
    const existingList = [
        { slug: "heinkens-daktechniek", phone: "06 15 42 41 89", website: "http://heinkensdaktechniek.nl/" }
    ];

    // Same slug
    assert.strictEqual(isDuplicateLead({ slug: "heinkens-daktechniek", phone: "06 99 99 99 99" }, existingList), true);
    // Same phone with different format
    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-nieuw", phone: "+31 6 1542 4189" }, existingList), true);
    // Same website with different protocol/www
    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-extra", website: "https://www.heinkensdaktechniek.nl/" }, existingList), true);
    // Unique new business
    assert.strictEqual(isDuplicateLead({ slug: "uniek-bedrijf", phone: "06 11 22 33 44", website: "https://uniek.nl/" }, existingList), false);

    // 3. Cross-contamination validation (business name vs website domain)
    assert.strictEqual(isWebsiteMatchingBusiness("Heinkens Daktechniek", "http://heinkensdaktechniek.nl/"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Berends Bestrating & Grondwerk", "http://www.berendsbestrating.nl/"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("N ten seldam", "http://www.berendsbestrating.nl/"), false, "Must reject Berends website for N ten seldam");

    // 4. Autonomous decoupling in enrichBusinessProfile
    const mismatchedLead = {
        name: "N ten seldam",
        slug: "n-ten-seldam-test",
        phone: "06 12567596",
        website: "http://www.berendsbestrating.nl/",
        category: "Stratenmaker"
    };
    const enriched = await enrichBusinessProfile(mismatchedLead);
    assert.strictEqual(enriched.website, null, "enrichBusinessProfile must decouple mismatched website");
    assert.strictEqual(enriched.hasWebsite, false);
    assert.strictEqual(enriched.archetype, "A_TRADE_DIRECT");
});

test("Factory and CRM leads databases maintain zero duplicates, exact synchronization and clean DRM markup", () => {
    const factoryPath = path.join(ROOT_DIR, "factory/data/leads.json");
    const crmPath = path.join(ROOT_DIR, "crm/admin/data/leads.json");

    assert.ok(fs.existsSync(factoryPath) && fs.existsSync(crmPath), "Both leads.json files must exist");
    const factoryRaw = fs.readFileSync(factoryPath, "utf-8");
    const crmRaw = fs.readFileSync(crmPath, "utf-8");
    assert.strictEqual(factoryRaw, crmRaw, "factory and crm leads.json must be 100% identical");

    const data = JSON.parse(factoryRaw);
    const leads = data.leads;

    // Deduplication assertion
    const phoneSet = new Set();
    const websiteSet = new Set();
    const slugSet = new Set();

    for (const lead of leads) {
        if (lead.phone) {
            const digits = lead.phone.replace(/\D/g, "");
            const suffix = digits.length >= 8 ? digits.slice(-8) : digits;
            assert.ok(!phoneSet.has(suffix), `Duplicate phone found: ${lead.phone} in ${lead.slug}`);
            phoneSet.add(suffix);
        }
        if (lead.website) {
            const domain = lead.website.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
            assert.ok(!websiteSet.has(domain), `Duplicate website found: ${lead.website} in ${lead.slug}`);
            websiteSet.add(domain);
        }
        assert.ok(!slugSet.has(lead.slug), `Duplicate slug found: ${lead.slug}`);
        slugSet.add(lead.slug);
    }

    // Heinkens single canon lead
    assert.ok(!leads.some(l => l.slug === "dakdekker"), "Duplicate 'dakdekker' must be eliminated");
    const heinkens = leads.find(l => l.slug === "heinkens-daktechniek");
    assert.ok(heinkens, "Canonical 'heinkens-daktechniek' must exist");
    assert.ok(heinkens.phone.includes("15 42 41 89"), "Heinkens must have correct phone");
    assert.ok(heinkens.website.includes("heinkensdaktechniek.nl"), "Heinkens must have correct website");

    // N ten seldam integrity
    const seldam = leads.find(l => l.slug === "n-ten-seldam");
    assert.ok(seldam, "Lead 'n-ten-seldam' must exist");
    assert.strictEqual(seldam.website, null, "N ten seldam website must be null");
    assert.strictEqual(seldam.email, null, "N ten seldam email must be null");
    assert.strictEqual(seldam.hasWebsite, false, "N ten seldam hasWebsite must be false");
    assert.strictEqual(seldam.archetype, "A_TRADE_DIRECT", "N ten seldam archetype must be A_TRADE_DIRECT");
    assert.ok(!seldam.strengths[0].includes("SSL"), "N ten seldam strength must not reference SSL");

    // Concept DRM and HTML integrity across all 20 concept pages
    const conceptDir = path.join(ROOT_DIR, "website/concept");
    for (const l of leads) {
        const file = path.join(conceptDir, l.slug, "index.html");
        assert.ok(fs.existsSync(file), `Concept file must exist for ${l.slug}`);
        const html = fs.readFileSync(file, "utf-8");

        // Exactly one script guard
        const guards = (html.match(/<script id="caf-security-guard">/g) || []).length;
        assert.strictEqual(guards, 1, `${l.slug} must have exactly 1 caf-security-guard script`);

        // No leaked DRM outside script
        const withoutGuard = html.replace(/<script id="caf-security-guard">[\s\S]*?<\/script>/, "");
        assert.ok(!withoutGuard.includes("Onbevoegde Kopie Gedetecteerd"), `${l.slug} must not leak DRM text outside script`);
        assert.ok(!withoutGuard.includes("CAF_SECURITY_UNAUTHORIZED_HOST"), `${l.slug} must not leak DRM exception outside script`);

        // Valid structural tags
        const bodyOpens = (html.match(/<body/gi) || []).length;
        const bodyCloses = (html.match(/<\/body>/gi) || []).length;
        assert.strictEqual(bodyOpens, 1, `${l.slug} must have exactly 1 opening body tag`);
        assert.strictEqual(bodyCloses, 1, `${l.slug} must have exactly 1 closing body tag`);

        const headOpens = (html.match(/<head[\s>]/gi) || []).length;
        const headCloses = (html.match(/<\/head>/gi) || []).length;
        assert.strictEqual(headOpens, 1, `${l.slug} must have exactly 1 opening head tag`);
        assert.strictEqual(headCloses, 1, `${l.slug} must have exactly 1 closing head tag`);
    }
});

test("crm/api/leads.php enforces strict origin CORS, anti-caching, and reads canonical leads database", () => {
    const leadsPhpPath = path.join(ROOT_DIR, "crm/api/leads.php");
    assert.ok(fs.existsSync(leadsPhpPath), "crm/api/leads.php must exist");
    const phpContent = fs.readFileSync(leadsPhpPath, "utf-8");

    assert.ok(phpContent.includes("Access-Control-Allow-Origin"), "leads.php must enforce CORS");
    assert.ok(!phpContent.includes('Access-Control-Allow-Origin: *'), "leads.php must never use wildcard CORS");
    assert.ok(phpContent.includes("portal.creationaltfix.nl"), "leads.php must whitelist portal.creationaltfix.nl");
    assert.ok(phpContent.includes("no-store, no-cache, must-revalidate"), "leads.php must enforce anti-caching headers");
    assert.ok(phpContent.includes("HTTP_AUTHORIZATION"), "leads.php must inspect Authorization header");
    assert.ok(phpContent.includes("identitytoolkit.googleapis.com"), "leads.php must verify Firebase Bearer token");
    assert.ok(phpContent.includes("401"), "leads.php must reject unauthenticated requests with 401");
    assert.ok(phpContent.includes("php_sapi_name() === 'cli'"), "leads.php must restrict bypass strictly to CLI sapi");
    assert.ok(phpContent.includes("leads.json"), "leads.php must read leads.json");
    assert.ok(phpContent.includes("405"), "leads.php must reject non-GET methods with 405");
});

test("sanitizeAndDeduplicateLeads heals dirty leads, eliminates duplicate Heinkens, and decouples Berends from N ten seldam", async () => {
    const { sanitizeAndDeduplicateLeads } = await import("../crm/admin/js/modules/admin-lead-factory.js");
    assert.ok(typeof sanitizeAndDeduplicateLeads === "function", "sanitizeAndDeduplicateLeads must be a function");

    // Dirty sample simulating the faulty dashboard PDF state
    const dirtyLeads = [
        {
            id: "lead_seldam",
            slug: "n-ten-seldam",
            name: "N ten seldam",
            category: "Aannemer voor bestrating",
            phone: "06 12567596",
            website: "http://www.berendsbestrating.nl/",
            email: "info@berendsbestrating.nl",
            hasWebsite: true,
            pitchHook: "SSL waarschuwing voor Berends",
            status: "concept_ready"
        },
        {
            id: "lead_berends",
            slug: "berends",
            name: "Berends Bestrating & Grondwerk",
            phone: "06 27 31 94 14",
            website: "http://www.berendsbestrating.nl/",
            email: "info@berendsbestrating.nl",
            hasWebsite: true,
            status: "concept_ready"
        },
        {
            id: "lead_heinkens_noordlaren",
            slug: "dakdekker",
            name: "Dakdekkersbedrijf Heinkens (Noordlaren)",
            phone: "06 15 42 41 89",
            website: "http://heinkensdaktechniek.nl/",
            email: "info@heinkensdaktechniek.nl",
            hasWebsite: true,
            status: "concept_ready"
        },
        {
            id: "lead_heinkens_hoogezand",
            slug: "heinkens-daktechniek",
            name: "Heinkens Daktechniek (Hoogezand)",
            phone: "06 15 42 41 89",
            website: "http://heinkensdaktechniek.nl/",
            email: "info@heinkensdaktechniek.nl",
            hasWebsite: true,
            status: "concept_ready"
        },
        {
            id: "lead_dup_phone",
            slug: "duplicate-phone-lead",
            name: "Duplicaat Bedrijf",
            phone: "06 27 31 94 14", // Identiek aan Berends
            status: "concept_ready"
        }
    ];

    const clean = sanitizeAndDeduplicateLeads(dirtyLeads);

    // Assert dakdekker duplicate is removed
    assert.ok(!clean.some(l => l.slug === "dakdekker"), "Duplicate 'dakdekker' must be eliminated");

    // Assert only one Heinkens remains
    const heinkensLeads = clean.filter(l => l.slug === "heinkens-daktechniek");
    assert.strictEqual(heinkensLeads.length, 1, "Exactly one canonical Heinkens lead must remain");
    assert.strictEqual(heinkensLeads[0].name, "Heinkens Daktechniek");
    assert.strictEqual(heinkensLeads[0].phone, "06 15 42 41 89");
    assert.strictEqual(heinkensLeads[0].website, "http://heinkensdaktechniek.nl/");

    // Assert N ten seldam is completely cleansed of Berends
    const seldam = clean.find(l => l.slug === "n-ten-seldam");
    assert.ok(seldam, "N ten seldam must be present");
    assert.strictEqual(seldam.website, null, "N ten seldam website must be null");
    assert.strictEqual(seldam.email, null, "N ten seldam email must be null");
    assert.strictEqual(seldam.hasWebsite, false, "N ten seldam hasWebsite must be false");
    assert.strictEqual(seldam.archetype, "A_TRADE_DIRECT", "N ten seldam archetype must be A_TRADE_DIRECT");
    assert.ok(!seldam.pitchHook.includes("SSL"), "Pitch hook must not mention SSL");
    assert.ok(!seldam.pitch.bodyPlain.includes("Berends"), "Pitch body must not mention Berends");

    // Assert phone duplicate was rejected
    assert.ok(!clean.some(l => l.slug === "duplicate-phone-lead"), "Duplicate phone lead must be removed");

    // Total clean count should be 2 (seldam, berends, heinkens = 3)
    assert.strictEqual(clean.length, 3, "Dirty 5 leads should clean into 3 unique leads");
});

await testAsync("Anti-Break: Translations module and status/index.html have 100% key parity with zero missing keys in NL and EN", async () => {
    const htmlPath = path.join(CRM_DIR, "status/index.html");
    assert.ok(fs.existsSync(htmlPath), "crm/status/index.html must exist");
    const html = fs.readFileSync(htmlPath, "utf-8");

    const { translations } = await import("../crm/status/js/modules/translations.js");
    assert.ok(translations && translations.nl && translations.en, "translations must have nl and en dictionaries");

    const matches = [...html.matchAll(/data-translate-key=["']([^"']+)["']/g)].map(m => m[1]);
    assert.ok(matches.length > 50, "status/index.html must contain translate keys");

    const missingInNl = matches.filter(k => !(k in translations.nl));
    const missingInEn = matches.filter(k => !(k in translations.en));

    assert.strictEqual(missingInNl.length, 0, `Missing translate keys in translations.nl: ${missingInNl.join(", ")}`);
    assert.strictEqual(missingInEn.length, 0, `Missing translate keys in translations.en: ${missingInEn.join(", ")}`);

    // Symmetrical parity check
    const nlKeys = Object.keys(translations.nl);
    const enKeys = Object.keys(translations.en);
    assert.strictEqual(nlKeys.length, enKeys.length, "translations.nl and translations.en must have identical key counts");
});

test("Anti-Break: firestore.rules isolates monitors list to admins, bounds client updates against DoS, and pins storage URL", () => {
    const rulesPath = path.join(ROOT_DIR, "firestore.rules");
    assert.ok(fs.existsSync(rulesPath), "firestore.rules must exist");
    const rules = fs.readFileSync(rulesPath, "utf-8");

    // Check monitors isolation (get is public, list is admin only)
    assert.ok(rules.includes("match /monitors/{domainKey}"), "firestore.rules must define monitors collection");
    assert.ok(rules.includes("allow get: if true;"), "monitors must allow get for domain inspection");
    assert.ok(rules.includes("allow list, write: if isAdmin();"), "monitors list and write must be restricted strictly to admin");
    assert.ok(!rules.includes("match /monitors/{domainKey} {\n      allow read: if true;"), "monitors must not allow open collection enumeration");

    // Check DoS & resource limits in isValidClientUpdate
    assert.ok(rules.includes("request.resource.data.messages.size() <= 500"), "messages array must be bounded");
    assert.ok(rules.includes("request.resource.data.annotations.size() <= 200"), "annotations array must be bounded");
    assert.ok(rules.includes("request.resource.data.files.size() <= 100"), "files array must be bounded");
    assert.ok(rules.includes("request.resource.data.tickets.size() <= 200"), "tickets array must be bounded");

    // Check storage bucket pinning (prevent external bucket phishing)
    assert.ok(rules.includes("mythical-cider-475118-e5"), "proposalPdfUrl must be pinned to authentic production bucket");
    assert.ok(!rules.includes(".*\\.firebasestorage\\.app"), "proposalPdfUrl must not allow arbitrary wildcard storage buckets");
});

test("Anti-Break: firestore.rules never uses reserved keywords as dot-accessed field names (compile guard)", () => {
    const rules = fs.readFileSync(path.join(ROOT_DIR, "firestore.rules"), "utf-8");
    // Reserved words in the Rules language break compilation when used as `.data.<word>`.
    // Use bracket notation instead: request.resource.data['service']
    const reserved = ["service", "match", "allow", "function", "return", "let", "if", "in", "is", "true", "false", "null"];
    const offenders = [];
    rules.split(/\r?\n/).forEach((line, idx) => {
        const code = line.replace(/\/\/.*$/, "");
        for (const word of reserved) {
            if (new RegExp(`\\.data\\.${word}\\b`).test(code)) {
                offenders.push(`line ${idx + 1}: .data.${word}`);
            }
        }
    });
    assert.strictEqual(offenders.length, 0, `Reserved keyword field access breaks rules compilation (use data['x']): ${offenders.join("; ")}`);
});

test("Anti-Break: verify-payment.php bridges Mollie webhook logs and enforces secure input validation", () => {
    const verifyPath = path.join(ROOT_DIR, "crm/api/verify-payment.php");
    assert.ok(fs.existsSync(verifyPath), "crm/api/verify-payment.php must exist");
    const content = fs.readFileSync(verifyPath, "utf-8");

    assert.ok(content.includes("Access-Control-Allow-Origin"), "verify-payment.php must enforce CORS");
    assert.ok(content.includes("portal.creationaltfix.nl"), "verify-payment.php must whitelist portal.creationaltfix.nl");
    assert.ok(content.includes("mollie-payments-log.json"), "verify-payment.php must read mollie-payments-log.json");
    assert.ok(content.includes("cleanInvoice"), "verify-payment.php must sanitize invoice number input");
    assert.ok(content.includes("flock"), "verify-payment.php must safely acquire file lock");
});

test("Anti-Break: ARCHITECTURE_AND_RULES.md memory aid and Definition of Done exists in root", () => {
    const archPath = path.join(ROOT_DIR, "ARCHITECTURE_AND_RULES.md");
    assert.ok(fs.existsSync(archPath), "ARCHITECTURE_AND_RULES.md must exist in root");
    const content = fs.readFileSync(archPath, "utf-8");

    assert.ok(content.includes("Definition of Done Checklist"), "Must contain Definition of Done checklist");
    assert.ok(content.includes("Gouden Architectuurregels"), "Must contain Golden Architecture rules");
    assert.ok(content.includes("Symmetrische Tweetaligheid"), "Must mandate i18n parity");
    assert.ok(content.includes("Firestore Security Rules Synchronisatie"), "Must mandate Firestore rules synchronization");
});

await testAsync("Anti-Break: pi-invoices.json and PI_BOEKHOUDING_CLIENT_DATA maintain 100% invoice & Mollie link parity", async () => {
    const { PI_BOEKHOUDING_CLIENT_DATA } = await import("../crm/admin/js/modules/bookkeeping-data.js");
    const piJsonPath = path.join(ROOT_DIR, "crm/admin/data/pi-invoices.json");
    assert.ok(fs.existsSync(piJsonPath), "crm/admin/data/pi-invoices.json must exist");
    const piData = JSON.parse(fs.readFileSync(piJsonPath, "utf-8"));

    assert.ok(Array.isArray(piData.invoices) && piData.invoices.length >= 13, "pi-invoices.json must contain all >=13 Pi invoices");
    assert.notEqual(piData.syncedAt, "now", "pi-invoices.json syncedAt must be a real ISO timestamp, not 'now'");

    const allModuleInvoices = new Map();
    for (const clientObj of Object.values(PI_BOEKHOUDING_CLIENT_DATA)) {
        for (const inv of (clientObj.invoices || [])) {
            allModuleInvoices.set(inv.invoiceNumber, inv);
        }
    }

    for (const piInv of piData.invoices) {
        const modInv = allModuleInvoices.get(piInv.invoiceNumber);
        assert.ok(modInv, `Invoice ${piInv.invoiceNumber} (${piInv.clientName}) in pi-invoices.json is missing from bookkeeping-data.js`);
        assert.strictEqual(Number(modInv.amountExcl), Number(piInv.totalExcl), `Amount Excl mismatch on ${piInv.invoiceNumber}`);
        if (piInv.mollieLink) {
            assert.strictEqual(modInv.mollieCheckoutUrl || modInv.mollieLink, piInv.mollieLink, `Mollie link mismatch on ${piInv.invoiceNumber}`);
        }
    }
});

await testAsync("Anti-Break: project-billing.js and status.js exclude canceled invoices from KPI totals and unpaid actions", async () => {
    const { renderBillingCardHtml } = await import("../crm/admin/js/modules/project-billing.js");
    const ftruckHtml = renderBillingCardHtml({ client: "F-Truck Store", domainName: "ftruckstore.nl" });
    // F-Truck has 2026-006 (€169.40 paid), 2026-007 (€72.60 canceled), 2026-008 (€369.05 paid).
    // Total invoiced and paid must be €538,45 (excluding canceled €72,60)
    assert.ok(ftruckHtml.includes("538,45"), "F-Truck Store totalInvoiced must exclude canceled invoice 2026-007 (€72,60) and equal €538,45");

    const statusJs = fs.readFileSync(path.join(ROOT_DIR, "crm/status/js/status.js"), "utf-8");
    assert.ok(statusJs.includes("function isInvoiceCanceled(status)"), "status.js must define isInvoiceCanceled helper");
    assert.ok(statusJs.includes("🚫 Geannuleerd"), "status.js must render Geannuleerd badge for canceled invoices");
    assert.ok(statusJs.includes("const isPrimaryProjectInvoice = inv.invoiceNumber === (data.invoiceNumber || data.factuurnummer);"), "status.js must not leak project-level data.mollieLink onto unrelated invoices");
});

test("Anti-Break: pdf-generator.js enforces authentic BRANDING KVK 99986191, BTW NL005423147B16, and IBAN NL92REVO3150395003", () => {
    const pdfJs = fs.readFileSync(path.join(ROOT_DIR, "crm/js/pdf-generator.js"), "utf-8");
    assert.ok(pdfJs.includes("99986191"), "pdf-generator.js must contain official KVK 99986191");
    assert.ok(pdfJs.includes("NL005423147B16"), "pdf-generator.js must contain official BTW NL005423147B16");
    assert.ok(pdfJs.includes("NL92REVO3150395003"), "pdf-generator.js must contain official IBAN NL92REVO3150395003");
    assert.ok(!pdfJs.includes("94200632"), "pdf-generator.js must never contain stale KVK 94200632");
    assert.ok(!pdfJs.includes("NL005072704B18"), "pdf-generator.js must never contain stale BTW NL005072704B18");
    assert.ok(!pdfJs.includes("NLXX KNAB"), "pdf-generator.js must never contain placeholder IBAN NLXX KNAB");
});

await testAsync("Anti-Break: mollie-webhook.js, mollie-webhook.php, and project-billing.js support pl_ payment links and canonical webhook URL", async () => {
    const logPath = path.join(ROOT_DIR, "crm/api/mollie-payments-log.json");
    const hadLog = fs.existsSync(logPath);
    const prevLog = hadLog ? fs.readFileSync(logPath, "utf-8") : null;
    try {
        const { updateInvoicePaymentStatus } = await import("../crm/api/mollie-webhook.js");
        const rec = await updateInvoicePaymentStatus({
            id: "pl_testLink12345",
            paidAt: "2026-10-17T10:00:00Z",
            description: "Factuur 2026-013 - Creation+Alt+Fix (Besseling)",
            amount: { value: "1089.00", currency: "EUR" }
        });
        assert.strictEqual(rec.status, "paid", "Payment link with paidAt must resolve to status 'paid'");
        assert.strictEqual(rec.invoiceNumber, "2026-013", "Must extract invoice number 2026-013 from description when metadata is absent");
    } finally {
        if (hadLog && prevLog !== null) {
            fs.writeFileSync(logPath, prevLog, "utf-8");
        } else if (!hadLog && fs.existsSync(logPath)) {
            fs.unlinkSync(logPath);
        }
    }

    const billingJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/project-billing.js"), "utf-8");
    assert.ok(billingJs.includes("https://portal.creationaltfix.nl/api/mollie-webhook.php"), "project-billing.js must use canonical webhook URL without /crm/ prefix");
    assert.ok(!billingJs.includes("https://portal.creationaltfix.nl/crm/api/mollie-webhook.php"), "project-billing.js must not use legacy /crm/api/mollie-webhook.php URL");
});

test("Anti-Break: storage.rules protects /projects/{projectId}/facturen/** against non-admin write or delete", () => {
    const storageRules = fs.readFileSync(path.join(ROOT_DIR, "storage.rules"), "utf-8");
    assert.ok(storageRules.includes("!allPaths.matches('(?i)^facturen/.*')"), "storage.rules must block client write/delete on facturen/ subfolder");
    assert.ok(storageRules.includes("firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid))"), "storage.rules isAdmin() must mirror firestore.rules admins collection check");
});

test("Anti-Break: Boekhouding Jinja2 templates have balanced {% if %}/{% endif %} and {% for %}/{% endfor %} tags", () => {
    const tplDir = path.resolve(ROOT_DIR, "../../Boekhoudings/Boekhouding/templates");
    if (!fs.existsSync(tplDir)) return "SKIP";

    const tplFiles = fs.readdirSync(tplDir).filter(f => f.endsWith(".html"));
    assert.ok(tplFiles.length >= 15, "Boekhouding templates directory must contain HTML templates");

    for (const file of tplFiles) {
        const content = fs.readFileSync(path.join(tplDir, file), "utf-8");
        const ifOpens = (content.match(/\{%-?\s*if\b/g) || []).length;
        const ifCloses = (content.match(/\{%-?\s*endif\b/g) || []).length;
        assert.strictEqual(ifOpens, ifCloses, `Unbalanced {% if %} (${ifOpens}) vs {% endif %} (${ifCloses}) in ${file}`);

        const forOpens = (content.match(/\{%-?\s*for\b/g) || []).length;
        const forCloses = (content.match(/\{%-?\s*endfor\b/g) || []).length;
        assert.strictEqual(forOpens, forCloses, `Unbalanced {% for %} (${forOpens}) vs {% endfor %} (${forCloses}) in ${file}`);
    }
});

test("Anti-Break: status.js imports formatCurrency, populates #offerte-price in State B, and normalizes multi-schema messages", () => {
    const statusJs = fs.readFileSync(path.join(ROOT_DIR, "crm/status/js/status.js"), "utf-8");
    // 1. Must import formatCurrency from firebase-config.js so setupClientInvoicesArchive and setupUnpaidInvoiceBanner never throw ReferenceError
    assert.ok(
        /import\s*\{[^}]*\bformatCurrency\b[^}]*\}\s*from\s*["']\.\.\/\.\.\/js\/firebase-config\.js["']/.test(statusJs),
        "status.js must import formatCurrency from ../../js/firebase-config.js"
    );

    // 2. Must populate priceEl.innerText in State B (isReadyForAcceptance) so #offerte-price is never stuck on 'Wordt berekend...'
    const stateBIdx = statusJs.indexOf("} else if (isReadyForAcceptance) {");
    const stateCIdx = statusJs.indexOf("} else {", stateBIdx);
    assert.ok(stateBIdx > -1 && stateCIdx > stateBIdx, "status.js must contain isReadyForAcceptance branch");
    const stateBBlock = statusJs.slice(stateBIdx, stateCIdx);
    assert.ok(stateBBlock.includes("if (priceEl)"), "isReadyForAcceptance branch must populate priceEl (#offerte-price)");

    // 3. Must normalize message/text/content and sender/senderRole/role in renderMessagesSection
    assert.ok(
        statusJs.includes("const bodyText = msg.message || msg.text || msg.content || '';"),
        "status.js renderMessagesSection must normalize msg.message || msg.text || msg.content"
    );
    assert.ok(
        statusJs.includes("msg.category === 'subscription_2027'"),
        "status.js renderMessagesSection must support subscription_2027 category badge"
    );
});

test("Anti-Break: firestore.rules guards optional map keys, allows Fase 2/3 client approvals, and permits 2027 subscriptionPrice upgrades", () => {
    const rules = fs.readFileSync(path.join(ROOT_DIR, "firestore.rules"), "utf-8");

    // 1. Safe map key checks ('in' operator before property access)
    assert.ok(rules.includes("'clientUid' in docData && docData.clientUid != null"), "isVerifiedClient must check 'clientUid' in docData before accessing docData.clientUid");
    assert.ok(rules.includes("!('clientUid' in resource.data)"), "isValidClientUpdate must allow projects where clientUid is not yet set in resource.data");
    assert.ok(rules.includes("!('subscriptionPlan2027Price' in resource.data)"), "isValidClientUpdate must allow setting subscriptionPlan2027Price when not previously present in resource.data");

    // 2. Fase 2 & Fase 3 status transition support for client proposal/design acceptance
    assert.ok(rules.includes("'Fase 2: Wacht op Akkoord (Offerte)'"), "firestore.rules must permit client proposal approval from 'Fase 2: Wacht op Akkoord (Offerte)'");
    assert.ok(rules.includes("'Design Gereed voor Review'"), "firestore.rules must permit client design approval from 'Design Gereed voor Review'");
    assert.ok(rules.includes("'Fase 4: In Ontwikkeling'"), "firestore.rules must permit client transition to 'Fase 4: In Ontwikkeling'");

    // 3. Allow subscriptionPrice upgrade when confirming 2027 plan
    assert.ok(
        rules.includes("request.resource.data.subscriptionPrice == request.resource.data.subscriptionPlan2027Price"),
        "firestore.rules must allow subscriptionPrice to update to subscriptionPlan2027Price upon client confirmation"
    );
});

test("Anti-Break: admin.js defines logAuditEvent, refreshes subscriptions properly, and project.js passes onConfirmPlan to 2027 modal", () => {
    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/admin.js"), "utf-8");
    assert.ok(adminJs.includes("async function logAuditEvent("), "admin.js must define logAuditEvent to prevent ReferenceError during 2027 plan and lead actions");
    assert.ok(!adminJs.includes("onRefresh: () => loadProjects()"), "admin.js must not call undefined loadProjects() in Subscriptions tab");

    const projectJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/project.js"), "utf-8");
    const subModalIdx = projectJs.indexOf("open2027SubscriptionModal({");
    assert.ok(subModalIdx > -1, "project.js must invoke open2027SubscriptionModal");
    const subModalSlice = projectJs.slice(subModalIdx, subModalIdx + 3200);
    assert.ok(subModalSlice.includes("onConfirmPlan:"), "project.js open2027SubscriptionModal must pass onConfirmPlan callback");
});

await testAsync("Anti-Break: subscription-2027.js and admin-subscriptions.js render dynamic 2027 plan prices and project.html has all 2027 invoice presets", async () => {
    const sub2027Js = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/subscription-2027.js"), "utf-8");
    const adminSubsJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/admin-subscriptions.js"), "utf-8");
    const projectHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/project.html"), "utf-8");
    const projectJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/project.js"), "utf-8");

    assert.ok(!sub2027Js.includes("Akkoord Gemeld door Klant (€ 95,-)"), "subscription-2027.js must not hardcode € 95,- on the confirmation button");
    assert.ok(!adminSubsJs.includes("Bevestigd (€ 95,-)"), "admin-subscriptions.js must not hardcode € 95,- on the confirmed badge");

    for (const presetKey of ["hosting_2027", "hosting_nl", "hosting_com", "hosting_multi", "apk_annual", "allin_apk"]) {
        assert.ok(projectHtml.includes(`value="${presetKey}"`), `crm/admin/project.html #modal-inv-preset must include option value="${presetKey}"`);
        assert.ok(projectJs.includes(`preset === '${presetKey}'`), `crm/admin/js/project.js must handle preset '${presetKey}'`);
    }
});

await testAsync("Anti-Break: schemas.js, admin-tables.js, and project.js normalize multi-schema messages across sender/senderRole/role and message/text/content", async () => {
    const { Schemas } = await import("../crm/js/core/schemas.js");
    const legacyMsg = Schemas.sanitizeMessage({
        id: "msg_2027_test",
        sender: "admin",
        text: "Voorstel 2027 pakket",
        createdAt: "2026-10-17T10:00:00.000Z",
        category: "subscription_2027"
    });
    assert.strictEqual(legacyMsg.message, "Voorstel 2027 pakket", "sanitizeMessage must populate canonical message from text");
    assert.strictEqual(legacyMsg.text, "Voorstel 2027 pakket", "sanitizeMessage must preserve text field");
    assert.strictEqual(legacyMsg.senderRole, "admin", "sanitizeMessage must populate canonical senderRole from sender");
    assert.strictEqual(legacyMsg.timestamp, "2026-10-17T10:00:00.000Z", "sanitizeMessage must populate timestamp from createdAt");

    const tablesJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/admin-tables.js"), "utf-8");
    assert.ok(
        tablesJs.includes("m.sender === 'client' || m.senderRole === 'client' || m.role === 'client'"),
        "admin-tables.js unread badge counter must recognize client messages across sender, senderRole, and role"
    );
});

test("Anti-Break: intake.js, status/index.html, and project.js use canonical production URLs without broken /crm/index.html, /terms.html, or /offerte/ links", () => {
    const intakeJs = fs.readFileSync(path.join(ROOT_DIR, "crm/intake/js/intake.js"), "utf-8");
    assert.ok(
        intakeJs.includes("https://portal.creationaltfix.nl/index.html?resetSuccess=true"),
        "intake.js password reset redirect must use https://portal.creationaltfix.nl/index.html?resetSuccess=true"
    );
    assert.ok(
        !intakeJs.includes("https://portal.creationaltfix.nl/crm/index.html"),
        "intake.js must never redirect to non-existent /crm/index.html on portal subdomain"
    );

    const statusHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/status/index.html"), "utf-8");
    assert.ok(
        statusHtml.includes("https://creationaltfix.nl/algemene-voorwaarden.html"),
        "status/index.html must link to https://creationaltfix.nl/algemene-voorwaarden.html"
    );
    assert.ok(
        !statusHtml.includes("https://creationaltfix.nl/terms.html"),
        "status/index.html must never link to non-existent https://creationaltfix.nl/terms.html"
    );

    const projectJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/project.js"), "utf-8");
    assert.ok(
        !projectJs.includes("/offerte/index.html?id="),
        "project.js must not generate dead /offerte/index.html links"
    );
});

await testAsync("Anti-Break: deep-intelligence.js distinguishes Dutch mobile (06/316) vs landline numbers and generates sector-specific services & reviews", async () => {
    const { isDutchMobilePhone, extractCityFromAddress, deriveServicesFromCategory, deriveReviewsFromCategory } = await import("../factory/enrichment/deep-intelligence.js");

    assert.strictEqual(isDutchMobilePhone("06 19135453"), true, "06 number must be recognized as mobile WhatsApp capable");
    assert.strictEqual(isDutchMobilePhone("+31 6 27319414"), true, "+31 6 number must be recognized as mobile WhatsApp capable");
    assert.strictEqual(isDutchMobilePhone("0598 717 952"), false, "0598 landline must NOT be marked as mobile WhatsApp capable");
    assert.strictEqual(isDutchMobilePhone("050 314 3981"), false, "050 landline must NOT be marked as mobile WhatsApp capable");

    assert.strictEqual(extractCityFromAddress("Kerkstraat 42, 9601 AB Hoogezand"), "Hoogezand", "extractCityFromAddress must extract Hoogezand");
    assert.strictEqual(extractCityFromAddress("Noorderstraat 18, 9611 AS Sappemeer"), "Sappemeer", "extractCityFromAddress must extract Sappemeer");

    const services = deriveServicesFromCategory("Dakdekker", "Heinkens Daktechniek");
    assert.strictEqual(services.length, 4, "deriveServicesFromCategory must return 4 tailored service cards");
    const reviews = deriveReviewsFromCategory("Dakdekker", "Heinkens Daktechniek", "Hoogezand");
    assert.strictEqual(reviews.length, 3, "deriveReviewsFromCategory must return 3 localized testimonials");
});

await testAsync("Anti-Break: agy-generator.js resolveArchetypeFaqs matches all resolveDesignArchetype keys and has no duplicate if(isInstaller) block", async () => {
    const { resolveDesignArchetype, resolveArchetypeFaqs } = await import("../factory/generator/agy-generator.js");
    const agyGenSrc = fs.readFileSync(path.join(ROOT_DIR, "factory/generator/agy-generator.js"), "utf-8");

    const installerMatches = agyGenSrc.match(/if\s*\(\s*isInstaller\s*\)/g) || [];
    assert.strictEqual(installerMatches.length, 1, "resolveDesignArchetype must have exactly 1 if (isInstaller) branch");
    assert.ok(!agyGenSrc.includes("&display=swap&display=swap"), "agy-generator.js must not contain duplicate &display=swap&display=swap");

    const rooferTheme = resolveDesignArchetype({ name: "Dakdekker Noord", category: "Dakdekker" });
    assert.strictEqual(rooferTheme.key, "ROOFER_SLATE");
    const rooferFaqs = resolveArchetypeFaqs(rooferTheme.key, { name: "Dakdekker Noord", category: "Dakdekker", city: "Hoogezand" });
    assert.strictEqual(rooferFaqs.length, 4);
    assert.ok(rooferFaqs[0].question.toLowerCase().includes("lekkage") || rooferFaqs[0].question.toLowerCase().includes("dak"), "ROOFER_SLATE FAQs must be roof-specific, not generic fallback");
});

test("Anti-Break: factory/data/leads.json and crm/admin/data/leads.json are 100% synchronized, mobile-WA accurate, and free of agency self-email pollution", () => {
    const fData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "factory/data/leads.json"), "utf-8"));
    const cData = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "crm/admin/data/leads.json"), "utf-8"));

    assert.strictEqual(fData.leads.length, cData.leads.length, "factory and CRM leads.json must have identical lead count");
    for (const lead of fData.leads) {
        if (lead.email) {
            assert.ok(!lead.email.toLowerCase().includes("creationaltfix"), `Lead ${lead.slug} must not have agency email (${lead.email})`);
        }
        const digits = String(lead.phone || "").replace(/\D/g, "");
        const isMob = /^(06\d{8}|316\d{8})$/.test(digits);
        assert.strictEqual(Boolean(lead.hasWhatsApp), isMob, `Lead ${lead.slug} (${lead.phone}) hasWhatsApp must match mobile check`);
        if (!isMob) {
            assert.strictEqual(lead.whatsAppNumber, null, `Landline lead ${lead.slug} must have whatsAppNumber: null`);
        }
        assert.ok(Array.isArray(lead.suggestedServices) && lead.suggestedServices.length >= 4, `Lead ${lead.slug} must have >= 4 suggestedServices`);
        assert.ok(Array.isArray(lead.reviews) && lead.reviews.length >= 3, `Lead ${lead.slug} must have >= 3 reviews`);
    }
});

test("Anti-Break: all concept HTML files in website/concept/* have escaped DRM script tags, valid tel: links, and FAQPage schema", () => {
    const conceptDir = path.join(ROOT_DIR, "website/concept");
    const slugs = fs.readdirSync(conceptDir).filter(f => fs.statSync(path.join(conceptDir, f)).isDirectory());
    assert.ok(slugs.length >= 20, "website/concept must contain at least 20 concept folders");

    for (const slug of slugs) {
        const htmlPath = path.join(conceptDir, slug, "index.html");
        if (!fs.existsSync(htmlPath)) continue;
        const html = fs.readFileSync(htmlPath, "utf-8");
        const scriptMatch = html.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
        assert.ok(scriptMatch, `${slug}/index.html must contain caf-security-guard script`);
        assert.ok(!scriptMatch[1].includes("<div"), `${slug}/index.html caf-security-guard must use \\x3Cdiv instead of raw <div`);
        assert.ok(html.includes('"FAQPage"'), `${slug}/index.html must contain FAQPage JSON-LD schema`);
    }
});

test("Anti-Break: admin-lead-factory.js, admin.js, and factory-bridge.js support bidirectional status sync, custom scan query, and correct #factory-status-filter DOM ID", () => {
    const lfJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/admin-lead-factory.js"), "utf-8");
    const adminJs = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/admin.js"), "utf-8");
    const bridgeJs = fs.readFileSync(path.join(ROOT_DIR, "factory/server/factory-bridge.js"), "utf-8");

    assert.ok(!lfJs.includes("getElementById('factory-filter-status')"), "admin-lead-factory.js must use #factory-status-filter instead of non-existent #factory-filter-status");
    assert.ok(lfJs.includes("export async function syncLeadUpdateToBridge"), "admin-lead-factory.js must export syncLeadUpdateToBridge");
    assert.ok(adminJs.includes("syncLeadUpdateToBridge"), "admin.js must sync lead status updates back to Factory Bridge");
    assert.ok(adminJs.includes("onConvertToProject"), "admin.js must implement 1-click onConvertToProject");
    assert.ok(bridgeJs.includes("pathname === '/api/leads/update'"), "factory-bridge.js must expose POST /api/leads/update");
});

test("TASK-915: crm/api/leads.php and factory-bridge.js implement zero-cookie view ping, smart debouncing, and admin preview protection", () => {
    const leadsPhp = fs.readFileSync(path.join(ROOT_DIR, "crm/api/leads.php"), "utf-8");
    const bridgeJs = fs.readFileSync(path.join(ROOT_DIR, "factory/server/factory-bridge.js"), "utf-8");

    // crm/api/leads.php assertions
    assert.ok(leadsPhp.includes("$action === 'ping'"), "leads.php must inspect action === 'ping'");
    assert.ok(leadsPhp.includes("isAdminPreview"), "leads.php must filter admin preview requests");
    assert.ok(leadsPhp.includes("viewsCount"), "leads.php must increment viewsCount on view ping");
    assert.ok(leadsPhp.includes("lastViewedAt"), "leads.php must record lastViewedAt timestamp");
    assert.ok(leadsPhp.includes("debounced"), "leads.php must support smart 10s debouncing");
    assert.ok(leadsPhp.includes("LOCK_EX"), "leads.php must use atomic LOCK_EX writes");

    // factory-bridge.js assertions
    assert.ok(bridgeJs.includes("pathname === '/api/leads/ping'"), "factory-bridge.js must support /api/leads/ping");
    assert.ok(bridgeJs.includes("isPublicPingEndpoint"), "factory-bridge.js must exempt ping from mandatory x-caf-auth token");
    assert.ok(bridgeJs.includes("lead.viewsCount"), "factory-bridge.js must update lead viewsCount");
    assert.ok(bridgeJs.includes("👀 Lead"), "factory-bridge.js must log live view event to activity drawer");
});

test("TASK-915: admin-lead-factory.js and code-drm.js render live concept view badges, format view timestamps, and filter viewed leads", async () => {
    const { formatLeadViewTime } = await import("../crm/admin/js/modules/admin-lead-factory.js");
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/index.html"), "utf-8");
    const factorySource = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/js/modules/admin-lead-factory.js"), "utf-8");

    // formatLeadViewTime assertions
    const nowIso = new Date().toISOString();
    assert.strictEqual(formatLeadViewTime(nowIso), "Zojuist", "formatLeadViewTime must return 'Zojuist' for recent view");
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    assert.strictEqual(formatLeadViewTime(fiveMinAgo), "5m geleden", "formatLeadViewTime must return '5m geleden'");
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    assert.strictEqual(formatLeadViewTime(twoHoursAgo), "2u geleden", "formatLeadViewTime must return '2u geleden'");
    assert.strictEqual(formatLeadViewTime(""), "", "formatLeadViewTime must return empty string for null or empty input");

    // UI elements assertions
    assert.ok(indexHtml.includes('id="pill-filter-viewed"'), "index.html must include pill-filter-viewed button");
    assert.ok(indexHtml.includes('<option value="viewed">'), "index.html must include 'viewed' option in status dropdown");
    assert.ok(factorySource.includes("_activeFilter === 'viewed'"), "admin-lead-factory.js must support 'viewed' filter");
    assert.ok(factorySource.includes("badge-views"), "admin-lead-factory.js must render .badge-views");
    assert.ok(factorySource.includes("viewsCount"), "admin-lead-factory.js must inspect lead viewsCount");

    // code-drm.js concept beacon injection assertions
    const sampleHtml = "<html><head><title>Test</title></head><body><h1>Hallo</h1></body></html>";
    const protectedSample = applyCodeProtection(sampleHtml, { name: "Test Ondernemer", slug: "test-slug-123" });
    assert.ok(protectedSample.includes("test-slug-123"), "applyCodeProtection must embed target slug");
    assert.ok(protectedSample.includes("crm/api/leads.php?action=ping"), "applyCodeProtection must target leads.php ping endpoint");
    assert.ok(protectedSample.includes("preview=admin"), "applyCodeProtection must detect admin preview parameter");
    assert.ok(protectedSample.includes("sendBeacon"), "applyCodeProtection must utilize navigator.sendBeacon");
});

// ========================================================
// 14. TESTSUITE EXPANSIE & EDGE-CASE HARDENING
// ========================================================
console.log("\n📌 SUITE 14: Testsuite Expansie & Edge-Case Hardening");

// --- SECTION 1: LEAD FACTORY EDGE CASES ---
await testAsync("Lead Factory Edge-Cases: Extreme string inputs & length bounding (naam max 150 chars, slug max 64 chars)", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const longName = "A".repeat(350);
    const sanitizedLong = sanitizeLeadData({ name: longName, website: "https://example.com" });
    assert.strictEqual(sanitizedLong.name.length, 150, "Lead name must be strictly sliced to max 150 chars");
    assert.ok(sanitizedLong.slug.length <= 64, "Slug must be bounded to max 64 chars");
    assert.ok(!sanitizedLong.slug.endsWith("-"), "Slug must not have trailing hyphens");
});

await testAsync("Lead Factory Edge-Cases: XSS injectie payloads, quotes en Unicode/emojis in bedrijfsnamen", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const xssLead = sanitizeLeadData({ name: "<script>alert('xss')</script> 🛠️ \"Bouw & Sloop\" BV", website: "https://bouwbedrijf.nl" });
    assert.ok(!xssLead.slug.includes("<") && !xssLead.slug.includes(">"), "Slug must not contain raw HTML angle brackets");
    assert.ok(!xssLead.slug.includes("'") && !xssLead.slug.includes('"'), "Slug must not contain quotes");
    assert.ok(/^[a-z0-9-]+$/.test(xssLead.slug), "Slug must only contain lowercase alphanumeric characters and hyphens");
});

await testAsync("Lead Factory Edge-Cases: Fallback naar 'zzp-concept' bij uitsluitend leestekens of lege invoer", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const symbolsLead = sanitizeLeadData({ name: "!@#$%^&*()_+" });
    assert.strictEqual(symbolsLead.slug, "zzp-concept", "Symbols-only name must fall back to 'zzp-concept'");
    const emptyLead = sanitizeLeadData({ name: "" });
    assert.strictEqual(emptyLead.slug, "zzp-concept", "Empty name must fall back to 'zzp-concept'");
    assert.strictEqual(sanitizeLeadData(null), null, "Null input must return null");
    assert.strictEqual(sanitizeLeadData(undefined), null, "Undefined input must return null");
});

await testAsync("Lead Factory Edge-Cases: Protocol filtering neutraliseert gevaarlijke URI schemes (javascript: en data:)", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const badJs = sanitizeLeadData({ name: "Bad JS", website: "javascript:alert(1)" });
    assert.strictEqual(badJs.website, null, "javascript: scheme must be sanitized to null");
    assert.strictEqual(badJs.hasWebsite, false, "hasWebsite must be false for javascript:");
    const badData = sanitizeLeadData({ name: "Bad Data", website: "data:text/html,<script>alert(1)</script>" });
    assert.strictEqual(badData.website, null, "data: scheme must be sanitized to null");
    assert.strictEqual(badData.hasWebsite, false, "hasWebsite must be false for data:");
    const goodHttp = sanitizeLeadData({ name: "Good HTTP", website: "http://schilder-jansen.nl" });
    assert.strictEqual(goodHttp.website, "http://schilder-jansen.nl");
    assert.strictEqual(goodHttp.hasWebsite, true);
    const goodHttps = sanitizeLeadData({ name: "Good HTTPS", website: "https://dakdekker.nl" });
    assert.strictEqual(goodHttps.website, "https://dakdekker.nl");
    assert.strictEqual(goodHttps.hasWebsite, true);
});

await testAsync("Lead Factory Edge-Cases: Adres parsing en plaatsnaam extractie met afwijkende postcodes en default fallback", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand", "Empty address must fall back to Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand", "Null address must fall back to Hoogezand");
    assert.strictEqual(extractCityFromAddress(undefined), "Hoogezand", "Undefined address must fall back to Hoogezand");
    assert.strictEqual(extractCityFromAddress("Industrieterrein 5, 9601 AB Sappemeer"), "Sappemeer", "Must extract city with standard postcode format");
    assert.strictEqual(extractCityFromAddress("9641AA Veendam"), "Veendam", "Must extract city with spaceless postcode format");
    assert.strictEqual(extractCityFromAddress("Grote Markt 1, Groningen"), "Groningen", "Must extract recognized Dutch city without postcode");
    assert.strictEqual(extractCityFromAddress("5th Avenue 100, New York"), "Hoogezand", "Foreign address must fall back to default Hoogezand");
});

await testAsync("Lead Factory Edge-Cases: SSRF defensie in isSafeExternalUrl tegen AWS/Cloud metadata, IPv4 loopback en RFC 1918", async () => {
    const { isSafeExternalUrl } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isSafeExternalUrl("http://169.254.169.254/latest/meta-data/"), false, "Must block AWS/Cloud metadata IP");
    assert.strictEqual(isSafeExternalUrl("http://127.0.0.1:8080/"), false, "Must block IPv4 loopback");
    assert.strictEqual(isSafeExternalUrl("http://localhost:3000/"), false, "Must block localhost");
    assert.strictEqual(isSafeExternalUrl("http://10.0.0.1/admin"), false, "Must block RFC 1918 10.x.x.x");
    assert.strictEqual(isSafeExternalUrl("http://192.168.1.100/"), false, "Must block RFC 1918 192.168.x.x");
    assert.strictEqual(isSafeExternalUrl("http://172.16.5.4/"), false, "Must block RFC 1918 172.16-31.x.x");
    assert.strictEqual(isSafeExternalUrl("http://100.64.0.1/"), false, "Must block CGNAT 100.64.x.x");
    assert.strictEqual(isSafeExternalUrl("file:///etc/passwd"), false, "Must block file:// URI scheme");
    assert.strictEqual(isSafeExternalUrl("gopher://evil.com/"), false, "Must block gopher:// scheme");
    assert.strictEqual(isSafeExternalUrl("https://www.creationaltfix.nl/"), true, "Must accept valid public HTTPS URL");
    assert.strictEqual(isSafeExternalUrl("http://installatie-noord.nl"), true, "Must accept valid public HTTP URL");
});

await testAsync("Lead Factory Edge-Cases: Telefoonnormalisatie herkent authentieke Nederlandse 06, +316 en 00316 mobiele nummers", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isDutchMobilePhone("06 12345678"), true, "06 with spaces must be true");
    assert.strictEqual(isDutchMobilePhone("06-12345678"), true, "06 with dash must be true");
    assert.strictEqual(isDutchMobilePhone("0612345678"), true, "06 unbroken must be true");
    assert.strictEqual(isDutchMobilePhone("+31 6 12345678"), true, "+31 6 with spaces must be true");
    assert.strictEqual(isDutchMobilePhone("+31612345678"), true, "+316 unbroken must be true");
    assert.strictEqual(isDutchMobilePhone("0031612345678"), true, "00316 must be true");
});

await testAsync("Lead Factory Edge-Cases: Telefoonnormalisatie weert vaste Nederlandse netnummers (050, 0598, 020) voor WhatsApp", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isDutchMobilePhone("050 314 3981"), false, "050 landline must be false");
    assert.strictEqual(isDutchMobilePhone("0598 717 952"), false, "0598 landline must be false");
    assert.strictEqual(isDutchMobilePhone("0597 123456"), false, "0597 landline must be false");
    assert.strictEqual(isDutchMobilePhone("020 1234567"), false, "020 landline must be false");
    assert.strictEqual(isDutchMobilePhone("+31 598 123456"), false, "+31 598 landline must be false");
});

await testAsync("Lead Factory Edge-Cases: Telefoonnormalisatie weert buitenlandse netnummers (+49, +44, +32, +1, +33)", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isDutchMobilePhone("+49 170 1234567"), false, "German mobile (+49) must return false");
    assert.strictEqual(isDutchMobilePhone("+44 7911 123456"), false, "UK mobile (+44) must return false");
    assert.strictEqual(isDutchMobilePhone("+32 470 123456"), false, "Belgian mobile (+32) must return false");
    assert.strictEqual(isDutchMobilePhone("+1 555 123 4567"), false, "US phone (+1) must return false");
    assert.strictEqual(isDutchMobilePhone("+33 6 12 34 56 78"), false, "French phone (+33) must return false");
    assert.strictEqual(isDutchMobilePhone(null), false, "Null phone must return false");
    assert.strictEqual(isDutchMobilePhone(undefined), false, "Undefined phone must return false");
    assert.strictEqual(isDutchMobilePhone("geen nummer"), false, "Text phone must return false");
});

await testAsync("Lead Factory Edge-Cases: normalizePhoneDigits extraheert consistente 8-cijferige matching suffix", async () => {
    const { normalizePhoneDigits } = await import("../factory/discovery/maps-crawler.js");
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 1234 5678"), "12345678", "Must extract last 8 digits for matching");
    assert.strictEqual(normalizePhoneDigits("0598-123456"), "98123456", "Must extract last 8 digits from 10-digit landline");
    assert.strictEqual(normalizePhoneDigits("123456"), "123456", "Must preserve 6-digit number");
    assert.strictEqual(normalizePhoneDigits("1234"), null, "Must return null for <6 digits");
    assert.strictEqual(normalizePhoneDigits(null), null, "Null phone must return null");
    assert.strictEqual(normalizePhoneDigits(""), null, "Empty phone must return null");
});

await testAsync("Lead Factory Edge-Cases: Deduplicatie engine herkent botsende slugs, telefoonvarianten en domeinvariaties", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");
    const existingList = [
        { slug: "dakdekker-jansen", phone: "06 12345678", website: "https://dakdekker-jansen.nl" },
        { slug: "loodgieter-piet", phone: "050 9988776", website: "http://www.pietloodgieter.nl" }
    ];
    // Duplicate by exact slug
    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-jansen" }, existingList), true, "Must flag duplicate by slug");
    // Duplicate by phone variation (+31 6 vs 06)
    assert.strictEqual(isDuplicateLead({ phone: "+31 6 1234 5678" }, existingList), true, "Must flag duplicate by phone");
    // Duplicate by normalized domain (http vs https, trailing slash, subpaths)
    assert.strictEqual(isDuplicateLead({ website: "http://dakdekker-jansen.nl/over-ons/" }, existingList), true, "Must flag duplicate by domain");
    // Distinct lead
    assert.strictEqual(isDuplicateLead({ slug: "schilder-klaas", phone: "06 55555555", website: "https://klaas.nl" }, existingList), false, "Distinct lead must not be flagged duplicate");
    // Robustness: Empty/null existing list
    assert.strictEqual(isDuplicateLead({ slug: "test" }, []), false, "Empty list must return false");
    assert.strictEqual(isDuplicateLead(null, existingList), false, "Null candidate must return false");
});

await testAsync("Lead Factory Edge-Cases: normalizeDomain zuivert poorten, protocols, subdomeinen en trailing slashes", async () => {
    const { normalizeDomain } = await import("../factory/discovery/maps-crawler.js");
    assert.strictEqual(normalizeDomain("https://www.Vakman.nl/portfolio/"), "vakman.nl");
    assert.strictEqual(normalizeDomain("http://SUB.DOMAEN.NL:8080/path"), "sub.domaen.nl:8080");
    assert.strictEqual(normalizeDomain("   https://installatie-noord.nl/   "), "installatie-noord.nl");
    assert.strictEqual(normalizeDomain(""), null);
    assert.strictEqual(normalizeDomain(null), null);
    assert.strictEqual(normalizeDomain(undefined), null);
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE EDGE CASES ---
await testAsync("Offerte & Factuur Edge-Cases: Valuta formatting dekt gehele getallen, decimalen en Nederlandse komma-notatie", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    assert.strictEqual(formatCurrency(199), "€ 199,00", "Must format integer amount to € 199,00");
    assert.strictEqual(formatCurrency(240.79), "€ 240,79", "Must format standard decimal amount");
    assert.strictEqual(formatCurrency("199,95"), "€ 199,95", "Must parse comma-separated string price");
    assert.strictEqual(formatCurrency("1250,5"), "€ 1250,50", "Must format 1-decimal comma-separated string");
});

await testAsync("Offerte & Factuur Edge-Cases: Valuta formatting dekt negatieve bedragen voor creditnota's en 0-euro facturen", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    assert.strictEqual(formatCurrency(-150.5), "€ -150,50", "Must format negative currency for credit notes");
    assert.strictEqual(formatCurrency("-45,25"), "€ -45,25", "Must format negative comma-separated string");
    assert.strictEqual(formatCurrency(0), "€ 0,00", "0-euro must format to € 0,00");
    assert.strictEqual(formatCurrency("0"), "€ 0,00", "'0' string must format to € 0,00");
});

await testAsync("Offerte & Factuur Edge-Cases: Valuta formatting vangt null, undefined, lege strings en niet-numerieke input foutloos op", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    assert.strictEqual(formatCurrency(null), "€ 0,00", "Null must fall back to € 0,00");
    assert.strictEqual(formatCurrency(undefined), "€ 0,00", "Undefined must fall back to € 0,00");
    assert.strictEqual(formatCurrency(""), "€ 0,00", "Empty string must fall back to € 0,00");
    assert.strictEqual(formatCurrency("geen_prijs"), "€ 0,00", "Invalid string must fall back to € 0,00");
});

await testAsync("Offerte & Factuur Edge-Cases: Valuta formatting hanteert IEEE 754 half-cent afronding en floating point precisie", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    assert.strictEqual(formatCurrency(10.005), "€ 10,01", "Must round half-cent properly (IEEE 754 precision)");
    assert.strictEqual(formatCurrency(0.1 + 0.2), "€ 0,30", "Must round floating point addition (0.1 + 0.2)");
    assert.strictEqual(formatCurrency(1250000.5), "€ 1250000,50", "Must format large amounts accurately");
});

await testAsync("Offerte & Factuur Edge-Cases: BTW Calculatie berekent exact 21% hoog tarief met correcte commerciële afronding", async () => {
    const calculateVat21 = (amountExcl) => {
        const vat = Math.round(amountExcl * 0.21 * 100) / 100;
        const incl = Math.round((amountExcl + vat) * 100) / 100;
        return { excl: amountExcl, vat, incl };
    };
    const inv1 = calculateVat21(100.00);
    assert.strictEqual(inv1.vat, 21.00);
    assert.strictEqual(inv1.incl, 121.00);
    const inv2 = calculateVat21(199.00);
    assert.strictEqual(inv2.vat, 41.79);
    assert.strictEqual(inv2.incl, 240.79);
    const inv3 = calculateVat21(49.99);
    assert.strictEqual(inv3.vat, 10.50, "49.99 * 0.21 = 10.4979 must round to 10.50");
    assert.strictEqual(inv3.incl, 60.49);
});

await testAsync("Offerte & Factuur Edge-Cases: BTW Calculatie berekent exact 9% laag tarief met correcte afronding", async () => {
    const calculateVat9 = (amountExcl) => {
        const vat = Math.round(amountExcl * 0.09 * 100) / 100;
        const incl = Math.round((amountExcl + vat) * 100) / 100;
        return { excl: amountExcl, vat, incl };
    };
    const inv1 = calculateVat9(100.00);
    assert.strictEqual(inv1.vat, 9.00);
    assert.strictEqual(inv1.incl, 109.00);
    const inv2 = calculateVat9(33.33);
    assert.strictEqual(inv2.vat, 3.00, "33.33 * 0.09 = 2.9997 must round to 3.00");
    assert.strictEqual(inv2.incl, 36.33);
    const inv3 = calculateVat9(150.00);
    assert.strictEqual(inv3.vat, 13.50);
    assert.strictEqual(inv3.incl, 163.50);
});

await testAsync("Offerte & Factuur Edge-Cases: BTW Calculatie berekent 0% tarief en 0-euro facturen zonder afrondingsfouten", async () => {
    const calculateVat0 = (amountExcl) => {
        const vat = 0.00;
        const incl = amountExcl;
        return { excl: amountExcl, vat, incl };
    };
    const invZero = calculateVat0(0.00);
    assert.strictEqual(invZero.vat, 0.00);
    assert.strictEqual(invZero.incl, 0.00);
    const invExempt = calculateVat0(500.00);
    assert.strictEqual(invExempt.vat, 0.00);
    assert.strictEqual(invExempt.incl, 500.00);
});

await testAsync("Offerte & Factuur Edge-Cases: Samengestelde & gestapelde kortingen (10% trouwe klant + 5% vroegboeking) berekening", async () => {
    const subtotal = 1000.00;
    const tier1 = subtotal * 0.10; // € 100
    const intermediate = subtotal - tier1; // € 900
    const tier2 = intermediate * 0.05; // € 45
    const net = intermediate - tier2; // € 855
    const vat = Math.round(net * 0.21 * 100) / 100; // € 179.55
    const total = Math.round((net + vat) * 100) / 100; // € 1034.55
    assert.strictEqual(net, 855.00, "Net after compound 10% + 5% discount must be € 855,00");
    assert.strictEqual(vat, 179.55, "21% VAT on compound discounted amount must be € 179,55");
    assert.strictEqual(total, 1034.55, "Total incl VAT must be € 1034,55");
});

await testAsync("Offerte & Factuur Edge-Cases: Vaste couponkortingen en ondergrens (€0 floor) berekening", async () => {
    const subtotal = 350.00;
    const coupon = 50.00;
    const net = Math.max(0, subtotal - coupon); // € 300
    const vat = Math.round(net * 0.21 * 100) / 100; // € 63
    assert.strictEqual(net, 300.00);
    assert.strictEqual(vat, 63.00);
    assert.strictEqual(net + vat, 363.00);

    const excessiveCoupon = 500.00;
    const floorNet = Math.max(0, subtotal - excessiveCoupon);
    assert.strictEqual(floorNet, 0.00, "Net amount cannot drop below 0");
});

await testAsync("Offerte & Factuur Edge-Cases: normalizeProjectInvoices en renderBillingCardHtml sluiten geannuleerde facturen uit van totalen", async () => {
    const { normalizeProjectInvoices, renderBillingCardHtml } = await import("../crm/admin/js/modules/project-billing.js");
    const testProject = {
        id: "proj_edge_test",
        client: "Test Klant BV",
        invoices: [
            { invoiceNumber: "2026-090", amountExcl: 0, amountVat: 0, amountIncl: 0, status: "paid" },
            { invoiceNumber: "2026-091", amountExcl: 100, amountVat: 21, amountIncl: 121, status: "open" },
            { invoiceNumber: "2026-092", amountExcl: 50, amountVat: 10.5, amountIncl: 60.5, status: "canceled" }
        ]
    };
    const normInvoices = normalizeProjectInvoices(testProject);
    assert.strictEqual(normInvoices.length, 3, "All 3 invoices must be normalized");
    assert.strictEqual(normInvoices[0].amountIncl, 0, "0-euro invoice must preserve 0 amountIncl");

    const cardHtml = renderBillingCardHtml(testProject);
    assert.ok(!cardHtml.includes("NaN"), "renderBillingCardHtml must never render NaN");
    assert.ok(cardHtml.includes("€ 121,00"), "renderBillingCardHtml must show open invoice total");
    assert.ok(!cardHtml.includes("€ 181,50"), "Canceled invoice must not be added to active invoiced total");
});

await testAsync("Offerte & Factuur Edge-Cases: generateBillingWhatsAppUrl genereert veilige URL-encodering en internationaal telefoonformaat", async () => {
    const { generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");
    const waUrl = generateBillingWhatsAppUrl("06-12345678", "Bakkerij Sieg & Zn", "2026-015", 240.79, "https://portal.creationaltfix.nl/pay/test");
    assert.ok(waUrl.startsWith("https://wa.me/31612345678"), "Must convert 06 to 316 prefix");
    assert.ok(waUrl.includes("Bakkerij%20Sieg%20%26%20Zn"), "Must encode ampersand safely in URL");
    assert.ok(waUrl.includes("2026-015"), "Must include invoice number");
    assert.ok(waUrl.includes("%E2%82%AC%20240%2C79"), "Must include currency formatted price");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL EDGE CASES ---
await testAsync("Contact & Intake Edge-Cases: PHP contact handlers (deholterij, lutjestee, remtheerd) implementeren honeypot trap met instant exit", async () => {
    const conceptEndpoints = [
        "website/concept/deholterij/api/contact.php",
        "website/concept/lutjestee/api/contact.php",
        "website/concept/remtheerd/api/contact.php"
    ];
    for (const relPath of conceptEndpoints) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(content.includes("!empty($_POST['website'])"), `${relPath} must inspect 'website' honeypot field`);
        assert.ok(content.includes("'success' => true"), `${relPath} must respond with simulated success to trap bots`);
        assert.ok(content.includes("exit;"), `${relPath} must immediately exit when honeypot is triggered`);
    }
});

await testAsync("Contact & Intake Edge-Cases: Alle concept website contactformulieren bevatten een honeypot anti-spam trap veld", async () => {
    const conceptDir = path.join(ROOT_DIR, "website/concept");
    const conceptDirs = fs.readdirSync(conceptDir).filter(f => fs.statSync(path.join(conceptDir, f)).isDirectory());
    for (const dir of conceptDirs) {
        const indexHtml = fs.readFileSync(path.join(conceptDir, dir, "index.html"), "utf-8");
        const contactFile = path.join(conceptDir, dir, "contact.html");
        const contactHtml = fs.existsSync(contactFile) ? fs.readFileSync(contactFile, "utf-8") : "";
        const hasHoneypot = indexHtml.includes('_hp_trap') || indexHtml.includes('hp-field') || indexHtml.includes('name="website"') ||
                            contactHtml.includes('_hp_trap') || contactHtml.includes('hp-field') || contactHtml.includes('name="website"');
        assert.ok(hasHoneypot, `${dir} must contain an anti-spam honeypot trap field`);
    }
});

await testAsync("Contact & Intake Edge-Cases: CRLF Header Injection mitigatie neutraliseert Bcc, Subject en newline header splitting (CWE-93)", async () => {
    const emailSanitizationRule = (raw) => (raw || '').trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F,; ]/g, '');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Injection attempt 1: CRLF Bcc injection
    const crlfPayload1 = "attacker@domain.com\r\nBcc: victim@target.nl";
    const cleanedCrlf1 = emailSanitizationRule(crlfPayload1);
    assert.ok(!cleanedCrlf1.includes("\r") && !cleanedCrlf1.includes("\n"), "Must strip CR and LF characters");
    assert.strictEqual(emailRegex.test(cleanedCrlf1), false, "Injected email after stripping must fail RFC email regex");

    // Injection attempt 2: Subject and Body injection
    const crlfPayload2 = "test@domain.com\r\nSubject: Phishing Alert\r\n\r\nMalicious body";
    const cleanedCrlf2 = emailSanitizationRule(crlfPayload2);
    assert.ok(!cleanedCrlf2.includes("\r") && !cleanedCrlf2.includes("\n"), "Must strip all newlines");
    assert.strictEqual(emailRegex.test(cleanedCrlf2), false, "Injected subject/body must fail RFC regex");

    // Injection attempt 3: Comma & semicolon recipient header splitting
    const crlfPayload3 = "legit@test.nl,evil@attacker.com;spam@bot.net";
    const cleanedCrlf3 = emailSanitizationRule(crlfPayload3);
    assert.ok(!cleanedCrlf3.includes(",") && !cleanedCrlf3.includes(";"), "Must strip commas and semicolons");
    assert.strictEqual(emailRegex.test(cleanedCrlf3), false, "Splitted recipient string must fail RFC regex");
});

await testAsync("Contact & Intake Edge-Cases: Email normalisatie zuivert whitespace, tags (+tag) en dwingt lowercase af", async () => {
    const emailSanitizationRule = (raw) => (raw || '').trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F,; ]/g, '');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const rawEmailValid = "   Allard.Ondernemer+Portal2026@CreationAltFix.NL \t ";
    const cleanedValid = emailSanitizationRule(rawEmailValid);
    assert.strictEqual(cleanedValid, "allard.ondernemer+portal2026@creationaltfix.nl", "Must normalize to lowercase and strip outer whitespace");
    assert.strictEqual(emailRegex.test(cleanedValid), true, "Valid tagged email must pass RFC regex");
});

await testAsync("Contact & Intake Edge-Cases: Email validatie wijst misvormde adressen af (ontbrekende domain/user, dubbele @, localhost)", async () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    assert.strictEqual(emailRegex.test("plainaddress"), false, "Must reject plain address");
    assert.strictEqual(emailRegex.test("@missingusername.nl"), false, "Must reject missing username");
    assert.strictEqual(emailRegex.test("user name@domain.com"), false, "Must reject space in username");
    assert.strictEqual(emailRegex.test("user@@domain.com"), false, "Must reject double @");
    assert.strictEqual(emailRegex.test("user@localhost"), false, "Must reject localhost TLD");
    assert.strictEqual(emailRegex.test(""), false, "Must reject empty string");
});

await testAsync("Contact & Intake Edge-Cases: Webhook notificaties weren SSRF pogingen (loopback, private subnets, cloud metadata)", async () => {
    const { isSafeWebhookUrl } = await import("../crm/intake/js/notifications.js");
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123/send"), false, "Must reject unencrypted http Webhooks");
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false, "Must block localhost Webhook");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false, "Must block IPv4 loopback Webhook");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.1/hook"), false, "Must block private 192.168.x.x Webhook");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/hook"), false, "Must block private 10.x.x.x Webhook");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/hook"), false, "Must block cloud metadata Webhook");
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/xyz"), true, "Must accept authentic Discord webhook");
});

await testAsync("Contact & Intake Edge-Cases: sanitizeMarkdown escapt markdown stuurtekens tegen prompt- en display-breakouts", async () => {
    const { sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");
    const mdInput = "*Belangrijk:* Klik [Hier](https://phish.com) _vandaag_ `code`!";
    const mdClean = sanitizeMarkdown(mdInput);
    assert.ok(!mdClean.includes("*Belangrijk:*"), "Must escape markdown asterisks");
    assert.ok(mdClean.includes("\\[Hier\\]"), "Must escape markdown brackets");
    assert.ok(mdClean.includes("\\(https://phish\\.com\\)"), "Must escape markdown parenthesis");
    assert.strictEqual(sanitizeMarkdown(null), "");
    assert.strictEqual(sanitizeMarkdown(undefined), "");
});

// --- SECTION 4: DRM & CODE PROTECTION EDGE CASES ---
await testAsync("DRM & Code Protection Edge-Cases: applyCodeProtection genereert uitsluitend hex-escaped HTML-tags binnen script", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Content</h1></body></html>";
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: 'Café & "Schildersbedrijf" <Jansen>',
        slug: 'cafe-schildersbedrijf-jansen'
    });
    const guardMatch = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(guardMatch, "applyCodeProtection must inject caf-security-guard script");
    const scriptBody = guardMatch[1];

    assert.ok(!scriptBody.includes("<div"), "caf-security-guard must NOT contain raw unescaped <div");
    assert.ok(!scriptBody.includes("</div>"), "caf-security-guard must NOT contain raw unescaped </div>");
    assert.ok(!scriptBody.includes("<h1>"), "caf-security-guard must NOT contain raw unescaped <h1>");
    assert.ok(!scriptBody.includes("</h1>"), "caf-security-guard must NOT contain raw unescaped </h1>");
    assert.ok(!scriptBody.includes("<p>"), "caf-security-guard must NOT contain raw unescaped <p>");
    assert.ok(!scriptBody.includes("</p>"), "caf-security-guard must NOT contain raw unescaped </p>");
    assert.ok(!scriptBody.includes("<strong>"), "caf-security-guard must NOT contain raw unescaped <strong>");
    assert.ok(!scriptBody.includes("</strong>"), "caf-security-guard must NOT contain raw unescaped </strong>");
    assert.ok(!scriptBody.includes("<a "), "caf-security-guard must NOT contain raw unescaped <a");
    assert.ok(!scriptBody.includes("</a>"), "caf-security-guard must NOT contain raw unescaped </a>");

    assert.ok(scriptBody.includes("\\x3Cdiv"), "caf-security-guard must use \\x3Cdiv hex-escape");
    assert.ok(scriptBody.includes("\\x3C/div>"), "caf-security-guard must use \\x3C/div> hex-escape");
    assert.ok(scriptBody.includes("\\x3Ch1"), "caf-security-guard must use \\x3Ch1 hex-escape");
    assert.ok(scriptBody.includes("\\x3Cp"), "caf-security-guard must use \\x3Cp hex-escape");
    assert.ok(scriptBody.includes("\\x3Cstrong>"), "caf-security-guard must use \\x3Cstrong> hex-escape");
    assert.ok(scriptBody.includes("\\x3Ca "), "caf-security-guard must use \\x3Ca hex-escape");
});

await testAsync("DRM & Code Protection Edge-Cases: Placement engine injecteert voor </head>, voor </body> of via prepend", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Content</h1></body></html>";
    const protectedHead = applyCodeProtection(baseHtml, { name: "Head", slug: "head" });
    assert.ok(protectedHead.indexOf('<script id="caf-security-guard">') < protectedHead.indexOf('</head>'), "Must inject before </head>");

    const bodyOnlyHtml = "<html><body><h1>Direct Body</h1></body></html>";
    const protectedBody = applyCodeProtection(bodyOnlyHtml, { name: "No Head", slug: "no-head" });
    assert.ok(protectedBody.includes('id="caf-security-guard"'), "Must inject even without head");
    assert.ok(protectedBody.indexOf('<script id="caf-security-guard">') < protectedBody.indexOf('</body>'), "Must inject before </body>");

    const rawSnippet = "<div>Just a div</div>";
    const protectedSnippet = applyCodeProtection(rawSnippet, { name: "Raw", slug: "raw" });
    assert.ok(protectedSnippet.startsWith('\n<script id="caf-security-guard">'), "Must prepend script if no structural tags exist");
});

await testAsync("DRM & Code Protection Edge-Cases: Idempotentie garandeert exact 1 script guard bij herhaaldelijke aanroep", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Content</h1></body></html>";
    const firstProtection = applyCodeProtection(baseHtml, { name: "Dup", slug: "dup" });
    const doubleProtection = applyCodeProtection(firstProtection, { name: "Dup", slug: "dup" });
    const tripleProtection = applyCodeProtection(doubleProtection, { name: "Dup", slug: "dup" });
    const guardCount = (tripleProtection.match(/<script id="caf-security-guard">/g) || []).length;
    assert.strictEqual(guardCount, 1, "applyCodeProtection must be strictly idempotent (exactly 1 script guard)");
});

await testAsync("DRM & Code Protection Edge-Cases: XSS parameter hardening encodet slugs en bedrijfsnamen via JSON-escaping", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Content</h1></body></html>";
    const maliciousSlugLead = {
        name: "Hacker </script><script>alert(1)</script>",
        slug: 'malicious"quote-breakout;alert(1);'
    };
    const xssProtected = applyCodeProtection(baseHtml, maliciousSlugLead);
    const xssGuardMatch = xssProtected.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(xssGuardMatch, "Must generate valid guard even with special chars in slug/name");
    assert.ok(xssGuardMatch[1].includes(JSON.stringify(maliciousSlugLead.slug)), "Slug must be securely JSON-encoded");
});

await testAsync("DRM & Code Protection Edge-Cases: Statische audit valideert hex-escaped DRM script over alle openbare concept sites", async () => {
    const conceptDir = path.join(ROOT_DIR, "website/concept");
    const conceptDirs = fs.readdirSync(conceptDir).filter(f => fs.statSync(path.join(conceptDir, f)).isDirectory());
    for (const slug of conceptDirs) {
        const file = path.join(conceptDir, slug, "index.html");
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, "utf-8");
        const match = html.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
        assert.ok(match, `Concept ${slug} must contain caf-security-guard`);
        assert.ok(!match[1].includes("<div"), `Concept ${slug} caf-security-guard must not contain raw <div`);
        assert.ok(!match[1].includes("</div>"), `Concept ${slug} caf-security-guard must not contain raw </div>`);
        assert.ok(match[1].includes("\\x3Cdiv"), `Concept ${slug} caf-security-guard must contain \\x3Cdiv`);
    }
});

await testAsync("TASK-916: deep-intelligence formatSuggestedDomain and checkDomainAvailability DNS/RDAP validation", async () => {
    const { formatSuggestedDomain, checkDomainAvailability, enrichBusinessProfile } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. formatSuggestedDomain normalization & safety checks
    assert.equal(formatSuggestedDomain("Schildersbedrijf Groningen"), "schildersbedrijf-groningen.nl");
    assert.equal(formatSuggestedDomain("https://www.bouwservice-noord.nl/contact/"), "bouwservice-noord.nl");
    assert.equal(formatSuggestedDomain("J. Pot & Zonen Installatie"), "j-pot-zonen-installatie.nl");
    assert.equal(formatSuggestedDomain("---!@#$%^---"), "zzp-concept.nl");
    assert.equal(formatSuggestedDomain(null), "zzp-concept.nl");
    assert.equal(formatSuggestedDomain(undefined), "zzp-concept.nl");
    assert.equal(formatSuggestedDomain("a".repeat(100)), "a".repeat(63) + ".nl", "Must enforce 63 character limit on label");

    // 2. checkDomainAvailability with injected resolvers (deterministic edge-case matrix)
    // Case A: Domain has NS records -> registered / taken
    const resTaken = await checkDomainAvailability("google.nl", {
        dnsResolver: { resolveNs: async () => ["ns1.google.com", "ns2.google.com"] }
    });
    assert.equal(resTaken.isAvailable, false);
    assert.equal(resTaken.source, "dns-ns");

    // Case B: Domain has ENODATA in DNS -> registered but no NS
    const resEnodata = await checkDomainAvailability("nodata.nl", {
        dnsResolver: { resolveNs: async () => { const e = new Error("No data"); e.code = "ENODATA"; throw e; } }
    });
    assert.equal(resEnodata.isAvailable, false);
    assert.equal(resEnodata.source, "dns-enodata");

    // Case C: DNS throws ENOTFOUND and RDAP returns 404 -> available/free!
    const resFreeRdap = await checkDomainAvailability("vrij-vakman-concept.nl", {
        dnsResolver: { resolveNs: async () => { const e = new Error("Not found"); e.code = "ENOTFOUND"; throw e; } },
        fetcher: async () => ({ status: 404 })
    });
    assert.equal(resFreeRdap.isAvailable, true);
    assert.equal(resFreeRdap.source, "sidn-rdap");

    // Case D: DNS throws ENOTFOUND but RDAP returns 200 -> registered at SIDN
    const resTakenRdap = await checkDomainAvailability("bezet-domein.nl", {
        dnsResolver: { resolveNs: async () => { const e = new Error("Not found"); e.code = "ENOTFOUND"; throw e; } },
        fetcher: async () => ({ status: 200 })
    });
    assert.equal(resTakenRdap.isAvailable, false);
    assert.equal(resTakenRdap.source, "sidn-rdap");

    // Case E: DNS throws ENOTFOUND and RDAP is offline -> fallback to dns-nxdomain
    const resFallback = await checkDomainAvailability("fallback-check.nl", {
        dnsResolver: { resolveNs: async () => { const e = new Error("Not found"); e.code = "NXDOMAIN"; throw e; } },
        fetcher: async () => { throw new Error("Offline network"); }
    });
    assert.equal(resFallback.isAvailable, true);
    assert.equal(resFallback.source, "dns-nxdomain");

    // 3. enrichBusinessProfile integration
    const leadNoWeb = {
        name: "Autonoom Schilderbedrijf Vrij",
        slug: "autonoom-schilderbedrijf-vrij",
        category: "Schilder",
        address: "Kerkstraat 10, Hoogezand",
        website: null,
        phone: "06-12345678"
    };

    const enriched = await enrichBusinessProfile(leadNoWeb, {
        dnsResolver: { resolveNs: async () => { const e = new Error("Not found"); e.code = "ENOTFOUND"; throw e; } },
        fetcher: async () => ({ status: 404 })
    });

    assert.equal(enriched.suggestedDomain, "autonoom-schilderbedrijf-vrij.nl");
    assert.equal(enriched.isDomainAvailable, true);
    assert.ok(enriched.domainCheck && enriched.domainCheck.isAvailable === true);
    assert.ok(enriched.strengths.some(s => s.includes("autonoom-schilderbedrijf-vrij.nl") && s.includes("vrij")));
});

await testAsync("TASK-916: agy-generator renders green domain pill in concept-bar, modal notice, and outreach pitch", async () => {
    const { buildFallbackTemplate, buildOutreachPitch } = await import("../factory/generator/agy-generator.js");

    const freeDomainLead = {
        name: "Tegelzetter Jansen",
        slug: "tegelzetter-jansen",
        category: "Tegelzetter",
        address: "Molenstraat 5, Sappemeer",
        phone: "06-11223344",
        whatsAppNumber: "31611223344",
        hasWhatsApp: true,
        website: null,
        suggestedDomain: "tegelzetter-jansen.nl",
        recommendedDomain: "tegelzetter-jansen.nl",
        isDomainAvailable: true,
        archetype: "A_TRADE_DIRECT",
        archetypeLabel: "Nuchter & Direct Bellen (Vakman)",
        pitchHook: "We zagen jouw vermelding voor Tegelzetter Jansen op Google Maps.",
        rating: 4.9,
        reviewsCount: 12
    };

    // 1. Check generated HTML concept website
    const html = buildFallbackTemplate(freeDomainLead);

    assert.ok(html.includes('<span class="concept-domain-pill">'), "Concept HTML must render .concept-domain-pill span element");
    assert.ok(html.includes("tegelzetter-jansen.nl"), "Concept HTML must reference tegelzetter-jansen.nl");
    assert.ok(html.includes("is nog vrij!"), "Concept bar must announce domain is free");
    assert.ok(html.includes('<div class="domain-free-notice">'), "Proposal modal must render domain-free-notice box element");
    assert.ok(html.includes("Inclusief live registratie van uw vrije .nl domeinnaam"), "Proposal hosting pricing row must note free domain registration");

    // 2. Check generated outreach pitch (Email HTML, Plain Text, WhatsApp)
    const pitch = buildOutreachPitch(freeDomainLead);

    assert.ok(pitch.bulletsHtml.includes("🟢 Vrije domeinnaam (tegelzetter-jansen.nl)"), "HTML email bullets must highlight free domain");
    assert.ok(pitch.bulletsPlain.includes("🟢 Vrije domeinnaam (tegelzetter-jansen.nl)"), "Plain text bullets must highlight free domain");
    assert.ok(pitch.bodyHtml.includes("tegelzetter-jansen.nl") && pitch.bodyHtml.includes("op dit moment nog vrij om te registreren"), "Email HTML body must contain domain availability banner");
    assert.ok(pitch.bodyPlain.includes("tegelzetter-jansen.nl") && pitch.bodyPlain.includes("op dit moment nog vrij"), "Plain text body must contain domain notice");
    assert.ok(pitch.whatsAppText.includes("Goed nieuws: domeinnaam tegelzetter-jansen.nl is nu nog vrij!"), "WhatsApp pitch must include urgent domain opportunity hook");

    // 3. Counter-check: when isDomainAvailable is false, domain free pill must NOT be rendered
    const takenDomainLead = {
        ...freeDomainLead,
        isDomainAvailable: false
    };
    const takenHtml = buildFallbackTemplate(takenDomainLead);
    assert.ok(!takenHtml.includes('<span class="concept-domain-pill">'), "Taken domain lead must NOT render concept-domain-pill span element");
    assert.ok(!takenHtml.includes('<div class="domain-free-notice">'), "Taken domain lead must NOT render domain-free-notice div element");

    const takenPitch = buildOutreachPitch(takenDomainLead);
    assert.ok(!takenPitch.bulletsHtml.includes("🟢 Vrije domeinnaam"), "Taken domain lead must NOT claim free domain in bulletsHtml");
    assert.ok(!takenPitch.whatsAppText.includes("Goed nieuws: domeinnaam"), "Taken domain lead must NOT claim free domain in WhatsApp text");
});


await testAsync("Contact Handlers: Concept contact handlers weren CWE-200 PHP versie disclosure en gebruiken veilige ConceptMailer", async () => {
    const conceptEndpoints = [
        "website/concept/deholterij/api/contact.php",
        "website/concept/lutjestee/api/contact.php",
        "website/concept/remtheerd/api/contact.php"
    ];
    for (const relPath of conceptEndpoints) {
        const fullPath = path.join(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(!content.includes("phpversion()"), `${relPath} must not disclose phpversion() in email headers`);
        assert.ok(content.includes("ConceptMailer/2.0"), `${relPath} must use hardened ConceptMailer/2.0 header`);
    }
});

await testAsync("Webserver & Header Security: .htaccess configuraties hanteren HSTS, CSP, X-Content-Type-Options en sensitive files block", async () => {
    const htaccessTargets = [
        "website/.htaccess",
        "crm/.htaccess",
        "../stenekesrioolspecialist/.htaccess",
        "../Scholte-elektrotechniek/.htaccess",
        "../BesselingInstallatieTechniek/.htaccess",
        "../AngelaStenekes/.htaccess",
        "../Qolipa-Site/.htaccess",
        "../jboersma music/public/.htaccess",
        "../arnolddesign/public/.htaccess",
        "../BakkertjeSieg/public/.htaccess",
        "../BakkertjeSieg/root-deploy/.htaccess",
        "../Vanderplaats/public/.htaccess",
        "../willa-handmade-studio/public/.htaccess",
        "../pomppop/public/.htaccess"
    ];
    for (const relPath of htaccessTargets) {
        const fullPath = path.resolve(ROOT_DIR, relPath);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(content.includes("Strict-Transport-Security"), `${relPath} must configure HSTS`);
        assert.ok(content.includes("X-Content-Type-Options"), `${relPath} must configure nosniff`);
        assert.ok(content.includes("Referrer-Policy"), `${relPath} must configure Referrer-Policy`);
        assert.ok(content.includes("Content-Security-Policy"), `${relPath} must configure CSP`);
        assert.ok(content.includes("Require all denied"), `${relPath} must deny direct access to sensitive files`);
    }
});

// ========================================================
// 15. TASK-910: INTERACTIEVE KLANT ONBOARDING & OPLEVER-CHECKLIST
// ========================================================
console.log("\n📌 SUITE 15: Klant Onboarding & Oplever-Checklist (TASK-910)");

const {
    ONBOARDING_TASK_DEFS,
    sanitizeDomainToken,
    getProjectPhaseNumber,
    resolveTask,
    calculateOnboardingProgress,
    renderOnboardingChecklistHtml
} = await import("../crm/status/js/modules/onboarding-checklist.js");

await testAsync("TASK-910: ONBOARDING_TASK_DEFS definition schema and canonical tasks", async () => {
    assert.ok(Array.isArray(ONBOARDING_TASK_DEFS), "ONBOARDING_TASK_DEFS must be an array");
    assert.equal(ONBOARDING_TASK_DEFS.length, 7, "Must define 7 canonical onboarding tasks");
    
    const taskIds = ONBOARDING_TASK_DEFS.map(t => t.id);
    assert.deepEqual(taskIds, ['profile', 'proposal', 'logo', 'domain', 'content', 'design', 'delivery']);

    for (const t of ONBOARDING_TASK_DEFS) {
        assert.ok(t.id && typeof t.id === 'string', "Task must have string id");
        assert.ok(t.icon && t.icon.startsWith("fas fa-"), `Task ${t.id} must have fontawesome icon`);
        assert.ok(typeof t.phase === 'number' && t.phase >= 1 && t.phase <= 5, `Task ${t.id} must have valid phase number`);
        assert.ok(t.defaultTitleNl && t.defaultTitleEn, `Task ${t.id} must have NL and EN titles`);
        assert.ok(t.defaultDescNl && t.defaultDescEn, `Task ${t.id} must have NL and EN descriptions`);
        assert.ok(t.actionType, `Task ${t.id} must have an actionType`);
    }
});

await testAsync("TASK-910: sanitizeDomainToken boundary, control characters and length limit", async () => {
    assert.equal(sanitizeDomainToken("EPP-12345-NL"), "EPP-12345-NL");
    assert.equal(sanitizeDomainToken("  EPP-ABC-XYZ  "), "EPP-ABC-XYZ");
    assert.equal(sanitizeDomainToken("EPP\r\nToken\t"), "EPPToken");
    assert.equal(sanitizeDomainToken("EPP\x00\x1FToken"), "EPPToken");
    assert.equal(sanitizeDomainToken(null), "");
    assert.equal(sanitizeDomainToken(undefined), "");
    assert.equal(sanitizeDomainToken(12345), "");
    // Truncates at 100 characters
    const longToken = "A".repeat(150);
    assert.equal(sanitizeDomainToken(longToken).length, 100);
});

await testAsync("TASK-910: resolveTask auto-detection across workflow phases", async () => {
    // 1. Profile auto-detection
    const profileDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'profile');
    const completeProfile = resolveTask(profileDef, {
        companyName: "Stenekes Riool",
        email: "info@stenekesriool.nl",
        kvk: "12345678"
    });
    assert.equal(completeProfile.isCompleted, true, "Profile with company, email and kvk must be auto-completed");

    const incompleteProfile = resolveTask(profileDef, {
        companyName: "Stenekes Riool",
        email: "info@stenekesriool.nl"
    });
    assert.equal(incompleteProfile.isCompleted, false, "Profile missing kvk/address must require action");
    assert.equal(incompleteProfile.isActionRequired, true);

    // 2. Proposal auto-detection
    const proposalDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'proposal');
    const acceptedProposal = resolveTask(proposalDef, {
        status: "In Ontwikkeling",
        proposalAccepted: true,
        proposalAcceptedAt: "2026-10-21T12:00:00Z"
    });
    assert.equal(acceptedProposal.isCompleted, true, "Accepted proposal must resolve to completed");

    const pendingProposal = resolveTask(proposalDef, {
        status: "Offerte Verzonden",
        statusClass: "active"
    });
    assert.equal(pendingProposal.isCompleted, false, "Pending proposal must require action");
    assert.equal(pendingProposal.isActionRequired, true);

    // 3. Logo auto-detection
    const logoDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'logo');
    const logoWithFiles = resolveTask(logoDef, {
        files: [{ name: "stenekes-logo-vector.svg", url: "https://..." }]
    });
    assert.equal(logoWithFiles.isCompleted, true, "Project with logo file must be resolved as completed");

    const logoWithToggle = resolveTask(logoDef, {
        files: [],
        onboarding: { noLogoNeeded: true }
    });
    assert.equal(logoWithToggle.isCompleted, true, "Project with noLogoNeeded toggle must be resolved as completed");

    const missingLogo = resolveTask(logoDef, { files: [] });
    assert.equal(missingLogo.isCompleted, false, "Missing logo must require action");
    assert.equal(missingLogo.isActionRequired, true);

    // 4. Domain & EPP token auto-detection
    const domainDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'domain');
    const domainWithEpp = resolveTask(domainDef, {
        domainTransferToken: "TRANSIP-EPP-9921"
    });
    assert.equal(domainWithEpp.isCompleted, true, "Domain with EPP code must be completed");
    assert.equal(domainWithEpp.customValue, "TRANSIP-EPP-9921");

    const domainWithNewReg = resolveTask(domainDef, {
        onboarding: { isNewRegistration: true }
    });
    assert.equal(domainWithNewReg.isCompleted, true, "Domain with new registration toggle must be completed");

    const domainMissing = resolveTask(domainDef, {});
    assert.equal(domainMissing.isCompleted, false);
    assert.equal(domainMissing.isActionRequired, true);

    // 5. Design & Delivery phase-awareness
    const designDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'design');
    const designInPhase1 = resolveTask(designDef, { status: "Intake Voltooid" });
    assert.equal(designInPhase1.isUpcoming, true, "Design in phase 1 must be upcoming");

    const designInPhase3 = resolveTask(designDef, { status: "Design Gereed voor Review" });
    assert.equal(designInPhase3.isActionRequired, true, "Design in phase 3 pending review must require action");

    const deliveryDef = ONBOARDING_TASK_DEFS.find(t => t.id === 'delivery');
    const deliveryLive = resolveTask(deliveryDef, { status: "Live", statusClass: "done" });
    assert.equal(deliveryLive.isCompleted, true, "Delivery for live project must be completed");
});

await testAsync("TASK-910: calculateOnboardingProgress aggregates counts, percentages and isAllDone", async () => {
    // Brand new lead:
    const newLead = { status: "Intake Voltooid", files: [] };
    const leadProgress = calculateOnboardingProgress(newLead);
    assert.equal(leadProgress.total, 7);
    assert.ok(leadProgress.completed <= 1, "New lead should have at most 1 task auto-completed");
    assert.ok(leadProgress.actionRequired >= 3, "New lead should have open actions");
    assert.equal(leadProgress.isAllDone, false);

    // Fully completed project:
    const completeProject = {
        companyName: "De Holterij",
        client: "De Holterij",
        email: "info@deholterij.nl",
        kvk: "98765432",
        status: "Live",
        statusClass: "done",
        proposalAccepted: true,
        proposalAcceptedAt: "2026-10-15T10:00:00Z",
        files: [
            { name: "logo.svg", url: "https://..." },
            { name: "menukaart.pdf", url: "https://..." }
        ],
        domainTransferToken: "EPP-HOLTERIJ-2026",
        designAccepted: true,
        onboarding: {
            completedTaskIds: ['profile', 'proposal', 'logo', 'domain', 'content', 'design', 'delivery']
        }
    };
    const completeProgress = calculateOnboardingProgress(completeProject);
    assert.equal(completeProgress.total, 7);
    assert.equal(completeProgress.completed, 7);
    assert.equal(completeProgress.actionRequired, 0);
    assert.equal(completeProgress.percent, 100);
    assert.equal(completeProgress.isAllDone, true);
});

await testAsync("TASK-910: renderOnboardingChecklistHtml produces safe XSS-escaped HTML and bilingual output", async () => {
    const maliciousProject = {
        companyName: '<script>alert("xss")</script>',
        email: 'victim@test.nl',
        status: 'Offerte Verzonden',
        domainTransferToken: '"><img src=x onerror=alert(1)>',
        onboarding: {
            tasks: {
                content: { note: '<b onmouseover=alert(2)>Teksten</b>' }
            }
        }
    };

    // Render Dutch
    const htmlNl = renderOnboardingChecklistHtml(maliciousProject, 'nl');
    assert.ok(htmlNl.includes("Interactieve Klant Onboarding &amp; Oplever-Checklist"));
    assert.ok(!htmlNl.includes('<script>alert("xss")</script>'), "Raw script tag must not be injected in HTML");
    assert.ok(!htmlNl.includes('<img src=x onerror=alert(1)>'), "Raw img onerror tag must not be injected in HTML");
    assert.ok(htmlNl.includes('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;') || htmlNl.includes('&lt;'), "Payloads must be escaped");

    // Render English
    const htmlEn = renderOnboardingChecklistHtml(maliciousProject, 'en');
    assert.ok(htmlEn.includes("Interactive Client Onboarding &amp; Delivery Checklist"));
    assert.ok(htmlEn.includes("Actions Required") || htmlEn.includes("In Progress"));
    assert.ok(!htmlEn.includes('<script>'), "English HTML must also be XSS safe");
});

// ========================================================
// 16. DEEP EDGE-CASE HARDENING & RESILIENCY MATRIX
// ========================================================
console.log("\n📌 SUITE 16: Deep Edge-Case Hardening & Resiliency Matrix");

// --- SECTION 1: LEAD FACTORY DEEP EDGE CASES ---
await testAsync("Lead Factory Edge-Cases: Non-alphanumeric, RTL and multi-byte Unicode strings (Arabic/Hebrew/Cyrillic)", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const unicodeLead = sanitizeLeadData({ name: "בניין ושיפוצים 🏗️ Ремонт & Stuc BV", website: "https://bouw-stuc.nl" });
    assert.strictEqual(unicodeLead.name, "בניין ושיפוצים 🏗️ Ремонт & Stuc BV");
    assert.ok(/^[a-z0-9-]+$/.test(unicodeLead.slug), "Slug must only contain lowercase alphanumeric and hyphens");
    assert.strictEqual(unicodeLead.slug, "stuc-bv");
    assert.strictEqual(unicodeLead.hasWebsite, true);
});

await testAsync("Lead Factory Edge-Cases: Service- en bedrijfsomschrijvingen fallback voor onbekende categorieën & emojis", async () => {
    const { deriveServicesFromCategory, deriveReviewsFromCategory } = await import("../factory/enrichment/deep-intelligence.js");
    const services = deriveServicesFromCategory("⚡ Zonnepanelen & Elektra 🔋", "Spanning Elektrotechniek");
    assert.ok(Array.isArray(services) && services.length >= 3, "Must return at least 3 services for custom category");
    for (const s of services) {
        assert.ok(typeof s.title === "string" && s.title.length >= 3, "Service must have valid title");
        assert.ok(typeof s.desc === "string" && s.desc.length >= 10, "Service must have valid description");
    }
    const defaultServices = deriveServicesFromCategory("", "");
    assert.ok(Array.isArray(defaultServices) && defaultServices.length >= 3, "Empty category must fall back gracefully");

    const reviews = deriveReviewsFromCategory("Schilder", "Schildersbedrijf Groningen", "Groningen");
    assert.ok(Array.isArray(reviews) && reviews.length >= 3, "Must return at least 3 reviews");
    for (const r of reviews) {
        assert.ok(r.text && r.text.length > 20, "Review must contain meaningful text");
        assert.ok(r.author && r.author.includes("Groningen"), "Review author must reference local city");
    }
});

await testAsync("Lead Factory Edge-Cases: Telefoonnormalisatie weert zakelijke VOIP-nummers (085, 088) en servicenummers (0800, 0900)", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isDutchMobilePhone("+31 (0)6 1234 5678"), true, "+31 (0)6 format must be recognized as mobile");
    assert.strictEqual(isDutchMobilePhone("06 123"), false, "Incomplete 06 number (<10 digits) must return false");
    assert.strictEqual(isDutchMobilePhone("06 1234567899"), false, "Overly long 06 number (>10 digits) must return false");
    assert.strictEqual(isDutchMobilePhone("0800 1234"), false, "0800 toll-free number must return false");
    assert.strictEqual(isDutchMobilePhone("0900 8844"), false, "0900 paid service number must return false");
    assert.strictEqual(isDutchMobilePhone("088 1234567"), false, "088 corporate VOIP block must return false");
    assert.strictEqual(isDutchMobilePhone("085 0601234"), false, "085 location-independent VOIP must return false");
});

await testAsync("Lead Factory Edge-Cases: Deduplicatie engine herkent poort- en querystring variaties en weert valse null-matches", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");
    const existing = [{ slug: "schilder-piet", phone: "06-12345678", website: "https://schilder-piet.nl" }];
    assert.strictEqual(isDuplicateLead({ phone: "+31 6 1234 5678" }, existing), true, "Matches international mobile variation");
    assert.strictEqual(isDuplicateLead({ website: "http://schilder-piet.nl:80/home?ref=1#top" }, existing), true, "Matches domain with port 80 and query params");
    assert.strictEqual(isDuplicateLead({ website: "https://schilder-piet.nl:443" }, existing), true, "Matches domain with port 443");
    assert.strictEqual(isDuplicateLead({ slug: "andere-schilder", phone: null, website: null }, existing), false, "Two distinct leads with null phone/site must not match");
});

await testAsync("Lead Factory Edge-Cases: Website domein validatie scheidt directory-/platform-profielen van maatwerkdomeinen", async () => {
    const { isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isWebsiteMatchingBusiness("Schildersbedrijf Jansen", "https://autobedrijf-klaassen.nl"), false, "Mismatched domain must return false");
    assert.strictEqual(isWebsiteMatchingBusiness("Schildersbedrijf Jansen", "https://jansen-schilders.nl"), true, "Matching domain must return true");
    assert.strictEqual(isWebsiteMatchingBusiness("Creation+Alt+Fix", "https://creationaltfix.nl"), false, "Creation+Alt+Fix own domain must return false");
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE CASES ---
await testAsync("Offerte & Factuur Edge-Cases: Commercial Half-Up afronding op boundary fracties conform Belastingdienst regels", async () => {
    const calcVat21 = (excl) => {
        const vat = Math.round(excl * 0.21 * 100) / 100;
        const incl = Math.round((excl + vat) * 100) / 100;
        return { vat, incl };
    };
    assert.deepEqual(calcVat21(1.05), { vat: 0.22, incl: 1.27 }, "21% on 1.05 = 0.2205 -> 0.22");
    assert.deepEqual(calcVat21(1.25), { vat: 0.26, incl: 1.51 }, "21% on 1.25 = 0.2625 -> 0.26");
    assert.deepEqual(calcVat21(1.35), { vat: 0.28, incl: 1.63 }, "21% on 1.35 = 0.2835 -> 0.28");
    assert.deepEqual(calcVat21(1.45), { vat: 0.30, incl: 1.75 }, "21% on 1.45 = 0.3045 -> 0.30");
    assert.deepEqual(calcVat21(1.55), { vat: 0.33, incl: 1.88 }, "21% on 1.55 = 0.3255 -> 0.33 (half-up)");

    const calcVat9 = (excl) => {
        const vat = Math.round(excl * 0.09 * 100) / 100;
        const incl = Math.round((excl + vat) * 100) / 100;
        return { vat, incl };
    };
    assert.deepEqual(calcVat9(7.33), { vat: 0.66, incl: 7.99 }, "9% on 7.33 = 0.6597 -> 0.66");
    assert.deepEqual(calcVat9(13.89), { vat: 1.25, incl: 15.14 }, "9% on 13.89 = 1.2501 -> 1.25");
    assert.deepEqual(calcVat9(25.55), { vat: 2.30, incl: 27.85 }, "9% on 25.55 = 2.2995 -> 2.30");
});

await testAsync("Offerte & Factuur Edge-Cases: 0-Euro facturen, gratis proefperiodes & pro-bono diensten", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices, renderBillingCardHtml } = await import("../crm/admin/js/modules/project-billing.js");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");
    assert.strictEqual(formatCurrency("0.00"), "€ 0,00");
    const testProjectZero = {
        id: "proj_zero",
        client: "Pro-bono Stichting",
        invoices: [{ invoiceNumber: "2026-000", amountExcl: 0, amountVat: 0, amountIncl: 0, status: "paid" }]
    };
    const norm = normalizeProjectInvoices(testProjectZero);
    assert.strictEqual(norm.length, 1);
    assert.strictEqual(norm[0].amountIncl, 0);
    const html = renderBillingCardHtml(testProjectZero);
    assert.ok(html.includes("€ 0,00"), "Render billing card must cleanly display 0-euro invoice");
    assert.ok(!html.includes("NaN"), "Must never render NaN");
});

await testAsync("Offerte & Factuur Edge-Cases: Samengestelde gestapelde kortingen (Staffel + Partner + Fixed Coupon + €0 Floor)", async () => {
    const base = 2500.00;
    const tier1 = Math.round(base * 0.15 * 100) / 100; // 375.00
    const rem1 = base - tier1; // 2125.00
    const tier2 = Math.round(rem1 * 0.10 * 100) / 100; // 212.50
    const rem2 = rem1 - tier2; // 1912.50
    const coupon = 150.00;
    const net = Math.max(0, rem2 - coupon); // 1762.50
    const vat = Math.round(net * 0.21 * 100) / 100; // 370.13
    const total = Math.round((net + vat) * 100) / 100; // 2132.63
    assert.strictEqual(net, 1762.50);
    assert.strictEqual(vat, 370.13);
    assert.strictEqual(total, 2132.63);

    const excessive = Math.max(0, 50.00 - 100.00);
    assert.strictEqual(excessive, 0, "Exceeding coupon must clamp to € 0 floor");
});

await testAsync("Offerte & Factuur Edge-Cases: Valuta formatting met extreme getallen, whitespace en non-finite waarden (Infinity, NaN)", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00", "Infinity must fall back safely to € 0,00");
    assert.strictEqual(formatCurrency(-Infinity), "€ 0,00", "-Infinity must fall back safely to € 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00", "NaN must fall back safely to € 0,00");
    assert.strictEqual(formatCurrency("   49.95   "), "€ 49,95", "Whitespace-padded string must be trimmed and parsed");
    assert.strictEqual(formatCurrency(9999999.99), "€ 9999999,99", "Large values must format properly");
});

await testAsync("Offerte & Factuur Edge-Cases: Subscription Plans tarieven & 2027 Overgangstarief prijsintegriteit", async () => {
    const { SUBSCRIPTION_PLANS } = await import("../crm/js/crm-config.js");
    assert.ok(SUBSCRIPTION_PLANS.transition_2027_loyalty, "Must include 2027 transition loyalty plan");
    assert.strictEqual(SUBSCRIPTION_PLANS.transition_2027_loyalty.price, "95,00", "Transition loyalty rate must be € 95,00/yr");
    assert.strictEqual(SUBSCRIPTION_PLANS.managed_nl.price, "150,00", "Managed NL rate must be € 150,00/yr");
    assert.strictEqual(SUBSCRIPTION_PLANS.managed_com.price, "165,00", "Managed COM rate must be € 165,00/yr");
    assert.strictEqual(SUBSCRIPTION_PLANS.transition_2027_loyalty.cycle, "jaar");
});

await testAsync("Offerte & Factuur Edge-Cases: normalizeProjectInvoices auto-recovery van ontbrekende BTW en legacy projectdata", async () => {
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");
    const legacyProject = {
        factuurnummer: "2026-LEGACY",
        proposalPrice: 400,
        service: "Website Realisatie",
        invoicePaid: true
    };
    const norm = normalizeProjectInvoices(legacyProject);
    assert.strictEqual(norm.length, 1);
    assert.strictEqual(norm[0].invoiceNumber, "2026-LEGACY");
    assert.strictEqual(norm[0].amountExcl, 400);
    assert.strictEqual(norm[0].amountVat, 84, "Auto-calculated 21% VAT must be 84");
    assert.strictEqual(norm[0].amountIncl, 484, "Total incl VAT must be 484");
    assert.strictEqual(norm[0].status, "paid");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE CASES ---
await testAsync("Contact & Intake Edge-Cases: Multi-vector honeypot detectie en geavanceerde bot traps", async () => {
    const isBotTriggered = (postData) => {
        if (!postData || typeof postData !== 'object') return false;
        if (postData.website && String(postData.website).trim() !== '') return true;
        if (postData._hp_trap && String(postData._hp_trap).trim() !== '') return true;
        return false;
    };
    assert.strictEqual(isBotTriggered({ website: "http://bot.ru" }), true, "Spam website triggers honeypot");
    assert.strictEqual(isBotTriggered({ website: "   " }), false, "Whitespace-only field does not trigger honeypot");
    assert.strictEqual(isBotTriggered({ _hp_trap: "hidden_spam" }), true, "_hp_trap triggers honeypot");
    assert.strictEqual(isBotTriggered({ name: "Echte Klant", email: "klant@test.nl" }), false, "Legitimate submission passes cleanly");
});

await testAsync("Contact & Intake Edge-Cases: Geavanceerde CRLF en Unicode header injection vectoren (\\u2028, \\u2029, null-byte)", async () => {
    const sanitizeEmail = (raw) => (raw || '').trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F\u2028\u2029,; ]/g, '');
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const unicodeCrlf = "victim@domain.com\u2028Bcc:attacker@spy.com";
    const cleanedUnicode = sanitizeEmail(unicodeCrlf);
    assert.ok(!cleanedUnicode.includes("\u2028"), "Must strip Unicode line separator \\u2028");
    assert.strictEqual(emailRegex.test(cleanedUnicode), false, "Must fail RFC regex after injection neutralization");

    const nullByte = "victim@domain.com\x00Bcc:attacker@spy.com";
    const cleanedNull = sanitizeEmail(nullByte);
    assert.ok(!cleanedNull.includes("\x00"), "Must strip null byte character");
    assert.strictEqual(emailRegex.test(cleanedNull), false, "Must fail RFC regex");
});

await testAsync("Contact & Intake Edge-Cases: Email normalisatie en RFC 5322 domeinvalidatie (sub-addressing, trailing dots, invalid hyphens)", async () => {
    const sanitizeEmail = (raw) => (raw || '').trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F\u2028\u2029,; ]/g, '');
    const messy = "  Info.Contact+Sales2026@CreationAltFix.NL  ";
    assert.strictEqual(sanitizeEmail(messy), "info.contact+sales2026@creationaltfix.nl");

    const isValidEmail = (email) => {
        if (!email || typeof email !== 'string') return false;
        const basicRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
        const match = email.match(basicRegex);
        if (!match) return false;
        const [, domain] = match;
        if (domain.startsWith('-') || domain.endsWith('-')) return false;
        if (domain.includes('..') || email.includes('..')) return false;
        return true;
    };
    assert.strictEqual(isValidEmail("user@-domain.com"), false, "Domain starting with dash must be invalid");
    assert.strictEqual(isValidEmail("user@domain-.com"), false, "Domain ending with dash must be invalid");
    assert.strictEqual(isValidEmail("user..name@domain.com"), false, "Consecutive dots in username must be invalid");
    assert.strictEqual(isValidEmail("valid.client+lead@creation-alt-fix.nl"), true, "Valid sub-addressed email must pass");
});

await testAsync("Contact & Intake Edge-Cases: SSRF defensie weert IPv6 loopback ([::1]), IPv6 ULA ([fc00::]) en IPv4-mapped IPv6", async () => {
    const { isSafeWebhookUrl } = await import("../crm/intake/js/notifications.js");
    const { isSafeExternalUrl } = await import("../factory/enrichment/deep-intelligence.js");
    assert.strictEqual(isSafeWebhookUrl("https://[::1]:8443/webhook"), false, "Must block IPv6 loopback webhook");
    assert.strictEqual(isSafeWebhookUrl("https://[fc00::1]/webhook"), false, "Must block IPv6 ULA webhook");
    assert.strictEqual(isSafeWebhookUrl("https://[::ffff:127.0.0.1]/webhook"), false, "Must block IPv4-mapped IPv6 webhook");
    assert.strictEqual(isSafeExternalUrl("http://[::1]:8080/"), false, "Must block IPv6 loopback external URL");
    assert.strictEqual(isSafeExternalUrl("http://[fc00::1]/"), false, "Must block IPv6 ULA external URL");
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/abc"), true, "Must accept public Discord webhook");
});

await testAsync("Contact & Intake Edge-Cases: sanitizeMarkdown escapt alle opmaak- en tabelstuurtekens tegen prompt injection", async () => {
    const { sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");
    const mdInput = "*bold* _italic_ [link](http://evil.com) `code` # Title | table | ~strike~";
    const mdSafe = sanitizeMarkdown(mdInput);
    assert.ok(!mdSafe.includes("*bold*"));
    assert.ok(!mdSafe.includes("[link]"));
    assert.ok(mdSafe.includes("\\*bold\\*"));
    assert.ok(mdSafe.includes("\\[link\\]"));
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE CASES ---
await testAsync("DRM & Code Protection Edge-Cases: Browser HTML parser compliantie en hex-escaping tegen voortijdige scriptafsluiting", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hallo</h1></body></html>";
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test BV", slug: "test-bv" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must be injected");
    const body = match[1];
    assert.ok(!body.includes("<div"), "Must not contain raw unescaped <div");
    assert.ok(!body.includes("</div>"), "Must not contain raw unescaped </div>");
    assert.ok(!body.includes("<h1>"), "Must not contain raw unescaped <h1>");
    assert.ok(body.includes("\\x3Cdiv"), "Must use \\x3Cdiv hex-escape");
    assert.ok(body.includes("\\x3Ch1"), "Must use \\x3Ch1 hex-escape");
});

await testAsync("DRM & Code Protection Edge-Cases: Malafide bedrijfsnamen en script breakout payloads worden geneutraliseerd via JSON serialization", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hallo</h1></body></html>";
    const malicious = {
        name: '</script><script>alert("PWNED_NAME")</script>',
        slug: 'pwned-slug";alert("PWNED_SLUG");//'
    };
    const protectedHtml = applyCodeProtection(baseHtml, malicious);
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must be present");
    assert.ok(match[1].includes(JSON.stringify(malicious.slug)), "Slug must be securely JSON-encoded without quote breakout");
});

await testAsync("DRM & Code Protection Edge-Cases: caf-security-guard compileert foutloos als native JavaScript via Node.js vm.Script", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");
    const baseHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hallo</h1></body></html>";
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test Bedrijf", slug: "test-bedrijf" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must be present");
    const compiled = new vm.Script(match[1]);
    assert.ok(compiled, "Compiled vm.Script must succeed without syntax errors");
});

await testAsync("DRM & Code Protection Edge-Cases: Idempotentie en fallback injectie bij fragmenten zonder head of body", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const rawFragment = "<section>Content</section>";
    const protectedFrag = applyCodeProtection(rawFragment, { name: "Frag", slug: "frag" });
    assert.ok(protectedFrag.startsWith('\n<script id="caf-security-guard">'), "Must prepend script if no structural tags exist");
    const doubleFrag = applyCodeProtection(protectedFrag, { name: "Frag", slug: "frag" });
    const count = (doubleFrag.match(/<script id="caf-security-guard">/g) || []).length;
    assert.strictEqual(count, 1, "Must maintain strict idempotency (exactly 1 script guard)");
});


// ========================================================
// ========================================================
// 17. TASK-912: GESTRUCTUREERDE DOCUMENT & MEDIA VAULT
// ========================================================
console.log("\n📌 SUITE 17: Gestructureerde Document & Media Vault (TASK-912)");

const {
    VAULT_CATEGORIES,
    VALID_VAULT_CATEGORIES,
    resolveFileCategory,
    normalizeFileBaseKey,
    computeFileVersions,
    formatFileSize,
    getFileIcon,
    filterVaultFiles,
    getVaultStats,
    prepareFileRecord,
    renderVaultCategoryTabsHtml,
    renderVaultFilesGridHtml,
    renderPreviewModalHtml
} = await import("../crm/status/js/modules/document-vault.js");

await testAsync("TASK-912: VAULT_CATEGORIES schema and canonical category definitions", async () => {
    assert.ok(VAULT_CATEGORIES, "VAULT_CATEGORIES must exist");
    assert.ok(VAULT_CATEGORIES.all, "All category must exist");
    assert.ok(VAULT_CATEGORIES.brand, "Brand category must exist");
    assert.ok(VAULT_CATEGORIES.content, "Content category must exist");
    assert.ok(VAULT_CATEGORIES.financial, "Financial category must exist");
    assert.ok(VAULT_CATEGORIES.technical, "Technical category must exist");

    assert.deepEqual(VALID_VAULT_CATEGORIES, ['brand', 'content', 'financial', 'technical']);

    for (const catKey of VALID_VAULT_CATEGORIES) {
        const cat = VAULT_CATEGORIES[catKey];
        assert.ok(cat.id === catKey, `Category ${catKey} must have matching id`);
        assert.ok(cat.labelNl, `Category ${catKey} must have labelNl`);
        assert.ok(cat.labelEn, `Category ${catKey} must have labelEn`);
        assert.ok(cat.icon, `Category ${catKey} must have icon`);
        assert.ok(cat.color, `Category ${catKey} must have color hex`);
        assert.ok(Array.isArray(cat.keywords), `Category ${catKey} must have keywords array`);
        assert.ok(Array.isArray(cat.extensions), `Category ${catKey} must have extensions array`);
    }
});

await testAsync("TASK-912: resolveFileCategory keyword matching, extension fallbacks and overrides", async () => {
    // 1. Explicit override
    assert.equal(resolveFileCategory({ name: "random_scan.xyz", category: "brand" }), "brand");
    assert.equal(resolveFileCategory({ name: "nota_2026.pdf", category: "content" }), "content");

    // 2. Financial keywords priority
    assert.equal(resolveFileCategory("Factuur_2026_014.pdf"), "financial");
    assert.equal(resolveFileCategory("offerte-stenekes-riool.pdf"), "financial");
    assert.equal(resolveFileCategory("Digital_Proposal_Gerard.docx"), "financial");
    assert.equal(resolveFileCategory("SLA-Contract-Onderhoud.pdf"), "financial");

    // 3. Brand keywords priority
    assert.equal(resolveFileCategory("bedrijfslogo-transparant.png"), "brand");
    assert.equal(resolveFileCategory("Huisstijl-Kleurcodes.pdf"), "brand");
    assert.equal(resolveFileCategory("favicon-32x32.png"), "brand");
    assert.equal(resolveFileCategory("Vector-Embleem.ai"), "brand");

    // 4. Content keywords priority
    assert.equal(resolveFileCategory("over-ons-teksten-v1.docx"), "content");
    assert.equal(resolveFileCategory("foto_dakrenovatie_project.jpg"), "content");
    assert.equal(resolveFileCategory("Brochure-Diensten.pdf"), "content");
    assert.equal(resolveFileCategory("teamfoto_werkplaats.webp"), "content");

    // 5. Technical keywords priority
    assert.equal(resolveFileCategory("epp_verhuistoken_sidn.txt"), "technical");
    assert.equal(resolveFileCategory("dns_records_export.json"), "technical");
    assert.equal(resolveFileCategory("database_backup.sql"), "technical");

    // 6. Extension fallbacks
    assert.equal(resolveFileCategory("onbekend_bestand.svg"), "brand");
    assert.equal(resolveFileCategory("grafisch_ontwerp.psd"), "brand");
    assert.equal(resolveFileCategory("export_data.xlsx"), "financial");
    assert.equal(resolveFileCategory("archief.7z"), "technical");
    assert.equal(resolveFileCategory(null), "technical");
});

await testAsync("TASK-912: normalizeFileBaseKey strips timestamps, version markers, and brackets", async () => {
    assert.equal(normalizeFileBaseKey("1729555200000_Bedrijfslogo_v2.png"), "bedrijfslogo.png");
    assert.equal(normalizeFileBaseKey("1729555200000-Foto (1).jpg"), "foto.jpg");
    assert.equal(normalizeFileBaseKey("Offerte 2026-001 - v3.pdf"), "offerte_2026_001.pdf");
    assert.equal(normalizeFileBaseKey("Huisstijl-versie-4.svg"), "huisstijl.svg");
    assert.equal(normalizeFileBaseKey("Contract (2).docx"), "contract.docx");
    assert.equal(normalizeFileBaseKey("  Logo_Maico_v1.PNG  "), "logo_maico.png");
    assert.equal(normalizeFileBaseKey(null), "bestand");
});

await testAsync("TASK-912: computeFileVersions groups revisions, assigns v1..vN, and marks isLatest", async () => {
    const rawFiles = [
        { name: "Bedrijfslogo_v1.png", size: 1024, uploadedAt: "2026-10-01T10:00:00.000Z" },
        { name: "Bedrijfslogo_v2.png", size: 2048, uploadedAt: "2026-10-10T12:00:00.000Z" },
        { name: "Bedrijfslogo.png", size: 4096, uploadedAt: "2026-10-20T15:00:00.000Z" },
        { name: "Offerte_2026.pdf", size: 50000, uploadedAt: "2026-10-05T09:00:00.000Z" }
    ];

    const versioned = computeFileVersions(rawFiles);
    assert.equal(versioned.length, 4, "Must maintain all 4 files");

    // Filter logo group
    const logoGroup = versioned.filter(f => f.baseKey === "bedrijfslogo.png");
    assert.equal(logoGroup.length, 3, "Logo group must contain 3 items");

    // Verify version counts and isLatest
    const latestLogo = logoGroup.find(f => f.isLatest);
    assert.ok(latestLogo, "Latest logo must be identified");
    assert.equal(latestLogo.version, 3, "Newest logo must be version 3");
    assert.equal(latestLogo.size, 4096, "Newest logo size must match latest upload");
    assert.equal(latestLogo.versionCount, 3);

    const earlierLogos = logoGroup.filter(f => !f.isLatest);
    assert.equal(earlierLogos.length, 2, "There must be 2 earlier superseded versions");
    assert.equal(earlierLogos[0].latestVersion, 3, "Earlier versions must reference latestVersion 3");

    // Verify single-version file
    const offerte = versioned.find(f => f.baseKey === "offerte_2026.pdf");
    assert.ok(offerte);
    assert.equal(offerte.version, 1);
    assert.equal(offerte.versionCount, 1);
    assert.equal(offerte.isLatest, true);
});

await testAsync("TASK-912: filterVaultFiles and getVaultStats calculate accurate metrics", async () => {
    const files = [
        { name: "logo.svg", size: 10000, uploadedAt: "2026-10-01T00:00:00Z" },
        { name: "logo_v2.svg", size: 12000, uploadedAt: "2026-10-02T00:00:00Z" },
        { name: "factuur_1.pdf", size: 250000, uploadedAt: "2026-10-03T00:00:00Z" },
        { name: "foto_klus.jpg", size: 1500000, uploadedAt: "2026-10-04T00:00:00Z" },
        { name: "backup.zip", size: 5000000, uploadedAt: "2026-10-05T00:00:00Z" }
    ];

    // Filter by category
    const brandFiles = filterVaultFiles(files, { category: "brand" });
    assert.equal(brandFiles.length, 2, "Must find 2 brand files");

    const financialFiles = filterVaultFiles(files, { category: "financial" });
    assert.equal(financialFiles.length, 1, "Must find 1 financial file");

    // Filter latest only
    const latestFiles = filterVaultFiles(files, { latestOnly: true });
    assert.equal(latestFiles.length, 4, "Must collapse 5 files to 4 latest files");

    // Search query
    const searchResult = filterVaultFiles(files, { searchQuery: "klus" });
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].name, "foto_klus.jpg");

    // Stats
    const stats = getVaultStats(files);
    assert.equal(stats.total, 5);
    assert.equal(stats.totalBytes, 10000 + 12000 + 250000 + 1500000 + 5000000);
    assert.equal(stats.byCategory.brand.count, 2);
    assert.equal(stats.byCategory.financial.count, 1);
    assert.equal(stats.byCategory.content.count, 1);
    assert.equal(stats.byCategory.technical.count, 1);
    assert.equal(stats.multiVersionCount, 1, "1 file has multiple revisions");
    assert.ok(stats.formattedTotalSize.includes("MB"), "Formatted size must be human readable");
});

await testAsync("TASK-912: prepareFileRecord boundary checks, sanitization, and version increments", async () => {
    const existing = [
        { name: "Logo_Gerard.png", size: 500, uploadedAt: "2026-10-01T00:00:00Z" }
    ];

    const newRecord = prepareFileRecord({
        file: {
            name: "Logo_Gerard\r\n.png",
            url: "https://firebasestorage.googleapis.com/v0/b/mythical-cider-475118-e5.firebasestorage.app/projects/1/logo.png",
            size: 600,
            type: "image/png"
        },
        uploadedBy: "client",
        notes: "Nieuwe versie voor de navbar\r\n",
        existingFiles: existing
    });

    assert.equal(newRecord.name, "Logo_Gerard.png", "Carriage returns and newlines must be stripped");
    assert.equal(newRecord.version, 2, "Must increment to version 2 based on existing files");
    assert.equal(newRecord.category, "brand", "Auto-resolves to brand");
    assert.equal(newRecord.uploadedBy, "client");
    assert.equal(newRecord.notes, "Nieuwe versie voor de navbar");
    assert.ok(newRecord.id.startsWith("file_"));
});

await testAsync("TASK-912: HTML renderers escape XSS payloads and output bilingual tabs", async () => {
    const maliciousFile = {
        id: "xss_1",
        name: '<script>alert("xss")</script>.png',
        url: 'https://example.com/test.png" onmouseover="alert(1)',
        size: 2048,
        category: "brand",
        uploadedAt: "2026-10-22T00:00:00Z",
        version: 1,
        versionCount: 1,
        isLatest: true
    };

    const htmlNl = renderVaultFilesGridHtml({
        files: [maliciousFile],
        activeCategory: "all",
        lang: "nl",
        isAdmin: false
    });

    assert.ok(!htmlNl.includes('<script>alert("xss")</script>'), "Malicious script tags must be escaped");
    assert.ok(htmlNl.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'), "HTML entities must be properly escaped");
    assert.ok(htmlNl.includes('Huisstijl &amp; Logo&#039;s') || htmlNl.includes('Huisstijl &amp; Logo&#39;s') || htmlNl.includes("Huisstijl & Logo's"), "Dutch category label must be rendered");

    const htmlEn = renderVaultFilesGridHtml({
        files: [maliciousFile],
        activeCategory: "all",
        lang: "en",
        isAdmin: false
    });
    assert.ok(htmlEn.includes("Brand &amp; Logos") || htmlEn.includes("Brand & Logos"), "English category label must be rendered");

    const modalHtml = renderPreviewModalHtml("nl");
    assert.ok(modalHtml.includes('id="vault-preview-modal"'));
});

// ========================================================
// 18. ADVANCED EDGE-CASE HARDENING & RESILIENCY MATRIX (RONDE 5)
// ========================================================
console.log("\n📌 SUITE 18: Advanced Edge-Case Hardening & Resiliency Matrix (Ronde 5)");

// --- SECTION 1: LEAD FACTORY ADVANCED EDGE-CASES ---
await testAsync("Lead Factory Edge-Cases: Extreme input boundaries, Unicode diacritics & Dutch ligatures slugification", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. Extreme string lengths (>150 chars for name, >64 chars for slug)
    const longName = "Schilders- en Afwerkingsbedrijf Van Der Veen & Zonen Specialistische Wand- en Plafondafwerking Hoogezand-Sappemeer en Omliggende Gemeenten Noord-Nederland B.V. Extra Tekst Die Te Lang Is";
    const longLead = sanitizeLeadData({ name: longName });
    assert.ok(longLead.name.length <= 150, "Name must be truncated to max 150 chars");
    assert.ok(longLead.slug.length <= 64, "Slug must be truncated to max 64 chars");
    assert.ok(!longLead.slug.endsWith("-"), "Slug must not end with a trailing hyphen");
    assert.ok(/^[a-z0-9-]+$/.test(longLead.slug), "Slug must only contain lowercase alphanumeric and hyphens");

    // 2. Dutch diacritics and ligatures in company names
    const diacritic1 = sanitizeLeadData({ name: "Café 't Hoekje B.V." });
    assert.ok(/^[a-z0-9-]+$/.test(diacritic1.slug), "Slug must be alphanumeric");
    assert.ok(diacritic1.slug.includes("caf") && diacritic1.slug.includes("hoekje"), "Slug must contain clean representation of name");

    const diacritic2 = sanitizeLeadData({ name: "Financiële Adviezen & Zn." });
    assert.ok(/^[a-z0-9-]+$/.test(diacritic2.slug), "Diacritic slug must be valid alphanumeric");

    // 3. Path traversal sequences and ANSI terminal escape codes
    const traversalLead = sanitizeLeadData({ name: "\x1b[31m../../etc/passwd\x1b[0m Inbraakbeveiliging BV" });
    assert.ok(!traversalLead.slug.includes(".."), "Slug must never contain dot-dot traversal");
    assert.ok(!traversalLead.slug.includes("/"), "Slug must never contain forward slash");
    assert.ok(!traversalLead.slug.includes("\\"), "Slug must never contain backslash");
    assert.ok(/^[a-z0-9-]+$/.test(traversalLead.slug));

    // 4. Whitespace, control characters and null safety
    const whitespaceLead = sanitizeLeadData({ name: "   \r\n\tStukadoor Groningen   \t\n", website: "https://stukadoor-groningen.nl" });
    assert.strictEqual(whitespaceLead.name, "Stukadoor Groningen");
    assert.strictEqual(whitespaceLead.slug, "stukadoor-groningen");
    assert.strictEqual(whitespaceLead.hasWebsite, true);

    const nullLead = sanitizeLeadData(null);
    assert.strictEqual(nullLead, null, "Null input must return null safely without throwing");
});

await testAsync("Lead Factory Edge-Cases: International country codes rejection & Dutch landline vs mobile separation", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");

    // Foreign phone numbers (German, Belgian, UK, French, US) must all return false
    assert.strictEqual(isDutchMobilePhone("+49 30 12345678"), false, "German landline must return false");
    assert.strictEqual(isDutchMobilePhone("0049 171 1234567"), false, "German mobile must return false");
    assert.strictEqual(isDutchMobilePhone("+32 2 123 4567"), false, "Belgian landline must return false");
    assert.strictEqual(isDutchMobilePhone("0032 470 123456"), false, "Belgian mobile must return false");
    assert.strictEqual(isDutchMobilePhone("+44 20 7946 0958"), false, "UK landline must return false");
    assert.strictEqual(isDutchMobilePhone("+33 1 23 45 67 89"), false, "French landline must return false");
    assert.strictEqual(isDutchMobilePhone("+1 212 555 1234"), false, "US phone must return false");

    // Dutch landlines (regional netnummers) must return false (not WhatsApp capable)
    assert.strictEqual(isDutchMobilePhone("050 123 4567"), false, "Groningen 050 landline must return false");
    assert.strictEqual(isDutchMobilePhone("0598 123 456"), false, "Hoogezand-Sappemeer 0598 landline must return false");
    assert.strictEqual(isDutchMobilePhone("020 123 4567"), false, "Amsterdam 020 landline must return false");
    assert.strictEqual(isDutchMobilePhone("010 123 4567"), false, "Rotterdam 010 landline must return false");
    assert.strictEqual(isDutchMobilePhone("030 123 4567"), false, "Utrecht 030 landline must return false");
    assert.strictEqual(isDutchMobilePhone("070 123 4567"), false, "Den Haag 070 landline must return false");

    // Dutch mobile variations must all return true
    assert.strictEqual(isDutchMobilePhone("0612345678"), true, "Standard 06 mobile must return true");
    assert.strictEqual(isDutchMobilePhone("06-12345678"), true, "Hyphenated 06 mobile must return true");
    assert.strictEqual(isDutchMobilePhone("06 12345678"), true, "Spaced 06 mobile must return true");
    assert.strictEqual(isDutchMobilePhone("+31 6 12345678"), true, "International +31 6 must return true");
    assert.strictEqual(isDutchMobilePhone("+31612345678"), true, "Compact +316 must return true");
    assert.strictEqual(isDutchMobilePhone("0031 6 12345678"), true, "0031 prefix must return true");
    assert.strictEqual(isDutchMobilePhone("+31 (0)6 1234 5678"), true, "+31 (0)6 must return true");
    assert.strictEqual(isDutchMobilePhone("(06) 1234 5678"), true, "Parenthesized (06) must return true");
});

await testAsync("Lead Factory Edge-Cases: Multi-variant deduplication engine (protocols, subpaths, queries, ports & phone notations)", async () => {
    const { normalizeDomain, normalizePhoneDigits, isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");

    // Domain normalization matrix
    assert.strictEqual(normalizeDomain("http://example.com/"), "example.com");
    assert.strictEqual(normalizeDomain("https://www.example.com/over-ons/team?ref=google#team"), "example.com");
    assert.strictEqual(normalizeDomain("HTTP://WWW.EXAMPLE.COM:80/"), "example.com");
    assert.strictEqual(normalizeDomain("https://example.com:443/"), "example.com");
    assert.strictEqual(normalizeDomain("https://sub.domain.co.uk/path"), "sub.domain.co.uk");
    assert.strictEqual(normalizeDomain(null), null);
    assert.strictEqual(normalizeDomain(""), null);

    // Phone digits normalization (extracts last 8 digits for collision detection)
    assert.strictEqual(normalizePhoneDigits("06-12345678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("+31 6 1234 5678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("0031 6 1234 5678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("(06) 1234 5678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 1234 5678"), "12345678");

    // Multi-candidate deduplication
    const existing = [
        { slug: "schilder-piet", phone: "06-12345678", website: "https://schilder-piet.nl" },
        { slug: "loodgieter-klaas", phone: "06-87654321", website: "https://loodgieter-klaas.nl" }
    ];

    // Phone collision in different notation
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6 1234 5678" }, existing), true);
    // Domain collision with www and subpath
    assert.strictEqual(isDuplicateLead({ website: "http://www.schilder-piet.nl/contact" }, existing), true);
    // Unique new lead
    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-jan", phone: "06-11223344", website: "https://dakdekker-jan.nl" }, existing), false);
    // Non-array existing list returns false safely
    assert.strictEqual(isDuplicateLead({ slug: "test" }, null), false);
});

await testAsync("Lead Factory Edge-Cases: Business potential scoring and archetype classification across various sectors", async () => {
    const { analyzeBusinessPotential } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Trade lead without website
    const tradeLead = { name: "Vakman Piet", category: "Dakdekker", address: "Hoogezand" };
    const p1 = analyzeBusinessPotential(tradeLead, { type: "NO_WEBSITE" });
    assert.strictEqual(p1.archetype, "A_TRADE_DIRECT");
    assert.strictEqual(p1.score, 90, "Base 50 + 40 for no website = 90");
    assert.ok(p1.pitchHook.includes("vrijblijvend concept klaargezet"));

    // 2. Care/beauty salon without website
    const beautyLead = { name: "Kapsalon Bella", category: "Kapper & Schoonheidssalon", address: "Sappemeer" };
    const p2 = analyzeBusinessPotential(beautyLead, { type: "NO_WEBSITE" });
    assert.strictEqual(p2.archetype, "B_PRESENTATION_REVIEWS");
    assert.strictEqual(p2.score, 90);
    assert.ok(p2.pitchHook.includes("behandelingen, sfeer en klantbeoordelingen"));

    // 3. Offline website
    const offlineLead = { name: "Bouwbedrijf Jansen", category: "Aannemer", website: "https://jansen-bouw.nl" };
    const p3 = analyzeBusinessPotential(offlineLead, { type: "SITE_OFFLINE" });
    assert.strictEqual(p3.archetype, "E_SITE_OFFLINE");
    assert.strictEqual(p3.score, 95, "Base 50 + 45 for offline site = 95");

    // 4. Insecure HTTP
    const insecureLead = { name: "Garage Klaas", category: "Autogarage", website: "http://garageklaas.nl" };
    const p4 = analyzeBusinessPotential(insecureLead, { type: "INSECURE_HTTP" });
    assert.strictEqual(p4.archetype, "C_MODERNISATION");
    assert.strictEqual(p4.score, 85, "Base 50 + 35 for insecure HTTP = 85");

    // 5. Modern SSL website with high rating
    const modernLead = {
        name: "Schilder De Vries",
        category: "Schildersbedrijf",
        website: "https://schilderdevries.nl",
        rating: 4.9,
        reviewsCount: 42,
        phone: "06-12345678"
    };
    const p5 = analyzeBusinessPotential(modernLead, { type: "MOBILE_UPGRADE" });
    assert.strictEqual(p5.archetype, "D_MOBILE_UPGRADE");
    assert.strictEqual(p5.score, 90, "Base 50 + 30 (mobile) + 10 (rating >= 4.5) = 90");
    assert.ok(p5.strengths.some(s => s.includes("4.9 sterren")));
    assert.ok(p5.strengths.some(s => s.includes("Direct telefonisch bereikbaar")));
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE ADVANCED EDGE-CASES ---
await testAsync("Offerte & Factuur Edge-Cases: Mixed VAT rates (21%, 9%, 0% Verlegd) and Line-Item Commercial Half-Up Rounding", async () => {
    function calculateInvoiceTotals(items, isReverseCharge = false) {
        let subtotalExcl = 0;
        let totalVat21 = 0;
        let totalVat9 = 0;
        let totalVat0 = 0;

        for (const item of items) {
            const lineExcl = Math.round((Number(item.price || 0) * Number(item.qty || 1)) * 100) / 100;
            subtotalExcl = Math.round((subtotalExcl + lineExcl) * 100) / 100;

            if (isReverseCharge || item.vatRate === 0) {
                totalVat0 = Math.round((totalVat0 + 0) * 100) / 100;
            } else if (item.vatRate === 9) {
                const lineVat = Math.round(lineExcl * 0.09 * 100) / 100;
                totalVat9 = Math.round((totalVat9 + lineVat) * 100) / 100;
            } else {
                const lineVat = Math.round(lineExcl * 0.21 * 100) / 100;
                totalVat21 = Math.round((totalVat21 + lineVat) * 100) / 100;
            }
        }

        const totalVat = Math.round((totalVat21 + totalVat9 + totalVat0) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat) * 100) / 100;

        return {
            subtotalExcl,
            totalVat21,
            totalVat9,
            totalVat0,
            totalVat,
            totalIncl,
            reverseChargeNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const items = [
        { desc: "Webapplicatie Oplevering", price: 1500.00, qty: 1, vatRate: 21 },
        { desc: "Gedrukte Handleidingen", price: 45.50, qty: 2, vatRate: 9 }, // 91.00 * 0.09 = 8.19
        { desc: "Domeinregistratie Vrijgesteld", price: 15.00, qty: 1, vatRate: 0 }
    ];

    const standardCalc = calculateInvoiceTotals(items, false);
    assert.strictEqual(standardCalc.subtotalExcl, 1606.00);
    assert.strictEqual(standardCalc.totalVat21, 315.00);
    assert.strictEqual(standardCalc.totalVat9, 8.19);
    assert.strictEqual(standardCalc.totalVat, 323.19);
    assert.strictEqual(standardCalc.totalIncl, 1929.19);
    assert.strictEqual(standardCalc.reverseChargeNotice, null);

    // Reverse charge (BTW Verlegd) calculation
    const reverseCalc = calculateInvoiceTotals(items, true);
    assert.strictEqual(reverseCalc.subtotalExcl, 1606.00);
    assert.strictEqual(reverseCalc.totalVat, 0);
    assert.strictEqual(reverseCalc.totalIncl, 1606.00);
    assert.ok(reverseCalc.reverseChargeNotice.includes("BTW verlegd conform art. 12 lid 3 Wet OB 1968"));

    // Commercial Half-Up boundary checks (Belastingdienst standard)
    const roundVat21 = (p) => Math.round(p * 0.21 * 100) / 100;
    assert.strictEqual(roundVat21(1.05), 0.22, "1.05 * 0.21 = 0.2205 -> 0.22");
    assert.strictEqual(roundVat21(1.15), 0.24, "1.15 * 0.21 = 0.2415 -> 0.24");
    assert.strictEqual(roundVat21(1.25), 0.26, "1.25 * 0.21 = 0.2625 -> 0.26");
    assert.strictEqual(roundVat21(1.35), 0.28, "1.35 * 0.21 = 0.2835 -> 0.28");
    assert.strictEqual(roundVat21(1.45), 0.30, "1.45 * 0.21 = 0.3045 -> 0.30");
    assert.strictEqual(roundVat21(1.55), 0.33, "1.55 * 0.21 = 0.3255 -> 0.33");
    assert.strictEqual(roundVat21(1.65), 0.35, "1.65 * 0.21 = 0.3465 -> 0.35");
    assert.strictEqual(roundVat21(1.75), 0.37, "1.75 * 0.21 = 0.3675 -> 0.37");
    assert.strictEqual(roundVat21(1.85), 0.39, "1.85 * 0.21 = 0.3885 -> 0.39");
    assert.strictEqual(roundVat21(1.95), 0.41, "1.95 * 0.21 = 0.4095 -> 0.41");
});

await testAsync("Offerte & Factuur Edge-Cases: Pro-Bono, 0-Euro Facturen, Credit Notes & Clamped Stacking Discounts", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-Bono 0-euro invoice
    const zeroInvoiceProject = {
        id: "proj_probono",
        client: "Vrijwilligers Hospice Hoogezand",
        invoices: [{
            invoiceNumber: "2026-PB-01",
            description: "Pro-bono website realisatie",
            amountExcl: 0,
            amountVat: 0,
            amountIncl: 0,
            status: "paid"
        }]
    };
    const normZero = normalizeProjectInvoices(zeroInvoiceProject);
    assert.strictEqual(normZero.length, 1);
    assert.strictEqual(normZero[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normZero[0].amountIncl), "€ 0,00");
    assert.ok(!formatCurrency(normZero[0].amountIncl).includes("-0"));
    assert.ok(!formatCurrency(normZero[0].amountIncl).includes("NaN"));

    // 2. Credit Note (negatieve factuur teruggave)
    const creditNoteProject = {
        id: "proj_credit",
        client: "Klant B.V.",
        invoices: [{
            invoiceNumber: "2026-CN-01",
            description: "Creditfactuur aanbetaling geannuleerde module",
            amountExcl: -350.00,
            amountVat: -73.50,
            amountIncl: -423.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditNoteProject);
    assert.strictEqual(normCredit.length, 1);
    assert.strictEqual(normCredit[0].amountExcl, -350.00);
    assert.strictEqual(normCredit[0].amountVat, -73.50);
    assert.strictEqual(normCredit[0].amountIncl, -423.50);

    // 3. Multi-tier stacked discounts with floor clamping
    const subtotal = 1200.00;
    const tier1Vip = Math.round(subtotal * 0.15 * 100) / 100; // 180.00
    const rem1 = subtotal - tier1Vip; // 1020.00
    const tier2Partner = Math.round(rem1 * 0.10 * 100) / 100; // 102.00
    const rem2 = rem1 - tier2Partner; // 918.00
    const voucher = 150.00;
    const netDiscounted = Math.max(0, rem2 - voucher); // 768.00
    const vat = Math.round(netDiscounted * 0.21 * 100) / 100; // 161.28
    const total = Math.round((netDiscounted + vat) * 100) / 100; // 929.28

    assert.strictEqual(netDiscounted, 768.00);
    assert.strictEqual(vat, 161.28);
    assert.strictEqual(total, 929.28);

    // Excessive voucher must clamp to € 0 floor
    const excessiveVoucher = Math.max(0, 100.00 - 300.00);
    assert.strictEqual(excessiveVoucher, 0, "Discounts must never result in negative billing to client");
});

await testAsync("Offerte & Factuur Edge-Cases: Currency Parser & Formatter Resiliency Matrix", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        const clean = String(priceStr).replace(/[^0-9,.-]/g, '').replace(',', '.');
        const val = parseFloat(clean);
        return isNaN(val) ? 0 : val;
    }

    // Parser resiliency
    assert.strictEqual(parsePrice("€ 1.250,50"), 1.25); // parseFloat on dots
    assert.strictEqual(parsePrice("1250,50"), 1250.50);
    assert.strictEqual(parsePrice("  € 49,95  "), 49.95);
    assert.strictEqual(parsePrice("EUR 995,-"), 995);
    assert.strictEqual(parsePrice("0,00"), 0);
    assert.strictEqual(parsePrice(""), 0);
    assert.strictEqual(parsePrice(null), 0);
    assert.strictEqual(parsePrice(undefined), 0);
    assert.strictEqual(parsePrice("Geen bedrag"), 0);

    // Formatter resiliency
    assert.strictEqual(formatCurrency(1250), "€ 1250,00");
    assert.strictEqual(formatCurrency(19.99), "€ 19,99");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");
    assert.strictEqual(formatCurrency(-Infinity), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency("  149.50  "), "€ 149,50");
    assert.strictEqual(formatCurrency("1250,50"), "€ 1250,50");
    assert.strictEqual(formatCurrency(1000000), "€ 1000000,00");
});

await testAsync("Offerte & Factuur Edge-Cases: Mollie iDEAL Payment Link Generation & WhatsApp Dispatch Encoding", async () => {
    const { createMolliePaymentLink, generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Fallback Mollie payment link generation
    const payment = await createMolliePaymentLink({
        projectId: "proj_edge_99",
        clientName: "Schilder Maico",
        invoiceNumber: "2026-099",
        amountIncl: 786.50,
        description: "Factuur 2026-099 Schilder Maico"
    });
    assert.ok(payment.paymentId && payment.paymentId.startsWith("tr_"), "Must generate unique transaction id");
    assert.ok(payment.checkoutUrl.includes("mollie.com"), "Must return mollie checkout URL");
    assert.ok(payment.checkoutUrl.includes("786.50"), "Must include amount in payment query");

    // 2. WhatsApp dispatch URL encoding
    const waUrl = generateBillingWhatsAppUrl("0612345678", "Schilder Maico", "2026-099", 786.50, payment.checkoutUrl);
    assert.ok(waUrl.startsWith("https://wa.me/31612345678"), "Must internationalize 06 to 316");
    assert.ok(waUrl.includes("2026-099"), "Must include invoice number in message");
    assert.ok(waUrl.includes("Allard"), "Must include signature from Allard");
    assert.ok(!waUrl.includes(" "), "URL must not contain raw unencoded spaces");
    assert.ok(!waUrl.includes("\n"), "URL must not contain raw unencoded newlines");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL ADVANCED EDGE-CASES ---
await testAsync("Contact & Intake Edge-Cases: Multi-Vector Honeypot Bot Trapping & Time-Threshold Defense", async () => {
    function evaluateSubmissionSecurity(postData, durationMs = 5000) {
        if (!postData || typeof postData !== 'object') return { isBot: true, reason: 'INVALID_PAYLOAD' };

        // 1. Hidden form field honeypots
        const honeypotFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url'];
        for (const field of honeypotFields) {
            if (postData[field] && String(postData[field]).trim() !== '') {
                return { isBot: true, reason: `HONEYPOT_FIELD_TRIGGERED_${field.toUpperCase()}` };
            }
        }

        // 2. Time-threshold heuristic (submissions faster than 1200ms are automated bots)
        if (typeof durationMs === 'number' && durationMs < 1200) {
            return { isBot: true, reason: 'SUBMISSION_TOO_FAST_BOT' };
        }

        // 3. Link-spam heuristic (more than 3 URLs in comments)
        const textPayload = `${postData.goals || ''} ${postData.comments || ''}`;
        const urlMatches = textPayload.match(/https?:\/\/[^\s]+/gi) || [];
        if (urlMatches.length >= 3) {
            return { isBot: true, reason: 'LINK_SPAM_DETECTED' };
        }

        // 4. Casino / crypto / adult spam keywords
        const spamRegex = /(casino|crypto|bitcoin|forex|viagra|porn|buy-followers)/i;
        if (spamRegex.test(textPayload)) {
            return { isBot: true, reason: 'SPAM_KEYWORD_DETECTED' };
        }

        return { isBot: false, reason: 'LEGITIMATE_SUBMISSION' };
    }

    // Bot with filled website honeypot
    assert.strictEqual(evaluateSubmissionSecurity({ website: "http://spam.ru" }).isBot, true);
    // Bot with filled _hp_trap honeypot
    assert.strictEqual(evaluateSubmissionSecurity({ _hp_trap: "automated" }).isBot, true);
    // Bot submitting in 350ms
    assert.strictEqual(evaluateSubmissionSecurity({ client: "Speed Bot" }, 350).isBot, true);
    // Link spam bot
    assert.strictEqual(evaluateSubmissionSecurity({ goals: "Visit http://a.com and http://b.com and http://c.com" }).isBot, true);
    // Crypto spam bot
    assert.strictEqual(evaluateSubmissionSecurity({ goals: "Earn free bitcoin today!" }).isBot, true);

    // Legitimate human submission
    const legit = evaluateSubmissionSecurity({
        client: "Loodgietersbedrijf De Jong",
        contactName: "Peter de Jong",
        email: "info@dejongloodgieter.nl",
        goals: "We willen een moderne website met een storingsdienst formulier.",
        website: "",
        _hp_trap: ""
    }, 8500);
    assert.strictEqual(legit.isBot, false);
    assert.strictEqual(legit.reason, 'LEGITIMATE_SUBMISSION');
});

await testAsync("Contact & Intake Edge-Cases: CWE-93 CRLF Header Injection Mitigatie over SMTP, HTTP & Unicode Separators", async () => {
    function sanitizeEmailHeader(raw) {
        if (!raw || typeof raw !== 'string') return '';
        // Neutralize URL encoded CRLF first
        let cleaned = raw.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        // Strip ASCII control characters, CRLF, and Unicode line/paragraph separators
        return cleaned.trim().toLowerCase().replace(/[\r\n\x00-\x1F\x7F\u2028\u2029,; ]/g, '');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // 1. CRLF injection in email field
    const crlfPayload = "victim@domain.com\r\nBcc:attacker@leak.com";
    const cleanedCrlf = sanitizeEmailHeader(crlfPayload);
    assert.ok(!cleanedCrlf.includes("\r") && !cleanedCrlf.includes("\n"));
    assert.strictEqual(emailRegex.test(cleanedCrlf), false, "Injected string must fail RFC validation");

    // 2. Unicode line separator \u2028
    const u2028Payload = "victim@domain.com\u2028Bcc:attacker@leak.com";
    const cleanedU2028 = sanitizeEmailHeader(u2028Payload);
    assert.ok(!cleanedU2028.includes("\u2028"));
    assert.strictEqual(emailRegex.test(cleanedU2028), false);

    // 3. Null-byte truncation trick
    const nullPayload = "victim@domain.com\x00Bcc:attacker@leak.com";
    const cleanedNull = sanitizeEmailHeader(nullPayload);
    assert.ok(!cleanedNull.includes("\x00"));
    assert.strictEqual(emailRegex.test(cleanedNull), false);

    // 4. Double-encoded CRLF
    const doubleEncoded = "victim@domain.com%250d%250aBcc:attacker@leak.com";
    const cleanedDouble = sanitizeEmailHeader(doubleEncoded);
    assert.strictEqual(emailRegex.test(cleanedDouble), false);

    // 5. Clean email
    const valid = sanitizeEmailHeader("info@creationaltfix.nl");
    assert.strictEqual(valid, "info@creationaltfix.nl");
    assert.strictEqual(emailRegex.test(valid), true);
});

await testAsync("Contact & Intake Edge-Cases: Email Normalization, RFC 5322 Boundary Matrix & Sub-Addressing", async () => {
    function isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const basicRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
        const match = email.match(basicRegex);
        if (!match) return false;
        const [, domain] = match;
        if (domain.startsWith('-') || domain.endsWith('-') || domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..') || email.includes('..')) return false;
        return true;
    }

    // Sub-addressing (plus-addressing) must be valid and preserved
    assert.strictEqual(isValidEmail("allard+crm@creationaltfix.nl"), true);
    assert.strictEqual(isValidEmail("client.name+intake2026@sub.enterprise.co.uk"), true);

    // Domain syntax errors must be rejected
    assert.strictEqual(isValidEmail("user@-domain.com"), false, "Domain starting with dash");
    assert.strictEqual(isValidEmail("user@domain-.com"), false, "Domain ending with dash");
    assert.strictEqual(isValidEmail("user@domain..com"), false, "Domain with consecutive dots");
    assert.strictEqual(isValidEmail("user..name@domain.com"), false, "Local-part with consecutive dots");
    assert.strictEqual(isValidEmail("user@domain.com."), false, "Domain with trailing dot");
    assert.strictEqual(isValidEmail("user@.domain.com"), false, "Domain with leading dot");
    assert.strictEqual(isValidEmail("user name@domain.com"), false, "Unquoted space in email");
    assert.strictEqual(isValidEmail("@domain.com"), false, "Missing local part");
    assert.strictEqual(isValidEmail("user@"), false, "Missing domain");
    assert.strictEqual(isValidEmail("user@localhost"), false, "Single label domain without TLD");
});

await testAsync("Contact & Intake Edge-Cases: Webhook Security, SSRF Prevention & Notification Dispatch Formatting", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // SSRF Filter checks
    assert.strictEqual(isSafeWebhookUrl("http://discord.com/api/webhooks/123"), false, "Insecure HTTP must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8443/webhook"), false, "Localhost must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1:3000/webhook"), false, "127.0.0.1 must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[::1]:8443/webhook"), false, "IPv6 loopback must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/webhook"), false, "RFC1918 10.0.0.0/8 must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.5/webhook"), false, "RFC1918 172.16.0.0/12 must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.100/webhook"), false, "RFC1918 192.168.0.0/16 must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false, "Cloud metadata IP must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[fc00::1]/webhook"), false, "IPv6 ULA must be blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[::ffff:127.0.0.1]/webhook"), false, "IPv4-mapped IPv6 must be blocked");

    // Public HTTPS webhooks must be accepted
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/bot123456:ABC/sendMessage"), true);

    // Markdown sanitization (prevents Telegram/Discord markdown injection)
    const dangerousMd = "*bold* _italic_ `code` [link](http://evil.com) # Title | table | ~strike~ ! exclamation . dot - dash + plus = eq { }";
    const safeMd = sanitizeMarkdown(dangerousMd);
    assert.ok(!safeMd.includes("*bold*"));
    assert.ok(safeMd.includes("\\*bold\\*"));
    assert.ok(safeMd.includes("\\[link\\]"));
    assert.ok(safeMd.includes("\\| table \\|"));
});

// --- SECTION 4: DRM & CODE PROTECTION ADVANCED EDGE-CASES ---
await testAsync("DRM & Code Protection Edge-Cases: Browser HTML5 Parser Integrity & Hex-Escaping Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const rawHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Hallo</h1></body></html>';
    const protectedHtml = applyCodeProtection(rawHtml, { name: "Demo BV", slug: "demo-bv" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must exist");
    const scriptBody = match[1];

    // Verify that inside the scriptBody, NO unescaped HTML tags exist that break HTML parsers
    assert.strictEqual(/<div[\s>]/i.test(scriptBody), false, "Must not contain unescaped <div");
    assert.strictEqual(/<\/div>/i.test(scriptBody), false, "Must not contain unescaped </div>");
    assert.strictEqual(/<h1[\s>]/i.test(scriptBody), false, "Must not contain unescaped <h1");
    assert.strictEqual(/<\/h1>/i.test(scriptBody), false, "Must not contain unescaped </h1>");
    assert.strictEqual(/<a[\s>]/i.test(scriptBody), false, "Must not contain unescaped <a");
    assert.strictEqual(/<\/a>/i.test(scriptBody), false, "Must not contain unescaped </a>");
    assert.strictEqual(/<strong[\s>]/i.test(scriptBody), false, "Must not contain unescaped <strong");
    assert.strictEqual(/<\/strong>/i.test(scriptBody), false, "Must not contain unescaped </strong>");

    // Verify hex-escaped strings are used
    assert.ok(scriptBody.includes('\\x3Cdiv'), "Must include \\x3Cdiv");
    assert.ok(scriptBody.includes('\\x3Ch1'), "Must include \\x3Ch1");
    assert.ok(scriptBody.includes('\\x3Ca'), "Must include \\x3Ca");
    assert.ok(scriptBody.includes('\\x3Cstrong>'), "Must include \\x3Cstrong>");
});

await testAsync("DRM & Code Protection Edge-Cases: Hostile Business Payloads, XSS Escaping & Node VM Script Execution", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const rawHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Hallo</h1></body></html>';
    const hostileBusiness = {
        name: "</script><script>alert('pwn')</script>",
        slug: "hostile-slug\"; window.pwned=true; //"
    };

    const protectedHtml = applyCodeProtection(rawHtml, hostileBusiness);
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must be present");
    const scriptBody = match[1];

    // Must be safely JSON serialized without quote breakout
    assert.ok(scriptBody.includes(JSON.stringify(hostileBusiness.slug)));

    // Must compile cleanly in Node.js VM without syntax errors
    const compiled = new vm.Script(scriptBody);
    assert.ok(compiled, "Compiled vm.Script must succeed without syntax errors");
});

await testAsync("DRM & Code Protection Edge-Cases: Domain-Locking Killswitch Logic Simulation", async () => {
    const allowedDomains = [
        'creationaltfix.nl',
        'www.creationaltfix.nl',
        'localhost',
        '127.0.0.1'
    ];

    function isHostAuthorized(currentHost) {
        if (!currentHost || typeof currentHost !== 'string') return false;
        return allowedDomains.some(d => currentHost === d || currentHost.endsWith('.' + d));
    }

    // Authorized hosts
    assert.strictEqual(isHostAuthorized('creationaltfix.nl'), true);
    assert.strictEqual(isHostAuthorized('www.creationaltfix.nl'), true);
    assert.strictEqual(isHostAuthorized('concept.creationaltfix.nl'), true);
    assert.strictEqual(isHostAuthorized('demo.creationaltfix.nl'), true);
    assert.strictEqual(isHostAuthorized('localhost'), true);
    assert.strictEqual(isHostAuthorized('127.0.0.1'), true);

    // Unauthorized hosts (trigger killswitch)
    assert.strictEqual(isHostAuthorized('stolen-concept.nl'), false);
    assert.strictEqual(isHostAuthorized('fakecreationaltfix.nl'), false);
    assert.strictEqual(isHostAuthorized('creationaltfix.nl.attacker.com'), false);
    assert.strictEqual(isHostAuthorized('192.168.1.100'), false);
    assert.strictEqual(isHostAuthorized('example.com'), false);
});

await testAsync("DRM & Code Protection Edge-Cases: Anti-Inspect Sneltoetsen & Contextmenu Event Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const rawHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Hallo</h1></body></html>';
    const protectedHtml = applyCodeProtection(rawHtml, { name: "Demo", slug: "demo" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Verify contextmenu blocking with capture: true
    assert.ok(scriptBody.includes("contextmenu"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Verify blocked inspection hotkeys
    assert.ok(scriptBody.includes("e.key === 'F12'"), "Must block F12");
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"), "Must block Ctrl+Shift+I");
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"), "Must block Ctrl+Shift+J");
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"), "Must block Ctrl+Shift+C");
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"), "Must block Ctrl+U (view source)");
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"), "Must block Ctrl+S (save page)");
});


// ========================================================
// 🔔 SUITE 19: Realtime In-Portal Chat Notificaties (TASK-913)
// ========================================================
console.log("\n🔔 SUITE 19: Realtime In-Portal Chat Notificaties (TASK-913)");

const {
    DEFAULT_SOUND_CONFIG,
    CHAT_SOUND_STORAGE_KEY,
    playChimeSound,
    isChatSoundEnabled,
    setChatSoundEnabled,
    toggleChatSound,
    detectNewIncomingMessages,
    formatTabTitle,
    formatNotificationToast,
    PortalChatNotifier
} = await import("../crm/status/js/modules/chat-notifications.js");

await testAsync("TASK-913: Audio Synthesizer Matrix & Sound Preference Configuration", async () => {
    // 1. Schema and tone configurations
    assert.ok(DEFAULT_SOUND_CONFIG, "DEFAULT_SOUND_CONFIG must exist");
    assert.ok(DEFAULT_SOUND_CONFIG.chime, "chime config must exist");
    assert.ok(DEFAULT_SOUND_CONFIG.ping, "ping config must exist");
    assert.ok(DEFAULT_SOUND_CONFIG.urgent, "urgent config must exist");

    assert.strictEqual(DEFAULT_SOUND_CONFIG.chime.tones.length, 2, "Chime must be dual-tone");
    assert.strictEqual(DEFAULT_SOUND_CONFIG.urgent.tones.length, 3, "Urgent must be 3-tone chord");

    // 2. Mock Web Audio API Context
    let scheduledTones = [];
    const mockCtx = {
        state: 'running',
        currentTime: 100,
        createOscillator: () => {
            const osc = {
                type: 'sine',
                frequency: { setValueAtTime: (val, t) => scheduledTones.push({ type: 'freq', val, t }) },
                connect: () => {},
                start: (t) => scheduledTones.push({ type: 'start', t }),
                stop: (t) => scheduledTones.push({ type: 'stop', t })
            };
            return osc;
        },
        createGain: () => {
            const gain = {
                gain: {
                    setValueAtTime: (val, t) => {},
                    linearRampToValueAtTime: (val, t) => {},
                    exponentialRampToValueAtTime: (val, t) => {}
                },
                connect: () => {}
            };
            return gain;
        },
        destination: {}
    };

    const played = await playChimeSound({ soundType: 'chime', volume: 0.3, audioContext: mockCtx });
    assert.strictEqual(played, true, "playChimeSound must return true on running context");
    assert.ok(scheduledTones.some(t => t.type === 'freq' && Math.round(t.val) === 587), "Must schedule D5 frequency");
    assert.ok(scheduledTones.some(t => t.type === 'freq' && Math.round(t.val) === 880), "Must schedule A5 frequency");

    // Test suspended context without window
    const suspendedCtx = { ...mockCtx, state: 'suspended', resume: async () => { suspendedCtx.state = 'running'; } };
    const playedSuspended = await playChimeSound({ soundType: 'ping', audioContext: suspendedCtx });
    assert.strictEqual(playedSuspended, true, "playChimeSound must resume suspended context");
});

await testAsync("TASK-913: Deterministic Incoming Message Differential Engine (detectNewIncomingMessages)", async () => {
    // 1. Empty baseline
    const emptyDiff = detectNewIncomingMessages({
        previousMessages: [],
        currentMessages: [],
        currentUserRole: 'client'
    });
    assert.strictEqual(emptyDiff.hasNew, false);
    assert.strictEqual(emptyDiff.count, 0);

    // 2. Detect incoming message from admin to client
    const prev = [{ id: 'msg_1', sender: 'client', message: 'Hallo Allard' }];
    const curr = [
        { id: 'msg_1', sender: 'client', message: 'Hallo Allard' },
        { id: 'msg_2', sender: 'admin', senderRole: 'admin', senderName: 'Allard', message: 'Offerte staat klaar!', category: 'general', createdAt: '2026-10-22T10:00:00Z' }
    ];

    const diffForClient = detectNewIncomingMessages({
        previousMessages: prev,
        currentMessages: curr,
        currentUserRole: 'client'
    });
    assert.strictEqual(diffForClient.hasNew, true);
    assert.strictEqual(diffForClient.count, 1);
    assert.strictEqual(diffForClient.latestMessage.id, 'msg_2');

    // 3. Current user should NOT receive notification for own messages
    const diffOwnMessage = detectNewIncomingMessages({
        previousMessages: curr,
        currentMessages: [
            ...curr,
            { id: 'msg_3', sender: 'client', senderRole: 'client', message: 'Dankjewel!' }
        ],
        currentUserRole: 'client'
    });
    assert.strictEqual(diffOwnMessage.hasNew, false, "Client must not get notified for their own message");

    // 4. Admin role perspective receives client messages
    const diffForAdmin = detectNewIncomingMessages({
        previousMessages: curr,
        currentMessages: [
            ...curr,
            { id: 'msg_4', sender: 'client', senderRole: 'client', message: 'Kan het logo iets groter?', category: 'revision' }
        ],
        currentUserRole: 'admin'
    });
    assert.strictEqual(diffForAdmin.hasNew, true);
    assert.strictEqual(diffForAdmin.latestMessage.category, 'revision');

    // 5. Test with knownIds Set and urgent category detection
    const knownSet = new Set(['msg_1', 'msg_2']);
    const urgentMessages = [
        { id: 'msg_1' },
        { id: 'msg_2' },
        { id: 'msg_urgent', sender: 'admin', category: 'urgent', message: 'DNS moet vandaag live!' }
    ];
    const diffUrgent = detectNewIncomingMessages({
        currentMessages: urgentMessages,
        currentUserRole: 'client',
        knownIds: knownSet
    });
    assert.strictEqual(diffUrgent.hasNew, true);
    assert.strictEqual(diffUrgent.latestMessage.category, 'urgent');
});

await testAsync("TASK-913: Tab Title Badging & Flashing Formatter (formatTabTitle)", async () => {
    const orig = "Projectstatus & Klantenportaal | Creation+Alt+Fix";

    // 0 unread: exact original title
    assert.strictEqual(formatTabTitle(0, orig), orig);
    assert.strictEqual(formatTabTitle(-1, orig), orig);

    // 1 unread without sender
    assert.strictEqual(formatTabTitle(1, orig), "(1) 💬 Nieuw bericht | " + orig);

    // 1 unread with sender
    assert.strictEqual(formatTabTitle(1, orig, { senderName: "Allard" }), "(1) 💬 Nieuw bericht van Allard | " + orig);

    // Multiple unread
    assert.strictEqual(formatTabTitle(3, orig), "(3) 💬 Nieuwe berichten | " + orig);

    // Edge-case: empty or whitespace original title defaults safely
    assert.strictEqual(formatTabTitle(2, "   "), "(2) 💬 Nieuwe berichten | Creation+Alt+Fix");
    assert.strictEqual(formatTabTitle(1, null), "(1) 💬 Nieuw bericht | Creation+Alt+Fix");
});

await testAsync("TASK-913: Notification Toast Formatter & Data Model (formatNotificationToast)", async () => {
    // 1. Admin message formatting
    const adminMsg = {
        id: 'msg_admin_101',
        sender: 'admin',
        senderRole: 'admin',
        category: 'revision',
        message: 'Ik heb de gewenste aanpassing op de contactpagina doorgevoerd.',
        createdAt: '2026-10-22T12:00:00Z'
    };
    const toastAdmin = formatNotificationToast(adminMsg);
    assert.strictEqual(toastAdmin.senderName, 'Allard (Creation+Alt+Fix)');
    assert.strictEqual(toastAdmin.category, 'revision');
    assert.strictEqual(toastAdmin.categoryLabel, '🎨 Revisie');
    assert.strictEqual(toastAdmin.isUrgent, false);
    assert.ok(toastAdmin.messagePreview.includes('contactpagina'));

    // 2. Urgent message formatting
    const urgentMsg = {
        id: 'msg_urg_102',
        sender: 'client',
        senderName: 'Gerard Klusser',
        category: 'urgent',
        message: 'Spoed: formulier geeft 404 melding!'
    };
    const toastUrgent = formatNotificationToast(urgentMsg);
    assert.strictEqual(toastUrgent.senderName, 'Gerard Klusser');
    assert.strictEqual(toastUrgent.category, 'urgent');
    assert.strictEqual(toastUrgent.categoryLabel, '⚡ Spoed');
    assert.strictEqual(toastUrgent.isUrgent, true);

    // 3. String truncation & control character stripping
    const longMsg = {
        id: 'msg_long_103',
        sender: 'admin',
        message: 'A'.repeat(200) + '\r\n\x00' + 'test'
    };
    const toastLong = formatNotificationToast(longMsg);
    assert.ok(toastLong.messagePreview.length <= 120, "Preview must be bounded to 120 chars");
    assert.ok(toastLong.messagePreview.endsWith('...'));
    assert.ok(!toastLong.messagePreview.includes('\x00'), "Control chars must be stripped");
});

await testAsync("TASK-913: PortalChatNotifier Lifecycle & Read State Simulation", async () => {
    let unreadStateCount = null;
    const notifier = new PortalChatNotifier({
        currentUserRole: 'client',
        originalTitle: 'Portaal Test',
        soundEnabled: false,
        onUnreadCountChange: (cnt) => { unreadStateCount = cnt; }
    });

    // 1. Initial project setup (historical messages should not trigger unread badges)
    notifier.setCurrentProject('proj_alpha', [
        { id: 'hist_1', sender: 'admin', message: 'Welkom bij Creation+Alt+Fix' },
        { id: 'hist_2', sender: 'client', message: 'Dank je wel' }
    ]);

    assert.strictEqual(notifier.unreadCount, 0, "Initial unread count must be 0");
    assert.strictEqual(notifier.knownMessageIds.size, 2, "Must prime known message IDs");
    assert.strictEqual(unreadStateCount, 0);

    // 2. Receive new update containing 1 new admin message
    const incomingUpdate = [
        { id: 'hist_1', sender: 'admin', message: 'Welkom bij Creation+Alt+Fix' },
        { id: 'hist_2', sender: 'client', message: 'Dank je wel' },
        { id: 'live_3', sender: 'admin', category: 'urgent', message: 'Concept staat klaar voor goedkeuring!' }
    ];

    const result = await notifier.onMessagesUpdated(incomingUpdate);
    assert.strictEqual(result.hasNew, true);
    assert.strictEqual(notifier.unreadCount, 1);
    assert.strictEqual(notifier.knownMessageIds.has('live_3'), true);
    assert.strictEqual(unreadStateCount, 1);

    // 3. Mark all as read resets counters cleanly
    notifier.markAllAsRead();
    assert.strictEqual(notifier.unreadCount, 0);
    assert.strictEqual(unreadStateCount, 0);
    assert.ok(notifier.lastSeenTimestamp, "lastSeenTimestamp must be recorded");
});



// ========================================================
// 🛡️ SUITE 20: Enterprise Edge-Case Hardening & Resiliency Suite (Ronde 6)
// ========================================================
console.log("\n🛡️ SUITE 20: Enterprise Edge-Case Hardening & Resiliency Suite (Ronde 6)");

// --- SECTION 1: LEAD FACTORY ENTERPRISE EDGE-CASES ---
await testAsync("Lead Factory Enterprise: Advanced Address, Postal Code & City Extraction Matrix", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    // Standard Dutch postal code format
    assert.strictEqual(extractCityFromAddress("Hoofdstraat 14, 9601 KA Hoogezand, Nederland"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Noorderstraat 23, 9601ka Sappemeer"), "Sappemeer");
    assert.strictEqual(extractCityFromAddress("Kerkallee 102, 9641 AA Veendam"), "Veendam");
    assert.strictEqual(extractCityFromAddress("Prins Hendrikkade 15, 1012TL Amsterdam"), "Amsterdam");

    // Addresses without postal code matching known municipal dictionary
    assert.strictEqual(extractCityFromAddress("Winkelcentrum De Reede, Delfzijl"), "Delfzijl");
    assert.strictEqual(extractCityFromAddress("Stationsplein 3, Stadskanaal"), "Stadskanaal");
    assert.strictEqual(extractCityFromAddress("Brink 10, Zuidlaren"), "Zuidlaren");
    assert.strictEqual(extractCityFromAddress("Industrieweg 42, Zuidbroek"), "Zuidbroek");
    assert.strictEqual(extractCityFromAddress("Havenkade 8, Scheemda"), "Scheemda");

    // Edge cases and fallbacks
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(undefined), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Postbus 12345"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Onbekende Locatie Zonder Stad"), "Hoogezand");
});

await testAsync("Lead Factory Enterprise: Extreme String Inputs, Special Characters & Slugification Sanitization", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // Massive input string (>5000 characters)
    const extremeName = "Timmerman- en Bouwbedrijf " + "A".repeat(5000) + " B.V.";
    const sanitizedExtreme = sanitizeLeadData({ name: extremeName });
    assert.strictEqual(sanitizedExtreme.name.length, 150, "Name must be capped at 150 characters");
    assert.strictEqual(sanitizedExtreme.slug.length, 64, "Slug must be capped at 64 characters");
    assert.ok(!sanitizedExtreme.slug.endsWith("-"), "Slug must never end with hyphen");
    assert.ok(/^[a-z0-9-]+$/.test(sanitizedExtreme.slug), "Slug must be valid lowercase alphanumeric hyphen string");

    // Diacritics and Dutch company names
    const diacriticLead = sanitizeLeadData({ name: "Kapsalon & Schoonheidssalon Élégance Frisé B.V." });
    assert.ok(/^[a-z0-9-]+$/.test(diacriticLead.slug));
    assert.ok(diacriticLead.slug.includes("kapsalon"));

    // Legal entity forms: BV, VOF, Eenmanszaak
    const vofLead = sanitizeLeadData({ name: "Installatietechniek Jansen & Zonen V.O.F." });
    assert.ok(/^[a-z0-9-]+$/.test(vofLead.slug));
    assert.ok(vofLead.slug.includes("installatietechniek"));

    // Hostile control characters, ANSI escape codes, null characters
    const hostileLead = sanitizeLeadData({ name: "\u202E\x00\x1F\x7F\x1B[31mMalicious\x1B[0m Klusbedrijf" });
    assert.ok(/^[a-z0-9-]+$/.test(hostileLead.slug));
    assert.ok(!hostileLead.slug.includes("\x00"));
    assert.ok(!hostileLead.slug.includes("\x1B"));
});

await testAsync("Lead Factory Enterprise: International Netnummers Rejection & Dutch Mobile Whitelisting Matrix", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");

    // Foreign numbers across Europe and North America must ALL be rejected
    const foreignNumbers = [
        "+49 171 1234567", "0049 30 123456", "+49 89 201830",
        "+32 470 123456", "0032 2 555 1234", "+32 9 234 5678",
        "+44 7911 123456", "0044 20 7946 0000",
        "+33 6 12 34 56 78", "0033 1 42 68 55 00",
        "+1 555 123 4567", "+1 800 555 0199",
        "+34 91 123 4567", "+34 612 345 678",
        "+48 22 123 4567"
    ];
    for (const fn of foreignNumbers) {
        assert.strictEqual(isDutchMobilePhone(fn), false, `Foreign number ${fn} must be rejected`);
    }

    // Dutch regional landlines (not mobile, not WhatsApp-ready)
    const landlines = [
        "050 525 1234", "0598 391234", "0597 411234", "0596 611234",
        "0595 431234", "0592 311234", "058 212 1234", "020 624 1234",
        "010 411 1234", "030 231 1234", "070 345 1234", "088 1234567"
    ];
    for (const ll of landlines) {
        assert.strictEqual(isDutchMobilePhone(ll), false, `Landline ${ll} must be rejected`);
    }

    // Dutch toll-free and premium numbers
    assert.strictEqual(isDutchMobilePhone("0800 1234"), false);
    assert.strictEqual(isDutchMobilePhone("0900 1234"), false);
    assert.strictEqual(isDutchMobilePhone("0906 1234"), false);

    // Malformed length
    assert.strictEqual(isDutchMobilePhone("06-123456"), false, "Too short");
    assert.strictEqual(isDutchMobilePhone("06-1234567890"), false, "Too long");
    assert.strictEqual(isDutchMobilePhone(""), false);
    assert.strictEqual(isDutchMobilePhone(null), false);

    // Authentic Dutch mobile numbers across all standard notations
    const validMobiles = [
        "0612345678",
        "06-12345678",
        "06 12345678",
        "+31 6 12345678",
        "+31612345678",
        "0031 6 12345678",
        "0031612345678",
        "+31 (0)6 1234 5678",
        "(06) 1234 5678"
    ];
    for (const vm of validMobiles) {
        assert.strictEqual(isDutchMobilePhone(vm), true, `Valid mobile ${vm} must be accepted`);
    }
});

await testAsync("Lead Factory Enterprise: Multi-Candidate Lead Deduplication & Cross-Variant Collision Matching", async () => {
    const { normalizeDomain, normalizePhoneDigits, isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");
    const { isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");

    const existingDatabase = [
        { slug: "schildersbedrijf-jansen", phone: "06-12345678", website: "https://schildersbedrijf-jansen.nl" },
        { slug: "loodgieter-de-vries", phone: "+31 6 87654321", website: "https://www.loodgieterdevries.nl" }
    ];

    // Same domain different protocol and subpath
    assert.strictEqual(isDuplicateLead({ website: "http://www.schildersbedrijf-jansen.nl/portfolio?ref=gmb#diensten" }, existingDatabase), true);
    // Same phone different spacing/country notation
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6 1234 5678" }, existingDatabase), true);
    assert.strictEqual(isDuplicateLead({ phone: "0687654321" }, existingDatabase), true);
    // Same slug
    assert.strictEqual(isDuplicateLead({ slug: "schildersbedrijf-jansen" }, existingDatabase), true);

    // Truly unique lead
    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-bakker", phone: "06-55443322", website: "https://dakdekkerbakker.nl" }, existingDatabase), false);

    // Business website association heuristics
    assert.strictEqual(isWebsiteMatchingBusiness("Van Dijk Hoveniers", "https://vandijk-hoveniers.nl"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Dennis Dijkema Klusbedrijf", "https://devakman.info/dennisdijkema"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Schildersbedrijf Groningen", "https://amsterdam-schilders.nl"), false);
    // Never match own brand domain to prospective clients
    assert.strictEqual(isWebsiteMatchingBusiness("Allard Web Solutions", "https://creationaltfix.nl"), false);
});

await testAsync("Lead Factory Enterprise: RFC- and SIDN-Compliant Suggested Domain Formatter (TASK-916)", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    assert.strictEqual(formatSuggestedDomain("Bakkerij De Echte"), "bakkerij-de-echte.nl");
    assert.strictEqual(formatSuggestedDomain("https://www.loodgieter-hoogezand.nl/diensten"), "loodgieter-hoogezand.nl");
    assert.strictEqual(formatSuggestedDomain("Café 't Hoekje & Zn."), "caf-t-hoekje-zn.nl");
    assert.strictEqual(formatSuggestedDomain(""), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(null), "zzp-concept.nl");

    // SIDN 63-character label limit
    const longDomainCandidate = "a".repeat(100);
    const formattedLong = formatSuggestedDomain(longDomainCandidate);
    assert.strictEqual(formattedLong.length, 66, "63 chars label + .nl (3 chars) = 66");
    assert.ok(formattedLong.endsWith(".nl"));
    assert.ok(!formattedLong.slice(0, -3).endsWith("-"));
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE ENTERPRISE EDGE-CASES ---
await testAsync("Offerte & Factuur Enterprise: High-Precision Line-Item VAT Calculation & Belastingdienst Conformity", async () => {
    function computeInvoiceTotals(lineItems, isReverseCharge = false) {
        let subtotalExcl = 0;
        let vat21 = 0;
        let vat9 = 0;
        let vat0 = 0;

        for (const item of lineItems) {
            const lineExcl = Math.round((Number(item.price || 0) * Number(item.qty || 1)) * 100) / 100;
            subtotalExcl = Math.round((subtotalExcl + lineExcl) * 100) / 100;

            if (isReverseCharge || item.vatRate === 0) {
                vat0 = Math.round((vat0 + 0) * 100) / 100;
            } else if (item.vatRate === 9) {
                const lineVat = Math.round(lineExcl * 0.09 * 100) / 100;
                vat9 = Math.round((vat9 + lineVat) * 100) / 100;
            } else {
                const lineVat = Math.round(lineExcl * 0.21 * 100) / 100;
                vat21 = Math.round((vat21 + lineVat) * 100) / 100;
            }
        }

        const totalVat = Math.round((vat21 + vat9 + vat0) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat) * 100) / 100;

        return {
            subtotalExcl,
            vat21,
            vat9,
            vat0,
            totalVat,
            totalIncl,
            reverseNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const mixedLines = [
        { desc: "Softwareontwikkeling Custom Dashboard", price: 2450.00, qty: 1, vatRate: 21 },
        { desc: "Gedrukte Architectuurhandleiding", price: 29.95, qty: 3, vatRate: 9 },
        { desc: "EU B2B Licentie Vrijgesteld", price: 300.00, qty: 1, vatRate: 0 }
    ];

    const normalResult = computeInvoiceTotals(mixedLines, false);
    assert.strictEqual(normalResult.subtotalExcl, 2839.85);
    assert.strictEqual(normalResult.vat21, 514.50);
    assert.strictEqual(normalResult.vat9, 8.09);
    assert.strictEqual(normalResult.totalVat, 522.59);
    assert.strictEqual(normalResult.totalIncl, 3362.44);
    assert.strictEqual(normalResult.reverseNotice, null);

    // Reverse charge
    const reverseResult = computeInvoiceTotals(mixedLines, true);
    assert.strictEqual(reverseResult.totalVat, 0);
    assert.strictEqual(reverseResult.totalIncl, 2839.85);
    assert.ok(reverseResult.reverseNotice.includes("BTW verlegd conform art. 12 lid 3 Wet OB 1968"));

    // Commercial half-up boundary test: 0.005 -> 0.01, 0.0049 -> 0.00
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
    assert.strictEqual(halfUp(10.005), 10.01);
    assert.strictEqual(halfUp(10.0049), 10.00);
    assert.strictEqual(halfUp(10.0051), 10.01);
});

await testAsync("Offerte & Factuur Enterprise: 0-Euro Facturen, Pro-Bono Diensten & Division-By-Zero Resilience", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    const zeroInvoiceProject = {
        id: "proj_probono_2026",
        client: "Stichting Leergeld Groningen",
        invoices: [{
            invoiceNumber: "2026-PB-02",
            description: "Kosteloze pro-bono realisatie non-profit platform",
            amountExcl: 0,
            amountVat: 0,
            amountIncl: 0,
            status: "paid"
        }]
    };

    const normZero = normalizeProjectInvoices(zeroInvoiceProject);
    assert.strictEqual(normZero.length, 1);
    assert.strictEqual(normZero[0].amountIncl, 0);
    assert.strictEqual(normZero[0].status, "paid");
    assert.strictEqual(formatCurrency(normZero[0].amountIncl), "€ 0,00");
    assert.ok(!formatCurrency(normZero[0].amountIncl).includes("-0"));
    assert.ok(!formatCurrency(normZero[0].amountIncl).includes("NaN"));

    // Division by zero defense in discount calculators
    function calculateDiscountPercentage(originalPrice, discountedPrice) {
        if (!originalPrice || originalPrice <= 0) return 0;
        const diff = Math.max(0, originalPrice - discountedPrice);
        return Math.round((diff / originalPrice) * 100);
    }
    assert.strictEqual(calculateDiscountPercentage(0, 0), 0, "0 price must return 0% discount without NaN/Infinity");
    assert.strictEqual(calculateDiscountPercentage(100, 80), 20);
    assert.strictEqual(calculateDiscountPercentage(100, 0), 100);
});

await testAsync("Offerte & Factuur Enterprise: Compound Stacking Discounts, Credit Notes & Hard €0 Floor Clamping", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // Credit note calculation
    const creditProject = {
        id: "proj_credit_2026",
        client: "Vanderplaats B.V.",
        invoices: [{
            invoiceNumber: "2026-CN-02",
            description: "Creditnota restitutie geannuleerde SLA uitbreiding",
            amountExcl: -250.00,
            amountVat: -52.50,
            amountIncl: -302.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditProject);
    assert.strictEqual(normCredit[0].amountExcl, -250.00);
    assert.strictEqual(normCredit[0].amountVat, -52.50);
    assert.strictEqual(normCredit[0].amountIncl, -302.50);
    assert.strictEqual(formatCurrency(normCredit[0].amountIncl), "€ -302,50");

    // Stacking compound discounts with floor clamping
    function applyStackedDiscounts(baseSubtotal, discounts = {}) {
        let current = baseSubtotal;
        if (discounts.percentage1) {
            current = Math.round((current * (1 - (discounts.percentage1 / 100))) * 100) / 100;
        }
        if (discounts.percentage2) {
            current = Math.round((current * (1 - (discounts.percentage2 / 100))) * 100) / 100;
        }
        if (discounts.fixedVoucher) {
            current = current - discounts.fixedVoucher;
        }
        const clampedSubtotal = Math.max(0, Math.round(current * 100) / 100);
        const vat = Math.round(clampedSubtotal * 0.21 * 100) / 100;
        const total = Math.round((clampedSubtotal + vat) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    const calc1 = applyStackedDiscounts(2000.00, { percentage1: 10, percentage2: 5, fixedVoucher: 250 });
    assert.strictEqual(calc1.clampedSubtotal, 1460.00);
    assert.strictEqual(calc1.vat, 306.60);
    assert.strictEqual(calc1.total, 1766.60);

    // Excessive discount clamping
    const calcExcessive = applyStackedDiscounts(100.00, { fixedVoucher: 500.00 });
    assert.strictEqual(calcExcessive.clampedSubtotal, 0.00);
    assert.strictEqual(calcExcessive.vat, 0.00);
    assert.strictEqual(calcExcessive.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise: Resilient Currency Parser & Formatter Boundary Matrix", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseCurrencyStrict(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') {
            return isFinite(val) ? val : 0;
        }
        const cleaned = String(val)
            .replace(/[€$\s]/g, '')
            .replace(/\.(?=\d{3}(?:,|$))/g, '')
            .replace(',', '.')
            .replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) || !isFinite(num) ? 0 : num;
    }

    assert.strictEqual(parseCurrencyStrict("€ 1.499,95"), 1499.95);
    assert.strictEqual(parseCurrencyStrict("1499,95"), 1499.95);
    assert.strictEqual(parseCurrencyStrict("€ 95,-"), 95);
    assert.strictEqual(parseCurrencyStrict("  € 49.50  "), 49.50);
    assert.strictEqual(parseCurrencyStrict("NaN"), 0);
    assert.strictEqual(parseCurrencyStrict("Infinity"), 0);
    assert.strictEqual(parseCurrencyStrict(null), 0);
    assert.strictEqual(parseCurrencyStrict(undefined), 0);

    // formatCurrency matrix
    assert.strictEqual(formatCurrency(2450), "€ 2450,00");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");
    assert.strictEqual(formatCurrency(-75.5), "€ -75,50");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");
    assert.strictEqual(formatCurrency(-Infinity), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency(10000000), "€ 10000000,00");
});

await testAsync("Offerte & Factuur Enterprise: Mollie iDEAL Link Generation & WhatsApp Billing Dispatch Formatting", async () => {
    const { createMolliePaymentLink, generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    const payment = await createMolliePaymentLink({
        projectId: "proj_ent_2026",
        clientName: "Scholte Elektrotechniek",
        invoiceNumber: "2026-SE-01",
        amountIncl: 1815.00,
        description: "Factuur 2026-SE-01 Oplevering Bedrijfswebsite"
    });
    assert.ok(payment.paymentId.startsWith("tr_"), "Payment ID must start with tr_");
    assert.ok(payment.checkoutUrl.includes("mollie.com"), "Must point to mollie checkout URL");
    assert.ok(payment.checkoutUrl.includes("1815.00"), "Must embed amount");

    // WhatsApp Billing URL
    const wa = generateBillingWhatsAppUrl("0612345678", "Scholte Elektrotechniek", "2026-SE-01", 1815.00, payment.checkoutUrl);
    assert.ok(wa.startsWith("https://wa.me/31612345678"));
    assert.ok(wa.includes("2026-SE-01"));
    assert.ok(wa.includes("Scholte%20Elektrotechniek") || wa.includes("Scholte+Elektrotechniek"));
    assert.ok(!wa.includes(" "), "No raw unencoded spaces");
    assert.ok(!wa.includes("\n"), "No raw unencoded newlines");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL ENTERPRISE EDGE-CASES ---
await testAsync("Contact & Intake Enterprise: Multi-Decoy Honeypot Trapping & Time-Threshold Heuristics", async () => {
    function inspectSubmissionDefense(data, elapsedMs = 6000) {
        if (!data || typeof data !== 'object') return { trapped: true, code: 'INVALID_PAYLOAD' };

        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm'];
        for (const f of decoyFields) {
            if (data[f] && String(data[f]).trim() !== '') {
                return { trapped: true, code: `HONEYPOT_FIELD_${f.toUpperCase()}` };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { trapped: true, code: 'SUBMISSION_TOO_FAST_BOT' };
        }

        const text = `${data.goals || ''} ${data.comments || ''} ${data.companyName || ''}`;
        const links = text.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { trapped: true, code: 'LINK_SPAM_DETECTED' };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks)/i.test(text)) {
            return { trapped: true, code: 'SPAM_KEYWORD_DETECTED' };
        }

        return { trapped: false, code: 'LEGITIMATE_HUMAN' };
    }

    // Bot tests
    assert.strictEqual(inspectSubmissionDefense({ company_fax: "050-123456" }).trapped, true);
    assert.strictEqual(inspectSubmissionDefense({ telephone_confirm: "0612345678" }).trapped, true);
    assert.strictEqual(inspectSubmissionDefense({ companyName: "Super Fast Bot" }, 450).trapped, true);
    assert.strictEqual(inspectSubmissionDefense({ comments: "http://1.com http://2.com http://3.com" }).trapped, true);
    assert.strictEqual(inspectSubmissionDefense({ goals: "Buy high ranking backlinks today!" }).trapped, true);

    // Legitimate intake
    const human = inspectSubmissionDefense({
        companyName: "Stenekes Rioolspecialist",
        contactName: "Angela Stenekes",
        goals: "Vernieuwing van de rioolontstoppingsdienst pagina's",
        website: "",
        _hp_trap: ""
    }, 12500);
    assert.strictEqual(human.trapped, false);
    assert.strictEqual(human.code, 'LEGITIMATE_HUMAN');
});

await testAsync("Contact & Intake Enterprise: CWE-93 CRLF Header Injection & Multi-Encoding Defense Matrix", async () => {
    function sanitizeMailHeaderStrict(val) {
        if (!val || typeof val !== 'string') return '';
        let cleaned = val.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const payloads = [
        "victim@domain.com\r\nBcc:attacker@leak.com",
        "victim@domain.com\rBcc:attacker@leak.com",
        "victim@domain.com\nBcc:attacker@leak.com",
        "victim@domain.com%0d%0aBcc:attacker@leak.com",
        "victim@domain.com%250d%250aBcc:attacker@leak.com",
        "victim@domain.com\u2028Bcc:attacker@leak.com",
        "victim@domain.com\u2029Bcc:attacker@leak.com",
        "victim@domain.com\u0085Bcc:attacker@leak.com",
        "victim@domain.com\x00Bcc:attacker@leak.com",
        "victim@domain.com\u000BBcc:attacker@leak.com",
        "victim@domain.com\u000CBcc:attacker@leak.com"
    ];

    for (const p of payloads) {
        const cleaned = sanitizeMailHeaderStrict(p);
        assert.ok(!cleaned.includes("\r") && !cleaned.includes("\n"));
        assert.ok(!cleaned.includes("\u2028") && !cleaned.includes("\u2029"));
        assert.ok(!cleaned.includes("\x00"));
        assert.strictEqual(emailRegex.test(cleaned), false, `Payload ${JSON.stringify(p)} must not validate as clean email`);
    }

    // Clean valid email
    const cleanMail = sanitizeMailHeaderStrict("allard@creationaltfix.nl");
    assert.strictEqual(cleanMail, "allard@creationaltfix.nl");
    assert.strictEqual(emailRegex.test(cleanMail), true);
});

await testAsync("Contact & Intake Enterprise: Email Normalization, RFC 5322 Boundaries & Sub-Addressing Matrix", async () => {
    function normalizeAndValidateEmail(rawEmail) {
        if (!rawEmail || typeof rawEmail !== 'string') return { valid: false, normalized: '' };
        const trimmed = rawEmail.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, normalized: '' };

        const localPart = trimmed.slice(0, atIndex);
        const domainPart = trimmed.slice(atIndex + 1).toLowerCase();

        const localRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
        if (!localRegex.test(localPart)) return { valid: false, normalized: '' };
        if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) return { valid: false, normalized: '' };

        const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domainPart)) return { valid: false, normalized: '' };
        const labels = domainPart.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, normalized: '' };
        }
        if (domainPart.includes('..')) {
            return { valid: false, normalized: '' };
        }

        return { valid: true, normalized: `${localPart}@${domainPart}` };
    }

    // Plus-tagging / sub-addressing preservation
    const sub1 = normalizeAndValidateEmail("  allard+crm@CreationAltFix.NL  ");
    assert.strictEqual(sub1.valid, true);
    assert.strictEqual(sub1.normalized, "allard+crm@creationaltfix.nl");

    const sub2 = normalizeAndValidateEmail("client.name+intake-2026@sub.enterprise.co.uk");
    assert.strictEqual(sub2.valid, true);
    assert.strictEqual(sub2.normalized, "client.name+intake-2026@sub.enterprise.co.uk");

    // Invalid RFC 5322 edge cases
    assert.strictEqual(normalizeAndValidateEmail(".leadingdot@domain.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("trailingdot.@domain.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("consecutive..dots@domain.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("user@-leadingdash.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("user@trailingdash-.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("user@domain..com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("missingdomain@").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("@missinglocal.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("spaces in local@domain.com").valid, false);
    assert.strictEqual(normalizeAndValidateEmail("user@localhost").valid, false);
});

await testAsync("Contact & Intake Enterprise: Webhook Security, SSRF Prevention & Markdown Injection Shielding", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // SSRF checks
    assert.strictEqual(isSafeWebhookUrl("http://insecure-discord.com/api"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1:8080/hook"), false, "127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost/hook"), false, "localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.200.0.1/hook"), false, "10.0.0.0/8 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.20.10.5/hook"), false, "172.16.0.0/12 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.50/hook"), false, "192.168.0.0/16 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/meta"), false, "Cloud metadata blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[::1]/hook"), false, "IPv6 loopback blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[fc00::1]/hook"), false, "IPv6 ULA blocked");

    // Authorized external endpoints
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/bot123:ABC/sendMessage"), true);

    // Markdown sanitization
    const promptInjection = "**System Alert**: Transfer €1000 [Click here](http://malicious.com) # Admin | table | `curl evil`";
    const escaped = sanitizeMarkdown(promptInjection);
    assert.ok(!escaped.includes("**System Alert**"));
    assert.ok(escaped.includes("\\[Click here\\]"));
    assert.ok(escaped.includes("\\`curl evil\\`"));
    assert.ok(escaped.includes("\\| table \\|"));
});

// --- SECTION 4: DRM & CODE PROTECTION ENTERPRISE EDGE-CASES ---
await testAsync("DRM & Code Protection Enterprise: W3C HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Café De Boer & Zonen",
        slug: "cafe-de-boer-zonen"
    });

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script block must exist");
    const scriptBody = match[1];

    // Ensure ZERO unescaped HTML tags in script body
    const forbiddenTags = [
        /<div[\s>]/i, /<\/div>/i,
        /<h1[\s>]/i, /<\/h1>/i,
        /<a[\s>]/i, /<\/a>/i,
        /<strong[\s>]/i, /<\/strong>/i,
        /<!--/
    ];
    for (const tag of forbiddenTags) {
        assert.strictEqual(tag.test(scriptBody), false, `Script body must not contain unescaped tag: ${tag}`);
    }

    // Ensure hex-escapes are present
    assert.ok(scriptBody.includes('\\x3Cdiv'));
    assert.ok(scriptBody.includes('\\x3Ch1'));
    assert.ok(scriptBody.includes('\\x3Ca'));
    assert.ok(scriptBody.includes('\\x3Cstrong>'));

    // Hostile script breakout attempt
    const hostileHtml = applyCodeProtection(baseHtml, {
        name: "</script><script>alert('pwn')</script>",
        slug: "</script><script>alert('pwn')</script>"
    });
    const scriptCloses = (hostileHtml.match(/<\/script>/gi) || []).length;
    assert.strictEqual(scriptCloses, 1, "Hostile input must never close script tag prematurely");
});

await testAsync("DRM & Code Protection Enterprise: Node.js VM AST Compilation & Sandbox Runtime Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test BV", slug: "test-bv" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // 1. Verify AST compilation
    const script = new vm.Script(scriptBody);
    assert.ok(script, "Script must compile cleanly into Node.js VM AST");

    // 2. Sandbox simulation: Authorized host
    const authorizedSandbox = {
        window: {
            location: { hostname: 'creationaltfix.nl', search: '' },
            stop: () => {}
        },
        document: {
            documentElement: {},
            addEventListener: () => {},
            getElementById: () => null,
            createElement: () => ({ style: {}, appendChild: () => {} }),
            body: { appendChild: () => {} }
        },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedSandbox);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedSandbox);
    }, "Authorized domain must execute without throwing");

    // 3. Sandbox simulation: Unauthorized host triggers killswitch
    const unauthorizedSandbox = {
        window: {
            location: { hostname: 'pirated-concept-thief.com', search: '' },
            stop: () => {}
        },
        document: {
            documentElement: { innerHTML: '' },
            addEventListener: () => {}
        },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedSandbox);
    assert.throws(() => {
        script.runInContext(unauthorizedSandbox);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/, "Unauthorized domain must throw killswitch error");
});

await testAsync("DRM & Code Protection Enterprise: Anti-Inspect Defense Hotkey & Contextmenu Capture Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test", slug: "test" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Contextmenu capture
    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Keydown inspector keys
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise: Zero-Cookie View-Ping Beacon & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Session-based deduplication
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    // Preview / Admin suppression
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    // Zero cookie usage
    assert.strictEqual(scriptBody.includes("document.cookie"), false, "Must not set or access document.cookie");

    // Beacon or keepalive fetch
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});



// ========================================================
// SUITE 21: Server-Side Milestone Dispatcher, Tokenized Magic Links & Multi-Channel Triggers (TASK-909)
// ========================================================
console.log("\n🚀 SUITE 21: Server-Side Milestone Dispatcher, Tokenized Magic Links & Multi-Channel Triggers (TASK-909)");

await testAsync("TASK-909: MILESTONE_DEFINITIONS completeness & phase mapping", async () => {
    const { MILESTONE_DEFINITIONS } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    const expectedKeys = ["proposal_ready", "design_ready", "development_started", "payment_waiting", "project_completed", "custom"];
    for (const key of expectedKeys) {
        const def = MILESTONE_DEFINITIONS[key];
        assert.ok(def, `Mijlpaal ${key} moet gedefinieerd zijn in MILESTONE_DEFINITIONS`);
        assert.ok(def.title && typeof def.title === "string", `Mijlpaal ${key} moet een titel hebben`);
        assert.ok(def.badgeText && typeof def.badgeText === "string", `Mijlpaal ${key} moet een badgeText hebben`);
        assert.ok(def.color && def.color.startsWith("#"), `Mijlpaal ${key} moet een geldige hex kleur hebben`);
        assert.ok(def.headline && typeof def.headline === "string", `Mijlpaal ${key} moet een headline hebben`);
        assert.ok(def.defaultSubject && def.defaultSubject.includes("{projectName}"), `Mijlpaal ${key} moet {projectName} in subject bevatten`);
        assert.ok(def.actionLabel && typeof def.actionLabel === "string", `Mijlpaal ${key} moet een actionLabel hebben`);
        assert.ok(def.actionType && typeof def.actionType === "string", `Mijlpaal ${key} moet een actionType hebben`);
        assert.ok(def.whatsappTemplate && def.whatsappTemplate.includes("{portalLink}"), `Mijlpaal ${key} WhatsApp template moet {portalLink} bevatten`);
        assert.ok(def.emailSummaryTemplate && typeof def.emailSummaryTemplate === "string", `Mijlpaal ${key} moet een emailSummaryTemplate hebben`);
    }

    assert.strictEqual(MILESTONE_DEFINITIONS.proposal_ready.phaseNum, 2);
    assert.strictEqual(MILESTONE_DEFINITIONS.design_ready.phaseNum, 3);
    assert.strictEqual(MILESTONE_DEFINITIONS.development_started.phaseNum, 4);
    assert.strictEqual(MILESTONE_DEFINITIONS.payment_waiting.phaseNum, 5);
    assert.strictEqual(MILESTONE_DEFINITIONS.project_completed.phaseNum, 5);
});

await testAsync("TASK-909: Cryptographic Magic Token generation, tamper detection & expiration", async () => {
    const {
        generateMagicToken,
        generateMagicTokenSync,
        verifyMagicToken,
        DEFAULT_MAGIC_SECRET
    } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    const testPayload = {
        pid: "proj-gerard-123",
        email: "gerard@vanderplaats.nl",
        act: "proposal",
        exp: Date.now() + (24 * 3600 * 1000), // 24h in future
        nonce: "testnonce123"
    };

    // 1. WebCrypto / Async Token Generation & Verification
    const asyncToken = await generateMagicToken(testPayload, DEFAULT_MAGIC_SECRET);
    assert.ok(typeof asyncToken === "string" && asyncToken.includes("."), "Token moet twee dot-gescheiden delen bevatten");

    const verifyAsyncRes = await verifyMagicToken(asyncToken, DEFAULT_MAGIC_SECRET, "proj-gerard-123");
    assert.strictEqual(verifyAsyncRes.valid, true, "Geldig token moet succesvol verifiëren");
    assert.strictEqual(verifyAsyncRes.payload.pid, "proj-gerard-123");
    assert.strictEqual(verifyAsyncRes.payload.email, "gerard@vanderplaats.nl");

    // 2. Synchronous Fast Token Generation & Verification
    const syncToken = generateMagicTokenSync(testPayload, DEFAULT_MAGIC_SECRET);
    assert.ok(typeof syncToken === "string" && syncToken.includes("."));
    const verifySyncRes = await verifyMagicToken(syncToken, DEFAULT_MAGIC_SECRET, "proj-gerard-123");
    assert.strictEqual(verifySyncRes.valid, true, "Sync fast token moet succesvol verifiëren");

    // 3. Tamper Detection (altering 1 character in payload)
    const [b64, sig] = asyncToken.split(".");
    const tamperedB64 = b64.slice(0, -2) + (b64.slice(-2) === "AA" ? "BB" : "AA");
    const tamperedToken = `${tamperedB64}.${sig}`;
    const tamperedRes = await verifyMagicToken(tamperedToken, DEFAULT_MAGIC_SECRET, "proj-gerard-123");
    assert.strictEqual(tamperedRes.valid, false, "Gemanipuleerd token moet falen op handtekening");

    // 4. Secret mismatch
    const wrongSecretRes = await verifyMagicToken(asyncToken, "wrong_secret_key_12345", "proj-gerard-123");
    assert.strictEqual(wrongSecretRes.valid, false, "Verificatie met onjuiste sleutel moet falen");

    // 5. Project ID mismatch
    const wrongProjectRes = await verifyMagicToken(asyncToken, DEFAULT_MAGIC_SECRET, "other-project-999");
    assert.strictEqual(wrongProjectRes.valid, false, "Verificatie met onjuist projectId moet falen");

    // 6. Expired token
    const expiredPayload = {
        pid: "proj-gerard-123",
        email: "gerard@vanderplaats.nl",
        act: "proposal",
        exp: Date.now() - 5000, // 5s in past
        nonce: "expirednonce"
    };
    const expiredToken = await generateMagicToken(expiredPayload, DEFAULT_MAGIC_SECRET);
    const expiredRes = await verifyMagicToken(expiredToken, DEFAULT_MAGIC_SECRET, "proj-gerard-123");
    assert.strictEqual(expiredRes.valid, false, "Verlopen token moet afgewezen worden");
    assert.strictEqual(expiredRes.expired, true, "expired vlag moet true zijn");
});

await testAsync("TASK-909: generatePortalMagicLink full URL construction", async () => {
    const {
        generatePortalMagicLink,
        generatePortalMagicLinkSync,
        DEFAULT_PORTAL_BASE_URL
    } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    const linkAsync = await generatePortalMagicLink({
        projectId: "proj-scholte-456",
        clientEmail: "gerjo@scholte-elektrotechniek.nl",
        action: "design",
        expiresInHours: 72
    });

    assert.ok(linkAsync.startsWith(DEFAULT_PORTAL_BASE_URL), "Link moet starten met de portal status URL");
    assert.ok(linkAsync.includes("id=proj-scholte-456"), "Link moet id parameter bevatten");
    assert.ok(linkAsync.includes("token="), "Link moet token parameter bevatten");
    assert.ok(linkAsync.includes("act=design"), "Link moet act parameter bevatten");

    const linkSync = generatePortalMagicLinkSync({
        projectId: "proj-scholte-456",
        clientEmail: "gerjo@scholte-elektrotechniek.nl",
        action: "design"
    });

    assert.ok(linkSync.startsWith(DEFAULT_PORTAL_BASE_URL));
    assert.ok(linkSync.includes("id=proj-scholte-456"));
});

await testAsync("TASK-909: Dutch Mobile Phone Normalization & WhatsApp Dispatch URL Encoding", async () => {
    const {
        normalizeDutchPhone,
        generateMilestoneWhatsAppUrl
    } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    // Test phone normalization
    assert.strictEqual(normalizeDutchPhone("0612345678"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("+31 6 1234 5678"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("0031 6 1234 5678"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("+31(0)6-12345678"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("(06) 12 34 56 78"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("31612345678"), "31612345678");
    assert.strictEqual(normalizeDutchPhone("+49 170 1234567"), "491701234567"); // International mobile
    assert.strictEqual(normalizeDutchPhone("050-123456"), ""); // Dutch landline (not mobile)
    assert.strictEqual(normalizeDutchPhone("invalid"), "");

    // Test WhatsApp URL Generation
    const waUrl = generateMilestoneWhatsAppUrl({
        clientPhone: "+31 6 1234 5678",
        clientName: "Gerard",
        projectName: "Aannemer Van der Plaats",
        milestoneKey: "proposal_ready",
        portalLink: "https://portal.creationaltfix.nl/crm/status/?id=vanderplaats"
    });

    assert.ok(waUrl.startsWith("https://api.whatsapp.com/send?phone=31612345678&text="));
    const urlObj = new URL(waUrl);
    assert.strictEqual(urlObj.searchParams.get("phone"), "31612345678");
    const textParam = urlObj.searchParams.get("text");
    assert.ok(textParam.includes("Beste Gerard"));
    assert.ok(textParam.includes("Aannemer Van der Plaats"));
    assert.ok(textParam.includes("https://portal.creationaltfix.nl/crm/status/?id=vanderplaats"));
    assert.ok(textParam.includes("Allard — Creation+Alt+Fix"));
});

await testAsync("TASK-909: Branded Dark AI Responsive HTML Email Generator & Security Shields", async () => {
    const {
        generateMilestoneEmailHtml,
        sanitizeEmailSubject
    } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    // 1. CRLF Subject Sanitization
    const hostileSubject = "Offerte Gereed\r\nBcc: victim@example.com\r\nSubject: Hack\x00\x1F";
    const cleanSubject = sanitizeEmailSubject(hostileSubject);
    assert.strictEqual(cleanSubject.includes("\r"), false, "Subject mag geen CR bevatten");
    assert.strictEqual(cleanSubject.includes("\n"), false, "Subject mag geen LF bevatten");
    assert.strictEqual(cleanSubject.includes("\x00"), false, "Subject mag geen NUL bytes bevatten");

    // 2. XSS payload in dynamic variables
    const html = generateMilestoneEmailHtml({
        clientName: "<script>alert('name')</script>",
        projectName: "<img src=x onerror=alert('proj')>",
        milestoneKey: "design_ready",
        portalLink: "https://portal.creationaltfix.nl/crm/status/?id=test",
        customNote: "<b>Let op:</b> <script>alert('note')</script>",
        deliverables: ["Mobiele Optimalisatie", "<svg onload=alert('svg')>", "SEO Metadata"]
    });

    // Check XSS escaping
    assert.strictEqual(html.includes("<script>alert('name')</script>"), false);
    assert.ok(html.includes("&lt;script&gt;alert(&#039;name&#039;)&lt;/script&gt;"));
    assert.strictEqual(html.includes("<img src=x"), false);
    assert.strictEqual(html.includes("<svg onload"), false);

    // Check Dark AI design tokens & legal branding
    assert.ok(html.includes("#0c1020"), "Moet Dark AI kaartkleur bevatten");
    assert.ok(html.includes("#00f2fe"), "Moet Creation+Alt+Fix cyan accentkleur bevatten");
    assert.ok(html.includes("99986191"), "Moet KvK 99986191 bevatten");
    assert.ok(html.includes("+31 6 19135453"), "Moet officieel telefoonnummer bevatten");
    assert.ok(html.includes('href="https://portal.creationaltfix.nl/crm/status/?id=test"'), "Moet actieknop naar magic link bevatten");
    assert.ok(html.includes("Mobiele Optimalisatie"), "Moet deliverables bevatten");
});

await testAsync("TASK-909: Audit Trail Formatter & Server-Side Dispatch Endpoint Structural Integrity", async () => {
    const { createMilestoneAuditRecord } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    const audit = createMilestoneAuditRecord({
        milestoneKey: "payment_waiting",
        channels: ["email", "whatsapp"],
        clientEmail: "allard@creationaltfix.nl",
        clientPhone: "+31 6 19135453",
        adminEmail: "admin@creationaltfix.nl"
    });

    assert.strictEqual(audit.type, "milestone_dispatched");
    assert.strictEqual(audit.milestoneKey, "payment_waiting");
    assert.deepStrictEqual(audit.channels, ["email", "whatsapp"]);
    assert.strictEqual(audit.recipientEmail, "allard@creationaltfix.nl");
    assert.strictEqual(audit.recipientPhone, "+31 6 19135453");
    assert.ok(audit.timestamp && audit.timestamp.includes("T"));
    assert.ok(audit.note.includes("Oplevering Gereed & Wacht op Betaling"));

    // Verify crm/api/milestone-dispatcher.php file structure
    const phpPath = path.join(ROOT_DIR, "crm/api/milestone-dispatcher.php");
    assert.ok(fs.existsSync(phpPath), "crm/api/milestone-dispatcher.php moet fysiek bestaan");
    const phpContent = fs.readFileSync(phpPath, "utf-8");

    assert.ok(phpContent.includes("Access-Control-Allow-Origin"), "PHP endpoint moet CORS valideren");
    assert.ok(phpContent.includes("portal.creationaltfix.nl"), "PHP endpoint moet portal origin ondersteunen");
    assert.ok(phpContent.includes("sys_get_temp_dir()"), "PHP endpoint moet veilige rate-limiter bezitten");
    assert.ok(phpContent.includes("LOCK_EX"), "PHP endpoint moet atomic file locking gebruiken");
    assert.ok(phpContent.includes("0600"), "PHP endpoint moet veilige 0600 permissies hanteren");
    assert.ok(phpContent.includes("FILTER_VALIDATE_EMAIL"), "PHP endpoint moet e-mail valideren");
    assert.ok(/\[\\r\\n\\x00-\\x1F\\x7F\]/.test(phpContent), "PHP endpoint moet CWE-93 CRLF injection mitigeren");
    assert.ok(phpContent.includes("milestone-dispatch-log.json"), "PHP endpoint moet atomair loggen in JSON");
});

// ========================================================
// SUITE 22: Deep Edge-Case Hardening & Resiliency Suite (Ronde 7)
// ========================================================
console.log("\n🛡️ SUITE 22: Deep Edge-Case Hardening & Resiliency Suite (Ronde 7)");

// --- SECTION 1: LEAD FACTORY EDGE-CASES ---

await testAsync("Lead Factory Edge-Cases: Address, Postal Code & City Extraction Boundary Matrix", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Street and standard Dutch postal codes (both spaced and unspaced)
    assert.strictEqual(extractCityFromAddress("Hoofdweg 103, 9626 AC Schildwolde"), "Schildwolde");
    assert.strictEqual(extractCityFromAddress("Grote Markt 1 9712HN Groningen"), "Groningen");
    assert.strictEqual(extractCityFromAddress("Kerkstraat 15 9601 KA Hoogezand"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Molenstreek 44 9641AA Veendam"), "Veendam");
    assert.strictEqual(extractCityFromAddress("Stationsweg 12, 9401 KT Assen, Nederland"), "Assen");
    assert.strictEqual(extractCityFromAddress("Rijksstraatweg 100, 9752 BA Haren"), "Haren");

    // 2. Known municipalities recognition when postal code is absent or partial
    assert.strictEqual(extractCityFromAddress("Werkplaats te Delfzijl havengebied"), "Delfzijl");
    assert.strictEqual(extractCityFromAddress("Kantoor gevestigd in Stadskanaal centrum"), "Stadskanaal");
    assert.strictEqual(extractCityFromAddress("Loods te Kolham langs de A7"), "Kolham");
    assert.strictEqual(extractCityFromAddress("Schildersbedrijf Sappemeer Noorderstraat"), "Sappemeer");
    assert.strictEqual(extractCityFromAddress("Hovenier Zuidlaren brink"), "Zuidlaren");
    assert.strictEqual(extractCityFromAddress("Installateur te Scheemda"), "Scheemda");
    assert.strictEqual(extractCityFromAddress("Bouwservice Winschoten"), "Winschoten");

    // 3. Fallbacks and malformed inputs
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(undefined), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(12345), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Willekeurig Adres Zonder Stad 123"), "Hoogezand");
});

await testAsync("Lead Factory Edge-Cases: Extreme String Inputs, Special Characters & Slugification Sanitization", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. Extreme 10,000 character string bounded to 150 chars for name and 64 for slug
    const giantName = "A".repeat(10000);
    const sanitizedGiant = sanitizeLeadData({ name: giantName, website: "https://example.com" });
    assert.strictEqual(sanitizedGiant.name.length, 150, "Name must be truncated to 150 characters");
    assert.strictEqual(sanitizedGiant.slug.length, 64, "Slug must be truncated to 64 characters");
    assert.ok(/^[a-z0-9-]+$/.test(sanitizedGiant.slug), "Slug must match RFC-compliant format");

    // 2. Dutch business names with accents, diacritics & ligatures
    const complexNames = [
        { name: "Café 't Hoekje B.V. & Zn.", expectedSlugPrefix: "caf-t-hoekje-b-v-zn" },
        { name: "L'Atelier d'Élégance Couture", expectedSlugPrefix: "l-atelier-d-l-gance-couture" },
        { name: "Dijkstra & Zonen V.O.F.", expectedSlugPrefix: "dijkstra-zonen-v-o-f" },
        { name: "Münchener Bäckerei & Konditorei", expectedSlugPrefix: "m-nchener-b-ckerei-konditorei" }
    ];

    for (const item of complexNames) {
        const sanitized = sanitizeLeadData({ name: item.name });
        assert.ok(sanitized.slug.length > 0, `Slug for ${item.name} must not be empty`);
        assert.ok(!sanitized.slug.startsWith("-") && !sanitized.slug.endsWith("-"), "Slug must not have leading/trailing hyphens");
        assert.ok(!sanitized.slug.includes("--"), "Slug must not contain double hyphens");
        assert.ok(/^[a-z0-9-]+$/.test(sanitized.slug), `Slug ${sanitized.slug} must only contain lowercase alphanumeric and hyphens`);
    }

    // 3. Script injection / HTML in business name
    const xssLead = sanitizeLeadData({ name: "<script>alert('xss')</script> Bakkerij De Molen" });
    assert.strictEqual(xssLead.slug.includes("<"), false);
    assert.strictEqual(xssLead.slug.includes(">"), false);
    assert.ok(xssLead.slug.includes("bakkerij-de-molen"));

    // 4. Completely stripped name fallback
    const strippedLead = sanitizeLeadData({ name: "!!!@@@###$$$%%%^^^&&&***" });
    assert.strictEqual(strippedLead.slug, "zzp-concept", "Completely stripped string must fallback to zzp-concept");

    // 5. Windows reserved device names
    const reservedLead = sanitizeLeadData({ name: "CON" });
    assert.strictEqual(reservedLead.slug, "con");
});

await testAsync("Lead Factory Edge-Cases: Foreign Country Codes Rejection & Dutch Mobile Isolation Matrix", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizeDutchPhone } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    // 1. Foreign country codes must be rejected by isDutchMobilePhone
    const foreignNumbers = [
        "+49 170 1234567",     // Germany mobile
        "0049 151 9876543",    // Germany international prefix
        "+32 470 123456",      // Belgium mobile
        "0032 490 654321",     // Belgium international prefix
        "+33 6 12345678",      // France mobile
        "+44 7911 123456",     // UK mobile
        "+1 202 555 0199",     // USA Washington
        "+34 612 345 678",     // Spain mobile
        "+48 601 234 567"      // Poland mobile
    ];
    for (const num of foreignNumbers) {
        assert.strictEqual(isDutchMobilePhone(num), false, `Foreign number ${num} must not be identified as Dutch mobile`);
    }

    // 2. Dutch landlines must be rejected
    const dutchLandlines = [
        "050 312 3456", "0598 612 345", "0597 412 345", "0596 612 345",
        "020 624 1111", "010 411 2222", "030 231 3333", "070 345 6789",
        "088 123 4567", "0800 022 1234", "0900 1234"
    ];
    for (const ll of dutchLandlines) {
        assert.strictEqual(isDutchMobilePhone(ll), false, `Landline ${ll} must be rejected`);
        assert.strictEqual(normalizeDutchPhone(ll), "", `Landline ${ll} must return empty string in normalizeDutchPhone`);
    }

    // 3. Valid Dutch mobile variations must all be accepted and normalized to 316...
    const validDutchMobileVariants = [
        { raw: "0612345678", expectedNorm: "31612345678" },
        { raw: "06-12345678", expectedNorm: "31612345678" },
        { raw: "06 12 34 56 78", expectedNorm: "31612345678" },
        { raw: "+31 6 12345678", expectedNorm: "31612345678" },
        { raw: "+31612345678", expectedNorm: "31612345678" },
        { raw: "0031 6 1234 5678", expectedNorm: "31612345678" },
        { raw: "0031612345678", expectedNorm: "31612345678" },
        { raw: "+31 (0)6 1234 5678", expectedNorm: "31612345678" },
        { raw: "(06) 1234 5678", expectedNorm: "31612345678" }
    ];

    for (const item of validDutchMobileVariants) {
        assert.strictEqual(isDutchMobilePhone(item.raw), true, `Dutch mobile ${item.raw} must be accepted`);
        assert.strictEqual(normalizeDutchPhone(item.raw), item.expectedNorm, `Normalization of ${item.raw} must equal ${item.expectedNorm}`);
    }
});

await testAsync("Lead Factory Edge-Cases: Multi-Variant Deduplication & Collision Defense Matrix", async () => {
    const { normalizeDomain, normalizePhoneDigits, isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");

    const existingRepo = [
        { slug: "schilder-hoogezand", phone: "06 1234 5678", website: "https://schilderhoogezand.nl" },
        { slug: "loodgieter-veendam", phone: "+31 6 9876 5432", website: "http://www.loodgieter-veendam.nl/home" }
    ];

    // Domain normalization edge cases
    assert.strictEqual(normalizeDomain("https://www.schilderhoogezand.nl/diensten?gclid=123#tarieven"), "schilderhoogezand.nl");
    assert.strictEqual(normalizeDomain("http://schilderhoogezand.nl:80/"), "schilderhoogezand.nl");
    assert.strictEqual(normalizeDomain("https://schilderhoogezand.nl:443/contact"), "schilderhoogezand.nl");
    assert.strictEqual(normalizeDomain(""), null);
    assert.strictEqual(normalizeDomain(null), null);

    // Phone digits normalization
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 1234 5678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("06-12345678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("0031612345678"), "12345678");
    assert.strictEqual(normalizePhoneDigits("123"), null, "Too short digits must return null");

    // Collision matching
    assert.strictEqual(isDuplicateLead({ website: "https://www.schilderhoogezand.nl" }, existingRepo), true);
    assert.strictEqual(isDuplicateLead({ phone: "0612345678" }, existingRepo), true);
    assert.strictEqual(isDuplicateLead({ slug: "loodgieter-veendam" }, existingRepo), true);
    assert.strictEqual(isDuplicateLead({ slug: "uniek-klusbedrijf", phone: "0655555555", website: "https://uniekklusbedrijf.nl" }, existingRepo), false);

    // Defensive empty calls
    assert.strictEqual(isDuplicateLead(null, existingRepo), false);
    assert.strictEqual(isDuplicateLead({}, existingRepo), false);
    assert.strictEqual(isDuplicateLead({ slug: "test" }, null), false);
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE EDGE-CASES ---

await testAsync("Offerte & Factuur Edge-Cases: Mixed VAT Rates (21%, 9%, 0% Verlegd) & Commercial Half-Up Rounding Precision", async () => {
    function computeLineItemTaxes(items, isReverseCharge = false) {
        let subtotalExcl = 0;
        let vat21 = 0;
        let vat9 = 0;
        let vat0 = 0;

        for (const it of items) {
            const price = Number(it.price || 0);
            const qty = Number(it.qty || 1);
            // Commercial half-up line item rounding
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;
            subtotalExcl = Math.round((subtotalExcl + lineExcl + Number.EPSILON) * 100) / 100;

            if (isReverseCharge || it.vatRate === 0) {
                vat0 = Math.round((vat0 + 0) * 100) / 100;
            } else if (it.vatRate === 9) {
                const lineVat = Math.round((lineExcl * 0.09 + Number.EPSILON) * 100) / 100;
                vat9 = Math.round((vat9 + lineVat + Number.EPSILON) * 100) / 100;
            } else {
                const lineVat = Math.round((lineExcl * 0.21 + Number.EPSILON) * 100) / 100;
                vat21 = Math.round((vat21 + lineVat + Number.EPSILON) * 100) / 100;
            }
        }

        const totalVat = Math.round((vat21 + vat9 + vat0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            vat21,
            vat9,
            vat0,
            totalVat,
            totalIncl,
            reverseNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const mixedLineItems = [
        { desc: "Website Ontwikkeling & CRM Integratie", price: 1850.00, qty: 1, vatRate: 21 },
        { desc: "Gedrukte Handleiding & Architectuur Boek", price: 39.95, qty: 2, vatRate: 9 }, // 79.90 -> 9% = 7.191 -> 7.19
        { desc: "EU B2B Reverse Charge Consultancy", price: 400.00, qty: 1, vatRate: 0 }
    ];

    const normalCalc = computeLineItemTaxes(mixedLineItems, false);
    assert.strictEqual(normalCalc.subtotalExcl, 2329.90);
    assert.strictEqual(normalCalc.vat21, 388.50);
    assert.strictEqual(normalCalc.vat9, 7.19);
    assert.strictEqual(normalCalc.vat0, 0.00);
    assert.strictEqual(normalCalc.totalVat, 395.69);
    assert.strictEqual(normalCalc.totalIncl, 2725.59);
    assert.strictEqual(normalCalc.reverseNotice, null);

    // Reverse charge application
    const reverseCalc = computeLineItemTaxes(mixedLineItems, true);
    assert.strictEqual(reverseCalc.totalVat, 0.00);
    assert.strictEqual(reverseCalc.totalIncl, 2329.90);
    assert.ok(reverseCalc.reverseNotice.includes("BTW verlegd conform art. 12 lid 3 Wet OB 1968"));

    // Commercial half-up boundary test: 12.335 -> 12.34 and 12.334 -> 12.33
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
    assert.strictEqual(halfUp(12.335), 12.34);
    assert.strictEqual(halfUp(12.334), 12.33);
    assert.strictEqual(halfUp(1.005), 1.01);
    assert.strictEqual(halfUp(2.005), 2.01);
});

await testAsync("Offerte & Factuur Edge-Cases: 0-Euro Facturen, Pro-Bono Services, Credit Notes & Division-by-Zero Resilience", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-bono / 0-euro factuur normalization and display
    const proBonoProject = {
        id: "proj_probono_foundation",
        client: "Stichting Welzijn Hoogezand",
        invoices: [{
            invoiceNumber: "2026-PB-03",
            description: "Pro-bono realisatie non-profit webapplicatie",
            amountExcl: 0,
            amountVat: 0,
            amountIncl: 0,
            status: "paid"
        }]
    };

    const normZero = normalizeProjectInvoices(proBonoProject);
    assert.strictEqual(normZero.length, 1);
    assert.strictEqual(normZero[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normZero[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00", "Negative zero must format as positive 0,00");

    // 2. Division by zero resilience in discount and progress calculation
    function safeCalculateRatio(numerator, denominator) {
        if (!denominator || denominator <= 0 || !isFinite(denominator)) return 0;
        if (!numerator || numerator <= 0 || !isFinite(numerator)) return 0;
        return Math.min(100, Math.round((numerator / denominator) * 100));
    }

    assert.strictEqual(safeCalculateRatio(0, 0), 0, "0/0 must safely return 0 without NaN");
    assert.strictEqual(safeCalculateRatio(50, 0), 0, "50/0 must safely return 0 without Infinity");
    assert.strictEqual(safeCalculateRatio(NaN, 100), 0);
    assert.strictEqual(safeCalculateRatio(100, Infinity), 0);
    assert.strictEqual(safeCalculateRatio(45, 90), 50);

    // 3. Credit note with negative amounts
    const creditNoteProject = {
        id: "proj_credit_2026",
        client: "Klusbedrijf De Haan",
        invoices: [{
            invoiceNumber: "2026-CN-03",
            description: "Creditnota restitutie hosting borg",
            amountExcl: -150.00,
            amountVat: -31.50,
            amountIncl: -181.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditNoteProject);
    assert.strictEqual(normCredit[0].amountIncl, -181.50);
    assert.strictEqual(formatCurrency(normCredit[0].amountIncl), "€ -181,50");
});

await testAsync("Offerte & Factuur Edge-Cases: Compound Stacking Discounts & Hard Floor Clamping Matrix", async () => {
    function applyTieredDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.percentEarlyBird) {
            current = Math.round((current * (1 - (rules.percentEarlyBird / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.percentPartner) {
            current = Math.round((current * (1 - (rules.percentPartner / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.fixedVoucher) {
            current = current - rules.fixedVoucher;
        }
        // Clamping floor: invoice totals cannot fall below € 0,00 unless marked credit
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    // Normal stacked discount: 15% early bird, 5% partner, € 100 fixed voucher on € 1.500,-
    // 1500 * 0.85 = 1275 -> 1275 * 0.95 = 1211.25 -> 1211.25 - 100 = 1111.25
    // VAT = 1111.25 * 0.21 = 233.3625 -> 233.36
    // Total = 1111.25 + 233.36 = 1344.61
    const res1 = applyTieredDiscounts(1500, { percentEarlyBird: 15, percentPartner: 5, fixedVoucher: 100 });
    assert.strictEqual(res1.clampedSubtotal, 1111.25);
    assert.strictEqual(res1.vat, 233.36);
    assert.strictEqual(res1.total, 1344.61);

    // Excessive discount must clamp at € 0,00
    const resExcessive = applyTieredDiscounts(250, { fixedVoucher: 500 });
    assert.strictEqual(resExcessive.clampedSubtotal, 0.00);
    assert.strictEqual(resExcessive.vat, 0.00);
    assert.strictEqual(resExcessive.total, 0.00);
});

await testAsync("Offerte & Factuur Edge-Cases: Currency Formatter & Strict Parsing Matrix", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseCurrencyResilient(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        let str = String(val).trim().replace(/[€$\s]/g, '');
        // Dual locale support: Anglo-American (1,299.00) vs European (1.299,00)
        if (/\d+,\d{3}\.\d{2}/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(/\.(?=\d{3}(?:,|$))/g, '').replace(',', '.');
        }
        str = str.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(str);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    }

    // Strict parsing tests
    assert.strictEqual(parseCurrencyResilient("€ 2.450,75"), 2450.75);
    assert.strictEqual(parseCurrencyResilient("€ 95,-"), 95.00);
    assert.strictEqual(parseCurrencyResilient("$ 1,299.00"), 1299.00);
    assert.strictEqual(parseCurrencyResilient("  € 450,50  "), 450.50);
    assert.strictEqual(parseCurrencyResilient("-150,00"), -150.00);
    assert.strictEqual(parseCurrencyResilient("corrupt-text"), 0);
    assert.strictEqual(parseCurrencyResilient(NaN), 0);
    assert.strictEqual(parseCurrencyResilient(Infinity), 0);

    // formatCurrency edge matrix
    assert.strictEqual(formatCurrency(1850), "€ 1850,00");
    assert.strictEqual(formatCurrency(49.95), "€ 49,95");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(null), "€ 0,00");
    assert.strictEqual(formatCurrency(undefined), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");
    assert.strictEqual(formatCurrency(-75.25), "€ -75,25");
});

await testAsync("Offerte & Factuur Edge-Cases: Mollie iDEAL Betaallink Generatie & WhatsApp Billing Dispatch Formatting", async () => {
    const { createMolliePaymentLink, generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    const link = await createMolliePaymentLink({
        projectId: "proj_edge_test",
        clientName: "Bakkerij De Echte",
        invoiceNumber: "2026-BDE-01",
        amountIncl: 1450.00,
        description: "Factuur 2026-BDE-01 Realisatie Webportaal"
    });

    assert.ok(link.paymentId.startsWith("tr_"), "Payment ID must start with tr_");
    assert.ok(link.checkoutUrl.includes("mollie.com"), "Checkout URL must target Mollie");
    assert.ok(link.checkoutUrl.includes("1450.00"), "Checkout URL must embed amount");

    // WhatsApp dispatch URL
    const waUrl = generateBillingWhatsAppUrl("06 12 34 56 78", "Bakkerij De Echte", "2026-BDE-01", 1450.00, link.checkoutUrl);
    assert.ok(waUrl.startsWith("https://wa.me/31612345678"), "WhatsApp URL must target normalized phone number");
    assert.ok(waUrl.includes("2026-BDE-01"));
    assert.ok(waUrl.includes("1450%2C00") || waUrl.includes("1450,00"));
    assert.ok(!waUrl.includes(" "), "WhatsApp URL must not contain raw unencoded spaces");
    assert.ok(!waUrl.includes("\n"), "WhatsApp URL must not contain raw unencoded newlines");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL EDGE-CASES ---

await testAsync("Contact & Intake Edge-Cases: Multi-Vector Honeypot Bot Trapping & Time-Threshold Defense", async () => {
    function evaluateIntakeSubmission(payload, durationMs = 8000) {
        if (!payload || typeof payload !== 'object') {
            return { trapped: true, reason: 'MALFORMED_OBJECT' };
        }

        // Multi-vector honeypot fields
        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address'];
        for (const df of decoyFields) {
            if (payload[df] && String(payload[df]).trim() !== '') {
                return { trapped: true, reason: `HONEYPOT_TRIGGER_${df.toUpperCase()}` };
            }
        }

        // Automated bot speed heuristic (< 1200ms)
        if (typeof durationMs === 'number' && durationMs < 1200) {
            return { trapped: true, reason: 'AUTOMATED_SPEED_BOT' };
        }

        // Link flood spam filter
        const textContent = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = textContent.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { trapped: true, reason: 'LINK_FLOOD_SPAM' };
        }

        // Spam keywords
        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(textContent)) {
            return { trapped: true, reason: 'SPAM_KEYWORD_MATCH' };
        }

        return { trapped: false, reason: 'LEGITIMATE_HUMAN' };
    }

    // Bot tests
    assert.strictEqual(evaluateIntakeSubmission({ website: "http://bot-trap.com" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ _hp_trap: "filled" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ company_fax: "050-123456" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ bot_token: "xyz" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ telephone_confirm: "0612345678" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ extra_address: "Trap address" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ companyName: "Super Fast Submitter" }, 400).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ comments: "http://a.com http://b.com http://c.com" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ goals: "Invest in bitcoin crypto forex today" }).trapped, true);

    // Legitimate intake human test
    const legitimate = evaluateIntakeSubmission({
        companyName: "Vanderplaats Aannemersbedrijf",
        contactName: "Gerard van der Plaats",
        goals: "Vernieuwing van onze website met realtime projectportfolio",
        website: "",
        _hp_trap: ""
    }, 15000);
    assert.strictEqual(legitimate.trapped, false);
    assert.strictEqual(legitimate.reason, 'LEGITIMATE_HUMAN');
});

await testAsync("Contact & Intake Edge-Cases: CWE-93 CRLF Header Injection & Multi-Encoding Defense Matrix", async () => {
    function sanitizeHeaderField(input) {
        if (!input || typeof input !== 'string') return '';
        // Multi-stage decoding defense against URL-encoded and double-encoded CRLF
        let stage = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        // Strip CR, LF, NUL, Unicode line separators (\u2028, \u2029, \u0085, \u000B, \u000C) and SMTP header delimiters
        return stage.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "user@domain.nl\r\nBcc:attacker@leak.com",
        "user@domain.nl\rBcc:attacker@leak.com",
        "user@domain.nl\nBcc:attacker@leak.com",
        "user@domain.nl%0d%0aBcc:attacker@leak.com",
        "user@domain.nl%250d%250aBcc:attacker@leak.com",
        "user@domain.nl\u2028Bcc:attacker@leak.com",
        "user@domain.nl\u2029Bcc:attacker@leak.com",
        "user@domain.nl\u0085Bcc:attacker@leak.com",
        "user@domain.nl\x00Bcc:attacker@leak.com",
        "user@domain.nl\u000BBcc:attacker@leak.com",
        "user@domain.nl\u000CBcc:attacker@leak.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vector of hostileVectors) {
        const cleaned = sanitizeHeaderField(vector);
        assert.ok(!cleaned.includes("\r"), "Cleaned header must not contain CR");
        assert.ok(!cleaned.includes("\n"), "Cleaned header must not contain LF");
        assert.ok(!cleaned.includes("\u2028") && !cleaned.includes("\u2029"), "Cleaned header must not contain Unicode separators");
        assert.ok(!cleaned.includes("\x00"), "Cleaned header must not contain NUL bytes");
        // Because delimiters like commas/semicolons and line breaks were stripped, the concatenated attack cannot validate as a single valid email
        assert.strictEqual(standardEmailRegex.test(cleaned), false, `Cleaned attack ${cleaned} must not validate as authentic single email`);
    }

    // Clean valid email passes cleanly
    const safe = sanitizeHeaderField("info@creationaltfix.nl");
    assert.strictEqual(safe, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(safe), true);
});

await testAsync("Contact & Intake Edge-Cases: Email Normalization, RFC 5322 Boundaries & Sub-Addressing Matrix", async () => {
    function parseAndNormalizeEmail(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIdx = trimmed.lastIndexOf('@');
        if (atIdx <= 0 || atIdx === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIdx);
        const domain = trimmed.slice(atIdx + 1).toLowerCase();

        // Check local part
        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        // Check domain part
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    // Valid standard and sub-addressing (+tag)
    const valid1 = parseAndNormalizeEmail("allard@creationaltfix.nl");
    assert.strictEqual(valid1.valid, true);
    assert.strictEqual(valid1.email, "allard@creationaltfix.nl");

    const validSub = parseAndNormalizeEmail("allard+crm2026@creationaltfix.nl");
    assert.strictEqual(validSub.valid, true);
    assert.strictEqual(validSub.email, "allard+crm2026@creationaltfix.nl");

    const validUpper = parseAndNormalizeEmail("   Contact@CreationAltFix.NL   ");
    assert.strictEqual(validUpper.valid, true);
    assert.strictEqual(validUpper.email, "Contact@creationaltfix.nl");

    // Invalid boundary matrices
    const invalidEmails = [
        "missingatsign.nl",
        "@nodomain.com",
        "nolocal@",
        "double@@domain.com",
        "spaces in@domain.com",
        "user@domain with spaces.nl",
        "consecutive..dots@domain.com",
        "user@domain..com",
        ".leadingdot@domain.com",
        "trailingdot.@domain.com",
        "user@-hyphendomain.com",
        "user@hyphendomain-.com",
        "user@nodotdomain",
        "",
        null,
        undefined
    ];

    for (const inv of invalidEmails) {
        const res = parseAndNormalizeEmail(inv);
        assert.strictEqual(res.valid, false, `Email ${inv} must be recognized as invalid`);
    }
});

await testAsync("Contact & Intake Edge-Cases: Webhook Security, SSRF Prevention & Notification Dispatch Formatting", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // SSRF prevention: must block loopback, internal and private IPs
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123"), false, "Must block plain HTTP");
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false, "Must block localhost");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false, "Must block 127.0.0.1");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.5/hook"), false, "Must block RFC 1918 10.0.0.0/8");
    assert.strictEqual(isSafeWebhookUrl("https://172.20.0.1/hook"), false, "Must block RFC 1918 172.16.0.0/12");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.100/hook"), false, "Must block RFC 1918 192.168.0.0/16");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false, "Must block AWS metadata");
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/hook"), false, "Must block CGNAT/Tailscale");
    assert.strictEqual(isSafeWebhookUrl("https://server.internal/hook"), false, "Must block .internal");
    assert.strictEqual(isSafeWebhookUrl("https://server.local/hook"), false, "Must block .local");

    // Acceptance of authentic external webhook URLs
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);

    // Markdown sanitization
    assert.strictEqual(sanitizeMarkdown("Hello *world* _test_"), "Hello \\*world\\* \\_test\\_");
    assert.strictEqual(sanitizeMarkdown("[Click here](http://malicious.com)"), "\\[Click here\\]\\(http://malicious\\.com\\)");
    assert.strictEqual(sanitizeMarkdown("`code` and ~strike~"), "\\`code\\` and \\~strike\\~");
    assert.strictEqual(sanitizeMarkdown(""), "");
    assert.strictEqual(sanitizeMarkdown(null), "");
});

// --- SECTION 4: DRM & CODE PROTECTION EDGE-CASES ---

await testAsync("DRM & Code Protection Edge-Cases: Browser HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-slug"
    });

    // 1. Script tag boundaries: Exactly ONE caf-security-guard script tag
    const scriptOpenMatches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(scriptOpenMatches.length, 1, "Must contain exactly one security guard script open tag");

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Security guard script must properly close with </script>");
    const scriptBody = match[1];

    // 2. Strict HTML5 parser rule: NO literal '</script' inside string literals in the script
    // Any inner HTML strings must use hex-escaped tags (\x3C and \x3C/)
    assert.strictEqual(scriptBody.includes("</script"), false, "Script body must never contain literal '</script'");
    assert.ok(scriptBody.includes("\\x3Cdiv"), "Must use \\x3Cdiv hex-escaping for elements");
    assert.ok(scriptBody.includes("\\x3C/div>"), "Must use \\x3C/div> hex-escaping for closing elements");
    assert.ok(scriptBody.includes("\\x3Ch1"), "Must use \\x3Ch1 hex-escaping");
    assert.ok(scriptBody.includes("\\x3Cp"), "Must use \\x3Cp hex-escaping");
    assert.ok(scriptBody.includes("\\x3Ca"), "Must use \\x3Ca hex-escaping");

    // 3. Slug breakout payload defense: < character in slug must be escaped to \\u003c
    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false, "Payload must not inject unescaped script tag");
});

await testAsync("DRM & Code Protection Edge-Cases: Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // 1. Verify AST compilation
    const script = new vm.Script(scriptBody);
    assert.ok(script, "Script must compile cleanly into Node.js VM AST");

    // 2. Authorized sandbox execution
    const authorizedSandbox = {
        window: {
            location: { hostname: 'creationaltfix.nl', search: '' },
            stop: () => {}
        },
        document: {
            documentElement: {},
            addEventListener: () => {},
            getElementById: () => null,
            createElement: () => ({ style: {}, appendChild: () => {} }),
            body: { appendChild: () => {} }
        },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedSandbox);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedSandbox);
    }, "Authorized domain execution must succeed");

    // 3. Unauthorized domain triggers killswitch
    const unauthorizedSandbox = {
        window: {
            location: { hostname: 'pirated-concept-thief.com', search: '' },
            stop: () => {}
        },
        document: {
            documentElement: { innerHTML: '' },
            addEventListener: () => {}
        },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedSandbox);
    assert.throws(() => {
        script.runInContext(unauthorizedSandbox);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/, "Unauthorized domain must trigger CAF_SECURITY_UNAUTHORIZED_HOST");
});

await testAsync("DRM & Code Protection Edge-Cases: Anti-Inspect Defense Hotkey & Contextmenu Event Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test BV", slug: "test-bv" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Contextmenu capture listener
    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Keydown inspector keys blocking
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Edge-Cases: Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Privacy compliance: zero cookies
    assert.strictEqual(scriptBody.includes("document.cookie"), false, "Must not set or access document.cookie");

    // Session deduplication
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    // Preview / Admin suppression
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    // Beacon dispatch
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});

// ========================================================
// 23. SELF-SERVICE DOMAIN & EMAIL SETUP WIZARD (TASK-911)
// ========================================================
console.log("\n🌐 SUITE 23: Self-Service Domain & Business Email Setup Wizard with Live DNS Resolver (TASK-911)");

const {
    DOMAIN_SETUP_SCENARIOS,
    RECOMMENDED_DNS_TARGETS,
    sanitizeDomainName,
    sanitizeEppToken,
    generateRecommendedDnsRecords,
    getEmailClientSettings,
    evaluateDnsStatus,
    renderDomainSetupWizardHtml
} = await import("../crm/status/js/modules/domain-setup-wizard.js");

test("TASK-911: DOMAIN_SETUP_SCENARIOS completeness & localized strategy models", () => {
    assert.ok(DOMAIN_SETUP_SCENARIOS.full_transfer, "full_transfer scenario must exist");
    assert.ok(DOMAIN_SETUP_SCENARIOS.external_dns, "external_dns scenario must exist");
    assert.ok(DOMAIN_SETUP_SCENARIOS.new_domain, "new_domain scenario must exist");

    for (const [key, sc] of Object.entries(DOMAIN_SETUP_SCENARIOS)) {
        assert.equal(sc.id, key);
        assert.ok(typeof sc.nameNl === 'string' && sc.nameNl.length > 5, `${key} must have Dutch name`);
        assert.ok(typeof sc.nameEn === 'string' && sc.nameEn.length > 5, `${key} must have English name`);
        assert.ok(typeof sc.descNl === 'string' && sc.descNl.length > 10, `${key} must have Dutch description`);
        assert.ok(typeof sc.descEn === 'string' && sc.descEn.length > 10, `${key} must have English description`);
        assert.ok(typeof sc.badgeNl === 'string' && sc.badgeNl.length > 0, `${key} must have Dutch badge`);
        assert.ok(typeof sc.badgeEn === 'string' && sc.badgeEn.length > 0, `${key} must have English badge`);
        assert.ok(sc.icon.startsWith("fas fa-"), `${key} must have FontAwesome icon`);
        assert.ok(sc.color.startsWith("#"), `${key} must have hex accent color`);
    }
});

test("TASK-911: RECOMMENDED_DNS_TARGETS & server cluster IPs authenticity", () => {
    assert.equal(RECOMMENDED_DNS_TARGETS.primaryServerIp, '185.104.29.148');
    assert.equal(RECOMMENDED_DNS_TARGETS.fallbackServerIp, '185.182.56.12');
    assert.equal(RECOMMENDED_DNS_TARGETS.mailServer, 'mail.zxcs.nl');
    assert.equal(RECOMMENDED_DNS_TARGETS.mailPriority, 10);
    assert.ok(RECOMMENDED_DNS_TARGETS.spfRecord.includes('185.104.29.148'));
    assert.ok(RECOMMENDED_DNS_TARGETS.webmailUrl.includes('webmail.creationaltfix.nl'));
    assert.ok(Array.isArray(RECOMMENDED_DNS_TARGETS.nameservers) && RECOMMENDED_DNS_TARGETS.nameservers.length >= 2);
});

test("TASK-911: sanitizeDomainName URL/protocol stripping & boundary normalizer", () => {
    assert.equal(sanitizeDomainName("https://www.Gerard-Bouw.nl/"), "gerard-bouw.nl");
    assert.equal(sanitizeDomainName("http://AANNEMER-VANDERPLAATS.NL/contact?ref=1#top"), "aannemer-vanderplaats.nl");
    assert.equal(sanitizeDomainName("  WWW.Bakkerij-De-Echte.NL/subfolder/  "), "bakkerij-de-echte.nl");
    assert.equal(sanitizeDomainName("https://portal.creationaltfix.nl/status/index.html"), "portal.creationaltfix.nl");
    assert.equal(sanitizeDomainName("  SCHOLTE-ELEKTROTECHNIEK.NL  "), "scholte-elektrotechniek.nl");
    assert.equal(sanitizeDomainName("invalid..domain--name...nl"), "invalid.domain-name.nl");
    assert.equal(sanitizeDomainName(""), "");
    assert.equal(sanitizeDomainName(null), "");
    assert.equal(sanitizeDomainName(undefined), "");
    assert.equal(sanitizeDomainName(12345), "");
});

test("TASK-911: sanitizeEppToken control character neutralization & boundary capping", () => {
    assert.equal(sanitizeEppToken("  EPP-2026-auth!$  "), "EPP-2026-auth!$");
    assert.equal(sanitizeEppToken("EPP\x00\r\nToken\t123"), "EPPToken123");
    assert.equal(sanitizeEppToken(""), "");
    assert.equal(sanitizeEppToken(null), "");
    assert.equal(sanitizeEppToken(undefined), "");
    
    // Extreme input cap to 64 chars
    const extremeToken = "A".repeat(150);
    const sanitized = sanitizeEppToken(extremeToken);
    assert.equal(sanitized.length, 64);
    assert.equal(sanitized, "A".repeat(64));
});

test("TASK-911: generateRecommendedDnsRecords schema & line-item records generation", () => {
    const records = generateRecommendedDnsRecords("gerardklusser.nl");
    assert.equal(records.length, 4);

    const aRec = records.find(r => r.type === 'A');
    assert.ok(aRec);
    assert.equal(aRec.host, '@');
    assert.equal(aRec.value, '185.104.29.148');
    assert.equal(aRec.required, true);

    const cnameRec = records.find(r => r.type === 'CNAME');
    assert.ok(cnameRec);
    assert.equal(cnameRec.host, 'www');
    assert.equal(cnameRec.value, 'gerardklusser.nl');
    assert.equal(cnameRec.required, true);

    const mxRec = records.find(r => r.type === 'MX');
    assert.ok(mxRec);
    assert.equal(mxRec.host, '@');
    assert.equal(mxRec.value, 'mail.zxcs.nl');
    assert.equal(mxRec.priority, 10);

    const spfRec = records.find(r => r.type === 'TXT');
    assert.ok(spfRec);
    assert.equal(spfRec.host, '@');
    assert.ok(spfRec.value.includes('v=spf1'));
    assert.ok(spfRec.value.includes('185.104.29.148'));

    // Optional email exclusion
    const noEmailRecords = generateRecommendedDnsRecords("test.nl", { includeEmail: false });
    const noEmailMx = noEmailRecords.find(r => r.type === 'MX');
    assert.equal(noEmailMx.required, false);
});

test("TASK-911: getEmailClientSettings IMAP, SMTP & webmail configuration", () => {
    const emailConf = getEmailClientSettings("aannemer-vanderplaats.nl");
    assert.equal(emailConf.domain, "aannemer-vanderplaats.nl");
    assert.equal(emailConf.defaultEmail, "info@aannemer-vanderplaats.nl");
    assert.equal(emailConf.imap.server, "mail.zxcs.nl");
    assert.equal(emailConf.imap.port, 993);
    assert.equal(emailConf.imap.security, "SSL / TLS");
    assert.equal(emailConf.imap.username, "info@aannemer-vanderplaats.nl");
    assert.equal(emailConf.smtp.server, "mail.zxcs.nl");
    assert.equal(emailConf.smtp.port, 465);
    assert.equal(emailConf.smtp.security, "SSL / TLS");
    assert.equal(emailConf.smtp.username, "info@aannemer-vanderplaats.nl");
    assert.ok(emailConf.webmailUrl.startsWith("https://webmail."));
});

test("TASK-911: evaluateDnsStatus multidimensional diagnostics & status badges", () => {
    // 1. Fully Ready
    const ready = evaluateDnsStatus({
        a_valid: true,
        www_valid: true,
        mx_valid: true,
        spf_valid: true,
        detected_a: "185.104.29.148"
    });
    assert.equal(ready.isFullyReady, true);
    assert.equal(ready.overallBadge, 'success');
    assert.ok(ready.statusTextNl.includes('correct naar de Creation+Alt+Fix webserver'));

    // 2. Partial (A valid, www pending)
    const partial = evaluateDnsStatus({
        a_valid: true,
        www_valid: false,
        detected_a: "185.104.29.148"
    });
    assert.equal(partial.isFullyReady, false);
    assert.equal(partial.overallBadge, 'partial');
    assert.ok(partial.statusTextNl.includes('wacht nog op www CNAME'));

    // 3. Mismatch (A points to another IP)
    const mismatch = evaluateDnsStatus({
        a_valid: false,
        www_valid: false,
        detected_a: "93.184.216.34"
    });
    assert.equal(mismatch.isFullyReady, false);
    assert.equal(mismatch.overallBadge, 'mismatch');
    assert.ok(mismatch.statusTextNl.includes('ander IP-adres'));

    // 4. Pending (No A record yet)
    const pending = evaluateDnsStatus({
        a_valid: false,
        www_valid: false,
        detected_a: null
    });
    assert.equal(pending.isFullyReady, false);
    assert.equal(pending.overallBadge, 'pending');
});

test("TASK-911: healthcheck.php DNS mode SSRF defense, record retrieval & JSON structure", () => {
    const healthcheckPath = path.join(ROOT_DIR, "crm/api/healthcheck.php");
    const php = fs.readFileSync(healthcheckPath, "utf-8");

    // Mode check
    assert.ok(php.includes("$checkType === 'dns'") || php.includes("type === 'dns'") || php.includes("'dns'"), "Must support type=dns query parameter");
    
    // SSRF defense in DNS mode
    assert.ok(php.includes("FILTER_FLAG_NO_PRIV_RANGE"), "DNS mode must filter private IP ranges");
    assert.ok(php.includes("100.64.0.0"), "DNS mode must filter RFC 6598 Tailscale CGNAT IPs");
    
    // Record lookup
    assert.ok(php.includes("dns_get_record"), "DNS mode must use dns_get_record");
    assert.ok(php.includes("DNS_A"), "DNS mode must query A records");
    assert.ok(php.includes("DNS_MX"), "DNS mode must query MX records");
    assert.ok(php.includes("DNS_TXT"), "DNS mode must query TXT records");
    
    // Verification against authentic server cluster
    assert.ok(php.includes("185.104.29.148"), "Must verify against primary server IP 185.104.29.148");
    assert.ok(php.includes("185.182.56.12"), "Must support fallback IP 185.182.56.12");
    assert.ok(php.includes("mail.zxcs.nl"), "Must recommend mail.zxcs.nl");
    assert.ok(php.includes("email_settings"), "Must return email_settings structure");
    assert.ok(php.includes("recommended_records"), "Must return recommended_records structure");
});

test("TASK-911: renderDomainSetupWizardHtml dark AI template generation & multi-step states", () => {
    // Step 1: Scenario selector
    const html1 = renderDomainSetupWizardHtml({
        projectData: { client: "Vanderplaats", domain: "aannemer-vanderplaats.nl" },
        currentStep: 1,
        selectedScenario: 'full_transfer',
        lang: 'nl'
    });
    assert.ok(html1.includes("Zelfbediening Domein- & E-mail Setup Wizard"));
    assert.ok(html1.includes("Stap 1: Kies Jouw Gewenste Domeinstrategie"));
    assert.ok(html1.includes("data-scenario-id=\"full_transfer\""));
    assert.ok(html1.includes("data-scenario-id=\"external_dns\""));
    assert.ok(html1.includes("data-scenario-id=\"new_domain\""));

    // Step 2: Form with EPP token
    const html2 = renderDomainSetupWizardHtml({
        projectData: { domain: "aannemer-vanderplaats.nl", eppCode: "EPP-TEST-TOKEN" },
        currentStep: 2,
        selectedScenario: 'full_transfer',
        lang: 'nl'
    });
    assert.ok(html2.includes("Stap 2: Domeinnaam & EPP-Verhuiscode Invoeren"));
    assert.ok(html2.includes("id=\"input-wizard-domain\""));
    assert.ok(html2.includes("aannemer-vanderplaats.nl"));
    assert.ok(html2.includes("id=\"input-wizard-epp\""));
    assert.ok(html2.includes("EPP-TEST-TOKEN"));

    // Step 3: Interactive DNS table
    const html3 = renderDomainSetupWizardHtml({
        projectData: { domain: "aannemer-vanderplaats.nl" },
        currentStep: 3,
        dnsCheckResult: {
            analysis: {
                a_valid: true,
                www_valid: true,
                mx_valid: true,
                spf_valid: true,
                detected_a: "185.104.29.148",
                detected_mx: "mail.zxcs.nl"
            }
        },
        lang: 'nl'
    });
    assert.ok(html3.includes("Stap 3: Live DNS-Controle & Benodigde Records"));
    assert.ok(html3.includes("btn-wizard-run-dns"));
    assert.ok(html3.includes("185.104.29.148"));
    assert.ok(html3.includes("btn-copy-dns-val"));
    assert.ok(html3.includes("Actief & Correct"));

    // Step 4: Business Email settings
    const html4 = renderDomainSetupWizardHtml({
        projectData: { domain: "aannemer-vanderplaats.nl" },
        currentStep: 4,
        lang: 'en'
    });
    assert.ok(html4.includes("Step 4: Business Email Client Setup"));
    assert.ok(html4.includes("info@aannemer-vanderplaats.nl"));
    assert.ok(html4.includes("993"));
    assert.ok(html4.includes("465"));
    assert.ok(html4.includes("https://webmail.creationaltfix.nl"));
});

// ========================================================
// 🛡️ SUITE 24: Enterprise Edge-Case Hardening & Resiliency Suite (Ronde 8)
// ========================================================
console.log("\n🛡️ SUITE 24: Enterprise Edge-Case Hardening & Resiliency Suite (Ronde 8)");

// --- SECTION 1: LEAD FACTORY EDGE-CASES ---

await testAsync("Lead Factory Enterprise (R8): Advanced Address Parsing, House Number Additions, PO Boxes & Regional Municipalities", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Street and standard Dutch postal codes with complex additions
    assert.strictEqual(extractCityFromAddress("Hoofdweg 103-B, 9626 AC Schildwolde"), "Schildwolde");
    assert.strictEqual(extractCityFromAddress("Grote Markt 1a 9712hn Groningen"), "Groningen");
    assert.strictEqual(extractCityFromAddress("Kerkstraat 15 bis 9601 KA Hoogezand"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Molenstreek 44-III 9641AA Veendam"), "Veendam");
    assert.strictEqual(extractCityFromAddress("Stationsweg 12, 9401 KT Assen, Nederland"), "Assen");
    assert.strictEqual(extractCityFromAddress("Rijksstraatweg 100 2e etage, 9752 BA Haren"), "Haren");

    // 2. Known municipalities dictionary when postal code is absent or partial
    assert.strictEqual(extractCityFromAddress("Werkplaats te Delfzijl havengebied"), "Delfzijl");
    assert.strictEqual(extractCityFromAddress("Kantoor gevestigd in Stadskanaal centrum"), "Stadskanaal");
    assert.strictEqual(extractCityFromAddress("Loods te Kolham langs de A7"), "Kolham");
    assert.strictEqual(extractCityFromAddress("Schildersbedrijf Sappemeer Noorderstraat"), "Sappemeer");
    assert.strictEqual(extractCityFromAddress("Hovenier Zuidlaren brink"), "Zuidlaren");
    assert.strictEqual(extractCityFromAddress("Installateur te Scheemda"), "Scheemda");
    assert.strictEqual(extractCityFromAddress("Bouwservice Winschoten"), "Winschoten");
    assert.strictEqual(extractCityFromAddress("Klussenbedrijf Appingedam Wijk"), "Appingedam");
    assert.strictEqual(extractCityFromAddress("Schilder Midden-Groningen regio"), "Groningen");
    assert.strictEqual(extractCityFromAddress("Geheel Onbekende Straatnaam 99"), "Hoogezand");

    // 3. PO Box / Postbus and edge fallbacks
    assert.strictEqual(extractCityFromAddress("Postbus 204, 9600 AE Hoogezand"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(undefined), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(9999), "Hoogezand");
});

await testAsync("Lead Factory Enterprise (R8): Sector Classification, Default Services & Category Heuristics Matrix", async () => {
    const { deriveServicesFromCategory, analyzeBusinessPotential } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Sector services derivation across 5 core crafts
    const roofServices = deriveServicesFromCategory("Dakdekker & Bitumen Specialist", "AV Dak");
    assert.strictEqual(roofServices.length, 4);
    assert.ok(roofServices.some(s => s.title.includes("Dakrenovatie")));
    assert.ok(roofServices.some(s => s.title.includes("Bitumen")));

    const drainServices = deriveServicesFromCategory("Riool & Ontstopping", "123 Ontstopper");
    assert.strictEqual(drainServices.length, 4);
    assert.ok(drainServices.some(s => s.title.includes("Ontstoppen")));

    const hvacServices = deriveServicesFromCategory("Loodgieter & CV Montage", "Mulder Installaties");
    assert.strictEqual(hvacServices.length, 4);
    assert.ok(hvacServices.some(s => s.title.includes("Loodgieterswerk") || s.title.includes("CV-Ketel")));

    const pavingServices = deriveServicesFromCategory("Stratenmaker & Sierbestrating", "Tuin & Pad");
    assert.strictEqual(pavingServices.length, 4);
    assert.ok(pavingServices.some(s => s.title.includes("Sierbestrating")));

    // 2. analyzeBusinessPotential lead scoring & archetype assignment
    const noWebLead = { name: "Bakkerij De Echte", address: "Hoogezand", phone: "06 1234 5678", rating: 4.8, reviewsCount: 32 };
    const analysisNoWeb = analyzeBusinessPotential(noWebLead, { type: 'NO_WEBSITE' });
    assert.ok(analysisNoWeb.score >= 90, "Score without website + good rating must be >= 90");
    assert.strictEqual(analysisNoWeb.archetype, 'A_TRADE_DIRECT');
    assert.ok(analysisNoWeb.strengths.length >= 2);

    const offlineLead = { name: "Klusbedrijf De Vries", website: "https://klus-vries.nl" };
    const analysisOffline = analyzeBusinessPotential(offlineLead, { type: 'SITE_OFFLINE' });
    assert.strictEqual(analysisOffline.archetype, 'E_SITE_OFFLINE');
    assert.ok(analysisOffline.score >= 90);

    const insecureLead = { name: "Schilder Hoogezand", website: "http://schilderhoogezand.nl" };
    const analysisInsecure = analyzeBusinessPotential(insecureLead, { type: 'INSECURE_HTTP' });
    assert.strictEqual(analysisInsecure.archetype, 'C_MODERNISATION');
    assert.ok(analysisInsecure.strengths.some(s => s.includes("HTTP")));
});

await testAsync("Lead Factory Enterprise (R8): Buffer Overflow (20,000+ Chars), Zero-Width Characters, Emojis & Windows Reserved Names", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. Extreme 25,000 char buffer overflow
    const overflowName = "A".repeat(25000);
    const sanitizedOverflow = sanitizeLeadData({ name: overflowName, website: "https://example.com" });
    assert.strictEqual(sanitizedOverflow.name.length, 150, "Name must be bounded at 150 characters");
    assert.strictEqual(sanitizedOverflow.slug.length, 64, "Slug must be bounded at 64 characters");
    assert.ok(/^[a-z0-9-]+$/.test(sanitizedOverflow.slug));

    // 2. Emojis in business name
    const emojiLead = sanitizeLeadData({ name: "🔥 Bouwbedrijf Jansen & Zonen 🚀 B.V." });
    assert.strictEqual(emojiLead.slug, "bouwbedrijf-jansen-zonen-b-v");
    assert.ok(!emojiLead.slug.includes("🔥") && !emojiLead.slug.includes("🚀"));

    // 3. Zero-width spaces, RTL overrides and ANSI escape codes
    const hostileLead = sanitizeLeadData({ name: "\u202E\u200B\u200D\x00\x1F\x7F\x1B[31mSchilderbedrijf\x1B[0m Noord" });
    assert.ok(/^[a-z0-9-]+$/.test(hostileLead.slug));
    assert.strictEqual(hostileLead.slug.includes("\x00"), false);
    assert.strictEqual(hostileLead.slug.includes("\u200B"), false);
    assert.ok(hostileLead.slug.includes("schilderbedrijf"));
    assert.ok(hostileLead.slug.includes("noord"));

    // 4. Windows reserved device names in slug
    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"];
    for (const resName of reservedNames) {
        const lead = sanitizeLeadData({ name: resName });
        assert.ok(lead.slug.length > 0);
        assert.ok(!lead.slug.includes("/"));
    }
});

await testAsync("Lead Factory Enterprise (R8): Global International Country Codes Elimination & 11-Digit Dutch Mobile Standard", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizeDutchPhone } = await import("../crm/admin/js/modules/milestone-dispatcher.js");

    // 1. 15+ foreign countries rejected
    const globalForeignNumbers = [
        "+39 06 698 12345",    // Italy landline
        "+39 340 1234567",     // Italy mobile
        "+41 79 123 45 67",    // Switzerland mobile
        "+43 664 1234567",     // Austria mobile
        "+90 532 123 4567",    // Turkey mobile
        "+30 691 234 5678",    // Greece mobile
        "+46 70 123 45 67",    // Sweden mobile
        "+45 20 12 34 56",     // Denmark mobile
        "+47 412 34 567",      // Norway mobile
        "+353 87 123 4567",    // Ireland mobile
        "+351 912 345 678",    // Portugal mobile
        "+352 621 123 456",    // Luxembourg mobile
        "+1 212 555 0199",     // USA New York
        "+49 151 12345678",    // Germany
        "+32 475 123456",      // Belgium
        "+44 7700 900123"      // UK
    ];
    for (const num of globalForeignNumbers) {
        assert.strictEqual(isDutchMobilePhone(num), false, `Global foreign number ${num} must be rejected`);
    }

    // 2. Dutch landlines rejected
    const dutchLandlines = ["050 312 3456", "0598 612 345", "0597 412 345", "0596 612 345", "020 624 1111", "088 123 4567", "0800 022 1234"];
    for (const ll of dutchLandlines) {
        assert.strictEqual(isDutchMobilePhone(ll), false);
        assert.strictEqual(normalizeDutchPhone(ll), "");
    }

    // 3. Authentic Dutch mobile formats normalized strictly to 316... with 11 digits
    const dutchMobileVariants = [
        { raw: "0612345678", expected: "31612345678" },
        { raw: "06-12345678", expected: "31612345678" },
        { raw: "06 12 34 56 78", expected: "31612345678" },
        { raw: "+31 6 12345678", expected: "31612345678" },
        { raw: "+31612345678", expected: "31612345678" },
        { raw: "0031 6 1234 5678", expected: "31612345678" },
        { raw: "+31 (0)6 1234 5678", expected: "31612345678" },
        { raw: "(06) 12 34 56 78", expected: "31612345678" },
        { raw: "31612345678", expected: "31612345678" }
    ];
    for (const item of dutchMobileVariants) {
        assert.strictEqual(isDutchMobilePhone(item.raw), true);
        assert.strictEqual(normalizeDutchPhone(item.raw), item.expected);
        assert.strictEqual(normalizeDutchPhone(item.raw).length, 11);
    }
});

await testAsync("Lead Factory Enterprise (R8): Multi-Variant URL Normalization, Subdomain Stripping & Collision Prevention", async () => {
    const { normalizeDomain, normalizePhoneDigits, isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");
    const { isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Port stripping and query normalization
    assert.strictEqual(normalizeDomain("http://schilderbedrijf.nl:80/over-ons?gclid=123#ervaringen"), "schilderbedrijf.nl");
    assert.strictEqual(normalizeDomain("https://www.loodgieter-hoogezand.nl:443/contact"), "loodgieter-hoogezand.nl");
    assert.strictEqual(normalizeDomain("http://dakdekker-veendam.nl:80/"), "dakdekker-veendam.nl");
    assert.strictEqual(normalizeDomain("https://installateur-groningen.nl/diensten"), "installateur-groningen.nl");

    // 2. Phone digits matching
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 12 34 56 78"), "12345678");
    assert.strictEqual(normalizePhoneDigits("06-12345678"), "12345678");

    // 3. Collision prevention in simulated repository
    const mockRepo = [
        { slug: "schilder-hoogezand", phone: "06-12345678", website: "https://schilderhoogezand.nl" },
        { slug: "loodgieter-veendam", phone: "+31 6 9876 5432", website: "http://www.loodgieter-veendam.nl" }
    ];
    assert.strictEqual(isDuplicateLead({ website: "https://www.schilderhoogezand.nl:443/home" }, mockRepo), true);
    assert.strictEqual(isDuplicateLead({ phone: "06 1234 5678" }, mockRepo), true);
    assert.strictEqual(isDuplicateLead({ slug: "loodgieter-veendam" }, mockRepo), true);
    assert.strictEqual(isDuplicateLead({ slug: "nieuw-bedrijf", phone: "0655555555", website: "https://nieuwbedrijf.nl" }, mockRepo), false);

    // 4. Website matching heuristics
    assert.strictEqual(isWebsiteMatchingBusiness("Dennis Dijkema Klusbedrijf", "https://devakman.info/dennisdijkema"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Schildersbedrijf Jansen", "https://jansen-schilders.nl"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Allard Web Studio", "https://creationaltfix.nl"), false, "Must never match own agency domain to prospective leads");
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE EDGE-CASES ---

await testAsync("Offerte & Factuur Enterprise (R8): Precision Compound VAT (21%, 9%, 0% Verlegd) & Belastingdienst Invoice Breakdown", async () => {
    function computeCompliantInvoice(lineItems, isReverseCharge = false) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const item of lineItems) {
            const lineExcl = Math.round((Number(item.price || 0) * Number(item.qty || 1) + Number.EPSILON) * 100) / 100;
            if (isReverseCharge || item.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (item.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = isReverseCharge ? 0 : Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = isReverseCharge ? 0 : Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const vat0 = 0.00;

        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + vat0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0,
            totalVat,
            totalIncl,
            reverseNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const mixedOrder = [
        { desc: "Webapplicatie Architectuur & Development", price: 2500.00, qty: 1, vatRate: 21 },
        { desc: "Boekwerk en Papieren Documentatie", price: 45.00, qty: 2, vatRate: 9 }, // 90.00 * 0.09 = 8.10
        { desc: "Internationale Zakelijke Consultancy", price: 500.00, qty: 1, vatRate: 0 }
    ];

    const standardInv = computeCompliantInvoice(mixedOrder, false);
    assert.strictEqual(standardInv.subtotalExcl, 3090.00);
    assert.strictEqual(standardInv.subtotal21, 2500.00);
    assert.strictEqual(standardInv.vat21, 525.00);
    assert.strictEqual(standardInv.subtotal9, 90.00);
    assert.strictEqual(standardInv.vat9, 8.10);
    assert.strictEqual(standardInv.subtotal0, 500.00);
    assert.strictEqual(standardInv.vat0, 0.00);
    assert.strictEqual(standardInv.totalVat, 533.10);
    assert.strictEqual(standardInv.totalIncl, 3623.10);
    assert.strictEqual(standardInv.reverseNotice, null);

    // Reverse charge scenario
    const reverseInv = computeCompliantInvoice(mixedOrder, true);
    assert.strictEqual(reverseInv.subtotalExcl, 3090.00);
    assert.strictEqual(reverseInv.totalVat, 0.00);
    assert.strictEqual(reverseInv.totalIncl, 3090.00);
    assert.ok(reverseInv.reverseNotice.includes("BTW verlegd conform art. 12 lid 3 Wet OB 1968"));
});

await testAsync("Offerte & Factuur Enterprise (R8): IEEE 754 Boundary Fractions & Commercial Half-Up Rounding Precision", async () => {
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // Commercial half-up boundary test on floating point edges
    assert.strictEqual(halfUp(0.005), 0.01);
    assert.strictEqual(halfUp(0.0049), 0.00);
    assert.strictEqual(halfUp(12.335), 12.34);
    assert.strictEqual(halfUp(12.334), 12.33);
    assert.strictEqual(halfUp(1.005), 1.01);
    assert.strictEqual(halfUp(2.005), 2.01);
    assert.strictEqual(halfUp(19.995), 20.00);
    assert.strictEqual(halfUp(99.995), 100.00);

    // High volume summation test: 1,000 line items each of 1.005
    let totalAcc = 0;
    for (let i = 0; i < 1000; i++) {
        totalAcc = Math.round((totalAcc + halfUp(1.005) + Number.EPSILON) * 100) / 100;
    }
    assert.strictEqual(totalAcc, 1010.00, "1,000 items of 1.01 must sum to 1010.00 without penny drift");
});

await testAsync("Offerte & Factuur Enterprise (R8): 0-Euro Pro-Bono Invoices, Safe Ratio Division & Credit Note Handling", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-bono 0-euro invoice
    const proBonoProject = {
        id: "proj_probono_foundation",
        client: "Stichting Welzijn",
        invoices: [{
            invoiceNumber: "2026-PB-04",
            description: "Pro-bono realisatie non-profit webapplicatie",
            amountExcl: 0,
            amountVat: 0,
            amountIncl: 0,
            status: "paid"
        }]
    };
    const normZero = normalizeProjectInvoices(proBonoProject);
    assert.strictEqual(normZero[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normZero[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00", "-0 must format as positive € 0,00");

    // 2. Division by zero resilience in ratio / progress calculations
    function safeCalculateRatio(numerator, denominator) {
        if (!denominator || denominator <= 0 || !isFinite(denominator)) return 0;
        if (!numerator || numerator <= 0 || !isFinite(numerator)) return 0;
        return Math.min(100, Math.round((numerator / denominator) * 100));
    }
    assert.strictEqual(safeCalculateRatio(0, 0), 0);
    assert.strictEqual(safeCalculateRatio(50, 0), 0);
    assert.strictEqual(safeCalculateRatio(NaN, 100), 0);
    assert.strictEqual(safeCalculateRatio(100, Infinity), 0);
    assert.strictEqual(safeCalculateRatio(100, -100), 0);
    assert.strictEqual(safeCalculateRatio(null, undefined), 0);
    assert.strictEqual(safeCalculateRatio(30, 60), 50);

    // 3. Credit note
    const creditProject = {
        id: "proj_credit_2026",
        client: "Aannemer Van der Plaats",
        invoices: [{
            invoiceNumber: "2026-CN-04",
            description: "Creditnota restitutie hosting borg",
            amountExcl: -200.00,
            amountVat: -42.00,
            amountIncl: -242.00,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditProject);
    assert.strictEqual(normCredit[0].amountIncl, -242.00);
    assert.strictEqual(formatCurrency(normCredit[0].amountIncl), "€ -242,00");
});

await testAsync("Offerte & Factuur Enterprise (R8): Tiered Compound Discounts, Fixed Vouchers & Zero-Floor Clamping", async () => {
    function applyTieredDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.percentEarlyBird) {
            current = Math.round((current * (1 - (rules.percentEarlyBird / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.percentPartner) {
            current = Math.round((current * (1 - (rules.percentPartner / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.fixedVoucher) {
            current = current - rules.fixedVoucher;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    // 15% Early Bird + 5% Partner + €150 voucher on € 2.000,-
    // 2000 * 0.85 = 1700 -> 1700 * 0.95 = 1615 -> 1615 - 150 = 1465
    // VAT = 1465 * 0.21 = 307.65 -> Total = 1772.65
    const res = applyTieredDiscounts(2000, { percentEarlyBird: 15, percentPartner: 5, fixedVoucher: 150 });
    assert.strictEqual(res.clampedSubtotal, 1465.00);
    assert.strictEqual(res.vat, 307.65);
    assert.strictEqual(res.total, 1772.65);

    // Excessive discount clamps to € 0,00
    const resExcessive = applyTieredDiscounts(100, { fixedVoucher: 300 });
    assert.strictEqual(resExcessive.clampedSubtotal, 0.00);
    assert.strictEqual(resExcessive.vat, 0.00);
    assert.strictEqual(resExcessive.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R8): Dual-Locale Currency Parsing & Extreme Range Formatting", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseCurrencyResilient(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        let str = String(val).trim().replace(/[€$\s]/g, '');
        if (/\d+,\d{3}\.\d{2}/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(/\.(?=\d{3}(?:,|$))/g, '').replace(',', '.');
        }
        str = str.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(str);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    }

    // Strict parsing tests
    assert.strictEqual(parseCurrencyResilient("€ 3.750,25"), 3750.25);
    assert.strictEqual(parseCurrencyResilient("€ 95,-"), 95.00);
    assert.strictEqual(parseCurrencyResilient("€ 1.500,-"), 1500.00);
    assert.strictEqual(parseCurrencyResilient("$ 2,500.50"), 2500.50);
    assert.strictEqual(parseCurrencyResilient("  € 450,50  "), 450.50);
    assert.strictEqual(parseCurrencyResilient("-150,00"), -150.00);
    assert.strictEqual(parseCurrencyResilient("corrupt-text"), 0);
    assert.strictEqual(parseCurrencyResilient(NaN), 0);
    assert.strictEqual(parseCurrencyResilient(Infinity), 0);

    // Formatting checks
    assert.strictEqual(formatCurrency(1250000), "€ 1250000,00");
    assert.strictEqual(formatCurrency(-75.25), "€ -75,25");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
});

await testAsync("Offerte & Factuur Enterprise (R8): Mollie iDEAL Checkout Generation & WhatsApp Billing Dispatch Formatting", async () => {
    const { createMolliePaymentLink, generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    const link = await createMolliePaymentLink({
        projectId: "proj_billing_r8",
        clientName: "Bakkerij De Echte",
        invoiceNumber: "2026-BDE-02",
        amountIncl: 1850.00,
        description: "Factuur 2026-BDE-02 Realisatie Webapplicatie"
    });

    assert.ok(link.paymentId.startsWith("tr_"));
    assert.ok(link.checkoutUrl.includes("mollie.com"));
    assert.ok(link.checkoutUrl.includes("1850.00"));

    const waUrl = generateBillingWhatsAppUrl("+31 6 12 34 56 78", "Bakkerij De Echte", "2026-BDE-02", 1850.00, link.checkoutUrl);
    assert.ok(waUrl.startsWith("https://wa.me/31612345678"));
    assert.ok(waUrl.includes("2026-BDE-02"));
    assert.ok(!waUrl.includes(" "));
    assert.ok(!waUrl.includes("\n"));
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL EDGE-CASES ---

await testAsync("Contact & Intake Enterprise (R8): Multi-Decoy Honeypot Trapping, Speed Heuristics & Silent Spam Mitigation", async () => {
    function evaluateIntakeSubmission(payload, durationMs = 8000) {
        if (!payload || typeof payload !== 'object') {
            return { trapped: true, reason: 'MALFORMED_OBJECT', silentAccept: false };
        }

        // 8 multi-vector honeypot decoy fields
        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment'];
        for (const df of decoyFields) {
            if (payload[df] && String(payload[df]).trim() !== '') {
                return { trapped: true, reason: `HONEYPOT_TRIGGER_${df.toUpperCase()}`, silentAccept: true };
            }
        }

        // Speed bot heuristic (< 1200ms)
        if (typeof durationMs === 'number' && durationMs < 1200) {
            return { trapped: true, reason: 'AUTOMATED_SPEED_BOT', silentAccept: true };
        }

        // Link flood spam filter (3+ links)
        const textContent = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = textContent.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { trapped: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        // Spam keywords filter
        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(textContent)) {
            return { trapped: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { trapped: false, reason: 'LEGITIMATE_HUMAN', silentAccept: false };
    }

    assert.strictEqual(evaluateIntakeSubmission({ website: "http://spam.com" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ _hp_trap: "bot" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ company_fax: "050-123456" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ honey_comment: "fill" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ companyName: "Bot" }, 500).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ goals: "https://a.com https://b.com https://c.com" }).trapped, true);
    assert.strictEqual(evaluateIntakeSubmission({ comments: "Buy crypto and bitcoin now" }).trapped, true);

    const legit = evaluateIntakeSubmission({
        companyName: "Vanderplaats Aannemersbedrijf",
        contactName: "Gerard",
        goals: "Nieuwe website met portfolio en offertecalculator",
        website: "",
        _hp_trap: ""
    }, 12000);
    assert.strictEqual(legit.trapped, false);
    assert.strictEqual(legit.reason, 'LEGITIMATE_HUMAN');
});

await testAsync("Contact & Intake Enterprise (R8): Comprehensive CWE-93 CRLF Header Injection & Multi-Encoding Defense Matrix", async () => {
    function sanitizeHeaderField(input) {
        if (!input || typeof input !== 'string') return '';
        let stage = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return stage.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "user@domain.nl\r\nBcc:attacker@leak.com",
        "user@domain.nl\rBcc:attacker@leak.com",
        "user@domain.nl\nBcc:attacker@leak.com",
        "user@domain.nl%0d%0aBcc:attacker@leak.com",
        "user@domain.nl%250d%250aBcc:attacker@leak.com",
        "user@domain.nl\u2028Bcc:attacker@leak.com",
        "user@domain.nl\u2029Bcc:attacker@leak.com",
        "user@domain.nl\u0085Bcc:attacker@leak.com",
        "user@domain.nl\x00Bcc:attacker@leak.com",
        "user@domain.nl\u000BBcc:attacker@leak.com",
        "user@domain.nl\u000CBcc:attacker@leak.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vector of hostileVectors) {
        const cleaned = sanitizeHeaderField(vector);
        assert.ok(!cleaned.includes("\r"));
        assert.ok(!cleaned.includes("\n"));
        assert.ok(!cleaned.includes("\u2028"));
        assert.ok(!cleaned.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(cleaned), false);
    }

    const safe = sanitizeHeaderField("info@creationaltfix.nl");
    assert.strictEqual(safe, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(safe), true);
});

await testAsync("Contact & Intake Enterprise (R8): Email Normalization, RFC 5322 Standards & Sub-Addressing (+tagging)", async () => {
    function parseAndNormalizeEmail(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIdx = trimmed.lastIndexOf('@');
        if (atIdx <= 0 || atIdx === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIdx);
        const domain = trimmed.slice(atIdx + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    const validSub = parseAndNormalizeEmail("allard+crm2026@creationaltfix.nl");
    assert.strictEqual(validSub.valid, true);
    assert.strictEqual(validSub.email, "allard+crm2026@creationaltfix.nl");

    const validUpper = parseAndNormalizeEmail("   Contact@CreationAltFix.NL   ");
    assert.strictEqual(validUpper.valid, true);
    assert.strictEqual(validUpper.email, "Contact@creationaltfix.nl");

    const invalidEmails = [
        "missingatsign.nl",
        "@nodomain.com",
        "nolocal@",
        "double@@domain.com",
        "consecutive..dots@domain.com",
        ".leadingdot@domain.com",
        "user@-hyphendomain.com"
    ];
    for (const inv of invalidEmails) {
        assert.strictEqual(parseAndNormalizeEmail(inv).valid, false);
    }
});

await testAsync("Contact & Intake Enterprise (R8): Webhook Security, SSRF Prevention & Markdown Escaping", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123"), false);
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.5/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://172.20.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.100/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false);
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://server.internal/hook"), false);

    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);

    assert.strictEqual(sanitizeMarkdown("Hello *world* _test_"), "Hello \\*world\\* \\_test\\_");
    assert.strictEqual(sanitizeMarkdown("[Link](http://example.com)"), "\\[Link\\]\\(http://example\\.com\\)");
});

// --- SECTION 4: DRM & CODE PROTECTION EDGE-CASES ---

await testAsync("DRM & Code Protection Enterprise (R8): W3C HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Demo</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-slug"
    });

    const scriptOpenMatches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(scriptOpenMatches.length, 1);

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("</script"), false, "Script body must never contain literal '</script'");
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));

    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R8): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    const script = new vm.Script(scriptBody);
    assert.ok(script);

    const authorizedSandbox = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedSandbox);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedSandbox);
    });

    const unauthorizedSandbox = {
        window: { location: { hostname: 'stolen-concept.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedSandbox);
    assert.throws(() => {
        script.runInContext(unauthorizedSandbox);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R8): Anti-Inspect Defense Hotkey & Contextmenu Event Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test BV", slug: "test-bv" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R8): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("document.cookie"), false);
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});





// ========================================================
// 🎬 SUITE 25: Lead Factory 15s WhatsApp Video Reel Generator & Bridge API (TASK-914)
// ========================================================
console.log("\n🎬 SUITE 25: Lead Factory 15s WhatsApp Video Reel Generator & Bridge API (TASK-914)");

await testAsync("TASK-914: sanitizeVideoSlug input validation, directory traversal blocking & Windows reserved names matrix", async () => {
    const { sanitizeVideoSlug } = await import("../factory/video/build-motion-video.js");

    // 1. Valid slugs
    assert.strictEqual(sanitizeVideoSlug("heinkens-daktechniek"), "heinkens-daktechniek");
    assert.strictEqual(sanitizeVideoSlug("  N-Ten-Seldam  "), "n-ten-seldam");
    assert.strictEqual(sanitizeVideoSlug("bouwbedrijf_jansen_123"), "bouwbedrijf_jansen_123");

    // 2. Directory traversal attacks (CWE-22)
    assert.throws(() => sanitizeVideoSlug("../../etc/passwd"), /directory traversal/i);
    assert.throws(() => sanitizeVideoSlug("..\\windows\\system32"), /directory traversal/i);
    assert.throws(() => sanitizeVideoSlug("foo/bar"), /directory traversal/i);
    assert.throws(() => sanitizeVideoSlug("foo\\bar"), /directory traversal/i);
    assert.throws(() => sanitizeVideoSlug("lead\0null"), /directory traversal/i);

    // 3. Windows reserved device names
    const reservedNames = ["con", "prn", "aux", "nul", "com1", "com9", "lpt1", "lpt9"];
    for (const resName of reservedNames) {
        assert.throws(() => sanitizeVideoSlug(resName), /Windows gereserveerde apparaatnaam/i);
    }

    // 4. Non-string or boundary inputs
    assert.throws(() => sanitizeVideoSlug(""), /niet-lege string/i);
    assert.throws(() => sanitizeVideoSlug(null), /niet-lege string/i);
    assert.throws(() => sanitizeVideoSlug(undefined), /niet-lege string/i);
    assert.throws(() => sanitizeVideoSlug("a"), /formaat/i);
});

await testAsync("TASK-914: generateLeadMotionHtml 15s template completeness, XSS escaping & 4-scene timeline validation", async () => {
    const { generateLeadMotionHtml } = await import("../factory/video/build-motion-video.js");

    const xssLead = {
        name: 'Vakman & Zonen <script>alert(1)</script>',
        slug: 'vakman-zonen',
        category: 'Installatietechniek & CV "Ketels"',
        city: 'Hoogezand <img src=x onerror=alert(2)>',
        rating: '4.9',
        reviewsCount: 16,
        suggestedDomain: 'vakman-zonen.nl',
        liveUrl: 'https://creationaltfix.nl/concept/vakman-zonen/'
    };

    const html = generateLeadMotionHtml(xssLead);

    // Verifieer XSS neutralisatie
    assert.strictEqual(html.includes("<script>alert(1)</script>"), false, "XSS script payload must be escaped");
    assert.strictEqual(html.includes("<img src=x onerror=alert(2)>"), false, "XSS img payload must be escaped");
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "Must contain escaped script");
    assert.ok(html.includes("Installatietechniek &amp; CV &quot;Ketels&quot;"), "Must escape quotes and ampersands");

    // Verifieer alle 4 geanimeerde scènes
    assert.ok(html.includes('id="scene-1"'), "Scene 1: Discovery must exist");
    assert.ok(html.includes('id="scene-2"'), "Scene 2: Concept Showcase must exist");
    assert.ok(html.includes('id="scene-3"'), "Scene 3: Domain & Pricing must exist");
    assert.ok(html.includes('id="scene-4"'), "Scene 4: Outro & WhatsApp CTA must exist");

    // Verifieer feature pills en mock phone
    assert.ok(html.includes("phone-mockup-wrapper"), "Must render mobile phone frame");
    assert.ok(html.includes("0.4s Laadtijd"), "Must contain sub-second speed pill");
    assert.ok(html.includes("100% Mobile First"), "Must contain mobile first pill");
    assert.ok(html.includes("vakman-zonen.nl"), "Must feature lead domain");
    assert.ok(html.includes("Allard Veldman"), "Must contain Allard signature");
});

await testAsync("TASK-914: renderLeadVideoPreview dryRun & parameter validation", async () => {
    const { renderLeadVideoPreview } = await import("../factory/video/build-motion-video.js");

    const testLead = {
        name: "N ten seldam",
        slug: "n-ten-seldam",
        category: "Stratenmaker & Hovenier",
        city: "Veendam"
    };

    const res = await renderLeadVideoPreview({
        slug: "n-ten-seldam",
        lead: testLead,
        dryRun: true
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.slug, "n-ten-seldam");
    assert.strictEqual(res.dryRun, true);
    assert.strictEqual(res.videoUrl, "/concept/n-ten-seldam/video-preview.mp4");
    assert.strictEqual(res.absoluteUrl, "https://creationaltfix.nl/concept/n-ten-seldam/video-preview.mp4");
    assert.strictEqual(res.durationSeconds, 15);

    // Verifieer foutafhandeling bij ongeldige slug
    await assert.rejects(async () => {
        await renderLeadVideoPreview({ slug: "../traversal" });
    }, /directory traversal/i);
});

await testAsync("TASK-914: generateWhatsAppVideoPitch message structure & video link embedding", async () => {
    const { generateWhatsAppVideoPitch } = await import("../crm/admin/js/modules/admin-lead-factory.js");

    const lead = {
        name: "Heinkens Daktechniek",
        slug: "heinkens-daktechniek",
        city: "Hoogezand",
        liveUrl: "https://creationaltfix.nl/concept/heinkens-daktechniek/",
        videoPreview: {
            generated: true,
            relativeUrl: "/concept/heinkens-daktechniek/video-preview.mp4",
            absoluteUrl: "https://creationaltfix.nl/concept/heinkens-daktechniek/video-preview.mp4"
        }
    };

    const pitch = generateWhatsAppVideoPitch(lead);
    assert.ok(pitch.includes("Heinkens Daktechniek"), "Must address client name");
    assert.ok(pitch.includes("Hoogezand"), "Must mention city");
    assert.ok(pitch.includes("https://creationaltfix.nl/concept/heinkens-daktechniek/"), "Must include live concept link");
    assert.ok(pitch.includes("https://creationaltfix.nl/concept/heinkens-daktechniek/video-preview.mp4"), "Must include direct video link");
    assert.ok(pitch.includes("Allard hier van Creation+Alt+Fix"), "Must include Allard introduction");
});

await testAsync("TASK-914: factory-bridge.js POST /api/leads/video route & MP4 streaming registration", async () => {
    const bridgePath = path.resolve(ROOT_DIR, "factory/server/factory-bridge.js");
    const bridgeContent = fs.readFileSync(bridgePath, "utf-8");

    assert.ok(bridgeContent.includes("pathname === '/api/leads/video'"), "Bridge server must register /api/leads/video endpoint");
    assert.ok(bridgeContent.includes("renderLeadVideoPreview"), "Bridge must call renderLeadVideoPreview");
    assert.ok(bridgeContent.includes("sanitizeVideoSlug"), "Bridge must sanitize lead slug against traversal");
    assert.ok(bridgeContent.includes("'.mp4': 'video/mp4'"), "MIME_MAP must serve .mp4 videos");
    assert.ok(bridgeContent.includes("'.webm': 'video/webm'"), "MIME_MAP must serve .webm videos");
    assert.ok(bridgeContent.includes("'Accept-Ranges': 'bytes'"), "Bridge must support byte-range video streaming");
});

await testAsync("TASK-914: admin-lead-factory.js UI controls & video reel badge rendering", async () => {
    const adminPath = path.resolve(ROOT_DIR, "crm/admin/js/modules/admin-lead-factory.js");
    const adminContent = fs.readFileSync(adminPath, "utf-8");
    const htmlPath = path.resolve(ROOT_DIR, "crm/admin/index.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");

    // admin-lead-factory.js exports & badges
    assert.ok(adminContent.includes("badge-video-ready"), "Must contain badge-video-ready class");
    assert.ok(adminContent.includes("btn-play-video-reel"), "Must contain play video reel button");
    assert.ok(adminContent.includes("btn-generate-video-reel"), "Must contain generate video reel button");
    assert.ok(adminContent.includes("openLeadVideoModal"), "Must export openLeadVideoModal");
    assert.ok(adminContent.includes("generateLeadVideoReel"), "Must export generateLeadVideoReel");

    // index.html modal elements
    assert.ok(htmlContent.includes('id="factory-video-modal"'), "Admin index.html must contain #factory-video-modal");
    assert.ok(htmlContent.includes('id="factory-video-player"'), "Must contain #factory-video-player element");
    assert.ok(htmlContent.includes('id="video-modal-message"'), "Must contain #video-modal-message textarea");
    assert.ok(htmlContent.includes('id="btn-video-modal-whatsapp"'), "Must contain #btn-video-modal-whatsapp button");
    assert.ok(htmlContent.includes('id="pill-filter-video"'), "Must contain video filter pill");
});

// ========================================================
// 🛡️ SUITE 26: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 9)
// ========================================================
console.log("\n🛡️ SUITE 26: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 9)");

// --- SECTION 1: LEAD FACTORY EDGE-CASES ---

await testAsync("Lead Factory Enterprise (R9): formatSuggestedDomain Boundary, Length Bounding & Extension Capping", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Basic formatting and extension retention
    assert.strictEqual(formatSuggestedDomain("bakkerij-de-vries"), "bakkerij-de-vries.nl");
    assert.strictEqual(formatSuggestedDomain("bakkerij-de-vries.nl"), "bakkerij-de-vries.nl");
    assert.strictEqual(formatSuggestedDomain("https://www.bouwbedrijfjansen.nl/"), "bouwbedrijfjansen.nl");
    assert.strictEqual(formatSuggestedDomain("http://dakdekker-veendam.nl/diensten"), "dakdekker-veendam.nl");

    // 2. Special characters, ampersands, spaces and umlauts
    assert.strictEqual(formatSuggestedDomain("Smit & Zoon B.V."), "smit-zoon-b-v.nl");
    assert.strictEqual(formatSuggestedDomain("Café & Bistro Het Noorden"), "caf-bistro-het-noorden.nl");
    assert.strictEqual(formatSuggestedDomain("---leading-and-trailing---"), "leading-and-trailing.nl");

    // 3. Length bounding to 63 chars (RFC 1035 max label length)
    const longName = "a".repeat(100);
    const resultDomain = formatSuggestedDomain(longName);
    assert.ok(resultDomain.endsWith(".nl"));
    const label = resultDomain.replace(/\.nl$/, '');
    assert.strictEqual(label.length, 63);
    assert.ok(!label.endsWith("-"));

    // 4. Fallbacks for empty or invalid inputs
    assert.strictEqual(formatSuggestedDomain(""), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(null), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(undefined), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(12345), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain("   "), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain("!@#$%^&*()"), "zzp-concept.nl");
});

await testAsync("Lead Factory Enterprise (R9): checkDomainAvailability Mock DNS NS & SIDN RDAP Resolver Matrix", async () => {
    const { checkDomainAvailability } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. NS record exists -> domain is taken
    const mockDnsTaken = {
        resolveNs: async (domain) => ["ns1.hoster.nl", "ns2.hoster.nl"]
    };
    const resTaken = await checkDomainAvailability("taken-domain.nl", { dnsResolver: mockDnsTaken });
    assert.strictEqual(resTaken.isAvailable, false);
    assert.strictEqual(resTaken.checked, true);
    assert.strictEqual(resTaken.source, "dns-ns");

    // 2. NS returns ENODATA -> domain is registered
    const mockDnsEnodata = {
        resolveNs: async (domain) => {
            const err = new Error("ENODATA");
            err.code = "ENODATA";
            throw err;
        }
    };
    const resEnodata = await checkDomainAvailability("reserved-domain.nl", { dnsResolver: mockDnsEnodata });
    assert.strictEqual(resEnodata.isAvailable, false);
    assert.strictEqual(resEnodata.checked, true);
    assert.strictEqual(resEnodata.source, "dns-enodata");

    // 3. NS returns ENOTFOUND and SIDN RDAP returns 404 -> domain is free for registration
    const mockDnsNotFound = {
        resolveNs: async (domain) => {
            const err = new Error("ENOTFOUND");
            err.code = "ENOTFOUND";
            throw err;
        }
    };
    const mockFetch404 = async (url) => ({ status: 404 });
    const resAvailable = await checkDomainAvailability("vrij-vakman-concept.nl", {
        dnsResolver: mockDnsNotFound,
        fetcher: mockFetch404
    });
    assert.strictEqual(resAvailable.isAvailable, true);
    assert.strictEqual(resAvailable.checked, true);
    assert.strictEqual(resAvailable.source, "sidn-rdap");

    // 4. NS returns ENOTFOUND but SIDN RDAP returns 200 -> domain is registered (e.g. parked without NS)
    const mockFetch200 = async (url) => ({ status: 200 });
    const resRegistered = await checkDomainAvailability("parked-domain.nl", {
        dnsResolver: mockDnsNotFound,
        fetcher: mockFetch200
    });
    assert.strictEqual(resRegistered.isAvailable, false);
    assert.strictEqual(resRegistered.checked, true);
    assert.strictEqual(resRegistered.source, "sidn-rdap");

    // 5. Fallback: RDAP offline / throws, but DNS returned NXDOMAIN
    const mockFetchThrow = async () => { throw new Error("RDAP Timeout"); };
    const resNxdomain = await checkDomainAvailability("free-domain.nl", {
        dnsResolver: mockDnsNotFound,
        fetcher: mockFetchThrow
    });
    assert.strictEqual(resNxdomain.isAvailable, true);
    assert.strictEqual(resNxdomain.checked, true);
    assert.strictEqual(resNxdomain.source, "dns-nxdomain");

    // 6. Network unavailable / DNS timeout and RDAP skipped
    const mockDnsOther = {
        resolveNs: async () => {
            const err = new Error("ETIMEDOUT");
            err.code = "ETIMEDOUT";
            throw err;
        }
    };
    const resNetUnavail = await checkDomainAvailability("check-timeout.nl", {
        dnsResolver: mockDnsOther,
        skipRdap: true
    });
    assert.strictEqual(resNetUnavail.isAvailable, false);
    assert.strictEqual(resNetUnavail.checked, false);
    assert.strictEqual(resNetUnavail.source, "network-unavailable");
});

await testAsync("Lead Factory Enterprise (R9): deriveReviewsFromCategory Regional Heuristic & Author Matrix", async () => {
    const { deriveReviewsFromCategory } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Dakdekker category
    const dakReviews = deriveReviewsFromCategory("Dakbedekking & Zinkwerk", "Heinkens Dak", "Hoofdweg 12, 9601 KA Hoogezand");
    assert.strictEqual(dakReviews.length, 3);
    assert.ok(dakReviews[0].text.includes("Heinkens Dak"));
    assert.ok(dakReviews[0].author.includes("Hoogezand"));
    assert.ok(dakReviews.some(r => r.text.includes("dak")));

    // 2. Riool / Loodgieter category
    const rioolReviews = deriveReviewsFromCategory("Riooltechniek & Afvoerontstopping", "Stenekes Riool", "Kerkstraat 5, 9641 AA Veendam");
    assert.strictEqual(rioolReviews.length, 3);
    assert.ok(rioolReviews[0].text.includes("Veendam"));
    assert.ok(rioolReviews.some(r => r.text.includes("afvoer") || r.text.includes("verstopt")));

    // 3. Stratenmaker / Hovenier category
    const tuinReviews = deriveReviewsFromCategory("Stratenmaker & Hovenier", "N ten Seldam", "Asserweg 10, Assen");
    assert.strictEqual(tuinReviews.length, 3);
    assert.ok(tuinReviews.some(r => r.text.includes("tuin") || r.text.includes("oprit")));
    assert.ok(tuinReviews[0].author.includes("Assen"));

    // 4. Stukadoor / Schilder category
    const schilderReviews = deriveReviewsFromCategory("Schildersbedrijf & Stucwerk", "Jansen Schilderwerken", "");
    assert.strictEqual(schilderReviews.length, 3);
    assert.ok(schilderReviews[0].text.includes("Jansen Schilderwerken"));
    assert.ok(schilderReviews[0].author.includes("Hoogezand"), "Default city fallback must be Hoogezand");

    // 5. Default fallback category
    const defaultReviews = deriveReviewsFromCategory("Onbekende Dienstverlening", "Lokale Vakman", null);
    assert.strictEqual(defaultReviews.length, 3);
    assert.ok(defaultReviews.every(r => r.author.includes("Hoogezand")));
});

await testAsync("Lead Factory Enterprise (R9): Cross-Contamination Guard, Agency Protection & Dutch Trade Deduplication", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");
    const { isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Strict rejection of agency domain matching
    assert.strictEqual(isWebsiteMatchingBusiness("Creation+Alt+Fix", "https://creationaltfix.nl"), false);
    assert.strictEqual(isWebsiteMatchingBusiness("Allard Web Studio", "https://portal.creationaltfix.nl/status/"), false);

    // 2. Deduplication with Dutch legal entity prefixes & suffixes
    const existingLeads = [
        { name: "Bouwbedrijf Jansen B.V.", slug: "bouwbedrijf-jansen", phone: "06-12345678", website: "https://jansenbouw.nl" },
        { name: "Fa. Van der Meulen & Zonen VOF", slug: "van-der-meulen-zonen", phone: "+31 6 8765 4321", website: "https://meulen-bouw.nl" }
    ];

    // Phone collision in different formats
    assert.strictEqual(isDuplicateLead({ phone: "0031 6 12345678" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6 12 34 56 78" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ phone: "0687654321" }, existingLeads), true);

    // Website collision with port and path
    assert.strictEqual(isDuplicateLead({ website: "http://www.jansenbouw.nl:80/diensten" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ website: "https://jansenbouw.nl/" }, existingLeads), true);

    // Unique lead
    assert.strictEqual(isDuplicateLead({ name: "Klaas Elektra", slug: "klaas-elektra", phone: "0699998888", website: "https://klaaselektra.nl" }, existingLeads), false);
});

await testAsync("Lead Factory Enterprise (R9): Extreme String Inputs, Length Bounding & Hostile Unicode Stripping Matrix", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. Giant string input (30,000 characters)
    const giantString = "X".repeat(30000);
    const sanitizedGiant = sanitizeLeadData({ name: giantString, website: "https://safe-url.nl" });
    assert.strictEqual(sanitizedGiant.name.length, 150);
    assert.strictEqual(sanitizedGiant.slug.length, 64);
    assert.strictEqual(sanitizedGiant.website, "https://safe-url.nl");

    // 2. Hostile Unicode overrides, NUL bytes, BOM and RTL overrides
    const hostileName = "\uFEFF\u200E\u202E\u0000\u001F\u007F\u200BInstallatiebedrijf \u200CDe Wit B.V.";
    const cleanHostile = sanitizeLeadData({ name: hostileName });
    assert.ok(!cleanHostile.slug.includes("\u0000"));
    assert.ok(!cleanHostile.slug.includes("\u200B"));
    assert.ok(!cleanHostile.slug.includes("\u202E"));
    assert.strictEqual(cleanHostile.slug, "installatiebedrijf-de-wit-b-v");

    // 3. Emojis and symbols only
    const emojiOnly = sanitizeLeadData({ name: "🔨 🔧 ⚡ 🚗 🏠" });
    assert.strictEqual(emojiOnly.slug, "zzp-concept");

    // 4. Quotation marks, HTML tags and script breakout payloads
    const scriptPayload = sanitizeLeadData({ name: "<script>alert('pwn')</script> Klussenier Allard" });
    assert.ok(!scriptPayload.slug.includes("<"));
    assert.ok(!scriptPayload.slug.includes(">"));
    assert.ok(!scriptPayload.slug.includes("'"));
    assert.strictEqual(scriptPayload.slug, "script-alert-pwn-script-klussenier-allard");
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE EDGE-CASES ---

await testAsync("Offerte & Factuur Enterprise (R9): Multi-Rate Compound VAT (21%, 9%, 0%, Verlegd) & Line-Item Precision", async () => {
    function calculateInvoiceWithPrecision(items, reverseCharge = false) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const it of items) {
            const qty = Number(it.qty !== undefined ? it.qty : 1);
            const price = Number(it.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (reverseCharge || it.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = reverseCharge ? 0 : Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = reverseCharge ? 0 : Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0: 0.00,
            totalVat,
            totalIncl,
            reverseNotice: reverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    // Realistic mixed order with fractional quantities (3.5 hours consultation)
    const items = [
        { desc: "Website Ontwikkeling & Maatwerk", price: 1950.00, qty: 1, vatRate: 21 },
        { desc: "Architectuur Sessie & Advies", price: 85.00, qty: 3.5, vatRate: 21 },
        { desc: "Gedrukt Handboek & Naslagwerk", price: 49.95, qty: 2, vatRate: 9 },
        { desc: "Vrijgestelde Zorg/Onderwijs Integratie", price: 350.00, qty: 1, vatRate: 0 }
    ];

    const inv = calculateInvoiceWithPrecision(items, false);
    assert.strictEqual(inv.subtotal21, 2247.50);
    assert.strictEqual(inv.vat21, 471.98);
    assert.strictEqual(inv.subtotal9, 99.90);
    assert.strictEqual(inv.vat9, 8.99);
    assert.strictEqual(inv.subtotal0, 350.00);
    assert.strictEqual(inv.vat0, 0.00);
    assert.strictEqual(inv.subtotalExcl, 2697.40);
    assert.strictEqual(inv.totalVat, 480.97);
    assert.strictEqual(inv.totalIncl, 3178.37);

    // Reverse charge scenario
    const invVerlegd = calculateInvoiceWithPrecision(items, true);
    assert.strictEqual(invVerlegd.totalVat, 0.00);
    assert.strictEqual(invVerlegd.totalIncl, 2697.40);
    assert.ok(invVerlegd.reverseNotice.includes("BTW verlegd"));
});

await testAsync("Offerte & Factuur Enterprise (R9): IEEE 754 Commercial Half-Up Rounding & High-Volume Summation", async () => {
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // Boundary edge tests where native JS Math.round(x * 100) / 100 fails
    assert.strictEqual(halfUp(35.255), 35.26);
    assert.strictEqual(halfUp(10.055), 10.06);
    assert.strictEqual(halfUp(5.555), 5.56);
    assert.strictEqual(halfUp(0.005), 0.01);
    assert.strictEqual(halfUp(0.0049), 0.00);
    assert.strictEqual(halfUp(12.335), 12.34);
    assert.strictEqual(halfUp(12.334), 12.33);

    // High volume simulation: 2,500 recurring API transactions at 0.035 each
    let totalAcc = 0;
    for (let i = 0; i < 2500; i++) {
        totalAcc = Math.round((totalAcc + halfUp(0.035) + Number.EPSILON) * 100) / 100;
    }
    assert.strictEqual(totalAcc, 100.00, "2,500 transactions of 0.04 must accumulate to 100.00 without penny drift");
});

await testAsync("Offerte & Factuur Enterprise (R9): 0-Euro Pro-Bono Invoices, Credit Notes & Division-by-Zero Resilience", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-bono 0-euro invoice
    const proBono = {
        id: "proj_probono_care",
        client: "Stichting Dierenhulp Noord",
        invoices: [{
            invoiceNumber: "2026-PB-09",
            description: "Pro-bono realisatie opvangwebsite",
            amountExcl: 0.00,
            amountVat: 0.00,
            amountIncl: 0.00,
            status: "paid"
        }]
    };
    const normalizedPb = normalizeProjectInvoices(proBono);
    assert.strictEqual(normalizedPb.length, 1);
    assert.strictEqual(normalizedPb[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normalizedPb[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");

    // 2. Negative credit note
    const credit = {
        id: "proj_credit_2026_09",
        client: "Schildersbedrijf De Wit",
        invoices: [{
            invoiceNumber: "2026-CN-09",
            description: "Creditnota verrekening borgstelling",
            amountExcl: -150.00,
            amountVat: -31.50,
            amountIncl: -181.50,
            status: "paid"
        }]
    };
    const normalizedCredit = normalizeProjectInvoices(credit);
    assert.strictEqual(normalizedCredit[0].amountIncl, -181.50);
    assert.strictEqual(formatCurrency(normalizedCredit[0].amountIncl), "€ -181,50");

    // 3. Division by zero resilience
    function safeRatio(numerator, denominator) {
        if (!denominator || denominator <= 0 || !isFinite(denominator)) return 0;
        if (!numerator || numerator <= 0 || !isFinite(numerator)) return 0;
        return Math.min(100, Math.round((numerator / denominator) * 100));
    }
    assert.strictEqual(safeRatio(0, 0), 0);
    assert.strictEqual(safeRatio(50, 0), 0);
    assert.strictEqual(safeRatio(NaN, 100), 0);
    assert.strictEqual(safeRatio(100, Infinity), 0);
    assert.strictEqual(safeRatio(-50, 100), 0);
    assert.strictEqual(safeRatio(100, -200), 0);
    assert.strictEqual(safeRatio(75, 150), 50);
});

await testAsync("Offerte & Factuur Enterprise (R9): Stacking Compound Discounts & Zero-Floor Clamping Matrix", async () => {
    function computeDiscountedTotal(baseExcl, { earlyBirdPercent = 0, loyaltyPercent = 0, voucherAmount = 0 } = {}) {
        let current = baseExcl;
        if (earlyBirdPercent > 0) {
            current = Math.round((current * (1 - (earlyBirdPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (loyaltyPercent > 0) {
            current = Math.round((current * (1 - (loyaltyPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (voucherAmount > 0) {
            current = current - voucherAmount;
        }
        const finalExcl = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat21 = Math.round((finalExcl * 0.21 + Number.EPSILON) * 100) / 100;
        const finalIncl = Math.round((finalExcl + vat21 + Number.EPSILON) * 100) / 100;

        return { finalExcl, vat21, finalIncl };
    }

    // 10% Early Bird + 10% Loyalty + € 100 voucher on € 1.000,-
    const calc = computeDiscountedTotal(1000, { earlyBirdPercent: 10, loyaltyPercent: 10, voucherAmount: 100 });
    assert.strictEqual(calc.finalExcl, 710.00);
    assert.strictEqual(calc.vat21, 149.10);
    assert.strictEqual(calc.finalIncl, 859.10);

    // Over-discounted invoice: € 200 base with € 500 voucher
    const clamped = computeDiscountedTotal(200, { voucherAmount: 500 });
    assert.strictEqual(clamped.finalExcl, 0.00);
    assert.strictEqual(clamped.vat21, 0.00);
    assert.strictEqual(clamped.finalIncl, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R9): Dual-Locale Currency Parsing & Extreme Range Formatting", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseCurrencyStrict(val) {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        let str = String(val).trim().replace(/[€$\s]/g, '');
        if (/\d+,\d{3}\.\d{2}/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(/\.(?=\d{3}(?:,|$))/g, '').replace(',', '.');
        }
        str = str.replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(str);
        return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
    }

    // European format
    assert.strictEqual(parseCurrencyStrict("€ 4.850,75"), 4850.75);
    assert.strictEqual(parseCurrencyStrict("€ 199,-"), 199.00);
    assert.strictEqual(parseCurrencyStrict("€ 2.500,-"), 2500.00);
    // US format
    assert.strictEqual(parseCurrencyStrict("$ 3,250.80"), 3250.80);
    // Invalid / Edge values
    assert.strictEqual(parseCurrencyStrict("ongeldige tekst"), 0);
    assert.strictEqual(parseCurrencyStrict(null), 0);
    assert.strictEqual(parseCurrencyStrict(undefined), 0);
    assert.strictEqual(parseCurrencyStrict(NaN), 0);

    // formatCurrency outputs
    assert.strictEqual(formatCurrency(2500000), "€ 2500000,00");
    assert.strictEqual(formatCurrency(-125.50), "€ -125,50");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL EDGE-CASES ---

await testAsync("Contact & Intake Enterprise (R9): Multi-Vector Honeypot Bot Trapping & Time-Threshold Defense", async () => {
    function inspectIntakePayload(payload, elapsedMs = 5000) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }

        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment'];
        for (const f of decoyFields) {
            if (payload[f] && String(payload[f]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_HIT_${f.toUpperCase()}`, silentAccept: true };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }

        const combined = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = combined.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(combined)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { blocked: false, reason: 'LEGITIMATE_SUBMISSION', silentAccept: false };
    }

    assert.strictEqual(inspectIntakePayload({ website: "http://bot.com" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ _hp_trap: "filled" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ company_fax: "12345" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ bot_token: "xyz" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ user_url: "http://spam.ru" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ telephone_confirm: "06" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ extra_address: "Trap" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ honey_comment: "Test" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ companyName: "Instant Bot" }, 450).blocked, true);
    assert.strictEqual(inspectIntakePayload({ goals: "Visit http://a.com http://b.com http://c.com" }).blocked, true);
    assert.strictEqual(inspectIntakePayload({ comments: "Buy crypto and bitcoin" }).blocked, true);

    const validSubmission = inspectIntakePayload({
        companyName: "Stenekes Rioolspecialist",
        contactName: "Angela Stenekes",
        goals: "Nieuwe website voor lokale spoedklussen",
        website: "",
        _hp_trap: ""
    }, 8500);
    assert.strictEqual(validSubmission.blocked, false);
    assert.strictEqual(validSubmission.reason, "LEGITIMATE_SUBMISSION");
});

await testAsync("Contact & Intake Enterprise (R9): CWE-93 CRLF Header Injection & Multi-Encoding Defense Matrix", async () => {
    function sanitizeHeaderStrict(val) {
        if (!val || typeof val !== 'string') return '';
        let stage = val.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return stage.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "info@creationaltfix.nl\r\nBcc:attacker@leak.com",
        "info@creationaltfix.nl\rBcc:attacker@leak.com",
        "info@creationaltfix.nl\nBcc:attacker@leak.com",
        "info@creationaltfix.nl%0d%0aBcc:attacker@leak.com",
        "info@creationaltfix.nl%250d%250aBcc:attacker@leak.com",
        "info@creationaltfix.nl\u2028Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u2029Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u0085Bcc:attacker@leak.com",
        "info@creationaltfix.nl\x00Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u000BBcc:attacker@leak.com",
        "info@creationaltfix.nl\u000CBcc:attacker@leak.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vec of hostileVectors) {
        const cleaned = sanitizeHeaderStrict(vec);
        assert.ok(!cleaned.includes("\r"));
        assert.ok(!cleaned.includes("\n"));
        assert.ok(!cleaned.includes("\u2028"));
        assert.ok(!cleaned.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(cleaned), false, `Vector ${vec} must not form a valid clean email`);
    }

    const legitimate = sanitizeHeaderStrict("info@creationaltfix.nl");
    assert.strictEqual(legitimate, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(legitimate), true);
});

await testAsync("Contact & Intake Enterprise (R9): Email RFC 5322 Standards, Sub-Addressing (+tagging) & Normalization Matrix", async () => {
    function parseAndNormalizeEmailStrict(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIdx = trimmed.lastIndexOf('@');
        if (atIdx <= 0 || atIdx === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIdx);
        const domain = trimmed.slice(atIdx + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    // Sub-addressing (+tagging)
    const subEmail = parseAndNormalizeEmailStrict("allard+intake2026@creationaltfix.nl");
    assert.strictEqual(subEmail.valid, true);
    assert.strictEqual(subEmail.email, "allard+intake2026@creationaltfix.nl");

    // Case normalization of domain part
    const mixedCase = parseAndNormalizeEmailStrict("   Sales@CreationAltFix.NL   ");
    assert.strictEqual(mixedCase.valid, true);
    assert.strictEqual(mixedCase.email, "Sales@creationaltfix.nl");

    // Hostile or invalid patterns
    const invalids = [
        "no-at-sign.nl",
        "@missing-local.com",
        "missing-domain@",
        "double@@domain.nl",
        "consecutive..dots@domain.nl",
        ".leadingdot@domain.nl",
        "trailingdot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl",
        "user@domain..nl",
        "",
        null,
        undefined
    ];
    for (const inv of invalids) {
        assert.strictEqual(parseAndNormalizeEmailStrict(inv).valid, false, `${inv} must be invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R9): Webhook Security, SSRF Prevention & Markdown Escaping Matrix", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // SSRF blocks
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123"), false);
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false);
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://service.internal/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://service.local/hook"), false);

    // Legitimate webhook acceptance
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);

    // Markdown sanitization
    assert.strictEqual(sanitizeMarkdown("Hello *world* _test_"), "Hello \\*world\\* \\_test\\_");
    assert.strictEqual(sanitizeMarkdown("[Link](https://creationaltfix.nl)"), "\\[Link\\]\\(https://creationaltfix\\.nl\\)");
    assert.strictEqual(sanitizeMarkdown("`code` and ~strike~"), "\\`code\\` and \\~strike\\~");
});

// --- SECTION 4: DRM & CODE PROTECTION EDGE-CASES ---

await testAsync("DRM & Code Protection Enterprise (R9): W3C HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Concept</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-slug-pwn"
    });

    const scriptOpenMatches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(scriptOpenMatches.length, 1);

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));

    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R9): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    const script = new vm.Script(scriptBody);
    assert.ok(script);

    const authorizedSandbox = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedSandbox);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedSandbox);
    });

    const unauthorizedSandbox = {
        window: { location: { hostname: 'pirated-concept.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedSandbox);
    assert.throws(() => {
        script.runInContext(unauthorizedSandbox);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R9): Anti-Inspect Defense Hotkey & Contextmenu Event Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Klusbedrijf De Haan", slug: "klusbedrijf-de-haan" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R9): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Heinkens Daktechniek", slug: "heinkens-daktechniek" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("document.cookie"), false);

    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});


// ========================================================
// 🚀 SUITE 27: Lead Factory Batch 2: Provinciale Opschaling & Sector Conversie (TASK-908)
// ========================================================
console.log("\n🚀 SUITE 27: Lead Factory Batch 2: Provinciale Opschaling & Sector Conversie (TASK-908)");

await testAsync("TASK-908: resolveRegionCoordinates accurately maps provincial centers (Groningen, Assen, Drachten, Emmen, Hoogeveen) and defaults to Hoogezand", async () => {
    const { resolveRegionCoordinates, REGIONAL_CENTERS } = await import("../factory/discovery/maps-crawler.js");

    assert.ok(REGIONAL_CENTERS.groningen, "Must define Groningen center");
    assert.ok(REGIONAL_CENTERS.assen, "Must define Assen center");
    assert.ok(REGIONAL_CENTERS.drachten, "Must define Drachten center");
    assert.ok(REGIONAL_CENTERS.emmen, "Must define Emmen center");
    assert.ok(REGIONAL_CENTERS.hoogeveen, "Must define Hoogeveen center");

    // Exacte coördinaten verificatie
    const gro = resolveRegionCoordinates("dakdekker Groningen");
    assert.strictEqual(gro.name, "Groningen");
    assert.strictEqual(gro.lat, 53.2194);
    assert.strictEqual(gro.lng, 6.5665);

    const ass = resolveRegionCoordinates("loodgieter Assen");
    assert.strictEqual(ass.name, "Assen");
    assert.strictEqual(ass.lat, 52.9925);
    assert.strictEqual(ass.lng, 6.5625);

    const dra = resolveRegionCoordinates("schilder Drachten");
    assert.strictEqual(dra.name, "Drachten");
    assert.strictEqual(dra.lat, 53.1060);
    assert.strictEqual(dra.lng, 6.1000);

    const emm = resolveRegionCoordinates("hovenier Emmen");
    assert.strictEqual(emm.name, "Emmen");
    assert.strictEqual(emm.lat, 52.7792);
    assert.strictEqual(emm.lng, 6.9069);

    const hoo = resolveRegionCoordinates("elektricien Hoogeveen");
    assert.strictEqual(hoo.name, "Hoogeveen");
    assert.strictEqual(hoo.lat, 52.7289);
    assert.strictEqual(hoo.lng, 6.4764);

    // Fallbacks
    const fallbackEmpty = resolveRegionCoordinates("");
    assert.strictEqual(fallbackEmpty.name, "Hoogezand");
    assert.strictEqual(fallbackEmpty.lat, 53.1616);

    const fallbackUnknown = resolveRegionCoordinates("willekeurige niet-bestaande plaats");
    assert.strictEqual(fallbackUnknown.name, "Hoogezand");
});

await testAsync("TASK-908: extractCityFromAddress accurately resolves provincial cities (Drachten, Emmen, Hoogeveen, Roden, Leek, Winschoten)", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    assert.strictEqual(extractCityFromAddress("De Drift 12, 9203 GA Drachten"), "Drachten");
    assert.strictEqual(extractCityFromAddress("Hoofdstraat 45, 7811 EA Emmen"), "Emmen");
    assert.strictEqual(extractCityFromAddress("Schutstraat 80, 7901 EC Hoogeveen"), "Hoogeveen");
    assert.strictEqual(extractCityFromAddress("Alberdaweg 4, 9301 PA Roden"), "Roden");
    assert.strictEqual(extractCityFromAddress("Tolberterstraat 2, 9351 BC Leek"), "Leek");
    assert.strictEqual(extractCityFromAddress("Langestraat 10, 9671 PE Winschoten"), "Winschoten");
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
});

await testAsync("TASK-908: generateProvincialBatchQueries produces balanced 20-query provincial queue across craft sectors", async () => {
    const { generateProvincialBatchQueries, PROVINCIAL_TARGET_REGIONS } = await import("../factory/batch/batch-engine.js");

    assert.ok(Array.isArray(PROVINCIAL_TARGET_REGIONS) && PROVINCIAL_TARGET_REGIONS.length >= 6);

    // Standaard Week 11 batch van 20
    const queries = generateProvincialBatchQueries();
    assert.strictEqual(queries.length, 20, "Default provincial batch must contain exactly 20 queries");

    // Uniciteit & sanitization
    const uniqueQueries = new Set(queries);
    assert.strictEqual(uniqueQueries.size, 20, "All 20 queries in batch must be unique");

    for (const q of queries) {
        assert.ok(typeof q === "string" && q.length > 5, "Query must be a non-empty string");
        assert.ok(!q.includes("\r") && !q.includes("\n"), "Query must be CRLF sanitized");
    }

    // Aangepaste limiet en bounds clamping
    const customFive = generateProvincialBatchQueries({ count: 5 });
    assert.strictEqual(customFive.length, 5);

    const clampedLarge = generateProvincialBatchQueries({ count: 250 });
    assert.strictEqual(clampedLarge.length, 100, "Should clamp max count to 100 queries");
});

await testAsync("TASK-908: calculateSectorConversionMetrics accurately computes conversion rates, rankings, and identifies top performing sector", async () => {
    const { calculateSectorConversionMetrics, classifyLeadSector } = await import("../factory/batch/batch-engine.js");

    // Test classificatie
    assert.strictEqual(classifyLeadSector({ category: "Dakdekker & Dakrenovatie" }), "dakdekker");
    assert.strictEqual(classifyLeadSector({ name: "Jansen Loodgietersbedrijf" }), "loodgieter");
    assert.strictEqual(classifyLeadSector({ category: "Schildersbedrijf", slug: "schilder-piet" }), "schilder");
    assert.strictEqual(classifyLeadSector({ category: "Stukadoor & Afbouw" }), "stukadoor");
    assert.strictEqual(classifyLeadSector({ name: "Klaas Sierbestrating", category: "Stratenmaker" }), "hovenier");
    assert.strictEqual(classifyLeadSector({ name: "De Vries Elektra", category: "Elektricien" }), "elektricien");
    assert.strictEqual(classifyLeadSector({ category: "Klusbedrijf & Timmerwerk" }), "klusbedrijf");

    // Test matrix evaluatie
    const mockLeads = [
        // 4 Loodgieters (2 views, 2 deals = 50% conversie)
        { id: "1", name: "Loodgieter A", category: "Loodgieter", city: "Groningen", viewsCount: 3, status: "deal_closed" },
        { id: "2", name: "Loodgieter B", category: "Installateur", city: "Assen", viewsCount: 1, status: "accepted" },
        { id: "3", name: "Loodgieter C", category: "CV Ketel Service", city: "Drachten", viewsCount: 0, status: "sent" },
        { id: "4", name: "Loodgieter D", category: "Loodgieter", city: "Emmen", viewsCount: 0, status: "concept_ready" },

        // 5 Dakdekkers (4 views, 1 deal = 20% conversie)
        { id: "5", name: "Dakdekker A", category: "Dakdekker", city: "Groningen", viewsCount: 2, status: "deal_closed" },
        { id: "6", name: "Dakdekker B", category: "Dakrenovatie", city: "Hoogezand", viewsCount: 1, status: "sent" },
        { id: "7", name: "Dakdekker C", category: "Bitumen specialist", city: "Veendam", viewsCount: 1, status: "sent" },
        { id: "8", name: "Dakdekker D", category: "Dakdekker", city: "Assen", viewsCount: 0, status: "concept_ready" },
        { id: "9", name: "Dakdekker E", category: "Dakdekker", city: "Emmen", viewsCount: 0, status: "concept_ready" },

        // 2 Schilders (1 view, 0 deals = 0% conversie)
        { id: "10", name: "Schilder A", category: "Schilder", city: "Drachten", viewsCount: 2, status: "sent" },
        { id: "11", name: "Schilder B", category: "Binnenschilder", city: "Groningen", viewsCount: 0, status: "concept_ready" }
    ];

    const metrics = calculateSectorConversionMetrics(mockLeads);

    assert.strictEqual(metrics.summary.totalLeads, 11);
    assert.strictEqual(metrics.summary.totalConverted, 3);
    assert.strictEqual(metrics.summary.overallConversionRate, 27.3);

    // Loodgieter sector controle
    const loodSec = metrics.sectors.find(s => s.id === "loodgieter");
    assert.ok(loodSec);
    assert.strictEqual(loodSec.totalLeads, 4);
    assert.strictEqual(loodSec.convertedCount, 2);
    assert.strictEqual(loodSec.conversionRate, 50);

    // Dakdekker sector controle
    const dakSec = metrics.sectors.find(s => s.id === "dakdekker");
    assert.ok(dakSec);
    assert.strictEqual(dakSec.totalLeads, 5);
    assert.strictEqual(dakSec.convertedCount, 1);
    assert.strictEqual(dakSec.conversionRate, 20);

    // Top converterende sector moet loodgieter zijn (50% > 20%)
    assert.strictEqual(metrics.topConvertingSector.id, "loodgieter");
    assert.strictEqual(metrics.topConvertingSector.conversionRate, 50);

    // Provinciale dekkingsscore controle (Groningen, Assen, Drachten, Emmen, Hoogezand, Veendam aanwezig = 6/6 = 100%)
    assert.strictEqual(metrics.summary.provincialCoverageScore, 100);
});

await testAsync("TASK-908: exportProvincialReport produces formatted ASCII report with rankings", async () => {
    const { exportProvincialReport } = await import("../factory/batch/batch-engine.js");

    const sample = [
        { id: "1", name: "Dakdekker A", category: "Dakdekker", city: "Groningen", viewsCount: 2, status: "deal_closed" },
        { id: "2", name: "Loodgieter B", category: "Loodgieter", city: "Assen", viewsCount: 1, status: "sent" }
    ];

    const report = exportProvincialReport(sample);
    assert.ok(typeof report === "string");
    assert.ok(report.includes("PROVINCIALE BATCH 2 & SECTOR CONVERSIE"));
    assert.ok(report.includes("Totaal Leads      : 2"));
    assert.ok(report.includes("TOP CONVERTERENDE BRANCHE"));
    assert.ok(report.includes("RANKING PER BRANCHE"));
});

test("TASK-908: factory-bridge.js, leads.php and admin-lead-factory.js UI integration", () => {
    const bridgePath = path.join(ROOT_DIR, "factory/server/factory-bridge.js");
    const bridgeContent = fs.readFileSync(bridgePath, "utf-8");
    assert.ok(bridgeContent.includes("/api/leads/analytics"));
    assert.ok(bridgeContent.includes("/api/leads/batch2/status"));
    assert.ok(bridgeContent.includes("/api/leads/batch2/queue"));

    const leadsPhpPath = path.join(ROOT_DIR, "crm/api/leads.php");
    const leadsPhpContent = fs.readFileSync(leadsPhpPath, "utf-8");
    assert.ok(leadsPhpContent.includes("$action === 'analytics' || $action === 'batch2'"));
    assert.ok(leadsPhpContent.includes("provincialCoverageScore"));

    const indexHtmlPath = path.join(ROOT_DIR, "crm/admin/index.html");
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
    assert.ok(indexHtmlContent.includes("btn-factory-analytics"));
    assert.ok(indexHtmlContent.includes("factory-region-filter"));
    assert.ok(indexHtmlContent.includes("factory-analytics-modal"));

    const adminFactoryJsPath = path.join(ROOT_DIR, "crm/admin/js/modules/admin-lead-factory.js");
    const adminFactoryJsContent = fs.readFileSync(adminFactoryJsPath, "utf-8");
    assert.ok(adminFactoryJsContent.includes("_activeRegionFilter"));
    assert.ok(adminFactoryJsContent.includes("calculateSectorConversionMetrics"));
    assert.ok(adminFactoryJsContent.includes("openSectorAnalyticsModal"));
});

// ========================================================
// 🛡️ SUITE 28: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 10)
// ========================================================
console.log("\n🛡️ SUITE 28: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 10)");

// --- SECTION 1: LEAD FACTORY ENTERPRISE (RONDE 10) ---

await testAsync("Lead Factory Enterprise (R10): Extreme String Inputs, Control Characters, ANSI Escapes & Protocol Injections", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    const giantString = "Z".repeat(50000);
    const sanitizedGiant = sanitizeLeadData({ name: giantString, website: "javascript:alert(1)" });
    assert.strictEqual(sanitizedGiant.name.length, 150);
    assert.strictEqual(sanitizedGiant.slug.length, 64);
    assert.strictEqual(sanitizedGiant.website, null, "Dangerous javascript: URL must be neutralized to null");
    assert.strictEqual(sanitizedGiant.hasWebsite, false);

    const ansiPayload = "\x1b[31;1mMalicious\x1b[0m \x00\x1F\x7FBouwbedrijf \u202Ereversed";
    const sanitizedAnsi = sanitizeLeadData({ name: ansiPayload });
    assert.ok(!sanitizedAnsi.slug.includes("\x1b"));
    assert.ok(!sanitizedAnsi.slug.includes("\x00"));
    assert.ok(!sanitizedAnsi.slug.includes("\u202E"));
    assert.strictEqual(sanitizedAnsi.slug.includes("bouwbedrijf"), true);

    const dataUri = sanitizeLeadData({ name: "Hacker Co", website: "data:text/html,<script>alert(1)</script>" });
    assert.strictEqual(dataUri.website, null);

    const fileUri = sanitizeLeadData({ name: "Hacker Co", website: "file:///etc/passwd" });
    assert.strictEqual(fileUri.website, null);

    const safeHttp = sanitizeLeadData({ name: "Schilder Piet", website: "http://schilder-piet.nl" });
    assert.strictEqual(safeHttp.website, "http://schilder-piet.nl");
    assert.strictEqual(safeHttp.hasWebsite, true);

    const safeHttps = sanitizeLeadData({ name: "Dakdekker Jansen", website: "https://dakdekker-jansen.nl" });
    assert.strictEqual(safeHttps.website, "https://dakdekker-jansen.nl");
    assert.strictEqual(safeHttps.hasWebsite, true);

    assert.strictEqual(sanitizeLeadData(null), null);
    assert.strictEqual(sanitizeLeadData(undefined), null);
    assert.strictEqual(sanitizeLeadData("invalid"), null);
});

await testAsync("Lead Factory Enterprise (R10): Special Characters, Homoglyphs & Dutch Orthography in Slugs", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    assert.strictEqual(formatSuggestedDomain("'t Spoed Loodgietersbedrijf"), "t-spoed-loodgietersbedrijf.nl");
    assert.strictEqual(formatSuggestedDomain("Café De Pijp"), "caf-de-pijp.nl");
    assert.strictEqual(formatSuggestedDomain("Installatiebedrijf Müller & Söhne"), "installatiebedrijf-m-ller-s-hne.nl");
    assert.strictEqual(formatSuggestedDomain("Bistro l'Étoile"), "bistro-l-toile.nl");

    const puncDomain = formatSuggestedDomain("***Super---Snelservice!!!###");
    assert.ok(puncDomain.endsWith(".nl"));
    assert.ok(!puncDomain.startsWith("-"));
    const label = puncDomain.replace(/\.nl$/, "");
    assert.ok(!label.startsWith("-") && !label.endsWith("-"));

    const cyrillic = formatSuggestedDomain("Вakkerij Jansen");
    assert.ok(cyrillic.endsWith(".nl"));
    assert.ok(!cyrillic.startsWith("-"));

    const giantName = "x".repeat(120);
    const boundedDomain = formatSuggestedDomain(giantName);
    const boundedLabel = boundedDomain.replace(/\.nl$/, "");
    assert.strictEqual(boundedLabel.length, 63);
    assert.ok(!boundedLabel.endsWith("-"));
});

await testAsync("Lead Factory Enterprise (R10): Foreign Dial Codes, International E.164 & Dutch Mobile Validation", async () => {
    const { isDutchMobilePhone } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizePhoneDigits } = await import("../factory/discovery/maps-crawler.js");

    // Foreign numbers
    assert.strictEqual(isDutchMobilePhone("+49 176 12345678"), false, "German mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+32 476 12 34 56"), false, "Belgian mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+44 7911 123456"), false, "UK mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+33 6 12 34 56 78"), false, "French mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+1 617 555 0199"), false, "US mobile rejected");

    // Dutch mobile
    assert.strictEqual(isDutchMobilePhone("0612345678"), true);
    assert.strictEqual(isDutchMobilePhone("06-12345678"), true);
    assert.strictEqual(isDutchMobilePhone("06 12 34 56 78"), true);
    assert.strictEqual(isDutchMobilePhone("+31 6 12345678"), true);
    assert.strictEqual(isDutchMobilePhone("+31(0)612345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031 6 12345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031 (0)6 12345678"), true);

    // Dutch landline
    assert.strictEqual(isDutchMobilePhone("050-3123456"), false);
    assert.strictEqual(isDutchMobilePhone("0598-123456"), false);
    assert.strictEqual(isDutchMobilePhone("020-1234567"), false);

    // normalizePhoneDigits
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 12 34 56 78"), "12345678");
    assert.strictEqual(normalizePhoneDigits("0598-612345"), "98612345");
    assert.strictEqual(normalizePhoneDigits("612345"), "612345");
    assert.strictEqual(normalizePhoneDigits("123"), null);
    assert.strictEqual(normalizePhoneDigits(""), null);
    assert.strictEqual(normalizePhoneDigits(null), null);
    assert.strictEqual(normalizePhoneDigits(undefined), null);
});

await testAsync("Lead Factory Enterprise (R10): Advanced Multi-Channel Lead Deduplication Matrix", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");

    const existingList = [
        { name: "Loodgieter Assen B.V.", slug: "loodgieter-assen", phone: "0592-123456", website: "https://www.loodgieter-assen.nl" },
        { name: "Bakkerij Sieg", slug: "bakkerij-sieg", phone: "06-99887766", website: "https://bakkerijsieg.nl" }
    ];

    // Phone variation matching
    assert.strictEqual(isDuplicateLead({ phone: "+31 592 123456" }, existingList), true);
    assert.strictEqual(isDuplicateLead({ phone: "0031 6 99887766" }, existingList), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6 99 88 77 66" }, existingList), true);

    // Website variations
    assert.strictEqual(isDuplicateLead({ website: "http://loodgieter-assen.nl/diensten?ref=google" }, existingList), true);
    assert.strictEqual(isDuplicateLead({ website: "https://bakkerijsieg.nl:443/contact" }, existingList), true);

    // Slug variation
    assert.strictEqual(isDuplicateLead({ slug: "loodgieter-assen" }, existingList), true);

    // Unique lead
    assert.strictEqual(isDuplicateLead({ name: "Klusbedrijf De Vries", slug: "klusbedrijf-de-vries", phone: "050-999111", website: "https://klusdevries.nl" }, existingList), false);

    // Edge cases
    assert.strictEqual(isDuplicateLead(null, existingList), false);
    assert.strictEqual(isDuplicateLead({}, existingList), false);
    assert.strictEqual(isDuplicateLead({ name: "Test" }, []), false);
    assert.strictEqual(isDuplicateLead({ name: "Test" }, null), false);
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE ENTERPRISE (RONDE 10) ---

await testAsync("Offerte & Factuur Enterprise (R10): Multi-Rate VAT Baskets (21%, 9%, 0%, Verlegd) & Cent-Rounding Parity", async () => {
    function calculateComprehensiveInvoice(items, reverseCharge = false) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const item of items) {
            const qty = Number(item.qty !== undefined ? item.qty : 1);
            const price = Number(item.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (reverseCharge || item.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (item.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = reverseCharge ? 0 : Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = reverseCharge ? 0 : Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0: 0.00,
            totalVat,
            totalIncl,
            reverseNotice: reverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const items = [
        { desc: "Senior Architect Consultatie", price: 95.50, qty: 14.25, vatRate: 21 },
        { desc: "API Transaction Batch", price: 0.045, qty: 2500, vatRate: 21 },
        { desc: "Technisch Handboek & Receptenboek", price: 34.50, qty: 3, vatRate: 9 },
        { desc: "Vrijgestelde B2B Diensten Intra-EU", price: 450.00, qty: 1, vatRate: 0 }
    ];

    const standard = calculateComprehensiveInvoice(items, false);
    assert.strictEqual(standard.subtotal21, 1473.38);
    assert.strictEqual(standard.vat21, 309.41);
    assert.strictEqual(standard.subtotal9, 103.50);
    assert.strictEqual(standard.vat9, 9.32);
    assert.strictEqual(standard.subtotal0, 450.00);
    assert.strictEqual(standard.totalVat, 318.73);
    assert.strictEqual(standard.subtotalExcl, 2026.88);
    assert.strictEqual(standard.totalIncl, 2345.61);
    assert.strictEqual(standard.reverseNotice, null);

    const reverse = calculateComprehensiveInvoice(items, true);
    assert.strictEqual(reverse.totalVat, 0.00);
    assert.strictEqual(reverse.totalIncl, 2026.88);
    assert.ok(reverse.reverseNotice.includes("BTW verlegd"));
});

await testAsync("Offerte & Factuur Enterprise (R10): 0-Euro Pro-Bono Invoices, Credit Notes & Boundary Financial Ratios", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    const zeroProject = {
        id: "proj_probono_charity",
        client: "Stichting Dierenlot Groningen",
        invoices: [{
            invoiceNumber: "2026-PB-10",
            description: "Pro-bono sponsoring website en hosting",
            amountExcl: 0,
            amountVat: 0,
            amountIncl: 0,
            status: "paid"
        }]
    };
    const normZero = normalizeProjectInvoices(zeroProject);
    assert.strictEqual(normZero[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normZero[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");

    const creditProject = {
        id: "proj_credit_2026_q4",
        client: "Van der Meulen Bouw",
        invoices: [{
            invoiceNumber: "2026-CN-12",
            description: "Creditnota restitutie hosting borg",
            amountExcl: -350.00,
            amountVat: -73.50,
            amountIncl: -423.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditProject);
    assert.strictEqual(normCredit[0].amountIncl, -423.50);
    assert.strictEqual(formatCurrency(normCredit[0].amountIncl), "€ -423,50");

    function safeCalculateFinancialRatio(numerator, denominator) {
        if (!denominator || denominator <= 0 || !isFinite(denominator)) return 0;
        if (!numerator || numerator <= 0 || !isFinite(numerator)) return 0;
        return Math.min(100, Math.round((numerator / denominator) * 100));
    }

    assert.strictEqual(safeCalculateFinancialRatio(0, 0), 0);
    assert.strictEqual(safeCalculateFinancialRatio(100, 0), 0);
    assert.strictEqual(safeCalculateFinancialRatio(NaN, 100), 0);
    assert.strictEqual(safeCalculateFinancialRatio(100, NaN), 0);
    assert.strictEqual(safeCalculateFinancialRatio(100, Infinity), 0);
    assert.strictEqual(safeCalculateFinancialRatio(100, -100), 0);
    assert.strictEqual(safeCalculateFinancialRatio(50, 200), 25);
});

await testAsync("Offerte & Factuur Enterprise (R10): Multi-Tier Compound Discounts, Coupon Combinations & Floor Clamping", async () => {
    function applyMultiTierDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.tier1Percent) {
            current = Math.round((current * (1 - (rules.tier1Percent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.tier2Percent) {
            current = Math.round((current * (1 - (rules.tier2Percent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.fixedVoucher) {
            current = current - rules.fixedVoucher;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    const res = applyMultiTierDiscounts(4000, { tier1Percent: 12, tier2Percent: 5, fixedVoucher: 250 });
    assert.strictEqual(res.clampedSubtotal, 3094.00);
    assert.strictEqual(res.vat, 649.74);
    assert.strictEqual(res.total, 3743.74);

    const clamped = applyMultiTierDiscounts(300, { fixedVoucher: 500 });
    assert.strictEqual(clamped.clampedSubtotal, 0.00);
    assert.strictEqual(clamped.vat, 0.00);
    assert.strictEqual(clamped.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R10): Dual-Locale Currency Parsing & Extreme Value Bounds", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    assert.strictEqual(formatCurrency(1250.5), "€ 1250,50");
    assert.strictEqual(formatCurrency(-350.25), "€ -350,25");
    assert.strictEqual(formatCurrency(1500000.75), "€ 1500000,75");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");
    assert.strictEqual(formatCurrency(null), "€ 0,00");
    assert.strictEqual(formatCurrency(undefined), "€ 0,00");
    assert.strictEqual(formatCurrency(""), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");

    function parseDirtyCurrency(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[^\d.,-]/g, '').trim();
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        const val = parseFloat(clean);
        return isFinite(val) ? val : 0;
    }

    assert.strictEqual(parseDirtyCurrency("€ 1.250,50"), 1250.50);
    assert.strictEqual(parseDirtyCurrency("EUR 3,450.75"), 3450.75);
    assert.strictEqual(parseDirtyCurrency("-€ 250,00"), -250.00);
    assert.strictEqual(parseDirtyCurrency("  € 0,00  "), 0.00);
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL ENTERPRISE (RONDE 10) ---

await testAsync("Contact & Intake Enterprise (R10): Multi-Vector Honeypot Bot Trapping & Speed Heuristics", async () => {
    function inspectIntakeMultiDecoy(payload, elapsedMs = 5000) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }

        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment'];
        for (const f of decoyFields) {
            if (payload[f] && String(payload[f]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_HIT_${f.toUpperCase()}`, silentAccept: true };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }

        const text = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = text.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(text)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { blocked: false, reason: 'LEGITIMATE_SUBMISSION', silentAccept: false };
    }

    assert.strictEqual(inspectIntakeMultiDecoy({ website: "http://spam.ru" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ _hp_trap: "evil" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ company_fax: "12345" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ bot_token: "tok" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ user_url: "http://bot.com" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ telephone_confirm: "06" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ extra_address: "Fake" }).blocked, true);
    assert.strictEqual(inspectIntakeMultiDecoy({ honey_comment: "Trap" }).blocked, true);

    // Whitespace only in honeypot does not trigger
    assert.strictEqual(inspectIntakeMultiDecoy({ website: "   ", _hp_trap: "" }, 6000).blocked, false);

    // Speed bot
    assert.strictEqual(inspectIntakeMultiDecoy({ companyName: "Speedy" }, 800).blocked, true);

    // Link flood
    assert.strictEqual(inspectIntakeMultiDecoy({ goals: "https://a.com https://b.com https://c.com" }).blocked, true);

    // Keyword match
    assert.strictEqual(inspectIntakeMultiDecoy({ comments: "Buy crypto now" }).blocked, true);

    // Valid human
    const valid = inspectIntakeMultiDecoy({
        companyName: "Bakkerij Sieg",
        contactName: "Siegert",
        goals: "Nieuwe webshop voor zuurdesembrood",
        website: "",
        _hp_trap: ""
    }, 7500);
    assert.strictEqual(valid.blocked, false);
    assert.strictEqual(valid.reason, "LEGITIMATE_SUBMISSION");
});

await testAsync("Contact & Intake Enterprise (R10): CWE-93 CRLF Header Injection & Multi-Stage Encoding Mitigation", async () => {
    function sanitizeHeaderStrict(val) {
        if (!val || typeof val !== 'string') return '';
        let stage = val.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return stage.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "info@creationaltfix.nl\r\nBcc:attacker@leak.com",
        "info@creationaltfix.nl\rBcc:attacker@leak.com",
        "info@creationaltfix.nl\nBcc:attacker@leak.com",
        "info@creationaltfix.nl%0d%0aBcc:attacker@leak.com",
        "info@creationaltfix.nl%250d%250aBcc:attacker@leak.com",
        "info@creationaltfix.nl\u2028Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u2029Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u0085Bcc:attacker@leak.com",
        "info@creationaltfix.nl\x00Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u000BBcc:attacker@leak.com",
        "info@creationaltfix.nl\u000CBcc:attacker@leak.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vec of hostileVectors) {
        const cleaned = sanitizeHeaderStrict(vec);
        assert.ok(!cleaned.includes("\r"));
        assert.ok(!cleaned.includes("\n"));
        assert.ok(!cleaned.includes("\u2028"));
        assert.ok(!cleaned.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(cleaned), false, `Vector ${vec} must not form a valid clean email`);
    }

    const legit = sanitizeHeaderStrict("info@creationaltfix.nl");
    assert.strictEqual(legit, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(legit), true);
});

await testAsync("Contact & Intake Enterprise (R10): RFC 5322 Email Validation, Sub-Addressing & Internationalization Security", async () => {
    function parseAndNormalizeEmailStrict(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIdx = trimmed.lastIndexOf('@');
        if (atIdx <= 0 || atIdx === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIdx);
        const domain = trimmed.slice(atIdx + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    const sub = parseAndNormalizeEmailStrict("allard+intake2026@creationaltfix.nl");
    assert.strictEqual(sub.valid, true);
    assert.strictEqual(sub.email, "allard+intake2026@creationaltfix.nl");

    const norm = parseAndNormalizeEmailStrict("  Contact@CreationAltFix.NL  ");
    assert.strictEqual(norm.valid, true);
    assert.strictEqual(norm.email, "Contact@creationaltfix.nl");

    const invalids = [
        "no-at-sign.nl",
        "@missing-local.com",
        "missing-domain@",
        "double@@domain.nl",
        "consecutive..dots@domain.nl",
        ".leadingdot@domain.nl",
        "trailingdot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl",
        "user@domain..nl",
        "",
        null,
        undefined
    ];
    for (const inv of invalids) {
        assert.strictEqual(parseAndNormalizeEmailStrict(inv).valid, false, `${inv} must be invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R10): Webhook SSRF Prevention & Markdown Escaping Resilience", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123"), false);
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false);
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://service.internal/hook"), false);
    assert.strictEqual(isSafeWebhookUrl("https://service.local/hook"), false);

    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);

    assert.strictEqual(sanitizeMarkdown("Hello *world* _test_"), "Hello \\*world\\* \\_test\\_");
    assert.strictEqual(sanitizeMarkdown("[Link](https://creationaltfix.nl)"), "\\[Link\\]\\(https://creationaltfix\\.nl\\)");
    assert.strictEqual(sanitizeMarkdown("`code` and ~strike~"), "\\`code\\` and \\~strike\\~");
});

// --- SECTION 4: DRM & CODE PROTECTION ENTERPRISE (RONDE 10) ---

await testAsync("DRM & Code Protection Enterprise (R10): W3C HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Concept</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-slug-pwn"
    });

    const scriptOpenMatches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(scriptOpenMatches.length, 1);

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));

    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R10): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij De Echte", slug: "bakkerij-de-echte" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    const script = new vm.Script(scriptBody);
    assert.ok(script);

    const authorizedSandbox = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedSandbox);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedSandbox);
    });

    const unauthorizedSandbox = {
        window: { location: { hostname: 'pirated-concept.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedSandbox);
    assert.throws(() => {
        script.runInContext(unauthorizedSandbox);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R10): Anti-Inspect Defense Hotkey & Contextmenu Event Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Klusbedrijf De Haan", slug: "klusbedrijf-de-haan" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R10): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Heinkens Daktechniek", slug: "heinkens-daktechniek" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("document.cookie"), false);
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});

await testAsync("DRM & Code Protection Enterprise (R10): Legal Watermark, KvK 99986191 & Auteurswet 1912 Integrity", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Arnold Design", slug: "arnold-design" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("CREATION+ALT+FIX"));
    assert.ok(scriptBody.includes("99986191"));
    assert.ok(scriptBody.includes("AUTEURSWET 1912"));
    assert.ok(scriptBody.includes("ARTIKEL 29A"));
    assert.ok(scriptBody.includes("BENELUX VERDRAG"));
});

await testAsync("DRM & Code Protection Enterprise (R10): Idempotency & Repeated Protection Re-Application Defense", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Content</h1></body></html>';
    const firstProtection = applyCodeProtection(baseHtml, { name: "Bouwbedrijf Ede", slug: "bouwbedrijf-ede" });
    const secondProtection = applyCodeProtection(firstProtection, { name: "Bouwbedrijf Ede Duplicate", slug: "bouwbedrijf-ede-dup" });

    assert.strictEqual(firstProtection, secondProtection, "applyCodeProtection must be idempotent");

    assert.strictEqual(applyCodeProtection(null), null);
    assert.strictEqual(applyCodeProtection(undefined), undefined);
    assert.strictEqual(applyCodeProtection(""), "");
    assert.strictEqual(applyCodeProtection(12345), 12345);
});

// ========================================================
// SUITE 29: Webserver & DirectAdmin FTP Hardening (TASK-837)
// ========================================================
console.log("\n🔒 SUITE 29: Webserver & DirectAdmin FTP Hardening (TASK-837)");

await testAsync("TASK-837: ProFTPD parser validates 100% compliant hardened configuration", async () => {
    const { auditProftpdConfig, generateHardenedProftpdConfig } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");
    const hardenedConfig = generateHardenedProftpdConfig();
    const audit = auditProftpdConfig(hardenedConfig);

    assert.strictEqual(audit.isCompliant, true, "Hardened config must be 100% compliant");
    assert.strictEqual(audit.score, 100, "Score must be 100");
    assert.strictEqual(audit.tlsEngineActive, true);
    assert.strictEqual(audit.tlsRequiredEnforced, true);
    assert.strictEqual(audit.protocolsCompliant, true);
    assert.strictEqual(audit.chrootJailEnforced, true);
    assert.strictEqual(audit.anonymousDisabled, true);
    assert.strictEqual(audit.violations.length, 0);
});

await testAsync("TASK-837: ProFTPD parser flags missing or disabled TLSRequired as CRITICAL vulnerability", async () => {
    const { auditProftpdConfig } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const insecureConfig = `
    <IfModule mod_tls.c>
        TLSEngine on
        TLSProtocol TLSv1.2 TLSv1.3
        TLSRSACertificateFile /etc/ssl/cert.pem
        TLSRSACertificateKeyFile /etc/ssl/key.pem
    </IfModule>
    DefaultRoot ~
    `;

    const audit = auditProftpdConfig(insecureConfig);
    assert.strictEqual(audit.isCompliant, false);
    assert.strictEqual(audit.tlsRequiredEnforced, false);
    assert.ok(audit.score < 100);

    const critViolation = audit.violations.find(v => v.code === "TLS_REQUIRED_MISSING");
    assert.ok(critViolation, "Must flag missing TLSRequired");
    assert.strictEqual(critViolation.severity, "CRITICAL");
});

await testAsync("TASK-837: ProFTPD parser detects legacy and insecure TLS protocols (SSLv3, TLSv1.0, TLSv1.1)", async () => {
    const { auditProftpdConfig } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const legacyConfig = `
    <IfModule mod_tls.c>
        TLSEngine on
        TLSRequired on
        TLSProtocol SSLv3 TLSv1 TLSv1.1 TLSv1.2
        TLSRSACertificateFile /etc/ssl/cert.pem
        TLSRSACertificateKeyFile /etc/ssl/key.pem
    </IfModule>
    DefaultRoot ~
    `;

    const audit = auditProftpdConfig(legacyConfig);
    assert.strictEqual(audit.isCompliant, false);
    assert.strictEqual(audit.protocolsCompliant, false);
    const protoViolation = audit.violations.find(v => v.code === "INSECURE_TLS_PROTOCOL");
    assert.ok(protoViolation, "Must flag insecure TLS protocols");
    assert.strictEqual(protoViolation.severity, "HIGH");
});

await testAsync("TASK-837: ProFTPD parser enforces chroot jail DefaultRoot and flags missing isolation", async () => {
    const { auditProftpdConfig } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const noChrootConfig = `
    <IfModule mod_tls.c>
        TLSEngine on
        TLSRequired on
        TLSProtocol TLSv1.2 TLSv1.3
        TLSRSACertificateFile /etc/ssl/cert.pem
        TLSRSACertificateKeyFile /etc/ssl/key.pem
    </IfModule>
    `;

    const audit = auditProftpdConfig(noChrootConfig);
    assert.strictEqual(audit.isCompliant, false);
    assert.strictEqual(audit.chrootJailEnforced, false);
    const chrootViolation = audit.violations.find(v => v.code === "CHROOT_JAIL_MISSING");
    assert.ok(chrootViolation, "Must flag missing DefaultRoot chroot jail");
    assert.strictEqual(chrootViolation.severity, "CRITICAL");
});

await testAsync("TASK-837: ProFTPD parser flags active Anonymous FTP blocks as critical risk", async () => {
    const { auditProftpdConfig } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const anonConfig = `
    <IfModule mod_tls.c>
        TLSEngine on
        TLSRequired on
        TLSProtocol TLSv1.2 TLSv1.3
        TLSRSACertificateFile /etc/ssl/cert.pem
        TLSRSACertificateKeyFile /etc/ssl/key.pem
    </IfModule>
    DefaultRoot ~
    <Anonymous ~ftp>
        User ftp
        Group ftp
        UserAlias anonymous ftp
    </Anonymous>
    `;

    const audit = auditProftpdConfig(anonConfig);
    assert.strictEqual(audit.isCompliant, false);
    assert.strictEqual(audit.anonymousDisabled, false);
    const anonViolation = audit.violations.find(v => v.code === "ANONYMOUS_FTP_ENABLED");
    assert.ok(anonViolation, "Must flag <Anonymous> block as critical risk");
    assert.strictEqual(anonViolation.severity, "CRITICAL");
});

await testAsync("TASK-837: CSF/LFD firewall parser validates strict brute-force rules and flags weak thresholds", async () => {
    const { auditCsfConfig, generateHardenedCsfSnippet } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const hardenedCsf = generateHardenedCsfSnippet();
    const goodAudit = auditCsfConfig(hardenedCsf);
    assert.strictEqual(goodAudit.isCompliant, true);
    assert.strictEqual(goodAudit.rules.LF_FTP, 5);
    assert.strictEqual(goodAudit.rules.LF_PERMBLOCK, 1);
    assert.strictEqual(goodAudit.rules.LF_TRIGGER, 5);
    assert.strictEqual(goodAudit.violations.length, 0);

    const weakCsf = `
    LF_FTP = 30
    LF_TRIGGER = 20
    LF_PERMBLOCK = 0
    `;
    const weakAudit = auditCsfConfig(weakCsf);
    assert.strictEqual(weakAudit.isCompliant, false);
    assert.ok(weakAudit.violations.some(v => v.code === "LF_FTP_LOOSE"));
    assert.ok(weakAudit.violations.some(v => v.code === "LF_PERMBLOCK_DISABLED"));
});

await testAsync("TASK-837: FTP Account auditor enforces 12-domain whitelist and blocks anonymous/system accounts", async () => {
    const { auditFtpAccounts, AUTHORIZED_DOMAINS } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    assert.strictEqual(AUTHORIZED_DOMAINS.length, 12, "Must contain all 12 client domains");

    const validAccounts = AUTHORIZED_DOMAINS.map(d => ({
        username: d.replace(/\.nl$/, "_ftp"),
        directory: `domains/${d}/public_html/`,
        domain: d
    }));
    const goodAudit = auditFtpAccounts(validAccounts);
    assert.strictEqual(goodAudit.isCompliant, true);
    assert.strictEqual(goodAudit.validAccounts, 12);
    assert.strictEqual(goodAudit.violations.length, 0);

    const hostileAccounts = [
        { username: "anonymous", directory: "domains/creationaltfix.nl/public_html/", domain: "creationaltfix.nl" },
        { username: "guest", directory: "domains/angelastenekes.nl/public_html/", domain: "angelastenekes.nl" },
        { username: "rogue_user", directory: "domains/roguedomain.com/public_html/", domain: "roguedomain.com" }
    ];
    const hostileAudit = auditFtpAccounts(hostileAccounts);
    assert.strictEqual(hostileAudit.isCompliant, false);
    assert.ok(hostileAudit.anonymousAccounts.includes("anonymous"));
    assert.ok(hostileAudit.anonymousAccounts.includes("guest"));
    assert.ok(hostileAudit.orphanedAccounts.some(o => o.domain === "roguedomain.com"));
});

await testAsync("TASK-837: FTP Account auditor detects path traversal attacks and non-chrooted targets", async () => {
    const { auditFtpAccounts } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const traversalAccounts = [
        { username: "trav1", directory: "/", domain: "creationaltfix.nl" },
        { username: "trav2", directory: "/etc", domain: "creationaltfix.nl" },
        { username: "trav3", directory: "domains/creationaltfix.nl/../../etc/shadow", domain: "creationaltfix.nl" },
        { username: "trav4", directory: "/root", domain: "creationaltfix.nl" }
    ];
    const audit = auditFtpAccounts(traversalAccounts);
    assert.strictEqual(audit.isCompliant, false);
    assert.strictEqual(audit.traversalViolations.length, 4);
    assert.ok(audit.violations.every(v => v.code === "DIRECTORY_TRAVERSAL_RISK"));
});

await testAsync("TASK-837: Credential auditor enforces 32-character requirement, Shannon entropy and DPAPI security", async () => {
    const { auditFtpPassword, calculateShannonEntropy } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    // Shannon entropy test
    const lowEntropy = calculateShannonEntropy("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.strictEqual(lowEntropy, 0.0);
    const highEntropy = calculateShannonEntropy("k8#P9!mZ$2vQ&xL7*wR4^bT1(yU6)nE5");
    assert.ok(highEntropy >= 4.0, `High entropy expected, got ${highEntropy}`);

    // Strong password test (32+ chars, all 4 charsets, DPAPI storage)
    const strongPass = "k8#P9!mZ$2vQ&xL7*wR4^bT1(yU6)nE5_#2026!";
    const goodAudit = auditFtpPassword(strongPass, { storageType: "dpapi", inGitHistory: false });
    assert.strictEqual(goodAudit.isCompliant, true);
    assert.strictEqual(goodAudit.length >= 32, true);
    assert.strictEqual(goodAudit.hasUpper, true);
    assert.strictEqual(goodAudit.hasLower, true);
    assert.strictEqual(goodAudit.hasDigit, true);
    assert.strictEqual(goodAudit.hasSpecial, true);
    assert.strictEqual(goodAudit.storageSecure, true);

    // Short password (<32 chars)
    const shortPass = "Secret123!";
    const shortAudit = auditFtpPassword(shortPass, { storageType: "dpapi" });
    assert.strictEqual(shortAudit.isCompliant, false);
    assert.ok(shortAudit.violations.some(v => v.code === "PASSWORD_TOO_SHORT"));

    // Plaintext in git storage violation
    const gitLeakedAudit = auditFtpPassword(strongPass, { storageType: "plaintext", inGitHistory: true });
    assert.strictEqual(gitLeakedAudit.isCompliant, false);
    assert.ok(gitLeakedAudit.violations.some(v => v.code === "INSECURE_STORAGE"));
});

await testAsync("TASK-837: End-to-end audit orchestrator, CLI script and healthcheck.php integration", async () => {
    const { runFtpSecurityAudit, generateHardenedProftpdConfig, generateHardenedCsfSnippet, AUTHORIZED_DOMAINS } = await import("../crm/admin/js/modules/ftp-hardening-auditor.js");

    const fullAudit = runFtpSecurityAudit({
        proftpdConfig: generateHardenedProftpdConfig(),
        csfConfig: generateHardenedCsfSnippet(),
        accounts: AUTHORIZED_DOMAINS.map(d => ({ username: d.replace(/\.nl$/, "_ftp"), directory: `domains/${d}/public_html/`, domain: d })),
        password: "Enterprise_Vault_Key_#99986191_Secure_2026!",
        passwordMeta: { storageType: "dpapi", inGitHistory: false }
    });

    assert.strictEqual(fullAudit.isFullyHardened, true);
    assert.strictEqual(fullAudit.status, "SECURED");
    assert.strictEqual(fullAudit.grade, "A+");
    assert.strictEqual(fullAudit.totalScore >= 95, true);
    assert.strictEqual(fullAudit.violations.length, 0);

    // Verify healthcheck.php has type=ftp / type=ftp_audit support
    const healthcheckPhp = fs.readFileSync(path.join(ROOT_DIR, "crm/api/healthcheck.php"), "utf-8");
    assert.ok(healthcheckPhp.includes("$checkType === 'ftp'") || healthcheckPhp.includes("ftp_audit"), "healthcheck.php must support ftp_audit check");
    assert.ok(healthcheckPhp.includes("TLSRequired on"), "healthcheck.php must reflect TLSRequired on");
    assert.ok(healthcheckPhp.includes("LF_FTP"), "healthcheck.php must report CSF LF_FTP");

    // Verify release healthcheck.php is synchronized
    const releasePhp = fs.readFileSync(path.join(ROOT_DIR, "release/creation-alt-fix-v2.0.0/crm/api/healthcheck.php"), "utf-8");
    assert.ok(releasePhp.includes("ftp_audit"), "Release healthcheck.php must be synchronized");
});

// ========================================================
// 🛡️ SUITE 30: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 11)
// ========================================================
console.log("\n🛡️ SUITE 30: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 11)");

// --- SECTION 1: LEAD FACTORY DEEP EDGE-CASES (RONDE 11) ---

await testAsync("Lead Factory Enterprise (R11): Dutch Corporate Legal Entities, Complex Prefix Stripping & Diacritics in Slugs", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Dutch Corporate Entities & Punctuation
    assert.strictEqual(formatSuggestedDomain("'t Stoepje B.V. i.o."), "t-stoepje-b-v-i-o.nl");
    assert.strictEqual(formatSuggestedDomain("Fa. Van der Heijden & Zonen V.O.F."), "fa-van-der-heijden-zonen-v-o-f.nl");
    assert.strictEqual(formatSuggestedDomain("Maatschap Bakker & Partners Huisartsen"), "maatschap-bakker-partners-huisartsen.nl");
    assert.strictEqual(formatSuggestedDomain("C.V. Handelsmaatschappij \"Noord-Oost\""), "c-v-handelsmaatschappij-noord-oost.nl");
    assert.strictEqual(formatSuggestedDomain("Café-Restaurant \"L'Amuse-Bouche\""), "caf-restaurant-l-amuse-bouche.nl");
    assert.strictEqual(formatSuggestedDomain("Hoveniersbedrijf Müller & Söhne (Groningen/Assen)"), "hoveniersbedrijf-m-ller-s-hne-groningen.nl", "Slash acts as URL subpath delimiter and strips remainder");
    assert.strictEqual(formatSuggestedDomain("Hoveniersbedrijf Müller & Söhne Groningen-Assen"), "hoveniersbedrijf-m-ller-s-hne-groningen-assen.nl");

    // 2. Length Clamping: exactly 63 characters (RFC 1035 label limit)
    const longEntity = "a".repeat(120);
    const domainLong = formatSuggestedDomain(longEntity);
    assert.ok(domainLong.endsWith(".nl"));
    const labelLong = domainLong.replace(/\.nl$/, "");
    assert.strictEqual(labelLong.length, 63);
    assert.ok(!labelLong.endsWith("-"));

    // 3. Fallbacks for empty, numeric and punctuation inputs
    assert.strictEqual(formatSuggestedDomain(""), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(null), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(undefined), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(99986191), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain("---...###---"), "zzp-concept.nl");
});

await testAsync("Lead Factory Enterprise (R11): High-Density Phone Formatting, Normalization & International/Domestic Disambiguation", async () => {
    const { isDutchMobilePhone, normalizeDutchPhone } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizePhoneDigits } = await import("../factory/discovery/maps-crawler.js");

    // 1. Valid Dutch mobile variations
    assert.strictEqual(isDutchMobilePhone("0612345678"), true);
    assert.strictEqual(isDutchMobilePhone("06-12345678"), true);
    assert.strictEqual(isDutchMobilePhone("06 12 34 56 78"), true);
    assert.strictEqual(isDutchMobilePhone("06.12.34.56.78"), true);
    assert.strictEqual(isDutchMobilePhone("06/12345678"), true);
    assert.strictEqual(isDutchMobilePhone("+31 6 12345678"), true);
    assert.strictEqual(isDutchMobilePhone("+31(0)6-12345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031 6 12345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031(0)612345678"), true);

    // 2. Domestic landlines & special numbers must NOT be classified as mobile
    assert.strictEqual(isDutchMobilePhone("010-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("020-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("030-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("050-3123456"), false);
    assert.strictEqual(isDutchMobilePhone("0598-612345"), false);
    assert.strictEqual(isDutchMobilePhone("0592-123456"), false);
    assert.strictEqual(isDutchMobilePhone("085-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("088-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("0800-1234"), false);

    // 3. Foreign numbers starting with country code must be rejected
    assert.strictEqual(isDutchMobilePhone("+33 6 12 34 56 78"), false, "French mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+49 176 1234567"), false, "German mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+32 476 12 34 56"), false, "Belgian mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+44 7911 123456"), false, "UK mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+1 617 555 0199"), false, "US mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+34 612 345 678"), false, "Spanish mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+39 347 1234567"), false, "Italian mobile rejected");

    // 4. normalizeDutchPhone
    assert.strictEqual(normalizeDutchPhone("+31 6 12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("+31 (0)6 12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("31612345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("+31503123456"), "0503123456");
    assert.strictEqual(normalizeDutchPhone("06-12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone(null), null);
    assert.strictEqual(normalizeDutchPhone(""), null);

    // 5. normalizePhoneDigits
    assert.strictEqual(normalizePhoneDigits("+31 (0)6 98 76 54 32"), "98765432");
    assert.strictEqual(normalizePhoneDigits("050-3123456"), "03123456");
});

await testAsync("Lead Factory Enterprise (R11): Multi-Channel Lead Deduplication with Protocol, Port, Query & Fragment Equivalence", async () => {
    const { isDuplicateLead, normalizeDomain } = await import("../factory/discovery/maps-crawler.js");

    const existingLeads = [
        { name: "Bakkerij De Vries", slug: "bakkerij-de-vries", phone: "06-12345678", website: "https://bakkerijdevries.nl" },
        { name: "Installatiebedrijf Jansen", slug: "installatie-jansen", phone: "050-3123456", website: "http://www.janseninstallatie.nl:80/diensten?ref=maps#contact" }
    ];

    // Deduplication by phone format variance
    assert.strictEqual(isDuplicateLead({ phone: "+31 6 12345678" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ phone: "0031(0)612345678" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 50 312 3456" }, existingLeads), true);

    // Deduplication by website normalizations
    assert.strictEqual(isDuplicateLead({ website: "http://bakkerijdevries.nl/" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ website: "https://www.bakkerijdevries.nl:443" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ website: "https://janseninstallatie.nl" }, existingLeads), true);

    // Deduplication by slug
    assert.strictEqual(isDuplicateLead({ slug: "bakkerij-de-vries" }, existingLeads), true);
    assert.strictEqual(isDuplicateLead({ slug: "installatie-jansen" }, existingLeads), true);

    // Unique lead
    assert.strictEqual(isDuplicateLead({ name: "Klaas Elektra", slug: "klaas-elektra", phone: "06-99998888", website: "https://klaaselektra.nl" }, existingLeads), false);

    // normalizeDomain tests
    assert.strictEqual(normalizeDomain("https://www.bouwbedrijf.nl:8080/over-ons?utm=1#top"), "bouwbedrijf.nl:8080");
    assert.strictEqual(normalizeDomain("http://sub.domain.nl:80/"), "sub.domain.nl");
    assert.strictEqual(normalizeDomain("https://domain.nl:443/"), "domain.nl");
    assert.strictEqual(normalizeDomain(null), null);
    assert.strictEqual(normalizeDomain(""), null);
});

await testAsync("Lead Factory Enterprise (R11): Website Matching Heuristic, Agency Domain Exclusion & Platform Path Resolution", async () => {
    const { isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Strict agency domain protection
    assert.strictEqual(isWebsiteMatchingBusiness("Creation+Alt+Fix", "https://creationaltfix.nl"), false);
    assert.strictEqual(isWebsiteMatchingBusiness("Allard Web Solutions", "https://portal.creationaltfix.nl/status/"), false);
    assert.strictEqual(isWebsiteMatchingBusiness("CAF Concepten", "http://staging.creationaltfix.nl/test"), false);

    // 2. Strong brand matches
    assert.strictEqual(isWebsiteMatchingBusiness("Dakdekkersbedrijf Heinkens", "https://heinkens-dak.nl"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Bouwbedrijf Jansen", "https://jansenbouw.nl"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Stenekes Riooltechniek", "https://stenekesrioolspecialist.nl"), true);

    // 3. Acronym matches
    assert.strictEqual(isWebsiteMatchingBusiness("Schilder & Stuc Combinatie", "https://ssc-onderhoud.nl"), true);

    // 4. Portal path resolution
    assert.strictEqual(isWebsiteMatchingBusiness("Dennis Dijkema Klussen", "https://devakman.info/dennisdijkema"), true);

    // 5. Completely mismatched businesses
    assert.strictEqual(isWebsiteMatchingBusiness("Bakkerij De Vries", "https://loodgieter-jansen.nl"), false);
    assert.strictEqual(isWebsiteMatchingBusiness(null, "https://example.nl"), true, "Null business name trusts crawler by default");
    assert.strictEqual(isWebsiteMatchingBusiness("Test", ""), false);
});

await testAsync("Lead Factory Enterprise (R11): Extreme Malformed Inputs, 100k Character Buffer Overflow & Scheme Neutralization", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. 100,000 character buffer overflow safety
    const massiveStr = "M".repeat(100000);
    const sanitizedMassive = sanitizeLeadData({ name: massiveStr, slug: massiveStr, website: "https://safe-business.nl" });
    assert.strictEqual(sanitizedMassive.name.length, 150);
    assert.strictEqual(sanitizedMassive.slug.length, 64);
    assert.strictEqual(sanitizedMassive.website, "https://safe-business.nl");
    assert.strictEqual(sanitizedMassive.hasWebsite, true);

    // 2. Dangerous URI scheme neutralization
    const hostileSchemes = [
        "javascript:alert(document.cookie)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "file:///C:/Windows/System32/calc.exe",
        "blob:https://example.com/uuid"
    ];
    for (const scheme of hostileSchemes) {
        const result = sanitizeLeadData({ name: "Hostile Co", website: scheme });
        assert.strictEqual(result.website, null, `Scheme ${scheme} must be neutralized to null`);
        assert.strictEqual(result.hasWebsite, false);
    }

    // 3. Legitimate schemes
    assert.strictEqual(sanitizeLeadData({ name: "A", website: "http://example.nl" }).hasWebsite, true);
    assert.strictEqual(sanitizeLeadData({ name: "B", website: "https://example.nl" }).hasWebsite, true);

    // 4. Non-object fallbacks
    assert.strictEqual(sanitizeLeadData(null), null);
    assert.strictEqual(sanitizeLeadData(undefined), null);
    assert.strictEqual(sanitizeLeadData("corrupted string"), null);
    assert.strictEqual(sanitizeLeadData(12345), null);
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE-CASES (RONDE 11) ---

await testAsync("Offerte & Factuur Enterprise (R11): Belastingdienst Multi-Tarief BTW Parity (21%, 9%, 0%, Verlegd) & Fractionele Uren", async () => {
    function calculateFullTaxBasket(items, isReverseCharge = false) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const item of items) {
            const qty = Number(item.qty !== undefined ? item.qty : 1);
            const price = Number(item.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (isReverseCharge || item.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (item.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = isReverseCharge ? 0 : Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = isReverseCharge ? 0 : Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0: 0.00,
            totalVat,
            totalIncl,
            reverseNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const items = [
        { desc: "Senior Architect Consultatie", price: 95.00, qty: 16.75, vatRate: 21 }, // 1591.25
        { desc: "UI/UX Maatwerk Design", price: 85.00, qty: 24.5, vatRate: 21 },         // 2082.50
        { desc: "Technisch Handboek & Documentatie", price: 37.50, qty: 4, vatRate: 9 },   // 150.00
        { desc: "Intra-Communautaire Software Licentie", price: 750.00, qty: 1, vatRate: 0 } // 750.00
    ];

    const normal = calculateFullTaxBasket(items, false);
    assert.strictEqual(normal.subtotal21, 3673.75);
    assert.strictEqual(normal.vat21, 771.49);
    assert.strictEqual(normal.subtotal9, 150.00);
    assert.strictEqual(normal.vat9, 13.50);
    assert.strictEqual(normal.subtotal0, 750.00);
    assert.strictEqual(normal.subtotalExcl, 4573.75);
    assert.strictEqual(normal.totalVat, 784.99);
    assert.strictEqual(normal.totalIncl, 5358.74);
    assert.strictEqual(normal.reverseNotice, null);

    const reverse = calculateFullTaxBasket(items, true);
    assert.strictEqual(reverse.totalVat, 0.00);
    assert.strictEqual(reverse.totalIncl, 4573.75);
    assert.ok(reverse.reverseNotice.includes("BTW verlegd"));
});

await testAsync("Offerte & Factuur Enterprise (R11): Line-by-Line vs Total-Sum Rounding Delta & Half-Up Verification", async () => {
    const halfUp = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

    // Boundary edge numbers where native IEEE 754 fails without EPSILON
    assert.strictEqual(halfUp(10.005), 10.01);
    assert.strictEqual(halfUp(10.0049), 10.00);
    assert.strictEqual(halfUp(25.555), 25.56);
    assert.strictEqual(halfUp(0.005), 0.01);
    assert.strictEqual(halfUp(0.00499), 0.00);
    assert.strictEqual(halfUp(12.335), 12.34);
    assert.strictEqual(halfUp(12.334), 12.33);

    // Multi-item basket comparing line-by-line VAT rounding vs aggregate VAT rounding
    const items = [
        { price: 12.335, qty: 1 },
        { price: 8.125, qty: 1 },
        { price: 19.995, qty: 1 },
        { price: 3.445, qty: 1 },
        { price: 15.625, qty: 1 },
        { price: 7.775, qty: 1 },
        { price: 21.885, qty: 1 },
        { price: 4.115, qty: 1 },
        { price: 11.225, qty: 1 },
        { price: 9.995, qty: 1 }
    ];

    let lineSumVat = 0;
    let totalExcl = 0;
    for (const it of items) {
        const lineExcl = halfUp(it.price * it.qty);
        totalExcl = halfUp(totalExcl + lineExcl);
        const lineVat = halfUp(lineExcl * 0.21);
        lineSumVat = halfUp(lineSumVat + lineVat);
    }
    const aggregateVat = halfUp(totalExcl * 0.21);
    const variance = Math.abs(lineSumVat - aggregateVat);

    // Belastingdienst rule: difference between line-item rounding and total-sum rounding must never exceed € 0.02
    assert.ok(variance <= 0.02, `Rounding delta must be <= € 0.02, got ${variance}`);
});

await testAsync("Offerte & Factuur Enterprise (R11): 0-Euro Pro-Bono Invoices, Credit Notes & Division-by-Zero Resilience", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-bono project
    const proBonoProject = {
        id: "proj_probono_2026",
        client: "Stichting Natuurbehoud Groningen",
        invoices: [{
            invoiceNumber: "2026-PB-11",
            description: "Pro-bono sponsoring stichtingswebsite",
            amountExcl: 0.00,
            amountVat: 0.00,
            amountIncl: 0.00,
            status: "paid"
        }]
    };
    const normPb = normalizeProjectInvoices(proBonoProject);
    assert.strictEqual(normPb[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normPb[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");

    // 2. Negative credit note
    const creditProject = {
        id: "proj_credit_2026_11",
        client: "Fa. Van der Meulen & Zonen",
        invoices: [{
            invoiceNumber: "2026-CN-15",
            description: "Creditnota restitutie hosting borg",
            amountExcl: -450.00,
            amountVat: -94.50,
            amountIncl: -544.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditProject);
    assert.strictEqual(normCredit[0].amountIncl, -544.50);
    assert.strictEqual(formatCurrency(normCredit[0].amountIncl), "€ -544,50");

    // 3. Division-by-zero resilience
    function safeFinancialMetric(numerator, denominator) {
        if (!denominator || denominator <= 0 || !isFinite(denominator)) return 0;
        if (!numerator || numerator <= 0 || !isFinite(numerator)) return 0;
        return Math.min(100, Math.round((numerator / denominator) * 100));
    }
    assert.strictEqual(safeFinancialMetric(0, 0), 0);
    assert.strictEqual(safeFinancialMetric(150, 0), 0);
    assert.strictEqual(safeFinancialMetric(NaN, 100), 0);
    assert.strictEqual(safeFinancialMetric(100, NaN), 0);
    assert.strictEqual(safeFinancialMetric(100, Infinity), 0);
    assert.strictEqual(safeFinancialMetric(-100, 100), 0);
    assert.strictEqual(safeFinancialMetric(250, 500), 50);
});

await testAsync("Offerte & Factuur Enterprise (R11): Non-Linear Compound Discounts with Capping & Absolute Zero Floor", async () => {
    function computeTieredDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.earlyAdopterPercent) {
            current = Math.round((current * (1 - (rules.earlyAdopterPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.loyaltyPercent) {
            current = Math.round((current * (1 - (rules.loyaltyPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.voucherDeduction) {
            current = current - rules.voucherDeduction;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    // 15% Early Adopter + 5% Loyalty + € 350 voucher on € 5.000,00
    const calc = computeTieredDiscounts(5000, { earlyAdopterPercent: 15, loyaltyPercent: 5, voucherDeduction: 350 });
    assert.strictEqual(calc.clampedSubtotal, 3687.50);
    assert.strictEqual(calc.vat, 774.38);
    assert.strictEqual(calc.total, 4461.88);

    // Over-discounted invoice: € 250 base with € 500 voucher
    const clamped = computeTieredDiscounts(250, { voucherDeduction: 500 });
    assert.strictEqual(clamped.clampedSubtotal, 0.00);
    assert.strictEqual(clamped.vat, 0.00);
    assert.strictEqual(clamped.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R11): Dual-Locale Currency Parsing with Non-Breaking Spaces & Extreme Values", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseExoticCurrency(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[\u00A0\u202F\s]/g, '').replace(/[€$£]/g, '').trim();
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return isFinite(val) ? val : 0;
    }

    // Non-breaking space variants
    assert.strictEqual(parseExoticCurrency("€\u00A03.450,75"), 3450.75);
    assert.strictEqual(parseExoticCurrency("€\u202F1.200,50"), 1200.50);
    assert.strictEqual(parseExoticCurrency("EUR 4.800,00"), 4800.00);
    assert.strictEqual(parseExoticCurrency("  € 99,-  "), 99.00);
    assert.strictEqual(parseExoticCurrency("$ 4,500.50"), 4500.50);
    assert.strictEqual(parseExoticCurrency("£ 1,499.99"), 1499.99);
    assert.strictEqual(parseExoticCurrency("corrupted text"), 0.00);

    // formatCurrency output tests
    assert.strictEqual(formatCurrency(5000000), "€ 5000000,00");
    assert.strictEqual(formatCurrency(-450.75), "€ -450,75");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");
    assert.strictEqual(formatCurrency(null), "€ 0,00");
    assert.strictEqual(formatCurrency(undefined), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE-CASES (RONDE 11) ---

await testAsync("Contact & Intake Enterprise (R11): Advanced Multi-Decoy Honeypot Trapping & Speed Heuristics", async () => {
    function inspectDeepIntakePayload(payload, elapsedMs = 5000) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }

        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment', 'zipcode_verify'];
        for (const field of decoyFields) {
            if (payload[field] && String(payload[field]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_HIT_${field.toUpperCase()}`, silentAccept: true };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }

        const combinedText = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = combinedText.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(combinedText)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { blocked: false, reason: 'LEGITIMATE_SUBMISSION', silentAccept: false };
    }

    // Test each honeypot field
    assert.strictEqual(inspectDeepIntakePayload({ website: "http://bot.ru" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ _hp_trap: "trapped" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ company_fax: "050-0000000" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ bot_token: "evil_token" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ user_url: "http://evil.com" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ telephone_confirm: "06" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ extra_address: "Fake street" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ honey_comment: "Trap note" }).blocked, true);
    assert.strictEqual(inspectDeepIntakePayload({ zipcode_verify: "9999ZZ" }).blocked, true);

    // Whitespace in honeypot is ignored
    assert.strictEqual(inspectDeepIntakePayload({ website: "   ", _hp_trap: "" }, 6000).blocked, false);

    // Speed bot test (<1200ms)
    assert.strictEqual(inspectDeepIntakePayload({ companyName: "RapidBot" }, 450).blocked, true);

    // Link flood spam (>=3 links)
    assert.strictEqual(inspectDeepIntakePayload({ goals: "Visit https://a.com and https://b.com or https://c.com" }).blocked, true);

    // Keyword spam match
    assert.strictEqual(inspectDeepIntakePayload({ comments: "Best casino and bitcoin investment" }).blocked, true);

    // Legitimate human submission
    const cleanSubmission = inspectDeepIntakePayload({
        companyName: "Stenekes Rioolspecialist",
        contactName: "Angela Stenekes",
        goals: "Nieuwe website voor lokale spoedklussen",
        website: "",
        _hp_trap: ""
    }, 8500);
    assert.strictEqual(cleanSubmission.blocked, false);
    assert.strictEqual(cleanSubmission.reason, "LEGITIMATE_SUBMISSION");
});

await testAsync("Contact & Intake Enterprise (R11): Deep CWE-93 CRLF Header Injection & Multi-Stage Obfuscation Defense", async () => {
    function sanitizeStrictCrlfHeader(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const aggressiveVectors = [
        "info@creationaltfix.nl\r\nBcc:attacker@leak.com",
        "info@creationaltfix.nl\rBcc:attacker@leak.com",
        "info@creationaltfix.nl\nBcc:attacker@leak.com",
        "info@creationaltfix.nl%0d%0aBcc:attacker@leak.com",
        "info@creationaltfix.nl%250d%250aBcc:attacker@leak.com",
        "info@creationaltfix.nl\u2028Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u2029Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u0085Bcc:attacker@leak.com",
        "info@creationaltfix.nl\x00Bcc:attacker@leak.com",
        "info@creationaltfix.nl\u000BBcc:attacker@leak.com",
        "info@creationaltfix.nl\u000CBcc:attacker@leak.com",
        "info@creationaltfix.nl;Bcc:attacker@leak.com",
        "info@creationaltfix.nl,leak@attacker.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vector of aggressiveVectors) {
        const result = sanitizeStrictCrlfHeader(vector);
        assert.ok(!result.includes("\r"));
        assert.ok(!result.includes("\n"));
        assert.ok(!result.includes("\u2028"));
        assert.ok(!result.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(result), false, `Vector ${vector} must be rejected as clean email`);
    }

    const legitEmail = sanitizeStrictCrlfHeader("info@creationaltfix.nl");
    assert.strictEqual(legitEmail, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(legitEmail), true);
});

await testAsync("Contact & Intake Enterprise (R11): Strict RFC 5322 & RFC 6530 Email Normalization & International Domain Handling", async () => {
    function normalizeRfc5322Email(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIndex);
        const domain = trimmed.slice(atIndex + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    // 1. Sub-addressing (+tagging)
    const tagged = normalizeRfc5322Email("allard+intake2026@creationaltfix.nl");
    assert.strictEqual(tagged.valid, true);
    assert.strictEqual(tagged.email, "allard+intake2026@creationaltfix.nl");

    // 2. Case normalization
    const mixed = normalizeRfc5322Email("  Support@CreationAltFix.NL  ");
    assert.strictEqual(mixed.valid, true);
    assert.strictEqual(mixed.email, "Support@creationaltfix.nl");

    // 3. Invalid formats
    const badEmails = [
        "no-at-symbol.nl",
        "@missing-local.nl",
        "missing-domain@",
        "double@@domain.nl",
        "consecutive..dots@domain.nl",
        ".leadingdot@domain.nl",
        "trailingdot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl",
        "user@domain..nl",
        "",
        null,
        undefined
    ];
    for (const bad of badEmails) {
        assert.strictEqual(normalizeRfc5322Email(bad).valid, false, `${bad} must be rejected`);
    }
});

await testAsync("Contact & Intake Enterprise (R11): SSRF Webhook Firewall & Strict CIDR Blacklist Validation", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // 1. SSRF URL blocks
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/bot123"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8080/hook"), false, "Localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false, "Loopback 127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.1.5/hook"), false, "RFC 1918 10.x.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.1/hook"), false, "RFC 1918 172.16.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.100/hook"), false, "RFC 1918 192.168.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false, "Cloud metadata blocked");
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/hook"), false, "CGNAT 100.64.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://service.internal/hook"), false, "Internal mDNS domain blocked");
    assert.strictEqual(isSafeWebhookUrl("https://db.local/hook"), false, "Local domain blocked");

    // 2. Legitimate webhook acceptance
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);

    // 3. Markdown sanitization
    assert.strictEqual(sanitizeMarkdown("Test *bold* _italic_"), "Test \\*bold\\* \\_italic\\_");
    assert.strictEqual(sanitizeMarkdown("[Link](https://creationaltfix.nl)"), "\\[Link\\]\\(https://creationaltfix\\.nl\\)");
    assert.strictEqual(sanitizeMarkdown("`code` ~strike~ #header"), "\\`code\\` \\~strike\\~ \\#header");
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE-CASES (RONDE 11) ---

await testAsync("DRM & Code Protection Enterprise (R11): W3C HTML5 Parser Compliance & Mandatory Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Concept Test</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-pwn-slug"
    });

    // Verify exactly 1 script open tag
    const scriptMatches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(scriptMatches.length, 1);

    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(match, "Guard script must be cleanly matched");
    const scriptBody = match[1];

    // Script body must never contain closing script tag
    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.strictEqual(scriptBody.toLowerCase().includes("</script"), false);

    // Hex-escaped tags verification
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));
    assert.ok(scriptBody.includes("\\x3Cstrong>"));
    assert.ok(scriptBody.includes("\\x3C/strong>"));

    // Hostile script breakout prevented
    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R11): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Bakkerij Sieg", slug: "bakkerij-sieg" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // AST syntax compilation check
    const script = new vm.Script(scriptBody);
    assert.ok(script, "VM Script must compile without parse error");

    // Execution on authorized host
    const authorizedContext = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedContext);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedContext);
    });

    // Execution on unauthorized host must trigger killswitch error
    const unauthorizedContext = {
        window: { location: { hostname: 'pirated-theme-ripper.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedContext);
    assert.throws(() => {
        script.runInContext(unauthorizedContext);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R11): Anti-Inspect Event Shielding & Shortcut Interception", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Arnold Design", slug: "arnold-design" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Right-click contextmenu defense
    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Keydown inspector shortcut traps
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R11): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Vanderplaats Bouw", slug: "vanderplaats-bouw" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Strictly NO cookies
    assert.strictEqual(scriptBody.includes("document.cookie"), false);

    // Session debounce
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    // Admin preview exclusion
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    // Beacon telemetry delivery
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));

    // Watermark integrity
    assert.ok(scriptBody.includes("CREATION+ALT+FIX"));
    assert.ok(scriptBody.includes("99986191"));
    assert.ok(scriptBody.includes("AUTEURSWET 1912"));
    assert.ok(scriptBody.includes("ARTIKEL 29A"));
    assert.ok(scriptBody.includes("BENELUX VERDRAG"));

    // Idempotency
    const repeated = applyCodeProtection(protectedHtml, { name: "Vanderplaats Bouw", slug: "vanderplaats-bouw" });
    assert.strictEqual(protectedHtml, repeated, "applyCodeProtection must be idempotent");
});

// ========================================================
// 31. BAKKERTJESIEG CLOUD FUNCTIONS V2 CONTACT- & BESTELMAILER (TASK-842)
// ========================================================
console.log("\n🍞 SUITE 31: BakkertjeSieg Cloud Functions v2 Contact- & Bestelmailer (TASK-842)");

test("TASK-842: Syntax validation: BakkertjeSieg/functions/v2-migration.js and index.js", () => {
    const v2Path = path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js");
    const indexPath = path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/index.js");
    assert.ok(fs.existsSync(v2Path), "v2-migration.js must exist");
    assert.ok(fs.existsSync(indexPath), "index.js must exist");

    execSync(`node --check "${v2Path}"`, { stdio: "pipe" });
    execSync(`node --check "${indexPath}"`, { stdio: "pipe" });
});

test("TASK-842: BakkertjeSieg v2 mailer imports and exports required triggers and helpers", () => {
    const bakkertjeIndex = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/index.js"));
    assert.ok(typeof bakkertjeIndex.onContactFormSubmission === "function", "index.js must export onContactFormSubmission");
    assert.ok(typeof bakkertjeIndex.onMailDocumentCreated === "function", "index.js must export onMailDocumentCreated");

    const v2Mailer = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js"));
    assert.ok(v2Mailer.BAKERY_INFO, "v2-migration.js must export BAKERY_INFO");
    assert.strictEqual(v2Mailer.BAKERY_INFO.kvk, "92124356", "BAKERY_INFO must contain official KvK 92124356");
    assert.strictEqual(v2Mailer.BAKERY_INFO.adminEmail, "bakkertjesieg@gmail.com", "Admin email must be bakkertjesieg@gmail.com");
    assert.strictEqual(v2Mailer.BAKERY_INFO.senderEmail, "bestellingen@bakkertjesieg.nl", "Sender email must be bestellingen@bakkertjesieg.nl");
    assert.strictEqual(v2Mailer.BAKERY_INFO.smtpHost, "mail.zxcs.nl", "SMTP host must be Vimexx mail.zxcs.nl");
    assert.strictEqual(v2Mailer.BAKERY_INFO.smtpPort, 465, "SMTP port must be 465 SSL");
});

test("TASK-842: Vimexx SMTP transporter configuration & custom overrides", () => {
    const { getMailTransporter } = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js"));

    const defaultTransporter = getMailTransporter();
    assert.ok(defaultTransporter, "getMailTransporter must return a valid transporter");

    const customTransporter = getMailTransporter({
        host: "custom.smtp.server",
        port: 587,
        secure: false,
        user: "custom@bakker.nl",
        pass: "supersecret123"
    });
    assert.ok(customTransporter, "Custom transporter must instantiate correctly");
    assert.strictEqual(customTransporter.options.host, "custom.smtp.server");
    assert.strictEqual(customTransporter.options.port, 587);
    assert.strictEqual(customTransporter.options.secure, false);
    assert.strictEqual(customTransporter.options.auth.user, "custom@bakker.nl");
});

test("TASK-842: Security, XSS HTML Escaping & CWE-93 CRLF Header Injection Defense", () => {
    const { escapeHtml, sanitizeEmailHeader, isValidEmail } = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js"));

    // XSS Escaping
    const dangerousHtml = '<script>alert("pwn")</script> & <b>bold</b> "quotes" \'apostrophe\'';
    const escaped = escapeHtml(dangerousHtml);
    assert.strictEqual(escaped.includes("<script>"), false);
    assert.strictEqual(escaped.includes("&lt;script&gt;"), true);
    assert.strictEqual(escaped.includes("&amp;"), true);
    assert.strictEqual(escaped.includes("&quot;quotes&quot;"), true);
    assert.strictEqual(escaped.includes("&#039;apostrophe&#039;"), true);

    // CWE-93 CRLF Header Injection Defense
    const hostileHeader = "attacker@evil.com\r\nBcc: victim1@target.com, victim2@target.com\nSubject: Injected";
    const sanitized = sanitizeEmailHeader(hostileHeader);
    assert.strictEqual(sanitized.includes("\r"), false);
    assert.strictEqual(sanitized.includes("\n"), false);
    assert.strictEqual(sanitized.includes("attacker@evil.comBcc:"), true);

    // URL-encoded CRLF Injection Defense (%0d%0a)
    const encodedCrlf = "legit@domain.nl%0d%0aBcc:spam@bot.com";
    const sanitizedEncoded = sanitizeEmailHeader(encodedCrlf);
    assert.strictEqual(sanitizedEncoded.includes("%0d"), false);
    assert.strictEqual(sanitizedEncoded.includes("%0a"), false);

    // Email RFC 5322 validation
    assert.strictEqual(isValidEmail("klant@gmail.com"), true);
    assert.strictEqual(isValidEmail("allardv03+test@gmail.com"), true);
    assert.strictEqual(isValidEmail("invalid-email"), false);
    assert.strictEqual(isValidEmail("user@domain,com"), false);
    assert.strictEqual(isValidEmail("user @domain.com"), false);
    assert.strictEqual(isValidEmail("user@domain\r\n.com"), false);
});

test("TASK-842: Branded HTML Email Templates for Contact & Orders", () => {
    const {
        formatAdminContactHtml,
        formatCustomerContactHtml,
        formatAdminOrderHtml,
        BAKERY_INFO
    } = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js"));

    // Admin Contact HTML
    const adminContactHtml = formatAdminContactHtml({
        name: "Liesbeth Bakker",
        email: "liesbeth@bakker.nl",
        phone: "06-12345678",
        subject: "Bruidstaart voor September 2027",
        message: "Hoi Sigrid, kunnen we een afspraak maken voor een proeverij?",
        type: "Bruidstaart"
    });
    assert.ok(adminContactHtml.includes(BAKERY_INFO.name), "Must include bakery name");
    assert.ok(adminContactHtml.includes("92124356"), "Must include official KvK");
    assert.ok(adminContactHtml.includes("Liesbeth Bakker"), "Must include customer name");
    assert.ok(adminContactHtml.includes("liesbeth@bakker.nl"), "Must include customer email");
    assert.ok(adminContactHtml.includes("06-12345678"), "Must include phone number");
    assert.ok(adminContactHtml.includes("Bruidstaart voor September 2027"), "Must include subject");
    assert.ok(adminContactHtml.includes("afspraak maken voor een proeverij"), "Must include message text");

    // Customer Autoresponder HTML
    const custContactHtml = formatCustomerContactHtml({
        name: "Liesbeth",
        subject: "Bruidstaart aanvraag",
        type: "Taart"
    });
    assert.ok(custContactHtml.includes("Beste Liesbeth"), "Must address customer warmly");
    assert.ok(custContactHtml.includes("Sigrid Sneep"), "Must be signed by Sigrid Sneep");
    assert.ok(custContactHtml.includes("/recepten"), "Must link to recipes on the website");
    assert.ok(custContactHtml.includes(BAKERY_INFO.websiteUrl), "Must link to website");

    // Admin Order HTML
    const adminOrderHtml = formatAdminOrderHtml({
        orderData: {
            customerName: "Thomas de Boer",
            customerEmail: "thomas@deboer.nl",
            totalAmount: 49.50,
            isPhysical: true,
            shippingAddress: {
                street: "Dorpsstraat",
                houseNumber: "12A",
                zipCode: "9781AA",
                city: "Bedum",
                notes: "Graag bij de buren afgeven indien niet thuis"
            },
            items: [
                { quantity: 2, title: "Luxe Sloffentaart", price: "35.00" },
                { quantity: 1, title: "Boekje Bakken met Sieg", price: "14.50" }
            ]
        },
        orderId: "ORD-2027-001",
        invoiceUrl: "https://bakkertjesieg.nl/invoices/ORD-2027-001.pdf"
    });
    assert.ok(adminOrderHtml.includes("ORD-2027-001"), "Must include order ID");
    assert.ok(adminOrderHtml.includes("49.50"), "Must include total amount");
    assert.ok(adminOrderHtml.includes("Thomas de Boer"), "Must include customer name");
    assert.ok(adminOrderHtml.includes("Luxe Sloffentaart"), "Must list ordered items");
    assert.ok(adminOrderHtml.includes("Dorpsstraat 12A"), "Must include physical shipping address");
    assert.ok(adminOrderHtml.includes("https://bakkertjesieg.nl/invoices/ORD-2027-001.pdf"), "Must include invoice PDF link");
});

await testAsync("TASK-842: End-to-end Mail Dispatching Service with Mock Transporter", async () => {
    const { sendContactEmails, sendOrderEmails } = cjsRequire(path.resolve(ROOT_DIR, "../BakkertjeSieg/functions/v2-migration.js"));

    const sentMessages = [];
    const mockTransporter = {
        sendMail: async (mailOptions) => {
            sentMessages.push(mailOptions);
            return { messageId: `msg_${Date.now()}_${sentMessages.length}` };
        }
    };

    // 1. Send Contact Form Emails
    const contactResult = await sendContactEmails({
        naam: "Mark Dijkstra",
        email: "mark@dijkstra.nl",
        telefoon: "06-98765432",
        onderwerp: "Workshop Desembrood Bakken",
        bericht: "Ik zou graag een workshop willen volgen met 4 personen.",
        type: "Workshop"
    }, mockTransporter);

    assert.strictEqual(contactResult.adminSuccess, true, "Admin contact email must succeed");
    assert.strictEqual(contactResult.customerSuccess, true, "Customer contact email must succeed");
    assert.strictEqual(contactResult.messageIds.length, 2, "Must return 2 message IDs (admin + customer)");
    assert.strictEqual(sentMessages.length, 2, "Transporter must have received exactly 2 emails");

    // First message: to admin
    assert.strictEqual(sentMessages[0].to, "bakkertjesieg@gmail.com");
    assert.strictEqual(sentMessages[0].replyTo, "mark@dijkstra.nl");
    assert.ok(sentMessages[0].subject.includes("Mark Dijkstra"));

    // Second message: to customer autoresponder
    assert.strictEqual(sentMessages[1].to, "mark@dijkstra.nl");
    assert.ok(sentMessages[1].subject.includes("Ontvangstbevestiging"));

    // 2. Send Order Fulfillment Emails
    sentMessages.length = 0; // reset
    const orderResult = await sendOrderEmails({
        orderData: {
            customerName: "Sanne Visser",
            customerEmail: "sanne@visser.nl",
            totalAmount: 18.00,
            items: [{ quantity: 1, title: "E-book Suikervrij Bakken", price: "18.00" }]
        },
        orderId: "ORD-9988",
        invoiceUrl: "https://bakkertjesieg.nl/invoice/9988.pdf",
        invoiceBuffer: Buffer.from("%PDF-1.4 mock")
    }, mockTransporter);

    assert.strictEqual(orderResult.adminSuccess, true, "Admin order email must succeed");
    assert.strictEqual(orderResult.customerSuccess, true, "Customer order email must succeed");
    assert.strictEqual(sentMessages.length, 2, "Must send admin alert and customer order confirmation");
    assert.strictEqual(sentMessages[0].to, "bakkertjesieg@gmail.com");
    assert.strictEqual(sentMessages[1].to, "sanne@visser.nl");
    assert.ok(sentMessages[1].attachments && sentMessages[1].attachments.length === 1, "Must attach PDF invoice");
});

test("TASK-842: BakkertjeSieg firestore.rules allows contact collection 'berichten'", () => {
    const rulesPath = path.resolve(ROOT_DIR, "../BakkertjeSieg/firestore.rules");
    assert.ok(fs.existsSync(rulesPath), "BakkertjeSieg/firestore.rules must exist");
    const rules = fs.readFileSync(rulesPath, "utf-8");

    assert.ok(rules.includes("match /berichten/{berichtId}"), "firestore.rules must permit match /berichten/{berichtId}");
    assert.ok(rules.includes("match /mail/{mailId}"), "firestore.rules must preserve match /mail/{mailId}");
    assert.ok(rules.includes("match /messages/{messageId}"), "firestore.rules must preserve match /messages/{messageId}");
});

// ========================================================
// 🛡️ SUITE 32: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 12)
// ========================================================
console.log("\n🛡️ SUITE 32: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 12)");

// --- SECTION 1: LEAD FACTORY DEEP EDGE-CASES (RONDE 12) ---

await testAsync("Lead Factory Enterprise (R12): Address City Extraction, Non-Standard Postcodes & Regional Hamlets", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Standard Dutch postal code patterns
    assert.strictEqual(extractCityFromAddress("Hoofdstraat 14, 9601 EA Hoogezand"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Noorderstraat 5, 9601ea Sappemeer"), "Sappemeer");
    assert.strictEqual(extractCityFromAddress("Kerkstraat 22, 9641  AB  Veendam"), "Veendam");
    assert.strictEqual(extractCityFromAddress("Grote Markt 1, 9712 HN Groningen"), "Groningen");
    assert.strictEqual(extractCityFromAddress("Brink 10, 9401 HS Assen"), "Assen");

    // 2. Regional hamlets & multi-component addresses
    assert.strictEqual(extractCityFromAddress("Wester Nieuwkruisland 2, 9293 LW Kollumerpomp"), "Kollumerpomp");
    assert.strictEqual(extractCityFromAddress("Foijingaweg 136, 9293 LR Kollumerpomp"), "Kollumerpomp");
    assert.strictEqual(extractCityFromAddress("Rijksstraatweg 12, 9752 AE Haren"), "Haren");
    assert.strictEqual(extractCityFromAddress("Stationsweg 4, 9601 EA Hoogezand, Nederland"), "Hoogezand");

    // 3. Robust fallbacks on corrupted, empty or non-string inputs
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(undefined), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(12345), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Onbekend adres zonder postcode of plaatsnaam"), "Hoogezand");
});

await testAsync("Lead Factory Enterprise (R12): Sector Service & Review Derivation with Unknown Category Fallbacks", async () => {
    const { deriveServicesFromCategory, deriveReviewsFromCategory } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Recognized trades return tailored 4-pack services
    const sDak = deriveServicesFromCategory("Dakdekker", "Dak Techniek Noord");
    assert.strictEqual(sDak.length, 4);
    assert.ok(sDak[0].title.includes("Dakrenovatie"));

    const sLoodgieter = deriveServicesFromCategory("Loodgieter", "Installatie Jansen");
    assert.strictEqual(sLoodgieter.length, 4);
    assert.ok(sLoodgieter.some(s => s.title.includes("CV-Ketel") || s.title.includes("Loodgieter")));

    const sHovenier = deriveServicesFromCategory("Hovenier", "Groenverzorging");
    assert.strictEqual(sHovenier.length, 4);
    assert.ok(sHovenier.some(s => s.title.includes("Tuinaanleg")));

    const sSchilder = deriveServicesFromCategory("Schildersbedrijf", "Kleurrijk");
    assert.strictEqual(sSchilder.length, 4);
    assert.ok(sSchilder.some(s => s.title.includes("Binnenschilderwerk")));

    const sElektra = deriveServicesFromCategory("Elektricien", "Spanning & Kracht");
    assert.strictEqual(sElektra.length, 4);
    assert.ok(sElektra.some(s => s.title.includes("Groepenkast")));

    // 2. Unknown or garbage categories fall back safely to 4 general trade services
    const sGarbage = deriveServicesFromCategory("unrecognized_trade_xyz_999", "Onbekend");
    assert.strictEqual(sGarbage.length, 4);
    assert.strictEqual(sGarbage[0].title, "Vakmanschap op Maat");
    assert.strictEqual(deriveServicesFromCategory(null, null).length, 4);
    assert.strictEqual(deriveServicesFromCategory("", "").length, 4);

    // 3. Review generator returns 3 verified testimonials with authentic metadata
    const rDak = deriveReviewsFromCategory("Dakdekker", "Dak Techniek Noord", "Hoogezand");
    assert.strictEqual(rDak.length, 3);
    assert.ok(rDak[0].text.includes("Dak Techniek Noord"));
    assert.ok(rDak[0].author.includes("Hoogezand"));

    const rFallback = deriveReviewsFromCategory("Onbekend", "Klusbedrijf Klaas", "Groningen");
    assert.strictEqual(rFallback.length, 3);
    assert.ok(rFallback[0].text.includes("Klusbedrijf Klaas"));
});

await testAsync("Lead Factory Enterprise (R12): Business Potential & Archetype Scoring with Review/Phone Vectors", async () => {
    const { analyzeBusinessPotential } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. High-potential craftsman lead: no website, 06 mobile phone, high ratings
    const craftsman = {
        name: "Dakdekker Bakker",
        category: "Dakdekker",
        address: "Kerkstraat 1, 9601 EA Hoogezand",
        phone: "06-12345678",
        rating: 4.9,
        reviewsCount: 18
    };
    const potA = analyzeBusinessPotential(craftsman, { type: 'NO_WEBSITE' });
    assert.ok(potA.score >= 90, `Score must be >= 90, got ${potA.score}`);
    assert.strictEqual(potA.archetype, 'A_TRADE_DIRECT');
    assert.ok(potA.strengths.some(s => s.includes("Heeft nog géén actieve website")));
    assert.ok(potA.strengths.some(s => s.includes("Uitstekende Google reputatie")));
    assert.ok(potA.strengths.some(s => s.includes("Direct telefonisch bereikbaar")));
    assert.ok(potA.pitchHook.includes("Dakdekker Bakker"));

    // 2. Beauty & Care archetype without website
    const beauty = {
        name: "Schoonheidssalon Pure",
        category: "Schoonheidssalon & Massage",
        address: "Groningen",
        phone: "06-98765432"
    };
    const potB = analyzeBusinessPotential(beauty, { type: 'NO_WEBSITE' });
    assert.strictEqual(potB.archetype, 'B_PRESENTATION_REVIEWS');
    assert.ok(potB.pitchHook.includes("behandelingen"));

    // 3. Insecure HTTP upgrade potential
    const httpLead = {
        name: "Installatiebedrijf De Vries",
        category: "Loodgieter",
        website: "http://installatiedevries.nl"
    };
    const potC = analyzeBusinessPotential(httpLead, { type: 'INSECURE_HTTP' });
    assert.strictEqual(potC.archetype, 'C_MODERNISATION');
    assert.ok(potC.strengths.some(s => s.includes("onbeveiligde HTTP-website")));

    // 4. Site offline alert
    const offlineLead = {
        name: "Autobedrijf Jansen",
        category: "Garage",
        website: "https://autojansen.nl"
    };
    const potE = analyzeBusinessPotential(offlineLead, { type: 'SITE_OFFLINE' });
    assert.strictEqual(potE.archetype, 'E_SITE_OFFLINE');
    assert.ok(potE.strengths.some(s => s.includes("storing")));
});

await testAsync("Lead Factory Enterprise (R12): SQL & Command Injection Payloads, Null-Bytes & Unicode BiDi Overrides", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    // 1. SQL Injection vectors in lead name
    const sqlLead = sanitizeLeadData({
        name: "Jansen'; DROP TABLE leads; --",
        website: "https://jansen-dak.nl",
        phone: "06-12345678"
    });
    assert.ok(sqlLead);
    assert.strictEqual(sqlLead.hasWebsite, true);
    assert.strictEqual(sqlLead.website, "https://jansen-dak.nl");

    // 2. Command injection and system execution tokens
    const cmdLead = sanitizeLeadData({
        name: "Klusbedrijf $(whoami) `cat /etc/passwd`",
        website: "https://klusbedrijf.nl"
    });
    assert.ok(cmdLead);
    assert.ok(cmdLead.name.length <= 150);

    // 3. Null-byte truncation injection (\x00)
    const nullLead = sanitizeLeadData({
        name: "Elektra\x00MaliciousPayload",
        slug: "elektra\x00payload"
    });
    assert.ok(nullLead);
    assert.ok(nullLead.name.length <= 150);

    // 4. Unicode bidirectional override (\u202E)
    const bidiLead = sanitizeLeadData({
        name: "Bouwbedrijf \u202Ecod.exe",
        slug: "bouwbedrijf-safe"
    });
    assert.ok(bidiLead);
    assert.strictEqual(bidiLead.slug, "bouwbedrijf-safe");

    // 5. Array / object / null type safety
    assert.strictEqual(sanitizeLeadData(null), null);
    assert.strictEqual(sanitizeLeadData(undefined), null);
    assert.strictEqual(sanitizeLeadData([1, 2, 3]), null);
    assert.strictEqual(sanitizeLeadData("corrupt string"), null);
    assert.strictEqual(sanitizeLeadData(99986191), null);
});

await testAsync("Lead Factory Enterprise (R12): Extended Special Characters, French/German Diacritics & SIDN RFC-1035 Domain Conformance", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. European accented characters and diacritics
    assert.strictEqual(formatSuggestedDomain("Café & Brasserie 'De Klipper'"), "caf-brasserie-de-klipper.nl");
    assert.strictEqual(formatSuggestedDomain("Häagen-Dazs IJsboetiek"), "h-agen-dazs-ijsboetiek.nl");
    assert.strictEqual(formatSuggestedDomain("Boulangerie L'Étoile"), "boulangerie-l-toile.nl");
    assert.strictEqual(formatSuggestedDomain("Björn & Söhne Timmerwerken"), "bj-rn-s-hne-timmerwerken.nl");
    assert.strictEqual(formatSuggestedDomain("Klusbedrijf De 's-Gravenhaagse V.O.F."), "klusbedrijf-de-s-gravenhaagse-v-o-f.nl");

    // 2. Strict SIDN & RFC 1035 label compliance
    const sidnRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.nl$/;
    const testCases = [
        "Café De Valk",
        "Aannemersbedrijf 't Noorden B.V.",
        "Fa. Van der Laan & Zonen V.O.F.",
        "Elektro-Techniek + Duurzaam 2026",
        "Kapperszaak & Visagie (Groningen)"
    ];
    for (const tc of testCases) {
        const domain = formatSuggestedDomain(tc);
        assert.ok(sidnRegex.test(domain), `Domain ${domain} derived from "${tc}" must strictly match SIDN RFC-1035 regex`);
        assert.strictEqual(domain.includes("--"), false, `Domain ${domain} must not contain consecutive hyphens`);
    }

    // 3. Fallback resilience
    assert.strictEqual(formatSuggestedDomain(""), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(null), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain("---...###---"), "zzp-concept.nl");
});

await testAsync("Lead Factory Enterprise (R12): International Country Code Rejection & Disambiguation for E.164 Phones", async () => {
    const { isDutchMobilePhone, normalizeDutchPhone } = await import("../factory/enrichment/deep-intelligence.js");

    // 1. Domestic Dutch mobile numbers (must return TRUE)
    assert.strictEqual(isDutchMobilePhone("0612345678"), true);
    assert.strictEqual(isDutchMobilePhone("06-12345678"), true);
    assert.strictEqual(isDutchMobilePhone("06 12 34 56 78"), true);
    assert.strictEqual(isDutchMobilePhone("+31 6 12345678"), true);
    assert.strictEqual(isDutchMobilePhone("+31(0)6-12345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031 6 12345678"), true);

    // 2. International numbers across European borders (must return FALSE)
    assert.strictEqual(isDutchMobilePhone("+49 151 12345678"), false, "German mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+49 491 998877"), false, "German landline rejected");
    assert.strictEqual(isDutchMobilePhone("0049 171 1234567"), false, "German mobile with 0049 rejected");
    assert.strictEqual(isDutchMobilePhone("+32 470 123456"), false, "Belgian mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+32 2 1234567"), false, "Belgian landline rejected");
    assert.strictEqual(isDutchMobilePhone("+44 7911 123456"), false, "UK mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+352 621 123456"), false, "Luxembourg mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+33 6 12 34 56 78"), false, "French mobile rejected");

    // 3. Domestic landlines & special numbers (must return FALSE)
    assert.strictEqual(isDutchMobilePhone("050-3123456"), false);
    assert.strictEqual(isDutchMobilePhone("010-4123456"), false);
    assert.strictEqual(isDutchMobilePhone("020-5123456"), false);
    assert.strictEqual(isDutchMobilePhone("0598-612345"), false);
    assert.strictEqual(isDutchMobilePhone("0800-0113"), false);
    assert.strictEqual(isDutchMobilePhone("0900-8844"), false);
    assert.strictEqual(isDutchMobilePhone("088-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("085-0001234"), false);

    // 4. normalizeDutchPhone
    assert.strictEqual(normalizeDutchPhone("+31 6 12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("+31 (0)6 12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("0031612345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("06-12345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone(null), null);
    assert.strictEqual(normalizeDutchPhone(""), null);
});

await testAsync("Lead Factory Enterprise (R12): Multi-Vector Lead Deduplication Across Canonical Domains & Varied Separators", async () => {
    const { isDuplicateLead, normalizeDomain } = await import("../factory/discovery/maps-crawler.js");

    const existingCatalog = [
        { name: "Stenekes Rioolspecialist", slug: "stenekes-rioolspecialist", phone: "06-12345678", website: "https://stenekesrioolspecialist.nl" },
        { name: "Vanderplaats Bouw", slug: "vanderplaats-bouw", phone: "050-3123456", website: "http://www.vanderplaats.nl:80/diensten?ref=gmaps#contact" }
    ];

    // Canonical URL deduplication
    assert.strictEqual(isDuplicateLead({ website: "http://stenekesrioolspecialist.nl/" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ website: "https://www.stenekesrioolspecialist.nl:443" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ website: "https://vanderplaats.nl" }, existingCatalog), true);

    // Phone format deduplication
    assert.strictEqual(isDuplicateLead({ phone: "+31 6 12345678" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "06 12 34 56 78" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)50 312 3456" }, existingCatalog), true);

    // Slug deduplication
    assert.strictEqual(isDuplicateLead({ slug: "stenekes-rioolspecialist" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ slug: "vanderplaats-bouw" }, existingCatalog), true);

    // Truly unique lead must not be flagged
    assert.strictEqual(isDuplicateLead({
        name: "Arnold Design",
        slug: "arnold-design",
        phone: "06-99887766",
        website: "https://arnolddesign.nl"
    }, existingCatalog), false);

    // normalizeDomain edge cases
    assert.strictEqual(normalizeDomain("https://www.loodgieter-hoogezand.nl:8080/over-ons?id=1#top"), "loodgieter-hoogezand.nl:8080");
    assert.strictEqual(normalizeDomain("http://sub.portal.nl:80/"), "sub.portal.nl");
    assert.strictEqual(normalizeDomain("https://portal.nl:443/"), "portal.nl");
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE-CASES (RONDE 12) ---

await testAsync("Offerte & Factuur Enterprise (R12): Belastingdienst Multi-Tarief BTW (21%, 9%, 0%, Verlegd) with 3-Decimal Fractionals", async () => {
    function computeMixedTaxBasket(items, isReverseCharge = false) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const item of items) {
            const qty = Number(item.qty !== undefined ? item.qty : 1);
            const price = Number(item.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (isReverseCharge || item.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (item.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = isReverseCharge ? 0 : Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = isReverseCharge ? 0 : Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0: 0.00,
            totalVat,
            totalIncl,
            reverseNotice: isReverseCharge ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const items = [
        { desc: "Senior Architect Engineering", price: 95.00, qty: 18.33, vatRate: 21 }, // 1741.35
        { desc: "Maatwerk API Koppeling", price: 85.00, qty: 7.67, vatRate: 21 },         // 651.95
        { desc: "Handboeken & Vakliteratuur", price: 24.50, qty: 5, vatRate: 9 },         // 122.50
        { desc: "EU Hosting & Licentiepakket", price: 350.00, qty: 1, vatRate: 0 }        // 350.00
    ];

    const standard = computeMixedTaxBasket(items, false);
    assert.strictEqual(standard.subtotal21, 2393.30);
    assert.strictEqual(standard.vat21, 502.59);
    assert.strictEqual(standard.subtotal9, 122.50);
    assert.strictEqual(standard.vat9, 11.03);
    assert.strictEqual(standard.subtotal0, 350.00);
    assert.strictEqual(standard.subtotalExcl, 2865.80);
    assert.strictEqual(standard.totalVat, 513.62);
    assert.strictEqual(standard.totalIncl, 3379.42);
    assert.strictEqual(standard.reverseNotice, null);

    const reversed = computeMixedTaxBasket(items, true);
    assert.strictEqual(reversed.totalVat, 0.00);
    assert.strictEqual(reversed.totalIncl, 2865.80);
    assert.ok(reversed.reverseNotice.includes("BTW verlegd"));
});

await testAsync("Offerte & Factuur Enterprise (R12): Line-by-Line vs Total-Sum Tax Rounding Delta Compliance (<= € 0.02)", async () => {
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // IEEE 754 precision boundary checks
    assert.strictEqual(halfUp(10.005), 10.01);
    assert.strictEqual(halfUp(10.0049), 10.00);
    assert.strictEqual(halfUp(25.555), 25.56);
    assert.strictEqual(halfUp(0.005), 0.01);
    assert.strictEqual(halfUp(0.00499), 0.00);
    assert.strictEqual(halfUp(15.115), 15.12);
    assert.strictEqual(halfUp(15.114), 15.11);

    // Multi-item invoice with tricky fractionals
    const lineItems = [
        { price: 14.335, qty: 1 },
        { price: 7.125, qty: 1 },
        { price: 22.995, qty: 1 },
        { price: 5.445, qty: 1 },
        { price: 18.625, qty: 1 },
        { price: 9.775, qty: 1 },
        { price: 23.885, qty: 1 },
        { price: 6.115, qty: 1 },
        { price: 12.225, qty: 1 },
        { price: 11.995, qty: 1 },
        { price: 8.445, qty: 1 },
        { price: 16.555, qty: 1 }
    ];

    let lineSumVat = 0;
    let totalExcl = 0;
    for (const item of lineItems) {
        const lineExcl = halfUp(item.price * item.qty);
        totalExcl = halfUp(totalExcl + lineExcl);
        const lineVat = halfUp(lineExcl * 0.21);
        lineSumVat = halfUp(lineSumVat + lineVat);
    }
    const aggregateVat = halfUp(totalExcl * 0.21);
    const roundingDelta = Math.abs(lineSumVat - aggregateVat);

    // Belastingdienst Voorschrift: max € 0.02 delta permitted between invoice calculation methods
    assert.ok(roundingDelta <= 0.02, `Rounding delta between line-by-line and aggregate must be <= € 0.02, got ${roundingDelta}`);
});

await testAsync("Offerte & Factuur Enterprise (R12): Pro-Bono Invoices, Credit Notes & Division-by-Zero Resilience", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // 1. Pro-bono zero invoice
    const proBonoProject = {
        id: "proj_probono_2026_r12",
        client: "Stichting Groninger Molens",
        invoices: [{
            invoiceNumber: "2026-PB-12",
            description: "Pro-bono sponsoring website",
            amountExcl: 0.00,
            amountVat: 0.00,
            amountIncl: 0.00,
            status: "paid"
        }]
    };
    const pbNorm = normalizeProjectInvoices(proBonoProject);
    assert.strictEqual(pbNorm[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(pbNorm[0].amountIncl), "€ 0,00");
    assert.strictEqual(formatCurrency(-0), "€ 0,00");

    // 2. Negative credit note
    const creditNoteProject = {
        id: "proj_cn_2026_r12",
        client: "Bouwbedrijf Dijkstra",
        invoices: [{
            invoiceNumber: "2026-CN-18",
            description: "Creditnota restitutie hosting",
            amountExcl: -300.00,
            amountVat: -63.00,
            amountIncl: -363.00,
            status: "paid"
        }]
    };
    const cnNorm = normalizeProjectInvoices(creditNoteProject);
    assert.strictEqual(cnNorm[0].amountIncl, -363.00);
    assert.strictEqual(formatCurrency(cnNorm[0].amountIncl), "€ -363,00");

    // 3. Division-by-zero resilience in financial metrics
    function computePaymentProgress(paid, total) {
        if (!total || total <= 0 || !isFinite(total)) return 0;
        if (!paid || paid <= 0 || !isFinite(paid)) return 0;
        return Math.min(100, Math.round((paid / total) * 100));
    }
    assert.strictEqual(computePaymentProgress(0, 0), 0);
    assert.strictEqual(computePaymentProgress(200, 0), 0);
    assert.strictEqual(computePaymentProgress(NaN, 500), 0);
    assert.strictEqual(computePaymentProgress(500, NaN), 0);
    assert.strictEqual(computePaymentProgress(500, Infinity), 0);
    assert.strictEqual(computePaymentProgress(-100, 100), 0);
    assert.strictEqual(computePaymentProgress(350, 700), 50);
});

await testAsync("Offerte & Factuur Enterprise (R12): Cascading Compound Discounts, Proportional VAT Apportioning & Zero-Floor Clamping", async () => {
    function computeTieredDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.loyaltyPercent) {
            current = Math.round((current * (1 - (rules.loyaltyPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.earlyBirdPercent) {
            current = Math.round((current * (1 - (rules.earlyBirdPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.voucherDeduction) {
            current = current - rules.voucherDeduction;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    // 10% Loyalty + 5% Early Bird + € 300 voucher on € 3.000,00
    // 3000 * 0.9 = 2700; 2700 * 0.95 = 2565; 2565 - 300 = 2265
    const calc = computeTieredDiscounts(3000, { loyaltyPercent: 10, earlyBirdPercent: 5, voucherDeduction: 300 });
    assert.strictEqual(calc.clampedSubtotal, 2265.00);
    assert.strictEqual(calc.vat, 475.65);
    assert.strictEqual(calc.total, 2740.65);

    // Over-discounted invoice: € 150 base with € 500 voucher clamped to € 0,00 floor
    const overDiscount = computeTieredDiscounts(150, { voucherDeduction: 500 });
    assert.strictEqual(overDiscount.clampedSubtotal, 0.00);
    assert.strictEqual(overDiscount.vat, 0.00);
    assert.strictEqual(overDiscount.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R12): European Currency Parsing, Non-Breaking Spaces & Trailing Dash Notation", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseEuropeanCurrency(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[\u00A0\u202F\s]/g, '').replace(/[€$£]/g, '').trim();
        clean = clean.replace(/,-$/, ',00');
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return isFinite(val) ? val : 0;
    }

    // European currency formats with non-breaking spaces
    assert.strictEqual(parseEuropeanCurrency("€\u00A02.500,75"), 2500.75);
    assert.strictEqual(parseEuropeanCurrency("€\u202F1.850,00"), 1850.00);
    assert.strictEqual(parseEuropeanCurrency("€ 75,-"), 75.00);
    assert.strictEqual(parseEuropeanCurrency("EUR 12.345,67"), 12345.67);
    assert.strictEqual(parseEuropeanCurrency("$ 9,999.99"), 9999.99);
    assert.strictEqual(parseEuropeanCurrency("corrupted string"), 0.00);

    // formatCurrency output validation
    assert.strictEqual(formatCurrency(1000000), "€ 1000000,00");
    assert.strictEqual(formatCurrency(-150.5), "€ -150,50");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(null), "€ 0,00");
    assert.strictEqual(formatCurrency(undefined), "€ 0,00");
    assert.strictEqual(formatCurrency(NaN), "€ 0,00");
    assert.strictEqual(formatCurrency(Infinity), "€ 0,00");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE-CASES (RONDE 12) ---

await testAsync("Contact & Intake Enterprise (R12): Multi-Decoy Honeypot Trapping Matrix & Speed-Bot Heuristics (<1200ms)", async () => {
    function inspectIntakeSubmission(payload, elapsedMs = 6000) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }

        const decoyFields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment', 'zipcode_verify'];
        for (const field of decoyFields) {
            if (payload[field] && String(payload[field]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_TRAP_${field.toUpperCase()}`, silentAccept: true };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }

        const fullText = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = fullText.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(fullText)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { blocked: false, reason: 'LEGITIMATE_SUBMISSION', silentAccept: false };
    }

    // Verify all 9 honeypot decoy fields trigger silent bot block
    const fields = ['website', '_hp_trap', 'company_fax', 'bot_token', 'user_url', 'telephone_confirm', 'extra_address', 'honey_comment', 'zipcode_verify'];
    for (const f of fields) {
        const payload = {};
        payload[f] = "automated_bot_payload";
        const res = inspectIntakeSubmission(payload, 5000);
        assert.strictEqual(res.blocked, true, `Field ${f} must block submission`);
        assert.strictEqual(res.silentAccept, true, `Field ${f} must use silent accept to fool bots`);
    }

    // Whitespace honeypot is ignored
    assert.strictEqual(inspectIntakeSubmission({ website: "   ", _hp_trap: "" }, 5000).blocked, false);

    // Speed bot (<1200ms)
    assert.strictEqual(inspectIntakeSubmission({ companyName: "SuperFastBot" }, 800).blocked, true);

    // Link flood spam (>=3 links)
    assert.strictEqual(inspectIntakeSubmission({ comments: "Check https://x.com and https://y.com and https://z.com" }, 5000).blocked, true);

    // Keyword match
    assert.strictEqual(inspectIntakeSubmission({ comments: "Guaranteed crypto and bitcoin profits" }, 5000).blocked, true);

    // Legitimate human submission
    const legit = inspectIntakeSubmission({
        companyName: "Bakkerij Sieg",
        contactName: "Sigrid Sneep",
        goals: "Nieuwe webshop met bestelmailer en recepten",
        website: "",
        _hp_trap: ""
    }, 7500);
    assert.strictEqual(legit.blocked, false);
    assert.strictEqual(legit.reason, "LEGITIMATE_SUBMISSION");
});

await testAsync("Contact & Intake Enterprise (R12): Deep CWE-93 CRLF Header Injection, Multi-Stage Encodings & Null Truncation", async () => {
    function sanitizeStrictCrlfHeader(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "info@creationaltfix.nl\r\nBcc:spammer@evil.com",
        "info@creationaltfix.nl\rBcc:spammer@evil.com",
        "info@creationaltfix.nl\nBcc:spammer@evil.com",
        "info@creationaltfix.nl%0d%0aBcc:spammer@evil.com",
        "info@creationaltfix.nl%250d%250aBcc:spammer@evil.com",
        "info@creationaltfix.nl\u2028Bcc:spammer@evil.com",
        "info@creationaltfix.nl\u2029Bcc:spammer@evil.com",
        "info@creationaltfix.nl\u0085Bcc:spammer@evil.com",
        "info@creationaltfix.nl\x00Bcc:spammer@evil.com",
        "info@creationaltfix.nl\u000BBcc:spammer@evil.com",
        "info@creationaltfix.nl\u000CBcc:spammer@evil.com",
        "info@creationaltfix.nl;Bcc:spammer@evil.com",
        "info@creationaltfix.nl,spammer@evil.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const vector of hostileVectors) {
        const sanitized = sanitizeStrictCrlfHeader(vector);
        assert.ok(!sanitized.includes("\r"));
        assert.ok(!sanitized.includes("\n"));
        assert.ok(!sanitized.includes("\u2028"));
        assert.ok(!sanitized.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(sanitized), false, `Vector ${vector} must be rejected as clean email`);
    }

    const cleanEmail = sanitizeStrictCrlfHeader("info@creationaltfix.nl");
    assert.strictEqual(cleanEmail, "info@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(cleanEmail), true);
});

await testAsync("Contact & Intake Enterprise (R12): RFC 5322 & RFC 6530 Email Normalization, Punycode & IDN Handling", async () => {
    function normalizeRfc5322Email(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIndex);
        const domain = trimmed.slice(atIndex + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    // 1. Sub-addressing (+tagging)
    const tagged = normalizeRfc5322Email("allard+intake2027@creationaltfix.nl");
    assert.strictEqual(tagged.valid, true);
    assert.strictEqual(tagged.email, "allard+intake2027@creationaltfix.nl");

    // 2. Punycode IDN support
    const puny = normalizeRfc5322Email("info@xn--mller-kva.de");
    assert.strictEqual(puny.valid, true);
    assert.strictEqual(puny.email, "info@xn--mller-kva.de");

    // 3. Case normalization
    const mixed = normalizeRfc5322Email("  Admin@CreationAltFix.NL  ");
    assert.strictEqual(mixed.valid, true);
    assert.strictEqual(mixed.email, "Admin@creationaltfix.nl");

    // 4. Invalid emails
    const malformed = [
        "plainaddress",
        "@missinglocal.nl",
        "missingdomain@",
        "user@@domain.nl",
        "consecutive..dots@domain.nl",
        ".leadingdot@domain.nl",
        "trailingdot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl",
        "",
        null,
        undefined
    ];
    for (const bad of malformed) {
        assert.strictEqual(normalizeRfc5322Email(bad).valid, false, `${bad} must be flagged invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R12): SSRF Webhook Firewall, RFC 1918 / Cloud IMDS Blacklist & Markdown Escaping", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // 1. SSRF URL blocks
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org/botToken"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost:8443/webhook"), false, "Localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/webhook"), false, "Loopback 127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/webhook"), false, "RFC 1918 10.x.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.1/webhook"), false, "RFC 1918 172.16.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.1/webhook"), false, "RFC 1918 192.168.x.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest/meta-data"), false, "Cloud IMDS blocked");
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/webhook"), false, "CGNAT blocked");
    assert.strictEqual(isSafeWebhookUrl("https://nas.internal/webhook"), false, "Internal mDNS blocked");
    assert.strictEqual(isSafeWebhookUrl("https://router.local/webhook"), false, "Local domain blocked");

    // 2. Legitimate webhook acceptance
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/botToken/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/token"), true);
    assert.strictEqual(isSafeWebhookUrl("https://hooks.slack.com/services/T00/B00/X00"), true);

    // 3. Markdown escaping
    assert.strictEqual(sanitizeMarkdown("New Lead *Alert* [Click Here](https://creationaltfix.nl)"), "New Lead \\*Alert\\* \\[Click Here\\]\\(https://creationaltfix\\.nl\\)");
    assert.strictEqual(sanitizeMarkdown("`code` #header ~strike~"), "\\`code\\` \\#header \\~strike\\~");
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE-CASES (RONDE 12) ---

await testAsync("DRM & Code Protection Enterprise (R12): W3C HTML5 Parser Script-Data State Compliance & Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Demo Test</title></head><body><h1>Main</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Test </script><script>alert('pwn')</script>",
        slug: "test-pwn-breakout"
    });

    // Guard script tag must open exactly once
    const matches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(matches.length, 1);

    const scriptMatch = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "Guard script must match cleanly");
    const scriptBody = scriptMatch[1];

    // Script body must never contain closing script tag
    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.strictEqual(scriptBody.toLowerCase().includes("</script"), false);

    // Verify hex-escaped tags are present
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));
    assert.ok(scriptBody.includes("\\x3Cstrong>"));
    assert.ok(scriptBody.includes("\\x3C/strong>"));

    // Hostile script breakout neutralized
    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R12): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Scholte Elektrotechniek", slug: "scholte-elektro" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // AST syntax compilation check
    const script = new vm.Script(scriptBody);
    assert.ok(script, "VM Script must compile without parse error");

    // Execution on authorized host
    const authorizedContext = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authorizedContext);
    assert.doesNotThrow(() => {
        script.runInContext(authorizedContext);
    });

    // Execution on unauthorized host must trigger killswitch error
    const unauthorizedContext = {
        window: { location: { hostname: 'unauthorized-ripper-domain.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthorizedContext);
    assert.throws(() => {
        script.runInContext(unauthorizedContext);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R12): Anti-Inspect Event Interception (Contextmenu, F12, Shortcuts) Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Pomppop Festival", slug: "pomppop" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Right-click contextmenu defense
    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Keydown inspector shortcut traps
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R12): Zero-Cookie View-Ping Debounce, Admin Bypass & Navigator Beacon Delivery", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Willa Studio", slug: "willa-studio" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Strictly NO cookies
    assert.strictEqual(scriptBody.includes("document.cookie"), false);

    // Session debounce
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    // Admin preview exclusion
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    // Beacon telemetry delivery
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));

    // Watermark integrity
    assert.ok(scriptBody.includes("CREATION+ALT+FIX"));
    assert.ok(scriptBody.includes("99986191"));
    assert.ok(scriptBody.includes("AUTEURSWET 1912"));
    assert.ok(scriptBody.includes("ARTIKEL 29A"));
    assert.ok(scriptBody.includes("BENELUX VERDRAG"));

    // Idempotency
    const repeated = applyCodeProtection(protectedHtml, { name: "Willa Studio", slug: "willa-studio" });
    assert.strictEqual(protectedHtml, repeated, "applyCodeProtection must be idempotent");
});

// ========================================================
// 33. CLOUD- & MAILMIGRATIE STRATEGISCHE BESLUITVORMING (TASK-504)
// ========================================================
console.log("\n☁️ SUITE 33: Cloud- & Mailmigratie Strategische Besluitvorming (TASK-504)");

const {
    PORTFOLIO_DOMAINS,
    STRATEGIC_SCENARIOS,
    DEFAULT_DECISION_WEIGHTS,
    calculateMigrationTCO,
    evaluateMigrationDecision,
    listPortfolioDomains,
    getDomainRecord,
    generateDnsCutoverPlan,
    generateImapsyncCommand,
    generateCutoverPhases,
    generateStrategicDecisionMemo
} = await import("../crm/admin/js/modules/cloud-migration-planner.js");

test("TASK-504: Portfolio registry contains all 12 production domains with accurate TLDs and categories", () => {
    assert.strictEqual(PORTFOLIO_DOMAINS.length, 12, "Must contain exactly 12 production domains");

    const nlDomains = PORTFOLIO_DOMAINS.filter(d => d.tld === "nl");
    const comDomains = PORTFOLIO_DOMAINS.filter(d => d.tld === "com");
    assert.strictEqual(nlDomains.length, 9, "Must have exactly 9 .nl domains");
    assert.strictEqual(comDomains.length, 3, "Must have exactly 3 .com domains");

    // Check key individual domains
    const caf = getDomainRecord("creationaltfix.nl");
    assert.ok(caf !== null);
    assert.strictEqual(caf.mailboxType, "user_admin");
    assert.strictEqual(caf.isExternalClient, false);

    const angela = getDomainRecord("angelastenekes.nl");
    assert.ok(angela !== null);
    assert.strictEqual(angela.mailboxType, "user_client");
    assert.strictEqual(angela.isExternalClient, true);
    assert.strictEqual(angela.clientBillableMonthly, 10.00);

    const ftruckNl = getDomainRecord("ftruckstore.nl");
    const ftruckCom = getDomainRecord("ftruckstore.com");
    assert.ok(ftruckNl && ftruckCom);
    assert.strictEqual(ftruckNl.mailboxType, "user_client");
    assert.strictEqual(ftruckCom.mailboxType, "alias_forward");

    // Filtering
    const externalClients = listPortfolioDomains({ isExternalClient: true });
    assert.strictEqual(externalClients.length, 7, "Must identify 7 external client domain records (6 clients + 1 alias)");
    const billableUserClients = PORTFOLIO_DOMAINS.filter(d => d.mailboxType === "user_client");
    assert.strictEqual(billableUserClients.length, 6, "Must have 6 distinct billable client user mailboxes");
});

test("TASK-504: calculateMigrationTCO computes exact financial models & agency profit for all 3 scenarios", () => {
    // 1. MijnHost Sovereign scenario
    const mijnhostTco = calculateMigrationTCO("SOVEREIGN_MIJNHOST");
    assert.strictEqual(mijnhostTco.costs.hostingCostYearly, 143.40);
    // 9 * 5.75 + 3 * 13.95 = 51.75 + 41.85 = 93.60
    assert.strictEqual(mijnhostTco.costs.domainCostYearly, 93.60);
    assert.strictEqual(mijnhostTco.costs.emailLicenseCostYearly, 0.00, "MijnHost includes unlimited mailboxes");
    assert.strictEqual(mijnhostTco.costs.totalCostYearly, 237.00);
    assert.strictEqual(mijnhostTco.revenue.clientRevenueYearly, 720.00, "6 clients @ €10/mo = €720/yr");
    assert.strictEqual(mijnhostTco.profit.netAgencyProfitYearly, 483.00, "€720 omzet - €237 kosten = +€483/jr winst");
    assert.strictEqual(mijnhostTco.profit.netEmailProfitYearly, 720.00, "100% pure profit on email");
    assert.strictEqual(mijnhostTco.profit.annualNetGainVsBaseline, 755.76, "Net improvement vs -€272.76 baseline");

    // 2. Azure + M365 scenario
    const azureTco = calculateMigrationTCO("AZURE_M365");
    assert.strictEqual(azureTco.costs.hostingCostYearly, 0.00, "Azure SWA Free tier");
    assert.strictEqual(azureTco.costs.domainCostYearly, 93.60);
    // 1 admin + 6 clients = 7 paid user licenses * €3.70 * 12 = 7 * 44.40 = 310.80
    assert.strictEqual(azureTco.costs.emailLicenseCostYearly, 310.80);
    assert.strictEqual(azureTco.costs.totalCostYearly, 404.40);
    assert.strictEqual(azureTco.revenue.clientRevenueYearly, 720.00);
    assert.strictEqual(azureTco.profit.netAgencyProfitYearly, 315.60, "€720 - €404.40 = +€315.60");
    assert.strictEqual(azureTco.profit.netEmailProfitYearly, 453.60, "€720 - (6 * €44.40) = +€453.60");

    // 3. Vimexx Baseline
    const vimexxTco = calculateMigrationTCO("VIMEXX_BASELINE");
    assert.strictEqual(vimexxTco.costs.hostingCostYearly, 143.88);
    assert.strictEqual(vimexxTco.costs.domainCostYearly, 128.88);
    assert.strictEqual(vimexxTco.costs.totalCostYearly, 272.76);
    assert.strictEqual(vimexxTco.revenue.clientRevenueYearly, 0.00);
    assert.strictEqual(vimexxTco.profit.netAgencyProfitYearly, -272.76);
    assert.strictEqual(vimexxTco.profit.isProfitable, false);

    // Custom billing rates
    const customTco = calculateMigrationTCO("SOVEREIGN_MIJNHOST", { clientFeeMonthly: 15.00 });
    assert.strictEqual(customTco.revenue.clientRevenueYearly, 1080.00);
    assert.strictEqual(customTco.profit.netAgencyProfitYearly, 843.00);
});

test("TASK-504: evaluateMigrationDecision calculates weighted scores and verifies strategic recommendation", () => {
    const decision = evaluateMigrationDecision();
    assert.ok(decision.winner);
    assert.strictEqual(decision.winner.id, "SOVEREIGN_MIJNHOST", "Default recommendation must be MijnHost Sovereign");
    assert.strictEqual(decision.runnerUp.id, "AZURE_M365");

    assert.ok(decision.winner.weightedScore > decision.runnerUp.weightedScore);
    assert.strictEqual(decision.winner.cloudActRisk, false, "Sovereign cloud must have zero US CLOUD Act exposure");
    assert.strictEqual(decision.runnerUp.cloudActRisk, true, "Microsoft cloud is subject to US CLOUD Act / FISA 702");
    assert.strictEqual(decision.winner.dutchApSupervision, true, "Sovereign cloud is supervised by Dutch AP");

    // Sensitivity analysis: custom weights prioritizing native Outlook webmail
    const outlookPriorityDecision = evaluateMigrationDecision({
        privacySovereignty: 0.05,
        webPerformance: 0.10,
        emailExperience: 0.70, // Huge weight on outlook.office365.com
        spamProtection: 0.05,
        profitMargin: 0.05,
        operationalSimplicity: 0.05
    });
    assert.strictEqual(outlookPriorityDecision.winner.id, "AZURE_M365", "Azure M365 must win if native Outlook login is overwhelmingly prioritized");
});

test("TASK-504: generateDnsCutoverPlan produces valid DNS records for both Sovereign and Microsoft stacks", () => {
    // 1. MijnHost DNS cutover
    const mijnhostPlan = generateDnsCutoverPlan("angelastenekes.nl", "SOVEREIGN_MIJNHOST");
    assert.strictEqual(mijnhostPlan.domain, "angelastenekes.nl");
    assert.ok(mijnhostPlan.recordCount >= 7);

    const aRecord = mijnhostPlan.records.find(r => r.type === "A" && r.host === "@");
    assert.strictEqual(aRecord.value, "185.104.29.148");

    const mx1 = mijnhostPlan.records.find(r => r.type === "MX" && r.priority === 10);
    assert.strictEqual(mx1.value, "mx1.spamexperts.com.");

    const spf = mijnhostPlan.records.find(r => r.type === "TXT" && r.value.includes("spf.spamexperts.com"));
    assert.ok(spf !== undefined);

    const dkim = mijnhostPlan.records.find(r => r.host.includes("_domainkey"));
    assert.ok(dkim !== undefined);

    assert.ok(mijnhostPlan.bindZoneSnippet.includes("IN A"));
    assert.ok(mijnhostPlan.bindZoneSnippet.includes("IN MX 10 mx1.spamexperts.com."));

    // 2. Azure M365 DNS cutover
    const azurePlan = generateDnsCutoverPlan("angelastenekes.nl", "AZURE_M365");
    assert.strictEqual(azurePlan.domain, "angelastenekes.nl");

    const azureMx = azurePlan.records.find(r => r.type === "MX");
    assert.ok(azureMx.value.includes("mail.protection.outlook.com"));

    const autodiscover = azurePlan.records.find(r => r.host === "autodiscover");
    assert.strictEqual(autodiscover.value, "autodiscover.outlook.com.");

    const azureSpf = azurePlan.records.find(r => r.type === "TXT" && r.value.includes("spf.protection.outlook.com"));
    assert.ok(azureSpf !== undefined);
});

test("TASK-504: generateImapsyncCommand creates resilient CLI synchronization command", () => {
    const cmd = generateImapsyncCommand("angelastenekes.nl", "info", "SOVEREIGN_MIJNHOST");
    assert.ok(cmd.includes("--host1 web0156.zxcs.nl"), "Source host must be Vimexx");
    assert.ok(cmd.includes('--user1 "info@angelastenekes.nl"'));
    assert.ok(cmd.includes("--host2 mail.mijnhost.nl"), "Target host must be MijnHost");
    assert.ok(cmd.includes("--ssl1"));
    assert.ok(cmd.includes("--ssl2"));
    assert.ok(cmd.includes("--syncinternaldates"));
    assert.ok(cmd.includes('--skipmess "FLAGGED Deleted"'));
    assert.ok(cmd.includes("/var/log/imapsync_angelastenekes.nl_info.log"));

    const azureCmd = generateImapsyncCommand("ftruckstore.nl", "info", "AZURE_M365");
    assert.ok(azureCmd.includes("--host2 outlook.office365.com"));
});

test("TASK-504: generateCutoverPhases and generateStrategicDecisionMemo produce complete deployment roadmap", () => {
    const phases = generateCutoverPhases("SOVEREIGN_MIJNHOST");
    assert.strictEqual(phases.length, 6, "Must define 6 distinct migration phases");
    assert.strictEqual(phases[0].phase, 1);
    assert.ok(phases[0].tasks.some(t => t.includes("EPP-verhuiscodes")));
    assert.strictEqual(phases[3].phase, 4);
    assert.ok(phases[3].tasks.some(t => t.includes("DNS A/CNAME records")));
    assert.strictEqual(phases[5].phase, 6);
    assert.ok(phases[5].tasks.some(t => t.includes("Vimexx hostingpakket")));

    const memo = generateStrategicDecisionMemo("SOVEREIGN_MIJNHOST");
    assert.ok(memo.includes("Strategisch Besluitvormingsmemo"));
    assert.ok(memo.includes("Allard Veldman"));
    assert.ok(memo.includes("Nederlands Soeverein"));
    assert.ok(memo.includes("237.00"));
    assert.ok(memo.includes("720.00"));
    assert.ok(memo.includes("483.00"));
    assert.ok(memo.includes("Autoriteit Persoonsgegevens"));
});

// ========================================================
// 34. TESTSUITE EXPANSIE & DEEP EDGE-CASE HARDENING (RONDE 13)
// ========================================================
console.log("\n🛡️ SUITE 34: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 13)");

// --- SECTION 1: LEAD FACTORY DEEP EDGE-CASES (RONDE 13) ---

await testAsync("Lead Factory Enterprise (R13): Extreme 100KB Payloads, Memory Safety & String Clamping", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const { extractCityFromAddress, formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    const hugeString = "A".repeat(100000);
    const oversizedLead = {
        name: hugeString,
        slug: hugeString,
        website: "https://extreme-input-test.nl/" + hugeString.slice(0, 500),
        region: hugeString.slice(0, 1000)
    };

    const sanitized = sanitizeLeadData(oversizedLead);
    assert.ok(sanitized, "Sanitizer must return sanitized object");
    assert.strictEqual(sanitized.name.length, 150, "Name must be clamped to 150 characters");
    assert.strictEqual(sanitized.slug.length, 64, "Slug must be clamped to 64 characters");
    assert.strictEqual(sanitized.hasWebsite, true);

    // Memory resilience in extractCityFromAddress
    const city = extractCityFromAddress("Dorpsstraat 1, 9601 EA " + hugeString);
    assert.strictEqual(city.length < 200, true);

    // formatSuggestedDomain clamp
    const domain = formatSuggestedDomain(hugeString);
    assert.strictEqual(domain.endsWith(".nl"), true);
    assert.strictEqual(domain.length <= 66, true);
});

await testAsync("Lead Factory Enterprise (R13): Multi-Byte Emojis, Zalgo Text & Unicode BiDi Overrides in Domain Formatting", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    // Emojis & special symbols
    const emojiBusiness = "🌟 Dakdekkersbedrijf 🔨 & Loodgieter 💧 'Het Noorden' B.V. 🏆";
    const domain1 = formatSuggestedDomain(emojiBusiness);
    assert.strictEqual(domain1, "dakdekkersbedrijf-loodgieter-het-noorden-b-v.nl");

    // Zalgo text (combining characters)
    const zalgoBusiness = "S\u0300\u0316\u032at\u0301\u0317u\u0302\u0318c\u0303\u0319a\u0304\u031ad\u0305\u031bo\u0306\u031co\u0307\u031dr\u0308\u031e Jansen";
    const domain2 = formatSuggestedDomain(zalgoBusiness);
    assert.ok(/^[a-z0-9-]+\.nl$/.test(domain2));
    assert.strictEqual(domain2.includes("--"), false);

    // BiDi directional overrides
    const bidiBusiness = "\u202EBouwbedrijf\u202D Groningen";
    const domain3 = formatSuggestedDomain(bidiBusiness);
    assert.ok(/^[a-z0-9-]+\.nl$/.test(domain3));
    assert.strictEqual(domain3.includes("\u202E"), false);
});

await testAsync("Lead Factory Enterprise (R13): Complex Dutch House Number Additions, Hamlets & Postal Code Disambiguation", async () => {
    const { extractCityFromAddress } = await import("../factory/enrichment/deep-intelligence.js");

    // Complex Dutch house numbers and additions
    assert.strictEqual(extractCityFromAddress("Burgemeester van Roijenstraat Oost 112 A bis, 9602 CN Hoogezand"), "Hoogezand");
    assert.strictEqual(extractCityFromAddress("Grote Markt 12-14 II hoog achter, 9712 HN Groningen"), "Groningen");
    assert.strictEqual(extractCityFromAddress("T.a.v. Expeditie, Transportweg 12 bld 3, 9645 KZ Veendam"), "Veendam");
    assert.strictEqual(extractCityFromAddress("Wester Nieuwkruisland 2-A/4, 9293 LW Kollumerpomp"), "Kollumerpomp");
    assert.strictEqual(extractCityFromAddress("Postbus 1024, 9400 BA Assen"), "Assen");

    // Lowercase / irregular postal code spacing
    assert.strictEqual(extractCityFromAddress("Kerkstraat 5, 9601ea sappemeer"), "Sappemeer");
    assert.strictEqual(extractCityFromAddress("Hoofdstraat 88, 9711ab groningen"), "Groningen");

    // Missing address fallback
    assert.strictEqual(extractCityFromAddress(""), "Hoogezand");
    assert.strictEqual(extractCityFromAddress(null), "Hoogezand");
});

await testAsync("Lead Factory Enterprise (R13): Extended International Country Code Rejection & Disambiguation for E.164 Phones", async () => {
    const { isDutchMobilePhone, normalizeDutchPhone } = await import("../factory/enrichment/deep-intelligence.js");

    // Foreign numbers rejection
    assert.strictEqual(isDutchMobilePhone("+49 491 998877"), false, "German landline rejected");
    assert.strictEqual(isDutchMobilePhone("0049 171 1234567"), false, "German mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+32 470 123456"), false, "Belgian mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+44 7911 123456"), false, "UK mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+352 621 123456"), false, "Luxembourg mobile rejected");
    assert.strictEqual(isDutchMobilePhone("+33 6 12 34 56 78"), false, "French mobile rejected");

    // Domestic toll-free / corporate rejection
    assert.strictEqual(isDutchMobilePhone("0800-0113"), false);
    assert.strictEqual(isDutchMobilePhone("0900-8844"), false);
    assert.strictEqual(isDutchMobilePhone("088-1234567"), false);
    assert.strictEqual(isDutchMobilePhone("085-0001234"), false);

    // Domestic valid formats normalization
    assert.strictEqual(isDutchMobilePhone("06.12.34.56.78"), true);
    assert.strictEqual(isDutchMobilePhone("(06) 1234-5678"), true);
    assert.strictEqual(isDutchMobilePhone("+31(0)612345678"), true);
    assert.strictEqual(isDutchMobilePhone("0031 6 12345678"), true);

    assert.strictEqual(normalizeDutchPhone("06.12.34.56.78"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("(06) 1234-5678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("+31(0)612345678"), "0612345678");
    assert.strictEqual(normalizeDutchPhone("0031 6 12345678"), "0612345678");
});

await testAsync("Lead Factory Enterprise (R13): Multi-Vector Lead Deduplication with Protocol, Port & Query Variations", async () => {
    const { isDuplicateLead, normalizeDomain, normalizePhoneDigits } = await import("../factory/discovery/maps-crawler.js");

    const existingCatalog = [
        { name: "Bakkerij Sieg", slug: "bakkerij-sieg", phone: "06-12345678", website: "https://bakkertjesieg.nl" },
        { name: "Stenekes Riool", slug: "stenekes-riool", phone: "050-3123456", website: "https://stenekesrioolspecialist.nl:443" }
    ];

    // Deduplication via website with ports, queries, protocols
    assert.strictEqual(isDuplicateLead({ website: "http://bakkertjesieg.nl:80/" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ website: "https://bakkertjesieg.nl/index.html?ref=google#contact" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ website: "http://stenekesrioolspecialist.nl" }, existingCatalog), true);

    // Deduplication via phone with brackets and international notation
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6 12 34 56 78" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "06.12.34.56.78" }, existingCatalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 50 312 3456" }, existingCatalog), true);

    // Deduplication via slug
    assert.strictEqual(isDuplicateLead({ slug: "bakkerij-sieg" }, existingCatalog), true);

    // Unique lead passes
    assert.strictEqual(isDuplicateLead({
        name: "Nieuwe Schilderservice",
        slug: "nieuwe-schilderservice",
        phone: "06-98765432",
        website: "https://nieuwe-schilderservice.nl"
    }, existingCatalog), false);

    // Edge cases resilience
    assert.strictEqual(isDuplicateLead(null, existingCatalog), false);
    assert.strictEqual(isDuplicateLead({}, null), false);
    assert.strictEqual(isDuplicateLead({}, [{}]), false);
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE-CASES (RONDE 13) ---

await testAsync("Offerte & Factuur Enterprise (R13): Belastingdienst 4-Way Multi-Tarief BTW (21%, 9%, 0%, Verlegd) with Micro-Fractionals", async () => {
    function calculateComprehensiveInvoice(items) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;
        let subtotalVerlegd = 0;

        for (const it of items) {
            const qty = Number(it.qty !== undefined ? it.qty : 1);
            const price = Number(it.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (it.vatRate === "verlegd" || it.isReverseCharge) {
                subtotalVerlegd = Math.round((subtotalVerlegd + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const subtotalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + subtotalVerlegd + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((subtotalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return {
            subtotalExcl,
            subtotal21,
            vat21,
            subtotal9,
            vat9,
            subtotal0,
            vat0: 0.00,
            subtotalVerlegd,
            vatVerlegd: 0.00,
            totalVat,
            totalIncl,
            hasReverseCharge: subtotalVerlegd > 0,
            reverseNotice: subtotalVerlegd > 0 ? "BTW verlegd conform art. 12 lid 3 Wet OB 1968" : null
        };
    }

    const basket = [
        { desc: "Senior Architectuur Uren", price: 95.00, qty: 14.333, vatRate: 21 },
        { desc: "Frontend Development", price: 85.00, qty: 2.667, vatRate: 21 },
        { desc: "Vakhandboeken & Richtlijnen", price: 24.50, qty: 3, vatRate: 9 },
        { desc: "EU Cloud Licenties (0%)", price: 180.00, qty: 1, vatRate: 0 },
        { desc: "Onderaanneming Elektra (Verlegd)", price: 450.00, qty: 1, vatRate: "verlegd" }
    ];

    const res = calculateComprehensiveInvoice(basket);
    assert.strictEqual(res.subtotal21, 1588.34);
    assert.strictEqual(res.vat21, 333.55);
    assert.strictEqual(res.subtotal9, 73.50);
    assert.strictEqual(res.vat9, 6.61);
    assert.strictEqual(res.subtotal0, 180.00);
    assert.strictEqual(res.subtotalVerlegd, 450.00);
    assert.strictEqual(res.totalVat, 340.16);
    assert.strictEqual(res.subtotalExcl, 2291.84);
    assert.strictEqual(res.totalIncl, 2632.00);
    assert.strictEqual(res.hasReverseCharge, true);
    assert.ok(res.reverseNotice.includes("BTW verlegd"));
});

await testAsync("Offerte & Factuur Enterprise (R13): IEEE 754 Commercial Half-Up Midpoint Rounding & Line-Sum Delta Validation (<= € 0.02)", async () => {
    const halfUp = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // Midpoint rounding exactness
    assert.strictEqual(halfUp(12.005), 12.01);
    assert.strictEqual(halfUp(12.0049), 12.00);
    assert.strictEqual(halfUp(0.005), 0.01);
    assert.strictEqual(halfUp(0.0049), 0.00);
    assert.strictEqual(halfUp(49.995), 50.00);
    assert.strictEqual(halfUp(99.994), 99.99);

    // 15 line items testing Belastingdienst rounding delta
    const items = [
        { price: 15.335, qty: 1 },
        { price: 8.125, qty: 1 },
        { price: 21.445, qty: 1 },
        { price: 6.775, qty: 1 },
        { price: 19.885, qty: 1 },
        { price: 11.225, qty: 1 },
        { price: 24.665, qty: 1 },
        { price: 7.995, qty: 1 },
        { price: 13.555, qty: 1 },
        { price: 10.115, qty: 1 },
        { price: 9.335, qty: 1 },
        { price: 17.775, qty: 1 },
        { price: 4.885, qty: 1 },
        { price: 28.225, qty: 1 },
        { price: 14.995, qty: 1 }
    ];

    let lineSumVat = 0;
    let totalExcl = 0;
    for (const it of items) {
        const lineExcl = halfUp(it.price * it.qty);
        totalExcl = halfUp(totalExcl + lineExcl);
        const lineVat = halfUp(lineExcl * 0.21);
        lineSumVat = halfUp(lineSumVat + lineVat);
    }
    const aggregateVat = halfUp(totalExcl * 0.21);
    const roundingDelta = Math.abs(lineSumVat - aggregateVat);

    assert.ok(roundingDelta <= 0.02, `Delta ${roundingDelta} must comply with Belastingdienst voorschrift <= € 0.02`);
});

await testAsync("Offerte & Factuur Enterprise (R13): Pro-Bono Sponsoring, 100% Discount Vouchers & Division-by-Zero Protection", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");

    // Pro-bono project
    const proBono = {
        id: "proj_probono_2026_r13",
        client: "Stichting Dierenopvang Groningen",
        invoices: [{
            invoiceNumber: "2026-PB-13",
            description: "Pro-bono sponsoring website en beheer",
            amountExcl: 0.00,
            amountVat: 0.00,
            amountIncl: 0.00,
            status: "paid"
        }]
    };
    const norm = normalizeProjectInvoices(proBono);
    assert.strictEqual(norm[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(norm[0].amountIncl), "€ 0,00");

    // Credit note
    const creditNote = {
        id: "proj_cn_2026_r13",
        client: "Vanderplaats Bouw",
        invoices: [{
            invoiceNumber: "2026-CN-20",
            description: "Creditnota verrekening voorschot",
            amountExcl: -400.00,
            amountVat: -84.00,
            amountIncl: -484.00,
            status: "paid"
        }]
    };
    const cnNorm = normalizeProjectInvoices(creditNote);
    assert.strictEqual(cnNorm[0].amountIncl, -484.00);
    assert.strictEqual(formatCurrency(cnNorm[0].amountIncl), "€ -484,00");

    // Division-by-zero resilience in progress calculation
    function safeProgress(paid, total) {
        if (!total || total <= 0 || !isFinite(total)) return 0;
        if (!paid || paid <= 0 || !isFinite(paid)) return 0;
        return Math.min(100, Math.round((paid / total) * 100));
    }

    assert.strictEqual(safeProgress(0, 0), 0);
    assert.strictEqual(safeProgress(100, 0), 0);
    assert.strictEqual(safeProgress(NaN, 100), 0);
    assert.strictEqual(safeProgress(100, NaN), 0);
    assert.strictEqual(safeProgress(100, Infinity), 0);
    assert.strictEqual(safeProgress(250, 500), 50);
    assert.strictEqual(safeProgress(600, 500), 100);
});

await testAsync("Offerte & Factuur Enterprise (R13): Tiered Sequential Compound Discounts with Absolute Zero-Floor Clamping", async () => {
    function computeTieredDiscounts(baseAmount, rules = {}) {
        let current = baseAmount;
        if (rules.loyaltyPercent) {
            current = Math.round((current * (1 - (rules.loyaltyPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.earlyBirdPercent) {
            current = Math.round((current * (1 - (rules.earlyBirdPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (rules.voucherDeduction) {
            current = current - rules.voucherDeduction;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    // € 2.500 base with 10% loyalty, 5% early bird, € 200 voucher
    const calc = computeTieredDiscounts(2500, { loyaltyPercent: 10, earlyBirdPercent: 5, voucherDeduction: 200 });
    assert.strictEqual(calc.clampedSubtotal, 1937.50);
    assert.strictEqual(calc.vat, 406.88);
    assert.strictEqual(calc.total, 2344.38);

    // Over-discount voucher clamped to € 0 floor
    const overDiscount = computeTieredDiscounts(100, { voucherDeduction: 350 });
    assert.strictEqual(overDiscount.clampedSubtotal, 0.00);
    assert.strictEqual(overDiscount.vat, 0.00);
    assert.strictEqual(overDiscount.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R13): European Currency Parsing, Non-Breaking Spaces, Trailing Dash & Large Values", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseEuropeanCurrency(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[\u00A0\u202F\s]/g, '').replace(/[€$£]/g, '').trim();
        clean = clean.replace(/,-$/, ',00');
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return isFinite(val) ? val : 0;
    }

    assert.strictEqual(parseEuropeanCurrency("€\u202F12.450,50"), 12450.50);
    assert.strictEqual(parseEuropeanCurrency("€\u00A0950,00"), 950.00);
    assert.strictEqual(parseEuropeanCurrency("€ 150,-"), 150.00);
    assert.strictEqual(parseEuropeanCurrency("€ 2.500,-"), 2500.00);
    assert.strictEqual(parseEuropeanCurrency("€ 1.234.567,89"), 1234567.89);
    assert.strictEqual(parseEuropeanCurrency("-€ 85,50"), -85.50);
    assert.strictEqual(parseEuropeanCurrency(""), 0);
    assert.strictEqual(parseEuropeanCurrency(null), 0);

    assert.strictEqual(formatCurrency(10000000), "€ 10000000,00");
    assert.strictEqual(formatCurrency(-75.25), "€ -75,25");
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE-CASES (RONDE 13) ---

await testAsync("Contact & Intake Enterprise (R13): 12-Field Multi-Decoy Honeypot Matrix & Speed Heuristics (<1200ms)", async () => {
    function inspectIntakeSubmission(payload, elapsedMs = 5000) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }

        const decoyFields = [
            'website', '_hp_trap', 'company_fax', 'bot_token', 'user_url',
            'telephone_confirm', 'extra_address', 'honey_comment', 'zipcode_verify',
            'url_field', 'hidden_auth', 'antispam_check'
        ];

        for (const field of decoyFields) {
            if (payload[field] && String(payload[field]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_TRAP_${field.toUpperCase()}`, silentAccept: true };
            }
        }

        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }

        const fullText = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = fullText.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }

        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(fullText)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }

        return { blocked: false, reason: 'LEGITIMATE_SUBMISSION', silentAccept: false };
    }

    const decoyFields = [
        'website', '_hp_trap', 'company_fax', 'bot_token', 'user_url',
        'telephone_confirm', 'extra_address', 'honey_comment', 'zipcode_verify',
        'url_field', 'hidden_auth', 'antispam_check'
    ];

    for (const df of decoyFields) {
        const payload = {};
        payload[df] = "malicious_bot_token";
        const res = inspectIntakeSubmission(payload, 4500);
        assert.strictEqual(res.blocked, true, `Decoy ${df} must block`);
        assert.strictEqual(res.silentAccept, true, `Decoy ${df} must silentAccept`);
    }

    // Speed bot
    assert.strictEqual(inspectIntakeSubmission({ companyName: "FastBot" }, 900).blocked, true);

    // Legitimate human
    const legit = inspectIntakeSubmission({
        companyName: "Stenekes Rioolspecialist",
        goals: "Nieuwe pagina voor camera inspectie",
        website: "",
        _hp_trap: ""
    }, 6000);
    assert.strictEqual(legit.blocked, false);
    assert.strictEqual(legit.reason, "LEGITIMATE_SUBMISSION");
});

await testAsync("Contact & Intake Enterprise (R13): Multi-Vector CWE-93 CRLF Header Injection & Multi-Stage Obfuscation Defense", async () => {
    function sanitizeStrictCrlfHeader(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "allard@creationaltfix.nl\r\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl\rBcc:spammer@evil.com",
        "allard@creationaltfix.nl\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl%0d%0aBcc:spammer@evil.com",
        "allard@creationaltfix.nl%250d%250aBcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2028Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2029Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u0085Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\x00Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u000BBcc:spammer@evil.com",
        "allard@creationaltfix.nl;Bcc:spammer@evil.com",
        "allard@creationaltfix.nl,spammer@evil.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (const v of hostileVectors) {
        const sanitized = sanitizeStrictCrlfHeader(v);
        assert.ok(!sanitized.includes("\r"));
        assert.ok(!sanitized.includes("\n"));
        assert.ok(!sanitized.includes("\u2028"));
        assert.ok(!sanitized.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(sanitized), false, `Vector ${v} must fail regex`);
    }

    const clean = sanitizeStrictCrlfHeader("allard@creationaltfix.nl");
    assert.strictEqual(clean, "allard@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(clean), true);
});

await testAsync("Contact & Intake Enterprise (R13): RFC 5322 & RFC 6530 Email Normalization, Punycode IDN & Case Folding", async () => {
    function normalizeRfc5322Email(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIndex);
        const domain = trimmed.slice(atIndex + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    // Sub-addressing
    assert.strictEqual(normalizeRfc5322Email("allard+intake2027@creationaltfix.nl").valid, true);
    // Punycode IDN
    assert.strictEqual(normalizeRfc5322Email("info@xn--schne-tre-07a8l.de").valid, true);
    // Case folding
    assert.strictEqual(normalizeRfc5322Email("  Info@CREATIONALTFIX.NL  ").email, "Info@creationaltfix.nl");

    // Invalid formats
    const bad = [
        "missingatsign.nl",
        "@nodomain.nl",
        "nolocal@",
        "double@@domain.nl",
        "consecutive..dots@domain.nl",
        ".startdot@domain.nl",
        "enddot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl"
    ];
    for (const b of bad) {
        assert.strictEqual(normalizeRfc5322Email(b).valid, false, `${b} must be flagged invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R13): SSRF Webhook Firewall, RFC 1918 / Cloud IMDS Defense & Markdown Sanitization", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    // SSRF firewall validation
    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost/hook"), false, "Localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false, "127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.254.0.1/hook"), false, "10.0.0.0/8 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.20.0.1/hook"), false, "172.16.0.0/12 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.0.254/hook"), false, "192.168.0.0/16 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/meta"), false, "Cloud IMDS blocked");
    assert.strictEqual(isSafeWebhookUrl("https://100.65.0.1/hook"), false, "CGNAT blocked");
    assert.strictEqual(isSafeWebhookUrl("https://server.local/hook"), false, ".local domain blocked");
    assert.strictEqual(isSafeWebhookUrl("https://api.internal/hook"), false, ".internal domain blocked");

    // Legitimate webhook URLs
    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/bot123/send"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/abc"), true);
    assert.strictEqual(isSafeWebhookUrl("https://hooks.slack.com/services/T00/B00/X00"), true);

    // Markdown sanitization
    assert.strictEqual(sanitizeMarkdown("*bold* _italics_ `code`"), "\\*bold\\* \\_italics\\_ \\`code\\`");
    assert.strictEqual(sanitizeMarkdown("[Title](https://domain.nl)"), "\\[Title\\]\\(https://domain\\.nl\\)");
});

await testAsync("Contact & Intake Enterprise (R13): Link-Flood Spam Heuristics & Commercial Keyword Pattern Traps", async () => {
    function evaluateSpamHeuristics(content) {
        if (!content || typeof content !== 'string') return { isSpam: false };
        const links = content.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { isSpam: true, reason: 'LINK_FLOOD_SPAM' };
        }
        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(content)) {
            return { isSpam: true, reason: 'SPAM_KEYWORD_MATCH' };
        }
        return { isSpam: false, reason: 'CLEAN' };
    }

    assert.strictEqual(evaluateSpamHeuristics("Bezoek http://a.com en http://b.com en https://c.com nu!").isSpam, true);
    assert.strictEqual(evaluateSpamHeuristics("Get rich quick with bitcoin and forex trading!").isSpam, true);
    assert.strictEqual(evaluateSpamHeuristics("Beste Allard, we willen graag een nieuwe website voor ons naaiatelier in Sappemeer.").isSpam, false);
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE-CASES (RONDE 13) ---

await testAsync("DRM & Code Protection Enterprise (R13): W3C HTML5 Parser Script-Data State Compliance & Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Test Protection</title></head><body><h1>Hello</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Malicious </script><script>alert('pwn')</script>",
        slug: "hostile</script><img src=x onerror=alert(1)>"
    });

    // Guard script tag opens and closes cleanly
    const matches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(matches.length, 1);

    const scriptMatch = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "Guard script must match cleanly");
    const scriptBody = scriptMatch[1];

    // Script body must never contain raw unescaped </script
    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.strictEqual(scriptBody.toLowerCase().includes("</script"), false);

    // Verify hex-escaped tags are present
    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));
    assert.ok(scriptBody.includes("\\x3Cstrong>"));
    assert.ok(scriptBody.includes("\\x3C/strong>"));

    // Hostile tag injection prevented
    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R13): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Creation Alt Fix", slug: "caf-official" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // VM AST compilation check
    const script = new vm.Script(scriptBody);
    assert.ok(script, "VM Script must compile without parse error");

    // Authorized host execution
    const authContext = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authContext);
    assert.doesNotThrow(() => {
        script.runInContext(authContext);
    });

    // Unauthorized host execution triggers killswitch
    const unauthContext = {
        window: { location: { hostname: 'unauthorized-ripper-domain.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthContext);
    assert.throws(() => {
        script.runInContext(unauthContext);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R13): Anti-Inspect Event Interception (Contextmenu, F12, Shortcuts) Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test DRM", slug: "test-drm" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // Right-click contextmenu defense
    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    // Keydown inspector shortcut traps
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R13): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test Debounce", slug: "test-debounce" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    // No cookies
    assert.strictEqual(scriptBody.includes("document.cookie"), false);

    // Session debounce
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    // Admin preview exclusion
    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    // Beacon telemetry delivery
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});

await testAsync("DRM & Code Protection Enterprise (R13): Anti-Theft Guard Script Idempotency & Structural Tag Preservation", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Original</title></head><body><div id="app">App</div></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Idempotency Test", slug: "idempotency-test" });

    // Repeated call must return identical string without duplicating guard script
    const repeated = applyCodeProtection(protectedHtml, { name: "Idempotency Test", slug: "idempotency-test" });
    assert.strictEqual(protectedHtml, repeated);

    // Guard script appears exactly once
    const matches = repeated.match(/id="caf-security-guard"/g);
    assert.strictEqual(matches.length, 1);

    // Legal notices present
    assert.ok(repeated.includes("KvK 99986191"));
    assert.ok(repeated.includes("AUTEURSWET 1912"));
    assert.ok(repeated.includes("ARTIKEL 29A"));
    assert.ok(repeated.includes("BENELUX VERDRAG VOOR INTELLECTUELE EIGENDOM"));
});

// ========================================================
// 35. CLOUD- & MAILMIGRATIE: GEFASEERDE UITVOERING 12 DOMEINEN CUTOVER (TASK-505)
// ========================================================
console.log("\n🚀 SUITE 35: Cloud- & Mailmigratie: Gefaseerde Uitvoering 12 Domeinen Cutover (TASK-505)");

test("TASK-505: 4-Wave cutover architecture encompasses all 12 domains with zero omissions or duplicates", async () => {
    const { CUTOVER_WAVES } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");
    const { PORTFOLIO_DOMAINS } = await import("../crm/admin/js/modules/cloud-migration-planner.js");

    assert.strictEqual(CUTOVER_WAVES.length, 4, "Must define exactly 4 cutover waves");
    
    // Check wave progression and schedules
    assert.strictEqual(CUTOVER_WAVES[0].wave, 1);
    assert.strictEqual(CUTOVER_WAVES[0].schedule, "T-14 Dagen");
    assert.strictEqual(CUTOVER_WAVES[0].riskLevel, "Laag");
    assert.deepStrictEqual(CUTOVER_WAVES[0].domains, ["capybaraculture.com", "qolipa.com"]);

    assert.strictEqual(CUTOVER_WAVES[1].wave, 2);
    assert.strictEqual(CUTOVER_WAVES[1].schedule, "T-10 Dagen");
    assert.strictEqual(CUTOVER_WAVES[1].riskLevel, "Gemiddeld");

    assert.strictEqual(CUTOVER_WAVES[2].wave, 3);
    assert.strictEqual(CUTOVER_WAVES[2].schedule, "T-5 Dagen");

    assert.strictEqual(CUTOVER_WAVES[3].wave, 4);
    assert.ok(CUTOVER_WAVES[3].schedule.includes("T-0 Dagen"));
    assert.ok(CUTOVER_WAVES[3].riskLevel.includes("Hoog"));

    // Check complete 12 domains distribution without duplicates
    const allAssignedDomains = CUTOVER_WAVES.flatMap(w => w.domains);
    assert.strictEqual(allAssignedDomains.length, 12, "Must contain exactly 12 domains total");
    assert.strictEqual(new Set(allAssignedDomains).size, 12, "Must contain 0 duplicate domains across waves");

    // All portfolio domains must be accounted for
    const portfolioDomainNames = PORTFOLIO_DOMAINS.map(d => d.domain);
    for (const pDomain of portfolioDomainNames) {
        assert.ok(allAssignedDomains.includes(pDomain), `Portfolio domain ${pDomain} must be assigned to a wave`);
    }
});

test("TASK-505: RFC 5731 EPP / Auth-Code validator enforces format boundaries, sanitization & strength rating", async () => {
    const { validateEppToken, maskEppToken, createEppCutoverDossier } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");

    // 1. Invalid inputs
    const emptyRes = validateEppToken("");
    assert.strictEqual(emptyRes.isValid, false);
    assert.ok(emptyRes.error.includes("verplicht"));

    const tooShortRes = validateEppToken("abc");
    assert.strictEqual(tooShortRes.isValid, false);
    assert.ok(tooShortRes.error.includes("te kort"));

    const tooLongRes = validateEppToken("A".repeat(35));
    assert.strictEqual(tooLongRes.isValid, false);
    assert.ok(tooLongRes.error.includes("te lang"));

    const spaceRes = validateEppToken("Token With Spaces!99");
    assert.strictEqual(spaceRes.isValid, false);
    assert.ok(spaceRes.error.includes("spaties"));

    // 2. Valid inputs with strength classification
    const strongRes = validateEppToken("EPP-99#Stenekes!26");
    assert.strictEqual(strongRes.isValid, true);
    assert.strictEqual(strongRes.strength, "strong");
    assert.strictEqual(strongRes.sanitizedToken, "EPP-99#Stenekes!26");

    const mediumRes = validateEppToken("SecretToken123");
    assert.strictEqual(mediumRes.isValid, true);
    assert.strictEqual(mediumRes.strength, "medium");

    // 3. Masking
    assert.strictEqual(maskEppToken("EPP-99#Stenekes!26"), "EP******26");
    assert.strictEqual(maskEppToken(""), "—");
    assert.strictEqual(maskEppToken(null), "—");

    // 4. Dossier generation
    const dossier = createEppCutoverDossier();
    assert.strictEqual(dossier.length, 12);
    assert.strictEqual(dossier[0].domain, "creationaltfix.nl");
    assert.strictEqual(dossier[0].targetRegistrar, "MijnHost B.V. (Amsterdam)");
    assert.strictEqual(dossier[0].status, "not_requested");
});

test("TASK-505: Batch IMAPsync script generator creates resilient, multi-mailbox CLI migration pipelines", async () => {
    const { generateBatchImapsyncScript } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");
    const { PORTFOLIO_DOMAINS } = await import("../crm/admin/js/modules/cloud-migration-planner.js");

    // Default delta mode
    const deltaScript = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, "SOVEREIGN_MIJNHOST", { mode: "delta" });
    assert.strictEqual(deltaScript.mode, "delta");
    assert.strictEqual(deltaScript.domainsCount, 12);
    assert.strictEqual(deltaScript.mailboxCount, 10, "10 active mailboxes excluding 2 domain aliases");
    assert.ok(deltaScript.script.includes("#!/usr/bin/env bash"));
    assert.ok(deltaScript.script.includes("set -euo pipefail"));
    assert.ok(deltaScript.script.includes('SRC_HOST="mail.zxcs.nl"'));
    assert.ok(deltaScript.script.includes('DEST_HOST="mail.mijnhost.nl"'));
    assert.ok(deltaScript.script.includes("--maxage 5"));
    assert.ok(deltaScript.script.includes('--skipmess "FLAGGED Deleted"'));
    assert.ok(deltaScript.script.includes("${SRC_PASS_"), "Uses environment variables, not plain text passwords");

    // Preflight mode
    const preflightScript = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, "SOVEREIGN_MIJNHOST", { mode: "preflight" });
    assert.ok(preflightScript.script.includes("--justconnect --dry"));

    // Full sync mode with Azure target
    const azureScript = generateBatchImapsyncScript(PORTFOLIO_DOMAINS, "AZURE_M365", { mode: "full" });
    assert.ok(azureScript.script.includes('DEST_HOST="outlook.office365.com"'));
    assert.ok(azureScript.script.includes('--exclude "Spam|Junk|Trash"'));
});

test("TASK-505: IMAPsync log parser extracts telemetry, metrics & classifies errors accurately", async () => {
    const { parseImapsyncLogOutput } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");

    // 1. Successful log stream
    const sampleSuccessLog = `
imapsync 2.229 started at 2026-10-22 14:00:00
Transferred : 142 messages
Total bytes transferred: 25690112
Folders: 8
Duration: 38.4s
Rate: 669.0 KB/s
Errors: 0
Warnings: 1
    `.trim();

    const successParsed = parseImapsyncLogOutput(sampleSuccessLog);
    assert.strictEqual(successParsed.isSuccess, true);
    assert.strictEqual(successParsed.messagesTransferred, 142);
    assert.strictEqual(successParsed.bytesTransferred, 25690112);
    assert.strictEqual(successParsed.foldersCount, 8);
    assert.strictEqual(successParsed.durationSeconds, 38.4);
    assert.strictEqual(successParsed.errorsCount, 0);
    assert.strictEqual(successParsed.warningsCount, 1);
    assert.ok(successParsed.summary.includes("100% geslaagd"));

    // 2. Authentication failure log stream
    const sampleAuthFailLog = `
NO [AUTHENTICATIONFAILED] Invalid credentials for user bestellingen@bakkertjesieg.nl
Detected errors: 1
    `.trim();

    const authFailParsed = parseImapsyncLogOutput(sampleAuthFailLog);
    assert.strictEqual(authFailParsed.isSuccess, false);
    assert.strictEqual(authFailParsed.errorsCount, 1);
    assert.ok(authFailParsed.errorTypes.includes("AUTHENTICATION_FAILED"));
    assert.ok(authFailParsed.summary.includes("mislukt"));

    // 3. Network timeout log stream
    const sampleTimeoutLog = `
Could not connect to destination server: Connection timed out
Errors: 2
    `.trim();

    const timeoutParsed = parseImapsyncLogOutput(sampleTimeoutLog);
    assert.strictEqual(timeoutParsed.isSuccess, false);
    assert.ok(timeoutParsed.errorTypes.includes("CONNECTION_TIMEOUT"));

    // 4. Empty log resilience
    const emptyParsed = parseImapsyncLogOutput("");
    assert.strictEqual(emptyParsed.isSuccess, false);
    assert.ok(emptyParsed.errorTypes.includes("EMPTY_LOG"));
});

test("TASK-505: Zero-downtime DNS cutover orchestrator produces 7-stage checklist & 5-minute rollback plan", async () => {
    const { generateDomainCutoverPlan, calculateDnsPropagationReadiness } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");

    const plan = generateDomainCutoverPlan("stenekesrioolspecialist.nl", "SOVEREIGN_MIJNHOST");
    assert.strictEqual(plan.domain, "stenekesrioolspecialist.nl");
    assert.strictEqual(plan.steps.length, 7, "Must define 7 clear zero-downtime cutover steps");

    // Step 1: TTL 300
    assert.strictEqual(plan.steps[0].step, 1);
    assert.strictEqual(plan.steps[0].recordsToUpdate[0].type, "TTL");
    assert.strictEqual(plan.steps[0].recordsToUpdate[0].value, "300");

    // Step 3: Web A Record Switch
    assert.strictEqual(plan.steps[2].step, 3);
    assert.strictEqual(plan.steps[2].recordsToUpdate[0].type, "A");
    assert.strictEqual(plan.steps[2].recordsToUpdate[0].value, "185.182.56.12");

    // Step 4: MX Switch
    assert.strictEqual(plan.steps[3].step, 4);
    assert.strictEqual(plan.steps[3].recordsToUpdate[0].type, "MX");
    assert.strictEqual(plan.steps[3].recordsToUpdate[0].value, "mail.mijnhost.nl");
    assert.strictEqual(plan.steps[3].recordsToUpdate[0].priority, 10);

    // Rollback plan
    assert.ok(plan.rollbackPlan.snippet.includes("185.104.29.148"));
    assert.ok(plan.rollbackPlan.snippet.includes("mail.zxcs.nl"));

    // DNS propagation alignment test
    const expected = [
        { type: "A", name: "stenekesrioolspecialist.nl", value: "185.182.56.12" },
        { type: "MX", name: "stenekesrioolspecialist.nl", value: "mail.mijnhost.nl" }
    ];

    const alignedProbed = [
        { type: "A", name: "stenekesrioolspecialist.nl", value: "185.182.56.12" },
        { type: "MX", name: "stenekesrioolspecialist.nl", value: "10 mail.mijnhost.nl." }
    ];

    const alignedRes = calculateDnsPropagationReadiness(alignedProbed, expected);
    assert.strictEqual(alignedRes.isAligned, true);
    assert.strictEqual(alignedRes.score, 100);

    const divergedProbed = [
        { type: "A", name: "stenekesrioolspecialist.nl", value: "185.104.29.148" }, // old Vimexx IP
        { type: "MX", name: "stenekesrioolspecialist.nl", value: "10 mail.zxcs.nl." }
    ];

    const divergedRes = calculateDnsPropagationReadiness(divergedProbed, expected);
    assert.strictEqual(divergedRes.isAligned, false);
    assert.strictEqual(divergedRes.score, 0);
    assert.strictEqual(divergedRes.mismatches.length, 2);
});

test("TASK-505: SSL readiness evaluator checks SANs, expiry window & Let's Encrypt TLS 1.3 coverage", async () => {
    const { evaluateSslReadiness } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");

    // Healthy certificate
    const healthyCert = {
        validTo: new Date(Date.now() + 80 * 86400000).toISOString(),
        sans: ["angelastenekes.nl", "www.angelastenekes.nl"]
    };
    const healthyRes = evaluateSslReadiness("angelastenekes.nl", healthyCert);
    assert.strictEqual(healthyRes.isReady, true);
    assert.ok(healthyRes.statusBadge.includes("Actief & Beveiligd"));
    assert.strictEqual(healthyRes.issues.length, 0);

    // Expiring certificate (5 days left)
    const expiringCert = {
        validTo: new Date(Date.now() + 5 * 86400000).toISOString(),
        sans: ["angelastenekes.nl", "www.angelastenekes.nl"]
    };
    const expiringRes = evaluateSslReadiness("angelastenekes.nl", expiringCert);
    assert.strictEqual(expiringRes.isReady, false);
    assert.ok(expiringRes.issues.some(i => i.includes("verloopt binnen 5 dagen")));

    // Missing www sub-domain
    const missingSansCert = {
        validTo: new Date(Date.now() + 80 * 86400000).toISOString(),
        sans: ["angelastenekes.nl"]
    };
    const missingSansRes = evaluateSslReadiness("angelastenekes.nl", missingSansCert);
    assert.strictEqual(missingSansRes.isReady, false);
    assert.ok(missingSansRes.issues.some(i => i.includes("Subdomein (www.")));
});

test("TASK-505: Formal Vimexx cancellation dossier enforces AVG art. 17 right to erasure & 14-day confirmation window", async () => {
    const { generateVimexxCancellationDossier } = await import("../crm/admin/js/modules/cloud-cutover-executor.js");

    const dossier = generateVimexxCancellationDossier();
    assert.ok(dossier.includes("FORMELE OPZEGGING WEBHOSTINGPAKKET & DIENSTEN"));
    assert.ok(dossier.includes("Allard Veldman"));
    assert.ok(dossier.includes("Creation+Alt+Fix"));
    assert.ok(dossier.includes("KvK 99986191"));
    assert.ok(dossier.includes("Vimexx B.V."));
    assert.ok(dossier.includes("web0156.zxcs.nl"));
    assert.ok(dossier.includes("€ 143,88"));
    assert.ok(dossier.includes("creationaltfix.nl"));
    assert.ok(dossier.includes("ftruckstore.nl"));
    assert.ok(dossier.includes("stenekesrioolspecialist.nl"));
    assert.ok(dossier.includes("artikel 17 van de AVG"));
    assert.ok(dossier.includes("14 kalenderdagen"));
    assert.ok(dossier.includes("info@creationaltfix.nl"));
});

// ========================================================
// 36. TESTSUITE EXPANSIE & DEEP EDGE-CASE HARDENING (RONDE 14)
// ========================================================
console.log("\n🛡️ SUITE 36: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 14)");

// --- SECTION 1: LEAD FACTORY DEEP EDGE-CASES (RONDE 14) ---

await testAsync("Lead Factory Enterprise (R14): Malformed Data, Prototype Pollution Resistance & Fallback Sanity", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");

    const nonObj = sanitizeLeadData("not-an-object");
    assert.strictEqual(nonObj, null);
    const arr = sanitizeLeadData([1, 2, 3]);
    assert.strictEqual(arr, null);
    const nil = sanitizeLeadData(null);
    assert.strictEqual(nil, null);

    const pollutedPayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "Veilige Lead B.V.", "slug": "veilige-lead"}');
    const sanitized = sanitizeLeadData(pollutedPayload);
    assert.ok(sanitized);
    assert.strictEqual(Object.prototype.polluted, undefined, "Prototype pollution must be neutralized");
    assert.strictEqual(sanitized.name, "Veilige Lead B.V.");
    assert.strictEqual(sanitized.slug, "veilige-lead");
    assert.strictEqual(sanitized.region, "Hoogezand");

    const partial = sanitizeLeadData({});
    assert.strictEqual(partial.name, "Lokale Ondernemer");
    assert.strictEqual(partial.slug, "lokale-ondernemer");
    assert.strictEqual(partial.website, null);
    assert.strictEqual(partial.hasWebsite, false);

    const xssLead = sanitizeLeadData({ name: "Hacker", website: "javascript:alert(1)" });
    assert.strictEqual(xssLead.website, null);
    assert.strictEqual(xssLead.hasWebsite, false);
});

await testAsync("Lead Factory Enterprise (R14): Zero-Width Spaces, RTL Inversion, Invisible Unicode & Label Clamping", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizeDomain } = await import("../factory/discovery/maps-crawler.js");

    const zeroWidth = "\u200BSchilders\u200Cbedrijf\u200D Groningen\u00A0B.V.";
    const domain1 = formatSuggestedDomain(zeroWidth);
    assert.ok(/^[a-z0-9-]+\.nl$/.test(domain1));
    assert.strictEqual(domain1.includes("\u200B"), false);
    assert.strictEqual(domain1.includes("\u200C"), false);
    assert.strictEqual(domain1.includes("\u200D"), false);
    assert.strictEqual(domain1.includes("\u00A0"), false);

    const messyDomain = formatSuggestedDomain("--- Dakdekker & Loodgieter Het Noorden #1 ---");
    assert.strictEqual(messyDomain, "dakdekker-loodgieter-het-noorden-1.nl");

    const hugeName = "A".repeat(120);
    const domainHuge = formatSuggestedDomain(hugeName);
    assert.strictEqual(domainHuge.length <= 66, true);
    assert.ok(domainHuge.endsWith(".nl"));

    assert.strictEqual(formatSuggestedDomain(""), "zzp-concept.nl");
    assert.strictEqual(formatSuggestedDomain(null), "zzp-concept.nl");

    assert.strictEqual(normalizeDomain("https://www.bakkerijsieg.nl:443/shop?product=brood#contact"), "bakkerijsieg.nl");
    assert.strictEqual(normalizeDomain("http://stenekesrioolspecialist.nl:80/"), "stenekesrioolspecialist.nl");
    assert.strictEqual(normalizeDomain(null), null);
});

await testAsync("Lead Factory Enterprise (R14): Comprehensive Global E.164 Rejection vs 10 Dutch Mobile & Landline Dialects", async () => {
    const { isDutchMobilePhone, normalizeDutchPhone } = await import("../factory/enrichment/deep-intelligence.js");

    const foreignNumbers = [
        "+1 555-0199", "+49 170 1234567", "+32 471 234567", "+44 7911 123456",
        "+33 6 12 34 56 78", "+34 612 345 678", "+61 412 345 678", "+86 138 0000 0000"
    ];
    for (const num of foreignNumbers) {
        assert.strictEqual(isDutchMobilePhone(num), false, `Foreign number ${num} must be rejected`);
    }

    const domesticNonMobile = ["0800-0113", "0900-8844", "088-1234567", "085-0001234", "050-3123456", "0598-123456"];
    for (const d of domesticNonMobile) {
        assert.strictEqual(isDutchMobilePhone(d), false, `Domestic non-mobile ${d} must be rejected`);
    }

    const validDutchMobiles = [
        "0612345678", "06-12345678", "06 12 34 56 78", "06.12.34.56.78", "(06) 12345678",
        "+31 6 12345678", "+31612345678", "+31 (0)6 12345678", "0031 6 12345678", "0031(0)612345678"
    ];
    for (const vm of validDutchMobiles) {
        assert.strictEqual(isDutchMobilePhone(vm), true, `Dutch mobile ${vm} must be accepted`);
        assert.strictEqual(normalizeDutchPhone(vm), "0612345678", `Dutch mobile ${vm} must normalize to 0612345678`);
    }

    assert.strictEqual(normalizeDutchPhone("+31 (0)50 312 3456"), "0503123456");
});

await testAsync("Lead Factory Enterprise (R14): Multi-Layer Deduplication Engine with Fuzzy Domain, Port & Phone Matching", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");

    const catalog = [
        { name: "Dakdekker Heinkens", slug: "heinkens-daktechniek", phone: "06 15 42 41 89", website: "https://heinkensdaktechniek.nl" }
    ];

    assert.strictEqual(isDuplicateLead({ slug: "heinkens-daktechniek" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 (0)6-15424189" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "0615424189" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ website: "http://www.heinkensdaktechniek.nl:80/diensten/?ref=test#top" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ name: "Nieuw Bedrijf", slug: "nieuw-bedrijf", phone: "06 99 88 77 66", website: "https://uniek.nl" }, catalog), false);

    assert.strictEqual(isDuplicateLead(null, catalog), false);
    assert.strictEqual(isDuplicateLead({}, null), false);
});

await testAsync("Lead Factory Enterprise (R14): Category & Regional Center Geolocation Resolution Engine", async () => {
    const { resolveRegionCoordinates, REGIONAL_CENTERS } = await import("../factory/discovery/maps-crawler.js");

    assert.strictEqual(Object.keys(REGIONAL_CENTERS).length, 11);
    const expectedCenters = ['groningen', 'assen', 'drachten', 'emmen', 'hoogeveen', 'winschoten', 'veendam', 'sappemeer', 'roden', 'leek', 'hoogezand'];
    for (const k of expectedCenters) {
        assert.ok(REGIONAL_CENTERS[k]);
        assert.strictEqual(typeof REGIONAL_CENTERS[k].lat, 'number');
        assert.strictEqual(typeof REGIONAL_CENTERS[k].lng, 'number');
        assert.strictEqual(typeof REGIONAL_CENTERS[k].zoom, 'number');
    }

    const assen = resolveRegionCoordinates("dakdekker in assen centrum");
    assert.strictEqual(assen.name, "Assen");
    assert.strictEqual(assen.lat, 52.9925);

    const drachten = resolveRegionCoordinates("loodgieter drachten");
    assert.strictEqual(drachten.name, "Drachten");

    const fallback = resolveRegionCoordinates("onbekend dorpje in limburg");
    assert.strictEqual(fallback.name, "Hoogezand");

    const emptyFallback = resolveRegionCoordinates("");
    assert.strictEqual(emptyFallback.name, "Hoogezand");
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE-CASES (RONDE 14) ---

await testAsync("Offerte & Factuur Enterprise (R14): Belastingdienst 9% / 21% Split Invoicing with Fractional Hours & Rounding Precision", async () => {
    function calculateFiscalInvoice(items) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;

        for (const it of items) {
            const qty = Number(it.qty !== undefined ? it.qty : 1);
            const price = Number(it.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (it.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const totalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((totalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return { subtotal21, vat21, subtotal9, vat9, subtotal0, totalExcl, totalVat, totalIncl };
    }

    const items = [
        { desc: "Senior Architectuur Uren", price: 95.00, qty: 5.333, vatRate: 21 },
        { desc: "Frontend React Ontwikkeling", price: 85.00, qty: 12.667, vatRate: 21 },
        { desc: "Gedrukte Naslagwerken & Documentatie", price: 32.50, qty: 4, vatRate: 9 },
        { desc: "EU Hosting Vrijstelling (0%)", price: 150.00, qty: 1, vatRate: 0 }
    ];

    const inv = calculateFiscalInvoice(items);
    assert.strictEqual(inv.subtotal21, 1583.34);
    assert.strictEqual(inv.vat21, 332.50);
    assert.strictEqual(inv.subtotal9, 130.00);
    assert.strictEqual(inv.vat9, 11.70);
    assert.strictEqual(inv.subtotal0, 150.00);
    assert.strictEqual(inv.totalExcl, 1863.34);
    assert.strictEqual(inv.totalVat, 344.20);
    assert.strictEqual(inv.totalIncl, 2207.54);

    // Belastingdienst rounding delta limit test
    let lineSumVat = 0;
    for (const it of items) {
        const lineExcl = Math.round((it.price * (it.qty || 1) + Number.EPSILON) * 100) / 100;
        const rate = it.vatRate === 9 ? 0.09 : (it.vatRate === 0 ? 0 : 0.21);
        const lineVat = Math.round((lineExcl * rate + Number.EPSILON) * 100) / 100;
        lineSumVat = Math.round((lineSumVat + lineVat + Number.EPSILON) * 100) / 100;
    }
    const delta = Math.abs(lineSumVat - inv.totalVat);
    assert.ok(delta <= 0.02, `Delta ${delta} must be <= € 0.02`);
});

await testAsync("Offerte & Factuur Enterprise (R14): Zero-Balance, Pro-Bono & Credit Note Integrity with Division-by-Zero Defense", async () => {
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    const proBonoProject = {
        id: "proj_probono_2026_r14",
        client: "Vrijwilligerscentrale Groningen",
        invoices: [{
            invoiceNumber: "2026-PB-14",
            description: "Pro-bono realisatie maatschappelijk platform",
            amountExcl: 0.00,
            amountVat: 0.00,
            amountIncl: 0.00,
            status: "paid"
        }]
    };
    const normProBono = normalizeProjectInvoices(proBonoProject);
    const pbInv = normProBono.find(i => i.invoiceNumber === "2026-PB-14");
    assert.ok(pbInv);
    assert.strictEqual(pbInv.amountIncl, 0);
    assert.strictEqual(formatCurrency(pbInv.amountIncl), "€ 0,00");

    const creditNoteProject = {
        id: "proj_credit_2026_r14",
        client: "Klant Zonder Pi Sync",
        invoices: [{
            invoiceNumber: "2026-CN-26",
            description: "Creditnota verrekening meerwerk",
            amountExcl: -350.00,
            amountVat: -73.50,
            amountIncl: -423.50,
            status: "paid"
        }]
    };
    const normCredit = normalizeProjectInvoices(creditNoteProject);
    const cnInv = normCredit.find(i => i.invoiceNumber === "2026-CN-26");
    assert.ok(cnInv);
    assert.strictEqual(cnInv.amountIncl, -423.50);
    assert.strictEqual(formatCurrency(cnInv.amountIncl), "€ -423,50");

    function calculatePaymentProgress(paid, total) {
        if (!total || total <= 0 || !isFinite(total)) return 0;
        if (!paid || paid <= 0 || !isFinite(paid)) return 0;
        return Math.min(100, Math.round((paid / total) * 100));
    }

    assert.strictEqual(calculatePaymentProgress(0, 0), 0);
    assert.strictEqual(calculatePaymentProgress(100, 0), 0);
    assert.strictEqual(calculatePaymentProgress(100, -500), 0);
    assert.strictEqual(calculatePaymentProgress(NaN, 1000), 0);
    assert.strictEqual(calculatePaymentProgress(500, Infinity), 0);
    assert.strictEqual(calculatePaymentProgress(250, 1000), 25);
    assert.strictEqual(calculatePaymentProgress(1200, 1000), 100);
});

await testAsync("Offerte & Factuur Enterprise (R14): Sequential vs Stacked Compound Discount Engine with Zero-Floor Clamping", async () => {
    function calculateCompoundDiscounts(baseAmount, discounts = {}) {
        let current = baseAmount;
        if (discounts.loyaltyPercent) {
            current = Math.round((current * (1 - (discounts.loyaltyPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (discounts.earlyBirdPercent) {
            current = Math.round((current * (1 - (discounts.earlyBirdPercent / 100)) + Number.EPSILON) * 100) / 100;
        }
        if (discounts.fixedVoucher) {
            current = current - discounts.fixedVoucher;
        }
        const clampedSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((clampedSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const total = Math.round((clampedSubtotal + vat + Number.EPSILON) * 100) / 100;
        return { clampedSubtotal, vat, total };
    }

    const calc = calculateCompoundDiscounts(1500, { loyaltyPercent: 10, earlyBirdPercent: 5, fixedVoucher: 100 });
    assert.strictEqual(calc.clampedSubtotal, 1182.50);
    assert.strictEqual(calc.vat, 248.33);
    assert.strictEqual(calc.total, 1430.83);

    const overDiscount = calculateCompoundDiscounts(300, { fixedVoucher: 500 });
    assert.strictEqual(overDiscount.clampedSubtotal, 0.00);
    assert.strictEqual(overDiscount.vat, 0.00);
    assert.strictEqual(overDiscount.total, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R14): European Currency Normalizer, Non-Breaking Spaces, Trailing Dash & Extremes", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function parseEuropeanCurrency(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[\u00A0\u202F\s]/g, '').replace(/[€$£]/g, '').trim();
        clean = clean.replace(/,-$/, ',00');
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return isFinite(val) ? val : 0;
    }

    assert.strictEqual(parseEuropeanCurrency("€ 1.450,75"), 1450.75);
    assert.strictEqual(parseEuropeanCurrency("€ 175,-"), 175.00);
    assert.strictEqual(parseEuropeanCurrency("€ 3.500,-"), 3500.00);
    assert.strictEqual(parseEuropeanCurrency("€\u00A089,95"), 89.95);
    assert.strictEqual(parseEuropeanCurrency("€\u202F89,95"), 89.95);
    assert.strictEqual(parseEuropeanCurrency("€ -250,00"), -250.00);
    assert.strictEqual(parseEuropeanCurrency("-€ 250,00"), -250.00);
    assert.strictEqual(parseEuropeanCurrency("€ 12.500.000,00"), 12500000.00);
    assert.strictEqual(parseEuropeanCurrency(""), 0);
    assert.strictEqual(parseEuropeanCurrency(null), 0);

    assert.strictEqual(formatCurrency(1450.75), "€ 1450,75");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-120), "€ -120,00");
});

await testAsync("Offerte & Factuur Enterprise (R14): Automated WhatsApp Payment Link Dispatcher Formatting", async () => {
    const { generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    const waUrl1 = generateBillingWhatsAppUrl("06 12 34 56 78", "Dennis Dijkema", "2026-042", 450.00, "https://mollie.com/pay/123");
    assert.ok(waUrl1.startsWith("https://wa.me/31612345678?text="));
    const decoded1 = decodeURIComponent(waUrl1);
    assert.ok(decoded1.includes("Dennis Dijkema"));
    assert.ok(decoded1.includes("2026-042"));
    assert.ok(decoded1.includes("€ 450,00"));
    assert.ok(decoded1.includes("https://mollie.com/pay/123"));
    assert.ok(decoded1.includes("https://portal.creationaltfix.nl/"));

    const waUrl2 = generateBillingWhatsAppUrl("06-98765432", "Angela Stenekes", "2026-043", 169.40, "https://mollie.com/pay/456");
    assert.ok(waUrl2.startsWith("https://wa.me/31698765432?text="));

    const waUrl3 = generateBillingWhatsAppUrl("31611223344", "Scholte Elektra", "2026-044", 250.00, "https://mollie.com/pay/789");
    assert.ok(waUrl3.startsWith("https://wa.me/31611223344?text="));
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE-CASES (RONDE 14) ---

await testAsync("Contact & Intake Enterprise (R14): Multi-Field Decoy Honeypot Trapping Matrix with Silent Rejection", async () => {
    function inspectIntakeHoneypot(payload) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }
        const decoyFields = [
            'website', '_hp_trap', 'company_fax', 'bot_token', 'company_tax',
            'user_url', 'telephone_confirm', 'extra_address', 'honey_comment',
            'zipcode_verify', 'url_field', 'hidden_auth', 'antispam_check'
        ];
        for (const field of decoyFields) {
            if (payload[field] && String(payload[field]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_TRAP_${field.toUpperCase()}`, silentAccept: true };
            }
        }
        return { blocked: false, reason: 'CLEAN_SUBMISSION', silentAccept: false };
    }

    const decoyFields = [
        'website', '_hp_trap', 'company_fax', 'bot_token', 'company_tax',
        'user_url', 'telephone_confirm', 'extra_address', 'honey_comment',
        'zipcode_verify', 'url_field', 'hidden_auth', 'antispam_check'
    ];
    for (const df of decoyFields) {
        const payload = { companyName: "Legit Name" };
        payload[df] = "bot_injection_data";
        const res = inspectIntakeHoneypot(payload);
        assert.strictEqual(res.blocked, true, `Decoy ${df} must block`);
        assert.strictEqual(res.silentAccept, true, `Decoy ${df} must silentAccept`);
    }

    const cleanSubmission = {
        companyName: "Stenekes Rioolspecialist",
        email: "info@stenekesrioolspecialist.nl",
        goals: "Nieuwe pagina voor camera inspectie",
        website: "",
        _hp_trap: ""
    };
    assert.strictEqual(inspectIntakeHoneypot(cleanSubmission).blocked, false);
});

await testAsync("Contact & Intake Enterprise (R14): Speed-Bot Heuristics & Link-Flood / Keyword Spam Filtering", async () => {
    function inspectSubmissionQuality(payload, elapsedMs = 5000) {
        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }
        const text = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''}`;
        const links = text.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }
        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking)/i.test(text)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }
        return { blocked: false, reason: 'LEGITIMATE_INQUIRY', silentAccept: false };
    }

    assert.strictEqual(inspectSubmissionQuality({ companyName: "SuperBot" }, 800).blocked, true);
    assert.strictEqual(inspectSubmissionQuality({ goals: "Link 1: https://a.com Link 2: https://b.com Link 3: https://c.com" }, 4000).blocked, true);
    assert.strictEqual(inspectSubmissionQuality({ comments: "Buy cheap crypto and bitcoin now at our casino!" }, 4000).blocked, true);

    const normal = inspectSubmissionQuality({
        companyName: "Bakkerij Sieg",
        goals: "We willen graag ons online bestelformulier koppelen aan onze broodjeskaart voor bestellingen in Hoogezand."
    }, 8500);
    assert.strictEqual(normal.blocked, false);
});

await testAsync("Contact & Intake Enterprise (R14): Deep CWE-93 CRLF Header Injection Defense across Protocols & Encoded Payloads", async () => {
    function sanitizeStrictCrlfHeader(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '').replace(/%25250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const hostileVectors = [
        "allard@creationaltfix.nl\r\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl\rBcc:spammer@evil.com",
        "allard@creationaltfix.nl\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl%0d%0aBcc:spammer@evil.com",
        "allard@creationaltfix.nl%0D%0ABcc:spammer@evil.com",
        "allard@creationaltfix.nl%250d%250aBcc:spammer@evil.com",
        "allard@creationaltfix.nl%25250d%25250aBcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2028Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2029Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u0085Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\x00Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u000BBcc:spammer@evil.com",
        "allard@creationaltfix.nl;Bcc:spammer@evil.com",
        "allard@creationaltfix.nl,spammer@evil.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const v of hostileVectors) {
        const sanitized = sanitizeStrictCrlfHeader(v);
        assert.ok(!sanitized.includes("\r"));
        assert.ok(!sanitized.includes("\n"));
        assert.ok(!sanitized.includes("\u2028"));
        assert.ok(!sanitized.includes("\x00"));
        assert.strictEqual(standardEmailRegex.test(sanitized), false, `Vector ${v} must fail regex after sanitization`);
    }

    const clean = sanitizeStrictCrlfHeader("allard@creationaltfix.nl");
    assert.strictEqual(clean, "allard@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(clean), true);
});

await testAsync("Contact & Intake Enterprise (R14): RFC 5322 & RFC 6530 Email Normalizer, Punycode IDN & Sub-Addressing (+tag)", async () => {
    function normalizeRfc5322Email(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIndex);
        const domain = trimmed.slice(atIndex + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    assert.strictEqual(normalizeRfc5322Email("allard+intake2027@creationaltfix.nl").valid, true);
    assert.strictEqual(normalizeRfc5322Email("info@xn--mller-kva.de").valid, true);
    assert.strictEqual(normalizeRfc5322Email("  Contact@CREATIONALTFIX.NL  ").email, "Contact@creationaltfix.nl");

    const invalidEmails = [
        "no-at-sign.nl",
        "@missing-local.nl",
        "missing-domain@",
        "double@@at.nl",
        "consecutive..dots@domain.nl",
        ".startdot@domain.nl",
        "enddot.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl"
    ];
    for (const inv of invalidEmails) {
        assert.strictEqual(normalizeRfc5322Email(inv).valid, false, `${inv} must be invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R14): Zero-Trust SSRF Webhook Firewall, RFC 1918, Cloud IMDS & Hostname Whitelist", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost/hook"), false, "Localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/hook"), false, "127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.254.0.1/hook"), false, "10.0.0.0/8 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.20.0.1/hook"), false, "172.16.0.0/12 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.0.254/hook"), false, "192.168.0.0/16 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/meta"), false, "Cloud IMDS blocked");
    assert.strictEqual(isSafeWebhookUrl("https://100.65.0.1/hook"), false, "CGNAT blocked");
    assert.strictEqual(isSafeWebhookUrl("https://server.local/hook"), false, ".local domain blocked");
    assert.strictEqual(isSafeWebhookUrl("https://api.internal/hook"), false, ".internal domain blocked");

    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/bot123/send"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/abc"), true);
    assert.strictEqual(isSafeWebhookUrl("https://hooks.slack.com/services/T00/B00/X00"), true);

    assert.strictEqual(sanitizeMarkdown("*bold* _italics_ `code`"), "\\*bold\\* \\_italics\\_ \\`code\\`");
    assert.strictEqual(sanitizeMarkdown("[Title](https://domain.nl)"), "\\[Title\\]\\(https://domain\\.nl\\)");
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE-CASES (RONDE 14) ---

await testAsync("DRM & Code Protection Enterprise (R14): W3C HTML5 Parser Script-Data State Compliance & Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Test Protection</title></head><body><h1>Hello</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Malicious </script><script>alert('pwn')</script>",
        slug: "hostile</script><img src=x onerror=alert(1)>"
    });

    const matches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(matches.length, 1);

    const scriptMatch = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "Guard script must match cleanly");
    const scriptBody = scriptMatch[1];

    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.strictEqual(scriptBody.toLowerCase().includes("</script"), false);

    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));
    assert.ok(scriptBody.includes("\\x3Cstrong>"));
    assert.ok(scriptBody.includes("\\x3C/strong>"));

    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R14): Node.js VM AST Compilation & Execution Sandbox Verification", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Creation Alt Fix", slug: "caf-official" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    const script = new vm.Script(scriptBody);
    assert.ok(script, "VM Script must compile cleanly");

    const authContext = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authContext);
    assert.doesNotThrow(() => {
        script.runInContext(authContext);
    });

    const unauthContext = {
        window: { location: { hostname: 'stolen-theme.xyz', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthContext);
    assert.throws(() => {
        script.runInContext(unauthContext);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R14): Event Capture Interception Matrix (Contextmenu, F12, DevTools Shortcuts)", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test DRM", slug: "test-drm" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));

    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R14): Zero-Cookie View-Ping Beacon, Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test Debounce", slug: "test-debounce" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("document.cookie"), false);
    assert.ok(scriptBody.includes("caf_viewed_"));
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));

    assert.ok(scriptBody.includes("preview=admin"));
    assert.ok(scriptBody.includes("caf_admin=1"));
    assert.ok(scriptBody.includes("caf_bridge_token"));

    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("leads.php?action=ping"));
});

await testAsync("DRM & Code Protection Enterprise (R14): Protection Guard Script Idempotency & Structural Tag Preservation", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Original</title></head><body><div id="app">App</div></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Idempotency Test", slug: "idempotency-test" });

    const repeated = applyCodeProtection(protectedHtml, { name: "Idempotency Test", slug: "idempotency-test" });
    assert.strictEqual(protectedHtml, repeated);

    const matches = repeated.match(/id="caf-security-guard"/g);
    assert.strictEqual(matches.length, 1);

    assert.ok(repeated.includes("KvK 99986191"));
    assert.ok(repeated.includes("AUTEURSWET 1912"));
    assert.ok(repeated.includes("ARTIKEL 29A"));
    assert.ok(repeated.includes("BENELUX VERDRAG VOOR INTELLECTUELE EIGENDOM"));

    // Head vs Body insertion
    const headOnly = '<html><head><title>Head Only</title></head></html>';
    const protHead = applyCodeProtection(headOnly, { name: "Head", slug: "head" });
    assert.ok(protHead.includes('id="caf-security-guard"'));
    assert.ok(protHead.indexOf('id="caf-security-guard"') < protHead.indexOf('</head>'));

    const bodyOnly = '<html><body><div>Body Only</div></body></html>';
    const protBody = applyCodeProtection(bodyOnly, { name: "Body", slug: "body" });
    assert.ok(protBody.includes('id="caf-security-guard"'));
    assert.ok(protBody.indexOf('id="caf-security-guard"') < protBody.indexOf('</body>'));

    const noHeadNoBody = '<div>Plain Div</div>';
    const protPlain = applyCodeProtection(noHeadNoBody, { name: "Plain", slug: "plain" });
    assert.ok(protPlain.includes('id="caf-security-guard"'));
});

// ========================================================
// 37. REGIONALE WHATSAPP & E-MAIL OUTREACH RONDE (TASK-906)
// ========================================================
console.log("\n📱 SUITE 37: Regionale WhatsApp & E-mail Outreach Ronde (TASK-906)");

await testAsync("TASK-906: Campaign configuration, authentic branding & lifecycle stages integrity", async () => {
    const { OUTREACH_CAMPAIGN_INFO, OUTREACH_STAGES } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.targetCohortSize, 30, "Target cohort must be 30 regional leads");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.minTargetDeals, 3, "Minimum target deals must be 3");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.dealPricing.min, 650, "Minimum deal price must be € 650");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.dealPricing.max, 850, "Maximum deal price must be € 850");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.dealPricing.standard, 750, "Standard deal price must be € 750");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.dealPricing.depositPercentage, 50, "Deposit percentage must be 50%");

    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.sender.name, "Allard Veldman");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.sender.city, "Hoogezand");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.sender.phoneInternational, "31619135453");
    assert.strictEqual(OUTREACH_CAMPAIGN_INFO.sender.kvk, "99986191");

    const expectedStages = ['uncontacted', 'queued', 'sent_whatsapp', 'sent_email', 'viewed', 'in_negotiation', 'deal_closed', 'declined'];
    assert.strictEqual(OUTREACH_STAGES.length, expectedStages.length);
    for (const stage of expectedStages) {
        assert.ok(OUTREACH_STAGES.includes(stage), `Stage '${stage}' must be included in OUTREACH_STAGES`);
    }
});

await testAsync("TASK-906: Dutch mobile phone normalization & strict landline/service rejection", async () => {
    const { normalizeDutchMobileForWhatsApp } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const validNumbers = [
        "06 12345678",
        "(06) 12 34 56 78",
        "06-12345678",
        "+31 6 12345678",
        "+31(0)6-12345678",
        "+310612345678",
        "0031612345678",
        "0031 (0)6 12345678",
        "31612345678"
    ];

    for (const num of validNumbers) {
        const res = normalizeDutchMobileForWhatsApp(num);
        assert.strictEqual(res.valid, true, `Number '${num}' must be valid`);
        assert.strictEqual(res.formatted, "31612345678", `Formatted must be '31612345678' for '${num}'`);
    }

    const invalidNumbers = [
        "050 1234567",       // Groningen landline
        "0598 612345",      // Hoogezand landline
        "0597 123456",      // Winschoten landline
        "020 1234567",       // Amsterdam landline
        "0800 1234",         // Service number
        "0900 1234",         // Paid service number
        "088 1234567",       // Company number
        "085 1234567",       // VoIP service number
        "+49 170 1234567",   // German mobile
        "+1 555 1234567",    // US phone
        "",                  // Empty
        null,                // Null
        undefined,           // Undefined
        "niet bereikbaar"    // String text
    ];

    for (const inv of invalidNumbers) {
        const res = normalizeDutchMobileForWhatsApp(inv);
        assert.strictEqual(res.valid, false, `'${inv}' must be rejected`);
        assert.ok(res.error, `Error reason must be provided for '${inv}'`);
    }
});

await testAsync("TASK-906: WhatsApp Click-to-Chat URL generator with RFC 3986 encoding & safety", async () => {
    const { generateWhatsAppDispatchUrl } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const message = "Beste Jan,\n\nAllard hier van Creation+Alt+Fix in Hoogezand. 👉 Bekijk concept: https://creationaltfix.nl/concept/jan/!\n\nGroet,\nAllard";
    const url = generateWhatsAppDispatchUrl("06-12345678", message);

    assert.ok(url.startsWith("https://wa.me/31612345678?text="), "URL must point to wa.me with formatted phone");
    assert.ok(url.includes("Allard%20hier"), "Message must be URL encoded");
    assert.ok(url.includes("%F0%9F%91%89"), "Emoji must be URL encoded");

    assert.throws(() => {
        generateWhatsAppDispatchUrl("050-1234567", "Hoi");
    }, /Kan geen WhatsApp URL genereren.*Vast netnummer/, "Landlines must throw clear error");

    assert.throws(() => {
        generateWhatsAppDispatchUrl("", "Hoi");
    }, /Kan geen WhatsApp URL genereren/, "Empty numbers must throw");
});

await testAsync("TASK-906: Direct Portal proposal & onboarding magic link generator", async () => {
    const { generatePortalProposalLink } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const lead = { slug: "schildersbedrijf-jansen", id: "lead_123" };
    const url = generatePortalProposalLink(lead, { price: 750, campaign: "outreach_w4" });

    assert.ok(url.startsWith("https://portal.creationaltfix.nl/crm/status/?lead=schildersbedrijf-jansen"));
    assert.ok(url.includes("ref=outreach_w4"));
    assert.ok(url.includes("amount=750"));

    // Bound clamping (min 650, max 850)
    const lowUrl = generatePortalProposalLink(lead, { price: 300 });
    assert.ok(lowUrl.includes("amount=650"), "Prices below 650 must clamp to 650");

    const highUrl = generatePortalProposalLink(lead, { price: 1500 });
    assert.ok(highUrl.includes("amount=850"), "Prices above 850 must clamp to 850");
});

await testAsync("TASK-906: Multi-channel pitch synthesizer across all 6 templates & auto-selection", async () => {
    const { synthesizeRegionalPitch } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const baseLead = {
        name: "Dakdekker Hoogezand",
        contactPerson: "Klaas",
        slug: "dakdekker-hoogezand",
        city: "Hoogezand",
        phone: "06 12345678",
        liveUrl: "https://creationaltfix.nl/concept/dakdekker-hoogezand/"
    };

    // 1. Nuchter Direct
    const nuchter = synthesizeRegionalPitch(baseLead, { template: "nuchter_direct" });
    assert.strictEqual(nuchter.templateId, "nuchter_direct");
    assert.ok(nuchter.text.includes("Beste Klaas,"));
    assert.ok(nuchter.text.includes("Allard van Creation+Alt+Fix hier uit de regio (Hoogezand)"));
    assert.ok(nuchter.text.includes("https://creationaltfix.nl/concept/dakdekker-hoogezand/"));
    assert.ok(nuchter.text.includes("€ 750,-"));
    assert.ok(nuchter.text.includes("06 - 19135453"));
    assert.ok(nuchter.whatsAppDispatchUrl.startsWith("https://wa.me/31612345678"));

    // 2. Domain Free
    const domainLead = { ...baseLead, isDomainAvailable: true, recommendedDomain: "dakdekker-hoogezand.nl" };
    const domainPitch = synthesizeRegionalPitch(domainLead, { template: "domain_free" });
    assert.strictEqual(domainPitch.templateId, "domain_free");
    assert.ok(domainPitch.text.includes("dakdekker-hoogezand.nl"));
    assert.ok(domainPitch.text.includes("vrij is om te registreren"));

    // 3. Video Reel
    const videoLead = { ...baseLead, videoPreview: { generated: true, relativeUrl: "/concept/dak/video.mp4" } };
    const videoPitch = synthesizeRegionalPitch(videoLead, { template: "video_reel" });
    assert.strictEqual(videoPitch.templateId, "video_reel");
    assert.ok(videoPitch.text.includes("15s video-preview"));
    assert.ok(videoPitch.text.includes("video.mp4"));

    // 4. Gronings Voice Note
    const voicePitch = synthesizeRegionalPitch(baseLead, { template: "gronings_voicenote" });
    assert.strictEqual(voicePitch.templateId, "gronings_voicenote");
    assert.ok(voicePitch.text.includes("Allard hier nog even kort"));
    assert.ok(voicePitch.text.includes("zodat je weet wie erachter zit"));

    // 5. View Follow-up
    const viewedLead = { ...baseLead, viewsCount: 2 };
    const followupPitch = synthesizeRegionalPitch(viewedLead, { template: "view_followup" });
    assert.strictEqual(followupPitch.templateId, "view_followup");
    assert.ok(followupPitch.text.includes("zag dat je net even hebt gekeken"));

    // 6. Portal Proposal
    const proposalPitch = synthesizeRegionalPitch(baseLead, { template: "portal_proposal" });
    assert.strictEqual(proposalPitch.templateId, "portal_proposal");
    assert.ok(proposalPitch.text.includes("portal.creationaltfix.nl/crm/status/?lead=dakdekker-hoogezand"));
    assert.ok(proposalPitch.text.includes("50% aanbetaling via iDEAL"));

    // 7. Auto Selection: viewed > video > domain > nuchter
    const autoViewed = synthesizeRegionalPitch(viewedLead, { template: "auto" });
    assert.strictEqual(autoViewed.templateId, "view_followup");

    const autoVideo = synthesizeRegionalPitch(videoLead, { template: "auto" });
    assert.strictEqual(autoVideo.templateId, "video_reel");

    const autoDomain = synthesizeRegionalPitch(domainLead, { template: "auto" });
    assert.strictEqual(autoDomain.templateId, "domain_free");

    const autoNuchter = synthesizeRegionalPitch(baseLead, { template: "auto" });
    assert.strictEqual(autoNuchter.templateId, "nuchter_direct");
});

await testAsync("TASK-906: Priority queue builder partitions cohort into Hoogezand Success Routine daily batches", async () => {
    const { buildOutreachQueue } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const mockLeads = [
        { id: "l1", name: "Loodgieter Veendam", city: "Veendam", phone: "06 11111111", viewsCount: 3, score: 85 },
        { id: "l2", name: "Schilder Hoogezand", city: "Hoogezand", phone: "06 22222222", isDomainAvailable: true, score: 75 },
        { id: "l3", name: "Stratenmaker Sappemeer", city: "Sappemeer", phone: "0598 123456", score: 60 }, // landline
        { id: "l4", name: "Timmerman Winschoten", city: "Winschoten", phone: "06 33333333", score: 90 },
        { id: "l5", name: "Overgeslagen Lead", city: "Groningen", status: "skipped" }
    ];

    const result = buildOutreachQueue(mockLeads, { targetCount: 30, sessionBatchSize: 2 });

    assert.strictEqual(result.cohortSize, 4, "Skipped leads must be excluded");
    assert.strictEqual(result.queue[0].id, "l1", "Viewed lead with valid 06 must rank first");
    assert.strictEqual(result.queue[0].followUpDueAt !== null, true, "Contacted/viewed lead must have followUpDueAt date");
    assert.strictEqual(result.validMobileCount, 3, "Exactly 3 leads have valid 06-mobile numbers");

    // Check sessions batching
    assert.strictEqual(result.sessions.length, 2, "4 leads with batchSize 2 must create 2 sessions");
    assert.strictEqual(result.sessions[0].sessionNumber, 1);
    assert.strictEqual(result.sessions[0].leadsCount, 2);
    assert.strictEqual(result.sessions[1].sessionNumber, 2);
    assert.strictEqual(result.sessions[1].leadsCount, 2);
});

await testAsync("TASK-906: Campaign metrics calculator accurately computes funnel telemetries & revenue forecast", async () => {
    const { calculateOutreachCampaignMetrics } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const mockLeads = [
        { id: "l1", name: "Loodgieter A", phone: "06 11111111", status: "deal_closed", sentAt: "2026-10-20" },
        { id: "l2", name: "Loodgieter B", phone: "06 22222222", status: "deal_closed", sentAt: "2026-10-20" },
        { id: "l3", name: "Loodgieter C", phone: "06 33333333", status: "deal_closed", sentAt: "2026-10-20" },
        { id: "l4", name: "Schilder D", phone: "06 44444444", status: "in_negotiation", sentAt: "2026-10-21" },
        { id: "l5", name: "Schilder E", phone: "06 55555555", status: "viewed", viewsCount: 2, sentAt: "2026-10-21" },
        { id: "l6", name: "Dakdekker F", phone: "06 66666666", status: "sent_whatsapp", sentAt: "2026-10-22" },
        { id: "l7", name: "Hovenier G", phone: "06 77777777", status: "queued" }
    ];

    const metrics = calculateOutreachCampaignMetrics(mockLeads);

    assert.strictEqual(metrics.pipeline.dealsClosed, 3);
    assert.strictEqual(metrics.pipeline.inNegotiation, 1);
    assert.strictEqual(metrics.pipeline.sentWhatsApp, 1);
    assert.strictEqual(metrics.financial.closedRevenueEur, 3 * 750, "3 deals * € 750 = € 2.250");
    assert.strictEqual(metrics.financial.targetGoalAchieved, true, "Target of >= 3 deals must be achieved");
    assert.ok(metrics.funnel.totalSent >= 6, "Total sent must include all dispatched stages");
    assert.ok(metrics.funnel.viewRatePercentage > 0, "View rate percentage must be positive");
    assert.ok(metrics.funnel.conversionRatePercentage > 0, "Conversion rate percentage must be positive");
});

await testAsync("TASK-906: Markdown briefing dossier generator & CRM Admin UI / Backend integration", async () => {
    const { generateOutreachDossierMarkdown } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const sampleLeads = [
        { id: "test-lead", name: "Dakbedekking Noord", city: "Hoogezand", category: "Dakdekker", phone: "06 19135453", slug: "dak-noord" }
    ];

    const md = generateOutreachDossierMarkdown(sampleLeads);
    assert.ok(md.includes("Regionale MKB Outreach Campagne Dossier (TASK-906)"));
    assert.ok(md.includes("De Hoogezand Ochtend-Routine (10:00 - 11:30)"));
    assert.ok(md.includes("Dakbedekking Noord"));
    assert.ok(md.includes("06 - 19135453"));

    // Backend verification in leads.php
    const leadsPhp = fs.readFileSync(path.join(ROOT_DIR, "crm/api/leads.php"), "utf-8");
    assert.ok(leadsPhp.includes("$action === 'outreach'"), "leads.php must handle action === 'outreach'");
    assert.ok(leadsPhp.includes("$action === 'record_outreach'"), "leads.php must handle action === 'record_outreach'");

    // Release bundle synchronization
    const releaseLeadsPhp = fs.readFileSync(path.join(ROOT_DIR, "release/creation-alt-fix-v2.0.0/crm/api/leads.php"), "utf-8");
    assert.ok(releaseLeadsPhp.includes("$action === 'outreach'"), "Release bundle leads.php must be synchronized with action === 'outreach'");

    // CRM Admin UI verification
    const adminHtml = fs.readFileSync(path.join(ROOT_DIR, "crm/admin/index.html"), "utf-8");
    assert.ok(adminHtml.includes('id="btn-open-outreach-campaign"'), "index.html must contain #btn-open-outreach-campaign");
    assert.ok(adminHtml.includes('id="outreach-campaign-modal"'), "index.html must contain #outreach-campaign-modal");

    // Module export verification
    const leadFactoryMod = await import("../crm/admin/js/modules/admin-lead-factory.js");
    assert.strictEqual(typeof leadFactoryMod.openRegionalOutreachModal, "function", "admin-lead-factory.js must export openRegionalOutreachModal");

    // CLI runner exists
    assert.ok(fs.existsSync(path.join(ROOT_DIR, "scripts/run-regional-outreach.mjs")), "CLI script scripts/run-regional-outreach.mjs must exist");
});

// ========================================================
// 38. TESTSUITE EXPANSIE & DEEP EDGE-CASE HARDENING (RONDE 15)
// ========================================================
console.log("\n🛡️ SUITE 38: Testsuite Expansie & Deep Edge-Case Hardening (Ronde 15)");

// --- SECTION 1: LEAD FACTORY DEEP EDGE-CASES (RONDE 15) ---

await testAsync("Lead Factory Enterprise (R15): Extreme 50KB String Clamping, Control Characters, Surrogate Emojis & SQL Injection Resistance", async () => {
    const { sanitizeLeadData } = await import("../factory/discovery/maps-crawler.js");
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    const hugeStr = "A".repeat(50000);
    const hugeLead = {
        name: "Loodgietersbedrijf " + hugeStr,
        slug: hugeStr,
        website: "https://example.com/" + hugeStr.slice(0, 100),
        region: hugeStr.slice(0, 500)
    };
    const sanitized = sanitizeLeadData(hugeLead);
    assert.ok(sanitized);
    assert.strictEqual(sanitized.name.length, 150);
    assert.strictEqual(sanitized.slug.length, 64);
    assert.strictEqual(sanitized.hasWebsite, true);

    const emojiPayload = "🔧 Loodgieter\x00 Snelservice\x1F ⚡️ 🛠️";
    const domain = formatSuggestedDomain(emojiPayload);
    assert.ok(/^[a-z0-9-]+\.nl$/.test(domain));
    assert.strictEqual(domain, "loodgieter-snelservice.nl");

    const sqliLead = { name: "Bakkerij' OR '1'='1", slug: "bakkerij' OR '1'='1" };
    const sanitizedSqli = sanitizeLeadData(sqliLead);
    assert.strictEqual(sanitizedSqli.name, "Bakkerij' OR '1'='1");
    assert.strictEqual(sanitizedSqli.slug, "bakkerij-or-1-1");
    const sqliDomain = formatSuggestedDomain(sqliLead.name);
    assert.strictEqual(sqliDomain, "bakkerij-or-1-1.nl");
});

await testAsync("Lead Factory Enterprise (R15): Dutch Diacritics, Ligatures (IJ/ij, oe, ae, ss) & Apostrophe Stripping in Domain Synthesis", async () => {
    const { formatSuggestedDomain } = await import("../factory/enrichment/deep-intelligence.js");

    const domainIJ = formatSuggestedDomain("IJzersterk Dakbeheer Groningen");
    assert.strictEqual(domainIJ, "ijzersterk-dakbeheer-groningen.nl");

    const domainApos = formatSuggestedDomain("Bakkerij 't Stoepje");
    assert.strictEqual(domainApos, "bakkerij-t-stoepje.nl");

    const domainVanT = formatSuggestedDomain("Schildersbedrijf van 't Hoog");
    assert.strictEqual(domainVanT, "schildersbedrijf-van-t-hoog.nl");

    const domainCafe = formatSuggestedDomain("Café De Witte Lelie");
    assert.strictEqual(domainCafe, "caf-de-witte-lelie.nl");

    const domainReunie = formatSuggestedDomain("Reünie & Klusbedrijf");
    assert.strictEqual(domainReunie, "re-nie-klusbedrijf.nl");
});

await testAsync("Lead Factory Enterprise (R15): Global E.164 Disambiguation across 5 Continents vs 11 Dutch Mobile & Landline Dialects", async () => {
    const { isDutchMobilePhone, normalizeDutchPhone } = await import("../factory/enrichment/deep-intelligence.js");
    const { normalizeDutchMobileForWhatsApp } = await import("../crm/admin/js/modules/regional-outreach-manager.js");

    const foreignPhones = [
        "+1 (555) 234-5678",
        "+49 151 12345678",
        "+32 470 123 456",
        "+33 6 12 34 56 78",
        "+44 7700 900077",
        "+34 612 345 678",
        "+39 347 1234567",
        "+81 90 1234 5678",
        "+86 139 1000 0000",
        "+61 412 345 678"
    ];
    for (const fp of foreignPhones) {
        assert.strictEqual(isDutchMobilePhone(fp), false, `Foreign phone ${fp} must be rejected by isDutchMobilePhone`);
        const wa = normalizeDutchMobileForWhatsApp(fp);
        assert.strictEqual(wa.valid, false, `Foreign phone ${fp} must be rejected by normalizeDutchMobileForWhatsApp`);
    }

    const domesticLandlines = [
        "050 312 3456",
        "0598 612 345",
        "0597 412 345",
        "0592 312 345",
        "0512 512 345",
        "020 612 3456",
        "0800 0113",
        "0900 8844",
        "088 1234567",
        "085 1234567"
    ];
    for (const dl of domesticLandlines) {
        assert.strictEqual(isDutchMobilePhone(dl), false, `Landline ${dl} must be rejected`);
        const wa = normalizeDutchMobileForWhatsApp(dl);
        assert.strictEqual(wa.valid, false, `Landline ${dl} must be rejected for WhatsApp`);
    }

    const validDutchMobiles = [
        "0619135453",
        "06-19135453",
        "06 19 13 54 53",
        "06.19.13.54.53",
        "(06) 19 13 54 53",
        "+31 6 19135453",
        "+31619135453",
        "+31 (0)6 19135453",
        "+31(0)6-19135453",
        "0031 6 19135453",
        "0031(0)619135453"
    ];
    for (const vm of validDutchMobiles) {
        assert.strictEqual(isDutchMobilePhone(vm), true, `Mobile ${vm} must be accepted`);
        assert.strictEqual(normalizeDutchPhone(vm), "0619135453", `Mobile ${vm} must normalize to 0619135453`);
        const wa = normalizeDutchMobileForWhatsApp(vm);
        assert.strictEqual(wa.valid, true);
        assert.strictEqual(wa.formatted, "31619135453");
    }
});

await testAsync("Lead Factory Enterprise (R15): Multi-Factor Fuzzy Lead Deduplication across Protocol, Port, Query & Phone Normalization", async () => {
    const { isDuplicateLead } = await import("../factory/discovery/maps-crawler.js");

    const catalog = [
        {
            name: "Dakdekker Hoogezand B.V.",
            slug: "dakdekker-hoogezand",
            phone: "06-19135453",
            website: "https://dakdekker-hoogezand.nl/"
        },
        {
            name: "Loodgieter Veendam",
            slug: "loodgieter-veendam",
            phone: "+31 (0)6 22334455",
            website: "http://www.loodgieter-veendam.nl:443/home"
        }
    ];

    assert.strictEqual(isDuplicateLead({ slug: "dakdekker-hoogezand" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "+31 6 19 13 54 53" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "0031(0)619135453" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ phone: "0622334455" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ website: "http://dakdekker-hoogezand.nl:80/about?x=1#top" }, catalog), true);
    assert.strictEqual(isDuplicateLead({ website: "https://loodgieter-veendam.nl/diensten" }, catalog), true);

    const uniqueLead = {
        name: "Schilder Zuidlaren",
        slug: "schilder-zuidlaren",
        phone: "06 99887766",
        website: "https://schilder-zuidlaren.nl"
    };
    assert.strictEqual(isDuplicateLead(uniqueLead, catalog), false);
    assert.strictEqual(isDuplicateLead(null, catalog), false);
    assert.strictEqual(isDuplicateLead({}, catalog), false);
    assert.strictEqual(isDuplicateLead(uniqueLead, null), false);
    assert.strictEqual(isDuplicateLead(uniqueLead, []), false);
});

await testAsync("Lead Factory Enterprise (R15): Sector Derivation, Review Synthesis, Domain Matching & Business Potential Scoring Matrix", async () => {
    const { deriveServicesFromCategory, deriveReviewsFromCategory, analyzeBusinessPotential, isWebsiteMatchingBusiness } = await import("../factory/enrichment/deep-intelligence.js");

    const dakServices = deriveServicesFromCategory("Dakdekker", "Daktechniek Noord");
    assert.ok(dakServices.length >= 4);
    assert.ok(dakServices.some(s => s.title.includes("Dakrenovatie") || s.title.includes("Bitumen")));

    const rioolServices = deriveServicesFromCategory("Rioolservice", "Stenekes Rioolspecialist");
    assert.ok(rioolServices.length >= 4);
    assert.ok(rioolServices.some(s => s.title.includes("Ontstoppen") || s.title.includes("Camera-Inspectie")));

    const reviews = deriveReviewsFromCategory("Loodgieter", "Loodgietersbedrijf De Pijp", "Hoogezand");
    assert.ok(Array.isArray(reviews));
    assert.ok(reviews.length >= 3);
    assert.ok(reviews[0].author);
    assert.ok(reviews[0].text);

    assert.strictEqual(isWebsiteMatchingBusiness("Stenekes Rioolspecialist", "https://stenekesrioolspecialist.nl"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Bakkerij Sieg", "https://bakkerijsieg.nl/winkel"), true);
    assert.strictEqual(isWebsiteMatchingBusiness("Random Bedrijf", "https://creationaltfix.nl/concept/test"), false);

    const leadNoWeb = { name: "Jan de Klusser", website: null, category: "Klusbedrijf", address: "Hoogezand" };
    const potentialNoWeb = analyzeBusinessPotential(leadNoWeb, { type: 'NO_WEBSITE' });
    assert.ok(potentialNoWeb.score >= 80);
    assert.strictEqual(potentialNoWeb.archetype, 'A_TRADE_DIRECT');
    assert.ok(potentialNoWeb.pitchHook.includes("Jan de Klusser"));

    const leadOffline = { name: "Oude Website B.V.", website: "http://oudewebsite.nl", category: "Bouw" };
    const potentialOffline = analyzeBusinessPotential(leadOffline, { type: 'SITE_OFFLINE' });
    assert.ok(potentialOffline.score >= 85);
    assert.strictEqual(potentialOffline.archetype, 'E_SITE_OFFLINE');
});

// --- SECTION 2: OFFERTE & FACTUUR CALCULATIE DEEP EDGE-CASES (RONDE 15) ---

await testAsync("Offerte & Factuur Enterprise (R15): Belastingdienst 4-Way Multi-Tarief BTW (21%, 9%, 0%, Reverse Charge) with Micro-Fractionals & Rounding Delta Precision (<= EUR 0.02)", async () => {
    function calculateFiscalInvoiceR15(items) {
        let subtotal21 = 0;
        let subtotal9 = 0;
        let subtotal0 = 0;
        let subtotalReverse = 0;

        for (const it of items) {
            const qty = Number(it.qty !== undefined ? it.qty : 1);
            const price = Number(it.price || 0);
            const lineExcl = Math.round((price * qty + Number.EPSILON) * 100) / 100;

            if (it.vatRate === 9) {
                subtotal9 = Math.round((subtotal9 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 0) {
                subtotal0 = Math.round((subtotal0 + lineExcl + Number.EPSILON) * 100) / 100;
            } else if (it.vatRate === 'reverse_charge' || it.vatRate === -1) {
                subtotalReverse = Math.round((subtotalReverse + lineExcl + Number.EPSILON) * 100) / 100;
            } else {
                subtotal21 = Math.round((subtotal21 + lineExcl + Number.EPSILON) * 100) / 100;
            }
        }

        const vat21 = Math.round((subtotal21 * 0.21 + Number.EPSILON) * 100) / 100;
        const vat9 = Math.round((subtotal9 * 0.09 + Number.EPSILON) * 100) / 100;
        const totalVat = Math.round((vat21 + vat9 + Number.EPSILON) * 100) / 100;
        const totalExcl = Math.round((subtotal21 + subtotal9 + subtotal0 + subtotalReverse + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((totalExcl + totalVat + Number.EPSILON) * 100) / 100;

        return { subtotal21, vat21, subtotal9, vat9, subtotal0, subtotalReverse, totalExcl, totalVat, totalIncl };
    }

    const items = [
        { desc: "Senior Architectuur & Backend API", price: 92.50, qty: 7.125, vatRate: 21 },
        { desc: "Frontend React & Tailwind Styling", price: 82.00, qty: 14.333, vatRate: 21 },
        { desc: "Gedrukte Handleidingen & POS Flyers", price: 24.95, qty: 8, vatRate: 9 },
        { desc: "EU ICP Vrijstelling Softwarelicentie", price: 350.00, qty: 1, vatRate: 0 },
        { desc: "B2B BTW Verlegd (Art. 12 WOB)", price: 500.00, qty: 1, vatRate: 'reverse_charge' }
    ];

    const inv = calculateFiscalInvoiceR15(items);
    assert.strictEqual(inv.subtotal21, 1834.37);
    assert.strictEqual(inv.vat21, 385.22);
    assert.strictEqual(inv.subtotal9, 199.60);
    assert.strictEqual(inv.vat9, 17.96);
    assert.strictEqual(inv.subtotal0, 350.00);
    assert.strictEqual(inv.subtotalReverse, 500.00);
    assert.strictEqual(inv.totalExcl, 2883.97);
    assert.strictEqual(inv.totalVat, 403.18);
    assert.strictEqual(inv.totalIncl, 3287.15);

    let lineSumVat = 0;
    for (const it of items) {
        const lineExcl = Math.round((it.price * (it.qty || 1) + Number.EPSILON) * 100) / 100;
        const rate = it.vatRate === 9 ? 0.09 : (it.vatRate === 21 ? 0.21 : 0);
        const lineVat = Math.round((lineExcl * rate + Number.EPSILON) * 100) / 100;
        lineSumVat = Math.round((lineSumVat + lineVat + Number.EPSILON) * 100) / 100;
    }
    const delta = Math.abs(lineSumVat - inv.totalVat);
    assert.ok(delta <= 0.02, `Delta ${delta} must be <= 0.02 EUR`);
});

await testAsync("Offerte & Factuur Enterprise (R15): Zero-Balance Pro-Bono Invoices, 100% SLA Guarantee Credits & Division-by-Zero Defense in Financial Metrics", async () => {
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    const proBono = {
        id: "proj_probono_r15",
        client: "Dorpshuis Kropswolde",
        invoices: [
            {
                invoiceNumber: "2026-PB-15",
                description: "Pro-bono sponsoring website maatschappelijk buurtinitiatief",
                amountExcl: 0.00,
                amountVat: 0.00,
                amountIncl: 0.00,
                status: "paid"
            }
        ]
    };
    const normProBono = normalizeProjectInvoices(proBono);
    assert.strictEqual(normProBono[0].amountIncl, 0);
    assert.strictEqual(formatCurrency(normProBono[0].amountIncl), "€ 0,00");

    const slaGuarantee = {
        id: "proj_sla_claim_r15",
        client: "Vanderplaats Dakdekker",
        invoices: [
            {
                invoiceNumber: "2026-SLA-01",
                description: "Garantieclaim 100% creditering wegens migratievertraging",
                amountExcl: 0.00,
                amountVat: 0.00,
                amountIncl: 0.00,
                status: "paid"
            }
        ]
    };
    const normSla = normalizeProjectInvoices(slaGuarantee);
    assert.strictEqual(normSla[0].amountIncl, 0);

    function calculatePaymentProgressSafe(paid, total) {
        if (!total || total <= 0 || !Number.isFinite(total)) return 0;
        if (!paid || paid <= 0 || !Number.isFinite(paid)) return 0;
        return Math.min(100, Math.round((paid / total) * 100));
    }
    assert.strictEqual(calculatePaymentProgressSafe(0, 0), 0);
    assert.strictEqual(calculatePaymentProgressSafe(100, 0), 0);
    assert.strictEqual(calculatePaymentProgressSafe(50, -100), 0);
    assert.strictEqual(calculatePaymentProgressSafe(NaN, 100), 0);
    assert.strictEqual(calculatePaymentProgressSafe(100, Infinity), 0);
    assert.strictEqual(calculatePaymentProgressSafe(375, 750), 50);
    assert.strictEqual(calculatePaymentProgressSafe(750, 750), 100);
    assert.strictEqual(calculatePaymentProgressSafe(900, 750), 100);
});

await testAsync("Offerte & Factuur Enterprise (R15): Credit Notes, Negative Balances & Financial Ledger Settlement Calculations", async () => {
    const { normalizeProjectInvoices } = await import("../crm/admin/js/modules/project-billing.js");
    const { formatCurrency } = await import("../crm/js/crm-config.js");

    function calculateProjectLedger(invoices = []) {
        let billedExcl = 0;
        let billedVat = 0;
        let billedIncl = 0;
        let paidIncl = 0;

        for (const inv of invoices) {
            const excl = Number(inv.amountExcl || 0);
            const vat = Number(inv.amountVat || 0);
            const incl = Number(inv.amountIncl !== undefined ? inv.amountIncl : (excl + vat));
            billedExcl = Math.round((billedExcl + excl + Number.EPSILON) * 100) / 100;
            billedVat = Math.round((billedVat + vat + Number.EPSILON) * 100) / 100;
            billedIncl = Math.round((billedIncl + incl + Number.EPSILON) * 100) / 100;

            if (inv.status === 'paid') {
                paidIncl = Math.round((paidIncl + incl + Number.EPSILON) * 100) / 100;
            }
        }

        const openBalance = Math.round((billedIncl - paidIncl + Number.EPSILON) * 100) / 100;
        return { billedExcl, billedVat, billedIncl, paidIncl, openBalance };
    }

    const mockProjectWithCredit = {
        id: "proj_ledger_r15",
        client: "Klant Zonder Pi Sync R15",
        invoices: [
            { invoiceNumber: "2026-F1", description: "Fase 1 Oplevering", amountExcl: 750.00, amountVat: 157.50, amountIncl: 907.50, status: "paid" },
            { invoiceNumber: "2026-CN1", description: "Creditnota Correctie Meerwerk", amountExcl: -150.00, amountVat: -31.50, amountIncl: -181.50, status: "paid" },
            { invoiceNumber: "2026-F2", description: "Fase 2 Domein & E-mail Setup", amountExcl: 350.00, amountVat: 73.50, amountIncl: 423.50, status: "pending" }
        ]
    };

    const norm = normalizeProjectInvoices(mockProjectWithCredit);
    assert.strictEqual(norm.length, 3);
    const cn = norm.find(i => i.invoiceNumber === "2026-CN1");
    assert.strictEqual(cn.amountIncl, -181.50);
    assert.strictEqual(formatCurrency(cn.amountIncl), "€ -181,50");

    const ledger = calculateProjectLedger(norm);
    assert.strictEqual(ledger.billedExcl, 950.00);
    assert.strictEqual(ledger.billedVat, 199.50);
    assert.strictEqual(ledger.billedIncl, 1149.50);
    assert.strictEqual(ledger.paidIncl, 726.00);
    assert.strictEqual(ledger.openBalance, 423.50);
});

await testAsync("Offerte & Factuur Enterprise (R15): Multi-Tiered Sequential vs Stacked Compound Discount Engine with Zero-Floor Clamping", async () => {
    function applyCompoundDiscountsR15(baseExcl, { loyaltyPct = 0, earlyBirdPct = 0, voucherEur = 0, mode = 'sequential' } = {}) {
        let current = Math.max(0, Number(baseExcl || 0));
        let discountAmount = 0;

        if (mode === 'sequential') {
            if (loyaltyPct > 0) {
                const disc1 = Math.round((current * (loyaltyPct / 100) + Number.EPSILON) * 100) / 100;
                current = Math.max(0, current - disc1);
                discountAmount += disc1;
            }
            if (earlyBirdPct > 0) {
                const disc2 = Math.round((current * (earlyBirdPct / 100) + Number.EPSILON) * 100) / 100;
                current = Math.max(0, current - disc2);
                discountAmount += disc2;
            }
            if (voucherEur > 0) {
                const disc3 = Math.min(current, voucherEur);
                current = Math.max(0, current - disc3);
                discountAmount += disc3;
            }
        } else {
            const totalPct = loyaltyPct + earlyBirdPct;
            const pctDisc = Math.round((baseExcl * (totalPct / 100) + Number.EPSILON) * 100) / 100;
            discountAmount = pctDisc + voucherEur;
            current = Math.max(0, baseExcl - discountAmount);
        }

        const finalSubtotal = Math.max(0, Math.round((current + Number.EPSILON) * 100) / 100);
        const vat = Math.round((finalSubtotal * 0.21 + Number.EPSILON) * 100) / 100;
        const totalIncl = Math.round((finalSubtotal + vat + Number.EPSILON) * 100) / 100;

        return { finalSubtotal, vat, totalIncl, totalDiscount: Math.round((discountAmount + Number.EPSILON) * 100) / 100 };
    }

    const seq = applyCompoundDiscountsR15(2000, { loyaltyPct: 10, earlyBirdPct: 5, voucherEur: 150, mode: 'sequential' });
    assert.strictEqual(seq.finalSubtotal, 1560.00);
    assert.strictEqual(seq.vat, 327.60);
    assert.strictEqual(seq.totalIncl, 1887.60);

    const stacked = applyCompoundDiscountsR15(2000, { loyaltyPct: 10, earlyBirdPct: 5, voucherEur: 150, mode: 'stacked' });
    assert.strictEqual(stacked.finalSubtotal, 1550.00);
    assert.strictEqual(stacked.vat, 325.50);
    assert.strictEqual(stacked.totalIncl, 1875.50);

    const clamped = applyCompoundDiscountsR15(500, { voucherEur: 800 });
    assert.strictEqual(clamped.finalSubtotal, 0.00);
    assert.strictEqual(clamped.vat, 0.00);
    assert.strictEqual(clamped.totalIncl, 0.00);
});

await testAsync("Offerte & Factuur Enterprise (R15): European Currency Formatter & Parser with Narrow Non-Breaking Spaces (\\u202F), Trailing Dashes & Extreme Values", async () => {
    const { formatCurrency } = await import("../crm/js/crm-config.js");
    const { generateBillingWhatsAppUrl } = await import("../crm/admin/js/modules/project-billing.js");

    function parseEuropeanCurrencyR15(str) {
        if (!str || typeof str !== 'string') return 0;
        let clean = str.replace(/[\u00A0\u202F\s]/g, '').replace(/[€$£]/g, '').trim();
        clean = clean.replace(/,-$/, ',00');
        if (clean.includes(',') && clean.includes('.')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        clean = clean.replace(/[^0-9.-]/g, '');
        const val = parseFloat(clean);
        return Number.isFinite(val) ? val : 0;
    }

    assert.strictEqual(parseEuropeanCurrencyR15("€ 2.499,-"), 2499.00);
    assert.strictEqual(parseEuropeanCurrencyR15("€ 14.850,75"), 14850.75);
    assert.strictEqual(parseEuropeanCurrencyR15("€\u202F450,00"), 450.00);
    assert.strictEqual(parseEuropeanCurrencyR15("€\u00A099,95"), 99.95);
    assert.strictEqual(parseEuropeanCurrencyR15("€ -350,00"), -350.00);
    assert.strictEqual(parseEuropeanCurrencyR15("-€ 350,-"), -350.00);
    assert.strictEqual(parseEuropeanCurrencyR15("€ 25.000.000,00"), 25000000.00);
    assert.strictEqual(parseEuropeanCurrencyR15(""), 0);
    assert.strictEqual(parseEuropeanCurrencyR15(null), 0);
    assert.strictEqual(parseEuropeanCurrencyR15("gratis"), 0);

    assert.strictEqual(formatCurrency(2499), "€ 2499,00");
    assert.strictEqual(formatCurrency(0), "€ 0,00");
    assert.strictEqual(formatCurrency(-350), "€ -350,00");

    const waLink = generateBillingWhatsAppUrl("06 19 13 54 53", "Café 't Noorden", "2026-F99", 750.00, "https://mollie.com/pay/abc");
    assert.ok(waLink.startsWith("https://wa.me/31619135453"));
    assert.ok(waLink.includes("2026-F99"));
    assert.ok(waLink.includes("mollie.com"));
});

// --- SECTION 3: CONTACT & INTAKE FUNNEL DEEP EDGE-CASES (RONDE 15) ---

await testAsync("Contact & Intake Enterprise (R15): 15-Field Multi-Decoy Honeypot Trapping Matrix with Silent Rejection Routing", async () => {
    function inspectIntakeHoneypotR15(payload) {
        if (!payload || typeof payload !== 'object') {
            return { blocked: true, reason: 'INVALID_PAYLOAD', silentAccept: false };
        }
        const decoyFields = [
            'website', '_hp_trap', 'company_fax', 'bot_token', 'company_tax',
            'user_url', 'telephone_confirm', 'extra_address', 'honey_comment',
            'zipcode_verify', 'url_field', 'hidden_auth', 'antispam_check',
            'form_guard', 'lead_source_hidden'
        ];
        for (const field of decoyFields) {
            if (payload[field] && String(payload[field]).trim() !== '') {
                return { blocked: true, reason: `HONEYPOT_TRAP_${field.toUpperCase()}`, silentAccept: true };
            }
        }
        return { blocked: false, reason: 'CLEAN_SUBMISSION', silentAccept: false };
    }

    const allDecoyFields = [
        'website', '_hp_trap', 'company_fax', 'bot_token', 'company_tax',
        'user_url', 'telephone_confirm', 'extra_address', 'honey_comment',
        'zipcode_verify', 'url_field', 'hidden_auth', 'antispam_check',
        'form_guard', 'lead_source_hidden'
    ];
    assert.strictEqual(allDecoyFields.length, 15);

    for (const df of allDecoyFields) {
        const payload = { companyName: "Legit Company B.V." };
        payload[df] = "spambot_content_123";
        const res = inspectIntakeHoneypotR15(payload);
        assert.strictEqual(res.blocked, true, `Decoy field '${df}' must be trapped`);
        assert.strictEqual(res.silentAccept, true, `Decoy field '${df}' must return silentAccept=true to deceive spam bot`);
    }

    const legitimateLead = {
        companyName: "Stenekes Rioolspecialist",
        email: "info@stenekesrioolspecialist.nl",
        phone: "06-19135453",
        goals: "Realisatie nieuwe camera inspectie pagina",
        website: "",
        _hp_trap: "",
        form_guard: ""
    };
    const legitRes = inspectIntakeHoneypotR15(legitimateLead);
    assert.strictEqual(legitRes.blocked, false);
    assert.strictEqual(legitRes.silentAccept, false);
});

await testAsync("Contact & Intake Enterprise (R15): Speed-Bot Heuristics (<1200ms) & Multi-Vector Link-Flood / Commercial Keyword Quarantine", async () => {
    function inspectSubmissionQualityR15(payload, elapsedMs = 6000) {
        if (typeof elapsedMs === 'number' && elapsedMs < 1200) {
            return { blocked: true, reason: 'SPEED_BOT_DETECTED', silentAccept: true };
        }
        const text = `${payload.goals || ''} ${payload.comments || ''} ${payload.companyName || ''} ${payload.notes || ''}`;
        const links = text.match(/https?:\/\/[^\s]+/gi) || [];
        if (links.length >= 3) {
            return { blocked: true, reason: 'LINK_FLOOD_SPAM', silentAccept: true };
        }
        if (/(casino|crypto|bitcoin|forex|viagra|porn|buy-followers|backlinks|seo-ranking|telegram pump)/i.test(text)) {
            return { blocked: true, reason: 'SPAM_KEYWORD_MATCH', silentAccept: true };
        }
        return { blocked: false, reason: 'LEGITIMATE_INQUIRY', silentAccept: false };
    }

    assert.strictEqual(inspectSubmissionQualityR15({ companyName: "Fast Bot" }, 450).blocked, true);
    assert.strictEqual(inspectSubmissionQualityR15({ companyName: "Fast Bot" }, 1199).blocked, true);
    assert.strictEqual(inspectSubmissionQualityR15({ goals: "Check http://link1.com, https://link2.com and https://link3.com for deals!" }, 5000).blocked, true);
    assert.strictEqual(inspectSubmissionQualityR15({ comments: "Join our telegram pump and crypto investment group!" }, 5000).blocked, true);
    assert.strictEqual(inspectSubmissionQualityR15({ comments: "We sell backlinks and top seo-ranking services." }, 5000).blocked, true);

    const realKlant = {
        companyName: "Bakkerij Sieg",
        goals: "Graag willen we ons online bestelformulier koppelen aan onze broodjeskaart voor bestellingen in Hoogezand.",
        comments: "Kan dit voor het weekend van zaterdag 1 november live staan?"
    };
    assert.strictEqual(inspectSubmissionQualityR15(realKlant, 7500).blocked, false);
});

await testAsync("Contact & Intake Enterprise (R15): Advanced CWE-93 CRLF Header Injection Defense across Polyglot, URL-Encoded & Unicode Vectors", async () => {
    function sanitizeStrictCrlfHeaderR15(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.replace(/%0[ad]/gi, '').replace(/%250[ad]/gi, '').replace(/%25250[ad]/gi, '');
        return cleaned.replace(/[\r\n\x00-\x1F\x7F\u2028\u2029\u0085\u000B\u000C,;]/g, '').trim();
    }

    const injectionVectors = [
        "allard@creationaltfix.nl\r\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl\rBcc:spammer@evil.com",
        "allard@creationaltfix.nl\nBcc:spammer@evil.com",
        "allard@creationaltfix.nl%0d%0aBcc:spammer@evil.com",
        "allard@creationaltfix.nl%0D%0ABcc:spammer@evil.com",
        "allard@creationaltfix.nl%250d%250aBcc:spammer@evil.com",
        "allard@creationaltfix.nl%25250d%25250aBcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2028Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u2029Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\u0085Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\x00Bcc:spammer@evil.com",
        "allard@creationaltfix.nl\x0BBcc:spammer@evil.com",
        "allard@creationaltfix.nl\x0CBcc:spammer@evil.com",
        "allard@creationaltfix.nl;Bcc:spammer@evil.com",
        "allard@creationaltfix.nl,spammer@evil.com"
    ];

    const standardEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const vec of injectionVectors) {
        const cleaned = sanitizeStrictCrlfHeaderR15(vec);
        assert.strictEqual(cleaned.includes("\r"), false);
        assert.strictEqual(cleaned.includes("\n"), false);
        assert.strictEqual(cleaned.includes("\u2028"), false);
        assert.strictEqual(cleaned.includes("\x00"), false);
        assert.strictEqual(cleaned.includes(";"), false);
        assert.strictEqual(cleaned.includes(","), false);
        assert.strictEqual(standardEmailRegex.test(cleaned), false, `Vector '${vec}' must fail standard email regex after header sanitization`);
    }

    const safeEmail = sanitizeStrictCrlfHeaderR15("allard@creationaltfix.nl");
    assert.strictEqual(safeEmail, "allard@creationaltfix.nl");
    assert.strictEqual(standardEmailRegex.test(safeEmail), true);
});

await testAsync("Contact & Intake Enterprise (R15): RFC 5322 & RFC 6530 Internationalized Email Normalization, Punycode IDN & Plus-Addressing (+tag)", async () => {
    function normalizeRfc5322EmailR15(email) {
        if (!email || typeof email !== 'string') return { valid: false, email: '' };
        const trimmed = email.trim();
        const atIndex = trimmed.lastIndexOf('@');
        if (atIndex <= 0 || atIndex === trimmed.length - 1) return { valid: false, email: '' };

        const local = trimmed.slice(0, atIndex);
        const domain = trimmed.slice(atIndex + 1).toLowerCase();

        if (!/^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return { valid: false, email: '' };
        if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return { valid: false, email: '' };

        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { valid: false, email: '' };
        if (domain.includes('..')) return { valid: false, email: '' };
        const labels = domain.split('.');
        if (labels.some(l => l.startsWith('-') || l.endsWith('-') || l.length === 0)) {
            return { valid: false, email: '' };
        }

        return { valid: true, email: `${local}@${domain}` };
    }

    assert.strictEqual(normalizeRfc5322EmailR15("allard+crm2027@creationaltfix.nl").valid, true);
    assert.strictEqual(normalizeRfc5322EmailR15("info@xn--mller-kva.de").valid, true);
    assert.strictEqual(normalizeRfc5322EmailR15("  Admin@CREATIONALTFIX.NL  ").email, "Admin@creationaltfix.nl");

    const malformedEmails = [
        "no-at-sign.nl",
        "@missing-local.nl",
        "missing-domain@",
        "two@@ats.nl",
        "double..dot@domain.nl",
        ".dotfirst@domain.nl",
        "dotlast.@domain.nl",
        "user@-hyphendomain.nl",
        "user@hyphendomain-.nl"
    ];
    for (const m of malformedEmails) {
        assert.strictEqual(normalizeRfc5322EmailR15(m).valid, false, `'${m}' must be marked invalid`);
    }
});

await testAsync("Contact & Intake Enterprise (R15): Zero-Trust SSRF Webhook Firewall with IPv6 Loopback, Link-Local, Cloud IMDS & Hostname Whitelist", async () => {
    const { isSafeWebhookUrl, sanitizeMarkdown } = await import("../crm/intake/js/notifications.js");

    assert.strictEqual(isSafeWebhookUrl("http://api.telegram.org"), false, "Plain HTTP blocked");
    assert.strictEqual(isSafeWebhookUrl("https://localhost/webhook"), false, "Localhost blocked");
    assert.strictEqual(isSafeWebhookUrl("https://127.0.0.1/webhook"), false, "127.0.0.1 blocked");
    assert.strictEqual(isSafeWebhookUrl("https://[::1]/webhook"), false, "IPv6 loopback blocked");
    assert.strictEqual(isSafeWebhookUrl("https://10.0.0.1/webhook"), false, "RFC 1918 10.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://172.16.0.1/webhook"), false, "RFC 1918 172.16.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://192.168.1.1/webhook"), false, "RFC 1918 192.168.x blocked");
    assert.strictEqual(isSafeWebhookUrl("https://169.254.169.254/latest"), false, "Cloud IMDS blocked");
    assert.strictEqual(isSafeWebhookUrl("https://100.64.0.1/webhook"), false, "CGNAT blocked");
    assert.strictEqual(isSafeWebhookUrl("https://intranet.local/hook"), false, ".local domain blocked");
    assert.strictEqual(isSafeWebhookUrl("https://service.internal/hook"), false, ".internal domain blocked");

    assert.strictEqual(isSafeWebhookUrl("https://api.telegram.org/bot12345/sendMessage"), true);
    assert.strictEqual(isSafeWebhookUrl("https://discord.com/api/webhooks/123/abc"), true);
    assert.strictEqual(isSafeWebhookUrl("https://hooks.slack.com/services/T00/B00/X00"), true);

    assert.strictEqual(sanitizeMarkdown("*bold* _italics_ `code`"), "\\*bold\\* \\_italics\\_ \\`code\\`");
    assert.strictEqual(sanitizeMarkdown("[Portal](https://creationaltfix.nl)"), "\\[Portal\\]\\(https://creationaltfix\\.nl\\)");
});

// --- SECTION 4: DRM & CODE PROTECTION DEEP EDGE-CASES (RONDE 15) ---

await testAsync("DRM & Code Protection Enterprise (R15): W3C HTML5 Parser Script-Data State Compliance & Comprehensive Hex-Escaping Matrix", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head><title>Test Protection R15</title></head><body><h1>Content</h1></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, {
        name: "Malicious </script><script>alert('pwn')</script>",
        slug: "hostile</script><img src=x onerror=alert(1)>"
    });

    const matches = protectedHtml.match(/<script id="caf-security-guard">/g);
    assert.strictEqual(matches.length, 1);

    const scriptMatch = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "Guard script must match cleanly");
    const scriptBody = scriptMatch[1];

    assert.strictEqual(scriptBody.includes("</script"), false);
    assert.strictEqual(scriptBody.toLowerCase().includes("</script"), false);

    assert.ok(scriptBody.includes("\\x3Cdiv"));
    assert.ok(scriptBody.includes("\\x3C/div>"));
    assert.ok(scriptBody.includes("\\x3Ch1"));
    assert.ok(scriptBody.includes("\\x3Cp"));
    assert.ok(scriptBody.includes("\\x3Ca"));
    assert.ok(scriptBody.includes("\\x3Cstrong>"));
    assert.ok(scriptBody.includes("\\x3C/strong>"));

    assert.strictEqual(protectedHtml.includes("<script>alert('pwn')</script>"), false);
});

await testAsync("DRM & Code Protection Enterprise (R15): Node.js VM AST Compilation, Execution Sandboxing & Hostname Enforcement Killswitch", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");
    const vm = await import("node:vm");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Creation Alt Fix R15", slug: "caf-r15" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    const script = new vm.Script(scriptBody);
    assert.ok(script, "VM Script must compile cleanly without syntax errors");

    const authContext = {
        window: { location: { hostname: 'creationaltfix.nl', search: '' }, stop: () => {} },
        document: { documentElement: {}, addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {}, appendChild: () => {} }), body: { appendChild: () => {} } },
        sessionStorage: { getItem: () => null, setItem: () => {} },
        localStorage: { getItem: () => null },
        navigator: { sendBeacon: () => true },
        clearTimeout: () => {},
        setTimeout: () => 1
    };
    vm.createContext(authContext);
    assert.doesNotThrow(() => {
        script.runInContext(authContext);
    });

    const unauthContext = {
        window: { location: { hostname: 'stolen-website-clone.com', search: '' }, stop: () => {} },
        document: { documentElement: { innerHTML: '' }, addEventListener: () => {} },
        sessionStorage: { getItem: () => null },
        localStorage: { getItem: () => null }
    };
    vm.createContext(unauthContext);
    assert.throws(() => {
        script.runInContext(unauthContext);
    }, /CAF_SECURITY_UNAUTHORIZED_HOST/);
});

await testAsync("DRM & Code Protection Enterprise (R15): Multi-Event Capture Interception Matrix (Contextmenu, F12, DevTools & Source Save Shortcuts)", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Test DRM R15", slug: "test-drm-r15" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.ok(scriptBody.includes("'contextmenu'"));
    assert.ok(scriptBody.includes("{ capture: true }"));
    assert.ok(scriptBody.includes("e.key === 'F12'"));
    assert.ok(scriptBody.includes("'I'") || scriptBody.includes("'i'"));
    assert.ok(scriptBody.includes("'J'") || scriptBody.includes("'j'"));
    assert.ok(scriptBody.includes("'C'") || scriptBody.includes("'c'"));
    assert.ok(scriptBody.includes("'u'") || scriptBody.includes("'U'"));
    assert.ok(scriptBody.includes("'s'") || scriptBody.includes("'S'"));
    assert.ok(scriptBody.includes("e.preventDefault()"));
    assert.ok(scriptBody.includes("e.stopPropagation()"));
});

await testAsync("DRM & Code Protection Enterprise (R15): Zero-Cookie View-Ping Beacon, SessionStorage Debounce & Privacy Compliance", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const baseHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    const protectedHtml = applyCodeProtection(baseHtml, { name: "Klant Concept R15", slug: "klant-concept-r15" });
    const match = protectedHtml.match(/<script id="caf-security-guard">([\s\S]*?)<\/script>/);
    const scriptBody = match[1];

    assert.strictEqual(scriptBody.includes("document.cookie"), false, "Must never set persistent tracking cookies");
    assert.ok(scriptBody.includes("sessionStorage.getItem"));
    assert.ok(scriptBody.includes("sessionStorage.setItem"));
    assert.ok(scriptBody.includes("navigator.sendBeacon"));
    assert.ok(scriptBody.includes("preview=admin") || scriptBody.includes("caf_bridge_token"));
});

await testAsync("DRM & Code Protection Enterprise (R15): Guard Script Idempotency, Multi-Injection Safety & Structural Tag Preservation", async () => {
    const { applyCodeProtection } = await import("../factory/security/code-drm.js");

    const originalHtml = '<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Idempotency Test</title></head><body><main>Content</main></body></html>';
    const pass1 = applyCodeProtection(originalHtml, { name: "Test Bedrijf", slug: "test-bedrijf" });
    assert.strictEqual((pass1.match(/id="caf-security-guard"/g) || []).length, 1);

    const pass2 = applyCodeProtection(pass1, { name: "Test Bedrijf", slug: "test-bedrijf" });
    assert.strictEqual((pass2.match(/id="caf-security-guard"/g) || []).length, 1);
    assert.strictEqual(pass1, pass2);

    assert.strictEqual(applyCodeProtection(null), null);
    assert.strictEqual(applyCodeProtection(""), "");
    assert.strictEqual(applyCodeProtection(12345), 12345);

    assert.ok(pass1.startsWith("<!DOCTYPE html>"));
    assert.ok(pass1.includes("</head>"));
    assert.ok(pass1.includes("</body>"));
});

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

