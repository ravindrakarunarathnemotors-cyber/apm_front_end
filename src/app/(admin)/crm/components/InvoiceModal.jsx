"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { printHtml, savePdf } from "./estimatePdf";
import {
  useAddInvoiceLineMutation, useAddInvoicePaymentMutation, useDeleteInvoiceLineMutation, useGetInvoiceQuery,
  useUpdateInvoiceMutation, useVoidInvoicePaymentMutation,
} from "./invoiceApi";

// Invoice of a job (created when the Customer Approval stage is completed): lines, discount, VAT, payments (all methods).
// Props: jobId, onHide, editable (default false: the Jobs / Department dashboards only SHOW the invoice;
//   discount, VAT, extra lines and payments are handled by the Account department, which opens it with editable)
const money = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const METHOD = { CASH: "Cash", CARD: "Card", BANK_TRANSFER: "Bank transfer", CHEQUE: "Cheque", ONLINE: "Online payment", MOBILE_WALLET: "Mobile wallet", CREDIT: "Credit (on account)" };
const STATUS = { UNPAID: ["Unpaid", "danger"], PARTIAL: ["Partly paid", "warning"], PAID: ["Paid", "success"], CANCELLED: ["Cancelled", "secondary"] };
const today = () => new Date().toISOString().slice(0, 10);

const DOC_CSS = `*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:12px;background:#fff}.page{padding:30px 36px;position:relative}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.brand{display:flex;gap:14px;align-items:center}.brand img{height:62px;width:auto}.brandname{font-size:19px;font-weight:800;letter-spacing:.04em}.brandsub{font-size:11px;color:#555;line-height:1.5;margin-top:2px}
.doc{text-align:right}.doc .t{font-size:26px;font-weight:800;letter-spacing:.06em;color:#111}.doc .n{font-size:13px;font-weight:700;color:#c8102e;margin-top:2px}.doc .d{font-size:11px;color:#555;margin-top:2px}
.bar{height:5px;background:linear-gradient(90deg,#111 0%,#111 60%,#c8102e 60%);margin:14px 0 16px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}.box{border:1px solid #e3e3e6;border-radius:8px;padding:10px 12px}.box h3{margin:0 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#c8102e}.box .v{font-weight:700;font-size:13px}.box .s{color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#111;color:#fff;text-align:left;padding:8px 10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}td{padding:8px 10px;border-bottom:1px solid #ececef;vertical-align:top}.r{text-align:right}.c{text-align:center;width:34px}tbody tr:nth-child(even) td{background:#fafafb}
.bottom{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.left{flex:1;min-width:0}.tot{width:300px;border:1px solid #e3e3e6;border-radius:8px;padding:6px 12px}.tot div{display:flex;justify-content:space-between;padding:5px 0}.tot .g{border-top:2px solid #111;font-size:15px;font-weight:800;margin-top:4px;padding-top:8px}.tot .b{color:#c8102e;font-weight:800}
h2{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 6px;color:#c8102e}.note{color:#444;margin:0 0 10px}
.stamp{position:absolute;right:46px;top:132px;border:3px solid #15803d;color:#15803d;padding:2px 16px;font-size:22px;font-weight:800;letter-spacing:.12em;border-radius:8px;transform:rotate(-8deg);opacity:.75}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:46px}.sign div{border-top:1px solid #777;padding-top:5px;text-align:center;font-size:10.5px;color:#555}
.foot{margin-top:22px;border-top:1px solid #e3e3e6;padding-top:10px;text-align:center;color:#666;font-size:10.5px}`;

