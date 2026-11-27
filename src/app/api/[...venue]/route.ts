import { createPapupayApi } from "../../../../server/api.mjs";

let api: ReturnType<typeof createPapupayApi> | undefined;

function handle(request: Request) {
  // Access request data before preparing the backend so prerendering never
  // resolves deployment configuration or initializes a database pool.
  void request.url;
  try {
    api ??= createPapupayApi();
  } catch (error) {
    console.error("PapuPay venue API configuration unavailable", error instanceof Error ? error.name : "Error");
    return Response.json({ error: "venue_service_unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  return api.handle(request);
}

export { handle as GET, handle as HEAD, handle as POST, handle as DELETE };
