// api/pdf.js — vektorové PDF faktury (18. 9. 2026).
// Appka pošle HTML náhledu faktury (stejné styly jako tisk), tady ho vyrenderuje headless
// Chromium a vrátí PDF přesně jako tiskový dialog: text, QR i fonty vektorově.
// Přístup jen pro přihlášeného uživatele appky — Supabase token se ověří proti /auth/v1/user.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || "https://yyijoslmygdzokhlhnvz.supabase.co";

async function prihlasen(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const apikey = process.env.SUPABASE_ANON_KEY || req.headers["x-apikey"] || "";
  if (!token || !apikey) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey, Authorization: `Bearer ${token}` } });
    return r.ok;
  } catch (e) { return false; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!(await prihlasen(req))) return res.status(401).json({ error: "nepřihlášen" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const html = body.html || "";
  const filename = body.filename || "faktura.pdf";
  if (!html || html.length > 3500000) return res.status(400).json({ error: "chybí html nebo je příliš velké" });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 });
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(pdf));
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
