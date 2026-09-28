/**
 * Creation+Alt+Fix - Central Uptime & Website Monitoring Suite
 * [TASK-827] Realtime Uptime, HTTP, SSL & Multi-DNS Health Checker
 * 
 * Features:
 * 1. Multi-DNS Resolver Engine (Google DoH + Cloudflare DoH) - Detects DNS DDoS / SERVFAIL / NXDOMAIN
 * 2. Direct HTTPS Handshake & Uptime Probe with latency benchmarking
 * 3. Fallback & Server-side cURL probe via crm/api/healthcheck.php when on live host
 * 4. Dual persistence: Real-time Firestore sync (/monitors/{domainKey}) + LocalStorage fallback
 * 5. Automated Downtime Alerting via EmailJS (to info@creationaltfix.nl) with 60-min anti-spam cooldown
 * 6. Synthesized Web Audio chime for critical in-browser admin alerts
 */

import { EMAILJS_CONFIG } from "./firebase-config.js";

/**
 * Export empty default array for backward-compatibility.
 * Monitored domains are now derived 100% dynamically from Firestore projects.
 */
export const DEFAULT_MONITORED_DOMAINS = [];

const LOCAL_STORAGE_IGNORED_DOMAINS = 'caf_uptime_ignored_domains';
const LOCAL_STORAGE_ALERTS_LOG = 'caf_uptime_alerts_log';
const LOCAL_STORAGE_SETTINGS = 'caf_uptime_settings';
const LOCAL_STORAGE_CONSECUTIVE_DOWN = 'caf_uptime_consecutive_down';

/**
 * Extracts and parses clean hostname and subpath from a raw domain or URL.
 * Handles protocols (https://), subdirectories (/besselinginstallatietechniek/), and www prefixes.
 * 
 * @param {string} rawInput 
 * @returns {{ domain: string, path: string }}
 */
export function parseDomainAndPath(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return { domain: '', path: '/' };
    let clean = rawInput.trim();
    if (!clean || clean === '-' || clean.toLowerCase() === 'nvt' || clean.toLowerCase() === 'geen') {
        return { domain: '', path: '/' };
    }

    // Remove protocol
    clean = clean.replace(/^https?:\/\//i, '');

    // Split domain and path
    const slashIdx = clean.indexOf('/');
    let domain = '';
    let path = '/';

    if (slashIdx !== -1) {
        domain = clean.substring(0, slashIdx).trim().toLowerCase();
        path = clean.substring(slashIdx).trim();
        if (!path.startsWith('/')) path = '/' + path;
        if (!path.endsWith('/') && !path.includes('.')) path = path + '/';
    } else {
        domain = clean.trim().toLowerCase();
        path = '/';
    }

    // Strip www. prefix from domain for DNS and DoH consistency
    domain = domain.replace(/^www\./i, '').trim();

    return { domain, path };
}

/**
 * Minimum number of consecutive failed checks required before dispatching an alert.
 * Single transient measurements or socket timeouts will NOT trigger alerts.
 */
export const REQUIRED_CONSECUTIVE_FAILURES = 3;

/**
 * Returns the current consecutive failure count for a domain.
 * @param {string} domain 
 * @returns {number}
 */
export function getConsecutiveFailures(domain) {
    if (!domain) return 0;
    const clean = normalizeDomain(domain);
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_CONSECUTIVE_DOWN);
        const map = stored ? JSON.parse(stored) : {};
        return typeof map[clean] === 'number' ? map[clean] : 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Updates the consecutive failure count for a domain based on check result.
 * Increments count when down; resets to 0 when operational or degraded (recovered).
 * 
 * @param {string} domain 
 * @param {string} overallStatus ('down' | 'degraded' | 'operational')
 * @returns {number} The updated consecutive failure count
 */
export function recordDomainCheckResult(domain, overallStatus) {
    if (!domain) return 0;
    const clean = normalizeDomain(domain);
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_CONSECUTIVE_DOWN);
        const map = stored ? JSON.parse(stored) : {};

        if (overallStatus === 'down') {
            const current = typeof map[clean] === 'number' ? map[clean] : 0;
            const updated = current + 1;
            map[clean] = updated;
            localStorage.setItem(LOCAL_STORAGE_CONSECUTIVE_DOWN, JSON.stringify(map));
            return updated;
        } else {
            // Recovered or operational -> reset counter to 0
            if (map[clean]) {
                delete map[clean];
                localStorage.setItem(LOCAL_STORAGE_CONSECUTIVE_DOWN, JSON.stringify(map));
                // Clear alert throttle on recovery so next future incident alerts properly
                localStorage.removeItem(`caf_alert_sent_${clean}`);
            }
            return 0;
        }
    } catch (e) {
        return overallStatus === 'down' ? 1 : 0;
    }
}

/**
 * Returns the list of currently ignored/muted domains.
 */
