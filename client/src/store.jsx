import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { fetchState, pushState, postLocation, fetchMe, fetchSettings, apiRequest } from "./api.js";
import { cartItems, cartSubtotal, feeFor } from "./helpers.js";

const POLL_MS = 4000; // how often we refetch shared state — the "real-time" part on serverless

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const SEED_CATALOG = [
  ["Tomato", "🍅", 40, "kg", 60], ["Onion", "🧅", 35, "kg", 80], ["Potato", "🥔", 30, "kg", 100],
  ["Carrot", "🥕", 50, "kg", 40], ["Green Chilli", "🌶️", 60, "kg", 15], ["Spinach (Palak)", "🥬", 25, "bunch", 30],
  ["Coriander", "🌿", 15, "bunch", 45], ["Cauliflower", "🥦", 40, "piece", 25], ["Brinjal", "🍆", 45, "kg", 35],
  ["Lady Finger", "🫛", 55, "kg", 28], ["Cucumber", "🥒", 35, "kg", 40], ["Capsicum", "🫑", 70, "kg", 20],
  ["Ginger", "🫚", 120, "kg", 12], ["Garlic", "🧄", 150, "kg", 10], ["Lemon", "🍋", 60, "kg", 18],
  ["Sweet Corn", "🌽", 30, "piece", 50], ["Mushroom", "🍄", 80, "pack", 14], ["Pumpkin", "🎃", 25, "kg", 22],
].map(([name, emoji, price, unit, stock], i) => ({ id: `v${i + 1}`, name, emoji, price, unit, stock, available: true }));

const SEED_PARTNERS = [
  { id: "p1", name: "Ravi Kumar", phone: "98480 11111", online: false },
  { id: "p2", name: "Suresh Reddy", phone: "90000 22222", online: false },
];

