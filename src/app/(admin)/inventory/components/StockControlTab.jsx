"use client";

import { useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Col, Form, FormControl, FormSelect, Modal, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetInventoryItemsQuery, useGetInventoryLookupsQuery, useInvGetQuery } from "@/store/features/apiSlice";
import LedgerTab from "./LedgerTab";
import { Empty, Loader, Panel, StatusBadge, SubTabs, money, qtyFmt, toast, useDebounced, useSend, when } from "./inventoryUi";

const L = (t) => <Form.Label className="small text-muted mb-1">{t}</Form.Label>;
const Err = ({ retry, what }) => <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load {what}.</span><Button size="sm" variant="outline-danger" onClick={retry}>Retry</Button></Alert>;

function ItemPicker({ onPick, placeholder = "Search item..." }) {
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
              <div className="fw-semibold">{x.name}</div><small className="text-muted">{[x.partNo, x.brand].filter(Boolean).join(" · ")} · on hand {qtyFmt(x.onHand)} {x.unit}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Adjustments (request -> approval) ================= */
const KINDS = { DAMAGE: "Damaged", LOSS: "Lost", FOUND: "Found", OTHER: "Other (+/−)" };
const KIND_META = {
  DAMAGE: { icon: "mdi:image-broken-variant", tone: "danger", sign: -1, hint: "Stock is damaged and cannot be sold or used", reasons: ["Broken during handling", "Water damage", "Defective item", "Expired"] },
  LOSS: { icon: "mdi:package-variant-remove", tone: "danger", sign: -1, hint: "Stock is missing or stolen", reasons: ["Missing after stock check", "Stolen", "Used without a record", "Spillage / leakage"] },
  FOUND: { icon: "mdi:package-variant-plus", tone: "success", sign: 1, hint: "Extra stock found that is not on the system", reasons: ["Found during stock check", "Wrongly issued earlier", "Counting mistake corrected"] },
  OTHER: { icon: "mdi:swap-vertical", tone: "secondary", sign: 0, hint: "Any other correction. Use − to remove stock", reasons: ["Opening balance correction", "Unit conversion", "System correction"] },
};
function AdjustModal({ onClose }) {
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [item, setItem] = useState(null);
  const [f, setF] = useState({ kind: "DAMAGE", qty: "", locationId: "", reason: "" });
  const meta = KIND_META[f.kind];
  const n = Number(f.qty);
  const change = !f.qty || !Number.isFinite(n) ? 0 : meta.sign === 0 ? n : meta.sign * Math.abs(n);
  const after = item ? item.onHand + change : null;
  const ready = item && change !== 0 && f.reason.trim() && after >= 0;
  const save = async () => {
    const r = await send("adjustments", { partId: item?.id, ...f, locationId: f.locationId || lookups?.locations[0]?.id });
    if (r) { toast(r.message); onClose(); }
  };
  const th = "bg-light text-muted fw-semibold small";
  const SectionHead = ({ icon, title }) => (
    <div className="d-flex align-items-center gap-2 px-3 py-2 bg-light border-bottom fw-semibold"><Icon icon={icon} width="18" height="18" className="text-primary" />{title}</div>
  );
  return (
    <Modal show onHide={onClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-warning-subtle text-warning-emphasis" style={{ width: 40, height: 40 }}><Icon icon="mdi:tune-variant" width="22" height="22" /></span>
          <span>Request stock adjustment<div className="small text-muted fw-normal">Needs a stock manager's approval</div></span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-body-tertiary">
        {/* 1. item */}
        <div className="border rounded bg-white mb-3">
          <SectionHead icon="mdi:package-variant-closed" title="Item" />
          <div className="p-3">
            {item ? (
              <div className="d-flex justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-semibold">{item.name}</div>
                  <small className="text-muted">{[item.partNo, item.brand, item.unit].filter(Boolean).join(" | ")}</small>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="text-end"><div className="small text-muted">On hand</div><div className="fw-bold">{qtyFmt(item.onHand)} <small className="text-muted fw-normal">{item.unit}</small></div></div>
                  <Button size="sm" variant="outline-secondary" onClick={() => setItem(null)}><Icon icon="mdi:swap-horizontal" width="16" height="16" /> Change</Button>
                </div>
              </div>
            ) : <ItemPicker onPick={setItem} placeholder="Search item by name, part no or barcode..." />}
          </div>
        </div>

        {/* 2. what happened */}
        <div className="border rounded bg-white mb-3 overflow-hidden">
          <SectionHead icon="mdi:clipboard-edit-outline" title="Adjustment" />
          <div className="p-3 border-bottom">
            {L("Type")}
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(KINDS).map(([k, label]) => {
                const m = KIND_META[k], on = f.kind === k;
                return (
                  <Button key={k} variant={on ? m.tone : `outline-${m.tone}`} onClick={() => setF({ ...f, kind: k })} className="d-flex align-items-center gap-2">
                    <Icon icon={m.icon} width="18" height="18" /> {label}
                  </Button>
                );
              })}
            </div>
            <small className="text-muted d-block mt-2">{meta.hint}</small>
          </div>
          <Table bordered className="mb-0 align-middle">
            <tbody>
              <tr>
                <th className={th} style={{ width: 150 }}>Quantity{f.kind === "OTHER" ? " (+/−)" : ""}</th>
                <td><FormControl type="number" step="any" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} placeholder={f.kind === "OTHER" ? "e.g. -2 or 5" : "e.g. 2"} /></td>
                <th className={th} style={{ width: 150 }}>Location</th>
                <td><FormSelect value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })}>{(lookups?.locations || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></td>
              </tr>
              <tr>
                <th className={th}>Reason *</th>
                <td colSpan={3}>
                  <div className="d-flex flex-wrap gap-1 mb-2">{meta.reasons.map((r) => <Button key={r} size="sm" variant={f.reason === r ? "primary" : "outline-secondary"} className="rounded-pill" onClick={() => setF({ ...f, reason: r })}>{r}</Button>)}</div>
                  <FormControl as="textarea" rows={2} maxLength={300} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Pick a reason above or type your own" />
                </td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* 3. effect */}
        {item && (
          <div className={`rounded border p-3 d-flex align-items-center justify-content-around text-center ${after !== null && after < 0 ? "border-danger bg-danger-subtle" : "bg-white"}`}>
            <div><div className="small text-muted">On hand now</div><div className="fs-5 fw-bold">{qtyFmt(item.onHand)}</div></div>
            <Icon icon="mdi:arrow-right" width="22" height="22" className="text-muted" />
            <div><div className="small text-muted">Change</div><div className={`fs-5 fw-bold ${change < 0 ? "text-danger" : change > 0 ? "text-success" : "text-muted"}`}>{change > 0 ? "+" : ""}{qtyFmt(change)}</div></div>
            <Icon icon="mdi:arrow-right" width="22" height="22" className="text-muted" />
            <div><div className="small text-muted">After approval</div><div className={`fs-5 fw-bold ${after < 0 ? "text-danger" : ""}`}>{qtyFmt(after)} <small className="text-muted fw-normal">{item.unit}</small></div></div>
          </div>
        )}
        {after !== null && after < 0 && <div className="small text-danger mt-2">This would take the stock below zero.</div>}
        <Alert variant="light" className="border small mt-3 mb-0 d-flex gap-2"><Icon icon="mdi:shield-check-outline" width="20" height="20" className="text-primary flex-shrink-0" /><div>Stock changes only after a stock manager approves. The approver's name and time are saved with the adjustment.</div></Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}><Icon icon="mdi:close" width="18" height="18" /> Cancel</Button>
        <Button disabled={busy || !ready} onClick={save}><Icon icon="mdi:send-outline" width="18" height="18" /> {busy ? "Sending..." : "Send for approval"}</Button>
      </Modal.Footer>
    </Modal>
  );
}
function AdjustmentsPanel() {
  const [filter, setFilter] = useState("pending");
  const { data = [], isLoading, isError, refetch } = useInvGetQuery(`adjustments?status=${filter}`);
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send] = useSend();
  const [creating, setCreating] = useState(false);
  const decide = async (a, action) => {
    const r = await Swal.fire({ title: `${action === "approve" ? "Approve" : "Reject"} ${a.adjNo}?`, input: "text", inputLabel: "Note (optional)", showCancelButton: true, confirmButtonText: action === "approve" ? "Approve" : "Reject", confirmButtonColor: action === "approve" ? "#198754" : "#dc3545" });
    if (r.isConfirmed && (await send(`adjustments/${a.id}/${action}`, { note: r.value }))) toast(action === "approve" ? "Approved and posted" : "Rejected");
  };
  return (
    <Panel
      title={<>Stock adjustments <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:tune-variant"
      action={
        <div className="d-flex gap-2">
          <ButtonGroup size="sm">{[["pending", "To approve"], ["all", "All"]].map(([k, l]) => <Button key={k} variant={filter === k ? "primary" : "outline-secondary"} onClick={() => setFilter(k)}>{l}</Button>)}</ButtonGroup>
          <Button size="sm" onClick={() => setCreating(true)}><Icon icon="mdi:plus" width="18" height="18" /> Request</Button>
        </div>
      }
    >
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="adjustments" /> : data.length === 0 ? <Empty text={filter === "pending" ? "Nothing waiting for approval" : "No adjustments"} icon="mdi:check-decagram-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>No</th><th>Item</th><th>Type</th><th className="text-end">Qty</th><th>Reason</th><th>Requested</th><th>Decision</th><th /></tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <td className="fw-semibold">{a.adjNo}</td>
                <td><div className="fw-semibold">{a.item}</div><small className="text-muted">{a.location}</small></td>
                <td><StatusBadge status={KINDS[a.kind]} bg={a.qty > 0 ? "success" : "danger"} /></td>
                <td className={`text-end fw-bold ${a.qty < 0 ? "text-danger" : "text-success"}`}>{a.qty > 0 ? "+" : ""}{qtyFmt(a.qty)} <small className="text-muted fw-normal">{a.unit}</small></td>
                <td className="small" style={{ maxWidth: 240 }}>{a.reason}</td>
                <td className="small">{a.requestedBy}<div className="text-muted">{when(a.requestedAt)}</div></td>
                <td><StatusBadge status={a.status} />{a.decidedBy && <div className="small text-muted">{a.decidedBy} · {when(a.decidedAt)}{a.decisionNote && ` · ${a.decisionNote}`}</div>}</td>
                <td className="text-end text-nowrap">
                  {a.status === "PENDING" && lookups?.canAdjust && <>
                    <Button size="sm" variant="success" className="me-1" onClick={() => decide(a, "approve")}>Approve</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => decide(a, "reject")}>Reject</Button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {creating && <AdjustModal onClose={() => setCreating(false)} />}
    </Panel>
  );
}