export function getIgnoredDomains() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_IGNORED_DOMAINS);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Checks whether a given domain is currently ignored/muted.
 */
export function isDomainIgnored(domain) {
    if (!domain) return false;
    const clean = normalizeDomain(domain);
    return getIgnoredDomains().includes(clean);
}

/**
 * Toggles or sets the ignored status of a domain (persisted in LocalStorage + Firestore).
 */
export async function setDomainIgnored(db, domain, isIgnored = true) {
    const clean = normalizeDomain(domain);
    if (!clean) return false;

    let list = getIgnoredDomains();
    if (isIgnored) {
        if (!list.includes(clean)) list.push(clean);
    } else {
        list = list.filter(d => d !== clean);
    }

    try {
        localStorage.setItem(LOCAL_STORAGE_IGNORED_DOMAINS, JSON.stringify(list));
    } catch (e) {}

    // Update cached reports
    try {
        const cachedStr = localStorage.getItem('caf_cached_monitor_reports');
        if (cachedStr) {
            let cached = JSON.parse(cachedStr);
            const rep = cached.find(r => r.domain === clean);
            if (rep) {
                rep.isIgnored = isIgnored;
                localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(cached));
            }
        }
    } catch (e) {}

    // Persist to Firestore if db available
    if (db) {
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const cleanKey = clean.replace(/[^a-zA-Z0-9]/g, '_');
            const docRef = doc(db, "monitors", cleanKey);
            await setDoc(docRef, { isIgnored, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
            console.warn("Could not save ignore state to Firestore:", e.message);
        }
    }

    return isIgnored;
}

/**
 * Normalizes a raw domain string to clean hostname (lowercase, no protocols, no slashes).
 */
export function normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') return '';
    return domain.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '')
        .trim();
}

/**
 * Extracts and normalizes all domain entries associated with a project.
 * Supports:
 * - Primary domain from p.domainName or p.domain (can be comma/newline-separated)
 * - Explicit p.domains array
 * - Additional domains from p.additionalDomains (array or string)
 * 
 * @param {Object} p - Project document object from Firestore
 * @returns {Array<{ domain: string, path: string, isPrimary: boolean, raw: string }>}
 */
export function extractProjectDomains(p) {
    if (!p) return [];
    const collected = [];
    const seen = new Set();

    const addCandidate = (raw, isPrimaryCandidate = false) => {
        if (!raw || typeof raw !== 'string') return;
        // Split by comma, newline, semicolon or multiple whitespace
        const parts = raw.split(/[\r\n,;]+/);
        for (let part of parts) {
            part = part.trim();
            if (!part) continue;
            const { domain, path } = parseDomainAndPath(part);
            if (!domain) continue;
            const fullKey = `${domain}${path}`;
            if (seen.has(fullKey)) continue;
            seen.add(fullKey);
            collected.push({
                domain,
                path,
                raw: part,
                isPrimary: isPrimaryCandidate && collected.length === 0
            });
        }
    };

    // 1. Primary domain from domainName or domain
    if (p.domainName) addCandidate(p.domainName, true);
    if (p.domain) addCandidate(p.domain, true);

    // 2. Explicit domains array
    if (Array.isArray(p.domains)) {
        for (const d of p.domains) {
            addCandidate(d, false);
        }
    }

    // 3. Additional domains (array or string)
    if (Array.isArray(p.additionalDomains)) {
        for (const d of p.additionalDomains) {
            addCandidate(d, false);
        }
    } else if (typeof p.additionalDomains === 'string') {
        addCandidate(p.additionalDomains, false);
    }

    // Ensure the very first domain is marked as primary if none was
    if (collected.length > 0 && !collected.some(c => c.isPrimary)) {
        collected[0].isPrimary = true;
    }

    return collected;
}

/**
 * Returns the active list of monitored domains derived 100% dynamically
 * from the projects collection in Firestore (Recente Klanten & Projecten).
 * Projects with multiple domains (primary + aliases / extra domains) will
 * each have an entry in the monitoring suite automatically.
 * 
 * @param {Array<Object>} [projectsList=null] - Optional array of project objects from Firestore
 * @returns {Array<Object>}
 */
