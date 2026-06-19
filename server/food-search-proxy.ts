import type { Connect } from "vite";
import type { Plugin } from "vite";

const SEARCH_URL = "https://search.openfoodfacts.org/search";
const USER_AGENT = "AngelikaFitnessPlanner/1.0 (personal fitness app)";

async function readRequestBody(req: Connect.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString();
}

async function forwardSearch(body: string) {
  const response = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  return { status: response.status, text };
}

export function foodSearchProxy(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.url !== "/api/food-search" || req.method !== "POST") {
      next();
      return;
    }

    try {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body) as { q?: string };
      const query = parsed.q?.trim() ?? "";

      if (query.length < 2) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "query_too_short" }));
        return;
      }

      let upstream = await forwardSearch(body);

      if (upstream.status >= 500) {
        upstream = await forwardSearch(body);
      }

      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(upstream.text);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "search_proxy_failed" }));
    }
  };
}

export function foodSearchProxyPlugin(): Plugin {
  return {
    name: "food-search-proxy",
    configureServer(server) {
      server.middlewares.use(foodSearchProxy());
    },
    configurePreviewServer(server) {
      server.middlewares.use(foodSearchProxy());
    },
  };
}
