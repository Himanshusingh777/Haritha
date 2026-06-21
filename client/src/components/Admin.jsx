import React, { useState } from "react";
import { useApp } from "../store.jsx";
import { WhoBar, EmptyState, LiveMap, MiniMap } from "./Shared.jsx";
import { openVegModal, openOfferModal, openPartnerModal, openPartnerPwModal } from "./Modals.jsx";
import { inr, timeAgo, isToday, mapsLinkFor, STATUS } from "../helpers.js";

export function AdminAuth() {
  const { adminAuthSubmit } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="card pad" style={{ maxWidth: 380, margin: "30px auto" }}>
      <h2 className="sec-title">Store Admin login</h2>
      <label className="fld">
        <span>Username</span>
        <input className="inp" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Admin username" />
      </label>
      <label className="fld">
        <span>Password</span>
        <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
      </label>
      <button className="btn btn-green btn-block" onClick={() => adminAuthSubmit({ username: username.trim(), password })}>Log in</button>
    </div>
  );
}

function AdminOrderCard({ o }) {
  const { partners, advance, rejectOrder, assignRider, confirmUpiPayment, liveLocations } = useApp();
  const [assignTo, setAssignTo] = useState("");
  const st = STATUS[o.status];
  const onlinePartners = partners.filter((p) => p.online);
  const partner = o.partnerId ? partners.find((p) => p.id === o.partnerId) : null;
  const mapUrl = mapsLinkFor(o.customer);
  const live = ["ASSIGNED", "PICKED_UP"].includes(o.status) && (o.customer.lat || liveLocations[o.id]);

  let actions = null;
  if (o.status === "PLACED") {
    actions = (
      <>
        <button className="btn btn-green btn-sm" onClick={() => advance(o.id, "CONFIRMED", "Order confirmed")}>✓ Confirm</button>
        <button className="btn btn-danger btn-sm" onClick={() => rejectOrder(o.id)}>✕ Reject</button>
      </>
    );
  } else if (o.status === "CONFIRMED") {
    actions = <button className="btn btn-carrot btn-sm" onClick={() => advance(o.id, "PACKED", "Marked as packed")}>📦 Mark packed</button>;
  } else if (o.status === "PACKED") {
    actions = onlinePartners.length ? (
      <>
        <select className="sel" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
          <option value="" disabled>Choose rider</option>
          {onlinePartners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn btn-dark btn-sm" onClick={() => assignTo && assignRider(o.id, assignTo)}>🛵 Assign rider</button>
      </>
    ) : (
      <span className="muted" style={{ fontSize: 13 }}>No delivery partner online — ask a partner to go online first.</span>
    );
  } else if (o.status === "ASSIGNED") {
    actions = <span className="muted" style={{ fontSize: 13 }}>Waiting for {partner ? partner.name : "rider"} to pick up…</span>;
  } else if (o.status === "PICKED_UP") {
    actions = <span className="muted" style={{ fontSize: 13 }}>{partner ? partner.name : "Rider"} is delivering this order.</span>;
  }

  const showConfirmUpi = o.paymentMethod === "UPI" && o.paymentStatus === "Pending" && o.status !== "REJECTED";

  return (
    <div className="order">
      <div className="top">
        <div>
          <div className="oid">{o.id} <span className="muted" style={{ fontWeight: 500 }}>· {o.customer.name}</span></div>
          <div className="when">{timeAgo(o.placedAt)} · {new Date(o.placedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <span className={"pill " + st.cls}>{st.label}</span>
      </div>
      <div className="items-line">{o.items.map((i) => `${i.emoji} ${i.name} ×${i.qty}`).join("  ·  ")}</div>
      <div className="meta">
        <span>📞 {o.customer.phone}</span>
        <span>
          📍 <a href={mapUrl} target="_blank" rel="noreferrer">{o.customer.address}</a>
          {liveLocations[o.id] ? <b style={{ color: "var(--green)" }}> · 📡 live</b> : o.customer.lat ? <b style={{ color: "var(--green)" }}> · GPS pinned</b> : null}
        </span>
        <span>💳 {o.paymentMethod} ({o.paymentStatus})</span>
        <span className="right" style={{ fontWeight: 700 }}>{inr(o.total)}</span>
      </div>
      {live ? <LiveMap orderId={o.id} customer={o.customer} /> : <MiniMap customer={o.customer} />}
      {(actions || showConfirmUpi) ? (
        <div className="actions">
          {actions}
          {showConfirmUpi ? (
            <button className="btn btn-dark btn-sm" onClick={() => confirmUpiPayment(o.id)}>💰 Confirm UPI payment received</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminOrders() {
  const { orders } = useApp();
  if (!orders.length) {
    return <EmptyState emoji="🗒️" title="No orders yet" sub="When customers place orders, they show up here for you to confirm, pack and assign." />;
  }
  const active = orders.filter((o) => !["DELIVERED", "REJECTED"].includes(o.status)).slice().sort((a, b) => a.placedAt - b.placedAt);
  const done = orders.filter((o) => ["DELIVERED", "REJECTED"].includes(o.status)).slice().sort((a, b) => b.placedAt - a.placedAt);
  return (
    <>
      <h2 className="sec-title">Active orders ({active.length})</h2>
      {active.length ? active.map((o) => <AdminOrderCard o={o} key={o.id} />) : <p className="muted" style={{ marginBottom: 22 }}>No active orders right now.</p>}
      {done.length ? (
        <>
          <h2 className="sec-title" style={{ marginTop: 26 }}>Completed & rejected ({done.length})</h2>
          {done.map((o) => <AdminOrderCard o={o} key={o.id} />)}
        </>
      ) : null}
    </>
  );
}

export function AdminCatalog() {
  const app = useApp();
  const { catalog, toggleVeg, deleteVeg } = app;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="sec-title" style={{ margin: 0 }}>Vegetable catalog ({catalog.length})</h2>
        <button className="btn btn-green btn-sm" onClick={() => openVegModal(null, app)}>＋ Add vegetable</button>
      </div>
      <div className="card pad">
        {catalog.length ? catalog.map((v) => (
          <div className="listrow" key={v.id}>
            <span style={{ fontSize: 28 }}>{v.emoji}</span>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontWeight: 600 }}>{v.name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{inr(v.price)} / {v.unit}</div>
            </div>
            <span className={"badge " + (v.stock <= 0 ? "b-out" : v.stock <= 10 ? "b-low" : "b-stock")} style={{ marginLeft: 6 }}>{v.stock} {v.unit}</span>
            <div className="right" style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => toggleVeg(v.id)}>{v.available ? "🟢 Listed" : "⚪ Hidden"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => openVegModal(v.id, app)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => deleteVeg(v.id)}>Delete</button>
            </div>
          </div>
        )) : <p className="muted">No items yet. Add your first vegetable.</p>}
      </div>
    </>
  );
}

export function AdminOffers() {
  const app = useApp();
  const { offers, deleteOffer } = app;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="sec-title" style={{ margin: 0 }}>Promotional offers ({offers.length})</h2>
        <button className="btn btn-green btn-sm" onClick={() => openOfferModal(null, app)}>＋ Add offer</button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
        These show as a scrolling banner at the top of the Shop page for every customer — just like the offers strip on food delivery apps.
      </p>
      <div className="card pad">
        {offers.length ? offers.map((o, i) => (
          <div className="listrow" key={i}>
            <span style={{ fontSize: 26 }}>{o.emoji || "🎉"}</span>
            <div style={{ minWidth: 140, flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{o.title || ""}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{o.sub || ""}{o.code ? ` · code ${o.code}` : ""}</div>
            </div>
            <span className={"badge oc-theme-" + (o.theme || "green")} style={{ color: "#fff" }}>{o.theme || "green"}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => openOfferModal(i, app)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteOffer(i)}>Delete</button>
          </div>
        )) : <p className="muted">No offers yet. Add one to promote a discount or deal.</p>}
      </div>
    </>
  );
}

export function AdminPartners() {
  const app = useApp();
  const { partners, orders, removePartner } = app;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="sec-title" style={{ margin: 0 }}>Delivery partners ({partners.length})</h2>
        <button className="btn btn-green btn-sm" onClick={() => openPartnerModal(app)}>＋ Add partner</button>
      </div>
      <div className="card pad">
        {partners.length ? partners.map((p) => {
          const active = orders.filter((o) => o.partnerId === p.id && ["ASSIGNED", "PICKED_UP"].includes(o.status)).length;
          return (
            <div className="listrow" key={p.id}>
              <span className={"dotg " + (p.online ? "on-dot" : "off-dot")} />
              <div>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{p.phone}</div>
              </div>
              <span className="right muted" style={{ fontSize: 13 }}>{p.online ? "Online" : "Offline"}{active ? ` · ${active} active` : ""}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => openPartnerPwModal(p.id, app)}>Set password</button>
              <button className="btn btn-danger btn-sm" onClick={() => removePartner(p.id)}>Remove</button>
            </div>
          );
        }) : <p className="muted">No delivery partners yet.</p>}
      </div>
    </>
  );
}

export function AdminDashboard() {
  const { orders, catalog, settings, saveUpiSetting, resetDemo } = useApp();
  const [upiId, setUpiId] = useState(settings.upiId || "");
  const today = orders.filter((o) => isToday(o.placedAt));
  const revenue = orders.filter((o) => o.status === "DELIVERED").reduce((a, o) => a + o.total, 0);
  const pend = orders.filter((o) => !["DELIVERED", "REJECTED"].includes(o.status)).length;
  const lowList = catalog.filter((v) => v.available && v.stock <= 10).slice().sort((a, b) => a.stock - b.stock);

  return (
    <>
      <div className="card pad" style={{ marginBottom: 18 }}>
        <h2 className="sec-title">💳 UPI payment settings</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Customers will be asked to pay this UPI ID directly. You'll need to manually confirm each payment once you see it land in your account.
        </p>
        <label className="fld">
          <span>Your UPI ID (VPA)</span>
          <input className="inp" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" />
        </label>
        <button className="btn btn-green btn-sm" onClick={() => saveUpiSetting(upiId.trim())}>Save UPI ID</button>
      </div>
      <div className="stats">
        <div className="stat"><span className="ic">📦</span><div className="v">{today.length}</div><div className="k">Orders today</div></div>
        <div className="stat"><span className="ic">💰</span><div className="v">{inr(revenue)}</div><div className="k">Revenue (delivered)</div></div>
        <div className="stat"><span className="ic">⏳</span><div className="v">{pend}</div><div className="k">Orders to handle</div></div>
        <div className="stat"><span className="ic">⚠️</span><div className="v">{lowList.length}</div><div className="k">Low on stock</div></div>
      </div>
      <div className="card pad">
        <h2 className="sec-title">⚠️ Restock soon</h2>
        {lowList.length ? lowList.map((v) => (
          <div className="listrow" key={v.id}>
            <span style={{ fontSize: 24 }}>{v.emoji}</span>
            <b>{v.name}</b>
            <span className={"right badge " + (v.stock <= 0 ? "b-out" : "b-low")}>{v.stock} {v.unit} left</span>
          </div>
        )) : <p className="muted">Everything is well stocked. 🌿</p>}
      </div>
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-ghost btn-sm" onClick={resetDemo}>↺ Reset demo data</button>
      </div>
    </>
  );
}

export function Admin() {
  const { auth, orders, adminTab, setAdminTab } = useApp();
  if (auth.role !== "admin") return <AdminAuth />;
  const pend = orders.filter((o) => !["DELIVERED", "REJECTED"].includes(o.status)).length;
  const tabs = [
    ["orders", "Orders" + (pend ? ` · ${pend}` : "")],
    ["catalog", "Catalog"],
    ["offers", "Offers"],
    ["partners", "Delivery partners"],
    ["dashboard", "Dashboard"],
  ];
  return (
    <>
      <WhoBar label="🏪 Store Admin" />
      <div className="subtabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={adminTab === id ? "on" : ""} onClick={() => setAdminTab(id)}>{label}</button>
        ))}
      </div>
      {adminTab === "orders" ? <AdminOrders />
        : adminTab === "catalog" ? <AdminCatalog />
        : adminTab === "offers" ? <AdminOffers />
        : adminTab === "partners" ? <AdminPartners />
        : <AdminDashboard />}
    </>
  );
}
