"use client";

// Finance > Sales Invoice > "Create Invoice"   ->   src\app\(admin)\sales-invoice\NewSaleModal.jsx
// A counter sale (no job). Full-screen "point of sale" window: customer, one smart item search
// (Inventory / Repair types / Manual line), live total. After "Create invoice" the normal invoice window opens.
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useCreateSaleInvoiceMutation, useSearchSaleCustomersQuery, useSearchSalePartsQuery, useSearchSaleServicesQuery } from "./salesInvoiceApi";

const money = (n) => Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const useDebounced = (v, ms = 250) => { const [d, setD] = useState(v); useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]); return d; };
const TABS = [["part", "Inventory", "mdi:package-variant-closed"], ["service", "Repair types", "mdi:wrench-outline"], ["manual", "Manual line", "mdi:pencil-plus-outline"]];

const CSS = `
.modal-backdrop.ns-blur { background: rgba(15,23,42,.45); backdrop-filter: blur(6px); } .modal-backdrop.ns-blur.show { opacity: 1; }
.ns-modal.modal-dialog { max-width: none; width: 100vw; margin: 0; height: 100vh; }
.ns-modal .modal-content { height: 100vh; border: 0; border-radius: 0; background: #f1f5f9; font-family: Inter, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; font-size: .92rem; overflow: hidden; }
.ns-modal .modal-body { padding: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; background: #f1f5f9; }
.ns-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; flex: none; }
.ns-bar-l { display: flex; align-items: center; gap: 12px; } .ns-ic { width: 38px; height: 38px; border-radius: 10px; background: #0f172a; color: #fff; display: grid; place-items: center; }
.ns-t { font-weight: 700; font-size: 1rem; } .ns-s { color: #64748b; font-size: .8rem; }
.ns-x { width: 38px; height: 38px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; display: grid; place-items: center; cursor: pointer; } .ns-x:hover { background: #f1f5f9; }
.ns-layout { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; padding: 20px; max-width: 1700px; width: 100%; margin: 0 auto; }
.ns-main, .ns-aside { min-width: 0; min-height: 0; overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: 16px; }
.ns-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.05); padding: 18px 22px; }
.ns-h { font-size: .95rem; font-weight: 700; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; } .ns-count { background: #e2e8f0; color: #334155; border-radius: 999px; padding: 0 9px; font-size: .75rem; }
.ns-lbl { display: block; font-size: .7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #64748b; margin: 0 0 4px; }
.ns-in { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; font-size: .9rem; color: #0f172a; outline: 0; transition: border-color .12s, box-shadow .12s; min-width: 0; }
.ns-in:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,.12); } .ns-in.sm { height: 34px; text-align: right; }
.ns-cust { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } .ns-cust .wide { grid-column: span 2; }
.ns-find { position: relative; } .ns-find > svg { position: absolute; left: 12px; top: 12px; color: #94a3b8; } .ns-find .ns-in { padding-left: 38px; }
.ns-pick { position: absolute; z-index: 6; left: 0; right: 0; top: 44px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 12px 32px rgba(15,23,42,.14); max-height: 260px; overflow: auto; }
.ns-opt { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; text-align: left; border: 0; border-top: 1px solid #f1f5f9; background: #fff; padding: 9px 14px; cursor: pointer; } .ns-opt:first-child { border-top: 0; } .ns-opt:hover:not(:disabled) { background: #f1f5f9; } .ns-opt:disabled { opacity: .5; cursor: not-allowed; }
.ns-opt small { color: #64748b; } .ns-ok { color: #15803d; font-weight: 600; } .ns-no { color: #94a3b8; font-weight: 600; } .ns-note { padding: 14px; color: #64748b; text-align: center; }
.ns-tabs { display: inline-flex; gap: 4px; padding: 4px; background: #f1f5f9; border-radius: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.ns-tabs button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; height: 34px; padding: 0 14px; border-radius: 9px; font-weight: 600; color: #475569; cursor: pointer; } .ns-tabs button.on { background: #0f172a; color: #fff; }
.ns-man { display: grid; grid-template-columns: minmax(0, 1fr) 90px 140px auto; gap: 8px; }
.ns-btn { height: 40px; padding: 0 18px; border: 0; border-radius: 10px; background: #0f172a; color: #fff; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; justify-content: center; } .ns-btn:hover { background: #1e293b; } .ns-btn:disabled { opacity: .6; cursor: not-allowed; }
.ns-row { display: grid; grid-template-columns: 26px minmax(0, 1fr) 84px 130px 130px 34px; gap: 0 12px; align-items: center; padding: 9px 4px; border-bottom: 1px solid #eef2f6; }
.ns-row-h { font-size: .7rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 8px 4px; }
.ns-r { text-align: right; } .ns-n { color: #94a3b8; font-size: .8rem; } .ns-d { font-weight: 600; overflow-wrap: anywhere; } .ns-d small { display: block; font-weight: 500; color: #64748b; }
.ns-tag { margin-left: 8px; font-size: .66rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #0f172a; color: #fff; vertical-align: middle; } .ns-tag.s { background: #475569; } .ns-tag.m { background: #94a3b8; }
.ns-del { width: 30px; height: 30px; border: 0; border-radius: 8px; background: transparent; color: #94a3b8; display: grid; place-items: center; cursor: pointer; } .ns-del:hover { background: #f1f5f9; color: #0f172a; }
.ns-empty { padding: 34px 10px; text-align: center; color: #64748b; } .ns-empty svg { color: #cbd5e1; display: block; margin: 0 auto 8px; }
.ns-sum { border-radius: 16px; padding: 18px 22px; background: linear-gradient(145deg, #0f172a, #1e293b); color: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.18); }
.ns-sum small { color: #cbd5e1; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; font-size: .7rem; } .ns-amt { font-size: 2rem; font-weight: 800; letter-spacing: -.02em; margin: 2px 0 6px; font-variant-numeric: tabular-nums; }
.ns-line { display: flex; justify-content: space-between; color: #cbd5e1; font-size: .84rem; padding: 3px 0; }
.ns-go { width: 100%; margin-top: 14px; height: 48px; border: 0; border-radius: 12px; background: #fff; color: #0f172a; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; } .ns-go:hover { background: #e2e8f0; } .ns-go:disabled { opacity: .6; cursor: not-allowed; }
.ns-tip { color: #64748b; font-size: .82rem; line-height: 1.5; } .ns-tip li { margin-bottom: 4px; }
@media (max-width: 1100px) { .ns-layout { grid-template-columns: 1fr; overflow-y: auto; } .ns-main, .ns-aside { overflow: visible; } .ns-aside { order: -1; } }
@media (max-width: 760px) {
  .ns-layout { padding: 12px; gap: 14px; } .ns-cust { grid-template-columns: 1fr 1fr; } .ns-cust .wide { grid-column: span 2; } .ns-man { grid-template-columns: 1fr 1fr; } .ns-man > :first-child, .ns-man > :last-child { grid-column: span 2; }
  .ns-row-h { display: none; } .ns-row { grid-template-columns: 24px minmax(0, 1fr) 34px; gap: 6px 10px; padding: 12px 2px; } .ns-row > :nth-child(3), .ns-row > :nth-child(4) { grid-column: 2; } .ns-row > :nth-child(5) { grid-column: 2; text-align: left; font-weight: 700; } .ns-row > :nth-child(6) { grid-column: 3; grid-row: 1; }
}`;

