import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { useApp } from "../store.jsx";
import { cartCount, cartSubtotal, feeFor, inr } from "../helpers.js";

export function Header() {
  const { role, setRole, cart, auth } = useApp();
  const cc = cartCount(cart);
  const showLocPill = role === "customer" && auth.role === "customer";
  return (
    <header>
      <div className="head-in">
        <div className="brand">
          <div className="logo">🥬</div>
          <div>
            <h1>Haritha</h1>
            <p>Fresh vegetables, delivered</p>
          </div>
        </div>
        <div className="roles">
          <button className={role === "customer" ? "on" : ""} onClick={() => setRole("customer")}>
            🛒 <span className="t">Shop</span>
            {cc ? <span className="cart-dot">{cc}</span> : null}
          </button>
          <button className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>
            🏪 <span className="t">Store Admin</span>
          </button>
          <button className={role === "delivery" ? "on" : ""} onClick={() => setRole("delivery")}>
            🛵 <span className="t">Delivery</span>
          </button>
        </div>
        <div className="loc-pill" style={{ display: showLocPill ? "flex" : "none" }}>
          📍 Delivering to <b>Hyderabad</b> · Same-day delivery
        </div>
      </div>
    </header>
  );
}

export function WhoBar({ label }) {
  const { logout } = useApp();
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
    </div>
  );
}

export function EmptyState({ emoji, title, sub, btnLabel, onClick }) {
  return (
    <div className="card">
      <div className="empty">
        <div className="e">{emoji}</div>
        <h3>{title}</h3>
        <p>{sub}</p>
        {btnLabel ? (
          <button className="btn btn-green" style={{ marginTop: 14 }} onClick={onClick}>
            {btnLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CartBar() {
  const { role, auth, custTab, setCustTab, cart, catalog } = useApp();
  const showHere = role === "customer" && auth.role === "customer" && custTab !== "cart";
  const cc = cartCount(cart);
  if (!showHere || !cc) return null;
  const sub = cartSubtotal(cart, catalog);
  const fee = feeFor(sub);
  const tot = sub + fee;
  return (
    <div className="cart-bar">
      <div className="cart-bar-inner" onClick={() => setCustTab("cart")}>
        <span className="cb-count">{cc}</span>
        <span className="cb-text">
          {inr(tot)}
          <small>{cc} item{cc > 1 ? "s" : ""} in cart</small>
        </span>
        <span>View cart</span>
        <span className="cb-arrow">→</span>
      </div>
    </div>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  const [show, setShow] = React.useState(false);
  const [content, setContent] = React.useState(null);

  useEffect(() => {
    if (!toastMsg) return;
    setContent(toastMsg);
    setShow(true);
    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  return (
    <div className={"toast" + (show ? " show" : "")}>
      {content ? (
        <>
          <span>{content.emoji}</span>
          {content.msg}
        </>
      ) : null}
    </div>
  );
}

export function ModalHost() {
  const { modal, closeModal } = useApp();
  return (
    <div className={"overlay" + (modal ? " show" : "")} onClick={(e) => { if (e.target.classList.contains("overlay")) closeModal(); }}>
      <div className="modal">{modal}</div>
    </div>
  );
}

// Live Leaflet map — mirrors refreshLiveMaps() from the original app, but
// React-style: one map instance per mounted <LiveMap>, updated on prop change
// instead of being torn down and rebuilt on every render.
export function LiveMap({ orderId, customer }) {
  const { liveLocations } = useApp();
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const loc = liveLocations[orderId] || (customer.lat ? { lat: customer.lat, lng: customer.lng } : null);

  useEffect(() => {
    if (!elRef.current || !loc) return;
    if (!mapRef.current) {
      mapRef.current = L.map(elRef.current, { zoomControl: false, attributionControl: false }).setView(
        [loc.lat, loc.lng], 15
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
      markerRef.current = L.marker([loc.lat, loc.lng]).addTo(mapRef.current);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (mapRef.current && markerRef.current && loc) {
      markerRef.current.setLatLng([loc.lat, loc.lng]);
      mapRef.current.panTo([loc.lat, loc.lng]);
    }
  }, [loc?.lat, loc?.lng]);

  if (!loc) return null;
  return <div ref={elRef} className="live-map" />;
}

export function MiniMap({ customer }) {
  if (!customer.lat || !customer.lng) return null;
  const src = `https://www.google.com/maps?q=${customer.lat},${customer.lng}&output=embed`;
  return <iframe className="mini-map" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Customer location" />;
}