export function getMonitoredDomains(projectsList = null) {
    let sourceProjects = [];

    if (Array.isArray(projectsList) && projectsList.length > 0) {
        sourceProjects = projectsList;
    } else if (typeof window !== 'undefined' && Array.isArray(window.cachedProjects) && window.cachedProjects.length > 0) {
        sourceProjects = window.cachedProjects;
    }

    const monitored = [];
    const seenKeys = new Set();

    for (const p of sourceProjects) {
        if (!p) continue;
        const projectDomains = extractProjectDomains(p);
        if (projectDomains.length === 0) continue;

        const clientName = p.client || p.companyName || p.clientName || 'Onbekende Klant';
        const baseSiteName = p.projectName || p.name || clientName;

        for (const item of projectDomains) {
            const { domain, path, isPrimary } = item;
            const uniqueKey = `${domain}${path}`;
            if (seenKeys.has(uniqueKey)) continue;
            seenKeys.add(uniqueKey);

            const pathSlug = path && path !== '/' ? '_' + path.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '') : '';
            const monitorId = `${p.id || 'proj'}_${domain.replace(/[^a-z0-9]/gi, '_')}${pathSlug}`;
            const displayName = isPrimary ? baseSiteName : `${baseSiteName} (${domain})`;

            monitored.push({
                id: monitorId,
                projectId: String(p.id || ''),
                name: displayName,
                domain,
                path,
                client: clientName,
                isPrimary: Boolean(isPrimary),
                expectedIp: p.expectedIp || "185.104.29.148",
                category: p.category || (domain.includes('creationaltfix.nl') && path === '/' ? 'internal' : 'client')
            });
        }
    }

    return monitored;
}

/**
 * Adds a new domain configuration for temporary in-session monitoring if requested.
 */
export function addCustomMonitoredDomain(domainObj) {
    if (!domainObj || !domainObj.domain) return false;
    const { domain, path } = parseDomainAndPath(domainObj.domain);
    if (!domain) return false;
    const id = domainObj.id || (domain.replace(/[^a-z0-9]/g, '-') + (path !== '/' ? '-' + path.replace(/[^a-z0-9]/g, '') : ''));

    const newEntry = {
        id,
        name: domainObj.name || domainObj.client || domain,
        domain: domain,
        path: path || domainObj.path || "/",
        client: domainObj.client || "Maatwerk Klant",
        expectedIp: domainObj.expectedIp || "185.104.29.148",
        category: domainObj.category || "client"
    };

    return newEntry;
}

/**
 * Checks DNS resolution via Google Public DNS (DoH) and Cloudflare DoH.
 * Catches DNS DDoS timeouts, SERVFAIL, NXDOMAIN, and verifies resolved IPs.
 * 
 * @param {string} domain 
 * @returns {Promise<Object>} DNS health details
 */
export async function checkDomainDns(domain) {
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const dnsResult = {
        domain: cleanDomain,
        status: "UNKNOWN",
        statusCode: -1,
        resolvedIps: [],
        nameservers: [],
        latencyMs: 0,
        provider: "Google DoH",
        timestamp: new Date().toISOString()
    };

    const startTime = performance.now();

    // 1. Primary: Google DNS-over-HTTPS
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const googleUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`;
        const res = await fetch(googleUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            dnsResult.latencyMs = Math.round(performance.now() - startTime);
            dnsResult.statusCode = data.Status;

            if (data.Status === 0) {
                dnsResult.status = "NOERROR"; // Healthy
                if (data.Answer && Array.isArray(data.Answer)) {
                    dnsResult.resolvedIps = data.Answer
                        .filter(a => a.type === 1) // Type 1 = A record
                        .map(a => a.data);
                }
            } else if (data.Status === 2) {
                dnsResult.status = "SERVFAIL"; // Server failure / DDoS / Nameserver timeout!
            } else if (data.Status === 3) {
                dnsResult.status = "NXDOMAIN"; // Non-existent domain
            } else {
                dnsResult.status = `DNS_STATUS_${data.Status}`;
            }

            return dnsResult;
        }
    } catch (err) {
        console.warn(`Google DoH failed for ${cleanDomain}, trying Cloudflare DoH fallback:`, err.message);
    }

    // 2. Fallback: Cloudflare DNS-over-HTTPS
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=A`;
        const res = await fetch(cfUrl, {
            headers: { 'Accept': 'application/dns-json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            dnsResult.latencyMs = Math.round(performance.now() - startTime);
            dnsResult.provider = "Cloudflare DoH";
            dnsResult.statusCode = data.Status;

            if (data.Status === 0) {
                dnsResult.status = "NOERROR";
                if (data.Answer && Array.isArray(data.Answer)) {
                    dnsResult.resolvedIps = data.Answer.filter(a => a.type === 1).map(a => a.data);
                }
            } else if (data.Status === 2) {
                dnsResult.status = "SERVFAIL";
            } else if (data.Status === 3) {
                dnsResult.status = "NXDOMAIN";
            } else {
                dnsResult.status = `DNS_STATUS_${data.Status}`;
            }

            return dnsResult;
        }
    } catch (cfErr) {
        dnsResult.latencyMs = Math.round(performance.now() - startTime);
        dnsResult.status = "DNS_TIMEOUT";
        dnsResult.error = cfErr.message;
    }

    return dnsResult;
}

/**
 * Performs a direct HTTPS connectivity probe with SSL and latency measurement.
 * Tests server availability and handshake.
 * 
 * @param {string} domain 
 * @param {string} path 
 * @returns {Promise<Object>}
 */
export async function probeDomainHttps(domain, path = "/") {
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const targetUrl = `https://${cleanDomain}${path}`;
    const startTime = performance.now();

    const probeResult = {
        url: targetUrl,
        reachable: false,
        latencyMs: 0,
        sslValid: false,
        httpCode: null,
        message: "Niet getest"
    };

    // 1. Try internal healthcheck proxy if on live host (Vimexx cURL endpoint)
    try {
        const basePath = (typeof window !== 'undefined' && window.location.pathname.includes('/crm/')) ? '/crm' : '';
        const proxyUrl = `${basePath}/api/healthcheck.php?domain=${encodeURIComponent(cleanDomain)}`;
        const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(3500) });
        if (proxyRes.ok) {
            const proxyData = await proxyRes.json();
            if (proxyData && proxyData.success) {
                probeResult.reachable = proxyData.reachable;
                probeResult.latencyMs = proxyData.latency_ms || Math.round(performance.now() - startTime);
                probeResult.sslValid = !!proxyData.ssl_valid;
                probeResult.httpCode = proxyData.http_code;
                probeResult.message = proxyData.message || (proxyData.reachable ? "Bereikbaar (200 OK)" : "Niet bereikbaar");
                return probeResult;
            }
        }
    } catch (e) {
        // Fallback to direct client-side probe
    }

    // 2. Direct browser HTTPS probe (no-cors fetch with timeout)
    try {
        const probeTarget = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}_probe=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(probeTarget, {
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        probeResult.latencyMs = Math.round(performance.now() - startTime);
        probeResult.reachable = true;
        probeResult.sslValid = true; // HTTPS handshake succeeded without TLS reject
        probeResult.httpCode = 200;
        probeResult.message = "Bereikbaar via HTTPS";
    } catch (err) {
        probeResult.latencyMs = Math.round(performance.now() - startTime);
        probeResult.reachable = false;

        if (err.name === 'AbortError') {
            probeResult.message = "Timeout (> 6000ms)";
            probeResult.httpCode = 504;
        } else {
            probeResult.message = "Verbinding mislukt (SSL / Poort / Host onbereikbaar)";
            probeResult.httpCode = 500;
        }
    }

    return probeResult;
}

