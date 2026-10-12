export async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method, credentials: "same-origin", signal,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let detail;
    try { detail = (await response.json()).detail; } catch { /* Use safe fallback below. */ }
    const error = new Error(typeof detail === "string" ? detail : response.status === 422 ? "Check your answers and try again." : "We could not complete that request. Please try again.");
    error.status = response.status;
    if (response.status === 401 && path !== "/auth/login") window.dispatchEvent(new Event("readquest-session-expired"));
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
