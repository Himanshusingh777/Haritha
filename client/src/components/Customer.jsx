import React, { useState } from "react";
import { useApp } from "../store.jsx";
import { WhoBar, EmptyState, LiveMap } from "./Shared.jsx";
import {
  inr, cartItems, cartSubtotal, feeFor, FREE_ABOVE, OFFER_THEMES,
  STATUS, TRACK_STEPS, STEP_ORDER,
} from "../helpers.js";

export function CustomerAuth() {
  const { custAuthMode, setCustAuthMode, customerAuthSubmit } = useApp();
  const mode = custAuthMode || "login";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="card pad" style={{ maxWidth: 380, margin: "30px auto" }}>
      <div className="subtabs" style={{ marginBottom: 18 }}>
        <button className={mode === "login" ? "on" : ""} onClick={() => setCustAuthMode("login")}>Log in</button>
        <button className={mode === "signup" ? "on" : ""} onClick={() => setCustAuthMode("signup")}>Sign up</button>
      </div>
      {mode === "signup" && (
        <label className="fld">
          <span>Your name</span>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anita Sharma" />
        </label>
      )}
      <label className="fld">
        <span>Phone number</span>
        <input className="inp" value={phone} onChange={(e) => setPhone(e.target.value.trim())} placeholder="10-digit mobile" />
      </label>
      <label className="fld">
        <span>Password</span>
        <input
          className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Choose a password" : "Your password"}
        />
      </label>
      <button
        className="btn btn-green btn-block"
        onClick={() => customerAuthSubmit(mode, { name: name.trim(), phone: phone.trim(), password })}
      >
        {mode === "signup" ? "Create account" : "Log in"}
      </button>
    </div>
  );
}

function HeroBanner() {
  const { catalog } = useApp();
  const count = catalog.filter((v) => v.available).length;
  return (
    <div className="hero">
      <div className="hero-text">
        <span className="hero-eyebrow">🌾 Fresh from the Ranga Reddy farms</span>
        <h2>Today's harvest,<br />at your door by evening.</h2>
        <div className="hero-chips">
          <span className="hchip">🚚 Free above {inr(FREE_ABOVE)}</span>
          <span className="hchip">⏱️ Same-day delivery</span>
          <span className="hchip">🥕 {count} picked fresh today</span>
        </div>
      </div>
      <div className="hero-stack" aria-hidden="true">
        <span className="hs1">🍅</span><span className="hs2">🥦</span><span className="hs3">🥕</span>
        <span className="hs4">🌿</span><span className="hs5">🍆</span>
      </div>
    </div>
  );
}

