import React, { useState } from "react";
import { useApp } from "../store.jsx";
import { WhoBar, EmptyState, LiveMap } from "./Shared.jsx";
import {
  inr, cartItems, cartSubtotal, feeFor, FREE_ABOVE, OFFER_THEMES,
  STATUS, TRACK_STEPS, STEP_ORDER,
} from "../helpers.js";

function ratingFor(seed) {
  let h = 0;
  const s = String(seed || "veg");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  const rating = Math.round((3.6 + (h % 15) / 10) * 10) / 10;
  const count = 18 + (h % 240);
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

function TiltCard({ className, children }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 8, ry: (px - 0.5) * 8, active: true });
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0, active: false });
  }

  return (
    <div
      className={className + " tilt3d" + (tilt.active ? " tilt3d-active" : "")}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${tilt.active ? 6 : 0}px)` }}
    >
      {children}
    </div>
  );
}

function SearchBar({ query, setQuery, resultCount, showCount }) {
  return (
    <div className="search-wrap">
      <div className="search-box">
        <span className="search-icon">⌕</span>
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalogue — tomatoes, spinach, ginger…"
        />
        {query ? (
          <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Clear search">✕</button>
        ) : null}
      </div>
      {showCount ? (
        <div className="search-meta">{resultCount} result{resultCount !== 1 ? "s" : ""} for "{query}"</div>
      ) : null}
    </div>
  );
}

function HarithaStyles() {
  return (
    <style>{`
      :root{
        --ink:#1c1a17;
        --ink-soft:#4a443c;
        --paper:#f4faf6;
        --paper-deep:#e7f3ec;
        --gold:#a9824f;
        --gold-deep:#7c5e35;
        --line:#d9e8df;
        --success:#2f6b4f;
        --warn:#9c6a17;
        --danger:#8a3324;
      }

      html{ background:var(--paper-deep); }
      body{
        background:linear-gradient(180deg, var(--paper) 0%, var(--paper-deep) 100%);
        min-height:100vh;
        color:var(--ink);
      }
      .card, .veg, .order{ color:var(--ink); }

      .hero{
        position:relative;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:32px;
        background:linear-gradient(135deg, #21201c 0%, #141310 100%);
        color:#f6f1e7;
        border-radius:4px;
        padding:46px 48px;
        margin-bottom:34px;
        overflow:hidden;
        box-shadow:0 30px 60px -30px rgba(0,0,0,.45);
      }
      .hero:before{
        content:"";
        position:absolute; inset:0;
        background:linear-gradient(120deg, rgba(169,130,79,.16), transparent 55%);
        pointer-events:none;
      }
      .hero-eyebrow{
        display:inline-block;
        font-size:11px;
        letter-spacing:.16em;
        text-transform:uppercase;
        color:var(--gold);
        margin-bottom:18px;
        font-weight:600;
      }
      .hero-text h2{
        font-family:'Fraunces',serif;
        font-weight:500;
        font-size:clamp(26px,3.4vw,40px);
        line-height:1.16;
        margin:0 0 22px;
        color:#fbf9f6;
        max-width:480px;
      }
      .hero-chips{ display:flex; flex-wrap:wrap; gap:10px; }
      .hchip{
        border:1px solid rgba(246,241,231,.25);
        padding:8px 16px;
        font-size:11.5px;
        letter-spacing:.04em;
        color:#e9e2d2;
      }
      .hero-stack{ position:relative; width:170px; height:130px; flex-shrink:0; opacity:.92; }
      .hero-stack span{ position:absolute; font-size:34px; filter:grayscale(.15) drop-shadow(0 10px 14px rgba(0,0,0,.4)); }
      .hs1{ top:6px; left:22px; }
      .hs2{ top:14px; left:92px; font-size:28px; }
      .hs3{ top:58px; left:8px; font-size:26px; }
      .hs4{ top:64px; left:108px; font-size:24px; }
      .hs5{ top:34px; left:58px; font-size:26px; }

      .search-wrap{ display:flex; flex-direction:column; align-items:center; margin-bottom:30px; }
      .search-box{
        width:min(620px,96%);
        display:flex; align-items:center; gap:12px;
        background:#fff; border:1px solid var(--line); border-radius:2px;
        padding:16px 20px;
        box-shadow:0 16px 32px -20px rgba(28,26,23,.25);
      }
      .search-icon{ font-size:17px; color:var(--gold-deep); }
      .search-input{ flex:1; border:none; outline:none; background:transparent; font-size:14.5px; color:var(--ink); letter-spacing:.01em; }
      .search-clear{
        border:none; background:var(--paper-deep); color:var(--ink-soft); width:24px; height:24px; border-radius:50%;
        font-size:11px; cursor:pointer; line-height:1;
      }
      .search-meta{ font-size:12px; letter-spacing:.03em; color:var(--ink-soft); margin-top:10px; }
      .no-results{ grid-column:1/-1; text-align:center; padding:60px 18px; color:var(--ink-soft); }
      .no-results .nr-emoji{ font-size:30px; margin-bottom:10px; }

      .offers-rail{ display:flex; gap:16px; overflow-x:auto; padding-bottom:6px; margin-bottom:30px; }
      .offer-card{
        flex:0 0 auto;
        min-width:210px;
        border-radius:2px;
        padding:20px 20px 18px;
        border:1px solid var(--line);
        background:#fff;
        box-shadow:0 14px 28px -20px rgba(28,26,23,.2);
        transition:box-shadow .2s ease, transform .2s ease;
      }
      .offer-card:hover{ transform:translateY(-3px); box-shadow:0 20px 36px -18px rgba(28,26,23,.28); }
      .oc-theme-green{ border-top:2px solid var(--success); }
      .oc-theme-orange{ border-top:2px solid var(--gold); }
      .oc-emoji{ font-size:20px; margin-bottom:10px; }
      .oc-title{ font-weight:600; font-size:14px; color:var(--ink); font-family:'Fraunces',serif; }
      .oc-sub{ font-size:12.5px; color:var(--ink-soft); margin-top:4px; }
      .oc-code{
        display:inline-block; margin-top:12px; font-size:11px; font-weight:600;
        letter-spacing:.08em; text-transform:uppercase; color:var(--gold-deep);
        border:1px solid var(--gold); padding:4px 10px;
      }

      .grid{
        display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:22px;
      }
      .veg{
        position:relative;
        background:#fff;
        border:1px solid var(--line);
        border-radius:2px;
        padding:26px 18px 20px;
        text-align:center;
        transform-style:preserve-3d;
        box-shadow:0 14px 30px -22px rgba(28,26,23,.22);
      }
      .tilt3d{ transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; will-change:transform; }
      .tilt3d:hover{ box-shadow:0 24px 40px -22px rgba(28,26,23,.28); border-color:var(--gold); }
      .tilt3d-active{ box-shadow:0 26px 42px -20px rgba(28,26,23,.3); }
      .veg.soldout{ opacity:.5; }
      .veg .emoji{ font-size:34px; margin-bottom:14px; filter:grayscale(.1) drop-shadow(0 6px 8px rgba(0,0,0,.12)); }
      .veg .nm{ font-weight:600; color:var(--ink); font-size:14.5px; font-family:'Fraunces',serif; letter-spacing:.01em; }
      .veg .pr{ font-family:'Fraunces',serif; font-weight:600; color:var(--gold-deep); margin-top:6px; font-size:15px; }
      .veg .unit{ font-family:inherit; font-weight:400; color:var(--ink-soft); font-size:11.5px; }

      .rating-row{ display:flex; align-items:center; justify-content:center; gap:6px; margin-top:8px; }
      .stars{ display:inline-flex; letter-spacing:1px; font-size:12px; }
      .stars .star{ color:#e1d9c4; }
      .stars .star.on{ color:var(--gold); }
      .stars .star.half{ color:var(--gold); opacity:.55; }
      .rating-num{ font-size:11.5px; font-weight:600; color:var(--ink-soft); }
      .rating-count{ font-size:11px; color:#a99c84; }

      .badge{
        display:inline-block; font-size:10px; font-weight:600; letter-spacing:.08em;
        padding:4px 10px; border-radius:1px; text-transform:uppercase;
        border:1px solid currentColor; background:transparent;
      }
      .b-stock{ color:var(--success); }
      .b-low{ color:var(--warn); }
      .b-out{ color:var(--danger); }

      .btn{
        position:relative;
        border-radius:2px; font-weight:600; letter-spacing:.03em;
        transition:transform .12s ease, filter .12s ease, box-shadow .12s ease, background .12s ease;
      }
      .btn:active{ transform:translateY(1px); }
      .btn-carrot{
        background:var(--ink);
        color:#fbf9f6;
        box-shadow:0 10px 18px -10px rgba(28,26,23,.45);
      }
      .btn-carrot:hover{ background:#000; }
      .btn-green{
        background:var(--gold-deep);
        color:#fff;
        box-shadow:0 10px 18px -10px rgba(124,94,53,.45);
      }
      .btn-green:hover{ background:var(--gold); }
      .btn-ghost{ background:#fff; border:1px solid var(--line); color:var(--ink); }
      .btn-danger{ background:#fff; border:1px solid var(--danger); color:var(--danger); }

      .stepper{
        display:flex; align-items:center; justify-content:space-between;
        border:1px solid var(--line); border-radius:2px; padding:5px 10px; background:#fff;
      }
      .stepper button{
        width:24px; height:24px; border-radius:1px; border:1px solid var(--line); background:#fff;
        font-weight:700; cursor:pointer; color:var(--ink);
        transition:background .12s ease;
      }
      .stepper button:hover{ background:var(--paper-deep); }
      .stepper span{ font-weight:600; font-size:13px; }

      .card{
        border-radius:2px; border:1px solid var(--line); background:#fff;
        box-shadow:0 20px 40px -28px rgba(28,26,23,.25);
      }
      .card.pad{ padding:28px; }
      .sec-title{ font-family:'Fraunces',serif; font-weight:600; color:var(--ink); margin:0 0 18px; font-size:19px; }

      .fld{ display:block; margin-bottom:16px; }
      .fld > span{ display:block; font-size:11.5px; letter-spacing:.04em; text-transform:uppercase; font-weight:600; color:var(--ink-soft); margin-bottom:8px; }
      .inp{
        width:100%; border:1px solid var(--line); border-radius:1px; padding:11px 13px;
        font-size:14px; background:#fff; transition:border-color .12s ease;
      }
      .inp:focus{ outline:none; border-color:var(--gold); }

      .pay{ display:flex; gap:18px; margin:10px 0 6px; font-size:13.5px; }
      .summary .ln{ display:flex; justify-content:space-between; padding:6px 0; font-size:13.5px; color:var(--ink-soft); }
      .summary .ln.tot{ font-weight:700; font-size:16px; color:var(--ink); border-top:1px solid var(--line); margin-top:8px; padding-top:12px; }

      .listrow{
        display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:16px;
        padding:14px 0; border-bottom:1px solid var(--line);
      }
      .listrow:last-child{ border-bottom:none; }

      .order{
        border:1px solid var(--line); border-radius:2px;
        padding:22px; margin-bottom:18px; background:#fff;
        box-shadow:0 20px 40px -28px rgba(28,26,23,.22);
      }
      .order .top{ display:flex; justify-content:space-between; align-items:flex-start; }
      .order .oid{ font-weight:700; color:var(--ink); font-family:'Fraunces',serif; letter-spacing:.02em; }
      .order .when{ font-size:11.5px; color:var(--ink-soft); margin-top:3px; }
      .items-line{ font-size:13px; color:var(--ink-soft); margin-top:12px; }

      .pill{ font-size:10.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; padding:5px 12px; border-radius:1px; border:1px solid currentColor; }
      .p-rejected{ color:var(--danger); }

      .track{ display:flex; justify-content:space-between; margin:22px 0 6px; position:relative; }
      .track:before{ content:""; position:absolute; top:11px; left:5%; right:5%; height:1px; background:var(--line); z-index:0; }
      .track .step{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; }
      .track .dot{
        width:23px; height:23px; border-radius:50%; background:#fff; border:1px solid var(--line);
        display:flex; align-items:center; justify-content:center; font-size:10.5px; font-weight:700; color:#a99c84;
      }
      .track .step.done .dot{ background:var(--ink); border-color:var(--ink); color:#fff; }
      .track .step.now .dot{ border-color:var(--gold); color:var(--gold-deep); }
      .track .lbl{ font-size:10px; letter-spacing:.03em; color:var(--ink-soft); text-align:center; }
      .track .step.now .lbl{ color:var(--ink); font-weight:600; }

      .subtabs{ display:flex; gap:28px; border-bottom:1px solid var(--line); width:fit-content; }
      .subtabs button{
        border:none; background:transparent; padding:0 0 14px; font-weight:600; font-size:13px;
        letter-spacing:.04em; text-transform:uppercase; color:var(--ink-soft); cursor:pointer;
        border-bottom:2px solid transparent; margin-bottom:-1px;
      }
      .subtabs button.on{ color:var(--ink); border-bottom-color:var(--gold); }
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
      <div className="card pad" style={{ maxWidth: 400, margin: "40px auto" }}>
        <div className="subtabs" style={{ marginBottom: 24 }}>
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
        <span className="hero-eyebrow">Sourced from the Ranga Reddy farms</span>
        <h2>Today's harvest, at your door by evening.</h2>
        <div className="hero-chips">
          <span className="hchip">Free delivery above {inr(FREE_ABOVE)}</span>
          <span className="hchip">Same-day delivery</span>
          <span className="hchip">{count} items picked fresh today</span>
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
  const [query, setQuery] = useState("");
  const avail = catalog.filter((v) => v.available);
  const q = query.trim().toLowerCase();
  const visible = q ? avail.filter((v) => v.name.toLowerCase().includes(q)) : avail;
  return (
    <>
      <HarithaStyles />
      <HeroBanner />
      <SearchBar query={query} setQuery={setQuery} resultCount={visible.length} showCount={!!q} />
      <OffersRail />
      <div className="grid">
        {visible.length === 0 ? (
          <div className="no-results">
            <div className="nr-emoji">🥗</div>
            <div>No vegetables found for "{query}"</div>
          </div>
        ) : visible.map((v) => {
          const out = v.stock <= 0;
          const inCart = cart[v.id] || 0;
          const { rating, count } = ratingFor(v.id != null ? v.id : v.name);
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
            <TiltCard key={v.id} className={"veg" + (out ? " soldout" : "")}>
              <div className="emoji">{v.emoji}</div>
              <div className="nm">{v.name}</div>
              <div className="rating-row">
                <Stars value={rating} />
                <span className="rating-num">{rating}</span>
                <span className="rating-count">({count})</span>
              </div>
              <div className="pr">{inr(v.price)} <span className="unit">/ {v.unit}</span></div>
              <div style={{ marginTop: 9 }}>{badge}</div>
              <div className="foot">{foot}</div>
            </TiltCard>
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
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 22 }} className="cartwrap">
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
                {locating ? "Locating…" : "Use current location"}
              </button>
            </span>
            <textarea
              className="inp" value={addr}
              onChange={(e) => { setAddr(e.target.value); setCoords(null); }}
              placeholder="Flat / house, street, area, landmark, pincode"
            />
            {coords ? (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Exact location attached — the store and rider will see your pinned spot on a map.
              </div>
            ) : null}
          </label>
          <label className="fld"><span>Payment method</span></label>
          <div className="pay">
            <label><input type="radio" name="pay" value="UPI" checked={pay === "UPI"} onChange={() => setPay("UPI")} /> UPI / Online</label>
            <label><input type="radio" name="pay" value="COD" checked={pay === "COD"} onChange={() => setPay("COD")} /> Cash on delivery</label>
          </div>
          <div className="summary" style={{ marginTop: 18 }}>
            <div className="ln"><span>Subtotal</span><span>{inr(sub)}</span></div>
            <div className="ln"><span>Delivery fee</span><span>{fee === 0 ? <b style={{ color: "var(--success)" }}>FREE</b> : inr(fee)}</span></div>
            <div className="ln tot"><span>Total</span><span>{inr(tot)}</span></div>
          </div>
          <button className="btn btn-green btn-block" style={{ marginTop: 16 }} onClick={handlePlaceOrder}>
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
    return <div className="pill p-rejected" style={{ margin: "10px 0" }}>Order rejected by store</div>;
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
        <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>{partner.name} is handling your delivery · {partner.phone}</div>
      ) : null}
      {["ASSIGNED", "PICKED_UP"].includes(o.status) ? <LiveMap orderId={o.id} customer={o.customer} /> : null}
      <div className="meta" style={{ marginTop: 14 }}>
        <span><b>{o.paymentMethod}</b> {o.paymentStatus === "Paid" ? "· Paid" : "· " + o.paymentStatus}</span>
        <span className="right" style={{ fontWeight: 700, fontFamily: "'Fraunces',serif", fontSize: 15 }}>{inr(o.total)}</span>
      </div>
      {o.paymentMethod === "UPI" && o.paymentStatus === "Pending" && o.status !== "REJECTED" ? (
        <PayUpiButton o={o} />
      ) : null}
      {o.status === "DELIVERED" ? (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => reorder(o.id)}>Reorder</button>
      ) : null}
    </div>
  );
}

function PayUpiButton({ o }) {
  const { refreshSettings, setModal, closeModal } = useApp();
  return (
    <button
      className="btn btn-carrot btn-sm" style={{ marginTop: 10 }}
      onClick={async () => { const s = await refreshSettings(); showUpiPayModal(o, s, setModal, closeModal); }}
    >
      Pay via UPI
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
      <a className="btn btn-green btn-block" href={upiLink} style={{ marginBottom: 10 }}>Pay {inr(order.total)} via UPI app</a>
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
      <WhoBar label={`${auth.name || ""} · ${auth.phone || ""}`} />
      <div className="subtabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={custTab === id ? "on" : ""} onClick={() => setCustTab(id)}>{label}</button>
        ))}
      </div>
      {custTab === "shop" ? <CustShop /> : custTab === "cart" ? <CustCart /> : <CustOrders />}
    </>
  );
}
