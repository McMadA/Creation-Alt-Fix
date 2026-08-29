# 🔒 Vimexx DirectAdmin Webserver FTP Hardening & Brute-Force Preventie (TASK-812)

> **Doel**: Het elimineren van onversleuteld FTP-verkeer (poort 21), afdwingen van FTPS/SFTP encryptie en het blokkeren van geautomatiseerde inbraakpogingen via de firewall.

---

## 1. Uitschakelen van Onversleutelde Plain FTP (TLS Forceren)

In DirectAdmin ProFTPD / Pure-FTPd configuratie (`/etc/proftpd.conf` of DirectAdmin Administrator Settings):

```apache
<IfModule mod_tls.c>
    TLSEngine on
    TLSRequired on
    TLSProtocol TLSv1.2 TLSv1.3
    TLSOptions NoSessionReuseRequired
    TLSRSACertificateFile /etc/httpd/conf/ssl.crt/server.crt
    TLSRSACertificateKeyFile /etc/httpd/conf/ssl.key/server.key
</IfModule>
```

* **Effect**: Elke inlogpoging zonder expliciete TLS handshake wordt direct door de server geweigerd (`530 Please login with USER and PASS over TLS`).
* **CI/CD & Klanten**: Verbinden uitsluitend via **FTPS (Explicit TLS over port 21)** of **SFTP (poort 22/2222)**.

---

## 2. CSF / LFD Brute-Force Firewall Aanscherpen

In DirectAdmin -> *ConfigServer Security & Firewall (CSF)* -> *Firewall Configuration* (`/etc/csf/csf.conf`):

| Instelling | Aanbevolen Waarde | Uitleg |
| :--- | :--- | :--- |
| `LF_FTP` | `5` | Blokkeer IP direct na 5 mislukte FTP inlogpogingen binnen 3600 seconden |
| `LF_FTP_SYN` | `10` | Voorkomt FTP SYN flood probes |
| `LF_TRIGGER` | `5` | Triggert automatische firewall IP ban (`iptables`/`ipset`) |
| `LF_PERMBLOCK` | `1` | Maakt de ban permanent of langdurig |
| `LF_SELECTIVE` | `1` | Blokkeert specifiek de aangevallen service poort |

Herstart de firewall na wijziging:
```bash
csf -r
```

---

## 3. DirectAdmin FTP Account Audit Checklist

Voer de volgende stappen uit in DirectAdmin (*FTP Management*):
1. **Verwijder Ongebruikte Accounts**: Verwijder oude testaccounts, stagiair-/freelance-logins en tijdelijke sub-FTP accounts.
2. **Schakel Anonymous FTP Uit**: Zorg dat `Anonymous FTP` op `Disabled` staat voor alle domeinen.
3. **Strikte Chroot**: Elk account moet beperkt zijn tot zijn eigen directory (`domains/jouwdomein.nl/public_html/`) zonder toegang tot bovenliggende mappen.
4. **Sterke Wachtwoorden**:
   - Minimaal 32 tekens (letters, cijfers, symbolen).
   - Wachtwoorden uitsluitend opslaan in de Windows DPAPI kluis (`.crm-credentials.clixml`) en GitHub Secrets (`FTP_PASSWORD`). Nooit in platte tekst op schijf.
