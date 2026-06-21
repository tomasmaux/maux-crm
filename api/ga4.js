import crypto from "crypto";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Service-account JWT bearer flow (RFC 7523) — bez závislosti na google-auth-library,
// stejně jako anthropic-costs.js nepoužívá žádný Anthropic SDK, jen čistý fetch + crypto.
async function getAccessToken(clientEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(tokenData.error_description || tokenData.error || "Chyba OAuth tokenu");
  }
  return tokenData.access_token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  let privateKey = process.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !privateKey) {
    return res.status(500).json({
      error: "GA4_PROPERTY_ID / GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY není nastaveno v Vercel Environment Variables.",
      hint: "Vytvoř service account v Google Cloud Console (povol 'Google Analytics Data API'), přidej jeho e-mail jako Vieweru do GA4 property (Admin → Správa přístupu k property), a doplň proměnné na vercel.com → projekt maux-crm → Settings → Environment Variables.",
    });
  }
  // V Vercelu se \n v privátním klíči obvykle ukládá jako literální "\n" — je třeba je rozbalit.
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    const accessToken = await getAccessToken(clientEmail, privateKey);
    const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const authHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // 1) Souhrn: dnes / 7 dní / 30 dní v jednom requestu (GA4 umí víc dateRanges najednou)
    const summaryRes = await fetch(base, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [
          { startDate: "today", endDate: "today", name: "today" },
          { startDate: "7daysAgo", endDate: "today", name: "last7" },
          { startDate: "30daysAgo", endDate: "today", name: "last30" },
        ],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      }),
    });
    const summaryData = await summaryRes.json();
    if (!summaryRes.ok) return res.status(summaryRes.status).json(summaryData);

    // 2) Trend posledních 30 dní (pro graf)
    const trendRes = await fetch(base, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    });
    const trendData = await trendRes.json();

    // 3) Nejnavštěvovanější stránky za 30 dní
    const pagesRes = await fetch(base, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 8,
      }),
    });
    const pagesData = await pagesRes.json();

    const dimVal = (row) => row?.dimensionValues?.[0]?.value;
    const metVal = (row, i) => Number(row?.metricValues?.[i]?.value || 0);

    const summary = {};
    for (const row of summaryData.rows || []) {
      const name = dimVal(row);
      summary[name] = {
        activeUsers: metVal(row, 0),
        sessions: metVal(row, 1),
        pageViews: metVal(row, 2),
      };
    }

    const trend = (trendData.rows || []).map((row) => ({
      date: dimVal(row),
      activeUsers: metVal(row, 0),
      pageViews: metVal(row, 1),
    }));

    const topPages = (pagesData.rows || []).map((row) => ({
      path: dimVal(row),
      pageViews: metVal(row, 0),
    }));

    return res.status(200).json({ summary, trend, topPages, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
