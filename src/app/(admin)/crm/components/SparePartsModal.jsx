"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Collapse, Dropdown, Form, FormControl, FormSelect, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddSpareOptionMutation,
  useAddSparePartItemMutation,
  useAddSpareQuoteMutation,
  useCompleteSparePartsMutation,
  useGetSparePartsQuery,
  useRemoveSparePartItemMutation,
  useRemoveSpareQuoteMutation,
  useSearchSpareCatalogQuery,
  useSendSparePartsLinkMutation,
  useSetSparePartsHeaderMutation,
  useUpdateSparePartItemMutation,
} from "@/store/features/apiSlice";
import SparePartsCatalogModal from "./SparePartsCatalogModal";

// Spare Part Review & Order (all departments that use it)
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const letter = (n) => String.fromCharCode(97 + (n % 26));
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STOCK_BADGE = { IN_STOCK: ["success", "In stock"], OUT_OF_STOCK: ["danger", "Out of stock"], UNKNOWN: ["secondary", "Not checked"] };
const QUOTE_BADGE = { REQUESTED: ["secondary", "Requested"], SENT: ["info", "Sent to Logistic & Stock"], QUOTED: ["success", "Quoted"] };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// "Search required spare parts ....... (Genuine)"  -> results of one quality
function QualitySearch({ quality, onAdd, disabled }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const { data = [], isFetching } = useSearchSpareCatalogQuery({ q: dq, quality }, { skip: dq.length < 2 });
  return (
    <div className="mb-2">
      <div className="d-flex align-items-center gap-2">
        <FormControl size="sm" autoComplete="off" disabled={disabled} placeholder={`Search required spare parts (${quality})`} value={q} onChange={(e) => setQ(e.target.value)} />
        <Badge bg="light" text="dark" className="border">{quality}</Badge>
        {isFetching && <Spinner size="sm" />}
      </div>
      {dq.length >= 2 && !isFetching && (
        <div className="border rounded mt-1 bg-white" style={{ maxHeight: 190, overflowY: "auto" }}>
          {data.length === 0 && <div className="small text-muted p-2">No {quality.toLowerCase()} spare part found. Add it manually below, or ask the Logistic &amp; Stock department.</div>}
          {data.map((p) => (
            <div key={p.id} className="d-flex align-items-center gap-2 px-2 py-1 border-bottom">
              <div className="flex-grow-1">
                <div>{p.name} {p.brand && <span className="text-muted small">· {p.brand}</span>} {p.partNo && <span className="text-muted small">· {p.partNo}</span>}</div>
                <div className="small"><strong>{money(p.price)}</strong> <Badge bg={p.stockQty > 0 ? "success" : "danger"}>{p.stockQty > 0 ? `${p.stockQty} in stock` : "Out of stock"}</Badge></div>
              </div>
              <Button size="sm" variant="outline-primary" disabled={disabled} onClick={() => { onAdd(p); setQ(""); }}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Card = ({ title, hint, right, children }) => (
  <div className="bg-white border rounded-3 p-2 px-3 mb-2">
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
      <div><div className="fw-bold">{title}</div>{hint && <div className="small text-muted">{hint}</div>}</div>
      {right}
    </div>
    {children}
  </div>
);

export default function SparePartsModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch, isFetching } = useGetSparePartsQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [addItem, { isLoading: adding }] = useAddSparePartItemMutation();
  const [updateItem] = useUpdateSparePartItemMutation();
  const [removeItem] = useRemoveSparePartItemMutation();
  const [addQuote, { isLoading: quoting }] = useAddSpareQuoteMutation();
  const [removeQuote] = useRemoveSpareQuoteMutation();
  const [sendLink, { isLoading: linking }] = useSendSparePartsLinkMutation();
  const [setHeader] = useSetSparePartsHeaderMutation();
  const [complete, { isLoading: completing }] = useCompleteSparePartsMutation();
  const [addOption] = useAddSpareOptionMutation();

  const [manual, setManual] = useState({ name: "", brand: "", quality: "", qty: "1", unitPrice: "" });
  const [quote, setQuote] = useState({ description: "", photoUrl: "", photoName: "" });
  const [uploading, setUploading] = useState(false);
  const [showPrev, setShowPrev] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState({ parts: true, labour: true, quotes: true, total: true });
  const photoRef = useRef(null);

  const fail = (ex, fb) => Swal.fire({ title: "Failed", text: ex?.data?.message || ex?.message || fb, icon: "error" });
  const job = data?.job;
  const readOnly = data && !data.canRecord;
  const done = Boolean(data?.header?.completedAt);
  const qualities = data?.options?.qualities || [];
  const brands = data?.options?.brands || [];
  useEffect(() => { if (data && !manual.quality && qualities.length) setManual((m) => ({ ...m, quality: qualities[0] })); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFromCatalog = async (p) => { try { await addItem({ jobId, partId: p.id, qty: 1 }).unwrap(); } catch (ex) { fail(ex, "Could not add the spare part."); } };
  const addManual = async () => {
    setError("");
    if (!manual.name.trim()) return setError("Enter the spare part name.");
    try { await addItem({ jobId, ...manual, qty: Number(manual.qty || 1), unitPrice: Number(manual.unitPrice || 0) }).unwrap(); setManual({ ...manual, name: "", unitPrice: "", qty: "1" }); } catch (ex) { fail(ex, "Could not add the spare part."); }
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

  // "Upload to ERP System" + link to the Logistic and Stock department
  const send = async () => {
    try {
      const r = await sendLink(jobId).unwrap();
      const url = `${window.location.origin}${r.path}`;
      try { await navigator.clipboard.writeText(url); } catch (_) { /* clipboard may be blocked */ }
      await Swal.fire({
        title: "Sent to Logistic & Stock",
        html: `<div style="word-break:break-all;font-size:.9rem">${esc(url)}</div><div class="text-muted mt-2" style="font-size:.8rem">The link is copied. ${r.sms?.sent ? "It was also sent by SMS." : r.sms ? `SMS not sent: ${esc(r.sms.error)}` : "Share it with the Logistic &amp; Stock department."}</div>`,
        icon: "success",
      });
    } catch (ex) { fail(ex, "Could not create the link."); }
  };

  const finish = async () => {
    setError("");
    const ok = await Swal.fire({ title: "Complete the spare part review?", text: `${job.jobNo} moves to the next stage. The list can no longer be changed here.`, icon: "question", showCancelButton: true, confirmButtonText: "Complete" });
    if (!ok.isConfirmed) return;
    try {
      const r = await complete(jobId).unwrap();
      await Swal.fire({ title: "Done!", icon: "success", timer: 1200, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { setError(ex?.data?.message || "Could not complete the stage."); }
  };

  // Download the quotation: pick the sections, then print / "Save as PDF"
  const download = () => {
    const items = data.items, prev = data.previous;
    const rows = items.map((i, n) => `<tr><td>${letter(n)}.</td><td>${esc(i.name)}</td><td>${esc(i.brand || "-")}</td><td>${esc(i.quality || "-")}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${money(i.unitPrice)}</td><td style="text-align:right">${money(i.qty * i.unitPrice)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Quotation ${esc(job.jobNo)}</title>
<style>body{font-family:Arial,sans-serif;margin:28px;color:#111}h1{font-size:20px;margin:0}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #bbb;padding:5px 7px;text-align:left}th{background:#f1f1f1}.m{color:#555;font-size:13px}</style></head><body>
<h1>AUTO PRO MAX · Spare Parts Quotation</h1><div class="m">${esc(job.jobNo)} · ${esc(job.regNo)} · ${esc(job.customerName)} · ${esc(job.departmentName)} · ${new Date().toLocaleDateString()}</div>
${sections.parts ? `<h2>Spare Parts Requirement List</h2><table><tr><th></th><th>Spare part</th><th>Brand</th><th>Quality</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>${rows || '<tr><td colspan="7">No spare parts</td></tr>'}</table>` : ""}
${sections.labour ? `<h2>Root Cause / Labour Work List</h2>${prev.rootCauses.length ? `<div class="m">Root causes: ${prev.rootCauses.map(esc).join("; ")}</div>` : ""}<table><tr><th>Labour work</th><th>Amount</th></tr>${prev.labourList.map((l) => `<tr><td>${esc(l.description)}</td><td style="text-align:right">${money(l.amount)}</td></tr>`).join("") || '<tr><td colspan="2">-</td></tr>'}</table>` : ""}
${sections.quotes ? `<h2>Third-party Quotations</h2><table><tr><th>Item</th><th>Status</th><th>Quoted price</th></tr>${data.quotes.map((q) => `<tr><td>${esc(q.description)}</td><td>${esc(QUOTE_BADGE[q.status]?.[1])}</td><td style="text-align:right">${q.quotedPrice != null ? money(q.quotedPrice) : "-"}</td></tr>`).join("") || '<tr><td colspan="3">-</td></tr>'}</table>` : ""}
${sections.total ? `<h2>Total Spare Parts Value: ${money(data.totalSparePartsValue)}</h2>` : ""}
<script>window.onload=function(){window.print()}<\/script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups to download the quotation.", icon: "info" });
    w.document.open(); w.document.write(html); w.document.close();
  };

  const prev = data?.previous;
  return (
    <>
      <Modal show onHide={onHide} size="xl" centered scrollable fullscreen="lg-down" backdrop="static" enforceFocus={false}>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">
            Spare Part Review &amp; Order{job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department / Open window`}</span>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#f8fafc" }}>
          {isLoading && <div className="text-center py-5"><Spinner /></div>}
          {isError && <Alert variant="danger" className="d-flex justify-content-between"><span>{loadError?.data?.message || "Could not load the spare parts."}</span><Button size="sm" variant="outline-danger" onClick={refetch}>Try again</Button></Alert>}
          {data && (
            <>
              <div className="d-flex flex-wrap gap-3 mb-2 small"><strong>{job.jobNo}</strong><span>{job.regNo}</span><span className="text-muted">{job.customerName}</span>{done && <Badge bg="success">Completed</Badge>}</div>
              {readOnly && <Alert variant="secondary" className="py-2">{done ? "This stage is completed. The list is read-only." : "You can only view this stage now."}</Alert>}

              {/* Root cause / labour work list from the previous stage */}
              <Card title="Root Cause / Labour Work List" hint="Shown from the previous related stage"
                right={<Button size="sm" variant="outline-secondary" onClick={() => setShowPrev(!showPrev)}>{showPrev ? "Hide" : "Show"}</Button>}>
                <Collapse in={showPrev}>
                  <div>
                    {prev.rootCauses.length === 0 && prev.labourList.length === 0 && !prev.complaint && prev.concerns.length === 0 && <div className="small text-muted">Nothing recorded in the previous stage.</div>}
                    {prev.complaint && <div className="mb-1"><span className="text-muted small">Complaint: </span>{prev.complaint}</div>}
                    {prev.concerns.length > 0 && <div className="mb-1 small">{prev.concerns.map((c, n) => <Badge key={n} bg="light" text="dark" className="border me-1">{c.name}</Badge>)}</div>}
                    {prev.rootCauses.length > 0 && <div className="mb-1"><div className="fw-semibold small">Root causes</div>{prev.rootCauses.map((r, n) => <div key={n}><span className="text-muted me-2">{letter(n)}.</span>{r}</div>)}</div>}
                    {prev.labourList.length > 0 && (
                      <Table size="sm" className="mb-0"><thead><tr><th>Labour work</th><th>Type</th><th className="text-end">Amount</th></tr></thead>
                        <tbody>{prev.labourList.map((l, n) => <tr key={n}><td>{l.description}</td><td className="small text-muted">{l.repairType || "-"}</td><td className="text-end">{money(l.amount)}</td></tr>)}</tbody></Table>
                    )}
                  </div>
                </Collapse>
              </Card>

              {/* Search by quality */}
              <Card title="Spare Parts Selection" hint="Search the spare parts master by quality. Price and stock come from the Logistic & Stock department."
                right={<div className="d-flex gap-2"><Button size="sm" variant="outline-secondary" onClick={() => setCatalogOpen(true)}><Icon icon="mdi:database-edit-outline" width="16" height="16" /> Catalog</Button><Button size="sm" variant="outline-secondary" onClick={() => newOption("QUALITY")}><Icon icon="mdi:plus" width="16" height="16" /> Quality</Button></div>}>
                {qualities.map((ql) => <QualitySearch key={ql} quality={ql} onAdd={addFromCatalog} disabled={readOnly || adding} />)}
              </Card>

              {/* Requirement list */}
              <Card title="Spare Parts Requirement" hint="If the stock is not available, update the price manually."
                right={<div className="fw-bold">{money(data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0))}</div>}>
                <Table size="sm" responsive className="align-middle mb-2">
                  <thead><tr><th /><th>Spare part</th><th style={{ width: 130 }}>Brand</th><th>Quality</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 130 }}>Price (Rs.)</th><th className="text-end">Total</th><th /></tr></thead>
                  <tbody>
                    {data.items.length === 0 && <tr><td colSpan={8} className="small text-muted">No spare parts yet.</td></tr>}
                    {data.items.map((i, n) => {
                      const [sv, st] = STOCK_BADGE[i.stockStatus];
                      return (
                        <tr key={`${i.id}-${i.unitPrice}-${i.qty}-${i.brand}`} className={i.stockStatus === "OUT_OF_STOCK" ? "table-warning" : ""}>
                          <td className="text-muted">{letter(n)}.</td>
                          <td>{i.name}<div><Badge bg={sv}>{st}</Badge> {i.priceSource === "MANUAL" && <Badge bg="warning" text="dark">Manual price</Badge>} {i.priceSource === "LOGISTICS" && <Badge bg="info">Updated by Logistic &amp; Stock</Badge>}</div>{i.stockStatus === "OUT_OF_STOCK" && <div className="small text-danger">Stock not available · update the price manually</div>}</td>
                          <td><FormSelect size="sm" disabled={readOnly} defaultValue={i.brand || ""} onChange={(e) => patch(i, { brand: e.target.value })}><option value="">-</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect></td>
                          <td className="small">{i.quality || "-"}</td>
                          <td><FormControl size="sm" type="number" min="1" disabled={readOnly} defaultValue={i.qty} onBlur={(e) => Number(e.target.value) !== i.qty && patch(i, { qty: Number(e.target.value) })} /></td>
                          <td><FormControl size="sm" type="number" min="0" step="0.01" disabled={readOnly} defaultValue={i.unitPrice} onBlur={(e) => Number(e.target.value) !== i.unitPrice && patch(i, { unitPrice: Number(e.target.value) })} /></td>
                          <td className="text-end">{money(i.qty * i.unitPrice)}</td>
                          <td>{!readOnly && <Button size="sm" variant="outline-danger" onClick={() => remove(i)}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                {!readOnly && (
                  <div className="border rounded p-2 bg-light">
                    <div className="small fw-semibold mb-1">Add / update manually</div>
                    <div className="row g-2">
                      <div className="col-12 col-md-4"><FormControl size="sm" autoComplete="off" placeholder="Spare part name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} /></div>
                      <div className="col-6 col-md-2 d-flex gap-1"><FormSelect size="sm" value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })}><option value="">Brand</option>{brands.map((b) => <option key={b}>{b}</option>)}</FormSelect><Button size="sm" variant="outline-secondary" title="Add a brand" onClick={() => newOption("BRAND")}>+</Button></div>
                      <div className="col-6 col-md-2"><FormSelect size="sm" value={manual.quality} onChange={(e) => setManual({ ...manual, quality: e.target.value })}>{qualities.map((b) => <option key={b}>{b}</option>)}</FormSelect></div>
                      <div className="col-3 col-md-1"><FormControl size="sm" type="number" min="1" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} /></div>
                      <div className="col-5 col-md-2"><FormControl size="sm" type="number" min="0" step="0.01" placeholder="Price" value={manual.unitPrice} onChange={(e) => setManual({ ...manual, unitPrice: e.target.value })} /></div>
                      <div className="col-4 col-md-1 d-grid"><Button size="sm" disabled={adding} onClick={addManual}>Add</Button></div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Third-party quotation */}
              <Card title="Request quotation from third parties" hint="Item photo + description. It is uploaded to the ERP and the Logistic & Stock department gets a link to answer with a price.">
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
                    {!readOnly && q.status === "REQUESTED" && <Button size="sm" variant="outline-danger" onClick={() => removeQuote({ jobId, quoteId: q.id })}><Icon icon="mdi:delete-outline" width="16" height="16" /></Button>}
                  </div>
                ))}
              </Card>

              {/* Logistic & Stock */}
              <Card title="Logistic & Stock department" hint={data.header.logisticsUpdatedAt ? `Updated ${new Date(data.header.logisticsUpdatedAt).toLocaleString()} · the list above shows their prices` : data.header.linkSentAt ? `Link sent ${new Date(data.header.linkSentAt).toLocaleString()} · waiting for their update` : "Not sent yet"}
                right={<div className="d-flex gap-2">
                  <Button size="sm" variant="outline-secondary" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
                  {!readOnly && <Button size="sm" variant="primary" disabled={linking || (data.items.length === 0 && data.quotes.length === 0)} onClick={send}><Icon icon="mdi:send-outline" width="16" height="16" /> Upload to ERP &amp; send link</Button>}
                </div>}>
                <Form.Check type="checkbox" id="noparts" label="No spare parts needed for this job" checked={Boolean(data.header.noParts)} disabled={readOnly} onChange={(e) => setHeader({ jobId, noParts: e.target.checked })} />
              </Card>

              {/* Total + download */}
              <Card title={`Total Spare Parts Value  ${money(data.totalSparePartsValue)}`} hint="Spare parts + quoted third-party prices"
                right={
                  <Dropdown align="end" autoClose="outside">
                    <Dropdown.Toggle size="sm" variant="outline-success"><Icon icon="mdi:download-outline" width="16" height="16" /> Download quotation</Dropdown.Toggle>
                    <Dropdown.Menu className="p-2" style={{ minWidth: 260 }}>
                      <div className="small text-muted mb-1">Select the sections</div>
                      {[["parts", "Spare parts requirement list"], ["labour", "Root cause / labour work list"], ["quotes", "Third-party quotations"], ["total", "Total value"]].map(([k, t]) => (
                        <Form.Check key={k} type="checkbox" id={`sec-${k}`} label={t} checked={sections[k]} onChange={(e) => setSections({ ...sections, [k]: e.target.checked })} />
                      ))}
                      <Button size="sm" className="mt-2 w-100" disabled={!Object.values(sections).some(Boolean)} onClick={download}>Download / Print (PDF)</Button>
                    </Dropdown.Menu>
                  </Dropdown>
                } />
              {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide}>Close</Button>
          {data && !readOnly && <Button variant="success" disabled={completing} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="18" height="18" />} Complete stage</Button>}
        </Modal.Footer>
      </Modal>
      {catalogOpen && data && <SparePartsCatalogModal brands={brands} qualities={qualities} onHide={() => setCatalogOpen(false)} />}
    </>
  );
}