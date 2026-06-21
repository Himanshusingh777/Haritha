// _db.js — Postgres connection + state helpers for the Vercel serverless
// functions. Same Supabase database, same schema (plus the new
// `live_locations` table — see schema.sql).
//
// Underscore-prefixed filename: Vercel only turns files directly under
// /api into routes, and explicitly skips anything starting with `_`,
// so this stays a plain importable module, not an endpoint.

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables.");
}

const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL || "");

// `max` kept small on purpose: serverless functions spin up many short-lived
// instances, each with its own small pool. Your Supabase connection string
// should point at the pooler endpoint (port 6543, "Transaction" mode) —
// that's what makes this scale on serverless. If yours doesn't, grab the
// pooler URI from Supabase: Project Settings → Database → Connection pooling.
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
});

const SEED_CATALOG = [
  ["Tomato", "🍅", 40, "kg", 60], ["Onion", "🧅", 35, "kg", 80], ["Potato", "🥔", 30, "kg", 100],
  ["Carrot", "🥕", 50, "kg", 40], ["Green Chilli", "🌶️", 60, "kg", 15], ["Spinach (Palak)", "🥬", 25, "bunch", 30],
  ["Coriander", "🌿", 15, "bunch", 45], ["Cauliflower", "🥦", 40, "piece", 25], ["Brinjal", "🍆", 45, "kg", 35],
  ["Lady Finger", "🫛", 55, "kg", 28], ["Cucumber", "🥒", 35, "kg", 40], ["Capsicum", "🫑", 70, "kg", 20],
  ["Ginger", "🫚", 120, "kg", 12], ["Garlic", "🧄", 150, "kg", 10], ["Lemon", "🍋", 60, "kg", 18],
  ["Sweet Corn", "🌽", 30, "piece", 50], ["Mushroom", "🍄", 80, "pack", 14], ["Pumpkin", "🎃", 25, "kg", 22],
].map(([name, emoji, price, unit, stock], i) => ({
  id: `v${i + 1}`, name, emoji, price, unit, stock, available: true,
}));

const SEED_PARTNERS = [
  { id: "p1", name: "Ravi Kumar", phone: "98480 11111", online: false },
  { id: "p2", name: "Suresh Reddy", phone: "90000 22222", online: false },
];

export async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*) FROM vegetables");
  if (Number(rows[0].count) > 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const v of SEED_CATALOG) {
      await client.query(
        "INSERT INTO vegetables (id,name,emoji,price,unit,stock,available) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [v.id, v.name, v.emoji, v.price, v.unit, v.stock, v.available]
      );
    }
    for (const p of SEED_PARTNERS) {
      await client.query(
        "INSERT INTO partners (id,name,phone,online) VALUES ($1,$2,$3,$4)",
        [p.id, p.name, p.phone, p.online]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getFullState() {
  const catalogRes = await pool.query(
    "SELECT id,name,emoji,price,unit,stock,available FROM vegetables ORDER BY name ASC"
  );
  const catalog = catalogRes.rows.map((r) => ({
    id: r.id, name: r.name, emoji: r.emoji, price: Number(r.price),
    unit: r.unit, stock: Number(r.stock), available: r.available,
  }));

  const ordersRes = await pool.query(
    `SELECT id,items,customer,payment_method,payment_status,subtotal,fee,total,
            status,partner_id,placed_at,history
     FROM orders ORDER BY placed_at DESC`
  );
  const orders = ordersRes.rows.map((r) => ({
    id: r.id, items: r.items, customer: r.customer,
    paymentMethod: r.payment_method, paymentStatus: r.payment_status,
    subtotal: r.subtotal != null ? Number(r.subtotal) : 0,
    fee: r.fee != null ? Number(r.fee) : 0,
    total: r.total != null ? Number(r.total) : 0,
    status: r.status, partnerId: r.partner_id,
    placedAt: Number(r.placed_at), history: r.history,
  }));

  const partnersRes = await pool.query("SELECT id,name,phone,online FROM partners ORDER BY name ASC");
  const partners = partnersRes.rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, online: r.online,
  }));

  const liveRes = await pool.query("SELECT order_id, lat, lng FROM live_locations");
  const liveLocations = {};
  for (const r of liveRes.rows) liveLocations[r.order_id] = { lat: r.lat, lng: r.lng };

  return { catalog, orders, partners, liveLocations };
}

export async function replaceFullState(data) {
  const catalog = data.catalog || [];
  const orders = data.orders || [];
  const partners = data.partners || [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM vegetables");
    for (const v of catalog) {
      await client.query(
        "INSERT INTO vegetables (id,name,emoji,price,unit,stock,available) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [v.id, v.name, v.emoji, v.price, v.unit, v.stock, v.available]
      );
    }

    await client.query("DELETE FROM partners");
    for (const p of partners) {
      await client.query(
        "INSERT INTO partners (id,name,phone,online) VALUES ($1,$2,$3,$4)",
        [p.id, p.name, p.phone, p.online]
      );
    }

    await client.query("DELETE FROM orders");
    for (const o of orders) {
      await client.query(
        `INSERT INTO orders (id,items,customer,payment_method,payment_status,subtotal,fee,
                              total,status,partner_id,placed_at,history)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          o.id, JSON.stringify(o.items), JSON.stringify(o.customer),
          o.paymentMethod ?? null, o.paymentStatus ?? null,
          o.subtotal ?? null, o.fee ?? null, o.total ?? null,
          o.status, o.partnerId ?? null, o.placedAt,
          JSON.stringify(o.history || []),
        ]
      );
    }

    // Self-cleaning: drop any live-GPS rows for orders that are no longer
    // out for delivery (or that no longer exist at all).
    await client.query(
      `DELETE FROM live_locations
       WHERE order_id NOT IN (
         SELECT id FROM orders WHERE status IN ('ASSIGNED','PICKED_UP')
       )`
    );

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function getSetting(key, fallback = null) {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key=$1", [key]);
  return rows.length ? rows[0].value : fallback;
}

export async function setSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

export async function upsertLiveLocation(orderId, lat, lng) {
  await pool.query(
    `INSERT INTO live_locations (order_id, lat, lng, updated_at) VALUES ($1,$2,$3,$4)
     ON CONFLICT (order_id) DO UPDATE SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = EXCLUDED.updated_at`,
    [orderId, lat, lng, Date.now()]
  );
}
