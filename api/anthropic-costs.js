export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).json({
      error: "ANTHROPIC_ADMIN_KEY není nastaven v Vercel Environment Variables.",
      hint: "Přejdi na vercel.com → projekt → Settings → Environment Variables a přidej ANTHROPIC_ADMIN_KEY."
    });
  }

  const now = new Date();
  const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const starting_at = req.query.starting_at || defaultStart.toISOString();
  const ending_at   = req.query.ending_at   || now.toISOString();

  try {
    const costUrl = new URL("https://api.anthropic.com/v1/organizations/cost_report");
    costUrl.searchParams.set("starting_at", starting_at);
    costUrl.searchParams.set("ending_at", ending_at);
    costUrl.searchParams.set("bucket_width", "1d");
    costUrl.searchParams.append("group_by[]", "description");

    const costRes = await fetch(costUrl.toString(), {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": adminKey,
        "User-Agent": "MauxCRM/1.0 (https://maux.cz)",
      },
    });

    const costData = await costRes.json();
    if (!costRes.ok) return res.status(costRes.status).json(costData);

    const usageUrl = new URL("https://api.anthropic.com/v1/organizations/usage_report/messages");
    usageUrl.searchParams.set("starting_at", starting_at);
    usageUrl.searchParams.set("ending_at", ending_at);
    usageUrl.searchParams.set("bucket_width", "1d");
    usageUrl.searchParams.append("group_by[]", "model");

    const usageRes = await fetch(usageUrl.toString(), {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": adminKey,
        "User-Agent": "MauxCRM/1.0 (https://maux.cz)",
      },
    });

    const usageData = await usageRes.json();

    return res.status(200).json({ costs: costData, usage: usageRes.ok ? usageData : null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
