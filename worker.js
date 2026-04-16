// Toby's Quest -- Cloudflare Worker sync API
// Stores state in Cloudflare KV. Authenticated via a shared PIN.
//
// Endpoints:
//   GET  /sync?pin=XXXX        -- returns saved state JSON (or 404 if none)
//   PUT  /sync?pin=XXXX        -- saves state JSON from request body
//   OPTIONS /sync              -- CORS preflight
//
// Environment bindings required:
//   KV namespace: QUEST_DATA
//   Secret:       QUEST_PIN  (set via `wrangler secret put QUEST_PIN`)

export default {
  async fetch(request, env) {
    // CORS headers -- allow any origin so the app works from GitHub Pages or localhost
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Only respond to /sync
    if (url.pathname !== "/sync") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    // Validate PIN
    const pin = url.searchParams.get("pin");
    if (!pin || pin !== env.QUEST_PIN) {
      return new Response("Unauthorised", { status: 401, headers: corsHeaders });
    }

    const kvKey = "toby-quest-state";

    if (request.method === "GET") {
      const data = await env.QUEST_DATA.get(kvKey);
      if (data === null) {
        return new Response("{}", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(data, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const body = await request.text();

      // Basic validation -- must be parseable JSON
      try {
        JSON.parse(body);
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
      }

      await env.QUEST_DATA.put(kvKey, body);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};
