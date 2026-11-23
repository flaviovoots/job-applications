// A JSON answer with the Content-Type the server sends, for tests that mock
// fetch.
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// What requireAuth answers on /api/* without a session.
export function notSignedIn(): Response {
  return jsonResponse(401, { error: "Not signed in", requestId: "req-1" });
}