export default function InvoiceModal({ jobId, onHide, editable = false }) {
  const { data, isLoading, isError, error: loadError } = useGetInvoiceQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [update, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [addLine, { isLoading: addingLine }] = useAddInvoiceLineMutation();
  const [delLine] = useDeleteInvoiceLineMutation();
  const [addPay, { isLoading: paying }] = useAddInvoicePaymentMutation();
  const [voidPay] = useVoidInvoicePaymentMutation();
  const [busy, setBusy] = useState(false);
  const [discount, setDiscount] = useState("");
  const [taxPct, setTaxPct] = useState("");
  const [line, setLine] = useState({ description: "", qty: "1", unitPrice: "" });
  const [pay, setPay] = useState({ amount: "", method: "CASH", reference: "", note: "", paidAt: today() });

  const inv = data?.invoice;
  const cancelled = inv?.status === "CANCELLED" || !editable;   // view only unless editable
  const fail = (ex, fb) => Swal.fire({ title: "Please check", text: ex?.data?.message || fb, icon: "error", confirmButtonColor: "#111" });

  useEffect(() => { if (inv) { setDiscount(String(inv.discountAmount || "")); setTaxPct(String(inv.taxPercent ?? "")); } }, [inv?.discountAmount, inv?.taxPercent]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inv) setPay((p) => ({ ...p, amount: inv.balance > 0 ? String(inv.balance) : "" })); }, [inv?.balance]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (patch) => { try { await update({ jobId, ...patch }).unwrap(); } catch (ex) { fail(ex, "Could not save."); } };
  const submitLine = async () => {
    try { await addLine({ jobId, description: line.description, qty: Number(line.qty), unitPrice: Number(line.unitPrice) }).unwrap(); setLine({ description: "", qty: "1", unitPrice: "" }); } catch (ex) { fail(ex, "Could not add the line."); }
  };
  const submitPay = async () => {
    try { await addPay({ jobId, ...pay, method: data.methods.includes(pay.method) ? pay.method : data.methods[0], amount: Number(pay.amount) }).unwrap(); setPay((p) => ({ ...p, reference: "", note: "" })); } catch (ex) { fail(ex, "Could not add the payment."); }
  };
  const cancelPay = async (p) => {
    const c = await Swal.fire({ title: "Void this payment?", text: `${METHOD[p.method]} · ${money(p.amount)}`, icon: "warning", showCancelButton: true, confirmButtonText: "Void", confirmButtonColor: "#c8102e" });
    if (!c.isConfirmed) return;
    try { await voidPay({ jobId, paymentId: p.id }).unwrap(); } catch (ex) { fail(ex, "Could not void the payment."); }
  };

  const html = useMemo(() => {
    if (!data) return "";
    const { job, lines, payments } = data;
    const co = inv.company || {};
    const logo = co.logoUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/images/mainlogo.jpeg`;
    const taxInv = inv.taxEnabled;
    const live = payments.filter((p) => !p.voidedAt);
    const live2 = live;
    const addr = [co.address, [co.phone, co.email].filter(Boolean).join("  |  "), co.website, taxInv && inv.vatRegNo ? `VAT Reg. No: ${inv.vatRegNo}` : ""].filter(Boolean);
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoiceNo)}</title><style>${DOC_CSS}</style></head><body><div class="page">
<div class="top"><div class="brand"><img src="${logo}" alt="" onerror="this.style.display='none'"/><div><div class="brandname">${esc(co.name || "KARUNARATHNE AUTO ZONE")}</div>${addr.length ? `<div class="brandsub">${addr.map(esc).join("<br/>")}</div>` : ""}</div></div>
<div class="doc"><div class="t">${taxInv ? "TAX INVOICE" : "INVOICE"}</div><div class="n">${esc(inv.invoiceNo)}</div><div class="d">Date: ${new Date(inv.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</div></div></div>
<div class="bar"></div>
${inv.status === "PAID" ? `<div class="stamp">PAID</div>` : ""}
<div class="parties">
  <div class="box"><h3>Bill to</h3><div class="v">${esc(job.customerName)}</div>${job.contactNumber ? `<div class="s">${esc(job.contactNumber)}</div>` : ""}</div>
  <div class="box"><h3>Vehicle &amp; job</h3><div class="v">${esc(job.regNo)}</div><div class="s">Job ${esc(job.jobNo)}${job.departmentName ? ` &middot; ${esc(job.departmentName)} Department` : ""}</div></div>
</div>
<table><thead><tr><th class="c">#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead><tbody>
${lines.map((l, n) => `<tr><td class="c">${n + 1}</td><td>${esc(l.description)}</td><td class="r">${l.qty}</td><td class="r">${money(l.unitPrice)}</td><td class="r"><b>${money(l.amount)}</b></td></tr>`).join("")}
</tbody></table>
<div class="bottom"><div class="left">
${live2.length ? `<h2>Payments received</h2><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${live2.map((p) => `<tr><td>${esc(p.paidAt)}</td><td>${esc(METHOD[p.method] || p.method)}</td><td>${esc(p.reference || "-")}</td><td class="r">${money(p.amount)}</td></tr>`).join("")}</tbody></table>` : ""}
${inv.notes ? `<h2>Note</h2><p class="note">${esc(inv.notes)}</p>` : ""}
${inv.doc?.bank ? `<h2>Pay by bank transfer</h2><p class="note" style="line-height:1.6">${[inv.doc.bank.name && `<b>${esc(inv.doc.bank.name)}</b>${inv.doc.bank.branch ? ` &middot; ${esc(inv.doc.bank.branch)}` : ""}`, inv.doc.bank.accountName && `Account name: ${esc(inv.doc.bank.accountName)}`, inv.doc.bank.accountNo && `Account no: <b>${esc(inv.doc.bank.accountNo)}</b>`].filter(Boolean).join("<br/>")}</p>` : ""}
</div>
<div class="tot"><div><span>Sub total</span><span>${money(inv.subtotal)}</span></div>
${inv.discountAmount > 0 ? `<div><span>Discount</span><span>- ${money(inv.discountAmount)}</span></div>` : ""}
${taxInv ? `<div><span>VAT ${inv.taxPercent}%</span><span>${money(inv.taxAmount)}</span></div>` : ""}
<div class="g"><span>Total</span><span>${money(inv.total)}</span></div>
<div><span>Paid</span><span>${money(inv.paidAmount)}</span></div><div class="b"><span>Balance due</span><span>${money(inv.balance)}</span></div></div></div>
<div class="sign"><div>Customer signature</div><div>Authorized signature</div></div>
${(inv.doc?.terms || []).length ? `<div style="margin-top:18px;page-break-inside:avoid"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8f0b0b;margin-bottom:6px">Terms &amp; conditions</div><ol style="margin:0;padding-left:18px;font-size:10.5px;line-height:1.55;color:#57534e">${inv.doc.terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}
<div class="foot">${esc(inv.doc?.footerNote || `Thank you for choosing ${co.name || "us"}.`)}</div>
</div></body></html>`;
  }, [data, inv]);

  const download = async () => { setBusy(true); try { await savePdf(html, inv.invoiceNo); } finally { setBusy(false); } };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant={loadError?.status === 404 ? "info" : "danger"}>{loadError?.data?.message || "Could not load the invoice."}</Alert>;
    if (!data) return null;
    const { job, lines, payments } = data;
    const [stLabel, stTone] = STATUS[inv.status] || STATUS.UNPAID;
    // view only (Jobs / Department dashboards): the invoice is shown as the printed document itself
    if (!editable) {
      return (
        <>
          {data.viewedJobId !== data.rootJobId && <Alert variant="info" className="py-2 small">This is the invoice of the main job {job.jobNo}. The transferred jobs use the same invoice.</Alert>}
          <div className="d-flex align-items-center gap-2 mb-2"><Badge bg={stTone} className="fs-6">{stLabel}</Badge><span className="small text-muted">Discount, VAT and payments are handled by the Account department.</span></div>
          <iframe title="Invoice" srcDoc={html} style={{ width: "100%", height: "72vh", border: "1px solid #e3e3e6", borderRadius: 12, background: "#fff" }} />
        </>
      );
    }
    return (
      <>
        <div className="iv-head">
          <div><div className="small text-muted">Invoice</div><b className="fs-5">{inv.invoiceNo}</b></div>
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
          <div className="ms-auto"><Badge bg={stTone} className="fs-6">{stLabel}</Badge></div>
        </div>
        {data.viewedJobId !== data.rootJobId && <Alert variant="info" className="py-2 small">This is the invoice of the main job {job.jobNo}. The transferred jobs use the same invoice.</Alert>}

        <div className="iv-card">
          <div className="iv-title"><Icon icon="mdi:format-list-bulleted" width="20" height="20" /> Items</div>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-2">
              <thead><tr><th>Description</th><th className="text-end">Qty</th><th className="text-end">Unit price</th><th className="text-end">Amount</th><th /></tr></thead>
              <tbody>
                {lines.length === 0 && <tr><td colSpan={5} className="text-muted">No items</td></tr>}
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.description}{l.source === "EXTRA" && <Badge bg="dark" className="ms-2">Extra scope</Badge>}{l.source === "MANUAL" && <Badge bg="secondary" className="ms-2">Added</Badge>}</td>
                    <td className="text-end">{l.qty}</td><td className="text-end">{money(l.unitPrice)}</td><td className="text-end fw-semibold">{money(l.amount)}</td>
                    <td className="text-end">{l.source === "MANUAL" && !cancelled && <Button size="sm" variant="outline-danger" aria-label="Remove" onClick={() => delLine({ jobId, lineId: l.id })}><Icon icon="mdi:close" /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!cancelled && (
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-5"><Form.Control placeholder="Add another item (description)" value={line.description} onChange={(e) => setLine({ ...line, description: e.target.value })} maxLength={300} /></div>
              <div className="col-4 col-md-2"><Form.Control type="number" min="1" placeholder="Qty" value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} /></div>
              <div className="col-5 col-md-3"><Form.Control type="number" min="0" placeholder="Unit price" value={line.unitPrice} onChange={(e) => setLine({ ...line, unitPrice: e.target.value })} /></div>
              <div className="col-3 col-md-2"><Button variant="outline-dark" className="w-100" disabled={addingLine} onClick={submitLine}><Icon icon="mdi:plus" /> Add</Button></div>
            </div>
          )}
        </div>

        <div className="iv-card">
          <div className="iv-title"><Icon icon="mdi:calculator-variant-outline" width="20" height="20" /> Totals</div>
          <div className="iv-tot"><span>Sub total</span><b>{money(inv.subtotal)}</b></div>
          <div className="iv-tot">
            <span>Discount</span>
            {editable ? (
              <Form.Control size="sm" type="number" min="0" disabled={cancelled} style={{ maxWidth: 150 }} className="text-end" value={discount} placeholder="0.00" onChange={(e) => setDiscount(e.target.value)} onBlur={() => Number(discount || 0) !== inv.discountAmount && save({ discountAmount: Number(discount || 0) })} />
            ) : <b>{inv.discountAmount > 0 ? `- ${money(inv.discountAmount)}` : "-"}</b>}
          </div>
          <div className="iv-tot">
            {editable
              ? <Form.Check type="switch" id="iv-tax" disabled={cancelled} label="VAT / tax invoice" checked={inv.taxEnabled} onChange={(e) => save({ taxEnabled: e.target.checked })} />
              : <span>{inv.taxEnabled ? `VAT ${inv.taxPercent}%` : "VAT"}</span>}
            {inv.taxEnabled ? (
              <span className="d-flex align-items-center gap-2">
                {editable && <><Form.Control size="sm" type="number" min="0" max="100" disabled={cancelled} style={{ width: 80 }} className="text-end" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} onBlur={() => Number(taxPct || 0) !== inv.taxPercent && save({ taxPercent: Number(taxPct || 0) })} /> %</>}
                <b>{money(inv.taxAmount)}</b>
              </span>
            ) : <span className="text-muted">-</span>}
          </div>
          <div className="iv-tot iv-grand"><span>Total</span><b>{money(inv.total)}</b></div>
          <div className="iv-tot"><span>Paid</span><b className="text-success">{money(inv.paidAmount)}</b></div>
          <div className="iv-tot"><span>Balance</span><b className={inv.balance > 0 ? "text-danger" : "text-success"}>{money(inv.balance)}</b></div>
          {updating && <div className="small text-muted">Saving...</div>}
        </div>

        <div className="iv-card">
          <div className="iv-title"><Icon icon="mdi:cash-multiple" width="20" height="20" /> Payments</div>
          {payments.length === 0 && <div className="text-muted mb-2">No payments yet.</div>}
          {!editable && <div className="small text-muted mb-2">Discount, VAT and payments are handled by the Account department.</div>}
          {payments.map((p) => (
            <div key={p.id} className={`iv-pay ${p.voidedAt ? "void" : ""}`}>
              <div style={{ flex: 1 }}>
                <b>{METHOD[p.method] || p.method}</b> <span className="text-muted small">· {p.paidAt}{p.reference ? ` · ${p.reference}` : ""}{p.receivedByName ? ` · ${p.receivedByName}` : ""}</span>
                {p.note && <div className="small">{p.note}</div>}
                {p.voidedAt && <Badge bg="secondary">Voided</Badge>}
              </div>
              <b>{money(p.amount)}</b>
              {!p.voidedAt && !cancelled && <Button size="sm" variant="outline-danger" aria-label="Void payment" onClick={() => cancelPay(p)}><Icon icon="mdi:close" /></Button>}
            </div>
          ))}
          {!cancelled && inv.balance > 0 && (
            <div className="row g-2 mt-1">
              <div className="col-6 col-md-3"><Form.Label className="small fw-semibold mb-1">Amount</Form.Label><Form.Control type="number" min="0" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
              <div className="col-6 col-md-3">
                <Form.Label className="small fw-semibold mb-1">Method</Form.Label>
                <Form.Select value={data.methods.includes(pay.method) ? pay.method : data.methods[0]} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{data.methods.map((m) => <option key={m} value={m}>{METHOD[m] || m}</option>)}</Form.Select>
              </div>
              <div className="col-6 col-md-3"><Form.Label className="small fw-semibold mb-1">Date</Form.Label><Form.Control type="date" max={today()} value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} /></div>
              <div className="col-6 col-md-3"><Form.Label className="small fw-semibold mb-1">Reference</Form.Label><Form.Control placeholder={pay.method === "CHEQUE" ? "Cheque no" : pay.method === "CARD" ? "Slip no" : "Ref / slip no"} value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} maxLength={120} /></div>
              <div className="col-12 col-md-9"><Form.Control placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} maxLength={500} /></div>
              <div className="col-12 col-md-3"><Button variant="success" className="w-100" disabled={paying} onClick={submitPay}>{paying ? <Spinner size="sm" /> : <Icon icon="mdi:check" />} Add payment</Button></div>
            </div>
          )}
          {inv.status === "PAID" && <Alert variant="success" className="mt-2 mb-0 py-2 d-flex align-items-center gap-2"><Icon icon="mdi:check-decagram" width="22" height="22" /> The invoice is fully paid.</Alert>}
        </div>

        {(editable || inv.notes) && (
          <div className="iv-card">
            <Form.Label className="small fw-semibold mb-1">Note on the invoice</Form.Label>
            {editable
              ? <Form.Control as="textarea" rows={2} disabled={cancelled} defaultValue={inv.notes} maxLength={1000} onBlur={(e) => e.target.value !== inv.notes && save({ notes: e.target.value })} />
              : <div>{inv.notes}</div>}
          </div>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="xl" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={false} backdropClassName="iv-blur" dialogClassName="iv-modal">
      <style>{`
        .modal-backdrop.iv-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.iv-blur.show { opacity: 1; }
        .iv-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .iv-modal .iv-mhead { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .iv-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .iv-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .iv-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 20px; }
        .iv-head { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .iv-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .iv-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .iv-tot { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px dashed #ececef; }
        .iv-grand { font-size: 1.2rem; border-bottom: 2px solid #111; }
        .iv-pay { display: flex; align-items: center; gap: 10px; padding: 8px 10px; margin-bottom: 6px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; }
        .iv-pay.void { opacity: .55; text-decoration: line-through; }
        @media (max-width: 575.98px) { .iv-modal .modal-body { padding: 12px; } }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="iv-mhead">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:receipt-text-outline" width="30" height="30" />
          <span>{inv?.taxEnabled ? "Tax Invoice" : "Invoice"}{inv && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${inv.invoiceNo}`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data && (
          <>
            <Button variant="outline-secondary" disabled={busy} onClick={download}>{busy ? <Spinner size="sm" /> : <Icon icon="mdi:file-download-outline" />} Download (PDF)</Button>
            <Button variant="outline-secondary" onClick={() => printHtml(html)}><Icon icon="mdi:printer-outline" /> Print</Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}