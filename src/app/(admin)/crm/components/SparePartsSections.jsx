"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Collapse, Form, FormControl, FormSelect, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddSpareOptionMutation,
  useAddSparePartItemMutation,
  useAddSpareQuoteMutation,
  useGetSparePartsQuery,
  useRemoveSparePartItemMutation,
  useRemoveSpareQuoteMutation,
  useSendSparePartsLinkMutation,
  useSetSparePartsHeaderMutation,
  useUpdateSparePartItemMutation,
} from "@/store/features/apiSlice";
import { useSearchSpareLimitedQuery } from "./sparePartsSearchApi";
import { useSetPartWarrantyMutation } from "./inspectionQtyApi";

// Spare Part Review & Order (all departments that use it)
// Props: jobId, readOnly?
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const letter = (n) => String.fromCharCode(97 + (n % 26));
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STOCK_BADGE = { IN_STOCK: ["success", "In stock"], OUT_OF_STOCK: ["danger", "Out of stock"], UNKNOWN: ["secondary", "Not checked"] };
const QUOTE_BADGE = { REQUESTED: ["secondary", "Requested"], SENT: ["info", "Sent to Logistic & Stock"], QUOTED: ["success", "Quoted"] };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Search the Item master (Inventory & Spare Parts) by item name, SKU, part no / OEM no, barcode or brand.
// Nothing is listed until the user types. The database returns the first 10 matches ("Show more" loads 10 more).
// Clicking a result adds the part to the requirement list straight away.
const TYPED_ROWS = 10, MORE_ROWS = 10;
function ItemSearch({ onAdd, disabled }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [limit, setLimit] = useState(TYPED_ROWS);
  const [added, setAdded] = useState(null);   // id of the part just added (shows a tick for a moment)
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setLimit(TYPED_ROWS); }, [dq]);
  const typed = dq.length > 0;
  const { data = [], isFetching } = useSearchSpareLimitedQuery({ q: dq, limit }, { skip: !typed });
  const hasMore = typed && data.length >= limit && limit < 50;
  const pick = async (p) => {
    if (disabled) return;
    setAdded(p.id);
    await onAdd(p);
    setQ(""); // clear the search box (and close the result list) so the next part can be searched straight away
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1500);
  };
  return (
    <div className="mb-2">
      <style>{`.is-search-ph::placeholder{color:#6b7280 !important;opacity:1 !important;font-style:normal}`}</style>
      <div className="input-group">
        <span className="input-group-text bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></span>
        <FormControl className="is-search-ph" autoComplete="off" disabled={disabled} placeholder="Type item name, SKU, part no, OEM no, barcode or brand to search..." value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <Button variant="outline-secondary" aria-label="Clear" onClick={() => setQ("")}><Icon icon="mdi:close" width="18" height="18" /></Button>}
        {isFetching && <span className="input-group-text bg-white"><Spinner size="sm" /></span>}
      </div>
      {typed && (
        <div className="border rounded-3 mt-1 bg-white overflow-hidden shadow-sm" style={{ maxHeight: 300, overflowY: "auto" }}>
          {!isFetching && data.length === 0 && <div className="small text-muted p-3">No spare part found for "{dq}". Add it to the Item master (Inventory &amp; Spare Parts), or add it manually below.</div>}
          {data.map((p) => (
            <button key={p.id} type="button" disabled={disabled} onClick={() => pick(p)} className={`d-flex align-items-center gap-2 w-100 text-start border-0 border-bottom px-3 py-2 ${added === p.id ? "bg-success-subtle" : "bg-white"}`}>
              <div className="flex-grow-1">
                <div className="fw-semibold">{p.name}</div>
                <div className="small text-muted">{[p.sku && `SKU ${p.sku}`, p.partNo, p.brand, p.quality].filter(Boolean).join(" · ") || "-"}</div>
              </div>
              <div className="text-end">
                <div className="fw-semibold">{money(p.price)}</div>
                <Badge bg={p.stockQty > 0 ? "success" : "danger"}>{p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}</Badge>
              </div>
              {added === p.id && <Icon icon="mdi:check-circle" width="22" height="22" className="text-success flex-shrink-0" />}
            </button>
          ))}
          {hasMore && (
            <button type="button" className="btn btn-link btn-sm w-100 text-decoration-none" disabled={isFetching} onClick={() => setLimit((l) => l + MORE_ROWS)}>
              <Icon icon="mdi:chevron-down" width="18" height="18" /> Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// One collapsible section: coloured icon, title, a short summary and a done tick. Click the header to open / close.
// A card without children (the Total card) is just a header.
function Card({ title, hint, right, children, icon = "mdi:clipboard-text-outline", color: _sectionColor, summary, done, defaultOpen = true, anchor }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = children !== undefined && children !== null;
  return (
    <div data-vj={anchor} className="vj-card">
      <div className="vj-card-h" role={hasBody ? "button" : undefined} aria-expanded={hasBody ? open : undefined} onClick={hasBody ? () => setOpen(!open) : undefined}>
        <span className="vj-ico"><Icon icon={icon} width="20" height="20" /></span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="vj-card-t">
            {title}
            {done === true && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}
          </div>
          {hint && (open || !hasBody) && <div className="vj-card-s">{hint}</div>}
          {summary ? <div className="vj-card-s">{summary}</div> : null}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        {hasBody && <span className="vj-chev"><Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" /></span>}
      </div>
      {hasBody && (
        <Collapse in={open}>
          <div><div className="vj-card-b">{children}</div></div>
        </Collapse>
      )}
    </div>
  );
}


// "Warranty claim" pill: grey outline when off, solid green with a shield tick when on
function ClaimPill({ on, disabled, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} title={on ? "Warranty claim - not charged. Click to charge it again" : "Mark as a warranty claim (not charged)"}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, padding: "3px 10px 3px 7px", borderRadius: 999, fontSize: ".75rem", fontWeight: 600, lineHeight: 1.4, cursor: disabled ? "default" : "pointer",
        border: `1.5px solid ${on ? "#16a34a" : "#cbd0d6"}`, background: on ? "#16a34a" : "#fff", color: on ? "#fff" : "#4b5563", opacity: disabled ? 0.65 : 1, transition: "all .15s" }}>
      <Icon icon={on ? "mdi:shield-check" : "mdi:shield-outline"} width="15" height="15" />
      {on ? "Warranty claim" : "Claim warranty"}
    </button>
  );
}

// The spare part sections (Spare Parts Requirement, Request quotation from third parties),
// used inside the Vehicle Job Inspection window so that there is no separate Spare Part Review & Order window.
export default function SparePartsSections({ jobId, readOnly: lockedByParent, markupPercent = 0, showAdjDetails = false, warrantyOn = false, adjustment = null }) {
  // price adjustment (markup %) of the job: added to the unit price of EACH part / quotation line
  const pct = Number(markupPercent) || 0;
  // the % is added to the UNIT PRICE of each line, so the line total = qty x (unit price + %)
  const adjUnit = (u) => Math.round((Number(u) || 0) * (100 + pct)) / 100;
  const lineAdj = (q, u) => Math.round((Number(q) || 0) * (adjUnit(u) - (Number(u) || 0)) * 100) / 100;
  const { data, isLoading, isError, error: loadError, refetch, isFetching } = useGetSparePartsQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [addItem, { isLoading: adding }] = useAddSparePartItemMutation();
  const [updateItem] = useUpdateSparePartItemMutation();
  const [removeItem] = useRemoveSparePartItemMutation();
  const [addQuote, { isLoading: quoting }] = useAddSpareQuoteMutation();
  const [removeQuote] = useRemoveSpareQuoteMutation();
  const [sendLink, { isLoading: linking }] = useSendSparePartsLinkMutation();
  const [setHeader] = useSetSparePartsHeaderMutation();
  const [setPartWarranty] = useSetPartWarrantyMutation();
  // "Warranty available? Yes": a line marked as a warranty claim is shown as "Warranty claim" and is not charged
  const claimed = (x) => Boolean(warrantyOn && x?.warrantyClaim);
  const toggleClaim = async (i, claim) => { try { await setPartWarranty({ jobId, itemId: i.id, claim }).unwrap(); } catch (ex) { fail(ex, "Could not change the warranty claim."); } };
  const [addOption] = useAddSpareOptionMutation();

  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: "", brand: "", quality: "", qty: "1", unitPrice: "" });
  const [quote, setQuote] = useState({ description: "", photoUrl: "", photoName: "" });
  const [uploading, setUploading] = useState(false);
  const [showPrev, setShowPrev] = useState(true);
  const setError = (m) => { if (m) Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonText: "OK", confirmButtonColor: "#111" }); };
  const photoRef = useRef(null);

  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });
  const job = data?.job;
  const readOnly = Boolean(data && !data.canRecord) || Boolean(lockedByParent);
  const qualities = data?.options?.qualities || [];
  const brands = data?.options?.brands || [];
  useEffect(() => { if (data && !manual.quality && qualities.length) setManual((m) => ({ ...m, quality: qualities[0] })); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFromCatalog = async (p) => { try { await addItem({ jobId, partId: p.id, qty: 1 }).unwrap(); } catch (ex) { fail(ex, "Could not add the spare part."); } };
  const addManual = async () => {
    setError("");
    if (!manual.name.trim()) return setError("Enter the spare part name.");
    try { await addItem({ jobId, ...manual, qty: Number(manual.qty || 1), unitPrice: Number(manual.unitPrice || 0) }).unwrap(); setManual({ ...manual, name: "", unitPrice: "", qty: "1" }); } catch (ex) { fail(ex, "Could not add the spare part."); }
  };
  // Live (unsaved) qty / price typed in the table, so the line total updates while typing.
  const [live, setLive] = useState({});
  const setLiveField = (id, field, value) => setLive((m) => ({ ...m, [id]: { ...m[id], [field]: value } }));
  const numOf = (i, field) => { const v = live[i.id]?.[field]; return v === undefined || v === "" ? (v === "" ? 0 : i[field]) : Number(v); };
  const commit = async (i, field) => {
    const v = live[i.id]?.[field];
    if (v === undefined) return;
    const n = Number(v);
    const ok = Number.isFinite(n) && n !== i[field] && (field !== "qty" || n >= 1);
    if (ok) await patch(i, { [field]: n });
    setLive((m) => { const x = { ...m }; if (x[i.id]) { x[i.id] = { ...x[i.id] }; delete x[i.id][field]; } return x; });
  };
  const patch = async (it, change) => { try { await updateItem({ jobId, itemId: it.id, ...change }).unwrap(); } catch (ex) { fail(ex, "Could not save the change."); } };
  const remove = async (it) => {
    const ok = await Swal.fire({ title: "Remove this spare part?", text: it.name, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (ok.isConfirmed) try { await removeItem({ jobId, itemId: it.id }).unwrap(); } catch (ex) { fail(ex, "Could not remove it."); }
  };
  const newOption = async (kind) => {
    const r = await Swal.fire({ title: kind === "BRAND" ? "Add a brand" : "Add a quality", input: "text", inputPlaceholder: kind === "BRAND" ? "e.g. Korea" : "e.g. Used", showCancelButton: true, confirmButtonText: "Add", inputValidator: (v) => (!v?.trim() ? "Enter a name" : undefined) });
    if (r.isConfirmed) try { await addOption({ kind, name: r.value.trim() }).unwrap(); } catch (ex) { fail(ex, "Could not add the option."); }
  };

  // third-party quotation: item photo + description
  const onPhoto = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) return Swal.fire({ title: "File too large", text: "Max 15 MB.", icon: "warning" });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      setQuote((q) => ({ ...q, photoUrl: URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl, photoName: f.name }));
    } catch (ex) { fail(ex, "Upload failed"); } finally { setUploading(false); }
  };
  const addQuoteReq = async () => {
    setError("");
    if (!quote.description.trim()) return setError("Add a description of the item.");
    try { await addQuote({ jobId, photoUrl: quote.photoUrl || undefined, description: quote.description.trim() }).unwrap(); setQuote({ description: "", photoUrl: "", photoName: "" }); } catch (ex) { fail(ex, "Could not add the request."); }
  };

  // a quotation request can be removed at any stage; one that Inventory already has (or has quoted) asks first
  const dropQuote = async (q) => {
    if (q.status !== "REQUESTED") {
      const ok = await Swal.fire({ title: "Remove this request?", text: q.status === "QUOTED" ? "Inventory & Spare Parts already quoted this item. It will be removed from the job and from their list." : "It was already sent to Logistic & Stock. It will be removed from the job and from their list.", icon: "warning", showCancelButton: true, confirmButtonText: "Yes, remove", confirmButtonColor: "#111" });
      if (!ok.isConfirmed) return;
    }
    try { await removeQuote({ jobId, quoteId: q.id }).unwrap(); } catch (ex) { fail(ex, "Could not remove the request."); }
  };

  // "Upload to ERP System" + link to the Inventory & Spare Parts
  const send = async () => {
    try {
      await sendLink(jobId).unwrap();
      await Swal.fire({
        title: "Sent to Inventory & Spare Parts",
        html: `<div class="text-muted" style="font-size:.9rem">The spare parts and the quotation requests are now in <strong>Inventory &amp; Spare Parts &rarr; Job Orders &rarr; Spare part orders</strong>.</div>`,
        icon: "success",
      });
    } catch (ex) { fail(ex, "Could not upload to the ERP."); }
  };

  const partsGross = data ? data.items.filter((i) => !claimed(i)).reduce((sum, i) => sum + numOf(i, "qty") * adjUnit(numOf(i, "unitPrice")), 0) : 0;
  if (isLoading) return <div className="text-center py-3"><Spinner size="sm" /></div>;
  if (isError || !data) return null; // department without spare parts
  // "No spare parts needed": the add-part form, the list, the quotation requests and the send bar are hidden - only this switch stays
  const noneNeeded = Boolean(data.header.noParts) && data.items.length === 0 && data.quotes.length === 0;
  if (noneNeeded) {
    return (
      <Card title="Spare Parts Requirement" icon="mdi:cog-transfer-outline" color="#ea580c" done summary="No spare parts needed for this job">
        <div className="d-flex flex-wrap align-items-center gap-3 rounded-3 p-3" style={{ background: "#e8f8ee", border: "1.5px solid #16a34a" }}>
          <Icon icon="mdi:check-circle" width="32" height="32" style={{ color: "#16a34a", flexShrink: 0 }} />
          <div className="flex-grow-1" style={{ minWidth: 200 }}>
            <div className="fw-bold fs-6">No spare parts needed for this job</div>
            <div className="small text-muted">Nothing to add or send to Inventory.</div>
          </div>
          {!readOnly && <Button variant="outline-dark" className="fw-semibold" onClick={() => setHeader({ jobId, noParts: false })}><Icon icon="mdi:plus-circle-outline" width="18" height="18" /> Add spare parts</Button>}
        </div>
      </Card>
    );
  }
  return (
    <>
              {/* Requirement list */}
              <Card title="Spare Parts Requirement" icon="mdi:cog-transfer-outline" color="#ea580c" done={data.items.length > 0} summary={`${data.items.length} part(s) · ${money(partsGross)}${pct > 0 ? ` (incl. +${pct}%)` : ""}`} hint="Search the item master and click a part to add it. If the stock is not available, update the price manually."
                right={<span className="badge text-bg-dark fs-6 fw-semibold">{money(partsGross)}</span>}>
                {data.items.length === 0 && (
                  <>
                  {!readOnly && (
                    <Button variant="outline-dark" className="w-100 mb-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2" style={{ borderWidth: 1.5, borderRadius: 12 }} onClick={() => setHeader({ jobId, noParts: true })}>
                      <Icon icon="mdi:package-variant-closed-remove" width="22" height="22" /> No spare parts needed for this job
                    </Button>
                  )}
                  {readOnly && Boolean(data.header.noParts) && <div className="mb-3 fw-semibold"><Icon icon="mdi:check-circle" width="20" height="20" style={{ color: "#16a34a" }} /> No spare parts needed for this job</div>}
                  </>
                )}
                {!readOnly && (
                  <div className="rounded-3 p-3 mb-3" style={{ background: "#f4f5f7", border: "1px solid #e5e7eb" }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon="mdi:plus-circle-outline" width="20" height="20" style={{ color: "#111827" }} /> Add item</div>
                      <Button size="sm" variant={showManual ? "secondary" : "outline-secondary"} onClick={() => setShowManual((v) => !v)}>
                        <Icon icon={showManual ? "mdi:close" : "mdi:pencil-plus-outline"} width="16" height="16" /> {showManual ? "Hide manual form" : "Add item manually"}
                      </Button>
                    </div>
                    <ItemSearch onAdd={addFromCatalog} disabled={adding} />
                    <div className="small text-muted mt-n2">Search the item master and click an item to add it. Can't find it? Use "Add item manually".</div>
                  </div>
                )}
                <Table size="sm" responsive className="align-middle mb-2">
                  <thead><tr><th /><th>Spare part</th><th style={{ width: 130 }}>Brand</th><th>Quality</th><th style={{ width: 70 }}>Qty</th><th className="text-end" style={{ width: 150 }}>Price (Rs.)</th><th className="text-end">Total</th><th /></tr></thead>
                  <tbody>
                    {data.items.length === 0 && <tr><td colSpan={8} className="small text-muted">No spare parts yet.</td></tr>}
                    {data.items.map((i, n) => {
                      const [sv, st] = STOCK_BADGE[i.stockStatus];
                      return (
                        <tr key={`${i.id}-${i.brand}`} className={i.stockStatus === "OUT_OF_STOCK" ? "table-warning" : ""}>
                          <td className="text-muted">{letter(n)}.</td>
                          <td>{i.name}<div><Badge bg={sv}>{st}</Badge> {i.priceSource === "MANUAL" && <Badge bg="warning" text="dark">Manual price</Badge>} {i.priceSource === "LOGISTICS" && <Badge bg="info">Updated by Logistic &amp; Stock</Badge>}</div>{i.stockStatus === "OUT_OF_STOCK" && <div className="small text-danger">Stock not available · update the price manually</div>}
                            {warrantyOn && <div><ClaimPill on={Boolean(i.warrantyClaim)} disabled={readOnly} onChange={(v) => toggleClaim(i, v)} /></div>}</td>
                          <td className="small">{i.brand || "-"}</td>
                          <td className="small">{i.quality || "-"}</td>
                          <td><FormControl size="sm" type="number" min="1" disabled={readOnly} value={live[i.id]?.qty ?? i.qty} onChange={(e) => setLiveField(i.id, "qty", e.target.value)} onBlur={() => commit(i, "qty")} /></td>
                          <td className="text-end text-nowrap">
                            <div className={claimed(i) ? "text-muted text-decoration-line-through" : "fw-semibold"}>{money(adjUnit(i.unitPrice))}</div>
                            {pct > 0 && showAdjDetails && !claimed(i) && (<>
                              <div className="small text-muted">Actual: {money(i.unitPrice)}</div>
                              <div className="small text-success">+{money(adjUnit(i.unitPrice) - i.unitPrice)} ({pct}%)</div>
                            </>)}
                          </td>
                          <td className="text-end">{claimed(i) ? <Badge bg="success">Warranty claim</Badge> : money(numOf(i, "qty") * adjUnit(numOf(i, "unitPrice")))}{pct > 0 && showAdjDetails && !claimed(i) && <div className="small text-success text-nowrap">+{money(lineAdj(numOf(i, "qty"), numOf(i, "unitPrice")))} increase</div>}</td>
                          <td>{!readOnly && <Button size="sm" variant="outline-danger" onClick={() => remove(i)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {data.items.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={6} className="text-end">Total</td>
                        <td className="text-end">{money(partsGross)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </Table>
                {adjustment}
                {!readOnly && showManual && (
                  <div className="border rounded p-2 bg-light">
                    <div className="small fw-semibold mb-1">Add / update manually</div>
                    <div className="row g-2">
                      <div className="col-12 col-md-4"><FormControl size="sm" autoComplete="off" placeholder="Spare part name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} /></div>
                      <div className="col-6 col-md-2 d-flex gap-1"><FormSelect size="sm" value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })}><option value="">Brand</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect><Button size="sm" variant="outline-secondary" title="Add a brand" onClick={() => newOption("BRAND")}>+</Button></div>
                      <div className="col-6 col-md-2"><FormSelect size="sm" value={manual.quality} onChange={(e) => setManual({ ...manual, quality: e.target.value })}>{qualities.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
                      <div className="col-3 col-md-1"><FormControl size="sm" type="number" min="1" placeholder="Qty" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} /></div>
                      <div className="col-5 col-md-2"><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Price" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value })} /></div>
                      <div className="col-4 col-md-1 d-grid"><Button size="sm" disabled={adding} onClick={addManual}>Add</Button></div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Third-party quotation */}
              <Card title="Request quotation from third parties" icon="mdi:storefront-outline" color="#0891b2" done={data.quotes.length > 0} summary={`${data.quotes.length} request(s)`} hint="Item photo + description. It is uploaded to the ERP and Inventory & Spare Parts is notified to answer with a price.">
                {!readOnly && (
                  <div className="row g-2 align-items-start mb-2">
                    <div className="col-md-4 d-flex align-items-center gap-2">
                      <Button size="sm" variant="outline-primary" disabled={uploading} onClick={() => photoRef.current?.click()}>{uploading ? <Spinner size="sm" /> : <Icon icon="mdi:camera-outline" width="16" height="16" />} Item photo</Button>
                      <input ref={photoRef} type="file" hidden accept="image/*" capture="environment" onChange={onPhoto} />
                      {quote.photoUrl && <img src={quote.photoUrl} alt="" style={{ height: 38, borderRadius: 4 }} />}
                    </div>
                    <div className="col-md-6"><FormControl as="textarea" rows={2} size="sm" maxLength={1000} placeholder="Add description" value={quote.description} onChange={(e) => setQuote({ ...quote, description: e.target.value })} /></div>
                    <div className="col-md-2 d-grid"><Button size="sm" disabled={quoting} onClick={addQuoteReq}><Icon icon="mdi:plus" width="16" height="16" /> Add request</Button></div>
                  </div>
                )}
                {data.quotes.length === 0 ? <div className="small text-muted">No quotation requests.</div> : data.quotes.map((q) => (
                  <div key={q.id} className="d-flex align-items-center gap-2 border-top py-1">
                    {q.photoUrl ? <a href={q.photoUrl} target="_blank" rel="noopener noreferrer"><img src={q.photoUrl} alt="" style={{ height: 40, width: 40, objectFit: "cover", borderRadius: 4 }} /></a> : <Icon icon="mdi:image-off-outline" width="28" height="28" className="text-muted" />}
                    <div className="flex-grow-1">{q.description}<div className="small"><Badge bg={QUOTE_BADGE[q.status][0]}>{QUOTE_BADGE[q.status][1]}</Badge>{q.quotedPrice != null && <strong className="ms-2">{money(q.quotedPrice)}</strong>}{q.quotedNote && <span className="text-muted ms-2">{q.quotedNote}</span>}</div></div>
                    {!readOnly && <Button size="sm" variant="outline-danger" title="Remove this request" aria-label="Remove this request" onClick={() => dropQuote(q)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                  </div>
                ))}
              </Card>

              {/* ONE send for both lists: the spare parts above and the third-party quotation requests */}
              {(data.items.length > 0 || data.quotes.length > 0) && (
                <div data-vj="spare-send" className={`sp-send ${data.header.needsUpload ? "todo" : "done"}`}>
                  <span className="sp-send-ic"><Icon icon={data.header.needsUpload ? "mdi:package-up" : "mdi:check-decagram-outline"} width="24" height="24" /></span>
                  <div className="sp-send-t">
                    <b>{data.header.needsUpload ? "Send to Inventory & Spare Parts" : "Sent to Inventory & Spare Parts"}</b>
                    <div className="sp-send-chips"><span>{data.items.length} spare part{data.items.length === 1 ? "" : "s"}</span><span>{data.quotes.length} quotation request{data.quotes.length === 1 ? "" : "s"}</span></div>
                    <small>{data.header.logisticsUpdatedAt ? `Logistic & Stock updated ${new Date(data.header.logisticsUpdatedAt).toLocaleString()} · the lists above show their prices` : data.header.linkSentAt ? `Sent ${new Date(data.header.linkSentAt).toLocaleString()}${data.header.needsUpload ? " · you changed the lists since, send again" : " · waiting for Inventory & Spare Parts to update"}` : "Both lists go together in one send. Not sent yet."}</small>
                  </div>
                  <div className="sp-send-a">
                    <Button size="sm" variant="outline-secondary" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
                    {!readOnly && <Button variant="dark" disabled={linking || !data.header.needsUpload} onClick={send}>{linking ? <Spinner size="sm" /> : <Icon icon={data.header.needsUpload ? "mdi:send-outline" : "mdi:check-circle-outline"} width="18" height="18" />} {data.header.needsUpload ? "Send both lists" : "Sent"}</Button>}
                  </div>
                </div>
              )}
              <style>{`
                .sp-send { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 14px; padding: 14px 16px; border-radius: 16px; border: 1.5px solid #111827; background: #fff; }
                .sp-send.done { border-color: #d6d9de; background: #f8fafc; }
                .sp-send-ic { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; background: #111827; color: #fff; flex: none; } .sp-send.done .sp-send-ic { background: #e5e7eb; color: #111827; }
                .sp-send-t { flex: 1 1 260px; min-width: 0; } .sp-send-t b { display: block; color: #111827; line-height: 1.25; } .sp-send-t small { display: block; color: #6b7280; line-height: 1.3; margin-top: 4px; }
                .sp-send-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; } .sp-send-chips span { background: #f1f5f9; border-radius: 999px; padding: 2px 10px; font-size: .78rem; font-weight: 600; color: #334155; }
                .sp-send-a { display: flex; gap: 8px; flex-wrap: wrap; }
                @media (max-width: 575px) { .sp-send-a { width: 100%; } .sp-send-a .btn { flex: 1; } }
              `}</style>

    </>
  );
}