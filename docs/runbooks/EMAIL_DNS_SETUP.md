# Runbook: Email DNS Configuration at One.com

**Domain:** alpacasibiza.com  
**Registrar / Nameservers:** One.com (ns01.one.com, ns02.one.com)  
**Sending provider:** Resend (info@alpacasibiza.com)  
**Status as of 2026-05-29 audit:** SPF missing, DKIM missing (0 selectors), DMARC missing — launch blocker.

---

## Section 1 — Background

SPF (Sender Policy Framework), DKIM (DomainKeys Identified Mail), and DMARC (Domain-based Message Authentication, Reporting and Conformance) are three DNS-based signals that tell receiving mail servers — Gmail, Outlook, Yahoo — whether an email claiming to be from `@alpacasibiza.com` was actually sent by an authorised server. Without SPF, any server on the internet can forge a `From: info@alpacasibiza.com` header. Without DKIM, there is no cryptographic proof the message was not altered in transit. Without DMARC, there is no policy telling receivers what to do when forged mail appears. Resend is a legitimate bulk-transactional platform but it sends from shared IP infrastructure; without these records, Gmail and Outlook spam filters have no signal to distinguish a Resend-sent welcome email from a phishing attempt, and they will silently junk it or drop it entirely. Every transactional email this site sends — welcome, adoption certificate, quarterly update, renewal reminder, gift-recipient email, billing portal link — lands in the spam folder or never arrives until these three records exist.

---

## Section 2 — Pre-flight: steps in the Resend dashboard

Complete these steps before touching One.com. Resend generates account-specific values you cannot predict in advance.