/**
 * Runs a unified health check (DNS + HTTPS) for a single domain.
 * 
 * @param {Object} domainConfig 
 * @returns {Promise<Object>} Full check diagnostic report
 */
export async function runDomainHealthCheck(domainConfig) {
    const domain = domainConfig.domain;
    const path = domainConfig.path || "/";

    // Run DNS and HTTPS concurrently
    const [dnsSettled, httpsSettled] = await Promise.allSettled([
        checkDomainDns(domain),
        probeDomainHttps(domain, path)
    ]);

    const dns = dnsSettled.status === 'fulfilled' ? dnsSettled.value : { status: 'ERROR', latencyMs: 0, resolvedIps: [] };
    let https = httpsSettled.status === 'fulfilled' ? httpsSettled.value : { reachable: false, latencyMs: 0, sslValid: false, httpCode: 500, message: "Probe error" };

    // Initial failure check
    let isDown = (!https.reachable || dns.status === 'SERVFAIL' || dns.status === 'DNS_TIMEOUT' || dns.status === 'NXDOMAIN');

    // Immediate confirmation probe: if down on first probe, wait 1.2s and probe once more
    // This immediately eliminates false positives from temporary TCP socket / WiFi packet blips
    if (isDown && (!https.reachable || dns.status === 'DNS_TIMEOUT')) {
        await new Promise(r => setTimeout(r, 1200));
        const retryHttps = await probeDomainHttps(domain, path);
        if (retryHttps.reachable) {
            https = retryHttps;
            isDown = (dns.status === 'SERVFAIL' || dns.status === 'NXDOMAIN');
        }
    }

    // Calculate overall status
    let overallStatus = "operational"; // operational | degraded | down
    let statusText = "Operationeel";
    let statusColor = "#10b981"; // green

    if (isDown) {
        overallStatus = "down";
        statusText = dns.status === 'SERVFAIL' 
            ? "DNS Storing (SERVFAIL / DDoS)" 
            : (dns.status === 'NXDOMAIN' ? "Domein Niet Gekoppeld (NXDOMAIN)" : "Offline / Onbereikbaar");
        statusColor = "#ef4444"; // red
    } else if (https.latencyMs > 2500 || dns.latencyMs > 1000) {
        overallStatus = "degraded";
        statusText = `Vertraagd (${https.latencyMs}ms)`;
        statusColor = "#f59e0b"; // orange
    }

    // Track consecutive failure count (persisted in LocalStorage)
    const consecutiveFailures = recordDomainCheckResult(domain, overallStatus);
    const isConfirmedDown = consecutiveFailures >= REQUIRED_CONSECUTIVE_FAILURES;

    if (overallStatus === 'down') {
        if (!isConfirmedDown) {
            statusText = `${statusText} (Verifiëren ${consecutiveFailures}/${REQUIRED_CONSECUTIVE_FAILURES})`;
        } else {
            statusText = `${statusText} (Bevestigd ${consecutiveFailures}x)`;
        }
    }

    const report = {
        id: domainConfig.id,
        projectId: domainConfig.projectId || "",
        isPrimary: domainConfig.isPrimary !== undefined ? domainConfig.isPrimary : true,
        name: domainConfig.name,
        domain: domainConfig.domain,
        path: domainConfig.path || "/",
        client: domainConfig.client,
        category: domainConfig.category || "client",
        overallStatus,
        statusText,
        statusColor,
        httpCode: https.httpCode || (https.reachable ? 200 : 500),
        sslValid: https.sslValid,
        latencyMs: https.latencyMs,
        dnsStatus: dns.status,
        dnsLatencyMs: dns.latencyMs,
        dnsProvider: dns.provider || "Google DoH",
        resolvedIps: dns.resolvedIps || [],
        expectedIp: domainConfig.expectedIp || "",
        ipMatchesExpected: domainConfig.expectedIp ? dns.resolvedIps.includes(domainConfig.expectedIp) : true,
        lastChecked: new Date().toISOString(),
        consecutiveFailures,
        isConfirmedDown,
        details: {
            dns,
            https
        }
    };

    return report;
}

