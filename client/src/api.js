// api.js — talks to the Vercel serverless API. No socket — the app polls
// /api/state on an interval instead (see store.jsx).

export async function fetchState() {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to load data from server");
  return res.json();
}

export async function pushState(state) {
  await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

export async function postLocation(orderId, lat, lng) {
  try {
    await fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, lat, lng }),
    });
  } catch {
    // best-effort — a missed GPS ping isn't worth surfacing to the user
  }
}

export async function fetchMe() {
  const res = await fetch("/api/auth/me");
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch("/api/settings");
  return res.json();
}

// Generic helper for any /api/auth/* or /api/settings call.
// Throws an Error with a friendly message on failure so callers can toast it.
export async function apiRequest(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
