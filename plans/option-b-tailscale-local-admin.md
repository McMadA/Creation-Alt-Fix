# Plan: Pure Tailscale Local Hosting for Admin Dashboard (Option B)

## Overview
This plan details how to completely remove the Admin Dashboard (`crm/admin/`) from public web hosting (Vimexx) and serve it exclusively over your private **Tailscale** network (`100.x.y.z`).

> [!NOTE]
> **Impact & Scope Summary:**
> - **Public Website & Client Portal (Vimexx)**: Remains **100% unchanged**. `https://creationaltfix.nl` (Marketing site) and `https://creationaltfix.nl/portal/` (`/intake`, `/offerte`, `/status`) stay fully accessible to clients on the public internet.
> - **Admin Dashboard**: Completely deleted from Vimexx (`/public_html/portal/admin/` returns `404`) and excluded from GitHub Actions FTP deployments.
> - **Private Hosting Target (Raspberry Pi 2B Co-hosting)**: The Admin Dashboard can run on a **Raspberry Pi 2 Model B** alongside the existing **`Boekhouding`** (Flask) service. Total combined memory footprint is ~160–200 MB (out of 1 GB RAM).
> - **Data Synchronization**: Remains identical via Google Firebase Firestore; client intake submissions live-sync instantly to your private Tailscale admin view.

---

## Architectural Changes

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET (Vimexx)                  │
│                                                             │
│   https://creationaltfix.nl                                  │
│   ├── /                         -> Website                  │
│   └── /portal/                  -> Public Intake & Offerte  │
│       ├── /intake/              -> Client Intake Form       │
│       └── /offerte/             -> Interactive Offertes     │
│                                                             │
│   [REMOVED] /portal/admin/      -> EXCLUDED from FTP Sync    │
└─────────────────────────────────────────────────────────────┘
                               ▲ Writes data via Firebase
                               │
┌──────────────────────────────┴──────────────────────────────┐
│                PRIVATE TAILSCALE NETWORK (Tailnet)           │
│                                                             │
│   https://admin.your-tailnet.ts.net (or 100.x.y.z:8080)     │
│   └── crm/admin/                -> Local Admin Dashboard    │
│                                    (Firebase SDK reads/writes)│
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Exclude Admin from GitHub Actions FTP Deployment

Modify `.github/workflows/main.yml` so that `SamKirkland/FTP-Deploy-Action` ignores `crm/admin/` and internal documentation during automated FTP deployment to `domains/creationaltfix.nl/public_html/portal/`.

### Configuration in `.github/workflows/main.yml`:
```yaml
      - name: 📂 Sync CRM & Portaal via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: web0156.zxcs.nl
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          protocol: ftp
          port: 21
          local-dir: ./crm/
          server-dir: domains/creationaltfix.nl/public_html/portal/
          exclude: |
            **/admin/**
            **/customer-journey-plan/**
            **/customerjourny.txt
```

---

## Step 2: Remove `/public_html/portal/admin/` from Public Host

Delete the existing `admin` directory from the public FTP server (`web0156.zxcs.nl`) to ensure no legacy files remain accessible via `https://creationaltfix.nl/portal/admin/`.

---

## Step 3: Local Admin Server & Tailscale Serve Setup

### 3.1 Start Local Admin Server
Run a lightweight local web server serving `crm/admin/` on your local workstation or home server.

#### Option A: PowerShell Script (`crm/admin/start-tailscale-admin.ps1`)
```powershell
# Navigate to crm/admin
Set-Location -Path "$PSScriptRoot"

# Serve via Python or Node HTTP server
Write-Host "Starting Local Admin Dashboard on port 8080..." -ForegroundColor Green
python -m http.server 8080
```

#### Option B: Node / npx serve
```bash
npx serve crm/admin -l 8080
```

#### Option C: Raspberry Pi 2B (Co-hosting with Boekhouding via Nginx)
```nginx
# /etc/nginx/sites-available/services
server {
    listen 80;
    server_name _;

    # 1. Python Boekhouding Flask backend
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    # 2. CRM Admin Dashboard (statische bestanden)
    location /crm/ {
        alias /home/pi/services/Creation-Alt-Fix/crm/;
        index index.html;
        try_files $uri $uri/ =404;
    }
}
```

### 3.2 Expose via Tailscale Serve
Expose port `8080` securely to your private Tailnet using native Tailscale CLI:

```bash
# Serve local port 8080 over HTTPS on your Tailnet name
tailscale serve --bg http://localhost:8080
```

Access the Admin Dashboard at:
- **Tailnet MagicDNS URL**: `https://<your-machine-name>.<your-tailnet>.ts.net`
- **Tailscale IP**: `http://100.x.y.z:8080`

---

## Step 4: Firebase Authorized Domains Configuration

1. Log in to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** > **Settings** > **Authorized Domains**.
3. Add your local Tailnet address (e.g. `localhost`, `100.x.y.z`, or `<your-machine-name>.<your-tailnet>.ts.net`).
4. Firebase Firestore operations will continue to sync seamlessly between public client submissions (`/intake`) and your private Tailscale admin dashboard.

---

## Verification Checklist

- [ ] Run `git push main` and verify GitHub Actions successfully deploys `/portal/intake/` and `/portal/offerte/` without uploading `crm/admin/`.
- [ ] Attempt accessing `https://creationaltfix.nl/portal/admin/` in an incognito browser window — confirm it returns a `404 Not Found`.
- [ ] Run `start-tailscale-admin.ps1` locally and confirm access via `https://<tailnet-name>.ts.net`.
- [ ] Submit a test project via `https://creationaltfix.nl/portal/intake/` and confirm the lead instantly appears in your private Tailscale Admin Dashboard.
