import React, { useState } from "react";
import { useApp } from "../store.jsx";
import { WhoBar, EmptyState, LiveMap } from "./Shared.jsx";
import { inr, navigateLinkFor, STATUS, PARTNER_PAY } from "../helpers.js";

export function DeliveryAuth() {
  const { partnerAuthSubmit } = useApp();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="card pad" style={{ maxWidth: 380, margin: "30px auto" }}>
      <h2 className="sec-title">Delivery partner login</h2>
      <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
        Ask the store admin to add you as a partner and set a password for you first.
      </p>
      <label className="fld"><span>Phone number</span><input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your registered mobile" /></label>
      <label className="fld"><span>Password</span><input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /></label>
      <button className="btn btn-green btn-block" onClick={() => partnerAuthSubmit({ phone: phone.trim(), password })}>Log in</button>
    </div>
  );
}

function DeliveryCard({ o }) {
  const { advance, liveLocations } = useApp();
  const navUrl = navigateLinkFor(o.customer);
  const hasLoc = !!(o.customer.lat || liveLocations[o.id]);
  const isLive = !!liveLocations[o.id];
  const action = o.status === "ASSIGNED"
    ? <button className="btn btn-carrot btn-block" onClick={() => advance(o.id, "PICKED_UP", "Order picked up")}>📦 Picked up from store</button>
    : <button className="btn btn-green btn-block" onClick={() => advance(o.id, "DELIVERED", "Delivered! 🎉")}>
        ✓ Mark as delivered{o.paymentMethod === "COD" ? ` · collect ${inr(o.total)}` : ""}
      </button>;

  return (
    <div className="order">
      <div className="top">
        <div className="oid">{o.id}</div>
        <span className={"pill " + STATUS[o.status].cls}>{STATUS[o.status].label}</span>
      </div>
      <div className="items-line">{o.items.map((i) => `${i.emoji} ${i.name} ×${i.qty}`).join("  ·  ")}</div>
      <div className="card pad" style={{ background: "#FAF8F1", padding: 12, margin: "10px 0", boxShadow: "none" }}>
        <div style={{ display: "flex", gap: 10 }}><b style={{ minWidth: 54 }}>Pickup</b><span>🏪 Haritha Store, Banjara Hills, Hyderabad</span></div>
        <div className="hr" style={{ margin: "9px 0" }} />
        <div style={{ display: "flex", gap: 10 }}>
          <b style={{ minWidth: 54 }}>Drop</b>
          <span>
            {o.customer.name} · {o.customer.address}
            {hasLoc ? <b style={{ color: "var(--green)" }}> · {isLive ? "📡 live" : "GPS pinned"}</b> : null}
            <br /><span className="muted">📞 {o.customer.phone}</span>
          </span>
        </div>
        {hasLoc ? <LiveMap orderId={o.id} customer={o.customer} /> : null}
      </div>
      <div className="meta"><span>💳 {o.paymentMethod === "COD" ? <b style={{ color: "var(--carrot)" }}>Collect {inr(o.total)} cash</b> : "Prepaid — nothing to collect"}</span></div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <a className="btn btn-dark" href={navUrl} target="_blank" rel="noreferrer" style={{ flex: "0 0 auto" }}>🧭 Navigate</a>
        <div style={{ flex: 1 }}>{action}</div>
      </div>
    </div>
  );
}

export function Delivery() {
  const { auth, partners, orders, goOnline } = useApp();
  if (auth.role !== "partner") return <DeliveryAuth />;
  const me = partners.find((p) => p.id === auth.partnerId);
  if (!me) {
    return (
      <>
        <WhoBar label="🛵 Delivery partner" />
        <EmptyState emoji="🛵" title="Partner profile not found" sub="Your login worked, but the store admin removed this partner profile. Contact them to be re-added." />
      </>
    );
  }
  const mine = orders.filter((o) => o.partnerId === me.id);
  const active = mine.filter((o) => ["ASSIGNED", "PICKED_UP"].includes(o.status)).slice().sort((a, b) => a.placedAt - b.placedAt);
  const delivered = mine.filter((o) => o.status === "DELIVERED");
  const earnings = delivered.length * PARTNER_PAY;

  return (
    <>
      <WhoBar label={`🛵 ${me.name}`} />
      <div className="card pad" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className={"dotg " + (me.online ? "on-dot" : "off-dot")} style={{ width: 12, height: 12 }} />
          <div>
            <div style={{ fontWeight: 700, fontFamily: "'Fraunces',serif", fontSize: 17 }}>{me.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>{me.online ? "You are online — you can receive deliveries" : "You are offline"}</div>
          </div>
          <button className={"btn " + (me.online ? "btn-ghost" : "btn-green") + " btn-sm"} style={{ marginLeft: "auto" }} onClick={goOnline}>
            {me.online ? "Go offline" : "Go online"}
          </button>
        </div>
      </div>
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="stat"><div className="v">{active.length}</div><div className="k">Active deliveries</div></div>
        <div className="stat"><div className="v">{delivered.length}</div><div className="k">Delivered</div></div>
        <div className="stat"><div className="v">{inr(earnings)}</div><div className="k">Earnings</div></div>
      </div>
      {!me.online ? (
        <EmptyState emoji="💤" title="You are offline" sub="Go online to start receiving delivery assignments from the store." />
      ) : !active.length ? (
        <EmptyState emoji="✅" title="No deliveries right now" sub="New assignments from the store will appear here automatically." />
      ) : (
        <>
          <h2 className="sec-title">Your deliveries</h2>
          {active.map((o) => <DeliveryCard o={o} key={o.id} />)}
        </>
      )}
    </>
  );
}
