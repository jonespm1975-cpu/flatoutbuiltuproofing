// Retired legacy sandbox receipt checker, 23 November 2026.
// Its original test window has expired; no external email service may be called.
// Use sandbox dry-run worker or a separately approved provider for future tests.
Deno.serve((_req: Request) => new Response(null, {
  status: 404,
  headers: {"cache-control":"no-store","x-content-type-options":"nosniff"}
}));
