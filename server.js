const path = require("node:path");
const fs = require("node:fs/promises");

const links = new Map();
const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const port = Number(process.env.PORT || 3000);
const configuredBaseUrl = process.env.BASE_URL;
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const publicDir = process.env.PUBLIC_DIR;

const baseUrl = (
  configuredBaseUrl ||
  (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`)
).replace(/\/$/, "");

const publicRoot = publicDir ? path.resolve(publicDir) : null;

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json", ...extraHeaders }),
  });
}

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

function createUniqueCode() {
  let code = randomCode(6);
  while (links.has(code)) {
    code = randomCode(6);
  }
  return code;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function tryServeStatic(pathname) {
  if (!publicRoot) {
    return null;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (!relativePath) {
    return null;
  }

  const candidatePath = path.resolve(publicRoot, relativePath);
  const normalizedRoot = publicRoot.toLowerCase();
  const normalizedCandidate = candidatePath.toLowerCase();

  if (
    normalizedCandidate !== normalizedRoot &&
    !normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    return null;
  }

  try {
    const stat = await fs.stat(candidatePath);
    if (!stat.isFile()) {
      return null;
    }

    return new Response(Bun.file(candidatePath), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch {
    return null;
  }
}

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!body || typeof body.url !== "string" || !isValidHttpUrl(body.url)) {
        return json({ error: "Invalid URL" }, 400);
      }

      const code = createUniqueCode();
      const link = {
        code,
        url: body.url,
        shortUrl: `${baseUrl}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };

      links.set(code, link);
      return json(link, 201);
    }

    if (req.method === "GET" && pathname === "/api/links") {
      return json(Array.from(links.values()));
    }

    if (req.method === "GET") {
      const staticResponse = await tryServeStatic(pathname);
      if (staticResponse) {
        return staticResponse;
      }

      const code = pathname.replace(/^\//, "");
      const link = links.get(code);
      if (!link) {
        return json({ error: "Not found" }, 404);
      }

      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: corsHeaders({ Location: link.url }),
      });
    }

    return json({ error: "Method not allowed" }, 405);
  },
});

console.log(`Snip backend listening on ${baseUrl} (port ${port})`);