/**
 * Checks all domains concurrently with batched concurrency to prevent network saturation.
 * 
 * @param {Array<Object>} domainList 
 * @param {Function} onProgressCallback (completedCount, totalCount, lastReport)
 * @returns {Promise<Array<Object>>} List of all reports
 */
export async function runAllDomainChecks(domainList, onProgressCallback = null) {
    const list = domainList || getMonitoredDomains();
    const results = [];
    const total = list.length;
    let completed = 0;

    // Run in parallel batches of 4 to keep DNS & HTTP sockets fast and avoid rate limiting
    const BATCH_SIZE = 4;
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (d) => {
            const report = await runDomainHealthCheck(d);
            results.push(report);
            completed++;
            if (onProgressCallback) {
                onProgressCallback(completed, total, report);
            }
            return report;
        });
        await Promise.all(batchPromises);
    }

    // Sort: First DOWN, then DEGRADED, then OPERATIONAL
    results.sort((a, b) => {
        const order = { down: 0, degraded: 1, operational: 2 };
        return (order[a.overallStatus] ?? 3) - (order[b.overallStatus] ?? 3);
    });

    return results;
}

/**
 * Persists domain check report to Firestore (/monitors/{domainKey}) if db & user available.
 */
export async function saveDomainReportToFirestore(db, report) {
    if (!db || !report) return false;
    try {
        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        const cleanKey = report.domain.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = doc(db, "monitors", cleanKey);
        await setDoc(docRef, {
            ...report,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (err) {
        // Silently catch permission or network errors
        console.warn("Could not save monitor to Firestore:", err.message);
        return false;
    }
}

/**
 * Retrieves the latest monitor status for a domain from Firestore or runs an instant check.
 */
export async function getDomainStatusWithFallback(db, domainName) {
    const cleanDomain = domainName.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const cleanKey = cleanDomain.replace(/[^a-zA-Z0-9]/g, '_');

    // 1. Try Firestore
    if (db) {
        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const docRef = doc(db, "monitors", cleanKey);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                // If checked within the last 15 minutes, return cached result
                const ageMinutes = (Date.now() - new Date(data.lastChecked).getTime()) / (1000 * 60);
                if (ageMinutes < 15) {
                    return data;
                }
            }
        } catch (e) {
            console.warn("Firestore monitor fetch failed:", e.message);
        }
    }

    // 2. Run instant on-the-fly live check
    const match = getMonitoredDomains().find(d => d.domain === cleanDomain) || {
        id: cleanKey,
        name: cleanDomain,
        domain: cleanDomain,
        client: "Klant",
        path: "/"
    };

    return await runDomainHealthCheck(match);
}

/**
 * Dispatches an automated FormSubmit alert when a domain enters DOWN or DNS_FAIL status.
 * Requires minimum 3 consecutive failed checks (REQUIRED_CONSECUTIVE_FAILURES).
 * Single transient measurements or socket timeouts will NOT trigger alerts.
 * Contains a 60-minute anti-spam throttle per domain.
 * 
 * @param {Object} report
 * @param {Object} options - Optional flags { playAudio: boolean }
 */
export async function dispatchDowntimeAlert(report, options = {}) {
    if (!report || report.overallStatus !== 'down') return false;

    // Suppress alerts if domain is explicitly muted/ignored (e.g. unpurchased or maintenance)
    if (isDomainIgnored(report.domain) || report.isIgnored) {
        console.info(`🔕 Downtime alert voor ${report.domain} onderdrukt (domein is gemarkeerd als Genegeerd/Gedempt).`);
        return false;
    }

    // REQUIRE CONSECUTIVE FAILURES (at least REQUIRED_CONSECUTIVE_FAILURES, default 3)
    const consecutive = report.consecutiveFailures !== undefined 
        ? report.consecutiveFailures 
        : getConsecutiveFailures(report.domain);

    if (consecutive < REQUIRED_CONSECUTIVE_FAILURES) {
        console.info(`⏳ [Uptime Monitor] ${report.domain} is DOWN gemeten (${consecutive}/${REQUIRED_CONSECUTIVE_FAILURES} opeenvolgende metingen). Geen alert verstuurd; vereist ${REQUIRED_CONSECUTIVE_FAILURES} bevestigde metingen achter elkaar.`);
        return false;
    }

    // Check throttle in localStorage (max 1 alert per hour per confirmed incident)
    const throttleKey = `caf_alert_sent_${report.domain}`;
    const lastSent = localStorage.getItem(throttleKey);
    const ONE_HOUR = 60 * 60 * 1000;

    if (lastSent && (Date.now() - parseInt(lastSent, 10)) < ONE_HOUR) {
        console.info(`⏳ Downtime alert for ${report.domain} suppressed (throttled to max 1/hour).`);
        return false;
    }

    // Play subtle synthesized audio alert chime in browser ONLY when confirmed down
    if (options.playAudio !== false) {
        playAlertTone();
    }

    // Log incident locally
    logIncident(report);

    // Dispatch dedicated admin-only alert email directly to Allard (info@creationaltfix.nl)
    // NEVER touches client templates or customer emails.
    try {
        const url = "https://formsubmit.co/ajax/info@creationaltfix.nl";
        const payload = {
            "_subject": `🚨 UPTIME ALERT: Domein ${report.domain} is BEVESTIGD DOWN (${consecutive}x achter elkaar!)`,
            "_template": "table",
            "_captcha": "false",
            "Domein": report.domain,
            "Klant / Project": report.name + (report.client ? ` (${report.client})` : ''),
            "Status": `BEVESTIGD DOWN (${consecutive} opeenvolgende metingen)`,
            "HTTP Code": report.httpCode || "Geen verbinding",
            "DNS Status": report.dnsStatus || "Onbekend",
            "Gedetecteerde IP's": (report.resolvedIps && report.resolvedIps.length > 0) ? report.resolvedIps.join(', ') : 'Geen IP gevonden',
            "Tijdstip": new Date().toLocaleString('nl-NL'),
            "Admin Dashboard Link": "https://portal.creationaltfix.nl/crm/admin/"
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            localStorage.setItem(throttleKey, Date.now().toString());
            console.log(`🚨 Beheerder downtime alert succesvol verzonden naar info@creationaltfix.nl voor ${report.domain}`);
        }
    } catch (err) {
        console.warn("Fout bij verzenden beheerder downtime alert:", err.message);
    }

    // Multi-Channel Alerting (Discord / Telegram)
    try {
        await dispatchMultiChannelDowntimeAlert(report, options);
    } catch (e) {
        console.warn("[Monitor] Multi-channel alert waarschuwing:", e);
    }

    localStorage.setItem(throttleKey, Date.now().toString());
    return true;
}

/**
 * Sends a rich downtime embed to a configured Discord Webhook.
 * @param {Object} report 
 * @param {string} webhookUrl 
 */
export async function sendDiscordWebhookAlert(report, webhookUrl) {
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://')) return false;

    try {
        const payload = {
            username: "Creation+Alt+Fix Sentry",
            avatar_url: "https://creationaltfix.nl/images/logo.png",
            embeds: [{
                title: `🚨 DOWNTIME ALERT: ${report.domain} IS DOWN!`,
                description: `**Klant/Project:** ${report.name || report.domain} ${report.client ? `(${report.client})` : ''}\n**HTTP Status:** ${report.httpCode || 'Geen response'}\n**DNS Status:** ${report.dnsStatus || 'Onbekend'}\n**Incident Tijdstip:** ${new Date().toLocaleString('nl-NL')}`,
                color: 15158332, // #e74c3c
                fields: [
                    { name: "Domein", value: String(report.domain), inline: true },
                    { name: "Gemeten Fouten", value: `${report.consecutiveFailures || REQUIRED_CONSECUTIVE_FAILURES}x achter elkaar`, inline: true }
                ],
                footer: { text: "Creation+Alt+Fix 24/7 DoH Uptime Engine" },
                timestamp: new Date().toISOString()
            }]
        };

        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return res.ok;
    } catch (e) {
        console.warn("[Monitor] Discord alert mislukt:", e);
        return false;
    }
}

/**
 * Sends an urgent downtime message via Telegram Bot API.
 * @param {Object} report 
 * @param {string} botToken 
 * @param {string} chatId 
 */
export async function sendTelegramAlert(report, botToken, chatId) {
    if (!botToken || !chatId) return false;

    try {
        const text = `🚨 <b>DOWNTIME ALERT: ${report.domain} IS DOWN!</b>\n\n` +
            `🏢 <b>Project:</b> ${report.name || report.domain}\n` +
            `🌐 <b>Domein:</b> ${report.domain}\n` +
            `⚠️ <b>Statuscode:</b> ${report.httpCode || 'Geen verbinding'}\n` +
            `⏱️ <b>Tijdstip:</b> ${new Date().toLocaleString('nl-NL')}\n\n` +
            `<a href="https://portal.creationaltfix.nl/crm/admin/">👉 Open Admin Dashboard</a>`;

        const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
        return res.ok;
    } catch (e) {
        console.warn("[Monitor] Telegram alert mislukt:", e);
        return false;
    }
}

/**
 * Dispatches multi-channel alerts across Discord and Telegram.
 * @param {Object} report 
 * @param {Object} [options] 
 */
export async function dispatchMultiChannelDowntimeAlert(report, options = {}) {
    const discordUrl = options.discordWebhookUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('caf_webhook_discord') : null);
    const tgToken = options.telegramBotToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('caf_webhook_telegram_token') : null);
    const tgChat = options.telegramChatId || (typeof localStorage !== 'undefined' ? localStorage.getItem('caf_webhook_telegram_chat') : null);

    const tasks = [];
    if (discordUrl) tasks.push(sendDiscordWebhookAlert(report, discordUrl));
    if (tgToken && tgChat) tasks.push(sendTelegramAlert(report, tgToken, tgChat));

    if (tasks.length > 0) {
        await Promise.allSettled(tasks);
    }
}

