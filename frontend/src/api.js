const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export function resolveApiBaseUrl(value = configuredBaseUrl) {
  const baseUrl = value.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("VITE_API_BASE_URL cannot be empty.");
  if (baseUrl.startsWith("/")) return baseUrl;

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL must be a relative path or a valid URL.");
  }
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("Remote ReadQuest API URLs must use HTTPS.");
  }
  return baseUrl;
}

export function apiUrl(path) {
  return `${resolveApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function errorMessage(status, detail) {
  if (typeof detail === "string" && detail) return detail;
  if (status === 422) return "Check your answers and try again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That ReadQuest item could not be found.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status >= 500) return "The ReadQuest service is temporarily unavailable.";
  return "We could not complete that request. Please try again.";
}

export async function request(path, { method = "GET", body, signal } = {}) {
  const headers = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      credentials: "same-origin",
      signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    const error = new Error("Unable to reach the ReadQuest service. Check your connection.");
    error.status = 0;
    error.cause = cause;
    throw error;
  }

  if (response.status === 204) return null;

  let payload = null;
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType.includes("application/json") || typeof response.json === "function") {
    try { payload = await response.json(); } catch { /* Use the safe status message below. */ }
  }

  if (!response.ok) {
    const error = new Error(errorMessage(response.status, payload?.detail ?? payload?.message));
    error.status = response.status;
    if (response.status === 401 && path !== "/auth/login") {
      window.dispatchEvent(new Event("readquest-session-expired"));
    }
    throw error;
  }

  if (payload === null) {
    const error = new Error("The ReadQuest backend did not return a JSON response.");
    error.status = response.status >= 400 ? response.status : 502;
    throw error;
  }
  return payload;
}

export function getLearningPlan(childId, options = {}) {
  return request(`/children/${childId}/learning-plan`, options);
}

export function generateLearningPlan(childId, options = {}) {
  return request(`/children/${childId}/learning-plan/generate`, {
    ...options,
    method: "POST",
  });
}