export function AppProvider({ children }) {
  const [catalog, setCatalog] = useState([]);
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const dbRef = useRef({ catalog: [], orders: [], partners: [] });
  dbRef.current = { catalog, orders, partners };

  const [role, setRole] = useState("customer"); // 'customer' | 'admin' | 'delivery'
  const [custTab, setCustTab] = useState("shop");
  const [adminTab, setAdminTab] = useState("orders");
  const [custAuthMode, setCustAuthMode] = useState("login");
  const [cart, setCart] = useState({});

  const [auth, setAuth] = useState({ role: null });
  const [settings, setSettings] = useState({ upiId: "" });
  const [offers, setOffers] = useState([]);

  const [liveLocations, setLiveLocations] = useState({}); // orderId -> {lat,lng}, never persisted
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // JSX content or null
  const [toastMsg, setToastMsg] = useState(null); // {msg, emoji, key}

  const applyingRemote = useRef(false);

  const toast = useCallback((msg, emoji = "✅") => {
    setToastMsg({ msg, emoji, key: Date.now() });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  // ---------- initial load ----------
  useEffect(() => {
    (async () => {
      try {
        setAuth(await fetchMe());
      } catch {
        setAuth({ role: null });
      }
      try {
        const s = await fetchSettings();
        setSettings(s);
        setOffers(s.offers || []);
      } catch {
        setSettings({ upiId: "" });
        setOffers([]);
      }
      try {
        const data = await fetchState();
        setCatalog(data.catalog);
        setOrders(data.orders);
        setPartners(data.partners);
        setLiveLocations(data.liveLocations || {});
      } catch (e) {
        console.error("Could not reach backend, using local demo data", e);
        setCatalog(SEED_CATALOG.map((x) => ({ ...x })));
        setOrders([]);
        setPartners(SEED_PARTNERS.map((x) => ({ ...x })));
      }
      setLoading(false);
    })();
  }, []);

  // ---------- live sync via polling (no persistent socket on serverless) ----------
  useEffect(() => {
    if (loading) return;
    const id = setInterval(async () => {
      try {
        const data = await fetchState();
        applyingRemote.current = true;
        setCatalog(data.catalog);
        setOrders(data.orders);
        setPartners(data.partners);
        setLiveLocations(data.liveLocations || {});
        applyingRemote.current = false;
      } catch {
        // a missed poll isn't worth surfacing — it'll just retry next tick
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loading]);

  // Push the whole shared state to the server (saves to Postgres + broadcasts)
  const save = useCallback(async (overrides = {}) => {
    if (applyingRemote.current) return; // don't echo back a change we just received
    const state = { ...dbRef.current, ...overrides };
    if (overrides.catalog) state.catalog = overrides.catalog;
    if (overrides.orders) state.orders = overrides.orders;
    if (overrides.partners) state.partners = overrides.partners;
    await pushState(state);
  }, []);

  // ---------- customer: share my live location while a rider is en route ----------
  const watchId = useRef(null);
  const watchingOrderId = useRef(null);

  const stopLocationSharing = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
    watchingOrderId.current = null;
  }, []);

  const startLocationSharing = useCallback((orderId) => {
    stopLocationSharing();
    if (!navigator.geolocation) return;
    watchingOrderId.current = orderId;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        postLocation(orderId, pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [stopLocationSharing]);

  useEffect(() => {
    if (auth.role !== "customer") {
      stopLocationSharing();
      return;
    }
    const active = orders.find(
      (o) => o.customer.phone === auth.phone && ["ASSIGNED", "PICKED_UP"].includes(o.status)
    );
    if (!active) {
      stopLocationSharing();
      return;
    }
    if (watchingOrderId.current === active.id) return;
    startLocationSharing(active.id);
  }, [auth, orders, startLocationSharing, stopLocationSharing]);

  // ---------- cart actions ----------
  const addToCart = useCallback((id) => {
    const v = dbRef.current.catalog.find((c) => c.id === id);
    if (v && v.stock > 0) {
      setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
      toast(`${v.name} added`, "🛒");
    }
  }, [toast]);

  const cartInc = useCallback((id) => {
    const v = dbRef.current.catalog.find((c) => c.id === id);
    setCart((c) => {
      const cur = c[id] || 0;
      if (v && cur < v.stock) return { ...c, [id]: cur + 1 };
      toast("No more stock available", "⚠️");
      return c;
    });
  }, [toast]);

  const cartDec = useCallback((id) => {
    setCart((c) => {
      const cur = (c[id] || 0) - 1;
      const next = { ...c };
      if (cur <= 0) delete next[id];
      else next[id] = cur;
      return next;
    });
  }, []);

  const cartRemove = useCallback((id) => {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }, []);

  // ---------- auth actions ----------
  const logout = useCallback(async () => {
    await apiRequest("/api/auth/logout", "POST");
    setAuth({ role: null });
    toast("Logged out", "👋");
  }, [toast]);

  const customerAuthSubmit = useCallback(async (mode, { name, phone, password }) => {
    if (!phone || !password) {
      toast("Enter phone and password", "⚠️");
      return;
    }
    try {
      let data;
      if (mode === "signup") {
        if (!name) {
          toast("Enter your name", "⚠️");
          return;
        }
        data = await apiRequest("/api/auth/customer/register", "POST", { name, phone, password });
      } else {
        data = await apiRequest("/api/auth/customer/login", "POST", { phone, password });
      }
      setAuth(data);
      setCustTab("shop");
      toast(`Welcome, ${data.name}!`, "👋");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [toast]);

  const adminAuthSubmit = useCallback(async ({ username, password }) => {
    if (!username || !password) {
      toast("Enter username and password", "⚠️");
      return;
    }
    try {
      setAuth(await apiRequest("/api/auth/admin/login", "POST", { username, password }));
      toast("Welcome back!", "👋");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [toast]);

  const partnerAuthSubmit = useCallback(async ({ phone, password }) => {
    if (!phone || !password) {
      toast("Enter phone and password", "⚠️");
      return;
    }
    try {
      setAuth(await apiRequest("/api/auth/partner/login", "POST", { phone, password }));
      toast("Welcome back!", "👋");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [toast]);

  // ---------- order actions ----------
  const advance = useCallback(async (id, status, msg) => {
    const next = dbRef.current.orders.map((o) =>
      o.id === id ? { ...o, status, history: [...o.history, { s: status, at: Date.now() }] } : o
    );
    setOrders(next);
    await save({ orders: next });
    if (msg) toast(msg);
  }, [save, toast]);

  const rejectOrder = useCallback(async (id) => {
    const o = dbRef.current.orders.find((x) => x.id === id);
    if (!o) return;
    const nextCatalog = dbRef.current.catalog.map((v) => {
      const it = o.items.find((i) => i.id === v.id);
      return it ? { ...v, stock: v.stock + it.qty } : v;
    });
    const nextOrders = dbRef.current.orders.map((x) =>
      x.id === id
        ? {
            ...x,
            status: "REJECTED",
            history: [...x.history, { s: "REJECTED", at: Date.now() }],
            paymentStatus: x.paymentMethod === "UPI" ? "Refunded" : x.paymentStatus,
          }
        : x
    );
    setCatalog(nextCatalog);
    setOrders(nextOrders);
    await save({ catalog: nextCatalog, orders: nextOrders });
    toast("Order rejected, stock restored", "✕");
  }, [save, toast]);

  const assignRider = useCallback(async (orderId, partnerId) => {
    const next = dbRef.current.orders.map((o) =>
      o.id === orderId
        ? { ...o, partnerId, status: "ASSIGNED", history: [...o.history, { s: "ASSIGNED", at: Date.now() }] }
        : o
    );
    setOrders(next);
    await save({ orders: next });
    toast("Rider assigned", "🛵");
  }, [save, toast]);

  const placeOrder = useCallback(async ({ name, address, paymentMethod, coords }) => {
    if (auth.role !== "customer") {
      toast("Please log in first", "⚠️");
      return null;
    }
    if (!name || !address) {
      toast("Please fill your name and address", "⚠️");
      return null;
    }
    const items = cartItems(cart, dbRef.current.catalog);
    if (!items.length) {
      toast("Your cart is empty", "🛒");
      return null;
    }
    for (const it of items) {
      const v = dbRef.current.catalog.find((c) => c.id === it.id);
      if (!v || v.stock < it.qty) {
        toast(`${it.name} just went out of stock`, "⚠️");
        return null;
      }
    }
    const nextCatalog = dbRef.current.catalog.map((v) => {
      const it = items.find((i) => i.id === v.id);
      return it ? { ...v, stock: v.stock - it.qty } : v;
    });
    const sub = cartSubtotal(cart, dbRef.current.catalog);
    const fee = feeFor(sub);
    const tot = sub + fee;
    const order = {
      id: "VEG-" + Date.now().toString(36).slice(-5).toUpperCase(),
      items: items.map((i) => ({ id: i.id, name: i.name, emoji: i.emoji, price: i.price, unit: i.unit, qty: i.qty })),
      customer: { name, phone: auth.phone, address, lat: coords ? coords.lat : null, lng: coords ? coords.lng : null },
      paymentMethod, paymentStatus: "Pending",
      subtotal: sub, fee, total: tot, status: "PLACED", partnerId: null,
      placedAt: Date.now(), history: [{ s: "PLACED", at: Date.now() }],
    };
    const nextOrders = [...dbRef.current.orders, order];
    setCatalog(nextCatalog);
    setOrders(nextOrders);
    setCart({});
    await save({ catalog: nextCatalog, orders: nextOrders });
    setCustTab("orders");
    return order;
  }, [auth, cart, save, toast]);

  const reorder = useCallback((id) => {
    const o = dbRef.current.orders.find((x) => x.id === id);
    if (!o) return;
    setCart((c) => {
      const next = { ...c };
      o.items.forEach((it) => {
        const v = dbRef.current.catalog.find((cc) => cc.id === it.id);
        if (v && v.available && v.stock > 0) next[it.id] = Math.min(it.qty, v.stock);
      });
      return next;
    });
    setCustTab("cart");
    toast("Items added to cart", "🛒");
  }, [toast]);

  const confirmUpiPayment = useCallback(async (id) => {
    const next = dbRef.current.orders.map((o) => (o.id === id ? { ...o, paymentStatus: "Paid" } : o));
    setOrders(next);
    await save({ orders: next });
    toast("Payment marked as received", "💰");
  }, [save, toast]);

  // ---------- catalog actions ----------
  const saveVeg = useCallback(async (editingId, fields) => {
    let next;
    if (editingId) {
      next = dbRef.current.catalog.map((v) => (v.id === editingId ? { ...v, ...fields } : v));
      toast("Item updated", "✏️");
    } else {
      next = [...dbRef.current.catalog, { id: "v" + Date.now().toString(36), available: true, ...fields }];
      toast("Vegetable added", "🥬");
    }
    setCatalog(next);
    await save({ catalog: next });
  }, [save, toast]);

  const deleteVeg = useCallback(async (id) => {
    const next = dbRef.current.catalog.filter((v) => v.id !== id);
    setCatalog(next);
    await save({ catalog: next });
    toast("Item deleted", "🗑️");
  }, [save, toast]);

  const toggleVeg = useCallback(async (id) => {
    const next = dbRef.current.catalog.map((v) => (v.id === id ? { ...v, available: !v.available } : v));
    setCatalog(next);
    await save({ catalog: next });
  }, [save]);

  // ---------- partner actions ----------
  const addPartner = useCallback(async ({ name, phone, password }) => {
    const partner = { id: "p" + Date.now().toString(36), name, phone, online: false };
    const next = [...dbRef.current.partners, partner];
    setPartners(next);
    await save({ partners: next });
    try {
      await apiRequest("/api/auth/partner/set-password", "POST", { partnerId: partner.id, password });
      toast("Partner added", "🛵");
    } catch (e) {
      toast("Partner added, but setting their password failed: " + e.message, "⚠️");
    }
  }, [save, toast]);

  const removePartner = useCallback(async (id) => {
    const next = dbRef.current.partners.filter((p) => p.id !== id);
    setPartners(next);
    await save({ partners: next });
    toast("Partner removed", "👋");
  }, [save, toast]);

  const setPartnerPassword = useCallback(async (id, password) => {
    try {
      await apiRequest("/api/auth/partner/set-password", "POST", { partnerId: id, password });
      toast("Password updated", "🔑");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [toast]);

  const goOnline = useCallback(async () => {
    const next = dbRef.current.partners.map((p) =>
      p.id === auth.partnerId ? { ...p, online: !p.online } : p
    );
    setPartners(next);
    await save({ partners: next });
    const me = next.find((p) => p.id === auth.partnerId);
    toast(me?.online ? "You are online" : "You are offline", me?.online ? "🟢" : "⚪");
  }, [auth, save, toast]);

  // ---------- offers actions ----------
  const saveOffer = useCallback(async (idx, offer) => {
    let next;
    if (idx !== null && idx !== undefined) {
      next = offers.map((o, i) => (i === idx ? offer : o));
    } else {
      next = [...offers, offer];
    }
    setOffers(next);
    try {
      await apiRequest("/api/settings", "PUT", { offers: next });
      toast(idx !== null && idx !== undefined ? "Offer updated" : "Offer added", "🎉");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [offers, toast]);

  const deleteOffer = useCallback(async (idx) => {
    const next = offers.filter((_, i) => i !== idx);
    setOffers(next);
    try {
      await apiRequest("/api/settings", "PUT", { offers: next });
      toast("Offer removed", "🗑️");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [offers, toast]);

  const saveUpiSetting = useCallback(async (upiId) => {
    try {
      await apiRequest("/api/settings", "PUT", { upiId });
      setSettings((s) => ({ ...s, upiId }));
      toast("UPI ID saved", "💳");
    } catch (e) {
      toast(e.message, "⚠️");
    }
  }, [toast]);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
      return s;
    } catch {
      return settings;
    }
  }, [settings]);

  const resetDemo = useCallback(async () => {
    const nextCatalog = SEED_CATALOG.map((x) => ({ ...x }));
    const nextPartners = SEED_PARTNERS.map((x) => ({ ...x }));
    setCatalog(nextCatalog);
    setOrders([]);
    setPartners(nextPartners);
    setCart({});
    await save({ catalog: nextCatalog, orders: [], partners: nextPartners });
    toast("Demo data reset", "↺");
  }, [save, toast]);

  const value = {
    catalog, orders, partners,
    role, setRole, custTab, setCustTab, adminTab, setAdminTab, custAuthMode, setCustAuthMode,
    cart, addToCart, cartInc, cartDec, cartRemove,
    auth, settings, offers, liveLocations, loading,
    modal, setModal, closeModal, toast, toastMsg,
    logout, customerAuthSubmit, adminAuthSubmit, partnerAuthSubmit,
    advance, rejectOrder, assignRider, placeOrder, reorder, confirmUpiPayment,
    saveVeg, deleteVeg, toggleVeg,
    addPartner, removePartner, setPartnerPassword, goOnline,
    saveOffer, deleteOffer, saveUpiSetting, refreshSettings,
    resetDemo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