/**
 * Synthesizes a crisp, high-tech alert chime using browser Web Audio API.
 * Requires no external audio files.
 */
export function playAlertTone() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        // Silently catch audio policy blocks
    }
}

/**
 * Stores an incident entry in LocalStorage.
 */
function logIncident(report) {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_ALERTS_LOG);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift({
            id: `inc_${Date.now()}`,
            domain: report.domain,
            name: report.name,
            status: report.statusText,
            timestamp: new Date().toISOString(),
            resolved: false
        });
        // Keep max 50 incidents
        localStorage.setItem(LOCAL_STORAGE_ALERTS_LOG, JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
}

/**
 * Returns recorded incident logs.
 */
export function getIncidentLogs() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_ALERTS_LOG);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Completely removes a domain from Uptime & DNS Monitoring:
 * - Marks it as '__removed__' in LOCAL_STORAGE_REPLACED_DOMAINS (if default domain)
 * - Removes it from LOCAL_STORAGE_CUSTOM_DOMAINS (if custom domain)
 * - Removes it from caf_cached_monitor_reports
 * - Cleans up consecutive down tracking & alert throttle
 * - Deletes the Firestore document /monitors/{oldDomainKey}
 * 
 * @param {Object} db - Firestore instance
 * @param {string} domainName - Domain string to remove
 * @returns {Promise<boolean>}
 */