/* ================= Stock take ================= */
function TakeSheet({ id, onClose }) {
  const { data, isLoading } = useInvGetQuery(`stock-takes/${id}`);
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [counts, setCounts] = useState({});           // lineId -> { countedQty, reason }
  if (isLoading || !data) return <Modal show centered onHide={onClose}><Modal.Body><Loader /></Modal.Body></Modal>;
  const open = data.status === "OPEN";
  const cur = (l) => counts[l.id] ?? { countedQty: l.countedQty ?? "", reason: l.reason ?? "" };
  const set = (l, k, v) => setCounts({ ...counts, [l.id]: { ...cur(l), [k]: v } });
  const diffOf = (l) => { const c = cur(l).countedQty; return c === "" || c === null ? null : Number(c) - l.systemQty; };
  const payload = () => data.lines.map((l) => ({ id: l.id, countedQty: cur(l).countedQty, reason: cur(l).reason }));
  const save = async () => { if (await send(`stock-takes/${id}/lines`, { lines: payload() }, "PUT")) toast("Counts saved"); };
  const complete = async () => {
    const ok = await Swal.fire({ title: "Complete the stock take?", text: "The differences will be posted to the stock. Items you did not count are left unchanged.", icon: "warning", showCancelButton: true, confirmButtonText: "Complete & post" });
    if (!ok.isConfirmed) return;
    if (!(await send(`stock-takes/${id}/lines`, { lines: payload() }, "PUT"))) return;
    const r = await send(`stock-takes/${id}/complete`, {});
    if (r) { toast(r.message); onClose(); }
  };
  const counted = data.lines.filter((l) => diffOf(l) !== null).length;
  const variances = data.lines.filter((l) => diffOf(l) !== null && diffOf(l) !== 0).length;
  return (
    <Modal show onHide={onClose} size="xl" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton><Modal.Title className="fs-5">{data.takeNo} · {data.location}<div className="small text-muted fw-normal">{counted} of {data.lines.length} counted · {variances} difference{variances === 1 ? "" : "s"} · <StatusBadge status={data.status} /></div></Modal.Title></Modal.Header>
      <Modal.Body className="p-0">
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Bin</th><th>Item</th><th className="text-end">System qty</th><th style={{ width: 130 }}>Counted</th><th className="text-end">Difference</th><th style={{ width: 220 }}>Reason</th></tr></thead>
          <tbody>
            {data.lines.map((l) => {
              const d = diffOf(l);
              return (
                <tr key={l.id}>
                  <td className="small">{l.binLocation || "-"}</td>
                  <td><div className="fw-semibold">{l.name}</div><small className="text-muted">{l.partNo}</small></td>
                  <td className="text-end">{qtyFmt(l.systemQty)} <small className="text-muted">{l.unit}</small></td>
                  <td><FormControl size="sm" type="number" min="0" step="any" disabled={!open} value={cur(l).countedQty} onChange={(e) => set(l, "countedQty", e.target.value)} /></td>
                  <td className={`text-end fw-bold ${d === null || d === 0 ? "text-muted" : d < 0 ? "text-danger" : "text-success"}`}>{d === null ? "-" : `${d > 0 ? "+" : ""}${qtyFmt(d)}`}</td>
                  <td><FormControl size="sm" disabled={!open} value={cur(l).reason} onChange={(e) => set(l, "reason", e.target.value)} placeholder={d ? "Why?" : ""} autoComplete="off" /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {open && <Button variant="outline-primary" disabled={busy} onClick={save}>Save counts</Button>}
        {open && lookups?.canAdjust && <Button disabled={busy || counted === 0} onClick={complete}>Complete &amp; post differences</Button>}
      </Modal.Footer>
    </Modal>
  );
}
function StockTakePanel() {
  const { data = [], isLoading, isError, refetch } = useInvGetQuery("stock-takes");
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send] = useSend();
  const [openId, setOpenId] = useState(null);
  const start = async () => {
    const opts = (lookups?.locations || []).map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
    const cats = (lookups?.categories || []).map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    const r = await Swal.fire({
      title: "Start a stock take", html: `<select id="st-loc" class="swal2-select" style="display:flex">${opts}</select><select id="st-cat" class="swal2-select" style="display:flex"><option value="">All categories</option>${cats}</select><input id="st-note" class="swal2-input" placeholder="Note (optional)">`,
      preConfirm: () => ({ locationId: document.getElementById("st-loc").value, categoryId: document.getElementById("st-cat").value, note: document.getElementById("st-note").value }),
      showCancelButton: true, confirmButtonText: "Start",
    });
    if (!r.isConfirmed) return;
    const res = await send("stock-takes", r.value);
    if (res) { toast(res.message); setOpenId(res.id); }
  };
  const cancel = async (t) => { const ok = await Swal.fire({ title: `Cancel ${t.takeNo}?`, icon: "question", showCancelButton: true }); if (ok.isConfirmed) await send(`stock-takes/${t.id}/cancel`, {}); };
  return (
    <Panel title={<>Stock take (physical count) <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:clipboard-check-outline" action={<Button size="sm" onClick={start} disabled={!lookups}><Icon icon="mdi:plus" width="18" height="18" /> Start stock take</Button>}>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="stock takes" /> : data.length === 0 ? <Empty text="No stock takes yet. Start one to compare the system qty with the real count." icon="mdi:clipboard-check-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>No</th><th>Location</th><th>Started</th><th className="text-end">Counted</th><th className="text-end">Differences</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td className="fw-semibold">{t.takeNo}</td><td>{t.location}</td><td className="small text-nowrap">{when(t.createdAt)}</td>
                <td className="text-end">{t.counted} / {t.lines}</td><td className={`text-end fw-semibold ${t.variances ? "text-warning" : ""}`}>{t.variances}</td>
                <td><StatusBadge status={t.status} /></td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant={t.status === "OPEN" ? "primary" : "outline-secondary"} className="me-1" onClick={() => setOpenId(t.id)}>{t.status === "OPEN" ? "Count" : "View"}</Button>
                  {t.status === "OPEN" && <Button size="sm" variant="outline-danger" onClick={() => cancel(t)}>Cancel</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {openId && <TakeSheet id={openId} onClose={() => setOpenId(null)} />}
    </Panel>
  );
}

/* ================= Transfers ================= */
function TransferModal({ onClose }) {
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [send, busy] = useSend();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState([]);
  const locs = lookups?.locations || [];
  const add = (x) => setLines((p) => (p.some((l) => l.partId === x.id) ? p : [...p, { partId: x.id, name: x.name, unit: x.unit, qty: "" }]));
  const save = async () => {
    const r = await send("transfers", { fromLocationId: from || locs[0]?.id, toLocationId: to || locs[1]?.id, note, lines });
    if (r) { toast(r.message); onClose(); }
  };
  return (
    <Modal show onHide={onClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton><Modal.Title className="fs-5">Transfer stock</Modal.Title></Modal.Header>
      <Modal.Body>
        {locs.length < 2 && <Alert variant="warning">You need at least two locations. Add one in Item Master &gt; Items &amp; stock &gt; Location.</Alert>}
        <Row className="g-3 mb-3">
          <Form.Group as={Col} md={4}>{L("From")}<FormSelect value={from || locs[0]?.id || ""} onChange={(e) => setFrom(e.target.value)}>{locs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} md={4}>{L("To")}<FormSelect value={to || locs[1]?.id || ""} onChange={(e) => setTo(e.target.value)}>{locs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</FormSelect></Form.Group>
          <Form.Group as={Col} md={4}>{L("Note")}<FormControl value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" /></Form.Group>
        </Row>
        <div className="mb-2">{L("Add items")}<ItemPicker onPick={add} /></div>
        {lines.length > 0 && (
          <Table responsive size="sm" className="align-middle">
            <thead className="table-light"><tr><th>Item</th><th style={{ width: 130 }}>Qty</th><th /></tr></thead>
            <tbody>{lines.map((l, i) => (
              <tr key={l.partId}><td className="fw-semibold">{l.name} <small className="text-muted fw-normal">{l.unit}</small></td>
                <td><FormControl size="sm" type="number" min="0" step="any" value={l.qty} onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} /></td>
                <td className="text-end"><Button size="sm" variant="outline-danger" onClick={() => setLines((p) => p.filter((_, j) => j !== i))}><Icon icon="mdi:close" width="16" height="16" /></Button></td></tr>
            ))}</tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy || lines.length === 0} onClick={save}>{busy ? "Moving..." : "Transfer"}</Button></Modal.Footer>
    </Modal>
  );
}
function TransfersPanel() {
  const { data = [], isLoading, isError, refetch } = useInvGetQuery("transfers");
  const [creating, setCreating] = useState(false);
  return (
    <Panel title={<>Stock transfers <Badge bg="secondary" pill>{data.length}</Badge></>} icon="mdi:swap-horizontal-bold" action={<Button size="sm" onClick={() => setCreating(true)}><Icon icon="mdi:plus" width="18" height="18" /> New transfer</Button>}>
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="transfers" /> : data.length === 0 ? <Empty text="No transfers yet" icon="mdi:swap-horizontal-bold" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>No</th><th>Date</th><th>From</th><th>To</th><th>Items</th><th>By</th></tr></thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td className="fw-semibold">{t.transferNo}</td><td className="small text-nowrap">{when(t.createdAt)}</td><td>{t.fromLocation}</td><td>{t.toLocation}</td>
                <td className="small">{t.items.map((i) => `${i.name} × ${qtyFmt(i.qty)}`).join(", ")}</td><td className="small">{t.by}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {creating && <TransferModal onClose={() => setCreating(false)} />}
    </Panel>
  );
}

/* ================= Batches & expiry ================= */
function BatchesPanel() {
  const [filter, setFilter] = useState("all");
  const { data = [], isLoading, isError, refetch } = useInvGetQuery(`batches?filter=${filter}`);
  return (
    <Panel
      title={<>Batches &amp; expiry <Badge bg="secondary" pill>{data.length}</Badge></>}
      icon="mdi:calendar-alert-outline"
      action={<ButtonGroup size="sm">{[["all", "All"], ["expiring", "Expiring (60 days)"], ["expired", "Expired"]].map(([k, l]) => <Button key={k} variant={filter === k ? "primary" : "outline-secondary"} onClick={() => setFilter(k)}>{l}</Button>)}</ButtonGroup>}
    >
      {isLoading ? <Loader /> : isError ? <Err retry={refetch} what="batches" /> : data.length === 0 ? <Empty text="No batches. Turn on 'Track batch & expiry' for oils, coolant, brake fluid ... and enter the batch no + expiry when receiving." icon="mdi:calendar-alert-outline" /> : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light"><tr><th>Item</th><th>Batch</th><th>Location</th><th>Expiry</th><th className="text-end">Qty</th><th>Status</th></tr></thead>
          <tbody>
            {data.map((b) => {
              const st = b.daysLeft === null ? "OK" : b.daysLeft < 0 ? "Expired" : b.daysLeft <= 60 ? "Expiring soon" : "OK";
              return (
                <tr key={b.id}>
                  <td className="fw-semibold">{b.item}</td><td>{b.batchNo}</td><td className="small">{b.location}</td>
                  <td className="small">{b.expiryDate ? b.expiryDate.slice(0, 10) : "-"}{b.daysLeft !== null && <div className="text-muted">{b.daysLeft < 0 ? `${-b.daysLeft} days ago` : `in ${b.daysLeft} days`}</div>}</td>
                  <td className="text-end">{qtyFmt(b.qty)} <small className="text-muted">{b.unit}</small></td>
                  <td><StatusBadge status={st} /></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

/* ================= Stock control tab ================= */
export default function StockControlTab({ summary }) {
  const [sub, setSub] = useState("adjust");
  return (
    <>
      <SubTabs
        active={sub}
        onChange={setSub}
        tabs={[
          { key: "adjust", label: "Adjustments", icon: "mdi:tune-variant", badge: summary?.pendingAdjustments },
          { key: "take", label: "Stock take", icon: "mdi:clipboard-check-outline" },
          { key: "transfer", label: "Transfers", icon: "mdi:swap-horizontal-bold" },
          { key: "batches", label: "Batches & expiry", icon: "mdi:calendar-alert-outline", badge: summary?.expiringBatches },
          { key: "ledger", label: "Stock ledger", icon: "mdi:book-open-variant" },
        ]}
      />
      {sub === "adjust" && <AdjustmentsPanel />}
      {sub === "take" && <StockTakePanel />}
      {sub === "transfer" && <TransfersPanel />}
      {sub === "batches" && <BatchesPanel />}
      {sub === "ledger" && <LedgerTab />}
    </>
  );
}
