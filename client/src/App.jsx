import React from "react";
import { useApp } from "./store.jsx";
import { Header, CartBar, Toast, ModalHost } from "./components/Shared.jsx";
import { Customer } from "./components/Customer.jsx";
import { Admin } from "./components/Admin.jsx";
import { Delivery } from "./components/Delivery.jsx";

export default function App() {
  const { role, loading } = useApp();

  return (
    <>
      <Header />
      <main>
        {loading ? (
          <div className="empty"><div className="e">🥬</div><h3>Loading fresh produce…</h3></div>
        ) : role === "customer" ? (
          <Customer />
        ) : role === "admin" ? (
          <Admin />
        ) : (
          <Delivery />
        )}
      </main>
      {!loading ? <CartBar /> : null}
      <ModalHost />
      <Toast />
    </>
  );
}