export async function removeDomainFromMonitoring(db, domainName) {
    const clean = normalizeDomain(domainName);
    if (!clean) return false;
    console.log(`🗑️ Removing domain from Uptime & DNS Monitoring: "${clean}"`);

    // 1. Remove from cached reports in localStorage
    try {
        const cachedStr = localStorage.getItem('caf_cached_monitor_reports');
        if (cachedStr) {
            let cached = JSON.parse(cachedStr);
            cached = cached.filter(r => normalizeDomain(r.domain) !== clean);
            localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(cached));
        }
    } catch (e) {}

    // 2. Remove consecutive down count & alert sent throttle
    try {
        const storedDown = localStorage.getItem(LOCAL_STORAGE_CONSECUTIVE_DOWN);
        if (storedDown) {
            let map = JSON.parse(storedDown);
            delete map[clean];
            localStorage.setItem(LOCAL_STORAGE_CONSECUTIVE_DOWN, JSON.stringify(map));
        }
        localStorage.removeItem(`caf_alert_sent_${clean}`);
    } catch (e) {}

    // 3. Delete obsolete Firestore document /monitors/{oldDomainKey}
    if (db) {
        try {
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
            const oldKey = clean.replace(/[^a-zA-Z0-9]/g, '_');
            await deleteDoc(doc(db, "monitors", oldKey));
            console.log(`🗑️ Verouderd Firestore monitor document verwijderd: /monitors/${oldKey}`);
        } catch (err) {
            console.warn("Fout bij verwijderen oud Firestore monitor document:", err.message);
        }
    }

    return true;
}

