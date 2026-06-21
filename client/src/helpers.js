// helpers.js — small pure helpers used across components (no behaviour change
// from the original single-file app).

export const inr = (n) => "₹" + Number(n).toFixed(0);

export const DELIVERY_FEE = 20;
export const FREE_ABOVE = 300;
export const PARTNER_PAY = 15;

export const STATUS = {
  PLACED: { label: "Order placed", cls: "p-placed" },
  CONFIRMED: { label: "Confirmed", cls: "p-confirmed" },
  PACKED: { label: "Packed", cls: "p-packed" },
  ASSIGNED: { label: "Rider assigned", cls: "p-assigned" },
  PICKED_UP: { label: "Out for delivery", cls: "p-picked" },
  DELIVERED: { label: "Delivered", cls: "p-delivered" },
  REJECTED: { label: "Rejected", cls: "p-rejected" },
};

export const TRACK_STEPS = [
  ["PLACED", "Placed"],
  ["CONFIRMED", "Confirmed"],
  ["PACKED", "Packed"],
  ["PICKED_UP", "On the way"],
  ["DELIVERED", "Delivered"],
];

export const STEP_ORDER = {
  PLACED: 0,
  CONFIRMED: 1,
  PACKED: 2,
  ASSIGNED: 2,
  PICKED_UP: 3,
  DELIVERED: 4,
};

export const OFFER_THEMES = ["green", "carrot", "blue", "amber"];

export function timeAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return Math.floor(d / 60) + "m ago";
  if (d < 86400) return Math.floor(d / 3600) + "h ago";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function isToday(ts) {
  const a = new Date(ts);
  const b = new Date();
  return a.toDateString() === b.toDateString();
}

export function cartItems(cart, catalog) {
  return Object.entries(cart)
    .map(([id, qty]) => {
      const v = catalog.find((c) => c.id === id);
      if (!v) return null;
      return { ...v, qty };
    })
    .filter(Boolean);
}

export function cartCount(cart) {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

export function cartSubtotal(cart, catalog) {
  return cartItems(cart, catalog).reduce((a, i) => a + i.price * i.qty, 0);
}

export function feeFor(sub) {
  return sub >= FREE_ABOVE || sub === 0 ? 0 : DELIVERY_FEE;
}

export function navigateLinkFor(customer) {
  return customer.lat && customer.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customer.address)}`;
}

export function mapsLinkFor(customer) {
  return customer.lat && customer.lng
    ? `https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(customer.address);
}
