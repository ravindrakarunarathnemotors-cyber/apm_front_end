"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Col, Form, FormControl, FormSelect, InputGroup, Modal, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetInventoryItemsQuery, useGetInventoryLookupsQuery, useInvGetQuery } from "@/store/features/apiSlice";
import { Empty, Loader, Panel, StatusBadge, SubTabs, money, qtyFmt, today, toast, useDebounced, useSend, when } from "./inventoryUi";

const L = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
const Err = ({ retry, what }) => <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load {what}.</span><Button size="sm" variant="outline-danger" onClick={retry}>Retry</Button></Alert>;

/* ---------- item picker (search the item master) ---------- */
function ItemPicker({ onPick, placeholder = "Search item to add..." }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data } = useGetInventoryItemsQuery({ q: dq, categoryId: "", low: false, all: false }, { skip: dq.trim().length < 2 });
  const items = (data?.items || []).slice(0, 8);
  return (
    <div className="position-relative">
      <FormControl value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoComplete="off" />
      {dq.trim().length >= 2 && items.length > 0 && (
        <div className="list-group position-absolute w-100 shadow-sm mt-1" style={{ zIndex: 5 }}>
          {items.map((x) => (
            <button key={x.id} type="button" className="list-group-item list-group-item-action py-2" onClick={() => { onPick(x); setQ(""); }}>
              <div className="fw-semibold">{x.name}</div><small className="text-muted">{[x.partNo, x.brand, x.quality].filter(Boolean).join(" · ")} · on hand {qtyFmt(x.onHand)} {x.unit}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Suppliers ================= */
const waNumber = (v) => { const d = String(v || "").replace(/\D/g, ""); return d.startsWith("0") ? "94" + d.slice(1) : d; };   // 077... -> 9477...
function SupplierModal({ supplier, onClose }) {
  const [send, busy] = useSend();
  const [f, setF] = useState({ name: supplier?.name || "", contactPerson: supplier?.contactPerson || "", phone: supplier?.phone || "", whatsapp: supplier?.whatsapp || "", email: supplier?.email || "", address: supplier?.address || "", paymentTerms: supplier?.paymentTerms || "", isActive: supplier?.isActive !== false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async () => { if (await send(supplier ? `suppliers/${supplier.id}` : "suppliers", f, supplier ? "PUT" : "POST")) onClose(); };
  const Ic = ({ icon, color }) => <InputGroup.Text className="bg-light"><Icon icon={icon} width="18" height="18" color={color} /></InputGroup.Text>;
  const Section = ({ icon, title }) => <Col xs={12}><div className="d-flex align-items-center gap-2 text-muted fw-semibold small text-uppercase mt-1"><Icon icon={icon} width="16" height="16" />{title}<hr className="flex-grow-1 m-0 ms-2" /></div></Col>;
  return (
    <Modal show onHide={onClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary" style={{ width: 40, height: 40 }}><Icon icon={supplier ? "mdi:truck-cog-outline" : "mdi:truck-plus-outline"} width="22" height="22" /></span>
          <span>{supplier ? "Edit supplier" : "Add supplier"}{supplier && <div className="small text-muted fw-normal">{supplier.name}</div>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3">
          <Section icon="mdi:domain" title="Company" />
          <Form.Group as={Col} md={7}>{L("Supplier name *")}<InputGroup><Ic icon="mdi:storefront-outline" /><FormControl value={f.name} onChange={set("name")} placeholder="ABC Auto Parts (Pvt) Ltd" autoFocus autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} md={5}>{L("Contact person")}<InputGroup><Ic icon="mdi:account-outline" /><FormControl value={f.contactPerson} onChange={set("contactPerson")} placeholder="Name" autoComplete="off" /></InputGroup></Form.Group>

          <Section icon="mdi:phone-outline" title="Contact details" />
          <Form.Group as={Col} md={4}>{L("Phone")}<InputGroup><Ic icon="mdi:phone" color="#0d6efd" /><FormControl type="tel" value={f.phone} onChange={set("phone")} placeholder="011 234 5678" autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} md={4}>{L("WhatsApp number")}<InputGroup><Ic icon="mdi:whatsapp" color="#25D366" /><FormControl type="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="077 123 4567" autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} md={4}>{L("Email")}<InputGroup><Ic icon="mdi:email-outline" color="#dc3545" /><FormControl type="email" value={f.email} onChange={set("email")} placeholder="sales@supplier.lk" autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} xs={12}>{L("Address")}<InputGroup><Ic icon="mdi:map-marker-outline" /><FormControl as="textarea" rows={2} value={f.address} onChange={set("address")} placeholder="Street, city" /></InputGroup></Form.Group>

          <Section icon="mdi:cash-multiple" title="Terms" />
          <Form.Group as={Col} md={6}>{L("Payment terms")}<InputGroup><Ic icon="mdi:calendar-clock-outline" /><FormControl value={f.paymentTerms} onChange={set("paymentTerms")} placeholder="30 days credit" autoComplete="off" /></InputGroup></Form.Group>
          {supplier && <Col md={6} className="d-flex align-items-end"><Form.Check type="switch" id="sup-active" label="Active supplier" checked={f.isActive} onChange={set("isActive")} /></Col>}
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button disabled={busy} onClick={save}><Icon icon="mdi:content-save-outline" width="18" height="18" /> {busy ? "Saving..." : supplier ? "Save changes" : "Save supplier"}</Button>
      </Modal.Footer>
    </Modal>
  );
}
function SuppliersPanel() {
  const { data = [], isLoading, isError, refetch } = useInvGetQuery("suppliers?all=1");
  const [modal, setModal] = useState(null);   // null | {} (new) | supplier
  return (
    <Panel title={<>Suppliers <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:truck-outline" action={<Button size="sm" onClick={() => setModal({})}><Icon icon="mdi:plus" width="18" height="18" /> Add supplier</Button>}>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="suppliers" /> : data.length === 0 ? <Empty text="No suppliers yet. Click Add supplier." icon="mdi:truck-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Supplier</th><th>Contact</th><th>Payment terms</th><th className="text-end">Open POs</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className={!s.isActive ? "opacity-50" : ""}>
                <td><div className="fw-semibold">{s.name}</div><small className="text-muted">{s.address}</small></td>
                <td className="small">{s.contactPerson}<div className="text-muted">{[s.phone, s.email].filter(Boolean).join(" · ")}</div>
                  {s.whatsapp && <a className="text-success text-decoration-none" href={`https://wa.me/${waNumber(s.whatsapp)}`} target="_blank" rel="noreferrer"><Icon icon="mdi:whatsapp" width="16" height="16" /> {s.whatsapp}</a>}</td>
                <td className="small">{s.paymentTerms || "-"}</td>
                <td className="text-end">{s.openPo}</td>
                <td><StatusBadge status={s.isActive ? "In stock" : "Cancelled"} bg={s.isActive ? "success" : "secondary"} /></td>
                <td className="text-end"><Button size="sm" variant="outline-secondary" onClick={() => setModal(s)}><Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {modal && <SupplierModal supplier={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </Panel>
  );
}

/* ---------- print a purchase order (opens a clean A4 document and the print dialog) ---------- */
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const COMPANY_NAME = "AUTO PRO MAX";   // <-- shown at the top of the printed PO; change to your company name / address / phone
function printPurchaseOrder(po) {
  const total = po.lines.reduce((sum, l) => sum + l.qtyOrdered * l.unitCost, 0);
  const qty = po.lines.reduce((sum, l) => sum + l.qtyOrdered, 0);
  const rows = po.lines.map((l, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(l.name)}</b>${l.partNo || l.brand ? `<div class="s">${esc([l.partNo, l.brand].filter(Boolean).join(" | "))}</div>` : ""}</td>
    <td class="r">${qtyFmt(l.qtyOrdered)} ${esc(l.unit)}</td><td class="r">${money(l.unitCost)}</td><td class="r">${money(l.qtyOrdered * l.unitCost)}</td></tr>`).join("");
  const d = (v) => (v ? String(v).slice(0, 10) : "-");
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups for this site to print.", icon: "warning" }); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(po.poNo)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;margin:0}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d6efd;padding-bottom:10px;margin-bottom:14px}
    h1{margin:0;font-size:22px;letter-spacing:1px}.co{font-size:16px;font-weight:700}.muted{color:#666}
    .box{border:1px solid #bbb;border-radius:4px;padding:8px 10px}.grid{display:flex;gap:12px;margin-bottom:14px}.grid>div{flex:1}
    .box h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5;font-size:11px;text-transform:uppercase}
    .c{text-align:center;width:34px}.r{text-align:right}.s{font-size:10.5px;color:#666}tfoot td{font-weight:700;background:#f8f9fa}
    .sum{width:46%;margin-left:auto;margin-top:12px}.sum td{border:1px solid #bbb}.grand td{font-size:14px;background:#e7f1ff}
    .ins{margin-top:14px;min-height:50px}.sign{display:flex;gap:40px;margin-top:60px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:11px}
  </style></head><body>
    <div class="top"><div><div class="co">${esc(COMPANY_NAME)}</div><div class="muted">Purchasing Department</div></div>
      <div style="text-align:right"><h1>PURCHASE ORDER</h1><div><b>${esc(po.poNo)}</b></div><div class="muted">Status: ${esc(po.status)}</div></div></div>
    <div class="grid">
      <div class="box"><h4>Supplier</h4><b>${esc(po.supplier)}</b>${po.supplierContact ? `<div>Attn: ${esc(po.supplierContact)}</div>` : ""}${po.supplierAddress ? `<div>${esc(po.supplierAddress).replace(/\n/g, "<br>")}</div>` : ""}
        ${po.supplierPhone ? `<div>Tel: ${esc(po.supplierPhone)}</div>` : ""}${po.supplierWhatsapp ? `<div>WhatsApp: ${esc(po.supplierWhatsapp)}</div>` : ""}${po.supplierEmail ? `<div>${esc(po.supplierEmail)}</div>` : ""}</div>
      <div class="box"><h4>Order details</h4>
        <div>PO date: <b>${d(po.orderDate || po.createdAt)}</b></div><div>Expected delivery: <b>${d(po.expectedDate)}</b></div>
        <div>Payment terms: <b>${esc(po.paymentTerms || "-")}</b></div><div>Prepared by: <b>${esc(po.createdBy || "-")}</b></div></div>
    </div>
    <table><thead><tr><th class="c">#</th><th>Product</th><th class="r">Quantity</th><th class="r">Unit cost (LKR)</th><th class="r">Total (LKR)</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="sum"><tr><td>Items</td><td class="r">${po.lines.length}</td></tr><tr><td>Total quantity</td><td class="r">${qtyFmt(qty)}</td></tr><tr class="grand"><td><b>Grand total (LKR)</b></td><td class="r"><b>${money(total)}</b></td></tr></table>
    <div class="box ins"><h4>Supplier instructions</h4>${po.note ? esc(po.note).replace(/\n/g, "<br>") : '<span class="muted">-</span>'}</div>
    <div class="sign"><div>Prepared by</div><div>Authorized by</div><div>Supplier acknowledgement</div></div>
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}
// loads one PO and prints it, then calls onDone
function PoPrinter({ id, onDone }) {
  const { data, isError } = useInvGetQuery(`purchase-orders/${id}`);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    if (data) { done.current = true; printPurchaseOrder(data); onDone(); }
    else if (isError) { done.current = true; Swal.fire({ title: "Failed", text: "Could not load the purchase order.", icon: "error" }); onDone(); }
  }, [data, isError, onDone]);
  return null;
}

/* ================= Purchase orders ================= */
function PoModal({ onClose, preset }) {
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState(preset || []);          // { partId, name, unit, qty, unitCost }
  const addItem = (x) => { if (!supplierId && x.supplierId) setSupplierId(String(x.supplierId)); setLines((p) => (p.some((l) => l.partId === x.id) ? p : [...p, { partId: x.id, name: x.name, partNo: x.partNo, brand: x.brand, unit: x.unit, qty: x.reorderQty || 1, unitCost: x.avgCost || x.costPrice || "" }])); };
  const upd = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);
  const save = async (status, print = false) => {
    const r = await send("purchase-orders", { supplierId, expectedDate, note, status, lines: lines.map((l) => ({ partId: l.partId, qty: l.qty, unitCost: l.unitCost })) });
    if (r) { toast(`${r.poNo} created`); onClose(print ? r.id : null); }
  };
  const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const sup = (lookups?.suppliers || []).find((x) => String(x.id) === String(supplierId));
  const SectionHead = ({ icon, title, right }) => (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom">
      <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon={icon} width="18" height="18" className="text-primary" />{title}</div>{right}
    </div>
  );
  return (
    <Modal show onHide={() => onClose(null)} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary" style={{ width: 40, height: 40 }}><Icon icon="mdi:file-document-plus-outline" width="22" height="22" /></span>
          Create Purchase Order
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. order details */}
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <SectionHead icon="mdi:information-outline" title="Order details" />
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr>
                <th className="bg-light text-muted fw-semibold small" style={{ width: 150 }}>Supplier *</th>
                <td><FormSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier</option>{(lookups?.suppliers || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></td>
                <th className="bg-light text-muted fw-semibold small" style={{ width: 150 }}>Expected date</th>
                <td><FormControl type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></td>
              </tr>
              <tr>
                <th className="bg-light text-muted fw-semibold small">Order date</th>
                <td className="text-muted">{today()} <span className="small">(set when sent)</span></td>
                <th className="bg-light text-muted fw-semibold small">Status</th>
                <td><StatusBadge status={sup ? "Draft" : "Draft"} bg="secondary" /> <span className="small text-muted ms-1">{sup ? sup.name : "No supplier selected"}</span></td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* 2. products */}
        <div className="border rounded bg-white mb-3 overflow-visible">
          <SectionHead icon="mdi:package-variant-closed" title="Products" right={<Badge bg="secondary" pill>{lines.length}</Badge>} />
          <div className="p-3 border-bottom"><ItemPicker onPick={addItem} placeholder="Search products to add..." /></div>
          {lines.length === 0 ? <div className="p-3"><Empty text="Search and add the products you want to order" icon="mdi:cart-plus" /></div> : (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th className="text-center" style={{ width: 50 }}>#</th><th>Product</th><th style={{ width: 150 }}>Unit Cost (LKR)</th><th style={{ width: 140 }}>Request Quantity</th><th style={{ width: 180 }}>Quantity</th><th className="text-end" style={{ width: 140 }}>Total (LKR)</th><th className="text-center" style={{ width: 70 }}>Action</th></tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.partId}>
                    <td className="text-center text-muted">{i + 1}</td>
                    <td><div className="fw-semibold">{l.name}</div><small className="text-muted">{[l.partNo, l.brand, l.unit].filter(Boolean).join(" | ")}</small></td>
                    <td><FormControl size="sm" type="number" min="0" step="any" value={l.unitCost} onChange={(e) => upd(i, "unitCost", e.target.value)} /></td>
                    <td><FormControl size="sm" type="number" min="0" step="any" value={l.qty} onChange={(e) => upd(i, "qty", e.target.value)} /></td>
                    <td className="small"><span className="fw-semibold">{qtyFmt(Number(l.qty) || 0)} {l.unit}</span><div className="text-muted">{qtyFmt(Number(l.qty) || 0)} {l.unit} &times; {money(Number(l.unitCost) || 0)}</div></td>
                    <td className="text-end fw-semibold">{money((Number(l.qty) || 0) * (Number(l.unitCost) || 0))}</td>
                    <td className="text-center"><Button size="sm" variant="outline-danger" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} title="Remove"><Icon icon="mdi:trash-can-outline" width="16" height="16" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr><td colSpan={3} className="text-end fw-semibold">Totals</td><td className="fw-semibold">{qtyFmt(totalQty)}</td><td /><td className="text-end fw-bold">{money(total)}</td><td /></tr>
              </tfoot>
            </Table>
          )}
        </div>

        {/* 3. instructions + summary */}
        <Row className="g-3">
          <Col lg={7}>
            <div className="border rounded bg-white h-100 overflow-hidden">
              <SectionHead icon="mdi:text-box-outline" title="Supplier Instructions" right={<small className="text-muted">{note.length}/300</small>} />
              <div className="p-3"><FormControl as="textarea" rows={4} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery time, packing, payment terms, anything the supplier should know..." /></div>
            </div>
          </Col>
          <Col lg={5}>
            <div className="border rounded bg-white h-100 overflow-hidden">
              <SectionHead icon="mdi:calculator-variant-outline" title="Summary" />
              <Table className="mb-0 align-middle">
                <tbody>
                  <tr><td className="text-muted">Items</td><td className="text-end fw-semibold">{lines.length}</td></tr>
                  <tr><td className="text-muted">Total Quantity</td><td className="text-end fw-semibold">{qtyFmt(totalQty)}</td></tr>
                  <tr className="table-success"><td className="fw-bold">Grand Total (LKR)</td><td className="text-end fw-bold fs-5">{money(total)}</td></tr>
                </tbody>
              </Table>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose(null)}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button variant="outline-secondary" disabled={busy || lines.length === 0 || !supplierId} onClick={() => save("DRAFT", true)}><Icon icon="mdi:printer-outline" width="18" height="18" /> Save &amp; print</Button>
        <Button variant="outline-primary" disabled={busy || lines.length === 0 || !supplierId} onClick={() => save("DRAFT")}><Icon icon="mdi:content-save-outline" width="18" height="18" /> Save as draft</Button>
        <Button disabled={busy || lines.length === 0 || !supplierId} onClick={() => save("ORDERED")}><Icon icon="mdi:send-outline" width="18" height="18" /> Save &amp; send to supplier</Button>
      </Modal.Footer>
    </Modal>
  );
}
// Receive goods against a PO  ->  GRN + supplier invoice
function ReceiveModal({ poId, onClose }) {
  const { data: po } = useInvGetQuery(`purchase-orders/${poId}`);
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [locationId, setLocationId] = useState("");
  const [inv, setInv] = useState({ invoiceNo: "", invoiceDate: today(), invoiceAmount: "", note: "" });
  const [rows, setRows] = useState({});            // poLineId -> { qty, unitCost, batchNo, expiryDate }
  if (!po || !lookups) return <Modal show centered onHide={onClose}><Modal.Body><Loader /></Modal.Body></Modal>;
  const row = (l) => rows[l.id] || { qty: "", unitCost: l.unitCost, batchNo: "", expiryDate: "" };
  const upd = (l, k, v) => setRows({ ...rows, [l.id]: { ...row(l), [k]: v } });
  const value = po.lines.reduce((s, l) => s + (Number(row(l).qty) || 0) * (Number(row(l).unitCost) || 0), 0);
  const save = async () => {
    const lines = po.lines.map((l) => ({ poLineId: l.id, ...row(l) })).filter((l) => Number(l.qty) > 0);
    const r = await send(`purchase-orders/${poId}/receive`, { locationId: locationId || lookups.locations[0]?.id, ...inv, lines });
    if (r) { toast(r.message); onClose(); }
  };
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton><Modal.Title className="fs-5">Receive goods · {po.poNo}<div className="small text-muted fw-normal">{po.supplier}</div></Modal.Title></Modal.Header>
      <Modal.Body>
        <Row className="g-3 mb-3">
          <Form.Group as={Col} md={3}>{L("Receiving location")}<FormSelect value={locationId} onChange={(e) => setLocationId(e.target.value)}>{lookups.locations.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} md={3}>{L("Supplier invoice no")}<FormControl value={inv.invoiceNo} onChange={(e) => setInv({ ...inv, invoiceNo: e.target.value })} autoComplete="off" /></Form.Group>
          <Form.Group as={Col} md={3}>{L("Invoice date")}<FormControl type="date" value={inv.invoiceDate} onChange={(e) => setInv({ ...inv, invoiceDate: e.target.value })} /></Form.Group>
          <Form.Group as={Col} md={3}>{L("Invoice amount (LKR)")}<FormControl type="number" min="0" value={inv.invoiceAmount} onChange={(e) => setInv({ ...inv, invoiceAmount: e.target.value })} /></Form.Group>
        </Row>
        <Table responsive size="sm" className="align-middle">
          <thead className="table-light"><tr><th>Item</th><th className="text-end">Ordered</th><th className="text-end">Received</th><th style={{ width: 110 }}>Receive now</th><th style={{ width: 120 }}>Unit cost</th><th style={{ width: 150 }}>Batch no</th><th style={{ width: 150 }}>Expiry</th></tr></thead>
          <tbody>
            {po.lines.map((l) => {
              const left = l.qtyOrdered - l.qtyReceived;
              return (
                <tr key={l.id} className={left <= 0 ? "opacity-50" : ""}>
                  <td className="fw-semibold">{l.name} <small className="text-muted fw-normal">{l.unit}</small></td>
                  <td className="text-end">{qtyFmt(l.qtyOrdered)}</td>
                  <td className="text-end">{qtyFmt(l.qtyReceived)}</td>
                  <td><FormControl size="sm" type="number" min="0" step="any" disabled={left <= 0} placeholder={String(left)} value={row(l).qty} onChange={(e) => upd(l, "qty", e.target.value)} /></td>
                  <td><FormControl size="sm" type="number" min="0" disabled={left <= 0} value={row(l).unitCost} onChange={(e) => upd(l, "unitCost", e.target.value)} /></td>
                  <td>{l.trackBatch ? <FormControl size="sm" value={row(l).batchNo} onChange={(e) => upd(l, "batchNo", e.target.value)} /> : <small className="text-muted">-</small>}</td>
                  <td>{l.trackBatch ? <FormControl size="sm" type="date" value={row(l).expiryDate} onChange={(e) => upd(l, "expiryDate", e.target.value)} /> : <small className="text-muted">-</small>}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        <div className="text-end small">Goods value: <strong>LKR {money(value)}</strong>{Number(inv.invoiceAmount) > 0 && Math.abs(Number(inv.invoiceAmount) - value) > 0.5 && <span className="text-warning ms-2">Invoice amount differs by LKR {money(Math.abs(Number(inv.invoiceAmount) - value))}</span>}</div>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={save}>{busy ? "Saving..." : "Receive goods (GRN)"}</Button></Modal.Footer>
    </Modal>
  );
}
const PO_STATUSES = [["DRAFT", "Draft"], ["ORDERED", "Sent to supplier"], ["PARTIAL", "Partly received"], ["RECEIVED", "Received"], ["CANCELLED", "Cancelled"]];
const dmy = (v) => { if (!v) return "-"; const [y, m, d] = String(v).slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
function PurchaseOrdersPanel() {
  const { data: all = [], isLoading, isError, refetch } = useInvGetQuery("purchase-orders?status=all");
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [f, setF] = useState({ q: "", supplierId: "", status: "", from: "", to: "" });
  const [send] = useSend();
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState(null);
  const [printId, setPrintId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const { data: detail } = useInvGetQuery(`purchase-orders/${openId}`, { skip: !openId });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const q = f.q.trim().toLowerCase().replace(/^#/, "");
  const data = all.filter((po) => {
    if (q && !(String(po.poNo).toLowerCase().includes(q) || String(po.id) === q || String(po.supplier).toLowerCase().includes(q))) return false;
    if (f.supplierId && String(po.supplierId) !== f.supplierId) return false;
    if (f.status && po.status !== f.status) return false;
    const day = String(po.createdAt || "").slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
  const filtered = Object.values(f).some(Boolean);
  const change = async (po, status) => {
    const ok = await Swal.fire({ title: status === "CANCELLED" ? "Cancel this purchase order?" : "Send to supplier?", text: po.poNo, icon: "question", showCancelButton: true, confirmButtonText: "Yes" });
    if (ok.isConfirmed && (await send(`purchase-orders/${po.id}/status`, { status }, "PUT"))) toast("Updated");
  };
  const Lb = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
  return (
    <Panel
      title={<>Purchase orders <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:file-document-outline"
      action={<Button size="sm" onClick={() => setCreating(true)}><Icon icon="mdi:plus" width="18" height="18" /> New PO</Button>}
    >
      <div className="border rounded p-3 mb-3 bg-light">
        <Row className="g-2 align-items-end">
          <Form.Group as={Col} xs={12} md={4} lg={3}>{Lb("Search PO")}<InputGroup><InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="18" height="18" /></InputGroup.Text><FormControl value={f.q} onChange={set("q")} placeholder="PO ID or Supplier" autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Supplier")}<FormSelect value={f.supplierId} onChange={set("supplierId")}><option value="">All Suppliers</option>{(lookups?.suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Status")}<FormSelect value={f.status} onChange={set("status")}><option value="">All Status</option>{PO_STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date From")}<FormControl type="date" value={f.from} max={f.to || undefined} onChange={set("from")} /></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date To")}<FormControl type="date" value={f.to} min={f.from || undefined} onChange={set("to")} /></Form.Group>
          <Col xs={12} md={4} lg={1} className="d-grid"><Button variant="outline-secondary" disabled={!filtered} onClick={() => setF({ q: "", supplierId: "", status: "", from: "", to: "" })} title="Clear filters"><Icon icon="mdi:filter-off-outline" width="18" height="18" /></Button></Col>
        </Row>
      </div>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="purchase orders" /> : data.length === 0 ? <Empty text={filtered ? "No purchase orders match the filters" : "No purchase orders yet. Click New PO."} icon="mdi:file-document-outline" /> : (
        <Table responsive bordered hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>PO ID</th><th>Supplier</th><th>Created At</th><th className="text-end">Total Qty</th><th>Generated User</th><th>Status</th><th className="text-end">Total Amount (LKR)</th><th className="text-center">Actions</th></tr></thead>
          <tbody>
            {data.map((po) => (
              <Fragment key={po.id}>
                <tr>
                  <td className="fw-semibold">{po.poNo}</td>
                  <td>{po.supplier}</td>
                  <td className="small">{dmy(po.createdAt)}</td>
                  <td className="text-end">{qtyFmt(po.ordered)}{po.received > 0 && <div className="small text-muted">recv {qtyFmt(po.received)}</div>}</td>
                  <td className="small">{po.createdById ? `#${po.createdById}${po.createdBy ? ` - ${po.createdBy}` : ""}` : "-"}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td className="text-end fw-semibold">{money(po.total)}</td>
                  <td className="text-center text-nowrap">
                    <div className="d-inline-flex gap-1">
                      <Button size="sm" variant="outline-secondary" onClick={() => setOpenId(openId === po.id ? null : po.id)} title="View items"><Icon icon={openId === po.id ? "mdi:eye-off-outline" : "mdi:eye-outline"} width="16" height="16" /></Button>
                      <Button size="sm" variant="outline-dark" onClick={() => setPrintId(po.id)} title="Print purchase order"><Icon icon="mdi:printer-outline" width="16" height="16" /></Button>
                      {po.status === "DRAFT" && <Button size="sm" variant="outline-primary" onClick={() => change(po, "ORDERED")} title="Send to supplier"><Icon icon="mdi:send-outline" width="16" height="16" /></Button>}
                      {["ORDERED", "PARTIAL"].includes(po.status) && <Button size="sm" variant="primary" onClick={() => setReceiving(po.id)} title="Receive goods"><Icon icon="mdi:package-down" width="16" height="16" /> Receive</Button>}
                      {["DRAFT", "ORDERED"].includes(po.status) && po.received === 0 && <Button size="sm" variant="outline-danger" onClick={() => change(po, "CANCELLED")} title="Cancel PO"><Icon icon="mdi:close-circle-outline" width="16" height="16" /></Button>}
                    </div>
                  </td>
                </tr>
                {openId === po.id && (
                  <tr><td colSpan={8} className="bg-light">
                    {!detail ? <Loader /> : (
                      <>
                        <Table size="sm" bordered className="mb-2 align-middle bg-white"><thead className="table-light"><tr><th>Item</th><th className="text-end">Ordered</th><th className="text-end">Received</th><th className="text-end">Unit cost</th></tr></thead>
                          <tbody>{detail.lines.map((l) => <tr key={l.id}><td>{l.name}</td><td className="text-end">{qtyFmt(l.qtyOrdered)} {l.unit}</td><td className="text-end">{qtyFmt(l.qtyReceived)}</td><td className="text-end">{money(l.unitCost)}</td></tr>)}</tbody></Table>
                        {detail.grns.length > 0 && <div className="small text-muted">Receipts: {detail.grns.map((g) => `${g.grnNo}${g.invoiceNo ? ` (inv ${g.invoiceNo})` : ""}`).join(", ")}</div>}
                      </>
                    )}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
      )}
      {creating && <PoModal onClose={(id) => { setCreating(false); if (id) setPrintId(id); }} />}
      {printId && <PoPrinter key={printId} id={printId} onDone={() => setPrintId(null)} />}
      {receiving && <ReceiveModal poId={receiving} onClose={() => setReceiving(null)} />}
    </Panel>
  );
}

/* ================= Goods received (GRN) + supplier invoice ================= */
function DirectGrnModal({ onClose }) {
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [note, setNote] = useState("");
  const [inv, setInv] = useState({ invoiceNo: "", invoiceDate: today(), invoiceAmount: "" });
  const [lines, setLines] = useState([]);
  const add = (x) => setLines((p) => (p.some((l) => l.partId === x.id) ? p : [...p, { partId: x.id, name: x.name, partNo: x.partNo, brand: x.brand, unit: x.unit, trackBatch: x.trackBatch, qty: "", unitCost: x.avgCost || x.costPrice || "", batchNo: "", expiryDate: "" }]));
  const upd = (i, k, v) => setLines((p) => p.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const amount = (l) => (Number(l.qty) || 0) * (Number(l.unitCost) || 0);
  const total = lines.reduce((sum, l) => sum + amount(l), 0);
  const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const invAmt = inv.invoiceAmount === "" ? null : Number(inv.invoiceAmount);
  const differs = invAmt !== null && Math.abs(invAmt - total) > 0.5;
  const ready = supplierId && lines.length > 0 && lines.every((l) => Number(l.qty) > 0);
  const save = async () => {
    const r = await send("grn", { supplierId, locationId: locationId || lookups?.locations[0]?.id, note, ...inv, lines });
    if (r) { toast(r.message); onClose(); }
  };
  const SectionHead = ({ icon, title, right }) => (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom">
      <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon={icon} width="18" height="18" className="text-primary" />{title}</div>{right}
    </div>
  );
  const th = "bg-light text-muted fw-semibold small";
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success" style={{ width: 40, height: 40 }}><Icon icon="mdi:truck-plus-outline" width="22" height="22" /></span>
          <span>Receive goods without a PO<div className="small text-muted fw-normal">Direct goods received note (GRN)</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. receipt + supplier invoice details */}
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <SectionHead icon="mdi:information-outline" title="Receipt details" />
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr>
                <th className={th} style={{ width: 150 }}>Supplier *</th>
                <td><FormSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier</option>{(lookups?.suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</FormSelect></td>
                <th className={th} style={{ width: 150 }}>Store / location</th>
                <td><FormSelect value={locationId} onChange={(e) => setLocationId(e.target.value)}>{(lookups?.locations || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></td>
              </tr>
              <tr>
                <th className={th}>Invoice no</th>
                <td><InputGroup><InputGroup.Text className="bg-light"><Icon icon="mdi:receipt-text-outline" width="18" height="18" /></InputGroup.Text><FormControl value={inv.invoiceNo} onChange={(e) => setInv({ ...inv, invoiceNo: e.target.value })} placeholder="Supplier invoice / delivery note no" autoComplete="off" /></InputGroup></td>
                <th className={th}>Invoice date</th>
                <td><FormControl type="date" value={inv.invoiceDate} onChange={(e) => setInv({ ...inv, invoiceDate: e.target.value })} /></td>
              </tr>
              <tr>
                <th className={th}>Invoice amount (LKR)</th>
                <td colSpan={3}><FormControl type="number" min="0" value={inv.invoiceAmount} onChange={(e) => setInv({ ...inv, invoiceAmount: e.target.value })} placeholder="Optional - checked against the goods total" style={{ maxWidth: 320 }} /></td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* 2. products */}
        <div className="border rounded bg-white mb-3">
          <SectionHead icon="mdi:package-variant-closed" title="Received products" right={<Badge bg="secondary" pill>{lines.length}</Badge>} />
          <div className="p-3 border-bottom"><ItemPicker onPick={add} placeholder="Search products to add..." /></div>
          {lines.length === 0 ? <div className="p-3"><Empty text="Search and add the products you received" icon="mdi:package-down" /></div> : (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th className="text-center" style={{ width: 50 }}>#</th><th>Product</th><th style={{ width: 140 }}>Quantity Received</th><th style={{ width: 140 }}>Unit Cost (LKR)</th><th style={{ width: 150 }}>Batch no</th><th style={{ width: 160 }}>Expiry</th><th className="text-end" style={{ width: 130 }}>Total (LKR)</th><th className="text-center" style={{ width: 70 }}>Action</th></tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.partId}>
                    <td className="text-center text-muted">{i + 1}</td>
                    <td><div className="fw-semibold">{l.name}</div><small className="text-muted">{[l.partNo, l.brand, l.unit].filter(Boolean).join(" | ")}</small></td>
                    <td><FormControl size="sm" type="number" min="0" step="any" value={l.qty} onChange={(e) => upd(i, "qty", e.target.value)} isInvalid={l.qty !== "" && !(Number(l.qty) > 0)} /></td>
                    <td><FormControl size="sm" type="number" min="0" step="any" value={l.unitCost} onChange={(e) => upd(i, "unitCost", e.target.value)} /></td>
                    <td>{l.trackBatch ? <FormControl size="sm" value={l.batchNo} onChange={(e) => upd(i, "batchNo", e.target.value)} placeholder="Batch" /> : <small className="text-muted">Not tracked</small>}</td>
                    <td>{l.trackBatch ? <FormControl size="sm" type="date" value={l.expiryDate} onChange={(e) => upd(i, "expiryDate", e.target.value)} /> : <small className="text-muted">-</small>}</td>
                    <td className="text-end fw-semibold">{money(amount(l))}</td>
                    <td className="text-center"><Button size="sm" variant="outline-danger" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} title="Remove"><Icon icon="mdi:trash-can-outline" width="16" height="16" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr><td colSpan={2} className="text-end fw-semibold">Totals</td><td className="fw-semibold">{qtyFmt(totalQty)}</td><td colSpan={3} /><td className="text-end fw-bold">{money(total)}</td><td /></tr>
              </tfoot>
            </Table>
          )}
        </div>

        {/* 3. note + summary */}
        <Row className="g-3">
          <Col lg={7}>
            <div className="border rounded bg-white h-100 overflow-hidden">
              <SectionHead icon="mdi:text-box-outline" title="Note" right={<small className="text-muted">{note.length}/300</small>} />
              <div className="p-3"><FormControl as="textarea" rows={4} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Condition of goods, delivery person, vehicle no, anything worth recording..." /></div>
            </div>
          </Col>
          <Col lg={5}>
            <div className="border rounded bg-white h-100 overflow-hidden">
              <SectionHead icon="mdi:calculator-variant-outline" title="Summary" />
              <Table className="mb-0 align-middle">
                <tbody>
                  <tr><td className="text-muted">Items</td><td className="text-end fw-semibold">{lines.length}</td></tr>
                  <tr><td className="text-muted">Total Quantity</td><td className="text-end fw-semibold">{qtyFmt(totalQty)}</td></tr>
                  {invAmt !== null && <tr className={differs ? "table-warning" : ""}><td className="text-muted">Invoice amount{differs && <div className="small text-warning-emphasis">Differs from the goods total</div>}</td><td className="text-end fw-semibold">{money(invAmt)}</td></tr>}
                  <tr className="table-success"><td className="fw-bold">Goods Total (LKR)</td><td className="text-end fw-bold fs-5">{money(total)}</td></tr>
                </tbody>
              </Table>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button variant="success" disabled={busy || !ready} onClick={save}><Icon icon="mdi:check-circle-outline" width="18" height="18" /> {busy ? "Saving..." : "Receive goods (GRN)"}</Button>
      </Modal.Footer>
    </Modal>
  );
}
// A4 print of one goods received note
function printGrn(g) {
  const rows = g.items.map((x, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(x.name)}</b>${x.partNo ? `<div class="s">${esc(x.partNo)}</div>` : ""}</td><td class="r">${qtyFmt(x.qty)} ${esc(x.unit)}</td><td class="r">${money(x.unitCost)}</td><td class="r">${money(x.qty * x.unitCost)}</td><td>${esc(x.batchNo || "-")}</td><td>${x.expiryDate ? esc(String(x.expiryDate).slice(0, 10)) : "-"}</td></tr>`).join("");
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups for this site to print.", icon: "warning" }); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(g.grnNo)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;margin:0}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #198754;padding-bottom:10px;margin-bottom:14px}
    h1{margin:0;font-size:22px;letter-spacing:1px}.co{font-size:16px;font-weight:700}.muted{color:#666}
    .box{border:1px solid #bbb;border-radius:4px;padding:8px 10px}.grid{display:flex;gap:12px;margin-bottom:14px}.grid>div{flex:1}
    .box h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5;font-size:11px;text-transform:uppercase}
    .c{text-align:center;width:34px}.r{text-align:right}.s{font-size:10.5px;color:#666}
    .sum{width:46%;margin-left:auto;margin-top:12px}.grand td{font-size:14px;background:#e8f5ee;font-weight:700}
    .sign{display:flex;gap:40px;margin-top:60px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:11px}
  </style></head><body>
    <div class="top"><div><div class="co">${esc(COMPANY_NAME)}</div><div class="muted">Stores / Goods receiving</div></div>
      <div style="text-align:right"><h1>GOODS RECEIVED NOTE</h1><div><b>${esc(g.grnNo)}</b></div><div class="muted">Status: ${esc(g.status)}</div></div></div>
    <div class="grid">
      <div class="box"><h4>Supplier</h4><b>${esc(g.supplier)}</b>${g.supplierAddress ? `<div>${esc(g.supplierAddress).replace(/\n/g, "<br>")}</div>` : ""}${g.supplierPhone ? `<div>Tel: ${esc(g.supplierPhone)}</div>` : ""}</div>
      <div class="box"><h4>Receipt details</h4>
        <div>Date: <b>${esc(when(g.createdAt))}</b></div><div>PO: <b>${esc(g.poNo || "-")}</b></div><div>Stored in: <b>${esc(g.location)}</b></div><div>Received by: <b>${esc(g.receivedBy || "-")}</b></div></div>
      <div class="box"><h4>Supplier invoice</h4>
        <div>Invoice no: <b>${esc(g.invoiceNo || "-")}</b></div><div>Invoice date: <b>${g.invoiceDate ? esc(String(g.invoiceDate).slice(0, 10)) : "-"}</b></div><div>Invoice amount: <b>${g.invoiceAmount != null ? money(g.invoiceAmount) : "-"}</b></div></div>
    </div>
    <table><thead><tr><th class="c">#</th><th>Product</th><th class="r">Quantity</th><th class="r">Unit cost</th><th class="r">Total (LKR)</th><th>Batch</th><th>Expiry</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="sum"><tr><td>Items</td><td class="r">${g.items.length}</td></tr><tr><td>Total quantity</td><td class="r">${qtyFmt(g.totalQty)}</td></tr><tr class="grand"><td>Total amount (LKR)</td><td class="r">${money(g.value)}</td></tr></table>
    ${g.note ? `<div class="box" style="margin-top:14px"><h4>Note</h4>${esc(g.note)}</div>` : ""}
    <div class="sign"><div>Received by</div><div>Checked by</div><div>Supplier representative</div></div>
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

function GrnViewModal({ g, onClose, onInvoice }) {
  const diff = g.invoiceAmount != null && Math.abs(g.invoiceAmount - g.value) > 0.5;
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success" style={{ width: 40, height: 40 }}><Icon icon="mdi:truck-check-outline" width="22" height="22" /></span>
          <span>{g.grnNo} <StatusBadge status={g.status} /><div className="small text-muted fw-normal">{g.supplier}{g.poNo ? ` · ${g.poNo}` : ""}</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr><th className="bg-light text-muted small" style={{ width: 150 }}>Received on</th><td>{when(g.createdAt)}</td><th className="bg-light text-muted small" style={{ width: 150 }}>Received by</th><td>{g.receivedBy || "-"}</td></tr>
              <tr><th className="bg-light text-muted small">Stored in</th><td>{g.location}</td><th className="bg-light text-muted small">Purchase order</th><td>{g.poNo || "No PO (direct receipt)"}</td></tr>
              <tr>
                <th className="bg-light text-muted small">Supplier invoice</th>
                <td colSpan={3}>{g.invoiceNo ? <><b>{g.invoiceNo}</b> · {g.invoiceDate ? g.invoiceDate.slice(0, 10) : "-"} · LKR {money(g.invoiceAmount)} {diff && <Badge bg="warning" text="dark">differs from goods value</Badge>}</> : <StatusBadge status="Waiting for price" />}
                  <Button size="sm" variant="outline-primary" className="ms-3" onClick={onInvoice}><Icon icon="mdi:file-edit-outline" width="16" height="16" /> {g.invoiceNo ? "Edit invoice" : "Add invoice"}</Button></td>
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="border rounded bg-white overflow-hidden">
          <Table bordered hover className="mb-0 align-middle">
            <thead className="table-light"><tr><th className="text-center" style={{ width: 50 }}>#</th><th>Product</th><th className="text-end">Qty</th><th className="text-end">Unit cost</th><th className="text-end">Total (LKR)</th><th>Batch</th><th>Expiry</th></tr></thead>
            <tbody>{g.items.map((x, i) => <tr key={i}><td className="text-center text-muted">{i + 1}</td><td className="fw-semibold">{x.name}</td><td className="text-end">{qtyFmt(x.qty)} {x.unit}</td><td className="text-end">{money(x.unitCost)}</td><td className="text-end fw-semibold">{money(x.qty * x.unitCost)}</td><td>{x.batchNo || "-"}</td><td>{x.expiryDate ? x.expiryDate.slice(0, 10) : "-"}</td></tr>)}</tbody>
            <tfoot className="table-light"><tr><td colSpan={2} className="text-end fw-semibold">Totals</td><td className="text-end fw-bold">{qtyFmt(g.totalQty)}</td><td /><td className="text-end fw-bold">{money(g.value)}</td><td colSpan={2} /></tr></tfoot>
          </Table>
        </div>
        {g.note && <div className="small text-muted mt-2">Note: {g.note}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="outline-dark" onClick={() => printGrn(g)}><Icon icon="mdi:printer-outline" width="18" height="18" /> Print GRN</Button>
      </Modal.Footer>
    </Modal>
  );
}

function GrnPanel() {
  const { data: all = [], isLoading, isError, refetch } = useInvGetQuery("grns");
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send] = useSend();
  const [direct, setDirect] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [f, setF] = useState({ supplierId: "", status: "", from: "", to: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const data = all.filter((g) => {
    if (f.supplierId && String(g.supplierId) !== f.supplierId) return false;
    if (f.status && g.status !== f.status) return false;
    const day = String(g.createdAt || "").slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
  const filtered = Object.values(f).some(Boolean);
  const viewing = all.find((g) => g.id === viewId);
  const saveInvoice = async (g) => {
    const r = await Swal.fire({
      title: `Supplier invoice · ${g.grnNo}`, html: '<input id="iv-no" class="swal2-input" placeholder="Invoice no"><input id="iv-date" type="date" class="swal2-input"><input id="iv-amt" type="number" class="swal2-input" placeholder="Invoice amount">',
      didOpen: () => { document.getElementById("iv-no").value = g.invoiceNo || ""; document.getElementById("iv-date").value = (g.invoiceDate || today()).slice(0, 10); document.getElementById("iv-amt").value = g.invoiceAmount ?? g.value; },
      preConfirm: () => ({ invoiceNo: document.getElementById("iv-no").value, invoiceDate: document.getElementById("iv-date").value, invoiceAmount: document.getElementById("iv-amt").value }),
      showCancelButton: true, confirmButtonText: "Save",
    });
    if (r.isConfirmed && (await send(`grns/${g.id}/invoice`, r.value, "PUT"))) toast("Invoice saved");
  };
  const Lb = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
  return (
    <Panel
      title={<>GRN History <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:truck-check-outline"
      action={<Button size="sm" variant="outline-primary" onClick={() => setDirect(true)}><Icon icon="mdi:plus" width="18" height="18" /> Receive without PO</Button>}
    >
      <div className="border rounded p-3 mb-3 bg-light">
        <Row className="g-2 align-items-end">
          <Form.Group as={Col} xs={12} md={4} lg={3}>{Lb("Supplier")}<FormSelect value={f.supplierId} onChange={set("supplierId")}><option value="">All Suppliers</option>{(lookups?.suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={3}>{Lb("Status")}<FormSelect value={f.status} onChange={set("status")}><option value="">All Status</option><option value="RECEIVED">Received</option><option value="PARTIAL">Partial</option></FormSelect></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date From")}<FormControl type="date" value={f.from} max={f.to || undefined} onChange={set("from")} /></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date To")}<FormControl type="date" value={f.to} min={f.from || undefined} onChange={set("to")} /></Form.Group>
          <Col xs={6} md={4} lg={2} className="d-grid"><Button variant="outline-secondary" disabled={!filtered} onClick={() => setF({ supplierId: "", status: "", from: "", to: "" })}><Icon icon="mdi:filter-off-outline" width="18" height="18" /> Clear</Button></Col>
        </Row>
      </div>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="receipts" /> : data.length === 0 ? <Empty text={filtered ? "No receipts match the filters" : "No goods received yet"} icon="mdi:truck-check-outline" /> : (
        <Table responsive bordered hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>GRN ID</th><th>PO ID</th><th>Supplier</th><th className="text-end">Total Qty</th><th>Received By</th><th>Status</th><th className="text-end">Total Amount (LKR)</th><th className="text-center">Actions</th></tr></thead>
          <tbody>
            {data.map((g) => (
              <tr key={g.id}>
                <td className="fw-semibold">{g.grnNo}<div className="small text-muted fw-normal">{dmy(g.createdAt)}</div></td>
                <td>{g.poNo || "-"}</td>
                <td>{g.supplier}</td>
                <td className="text-end">{qtyFmt(g.totalQty)}</td>
                <td className="small">{g.receivedBy || "-"}</td>
                <td><StatusBadge status={g.status} /></td>
                <td className="text-end fw-semibold">{money(g.value)}{g.invoiceNo ? <div className="small text-muted fw-normal">inv {g.invoiceNo}</div> : null}</td>
                <td className="text-center text-nowrap">
                  <div className="d-inline-flex gap-1">
                    <Button size="sm" variant="outline-secondary" onClick={() => setViewId(g.id)} title="View GRN"><Icon icon="mdi:eye-outline" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-dark" onClick={() => printGrn(g)} title="Print GRN"><Icon icon="mdi:printer-outline" width="16" height="16" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {direct && <DirectGrnModal onClose={() => setDirect(false)} />}
      {viewing && <GrnViewModal g={viewing} onClose={() => setViewId(null)} onInvoice={() => saveInvoice(viewing)} />}
    </Panel>
  );
}

/* ================= Supplier returns ================= */
const RETURN_REASONS = ["Damaged", "Wrong part delivered", "Defective / not working", "Excess / not ordered", "Expired", "Quality not acceptable", "Other"];
function ReturnModal({ onClose }) {
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [grnId, setGrnId] = useState("");
  const { data: grns = [] } = useInvGetQuery("grns");
  const [reasonKind, setReasonKind] = useState("");
  const [details, setDetails] = useState("");
  const [lines, setLines] = useState([]);
  const add = (x) => setLines((p) => (p.some((l) => l.partId === x.id) ? p : [...p, { partId: x.id, name: x.name, partNo: x.partNo, brand: x.brand, unit: x.unit, onHand: x.onHand, cost: x.avgCost || x.costPrice || 0, qty: "" }]));
  const upd = (i, v) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: v } : x)));
  const reason = [reasonKind, details.trim()].filter(Boolean).join(" - ");
  const amount = (l) => (Number(l.qty) || 0) * (Number(l.cost) || 0);
  const total = lines.reduce((sum, l) => sum + amount(l), 0);
  const totalQty = lines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  const tooMany = lines.some((l) => Number(l.qty) > Number(l.onHand));
  const ready = supplierId && reason && lines.length > 0 && lines.every((l) => Number(l.qty) > 0) && !tooMany;
  const save = async () => {
    const r = await send("supplier-returns", { supplierId, locationId: locationId || lookups?.locations[0]?.id, grnId: grnId || undefined, reason, lines: lines.map((l) => ({ partId: l.partId, qty: l.qty })) });
    if (r) { toast(r.message); onClose(); }
  };
  const SectionHead = ({ icon, title, right }) => (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom">
      <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon={icon} width="18" height="18" className="text-primary" />{title}</div>{right}
    </div>
  );
  const th = "bg-light text-muted fw-semibold small";
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger" style={{ width: 40, height: 40 }}><Icon icon="mdi:truck-remove-outline" width="22" height="22" /></span>
          <span>Return goods to supplier<div className="small text-muted fw-normal">Stock is taken out when you save</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. return details */}
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <SectionHead icon="mdi:information-outline" title="Return details" />
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr>
                <th className={th} style={{ width: 150 }}>Supplier *</th>
                <td><FormSelect value={supplierId} onChange={(e) => setSupplierId(e.target.value)}><option value="">Select supplier</option>{(lookups?.suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</FormSelect></td>
                <th className={th} style={{ width: 150 }}>Take stock from</th>
                <td><FormSelect value={locationId} onChange={(e) => setLocationId(e.target.value)}>{(lookups?.locations || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></td>
              </tr>
              <tr>
                <th className={th}>Against GRN <span className="fw-normal">(optional)</span></th>
                <td colSpan={3}><FormSelect value={grnId} onChange={(e) => setGrnId(e.target.value)}><option value="">Not linked to a GRN</option>{grns.filter((g) => !supplierId || String(g.supplierId) === String(supplierId)).map((g) => <option key={g.id} value={g.id}>{g.grnNo}{g.poNo ? ` · ${g.poNo}` : ""} · {dmy(g.createdAt)} · LKR {money(g.value)}</option>)}</FormSelect></td>
              </tr>
              <tr>
                <th className={th}>Reason *</th>
                <td><FormSelect value={reasonKind} onChange={(e) => setReasonKind(e.target.value)} isInvalid={!reasonKind && !!details}><option value="">Select reason</option>{RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</FormSelect></td>
                <th className={th}>Details</th>
                <td><FormControl value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. cracked on delivery, invoice INV-1023" maxLength={200} autoComplete="off" /></td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* 2. products */}
        <div className="border rounded bg-white mb-3">
          <SectionHead icon="mdi:package-variant-closed" title="Products to return" right={<Badge bg="secondary" pill>{lines.length}</Badge>} />
          <div className="p-3 border-bottom"><ItemPicker onPick={add} placeholder="Search products to return..." /></div>
          {lines.length === 0 ? <div className="p-3"><Empty text="Search and add the products you are sending back" icon="mdi:package-up" /></div> : (
            <Table responsive bordered hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th className="text-center" style={{ width: 50 }}>#</th><th>Product</th><th className="text-end" style={{ width: 120 }}>On Hand</th><th style={{ width: 150 }}>Return Quantity</th><th className="text-end" style={{ width: 140 }}>Unit Cost (LKR)</th><th className="text-end" style={{ width: 140 }}>Total (LKR)</th><th className="text-center" style={{ width: 70 }}>Action</th></tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.partId}>
                    <td className="text-center text-muted">{i + 1}</td>
                    <td><div className="fw-semibold">{l.name}</div><small className="text-muted">{[l.partNo, l.brand, l.unit].filter(Boolean).join(" | ")}</small></td>
                    <td className="text-end">{qtyFmt(l.onHand)} <small className="text-muted">{l.unit}</small></td>
                    <td>
                      <FormControl size="sm" type="number" min="0" step="any" value={l.qty} onChange={(e) => upd(i, e.target.value)} isInvalid={l.qty !== "" && (!(Number(l.qty) > 0) || Number(l.qty) > Number(l.onHand))} />
                      {Number(l.qty) > Number(l.onHand) && <div className="small text-danger">More than on hand</div>}
                    </td>
                    <td className="text-end text-muted">{money(l.cost)}</td>
                    <td className="text-end fw-semibold">{money(amount(l))}</td>
                    <td className="text-center"><Button size="sm" variant="outline-danger" onClick={() => setLines((p) => p.filter((_, j) => j !== i))} title="Remove"><Icon icon="mdi:trash-can-outline" width="16" height="16" /></Button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-light">
                <tr><td colSpan={3} className="text-end fw-semibold">Totals</td><td className="fw-semibold">{qtyFmt(totalQty)}</td><td /><td className="text-end fw-bold">{money(total)}</td><td /></tr>
              </tfoot>
            </Table>
          )}
        </div>

        {/* 3. summary */}
        <Row className="g-3">
          <Col lg={7}>
            <Alert variant="light" className="border mb-0 h-100 small d-flex gap-2 align-items-start">
              <Icon icon="mdi:information-outline" width="20" height="20" className="text-primary flex-shrink-0" />
              <div>The stock is reduced straight away. When the supplier sends a <b>credit note</b>, open this return in the list and record the credit note number and amount.</div>
            </Alert>
          </Col>
          <Col lg={5}>
            <div className="border rounded bg-white overflow-hidden">
              <SectionHead icon="mdi:calculator-variant-outline" title="Summary" />
              <Table className="mb-0 align-middle">
                <tbody>
                  <tr><td className="text-muted">Items</td><td className="text-end fw-semibold">{lines.length}</td></tr>
                  <tr><td className="text-muted">Total Quantity</td><td className="text-end fw-semibold">{qtyFmt(totalQty)}</td></tr>
                  <tr className="table-danger"><td className="fw-bold">Return Value (LKR)</td><td className="text-end fw-bold fs-5">{money(total)}</td></tr>
                </tbody>
              </Table>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button variant="danger" disabled={busy || !ready} onClick={save}><Icon icon="mdi:undo-variant" width="18" height="18" /> {busy ? "Saving..." : "Return to supplier"}</Button>
      </Modal.Footer>
    </Modal>
  );
}
const RETURN_STATUS = { OPEN: ["Pending", "warning"], CREDITED: ["Credited", "success"] };
const ReturnBadge = ({ status }) => { const [label, bg] = RETURN_STATUS[status] || [status, "secondary"]; return <Badge bg={bg} text={bg === "warning" ? "dark" : undefined}>{label}</Badge>; };

// A4 print of one supplier return (purchase return note)
function printReturn(x) {
  const rows = x.items.map((i, n) => `<tr><td class="c">${n + 1}</td><td><b>${esc(i.name)}</b>${i.partNo ? `<div class="s">${esc(i.partNo)}</div>` : ""}</td><td class="r">${qtyFmt(i.qty)} ${esc(i.unit)}</td><td class="r">${money(i.unitCost)}</td><td class="r">${money(i.qty * i.unitCost)}</td></tr>`).join("");
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { Swal.fire({ title: "Pop-up blocked", text: "Allow pop-ups for this site to print.", icon: "warning" }); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(x.returnNo)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;margin:0}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc3545;padding-bottom:10px;margin-bottom:14px}
    h1{margin:0;font-size:22px;letter-spacing:1px}.co{font-size:16px;font-weight:700}.muted{color:#666}
    .box{border:1px solid #bbb;border-radius:4px;padding:8px 10px}.grid{display:flex;gap:12px;margin-bottom:14px}.grid>div{flex:1}
    .box h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f1f3f5;font-size:11px;text-transform:uppercase}
    .c{text-align:center;width:34px}.r{text-align:right}.s{font-size:10.5px;color:#666}
    .sum{width:46%;margin-left:auto;margin-top:12px}.grand td{font-size:14px;background:#fdecee;font-weight:700}
    .sign{display:flex;gap:40px;margin-top:60px}.sign div{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:11px}
  </style></head><body>
    <div class="top"><div><div class="co">${esc(COMPANY_NAME)}</div><div class="muted">Stores / Purchasing</div></div>
      <div style="text-align:right"><h1>PURCHASE RETURN NOTE</h1><div><b>${esc(x.returnNo)}</b></div><div class="muted">Status: ${esc((RETURN_STATUS[x.status] || [x.status])[0])}</div></div></div>
    <div class="grid">
      <div class="box"><h4>Supplier</h4><b>${esc(x.supplier)}</b>${x.supplierAddress ? `<div>${esc(x.supplierAddress).replace(/\n/g, "<br>")}</div>` : ""}${x.supplierPhone ? `<div>Tel: ${esc(x.supplierPhone)}</div>` : ""}</div>
      <div class="box"><h4>Return details</h4><div>Date: <b>${esc(when(x.createdAt))}</b></div><div>GRN: <b>${esc(x.grnNo || "-")}</b> &nbsp; PO: <b>${esc(x.poNo || "-")}</b></div><div>Taken from: <b>${esc(x.location)}</b></div><div>Returned by: <b>${esc(x.returnedBy || "-")}</b></div></div>
      <div class="box"><h4>Reason</h4>${esc(x.reason)}${x.creditNoteNo ? `<div style="margin-top:6px">Credit note: <b>${esc(x.creditNoteNo)}</b>${x.creditAmount != null ? ` (LKR ${money(x.creditAmount)})` : ""}</div>` : ""}</div>
    </div>
    <table><thead><tr><th class="c">#</th><th>Product</th><th class="r">Quantity</th><th class="r">Unit cost</th><th class="r">Total (LKR)</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="sum"><tr><td>Items</td><td class="r">${x.items.length}</td></tr><tr><td>Returned quantity</td><td class="r">${qtyFmt(x.totalQty)}</td></tr><tr class="grand"><td>Returned amount (LKR)</td><td class="r">${money(x.value)}</td></tr></table>
    <div class="sign"><div>Prepared by</div><div>Authorized by</div><div>Supplier representative</div></div>
  </body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

function ReturnViewModal({ x, onClose, onCredit }) {
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger" style={{ width: 40, height: 40 }}><Icon icon="mdi:truck-remove-outline" width="22" height="22" /></span>
          <span>{x.returnNo} <ReturnBadge status={x.status} /><div className="small text-muted fw-normal">{x.supplier}</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr><th className="bg-light text-muted small" style={{ width: 150 }}>Returned on</th><td>{when(x.createdAt)}</td><th className="bg-light text-muted small" style={{ width: 150 }}>Returned by</th><td>{x.returnedBy || "-"}</td></tr>
              <tr><th className="bg-light text-muted small">GRN / PO</th><td>{x.grnNo || "-"} {x.poNo ? `· ${x.poNo}` : ""}</td><th className="bg-light text-muted small">Taken from</th><td>{x.location}</td></tr>
              <tr><th className="bg-light text-muted small">Reason</th><td colSpan={3}>{x.reason}</td></tr>
              <tr>
                <th className="bg-light text-muted small">Credit note</th>
                <td colSpan={3}>{x.creditNoteNo ? <><b>{x.creditNoteNo}</b>{x.creditAmount != null && <> · LKR {money(x.creditAmount)}</>}</> : <span className="text-muted">Not received yet</span>}
                  {x.status === "OPEN" && <Button size="sm" variant="outline-primary" className="ms-3" onClick={onCredit}><Icon icon="mdi:file-check-outline" width="16" height="16" /> Record credit note</Button>}</td>
              </tr>
            </tbody>
          </Table>
        </div>
        <div className="border rounded bg-white overflow-hidden">
          <Table bordered hover className="mb-0 align-middle">
            <thead className="table-light"><tr><th className="text-center" style={{ width: 50 }}>#</th><th>Product</th><th className="text-end">Returned Qty</th><th className="text-end">Unit cost</th><th className="text-end">Total (LKR)</th></tr></thead>
            <tbody>{x.items.map((i, n) => <tr key={n}><td className="text-center text-muted">{n + 1}</td><td className="fw-semibold">{i.name}</td><td className="text-end">{qtyFmt(i.qty)} {i.unit}</td><td className="text-end">{money(i.unitCost)}</td><td className="text-end fw-semibold">{money(i.qty * i.unitCost)}</td></tr>)}</tbody>
            <tfoot className="table-light"><tr><td colSpan={2} className="text-end fw-semibold">Totals</td><td className="text-end fw-bold">{qtyFmt(x.totalQty)}</td><td /><td className="text-end fw-bold">{money(x.value)}</td></tr></tfoot>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="outline-dark" onClick={() => printReturn(x)}><Icon icon="mdi:printer-outline" width="18" height="18" /> Print</Button>
      </Modal.Footer>
    </Modal>
  );
}

function ReturnsPanel() {
  const { data: all = [], isLoading, isError, refetch } = useInvGetQuery("supplier-returns");
  const [send] = useSend();
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);
  const blank = { q: "", status: "", from: "", to: "" };
  const [f, setF] = useState(blank);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const q = f.q.trim().toLowerCase().replace(/^#/, "");
  const data = all.filter((x) => {
    if (q && ![x.returnNo, x.poNo, x.grnNo, x.supplier].some((v) => String(v || "").toLowerCase().includes(q))) return false;
    if (f.status && x.status !== f.status) return false;
    const day = String(x.createdAt || "").slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
  const filtered = Object.values(f).some(Boolean);
  const viewing = all.find((x) => x.id === viewId);
  const credit = async (x) => {
    const r = await Swal.fire({
      title: `Credit note · ${x.returnNo}`, html: '<input id="cn-no" class="swal2-input" placeholder="Credit note no"><input id="cn-amt" type="number" class="swal2-input" placeholder="Credit amount">',
      didOpen: () => { document.getElementById("cn-amt").value = x.value; },
      preConfirm: () => ({ creditNoteNo: document.getElementById("cn-no").value, creditAmount: document.getElementById("cn-amt").value }), showCancelButton: true, confirmButtonText: "Save",
    });
    if (r.isConfirmed && (await send(`supplier-returns/${x.id}/credit`, r.value, "PUT"))) toast("Credit note saved");
  };
  const Lb = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
  return (
    <Panel title={<>Supplier returns <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:truck-remove-outline" action={<Button size="sm" onClick={() => setCreating(true)}><Icon icon="mdi:plus" width="18" height="18" /> New return</Button>}>
      <div className="border rounded p-3 mb-3 bg-light">
        <Row className="g-2 align-items-end">
          <Form.Group as={Col} xs={12} md={4} lg={4}>{Lb("Search (PO ID / GRN ID / Supplier)")}<InputGroup><InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="18" height="18" /></InputGroup.Text><FormControl value={f.q} onChange={set("q")} placeholder="PRN, PO, GRN or Supplier" autoComplete="off" /></InputGroup></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Status")}<FormSelect value={f.status} onChange={set("status")}><option value="">All</option><option value="OPEN">Pending</option><option value="CREDITED">Credited</option></FormSelect></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date From")}<FormControl type="date" value={f.from} max={f.to || undefined} onChange={set("from")} /></Form.Group>
          <Form.Group as={Col} xs={6} md={4} lg={2}>{Lb("Date To")}<FormControl type="date" value={f.to} min={f.from || undefined} onChange={set("to")} /></Form.Group>
          <Col xs={6} md={4} lg={2} className="d-grid"><Button variant="outline-secondary" disabled={!filtered} onClick={() => setF(blank)}><Icon icon="mdi:filter-off-outline" width="18" height="18" /> Clear</Button></Col>
        </Row>
      </div>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="returns" /> : data.length === 0 ? <Empty text={filtered ? "No returns match the filters" : "No supplier returns"} icon="mdi:truck-remove-outline" /> : (
        <Table responsive bordered hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>PRN ID</th><th>PO ID</th><th>GRN ID</th><th>Supplier</th><th className="text-end">Returned Qty</th><th>Returned By</th><th>Status</th><th className="text-end">Returned Amount (LKR)</th><th className="text-center">Actions</th></tr></thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.id}>
                <td className="fw-semibold">{x.returnNo}<div className="small text-muted fw-normal">{dmy(x.createdAt)}</div></td>
                <td>{x.poNo || "-"}</td>
                <td>{x.grnNo || "-"}</td>
                <td>{x.supplier}<div className="small text-muted">{x.reason}</div></td>
                <td className="text-end">{qtyFmt(x.totalQty)}</td>
                <td className="small">{x.returnedBy || "-"}</td>
                <td><ReturnBadge status={x.status} />{x.creditNoteNo && <div className="small text-muted">{x.creditNoteNo}</div>}</td>
                <td className="text-end fw-semibold">{money(x.value)}</td>
                <td className="text-center text-nowrap">
                  <div className="d-inline-flex gap-1">
                    <Button size="sm" variant="outline-secondary" onClick={() => setViewId(x.id)} title="View return"><Icon icon="mdi:eye-outline" width="16" height="16" /></Button>
                    <Button size="sm" variant="outline-dark" onClick={() => printReturn(x)} title="Print return note"><Icon icon="mdi:printer-outline" width="16" height="16" /></Button>
                    <Button size="sm" variant={x.status === "OPEN" ? "outline-primary" : "outline-success"} disabled={x.status !== "OPEN"} onClick={() => credit(x)} title={x.status === "OPEN" ? "Record credit note" : `Credit note ${x.creditNoteNo || ""}`}><Icon icon="mdi:file-check-outline" width="16" height="16" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {creating && <ReturnModal onClose={() => setCreating(false)} />}
      {viewing && <ReturnViewModal x={viewing} onClose={() => setViewId(null)} onCredit={() => credit(viewing)} />}
    </Panel>
  );
}

/* ================= Purchasing tab ================= */
export default function PurchasingTab() {
  const [sub, setSub] = useState("po");
  return (
    <>
      <SubTabs
        active={sub}
        onChange={setSub}
        tabs={[
          { key: "po", label: "Purchase orders", icon: "mdi:file-document-outline" },
          { key: "grn", label: "Goods received & invoices", icon: "mdi:truck-check-outline" },
          { key: "returns", label: "Supplier returns", icon: "mdi:truck-remove-outline" },
          { key: "suppliers", label: "Suppliers", icon: "mdi:truck-outline" },
        ]}
      />
      {sub === "po" && <PurchaseOrdersPanel />}
      {sub === "grn" && <GrnPanel />}
      {sub === "returns" && <ReturnsPanel />}
      {sub === "suppliers" && <SuppliersPanel />}
    </>
  );
}