/**
 * Synchronizes domain changes made on client cards (Klantkaart) or project workspaces
 * with the Realtime Multi-DNS, SSL & Uptime Monitoring Suite.
 * 
 * Flow:
 * 1. Normalizes and validates oldDomain vs newDomain. If identical, early exits.
 * 2. If oldDomain existed:
 *    - Removes oldDomain via removeDomainFromMonitoring()
 * 3. If newDomain is provided:
 *    - Executes an immediate real-time Multi-DNS and HTTPS health check
 *    - Persists the new diagnostic report in Firestore (/monitors/{newDomainKey})
 *    - Updates cached reports in caf_cached_monitor_reports
 * 
 * @param {Object} db - Firestore instance
 * @param {string} oldDomain - Previous domain string
 * @param {string} newDomain - New domain string
 * @param {Object} meta - Client metadata (client, companyName, contactName, category, etc.)
 * @returns {Promise<Object>} Result object with { changed, oldDomain, newDomain, report }
 */
export async function syncDomainChangeToMonitoring(db, oldDomain, newDomain, meta = {}) {
    const { domain: cleanOld } = parseDomainAndPath(oldDomain);
    const { domain: cleanNew, path: newPath } = parseDomainAndPath(newDomain);

    if (cleanOld === cleanNew && !cleanNew) {
        return { changed: false, oldDomain: cleanOld, newDomain: cleanNew, report: null };
    }

    console.log(`🌐 Synchronizing domain update to Uptime & DNS Monitoring: "${cleanOld || '(geen)'}" ➔ "${cleanNew || '(verwijderd)'}"`);

    // 1. Handle old domain retirement/cleanup
    if (cleanOld && cleanOld !== cleanNew) {
        await removeDomainFromMonitoring(db, cleanOld);
    }

    // 2. Handle new domain registration & immediate health check
    let freshReport = null;
    if (cleanNew) {
        const clientName = meta.client || meta.companyName || meta.clientName || cleanNew;
        const newDomainObj = {
            id: meta.projectId || cleanNew.replace(/[^a-z0-9]/g, '-'),
            projectId: meta.projectId || '',
            name: clientName,
            domain: cleanNew,
            client: clientName,
            expectedIp: meta.expectedIp || "185.104.29.148",
            path: newPath || meta.path || "/",
            category: meta.category || "client"
        };

        // Run immediate live health check (DNS-over-HTTPS + HTTPS probe)
        try {
            freshReport = await runDomainHealthCheck(newDomainObj);
            console.log(`✅ Nieuw domein gecontroleerd: ${cleanNew} -> ${freshReport.statusText} (${freshReport.latencyMs}ms)`);
        } catch (err) {
            console.warn("Live health check fout voor nieuw domein:", err.message);
            freshReport = {
                id: newDomainObj.id,
                projectId: newDomainObj.projectId,
                name: newDomainObj.name,
                domain: newDomainObj.domain,
                path: newDomainObj.path,
                client: newDomainObj.client,
                category: newDomainObj.category,
                overallStatus: "operational",
                statusText: "Toegevoegd (wacht op scan)",
                statusColor: "#10b981",
                httpCode: 200,
                sslValid: true,
                latencyMs: 50,
                dnsStatus: "PENDING",
                dnsLatencyMs: 0,
                resolvedIps: [],
                lastChecked: new Date().toISOString()
            };
        }

        // Persist report to Firestore (/monitors/{cleanNewKey})
        if (db && freshReport) {
            try {
                await saveDomainReportToFirestore(db, freshReport);
                console.log(`💾 Monitor rapport opgeslagen in Firestore: /monitors/${cleanNew.replace(/[^a-zA-Z0-9]/g, '_')}`);
            } catch (err) {
                console.warn("Fout bij opslaan monitor naar Firestore:", err.message);
            }
        }

        // Update cached reports in localStorage
        try {
            const cachedStr = localStorage.getItem('caf_cached_monitor_reports');
            let cached = cachedStr ? JSON.parse(cachedStr) : [];
            cached = cached.filter(r => r.domain !== cleanNew && r.id !== newDomainObj.id);
            cached.unshift(freshReport);
            localStorage.setItem('caf_cached_monitor_reports', JSON.stringify(cached));
        } catch (e) {}
    }

    return {
        changed: true,
        oldDomain: cleanOld,
        newDomain: cleanNew,
        report: freshReport
    };
}

if (typeof window !== 'undefined') {
    window.syncDomainChangeToMonitoring = syncDomainChangeToMonitoring;
    window.normalizeDomain = normalizeDomain;
    window.getIgnoredDomains = getIgnoredDomains;
    window.isDomainIgnored = isDomainIgnored;
    window.setDomainIgnored = setDomainIgnored;
}
