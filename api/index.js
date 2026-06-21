/**
 * api/index.js — Haritha Fresh backend, as a Vercel serverless function.
 *
 * One Express app handles every /api/* route (see vercel.json rewrites).
 * No app.listen(), no Socket.io — Vercel calls this as a plain request
 * handler, and the frontend polls /api/state for live updates instead
 * of a persistent socket connection (serverless functions don't keep
 * long-lived connections open).
 */

import express from "express";
import cookieSession from "cookie-session";
import bcrypt from "bcryptjs";
import {
  pool, seedIfEmpty, getFullState, replaceFullState,
  getSetting, setSetting, upsertLiveLocation,
} from "./_db.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use(
  cookieSession({
    name: "session",
    secret: process.env.SECRET_KEY || "dev-secret-change-me",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: "lax",
  })
);

let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    try {
      await seedIfEmpty();
      seeded = true;
    } catch (e) {
      console.error("Seeding failed:", e);
    }
  }
  next();
});

// ---------------------------------------------------------------------------
// state (catalog + orders + partners + live GPS pins)
// ---------------------------------------------------------------------------
app.get("/api/state", async (req, res) => {
  try {
    res.json(await getFullState());
  } catch (e) {
    console.error("ERROR /api/state GET:", e);
    res.status(500).json({ error: "Failed to load data" });
  }
});

app.put("/api/state", async (req, res) => {
  if (!req.session.role) {
    return res.status(401).json({ error: "Please log in first" });
  }
  try {
    await replaceFullState(req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error("ERROR /api/state PUT:", e);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// A customer's browser pings their live GPS position here while a rider is
// en route. Stored (overwritten) in `live_locations`, polled back out via
// GET /api/state — see schema.sql for why this needs to be in the DB now.
app.post("/api/location", async (req, res) => {
  if (req.session.role !== "customer") {
    return res.status(401).json({ error: "Please log in first" });
  }
  const { orderId, lat, lng } = req.body || {};
  if (orderId == null || lat == null || lng == null) {
    return res.status(400).json({ error: "Missing orderId/lat/lng" });
  }
  try {
    await upsertLiveLocation(orderId, lat, lng);
    res.json({ ok: true });
  } catch (e) {
    console.error("ERROR /api/location POST:", e);
    res.status(500).json({ error: "Failed to save location" });
  }
});

// ---------------------------------------------------------------------------
// settings (store UPI ID + promotional offers)
// ---------------------------------------------------------------------------
app.get("/api/settings", async (req, res) => {
  const offersRaw = (await getSetting("offers", "[]")) || "[]";
  let offers = [];
  try {
    offers = JSON.parse(offersRaw);
  } catch {
    offers = [];
  }
  res.json({ upiId: (await getSetting("upi_id", "")) || "", offers });
});

app.put("/api/settings", async (req, res) => {
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin login required" });
  }
  const data = req.body || {};
  if ("upiId" in data) await setSetting("upi_id", (data.upiId || "").trim());
  if ("offers" in data) await setSetting("offers", JSON.stringify(data.offers || []));
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------
app.get("/api/auth/me", (req, res) => {
  const role = req.session.role;
  if (role === "customer") {
    return res.json({ role: "customer", phone: req.session.phone, name: req.session.name });
  }
  if (role === "partner") {
    return res.json({ role: "partner", partnerId: req.session.partnerId, name: req.session.name });
  }
  if (role === "admin") return res.json({ role: "admin" });
  res.json({ role: null });
});

app.post("/api/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.post("/api/auth/customer/register", async (req, res) => {
  const phone = (req.body.phone || "").trim();
  const name = (req.body.name || "").trim();
  const password = req.body.password || "";
  if (!phone || !name || !password) {
    return res.status(400).json({ error: "Please fill in your name, phone and password" });
  }
  const existing = await pool.query("SELECT phone FROM customers WHERE phone=$1", [phone]);
  if (existing.rows.length) {
    return res.status(400).json({ error: "That phone number is already registered — try logging in instead" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO customers (phone, name, password_hash) VALUES ($1,$2,$3)",
    [phone, name, passwordHash]
  );
  req.session = { role: "customer", phone, name };
  res.json({ role: "customer", phone, name });
});

app.post("/api/auth/customer/login", async (req, res) => {
  const phone = (req.body.phone || "").trim();
  const password = req.body.password || "";
  const { rows } = await pool.query("SELECT name, password_hash FROM customers WHERE phone=$1", [phone]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return res.status(401).json({ error: "Wrong phone number or password" });
  }
  req.session = { role: "customer", phone, name: row.name };
  res.json({ role: "customer", phone, name: row.name });
});

app.post("/api/auth/partner/login", async (req, res) => {
  const phone = (req.body.phone || "").trim();
  const password = req.body.password || "";
  const partnerRes = await pool.query("SELECT id, name FROM partners WHERE phone=$1", [phone]);
  const prow = partnerRes.rows[0];
  if (!prow) {
    return res.status(401).json({ error: "No delivery partner is registered with that phone number" });
  }
  const credRes = await pool.query(
    "SELECT password_hash FROM partner_credentials WHERE partner_id=$1",
    [prow.id]
  );
  const crow = credRes.rows[0];
  if (!crow || !(await bcrypt.compare(password, crow.password_hash))) {
    return res.status(401).json({ error: "Wrong password" });
  }
  req.session = { role: "partner", partnerId: prow.id, name: prow.name };
  res.json({ role: "partner", partnerId: prow.id, name: prow.name });
});

app.post("/api/auth/partner/set-password", async (req, res) => {
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin login required" });
  }
  const { partnerId, password } = req.body || {};
  if (!partnerId || !password) {
    return res.status(400).json({ error: "Missing partner or password" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO partner_credentials (partner_id, password_hash) VALUES ($1,$2)
     ON CONFLICT (partner_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [partnerId, passwordHash]
  );
  res.json({ ok: true });
});

app.post("/api/auth/admin/login", (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";
  if (username && username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session = { role: "admin" };
    return res.json({ role: "admin" });
  }
  res.status(401).json({ error: "Wrong username or password" });
});

export default app;