export default function NewSaleModal({ onHide, onCreated }) {
  const [cust, setCust] = useState({ customerId: null, customerName: "", phone: "", regNo: "" });
  const [cq, setCq] = useState("");
  const [tab, setTab] = useState("part");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState([]);                       // { key, kind, partId, description, qty, unitPrice, available, dept }
  const [manual, setManual] = useState({ description: "", qty: "1", unitPrice: "" });
  const [create, { isLoading }] = useCreateSaleInvoiceMutation();
  const searchRef = useRef(null);
  const dcq = useDebounced(cq), dq = useDebounced(q);
  const { data: customers = [] } = useSearchSaleCustomersQuery(dcq, { skip: dcq.length < 2 });
  const { data: parts = [], isFetching: loadP } = useSearchSalePartsQuery(dq, { skip: tab !== "part" || dq.length < 2 });
  const { data: services = [], isFetching: loadS } = useSearchSaleServicesQuery(dq, { skip: tab !== "service" || dq.length < 2 });

  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0), [lines]);
  const qtySum = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty) || 0), 0), [lines]);
  const fail = (text) => Swal.fire({ title: "Please check", text, icon: "error", confirmButtonColor: "#111" });
  const setLine = (key, patch) => setLines((a) => a.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const bump = (a, key, make) => { const ex = a.find((l) => l.key === key); return ex ? a.map((l) => (l === ex ? { ...l, qty: String(Number(l.qty) + 1) } : l)) : [...a, make()]; };
  const done = () => { setQ(""); searchRef.current?.focus(); };

  const addPart = (p) => { setLines((a) => bump(a, `p${p.id}`, () => ({ key: `p${p.id}`, kind: "part", partId: p.id, description: [p.name, p.brand].filter(Boolean).join(" - "), qty: "1", unitPrice: String(p.price ?? ""), available: p.available }))); done(); };
  const addService = (s) => { setLines((a) => bump(a, `s${s.id}`, () => ({ key: `s${s.id}`, kind: "service", partId: null, description: `${s.parent} > ${s.name}`, qty: "1", unitPrice: s.price > 0 ? String(s.price) : "", dept: s.department }))); done(); };
  const addManual = () => {
    const unit = Number(manual.unitPrice), qty = Number(manual.qty);
    if (!manual.description.trim()) return fail("Enter the description.");
    if (!(unit > 0) || !(qty > 0)) return fail("Enter the quantity and the price.");
    setLines((a) => [...a, { key: `m${Date.now()}`, kind: "manual", partId: null, description: manual.description.trim(), qty: String(qty), unitPrice: String(unit) }]);
    setManual({ description: "", qty: "1", unitPrice: "" });
  };

  const submit = async () => {
    if (!cust.customerName.trim()) return fail("Enter the customer name (or pick a customer).");
    if (!lines.length) return fail("Add at least one item.");
    for (const l of lines) {
      if (!(Number(l.qty) > 0) || !(Number(l.unitPrice) > 0)) return fail(`Check the quantity / price of "${l.description}".`);
      if (l.partId && l.available != null && Number(l.qty) > l.available) return fail(`"${l.description}": only ${l.available} in stock.`);
    }
    try {
      const r = await create({
        customerId: cust.customerId || undefined, customerName: cust.customerName.trim(), phone: cust.phone.trim() || undefined, regNo: cust.regNo.trim() || undefined,
        lines: lines.map((l) => ({ partId: l.partId || undefined, description: l.description, qty: Number(l.qty), unitPrice: Number(l.unitPrice) })),
      }).unwrap();
      onCreated?.(r.ref);
    } catch (ex) { fail(ex?.data?.message || "Could not create the invoice."); }
  };

  const showList = tab !== "manual" && dq.length >= 2 && q;
  return (
    <Modal show onHide={onHide} dialogClassName="ns-modal" backdropClassName="ns-blur" backdrop="static" keyboard={!isLoading}>
      <style>{CSS}</style>
      <Modal.Body>
        <div className="ns-bar">
          <div className="ns-bar-l">
            <span className="ns-ic"><Icon icon="mdi:cash-register" width="22" height="22" /></span>
            <div><div className="ns-t">New invoice</div><div className="ns-s">Counter sale · no job</div></div>
          </div>
          <button type="button" className="ns-x" onClick={onHide} disabled={isLoading} aria-label="Close"><Icon icon="mdi:close" width="20" height="20" /></button>
        </div>

        <div className="ns-layout">
          <div className="ns-main">
            <div className="ns-card">
              <h3 className="ns-h"><Icon icon="mdi:account-outline" width="20" height="20" /> Customer</h3>
              <div className="ns-find mb-3">
                <Icon icon="mdi:magnify" width="18" height="18" />
                <input className="ns-in" placeholder="Find an existing customer by name or phone (optional)" value={cq} onChange={(e) => setCq(e.target.value)} />
                {dcq.length >= 2 && cq && (
                  <div className="ns-pick">
                    {!customers.length && <div className="ns-note">No customer found. Type the name below.</div>}
                    {customers.map((c) => (
                      <button key={c.id} type="button" className="ns-opt" onClick={() => { setCust((x) => ({ ...x, customerId: c.id, customerName: c.name, phone: c.phone || "" })); setCq(""); }}>
                        <span>{c.name}</span><small>{c.phone}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ns-cust">
                <div className="wide"><label className="ns-lbl">Customer name *</label><input className="ns-in" value={cust.customerName} onChange={(e) => setCust({ ...cust, customerName: e.target.value, customerId: null })} placeholder="Walk-in customer name" /></div>
                <div><label className="ns-lbl">Phone</label><input className="ns-in" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
                <div><label className="ns-lbl">Vehicle no</label><input className="ns-in" value={cust.regNo} onChange={(e) => setCust({ ...cust, regNo: e.target.value.toUpperCase() })} placeholder="Optional" /></div>
              </div>
            </div>

            <div className="ns-card">
              <h3 className="ns-h"><Icon icon="mdi:format-list-bulleted" width="20" height="20" /> Items <span className="ns-count">{lines.length}</span></h3>
              <div className="ns-tabs" role="tablist">
                {TABS.map(([k, l, ic]) => <button key={k} type="button" role="tab" className={tab === k ? "on" : ""} onClick={() => { setTab(k); setQ(""); }}><Icon icon={ic} width="17" height="17" />{l}</button>)}
              </div>

              {tab === "manual" ? (
                <div className="ns-man">
                  <input className="ns-in" placeholder="Description (labour, service, other)" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addManual()} />
                  <input className="ns-in" type="number" min="0" placeholder="Qty" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} />
                  <input className="ns-in" type="number" min="0" placeholder="Unit price" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addManual()} />
                  <button type="button" className="ns-btn" onClick={addManual}><Icon icon="mdi:plus" width="18" height="18" /> Add</button>
                </div>
              ) : (
                <div className="ns-find">
                  <Icon icon="mdi:magnify" width="18" height="18" />
                  <input ref={searchRef} className="ns-in" value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder={tab === "part" ? "Search inventory: name, part no, brand, barcode" : "Search a department repair type: brake, service, wash..."} />
                  {showList && (
                    <div className="ns-pick">
                      {(tab === "part" ? loadP : loadS) && <div className="ns-note"><Spinner size="sm" /></div>}
                      {!(tab === "part" ? loadP : loadS) && !(tab === "part" ? parts : services).length && <div className="ns-note">Nothing found</div>}
                      {tab === "part" && parts.map((p) => (
                        <button key={p.id} type="button" className="ns-opt" disabled={p.available <= 0} onClick={() => addPart(p)}>
                          <span>{p.name} <small>{[p.brand, p.partNo].filter(Boolean).join(" · ")}</small></span>
                          <span>{money(p.price)} · <b className={p.available > 0 ? "ns-ok" : "ns-no"}>{p.available > 0 ? `${p.available} in stock` : "Out of stock"}</b></span>
                        </button>
                      ))}
                      {tab === "service" && services.map((s) => (
                        <button key={s.id} type="button" className="ns-opt" onClick={() => addService(s)}>
                          <span>{s.parent} &gt; {s.name} <small>{s.department}</small></span>
                          <span>{s.price > 0 ? money(s.price) : <small>set price</small>}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3">
                <div className="ns-row ns-row-h"><span>#</span><span>Item</span><span className="ns-r">Qty</span><span className="ns-r">Unit price</span><span className="ns-r">Amount</span><span /></div>
                {!lines.length && <div className="ns-empty"><Icon icon="mdi:cart-outline" width="40" height="40" />No items yet. Search above or add a manual line.</div>}
                {lines.map((l, i) => (
                  <div className="ns-row" key={l.key}>
                    <span className="ns-n">{i + 1}</span>
                    <div className="ns-d">{l.description}<span className={`ns-tag ${l.kind === "service" ? "s" : l.kind === "manual" ? "m" : ""}`}>{l.kind === "part" ? "Inventory" : l.kind === "service" ? "Repair" : "Manual"}</span>
                      {l.kind === "part" && <small>{l.available} in stock</small>}{l.kind === "service" && <small>{l.dept}</small>}</div>
                    <input className="ns-in sm" type="number" min="0" aria-label="Quantity" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} />
                    <input className="ns-in sm" type="number" min="0" aria-label="Unit price" value={l.unitPrice} onChange={(e) => setLine(l.key, { unitPrice: e.target.value })} />
                    <b className="ns-r">{money((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</b>
                    <button type="button" className="ns-del" aria-label="Remove item" onClick={() => setLines((a) => a.filter((x) => x.key !== l.key))}><Icon icon="mdi:trash-can-outline" width="18" height="18" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ns-aside">
            <div className="ns-sum">
              <small>Total (before discount / VAT)</small>
              <div className="ns-amt">LKR {money(total)}</div>
              <div className="ns-line"><span>Customer</span><span>{cust.customerName || "-"}</span></div>
              <div className="ns-line"><span>Items</span><span>{lines.length} · qty {qtySum}</span></div>
              <button type="button" className="ns-go" onClick={submit} disabled={isLoading}>{isLoading ? <Spinner size="sm" /> : <><Icon icon="mdi:check-circle-outline" width="22" height="22" /> Create invoice</>}</button>
            </div>
            <div className="ns-card">
              <h3 className="ns-h"><Icon icon="mdi:information-outline" width="20" height="20" /> Good to know</h3>
              <ul className="ns-tip ps-3 mb-0">
                <li>Inventory items leave the stock when the invoice is created.</li>
                <li>Repair types bring the labour price of the department. You can change the price.</li>
                <li>Discounts, VAT and payments are set in the next window.</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}