1. Open [https://resend.com/domains](https://resend.com/domains) and log in.
2. Click **Add Domain**.
3. Enter `alpacasibiza.com` and choose the region closest to Spain (EU Frankfurt recommended).
4. Resend will display a table of DNS records to add. It typically includes:
   - One **TXT** record at the apex (`@`) — this is the SPF record.
   - One **CNAME** record at a subdomain like `resend._domainkey` — this is the DKIM selector.
   - One **TXT** record at `_dmarc` — Resend may pre-fill a starter DMARC policy (you will replace this value with the progressive policy from Section 4).
   - Optionally a **MX** or **TXT** record for the Return-Path / bounce subdomain (e.g. `bounces.alpacasibiza.com`).
5. **Copy every record exactly as shown.** Do not retype them; copy-paste from the Resend UI to avoid typos in long DKIM targets.
6. Keep the Resend tab open while you work in One.com — you will need to switch back to click **Verify** once records propagate.

---

## Section 3 — Adding the records at One.com

1. Go to [https://www.one.com](https://www.one.com) and log in.
2. Navigate to **Mail & Office** (top nav) → **DNS settings**. Depending on your locale the panel may be labelled **"Avanceret kontrol"** (Danish) or **"Advanced control"** (English).
3. Click **Custom DNS records** (sometimes listed under "Advanced DNS").
4. For each record Resend gave you, click **Add record** and fill in the fields:

   **SPF (apex TXT)**
   | Field | Value |
   |-------|-------|
   | Type | TXT |
   | Host / Name | `@` (or leave blank — One.com treats both as the apex) |
   | Value / Content | Paste verbatim from Resend, e.g. `v=spf1 include:_spf.resend.com ~all` |
   | TTL | 3600 |

   > If a TXT record already exists at the apex (e.g. a site-verification record), **do not replace it**. Append the Resend `include:` into the existing SPF `v=spf1 ... ~all` string — there can only be one SPF record per zone and multiple TXT records are only safe if they serve different purposes.

   **DKIM (CNAME)**
   | Field | Value |
   |-------|-------|
   | Type | CNAME |
   | Host / Name | `resend._domainkey` (or whatever selector Resend specifies — use the exact subdomain label they give you) |
   | Value / Content | Paste the target CNAME value verbatim from Resend |
   | TTL | 3600 |

   **DMARC (TXT at `_dmarc`)**
   | Field | Value |
   |-------|-------|
   | Type | TXT |
   | Host / Name | `_dmarc` |
   | Value / Content | See Section 4 for the recommended value — **do not use Resend's placeholder if they provide a p=reject default** |
   | TTL | 3600 |

   **Return-Path / bounce subdomain (if Resend requests it)**
   | Field | Value |
   |-------|-------|
   | Type | MX or CNAME (Resend will specify) |
   | Host / Name | `bounces` (or whatever Resend specifies) |
   | Value / Content | Paste verbatim from Resend |
   | TTL | 3600 |

5. Click **Save** after each record.
6. One.com typically propagates within 15 minutes; allow up to 24 hours before declaring failure.

---

## Section 4 — Recommended DMARC policy (progressive rollout)

Never deploy `p=reject` on day one. Use this four-stage sequence to avoid blocking legitimate email while you build confidence.

**Stage 1 — Monitor mode (deploy on launch day)**

```
v=DMARC1; p=none; rua=mailto:postmaster@alpacasibiza.com; aspf=r; adkim=r
```

- `p=none` — receivers report failures but still deliver the email.
- `rua=` — aggregate reports emailed to postmaster@. Forward that inbox to your own inbox so you see them.
- `aspf=r` and `adkim=r` — relaxed alignment (subdomain mail passes).

**Stage 2 — Quarantine partial (after 2 weeks of clean aggregate reports)**

```
v=DMARC1; p=quarantine; pct=25; rua=mailto:postmaster@alpacasibiza.com; aspf=r; adkim=r
```

- `pct=25` — only 25% of failing messages are quarantined; the rest still deliver.

**Stage 3 — Quarantine full (2 further weeks)**

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@alpacasibiza.com; aspf=r; adkim=r
```

**Stage 4 — Reject / full enforcement (steady state)**

```
v=DMARC1; p=reject; rua=mailto:postmaster@alpacasibiza.com; aspf=r; adkim=r
```

- At this stage, spoofed mail cannot impersonate your domain.
- Update the `_dmarc` TXT record in One.com each time you advance a stage.

---

## Section 5 — Verify deployment

Run these checks from any machine with `dig` (macOS/Linux terminal) or from [https://mxtoolbox.com/SuperTool.aspx](https://mxtoolbox.com/SuperTool.aspx) if you are on Windows without WSL.

**SPF**
```bash
dig TXT alpacasibiza.com +short
```
Expected: a line containing `v=spf1` and `include:_spf.resend.com` (or the specific include Resend showed you).

**DKIM**
```bash
dig CNAME resend._domainkey.alpacasibiza.com +short
```
Expected: returns the CNAME target Resend specified (a long `*.dkim.amazonses.com` or similar string).

**DMARC**
```bash
dig TXT _dmarc.alpacasibiza.com +short
```
Expected: `"v=DMARC1; p=none; ..."` matching what you entered.

**End-to-end send test**
1. In Resend dashboard, click **Verify** on the domain — all three indicators should turn green.
2. Send a test email from `info@alpacasibiza.com` to a personal Gmail address.
3. In Gmail, open the message → three-dot menu → **Show original** → look for `dkim=pass`, `spf=pass`, `dmarc=pass` in the Authentication-Results header.
4. For a structured deliverability score: go to [https://www.mail-tester.com](https://www.mail-tester.com), get the test address, send to it, then check the report. Aim for **9+/10** before launch.

---

## Section 6 — Fail modes and remedies

| Symptom | Likely cause | Remedy |
|---------|-------------|--------|
| `dig` returns nothing after 24 h | Record not saved in One.com | Log back in, confirm the record appears in the Custom DNS list |
| Resend dashboard shows "Not verified" | CNAME pointing to wrong target | Copy-paste again from Resend; check for trailing dots or extra spaces |
| `dig +trace` shows stale NS cache | ISP DNS caching | Use `8.8.8.8` (Google) or `1.1.1.1` (Cloudflare) as resolver: `dig @8.8.8.8 TXT alpacasibiza.com` |
| SPF permerror "too many DNS lookups" | SPF chain exceeds 10 includes | Flatten SPF using a tool such as [https://dmarcian.com/spf-survey/](https://dmarcian.com/spf-survey/) to combine includes into direct IP ranges |
| DMARC aggregate reports land in spam | postmaster@ not monitored | Set up a forwarder in One.com Webmail: postmaster@ → your real inbox |

---

## Section 7 — Cost

| Item | Cost |
|------|------|
| One.com DNS edits | Free (included in domain) |
| Resend free tier | Free for first 100 emails/day |
| Resend Pro (when volume grows) | $20/mo for 50,000 emails |

At expected alpaca-adoption transactional volume (welcome, certificate, quarterly update, renewal reminder) the free tier is sufficient through the first year unless adoption scales past ~90 active adopters simultaneously receiving renewal reminders on the same day.
