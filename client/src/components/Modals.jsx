import React, { useState } from "react";
import { OFFER_THEMES } from "../helpers.js";

const UNITS = ["kg", "piece", "bunch", "pack", "dozen"];

function VegForm({ app, id, v }) {
  const [name, setName] = useState(v.name);
  const [emoji, setEmoji] = useState(v.emoji);
  const [unit, setUnit] = useState(v.unit);
  const [price, setPrice] = useState(v.price);
  const [stock, setStock] = useState(v.stock);

  async function save() {
    const p = +price, s = +stock;
    if (!name.trim() || !(p > 0) || s < 0 || isNaN(s)) {
      app.toast("Fill name, valid price and stock", "⚠️");
      return;
    }
    await app.saveVeg(id, { name: name.trim(), emoji: emoji.trim() || "🥗", unit, price: p, stock: s });
    app.closeModal();
  }

  return (
    <>
      <h3>{id ? "Edit vegetable" : "Add vegetable"}</h3>
      <label className="fld"><span>Name</span><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tomato" /></label>
      <div className="row2">
        <label className="fld"><span>Emoji / icon</span><input className="inp" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></label>
        <label className="fld">
          <span>Unit</span>
          <select className="inp" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <div className="row2">
        <label className="fld"><span>Price (₹)</span><input className="inp" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="fld"><span>Stock</span><input className="inp" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
      </div>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn btn-green" onClick={save}>{id ? "Save changes" : "Add to catalog"}</button>
        <button className="btn btn-ghost" onClick={app.closeModal}>Cancel</button>
      </div>
    </>
  );
}

export function openVegModal(id, app) {
  const v = id ? app.catalog.find((x) => x.id === id) : { name: "", emoji: "🥗", price: "", unit: "kg", stock: "", available: true };
  app.setModal(<VegForm app={app} id={id} v={v} />);
}

function OfferForm({ app, idx, o }) {
  const [emoji, setEmoji] = useState(o.emoji || "🎉");
  const [theme, setTheme] = useState(o.theme || "green");
  const [title, setTitle] = useState(o.title || "");
  const [sub, setSub] = useState(o.sub || "");
  const [code, setCode] = useState(o.code || "");

  async function save() {
    if (!title.trim()) {
      app.toast("Enter a title for the offer", "⚠️");
      return;
    }
    await app.saveOffer(idx, { title: title.trim(), sub: sub.trim(), code: code.trim(), emoji: emoji.trim() || "🎉", theme });
    app.closeModal();
  }

  return (
    <>
      <h3>{idx !== null && idx !== undefined ? "Edit offer" : "Add offer"}</h3>
      <div className="row2">
        <label className="fld"><span>Emoji</span><input className="inp" maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></label>
        <label className="fld">
          <span>Color</span>
          <select className="inp" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {OFFER_THEMES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </label>
      </div>
      <label className="fld"><span>Title</span><input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20% off your first order" /></label>
      <label className="fld"><span>Subtitle (optional)</span><input className="inp" value={sub} onChange={(e) => setSub(e.target.value)} placeholder="e.g. On orders above ₹300" /></label>
      <label className="fld"><span>Code (optional)</span><input className="inp" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FRESH20" /></label>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn btn-green" onClick={save}>{idx !== null && idx !== undefined ? "Save changes" : "Add offer"}</button>
        <button className="btn btn-ghost" onClick={app.closeModal}>Cancel</button>
      </div>
    </>
  );
}

export function openOfferModal(idx, app) {
  const i = idx === null || idx === undefined ? null : idx;
  const o = i !== null ? app.offers[i] : { title: "", sub: "", emoji: "🎉", code: "", theme: "green" };
  app.setModal(<OfferForm app={app} idx={i} o={o} />);
}

function PartnerForm({ app }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function save() {
    if (!name.trim() || !phone.trim() || !password) {
      app.toast("Enter name, phone and a password", "⚠️");
      return;
    }
    await app.addPartner({ name: name.trim(), phone: phone.trim(), password });
    app.closeModal();
  }

  return (
    <>
      <h3>Add delivery partner</h3>
      <label className="fld"><span>Name</span><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mahesh" /></label>
      <label className="fld"><span>Phone</span><input className="inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" /></label>
      <label className="fld"><span>Set a password for them</span><input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="They'll use this to log in" /></label>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn btn-green" onClick={save}>Add partner</button>
        <button className="btn btn-ghost" onClick={app.closeModal}>Cancel</button>
      </div>
    </>
  );
}

export function openPartnerModal(app) {
  app.setModal(<PartnerForm app={app} />);
}

function PartnerPwForm({ app, p }) {
  const [password, setPassword] = useState("");
  async function save() {
    if (!password) {
      app.toast("Enter a password", "⚠️");
      return;
    }
    await app.setPartnerPassword(p.id, password);
    app.closeModal();
  }
  return (
    <>
      <h3>Set password for {p.name}</h3>
      <label className="fld"><span>New password</span><input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" /></label>
      <div className="actions" style={{ marginTop: 6 }}>
        <button className="btn btn-green" onClick={save}>Save password</button>
        <button className="btn btn-ghost" onClick={app.closeModal}>Cancel</button>
      </div>
    </>
  );
}

export function openPartnerPwModal(id, app) {
  const p = app.partners.find((x) => x.id === id);
  if (!p) return;
  app.setModal(<PartnerPwForm app={app} p={p} />);
}
