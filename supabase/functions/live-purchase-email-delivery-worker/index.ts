// Retired 23 November 2026 at owner's instruction.
// Do not reintroduce the former email provider or claim queued jobs in this worker.
// Purchase fulfilment is independent of this endpoint. Use a separately approved
// transactional email provider and a new reviewed worker for future confirmations.
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
Deno.serve((req: Request) => {
  if (req.method !== "POST")
    return new Response(JSON.stringify({error: "Method not allowed"}), {status: 405, headers});
  return new Response(JSON.stringify({
    status: "retired",
    sending_enabled: false,
    queue_mutations_enabled: false,
    message: "This delivery endpoint is retired. No email was sent and no job was claimed."
  }), {status: 410, headers});
});
