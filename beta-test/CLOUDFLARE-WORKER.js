const ALLOWED_ORIGINS = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "https://studiosampersand.github.io"
];

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : "https://studiosampersand.github.io",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
function clean(value, max) { return String(value || "").trim().slice(0, max); }
function supportLabels(payload) {
  const labels = [payload.type === "bug" ? "type:bug" : "type:feature", `version:${clean(payload.version, 30)}`];
  const severity = clean(payload.severity, 40).toLowerCase();
  if (severity.includes("data-loss") || severity.includes("unusable")) labels.push("severity:high");
  else if (severity) labels.push("severity:normal");
  const text = `${payload.title} ${payload.description}`.toLowerCase();
  if (/receipt|ticket|attachment|photo/.test(text)) labels.push("area:receipts");
  if (/garage|vehicle|bicycle|car|motorcycle/.test(text)) labels.push("area:garage");
  if (/backup|drive|sync/.test(text)) labels.push("area:backup");
  if (/route|address|geocode/.test(text)) labels.push("area:routing");
  return [...new Set(labels)];
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const isHealthCheck = request.method === "GET" && url.pathname === "/" && origin === "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (!isHealthCheck && !ALLOWED_ORIGINS.includes(origin)) return json({ error: "Forbidden" }, 403, origin);

    try {
      if (url.pathname === "/geocode" && request.method === "GET") {
        const text = clean(url.searchParams.get("text"), 200);
        if (text.length < 3) return json({ error: "Invalid address" }, 400, origin);
        const orsUrl = new URL("https://api.openrouteservice.org/geocode/autocomplete");
        orsUrl.searchParams.set("api_key", env.ORS_API_KEY);
        orsUrl.searchParams.set("text", text);
        orsUrl.searchParams.set("size", "5");
        orsUrl.searchParams.set("boundary.country", "BE");
        const response = await fetch(orsUrl);
        return new Response(await response.text(), { status: response.status, headers: { ...cors(origin), "Content-Type": "application/json" } });
      }

      if (url.pathname === "/route" && request.method === "POST") {
        const body = await request.json();
        const coordinates = body.coordinates;
        const profile = body.profile || "driving-car";
        const allowedProfiles = ["driving-car", "cycling-regular", "foot-walking"];
        if (!allowedProfiles.includes(profile) || !Array.isArray(coordinates) || coordinates.length !== 2 || coordinates.some(point => !Array.isArray(point) || point.length !== 2 || point.some(value => typeof value !== "number"))) {
          return json({ error: "Invalid route request" }, 400, origin);
        }
        const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
          method: "POST",
          headers: { Authorization: env.ORS_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates })
        });
        return new Response(await response.text(), { status: response.status, headers: { ...cors(origin), "Content-Type": "application/json" } });
      }

      if (url.pathname === "/support" && request.method === "POST") {
        if (!env.GITHUB_TOKEN) return json({ error: "Support is not configured" }, 503, origin);
        const body = await request.json();
        const type = body.type === "bug" ? "bug" : "request";
        const title = clean(body.title, 120);
        const description = clean(body.description, 5000);
        if (title.length < 3 || description.length < 10) return json({ error: "Incomplete report" }, 400, origin);
        const email = body.mayContact ? clean(body.email, 200) : "";
        const issueTitle = `[MoBud ${type === "bug" ? "Bug" : "Request"}] ${title}`;
        const issueBody = [
          `## ${type === "bug" ? "Bug report" : "Feature request"}`,
          description,
          "",
          "## Technical context",
          `- Version: ${clean(body.version, 30) || "unknown"}`,
          `- Platform: ${clean(body.platform, 80) || "unknown"}`,
          `- Installed PWA: ${body.installed ? "yes" : "no"}`,
          `- Online: ${body.online ? "yes" : "no"}`,
          `- Severity: ${clean(body.severity, 40) || "not specified"}`,
          `- Contact permitted: ${body.mayContact ? "yes" : "no"}`,
          email ? `- Contact email: ${email}` : "",
          "",
          "> Submitted from MoBud. The form asks users not to include addresses, receipts, vehicle identifiers or other private data."
        ].filter(Boolean).join("\n");
        const repo = env.GITHUB_REPO || "studiosampersand/vialego";
        const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "MoBud-Cloudflare-Worker",
            "X-GitHub-Api-Version": "2022-11-28"
          },
          body: JSON.stringify({ title: issueTitle, body: issueBody, labels: supportLabels(body) })
        });
        const result = await response.json();
        if (!response.ok) return json({ error: "GitHub issue creation failed" }, 502, origin);
        return json({ ok: true, reference: `GH-${result.number}` }, 201, origin);
      }

      return json({ service: "MoBud API", status: "online" }, 200, origin);
    } catch (error) {
      return json({ error: "Service temporarily unavailable" }, 500, origin);
    }
  }
};