function OffersRail() {
  const { offers } = useApp();
  if (!offers.length) return null;
  return (
    <div className="offers-rail">
      {offers.map((o, i) => (
        <div key={i} className={"offer-card oc-theme-" + (o.theme || "green")}>
          <div className="oc-emoji">{o.emoji || "🎉"}</div>
          <div className="oc-title">{o.title || ""}</div>
          {o.sub ? <div className="oc-sub">{o.sub}</div> : null}
          {o.code ? <span className="oc-code">{o.code}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function CustShop() {
  const { catalog, cart, addToCart, cartInc, cartDec } = useApp();
  const avail = catalog.filter((v) => v.available);
  return (
    <>
      <HeroBanner />
      <OffersRail />
      <div className="grid">
        {avail.map((v) => {
          const out = v.stock <= 0;
          const inCart = cart[v.id] || 0;
          const badge = out
            ? <span className="badge b-out">Out of stock</span>
            : v.stock <= 10
              ? <span className="badge b-low">Only {v.stock} left</span>
              : <span className="badge b-stock">In stock</span>;
          let foot;
          if (out) {
            foot = <button className="btn btn-ghost btn-block btn-sm" disabled>Unavailable</button>;
          } else if (inCart) {
            foot = (
              <div className="stepper">
                <button onClick={() => cartDec(v.id)}>−</button>
                <span>{inCart} {v.unit}</span>
                <button onClick={() => cartInc(v.id)}>+</button>
              </div>
            );
          } else {
            foot = <button className="btn btn-carrot btn-block btn-sm" onClick={() => addToCart(v.id)}>Add to cart</button>;
          }
          return (
            <div key={v.id} className={"veg" + (out ? " soldout" : "")}>
              <div className="emoji">{v.emoji}</div>
              <div className="nm">{v.name}</div>
              <div className="pr">{inr(v.price)} <span className="unit">/ {v.unit}</span></div>
              <div style={{ marginTop: 7 }}>{badge}</div>
              <div className="foot">{foot}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function CustCart() {
  const { cart, catalog, cartInc, cartDec, cartRemove, auth, setCustTab, placeOrder, refreshSettings, setModal, closeModal, toast } = useApp();
  const [name, setName] = useState(auth.name || "");
  const [addr, setAddr] = useState("");
  const [pay, setPay] = useState("UPI");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);

  const items = cartItems(cart, catalog);
  if (!items.length) {
    return <EmptyState emoji="🛒" title="Your cart is empty" sub="Browse fresh vegetables and add them to your cart." btnLabel="Go to shop" onClick={() => setCustTab("shop")} />;
  }
  const sub = cartSubtotal(cart, catalog);
  const fee = feeFor(sub);
  const tot = sub + fee;

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast("Your browser doesn't support location", "⚠️");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          setAddr(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setAddr(`${lat.toFixed(5)}, ${lng.toFixed(5)} (exact pin attached)`);
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handlePlaceOrder() {
    const order = await placeOrder({ name: name.trim(), address: addr.trim(), paymentMethod: pay, coords });
    if (!order) return;
    if (pay === "UPI") {
      const s = await refreshSettings();
      showUpiPayModal(order, s, setModal, closeModal);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }} className="cartwrap">
      <div className="card pad">
        <h2 className="sec-title">Your cart ({items.length} item{items.length > 1 ? "s" : ""})</h2>
        {items.map((i) => (
          <div className="listrow" key={i.id}>
            <div style={{ fontSize: 30 }}>{i.emoji}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{i.name}</div>
              <div className="muted" style={{ fontSize: 13 }}>{inr(i.price)} / {i.unit}</div>
            </div>
            <div className="right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="stepper" style={{ width: 118 }}>
                <button onClick={() => cartDec(i.id)}>−</button>
                <span>{i.qty}</span>
                <button onClick={() => cartInc(i.id)}>+</button>
              </div>
              <div style={{ fontWeight: 700, width: 54, textAlign: "right" }}>{inr(i.price * i.qty)}</div>
              <button className="btn btn-danger btn-sm" onClick={() => cartRemove(i.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card pad" style={{ alignSelf: "start" }}>
        <h2 className="sec-title">Delivery details</h2>
        <label className="fld">
          <span>Your name</span>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anita Sharma" />
        </label>
        <label className="fld">
          <span>Phone number</span>
          <input className="inp" value={auth.phone || ""} disabled />
        </label>
        <label className="fld">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Delivery address
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }} disabled={locating} onClick={useCurrentLocation}>
              {locating ? "📍 Locating…" : "📍 Use current location"}
            </button>
          </span>
          <textarea
            className="inp" value={addr}
            onChange={(e) => { setAddr(e.target.value); setCoords(null); }}
            placeholder="Flat / house, street, area, landmark, pincode"
          />
          {coords ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>
              📌 Exact location attached — the store and rider will see your pinned spot on a map.
            </div>
          ) : null}
        </label>
        <label className="fld"><span>Payment method</span></label>
        <div className="pay">
          <label><input type="radio" name="pay" value="UPI" checked={pay === "UPI"} onChange={() => setPay("UPI")} /> UPI / Online</label>
          <label><input type="radio" name="pay" value="COD" checked={pay === "COD"} onChange={() => setPay("COD")} /> Cash on delivery</label>
        </div>
        <div className="summary" style={{ marginTop: 16 }}>
          <div className="ln"><span>Subtotal</span><span>{inr(sub)}</span></div>
          <div className="ln"><span>Delivery fee</span><span>{fee === 0 ? <b style={{ color: "var(--green)" }}>FREE</b> : inr(fee)}</span></div>
          <div className="ln tot"><span>Total</span><span>{inr(tot)}</span></div>
        </div>
        <button className="btn btn-green btn-block" style={{ marginTop: 14 }} onClick={handlePlaceOrder}>
          Place order · {inr(tot)}
        </button>
      </div>
      <style>{`@media(max-width:760px){.cartwrap{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

function Tracker({ o }) {
  if (o.status === "REJECTED") {
    return <div className="pill p-rejected" style={{ margin: "10px 0" }}>✕ Order rejected by store</div>;
  }
  const cur = STEP_ORDER[o.status];
  return (
    <div className="track">
      {TRACK_STEPS.map((s, i) => {
        const cls = i < cur ? "done" : i === cur ? "now" : "";
        return (
          <div className={"step " + cls} key={s[0]}>
            <div className="dot">{i < cur ? "✓" : i + 1}</div>
            <div className="lbl">{s[1]}</div>
          </div>
        );
      })}
    </div>
  );
}

function OrderCardCustomer({ o }) {
  const { partners, reorder } = useApp();
  const st = STATUS[o.status];
  const partner = o.partnerId ? partners.find((p) => p.id === o.partnerId) : null;
  return (
    <div className="order">
      <div className="top">
        <div>
          <div className="oid">{o.id}</div>
          <div className="when">{new Date(o.placedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <span className={"pill " + st.cls}>{st.label}</span>
      </div>
      <div className="items-line">{o.items.map((i) => `${i.emoji} ${i.name} ×${i.qty}`).join("  ·  ")}</div>
      <Tracker o={o} />
      {partner && (o.status === "ASSIGNED" || o.status === "PICKED_UP") ? (
        <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>🛵 {partner.name} is handling your delivery · {partner.phone}</div>
      ) : null}
      {["ASSIGNED", "PICKED_UP"].includes(o.status) ? <LiveMap orderId={o.id} customer={o.customer} /> : null}
      <div className="meta" style={{ marginTop: 12 }}>
        <span>💳 <b>{o.paymentMethod}</b> {o.paymentStatus === "Paid" ? "· Paid" : "· " + o.paymentStatus}</span>
        <span className="right" style={{ fontWeight: 700, fontFamily: "'Fraunces',serif", fontSize: 15 }}>{inr(o.total)}</span>
      </div>
      {o.paymentMethod === "UPI" && o.paymentStatus === "Pending" && o.status !== "REJECTED" ? (
        <PayUpiButton o={o} />
      ) : null}
      {o.status === "DELIVERED" ? (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => reorder(o.id)}>↻ Reorder</button>
      ) : null}
    </div>
  );
}

function PayUpiButton({ o }) {
  const { refreshSettings, setModal, closeModal } = useApp();
  return (
    <button
      className="btn btn-carrot btn-sm" style={{ marginTop: 8 }}
      onClick={async () => { const s = await refreshSettings(); showUpiPayModal(o, s, setModal, closeModal); }}
    >
      📲 Pay via UPI
    </button>
  );
}

export function showUpiPayModal(order, settings, setModal, closeModal) {
  const upiId = (settings?.upiId || "").trim();
  if (!upiId) {
    setModal(
      <>
        <h3>Order placed!</h3>
        <p className="muted">The store hasn't set up UPI payments yet — please choose cash on delivery for now, or contact the store directly.</p>
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn btn-green" onClick={closeModal}>Got it</button>
        </div>
      </>
    );
    return;
  }
  const note = encodeURIComponent("Haritha order " + order.id);
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("Haritha Fresh")}&am=${order.total}&cu=INR&tn=${note}`;
  setModal(
    <>
      <h3>Complete your payment</h3>
      <p className="muted" style={{ marginBottom: 14 }}>Pay <b>{inr(order.total)}</b> via UPI to complete order <b>{order.id}</b>.</p>
      <a className="btn btn-green btn-block" href={upiLink} style={{ marginBottom: 10 }}>📲 Pay {inr(order.total)} via UPI app</a>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>On a computer? Open any UPI app on your phone and pay <b>{upiId}</b> the amount <b>{inr(order.total)}</b>, mentioning <b>{order.id}</b> in the note.</p>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>The store will confirm your payment shortly — you can check its status under "My orders".</p>
      <div className="actions" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost btn-block" onClick={closeModal}>Done</button>
      </div>
    </>
  );
}

export function CustOrders() {
  const { orders, auth, setCustTab } = useApp();
  const mine = auth.phone ? orders.filter((o) => o.customer.phone === auth.phone) : [];
  if (!mine.length) {
    return <EmptyState emoji="📦" title="No orders yet" sub="Your placed orders and live tracking will appear here." btnLabel="Start shopping" onClick={() => setCustTab("shop")} />;
  }
  return (
    <>
      {mine.slice().sort((a, b) => b.placedAt - a.placedAt).map((o) => (
        <OrderCardCustomer o={o} key={o.id} />
      ))}
    </>
  );
}

export function Customer() {
  const { auth, custTab, setCustTab, cart } = useApp();
  const cc = Object.values(cart).reduce((a, b) => a + b, 0);
  if (auth.role !== "customer") return <CustomerAuth />;
  const tabs = [
    ["shop", "Shop"],
    ["cart", "Cart" + (cc ? ` · ${cc}` : "")],
    ["orders", "My orders"],
  ];
  return (
    <>
      <WhoBar label={`👤 ${auth.name || ""} · ${auth.phone || ""}`} />
      <div className="subtabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={custTab === id ? "on" : ""} onClick={() => setCustTab(id)}>{label}</button>
        ))}
      </div>
      {custTab === "shop" ? <CustShop /> : custTab === "cart" ? <CustCart /> : <CustOrders />}
    </>
  );
}
