"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

// Public page for the LOGISTIC & STOCK department:  /spare-parts/<token>
// Put this file at  src/app/spare-parts/[token]/page.jsx  (OUTSIDE the (admin) group, so it needs no login).
// They check the stock, update the prices and answer the third-party quotation requests.
const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
const CONFIGURED = process.env.NEXT_PUBLIC_EVIDENCE_API_PATH;
const PREFIXES = [...new Set([CONFIGURED, "/evidence", "/api"].filter((p) => p !== undefined))];
const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STOCK = { IN_STOCK: "In stock", OUT_OF_STOCK: "Out of stock", UNKNOWN: "Not checked" };

export default function SparePartsLogisticsPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState({}); // id -> { unitPrice, stockStatus, note }
  const [quotes, setQuotes] = useState({}); // id -> { price, note }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const prefixRef = useRef(PREFIXES[0]);

  const load = async () => {
    setError("");
    for (const p of PREFIXES) {
      try {
        const res = await fetch(`${API}${p}/public/spare-parts/${encodeURIComponent(token)}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (res.status === 404 && body.message !== "Request not found") continue; // wrong prefix: try the next one
        if (!res.ok) { setError(body.message || "Could not load the request."); return; }
        prefixRef.current = p;
        setData(body);
        setItems(Object.fromEntries(body.items.map((i) => [i.id, { unitPrice: String(i.unitPrice), stockStatus: i.stockStatus, note: i.note || "" }])));
        setQuotes(Object.fromEntries(body.quotes.map((q) => [q.id, { price: q.quotedPrice ?? "", note: q.quotedNote || "" }])));
        return;
      } catch (_) { /* try next prefix */ }
    }
    setError("Could not reach the server.");
  };
  useEffect(() => { if (token) load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSaving(true); setMsg(""); setError("");
    try {
      const res = await fetch(`${API}${prefixRef.current}/public/spare-parts/${encodeURIComponent(token)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: Object.entries(items).map(([id, v]) => ({ id, unitPrice: v.unitPrice === "" ? 0 : v.unitPrice, stockStatus: v.stockStatus, note: v.note })),
          quotes: Object.entries(quotes).map(([id, v]) => ({ id, price: v.price, note: v.note })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.message || "Could not save.");
      else { setMsg(body.message || "Updated."); load(); }
    } catch (_) { setError("Could not reach the server."); } finally { setSaving(false); }
  };

  const box = { maxWidth: 860, margin: "0 auto", padding: "20px 16px 60px", fontFamily: "Inter,system-ui,Segoe UI,Roboto,sans-serif", color: "#1c1917" };
  const inp = { padding: "6px 8px", border: "1px solid #d6d3d1", borderRadius: 8, width: "100%", font: "inherit" };
  return (
    <div style={{ background: "#f6f4f1", minHeight: "100vh" }}>
      <div style={box}>
        <div style={{ letterSpacing: ".28em", fontSize: 12, fontWeight: 600, color: "#78716c" }}>AUTO PRO MAX</div>
        <h1 style={{ fontSize: 26, margin: "6px 0 2px" }}>Spare parts request</h1>
        {data && <div style={{ color: "#78716c" }}>{data.jobNo} · {data.regNo} · {data.departmentName}</div>}
        {error && <div style={{ background: "#fef2f2", color: "#991b1b", padding: 10, borderRadius: 8, margin: "14px 0" }}>{error}</div>}
        {msg && <div style={{ background: "#eaf3ee", color: "#2f6f4f", padding: 10, borderRadius: 8, margin: "14px 0" }}>{msg}</div>}
        {!data && !error && <p>Loading…</p>}
        {data && (
          <>
            <h2 style={{ fontSize: 18, marginTop: 22 }}>Spare parts</h2>
            <div style={{ background: "#fff", border: "1px solid #e7e2dc", borderRadius: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ background: "#faf9f7", textAlign: "left" }}><th style={{ padding: 8 }}>Spare part</th><th>Qty</th><th>Stock</th><th>Unit price (Rs.)</th><th>Note</th></tr></thead>
                <tbody>
                  {data.items.length === 0 && <tr><td colSpan={5} style={{ padding: 10, color: "#78716c" }}>No spare parts in this request.</td></tr>}
                  {data.items.map((i) => (
                    <tr key={i.id} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>{i.name}<div style={{ color: "#78716c", fontSize: 12 }}>{[i.brand, i.quality].filter(Boolean).join(" · ")}</div></td>
                      <td>{i.qty}</td>
                      <td style={{ minWidth: 130 }}><select style={inp} value={items[i.id]?.stockStatus || "UNKNOWN"} onChange={(e) => setItems({ ...items, [i.id]: { ...items[i.id], stockStatus: e.target.value } })}>{Object.entries(STOCK).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></td>
                      <td style={{ minWidth: 120 }}><input style={inp} type="number" min="0" step="0.01" value={items[i.id]?.unitPrice ?? ""} onChange={(e) => setItems({ ...items, [i.id]: { ...items[i.id], unitPrice: e.target.value } })} /></td>
                      <td style={{ minWidth: 140, paddingRight: 8 }}><input style={inp} maxLength={300} value={items[i.id]?.note ?? ""} onChange={(e) => setItems({ ...items, [i.id]: { ...items[i.id], note: e.target.value } })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ fontSize: 18, marginTop: 22 }}>Third-party quotation requests</h2>
            {data.quotes.length === 0 && <p style={{ color: "#78716c" }}>None.</p>}
            {data.quotes.map((q) => (
              <div key={q.id} style={{ background: "#fff", border: "1px solid #e7e2dc", borderRadius: 12, padding: 12, marginBottom: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {q.photoUrl && <a href={q.photoUrl} target="_blank" rel="noopener noreferrer"><img src={q.photoUrl} alt="Item" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8 }} /></a>}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ marginBottom: 8 }}>{q.description}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input style={{ ...inp, width: 150 }} type="number" min="0" step="0.01" placeholder="Quoted price (Rs.)" value={quotes[q.id]?.price ?? ""} onChange={(e) => setQuotes({ ...quotes, [q.id]: { ...quotes[q.id], price: e.target.value } })} />
                    <input style={{ ...inp, flex: 1, minWidth: 160 }} maxLength={300} placeholder="Note (supplier, availability…)" value={quotes[q.id]?.note ?? ""} onChange={(e) => setQuotes({ ...quotes, [q.id]: { ...quotes[q.id], note: e.target.value } })} />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, flexWrap: "wrap", gap: 10 }}>
              <div><strong>Total: Rs. {money(data.totalSparePartsValue)}</strong>{data.updatedAt && <div style={{ color: "#78716c", fontSize: 12 }}>Last updated {new Date(data.updatedAt).toLocaleString()}</div>}</div>
              <button onClick={submit} disabled={saving} style={{ background: "#8f0b0b", color: "#fff", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 600, cursor: "pointer" }}>{saving ? "Saving…" : "Save update"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}