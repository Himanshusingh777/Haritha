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

/* Pure presentational 3D tilt wrapper — tracks mouse position over the
   card and rotates it slightly in 3D space (like a floating product
   card). Holds only its own transform in local state; never touches
   app/store state and passes through whatever it's given untouched. */
function TiltCard({ className, children }) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - py) * 16, ry: (px - 0.5) * 16, active: true });
  }
  function onLeave() {
    setTilt({ rx: 0, ry: 0, active: false });
  }

  return (
    <div
      className={className + " tilt3d" + (tilt.active ? " tilt3d-active" : "")}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${tilt.active ? 14 : 0}px)` }}
    >
      {children}
    </div>
  );
}

/* Pure UI search box — local text state only, filters the already
   loaded catalog client-side. Doesn't call the store, doesn't change
   what addToCart/cartInc/cartDec receive (still the real item id). */
function SearchBar({ query, setQuery, resultCount, showCount }) {
  return (
    <div className="search-wrap">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for tomatoes, spinach, ginger…"
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

/* Single shared stylesheet for this whole module — additive only,
   targets existing class names plus a couple of new ones used by the
   rating bits above. No markup that drives logic is touched. */
function HarithaStyles() {
  return (
    <style>{`
      :root{
        --hf-forest:#3f6b3f;
        --hf-forest-deep:#2c4f2c;
        --hf-cream:#f3e6c8;
        --hf-turmeric:#e2a23a;
        --hf-tomato:#c1502f;
        --hf-line:#cdb586;
        --soil:#352617;
        --soil-deep:#241a10;
        --plank:#7a5230;
        --plank-light:#946539;
        --paper:#fbf2dd;
      }

      /* ---- whole-page backdrop: a wooden market stall ---- */
      html{ background:var(--soil-deep); }
      body{
        background:
          repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 2px, transparent 2px, transparent 150px),
          radial-gradient(120% 90% at 50% -10%, rgba(226,162,58,.10), transparent 60%),
          linear-gradient(180deg, var(--soil) 0%, var(--soil-deep) 100%);
        background-attachment:fixed;
        min-height:100vh;
      }
      body, .card, .veg, .order{ color:#241a10; }

      .hero{
        position:relative;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:24px;
        background:
          repeating-linear-gradient(180deg, rgba(0,0,0,.08) 0 3px, transparent 3px 26px),
          linear-gradient(135deg, var(--plank-light) 0%, var(--plank) 60%, var(--soil) 130%);
        color:#fbf2dd;
        border-radius:16px;
        border:6px solid var(--soil-deep);
        padding:30px 34px;
        margin-bottom:0;
        overflow:hidden;
        box-shadow:0 26px 50px -18px rgba(0,0,0,.65), inset 0 0 0 2px rgba(255,255,255,.05);
        transform:perspective(1000px) rotateX(1.2deg);
      }
      .hero:before{
        content:"";
        position:absolute; inset:0;
        background:linear-gradient(180deg, rgba(255,255,255,.08), transparent 40%);
        pointer-events:none;
      }

      @keyframes floaty{ 0%,100%{ transform:translateY(0) rotate(0deg); } 50%{ transform:translateY(-9px) rotate(5deg); } }
      .hero-stack span{ animation:floaty 5.5s ease-in-out infinite; }
      .hs2{ animation-delay:.5s; }
      .hs3{ animation-delay:1s; }
      .hs4{ animation-delay:1.5s; }
      .hs5{ animation-delay:2s; }

      .search-wrap{ position:relative; z-index:6; display:flex; flex-direction:column; align-items:center; margin:-26px 0 22px; }
      .search-box{
        width:min(580px,94%);
        display:flex; align-items:center; gap:10px;
        background:var(--paper); border:2px dashed var(--plank); border-radius:12px;
        padding:14px 18px;
        font-family:'Courier New', monospace;
        box-shadow:0 22px 38px -16px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.5) inset;
        transition:box-shadow .18s ease, transform .18s ease;
        transform:rotate(-0.4deg);
      }
      .search-box:hover, .search-box:focus-within{
        box-shadow:0 26px 44px -14px rgba(0,0,0,.5), 0 1px 0 rgba(255,255,255,.5) inset;
        transform:translateY(-1px) rotate(0deg);
      }
      .search-icon{ font-size:16px; opacity:.7; }
      .search-input{ flex:1; border:none; outline:none; background:transparent; font-size:14.5px; color:#241a10; font-family:inherit; }
      .search-clear{
        border:none; background:var(--hf-line); color:#fff; width:22px; height:22px; border-radius:50%;
        font-size:11px; cursor:pointer; line-height:1;
      }
      .search-meta{ font-size:12.5px; color:#e2cfa0; margin-top:9px; }
      .no-results{ grid-column:1/-1; text-align:center; padding:54px 18px; color:#e2cfa0; }
      .no-results .nr-emoji{ font-size:34px; margin-bottom:8px; }
      .hero-eyebrow{
        display:inline-block;
        font-size:12.5px;
        letter-spacing:.04em;
        background:rgba(0,0,0,.22);
        border:1px solid rgba(255,255,255,.15);
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
        color:#fff8e8;
        text-shadow:2px 3px 0 rgba(0,0,0,.3);
      }
      .hero-chips{ display:flex; flex-wrap:wrap; gap:9px; }
      .hchip{
        background:rgba(0,0,0,.2);
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
        filter:drop-shadow(0 8px 10px rgba(0,0,0,.35));
      }
      .hs1{ top:0; left:20px; }
      .hs2{ top:10px; left:90px; font-size:34px; }
      .hs3{ top:55px; left:10px; font-size:30px; }
      .hs4{ top:60px; left:110px; font-size:28px; }
      .hs5{ top:30px; left:55px; font-size:30px; opacity:.9; }

      .offers-rail{ display:flex; gap:14px; overflow-x:auto; padding:10px 4px 12px; margin-bottom:20px; }
      .offer-card{
        flex:0 0 auto;
        min-width:190px;
        border-radius:4px 4px 12px 12px;
        padding:16px 16px 14px;
        border:1px solid var(--hf-line);
        background:var(--paper);
        box-shadow:0 12px 22px -10px rgba(0,0,0,.45);
        transition:transform .16s ease, box-shadow .16s ease;
        position:relative;
      }
      .offer-card:before{
        content:""; position:absolute; top:-8px; left:50%; width:14px; height:14px; margin-left:-7px;
        background:var(--plank); border-radius:50%; box-shadow:0 3px 5px rgba(0,0,0,.35);
      }
      .offer-card:nth-child(odd){ transform:rotate(-1.4deg); }
      .offer-card:nth-child(even){ transform:rotate(1.3deg); }
      .offer-card:hover{ transform:translateY(-4px) rotate(0deg); box-shadow:0 18px 30px -10px rgba(0,0,0,.5); }
      .oc-theme-green{ background:#eef3e2; border-color:#cddaaf; }
      .oc-theme-orange{ background:#fbe9d2; border-color:#e7c089; }
      .oc-emoji{ font-size:22px; margin-bottom:6px; }
      .oc-title{ font-weight:700; font-size:14px; color:#2e2113; font-family:'Fraunces',serif; }
      .oc-sub{ font-size:12.5px; color:#6c5b3f; margin-top:2px; }
      .oc-code{
        display:inline-block; margin-top:8px; font-size:11.5px; font-weight:700;
        letter-spacing:.04em; background:var(--hf-tomato); color:#fff;
        padding:3px 9px; border-radius:5px;
      }

      .grid{
        display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:22px 18px;
        perspective:1400px;
      }
      .veg{
        position:relative;
        background:linear-gradient(180deg, var(--paper), var(--hf-cream));
        border:1px solid var(--plank-light);
        border-top:7px solid var(--plank);
        border-radius:4px 4px 16px 16px;
        padding:20px 14px 14px;
        text-align:center;
        transform-style:preserve-3d;
        box-shadow:0 10px 18px -10px rgba(0,0,0,.5);
      }
      .veg:after{
        content:""; position:absolute; top:-11px; right:16px; width:28px; height:20px;
        background:radial-gradient(circle at 50% 26%, transparent 2.5px, var(--paper) 3.5px);
        border:1px solid var(--plank);
        clip-path:polygon(0 0,100% 0,100% 58%,50% 100%,0 58%);
        transform:rotate(9deg);
        box-shadow:0 4px 6px rgba(0,0,0,.35);
      }
      .tilt3d{ transition:transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease; will-change:transform; }
      .tilt3d:hover{ box-shadow:0 26px 36px -14px rgba(0,0,0,.55); border-color:var(--hf-turmeric); }
      .tilt3d-active{ box-shadow:0 30px 40px -12px rgba(0,0,0,.6); }
      .veg:before{
        content:""; position:absolute; left:14px; right:14px; top:0; height:3px; border-radius:0 0 3px 3px;
        background:linear-gradient(90deg, var(--hf-turmeric), var(--hf-tomato));
        opacity:0; transition:opacity .2s ease;
      }
      .tilt3d:hover:before, .tilt3d-active:before{ opacity:1; }
      .veg.soldout{ opacity:.55; }
      .veg .emoji{ font-size:38px; margin-bottom:6px; filter:drop-shadow(0 8px 8px rgba(0,0,0,.25)); }
      .veg .nm{ font-weight:650; color:#2e2113; font-size:14.5px; font-family:'Fraunces',serif; }
      .veg .pr{ font-family:'Fraunces',serif; font-weight:600; color:var(--hf-forest-deep); margin-top:3px; }
      .veg .unit{ font-family:inherit; font-weight:400; color:#8a7a56; font-size:12px; }

      .rating-row{ display:flex; align-items:center; justify-content:center; gap:5px; margin-top:6px; }
      .stars{ display:inline-flex; letter-spacing:1px; font-size:13px; }
      .stars .star{ color:#d9c79a; }
      .stars .star.on{ color:var(--hf-turmeric); }
      .stars .star.half{ color:var(--hf-turmeric); opacity:.55; }
      .rating-num{ font-size:12px; font-weight:700; color:#4a3c24; }
      .rating-count{ font-size:11.5px; color:#9a8a64; }

      .badge{
        display:inline-block; font-size:10.5px; font-weight:700; letter-spacing:.05em;
        padding:3px 10px; border-radius:6px; text-transform:uppercase;
        border:1.5px dashed currentColor; background:transparent; transform:rotate(-2.5deg);
        font-family:'Fraunces',serif;
      }
      .b-stock{ color:#2f5d2f; }
      .b-low{ color:#a8650f; }
      .b-out{ color:#9c3a26; }

      .btn{
        position:relative;
        border-radius:9px; font-weight:650;
        transition:transform .12s ease, filter .12s ease, box-shadow .12s ease;
      }
      .btn:active{ transform:translateY(1px) scale(.98); }
      .btn-carrot{
        background:linear-gradient(180deg, #d96a3f, var(--hf-tomato));
        color:#fff;
        box-shadow:0 10px 18px -8px rgba(193,80,47,.6), 0 1px 0 rgba(255,255,255,.35) inset, 0 -2px 0 rgba(0,0,0,.18) inset;
      }
      .btn-carrot:hover{ filter:brightness(1.06); transform:translateY(-1px); }
      .btn-green{
        background:linear-gradient(180deg, #527e52, var(--hf-forest));
        color:#fff;
        box-shadow:0 10px 18px -8px rgba(44,79,44,.55), 0 1px 0 rgba(255,255,255,.3) inset, 0 -2px 0 rgba(0,0,0,.2) inset;
      }
      .btn-green:hover{ filter:brightness(1.08); transform:translateY(-1px); }
      .btn-ghost{ background:var(--paper); border:1px solid var(--hf-line); color:#3c4536; }
      .btn-danger{ background:#f2ddd4; color:#9c3a26; border:none; }

      .stepper{
        display:flex; align-items:center; justify-content:space-between;
        border:1px solid var(--hf-line); border-radius:9px; padding:4px 8px; background:var(--paper);
      }
      .stepper button{
        width:24px; height:24px; border-radius:6px; border:none; background:#fff;
        box-shadow:0 2px 4px rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.6) inset; font-weight:700; cursor:pointer; color:var(--hf-forest-deep);
        transition:transform .1s ease, box-shadow .1s ease;
      }
      .stepper button:active{ transform:translateY(1px); box-shadow:0 1px 2px rgba(0,0,0,.2); }
      .stepper span{ font-weight:650; font-size:13px; }

      .card{ border-radius:6px 6px 18px 18px; border:1px solid var(--hf-line); border-top:5px solid var(--plank); background:var(--paper); box-shadow:0 16px 30px -16px rgba(0,0,0,.5); }
      .card.pad{ padding:20px; }
      .sec-title{ font-family:'Fraunces',serif; font-weight:600; color:#2e2113; margin:0 0 14px; }

      .fld{ display:block; margin-bottom:14px; }
      .fld > span{ display:block; font-size:12.5px; font-weight:650; color:#6c5b3f; margin-bottom:6px; }
      .inp{
        width:100%; border:1px solid var(--hf-line); border-radius:9px; padding:10px 12px;
        font-size:14px; background:#fffaf0; transition:border-color .12s ease, box-shadow .12s ease;
      }
      .inp:focus{ outline:none; border-color:var(--hf-forest); box-shadow:0 0 0 3px rgba(63,107,63,.15); }

      .pay{ display:flex; gap:14px; margin:8px 0 4px; font-size:13.5px; }
      .summary .ln{ display:flex; justify-content:space-between; padding:5px 0; font-size:13.5px; color:#6c5b3f; }
      .summary .ln.tot{ font-weight:700; font-size:15.5px; color:#2e2113; border-top:1px dashed var(--hf-line); margin-top:6px; padding-top:10px; }

      .listrow{
        display:grid; grid-template-columns:40px 1fr auto; align-items:center; gap:14px;
        padding:12px 0; border-bottom:1px dashed var(--hf-line);
      }
      .listrow:last-child{ border-bottom:none; }

      .order{
        border:1px solid var(--hf-line); border-top:5px solid var(--plank); border-radius:6px 6px 18px 18px;
        padding:18px; margin-bottom:16px; background:var(--paper); box-shadow:0 16px 30px -16px rgba(0,0,0,.5);
      }
      .order .top{ display:flex; justify-content:space-between; align-items:flex-start; }
      .order .oid{ font-weight:700; color:#2e2113; font-family:'Fraunces',serif; }
      .order .when{ font-size:12px; color:#9a8a64; margin-top:2px; }
      .items-line{ font-size:13px; color:#6c5b3f; margin-top:10px; }

      .pill{ font-size:11px; font-weight:700; padding:4px 11px; border-radius:6px; border:1.5px dashed currentColor; text-transform:uppercase; letter-spacing:.04em; }
      .p-rejected{ color:#9c3a26; }

      .track{ display:flex; justify-content:space-between; margin:18px 0 4px; position:relative; }
      .track:before{
        content:""; position:absolute; top:11px; left:5%; right:5%; height:2px; background:var(--hf-line); z-index:0;
      }
      .track .step{ position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; flex:1; }
      .track .dot{
        width:24px; height:24px; border-radius:50%; background:var(--paper); border:2px solid var(--hf-line);
        display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#9a8a64;
      }
      .track .step.done .dot{ background:var(--hf-forest); border-color:var(--hf-forest); color:#fff; }
      .track .step.now .dot{ border-color:var(--hf-turmeric); color:var(--hf-turmeric); }
      .track .lbl{ font-size:10.5px; color:#9a8a64; text-align:center; }
      .track .step.now .lbl{ color:#2e2113; font-weight:650; }

      .subtabs{ display:flex; gap:6px; background:var(--plank); padding:5px; border-radius:11px; width:fit-content; box-shadow:inset 0 2px 6px rgba(0,0,0,.35); }
      .subtabs button{ border:none; background:transparent; padding:8px 16px; border-radius:8px; font-weight:650; font-size:13.5px; color:#f3e6c8; cursor:pointer; }
      .subtabs button.on{ background:var(--paper); color:var(--hf-forest-deep); box-shadow:0 2px 6px rgba(0,0,0,.25); }
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
  const [query, setQuery] = useState(""); // local UI-only state — never touches the store
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
            <TiltCard key={v.id} className={"veg" + (out ? " soldout" : "")}>
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
