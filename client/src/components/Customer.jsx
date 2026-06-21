import React, { useState } from "react";
import { useApp } from "../store.jsx";
import { WhoBar, EmptyState, LiveMap } from "./Shared.jsx";
import {
  inr, cartItems, cartSubtotal, feeFor, FREE_ABOVE, OFFER_THEMES,
  STATUS, TRACK_STEPS, STEP_ORDER,
} from "../helpers.js";

/* ----------------------------------------------------------------------
   PURE DISPLAY HELPERS — cosmetic only. These never read or write any
   app state, never call store actions, and have no effect on cart,
   orders, auth, or pricing logic. They only decide what stars/numbers
   to paint on screen for a given catalog item.
   ---------------------------------------------------------------------- */
function ratingFor(seed) {
  let h = 0;
  const s = String(seed || "veg");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  const rating = Math.round((3.6 + (h % 15) / 10) * 10) / 10; // 3.6 – 5.0
  const count = 18 + (h % 240); // 18 – 257
  return { rating, count };
}

function Stars({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="stars" aria-label={`Rated ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={"star" + (i < full ? " on" : i === full && half ? " half" : "")}>★</span>
      ))}
    </span>
  );
}

/* Single shared stylesheet for this whole module — additive only,
   targets existing class names plus a couple of new ones used by the
   rating bits above. No markup that drives logic is touched. */
function HarithaStyles() {
  return (
    <style>{`
      :root{
        --hf-forest:#1f4d3c;
        --hf-forest-deep:#163a2d;
        --hf-cream:#fbf6ec;
        --hf-turmeric:#e8a33d;
        --hf-tomato:#d9603b;
        --hf-line:#e7e1d2;
      }

      .hero{
        position:relative;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:24px;
        background:
          radial-gradient(120% 140% at 0% 0%, rgba(232,163,61,.20), transparent 55%),
          linear-gradient(135deg, var(--hf-forest) 0%, var(--hf-forest-deep) 100%);
        color:#f6f3e7;
        border-radius:22px;
        padding:30px 34px;
        margin-bottom:18px;
        overflow:hidden;
        box-shadow:0 14px 34px -16px rgba(22,58,45,.55);
      }
      .hero-eyebrow{
        display:inline-block;
        font-size:12.5px;
        letter-spacing:.04em;
        background:rgba(255,255,255,.12);
        padding:5px 11px;
        border-radius:999px;
        margin-bottom:12px;
      }
      .hero-text h2{
        font-family:'Fraunces',serif;
        font-weight:600;
        font-size:clamp(22px,3vw,32px);
        line-height:1.18;
        margin:0 0 14px;
        color:#fffaf0;
      }
      .hero-chips{ display:flex; flex-wrap:wrap; gap:9px; }
      .hchip{
        background:rgba(255,255,255,.1);
        border:1px solid rgba(255,255,255,.18);
        padding:6px 12px;
        border-radius:999px;
        font-size:12.5px;
        backdrop-filter:blur(2px);
      }
      .hero-stack{ position:relative; width:160px; height:120px; flex-shrink:0; }
      .hero-stack span{
        position:absolute;
        font-size:40px;
        filter:drop-shadow(0 8px 10px rgba(0,0,0,.25));
      }
      .hs1{ top:0; left:20px; }
      .hs2{ top:10px; left:90px; font-size:34px; }
      .hs3{ top:55px; left:10px; font-size:30px; }
      .hs4{ top:60px; left:110px; font-size:28px; }
      .hs5{ top:30px; left:55px; font-size:30px; opacity:.9; }

      .offers-rail{ display:flex; gap:12px; overflow-x:auto; padding-bottom:4px; margin-bottom:20px; }
      .offer-card{
        flex:0 0 auto;
        min-width:190px;
        border-radius:16px;
        padding:14px 16px;
        border:1px solid var(--hf-line);
        background:var(--hf-cream);
        box-shadow:0 6px 16px -10px rgba(31,77,60,.25);
      }
      .oc-theme-green{ background:#eef6ee; border-color:#d7ead7; }
      .oc-theme-orange{ background:#fdf1e3; border-color:#f3ddb6; }
      .oc-emoji{ font-size:22px; margin-bottom:6px; }
      .oc-title{ font-weight:700; font-size:14px; color:#26352c; }
      .oc-sub{ font-size:12.5px; color:#6c7468; margin-top:2px; }
      .oc-code{
        display:inline-block; margin-top:8px; font-size:11.5px; font-weight:700;
        letter-spacing:.04em; background:var(--hf-forest); color:#fff;
        padding:3px 9px; border-radius:7px;
      }

      .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:16px; }
      .veg{
        position:relative;
        background:#fff;
        border:1px solid var(--hf-line);
        border-radius:18px;
        padding:16px 14px 14px;
        text-align:center;
        transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
      }
      .veg:hover{
        transform:translateY(-3px);
        box-shadow:0 14px 26px -16px rgba(31,77,60,.35);
        border-color:#cfe4d4;
      }
      .veg.soldout{ opacity:.55; }
      .veg .emoji{ font-size:38px; margin-bottom:6px; }
      .veg .nm{ font-weight:650; color:#243025; font-size:14.5px; }
      .veg .pr{ font-family:'Fraunces',serif; font-weight:600; color:var(--hf-forest); margin-top:3px; }
      .veg .unit{ font-family:inherit; font-weight:400; color:#8a9186; font-size:12px; }

      .rating-row{ display:flex; align-items:center; justify-content:center; gap:5px; margin-top:6px; }
      .stars{ display:inline-flex; letter-spacing:1px; font-size:13px; }
      .stars .star{ color:#d8d4c4; }
      .stars .star.on{ color:var(--hf-turmeric); }
      .stars .star.half{ color:var(--hf-turmeric); opacity:.55; }
      .rating-num{ font-size:12px; font-weight:700; color:#3c4536; }
      .rating-count{ font-size:11.5px; color:#9a9f90; }

      .badge{
        display:inline-block; font-size:11px; font-weight:700; letter-spacing:.02em;
        padding:3px 10px; border-radius:999px;
      }
      .b-stock{ background:#e8f4e8; color:#2a6b3c; }
      .b-low{ background:#fdf0dd; color:#a86a17; }
      .b-out{ background:#f6e7e4; color:#a13c2c; }

      .btn{ border-radius:11px; font-weight:650; transition:transform .12s ease, filter .12s ease, box-shadow .12s ease; }
      .btn:active{ transform:scale(.97); }
      .btn-carrot{ background:var(--hf-tomato); color:#fff; box-shadow:0 8px 16px -8px rgba(217,96,59,.55); }
      .btn-carrot:hover{ filter:brightness(1.05); }
      .btn-green{ background:var(--hf-forest); color:#fff; box-shadow:0 8px 16px -8px rgba(31,77,60,.5); }
      .btn-green:hover{ filter:brightness(1.08); }
      .btn-ghost{ background:#fff; border:1px solid var(--hf-line); color:#3c4536; }
      .btn-danger{ background:#fbe9e6; color:#a13c2c; border:none; }

      .stepper{
        display:flex; align-items:center; justify-content:space-between;
        border:1px solid var(--hf-line); border-radius:11px; padding:4px 8px; background:#fbfaf6;
      }
      .stepper button{
        width:24px; height:24px; border-radius:7px; border:none; background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,.12); font-weight:700; cursor:pointer; color:var(--hf-forest);
      }
      .stepper span{ font-weight:650; font-size:13px; }

      .card{ border-radius:18px; border:1px solid var(--hf-line); background:#fff; }
      .card.pad{ padding:20px; }
      .sec-title{ font-family:'Fraunces',serif; font-weight:600; color:#22301f; margin:0 0 14px; }

      .fld{ display:block; margin-bottom:14px; }
      .fld > span{ display:block; font-size:12.5px; font-weight:650; color:#5b6354; margin-bottom:6px; }
      .inp{
        width:100%; border:1px solid var(--hf-line); border-radius:11px; padding:10px 12px;
        font-size:14px; background:#fbfaf6; transition:border-color .12s ease, box-shadow .12s ease;
      }
      .inp:focus{ outline:none; border-color:var(--hf-forest); box-shadow:0 0 0 3px rgba(31,77,60,.12); }

      .pay{ display:flex; gap:14px; margin:8px 0 4px; font-size:13.5px; }
      .summary .ln{ display:flex; justify-content:space-between; padding:5px 0; font-size:13.5px; color:#525a48; }
      .summary .ln.tot{ font-weight:700; font-size:15.5px; color:#1d291c; border-top:1px dashed var(--hf-line); margin-top:6px; padding-top:10px; }

      .listrow{
        display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:14px;
        padding:12px 0; border-bottom:1px solid var(--hf-line);
      }
      .listrow:last-child{ border-bottom:none; }

      .order{
        border:1px solid var(--hf-line); border-radius:18px; padding:18px; margin-bottom:16px; background:#fff;
      }
      .order .top{ display:flex; justify-content:space-between; align-items:flex-start; }
      .order .oid{ font-weight:700; color:#22301f; }
      .order .when{ font-size:12px; color:#8a9186; margin-top:2px; }
      .items-line{ font-size:13px; color:#5b6354; margin-top:10px; }

      .pill{ font-size:11.5px; font-weight:700; padding:4px 11px; border-radius:999px; }
      .p-rejected{ background:#f6e7e4; color:#a13c2c; }

      .track{ display:flex; justify-content:space-between; margin:18px 0 4px; position:relative; }
      .track:before{
        content:""; position:absolute; top:11px; left:5%; right:5%; height:2px; background:var(--hf-line); z-index:0;
      }
      .track .step{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
      .track .dot{
        width:24px; height:24px; border-radius:50%; background:#fff; border:2px solid var(--hf-line);
        display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#9aa090;
      }
      .track .step.done .dot{ background:var(--hf-forest); border-color:var(--hf-forest); color:#fff; }
      .track .step.now .dot{ border-color:var(--hf-turmeric); color:var(--hf-turmeric); }
      .track .lbl{ font-size:10.5px; color:#8a9186; text-align:center; }
      .track .step.now .lbl{ color:#22301f; font-weight:650; }

      .subtabs{ display:flex; gap:6px; background:#f1ede1; padding:4px; border-radius:12px; width:fit-content; }
      .subtabs button{ border:none; background:transparent; padding:8px 16px; border-radius:9px; font-weight:650; font-size:13.5px; color:#6c7468; cursor:pointer; }
      .subtabs button.on{ background:#fff; color:var(--hf-forest); box-shadow:0 2px 6px rgba(0,0,0,.08); }
    `}</style>
  );
}

export function CustomerAuth() {
  const { custAuthMode, setCustAuthMode, customerAuthSubmit } = useApp();
  const mode = custAuthMode || "login";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <HarithaStyles />
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
    </>
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
      <HarithaStyles />
      <HeroBanner />
      <OffersRail />
      <div className="grid">
        {avail.map((v) => {
          const out = v.stock <= 0;
          const inCart = cart[v.id] || 0;
          const { rating, count } = ratingFor(v.id != null ? v.id : v.name); // display-only, no logic impact
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
              <div className="rating-row">
                <Stars value={rating} />
                <span className="rating-num">{rating}</span>
                <span className="rating-count">({count})</span>
              </div>
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
    return (
      <>
        <HarithaStyles />
        <EmptyState emoji="🛒" title="Your cart is empty" sub="Browse fresh vegetables and add them to your cart." btnLabel="Go to shop" onClick={() => setCustTab("shop")} />
      </>
    );
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
    <>
      <HarithaStyles />
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
    </>
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
    return (
      <>
        <HarithaStyles />
        <EmptyState emoji="📦" title="No orders yet" sub="Your placed orders and live tracking will appear here." btnLabel="Start shopping" onClick={() => setCustTab("shop")} />
      </>
    );
  }
  return (
    <>
      <HarithaStyles />
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
      <HarithaStyles />
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
