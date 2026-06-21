import WebSocket from "ws";

// XTB xAPI je čistě WebSocket protokol (žádné REST), proto na rozdíl od ga4.js / anthropic-costs.js
// potřebujeme balíček "ws". Přihlašovací údaje žijí JEN ve Vercel Environment Variables —
// heslo se nikdy nezadává v appce ani v chatu.
// Pozn.: starší adresy xapi.xtb.com / ws.xtb.com byly k 14.3.2025 vyřazeny —
// aktuální (2026) oficiální WebSocket adresy jsou ws.xapi.pro.
const ENDPOINTS = {
  real: "wss://ws.xapi.pro/real",
  demo: "wss://ws.xapi.pro/demo",
};

function sendAndWait(ws, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("XTB API: timeout čekání na odpověď")), timeoutMs);
    const onMessage = (raw) => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      try {
        resolve(JSON.parse(raw.toString()));
      } catch (e) {
        reject(e);
      }
    };
    ws.once("message", onMessage);
    ws.send(JSON.stringify(payload), (err) => {
      if (err) { clearTimeout(timer); ws.off("message", onMessage); reject(err); }
    });
  });
}

function connect(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { ws.terminate(); reject(new Error("XTB API: timeout připojení")); }, timeoutMs);
    ws.once("open", () => { clearTimeout(timer); resolve(ws); });
    ws.once("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = process.env.XTB_USER_ID;
  const password = process.env.XTB_PASSWORD;
  const env = (process.env.XTB_ENV || "real").toLowerCase() === "demo" ? "demo" : "real";

  if (!userId || !password) {
    return res.status(500).json({
      error: "XTB_USER_ID / XTB_PASSWORD není nastaveno v Vercel Environment Variables.",
      hint: "Vygeneruj API heslo v xStation5 → Nastavení → API, a doplň XTB_USER_ID (číslo účtu) + XTB_PASSWORD na vercel.com → projekt maux-crm → Settings → Environment Variables. Heslo se nikdy nezadává v aplikaci ani v chatu.",
    });
  }

  let ws;
  try {
    ws = await connect(ENDPOINTS[env]);

    const loginRes = await sendAndWait(ws, {
      command: "login",
      arguments: { userId, password, appName: "MauxCRM" },
    });
    if (!loginRes.status) {
      ws.close();
      return res.status(401).json({ error: "Přihlášení k XTB se nezdařilo.", detail: loginRes.errorDescr || loginRes.errorCode || null });
    }

    // XTB API vyžaduje mezi příkazy odstup (rate limit ~200ms na příkaz)
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const marginRes = await sendAndWait(ws, { command: "getMarginLevel" });
    await wait(250);

    const tradesRes = await sendAndWait(ws, { command: "getTrades", arguments: { openedOnly: true } });
    await wait(250);

    // Historie uzavřených obchodů ("nákupky") — XTB tohle umí vrátit přímo z API,
    // na rozdíl od vkladů/výběrů hotovosti (ty se vedou ručně, viz xtb_tranches).
    // Výchozí okno: posledních ~3 roky, ať je vidět celá historie obchodování.
    const histStart = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    const historyRes = await sendAndWait(ws, {
      command: "getTradesHistory",
      arguments: { start: histStart, end: 0 }, // end:0 = až do teď (dle xAPI konvence)
    }, 12000);

    try { ws.send(JSON.stringify({ command: "logout" })); } catch (e) {}
    ws.close();

    const margin = marginRes.returnData || {};
    const trades = (tradesRes.returnData || []).map((t) => ({
      symbol: t.symbol,
      volume: t.volume,
      openPrice: t.open_price,
      profit: t.profit,
      cmd: t.cmd, // 0 = buy, 1 = sell
      openTime: t.open_time,
    }));

    // Jen uzavřené pozice (closed:true) — otevřené už máme z getTrades výše.
    const closedTrades = (historyRes.returnData || [])
      .filter((t) => t.closed)
      .map((t) => ({
        symbol: t.symbol,
        volume: t.volume,
        openPrice: t.open_price,
        closePrice: t.close_price,
        profit: t.profit,
        cmd: t.cmd, // 0 = buy, 1 = sell
        openTime: t.open_time,
        closeTime: t.close_time,
      }))
      .sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));

    return res.status(200).json({
      account: {
        balance: margin.balance ?? null,
        equity: margin.equity ?? null,
        margin: margin.margin ?? null,
        marginFree: margin.margin_free ?? null,
        marginLevel: margin.margin_level ?? null,
        credit: margin.credit ?? null,
        currency: margin.currency ?? null,
      },
      openTrades: trades,
      closedTrades,
      env,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    try { ws && ws.terminate(); } catch (e) {}
    return res.status(500).json({ error: err.message });
  }
}
