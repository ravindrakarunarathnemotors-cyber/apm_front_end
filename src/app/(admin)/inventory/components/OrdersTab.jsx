"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Badge, Button, ButtonGroup, Col, Dropdown, Form, FormControl, FormSelect, Modal, Row, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useAnswerSpareQuoteMutation, useGetInventoryLookupsQuery, useGetSpareOrdersQuery, useGetSpareQuotesQuery, useJobPartActionMutation } from "@/store/features/apiSlice";
import { Empty, Loader, Panel, StatusBadge, money, qtyFmt, when } from "./inventoryUi";

// Tabs in the order of the work: what needs doing now, what waits for the customer, what is finished
const TABS = [
  { k: "action", label: "Needs action", icon: "mdi:lightning-bolt-outline", hint: "Parts to issue, quotations to price, Logistic & Stock to answer", match: (st) => st === "issue" || st === "waiting" || st === "progress" },
  { k: "approval", label: "Awaiting approval", icon: "mdi:account-clock-outline", hint: "The customer has not approved the estimate yet", match: (st) => st === "approval" },
  { k: "done", label: "Completed", icon: "mdi:check-circle-outline", hint: "Every part is issued", match: (st) => st === "done" || st === "none" },
  { k: "all", label: "All", icon: "mdi:format-list-bulleted", hint: "Every job order", match: () => true },
];

/* ---------- Reserve / Release / Issue / Return one spare part line ---------- */
const ACTIONS = {
  reserve: { title: "Reserve for this job", hint: "Hold the stock so nobody else can take it.", btn: "Reserve" },
  release: { title: "Release reservation", hint: "Give the held stock back.", btn: "Release" },
  issue: { title: "Issue to technician", hint: "The technician takes the part. Stock goes down.", btn: "Issue" },
  return: { title: "Return unused part", hint: "The part comes back to stock.", btn: "Return" },
};
function LineActionModal({ job, line, action, onClose }) {
  const cfg = ACTIONS[action];
  const { data: lookups } = useGetInventoryLookupsQuery();
  const [run, { isLoading }] = useJobPartActionMutation();
  const net = line.issued - line.returned;
  const left = Math.max(0, line.qty - net - line.reserved);
  const def = action === "reserve" ? left : action === "release" ? line.reserved : action === "issue" ? (line.reserved > 0 ? line.reserved : Math.max(0, line.qty - net)) : net;
  const [qty, setQty] = useState(String(def));
  const [locationId, setLocationId] = useState("");
  const [note, setNote] = useState("");
  const [technician, setTechnician] = useState("");
  const locked = action === "release" || line.reserved > 0 && (action === "reserve" || action === "issue");   // location comes from the reservation
  const save = async () => {
    try { await run({ jobId: job.jobId, lineId: line.id, action, qty, locationId: locked ? undefined : locationId || undefined, note, technician: action === "issue" ? technician : undefined }).unwrap(); onClose(); }
    catch (ex) { Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not update the stock.", icon: "error" }); }
  };
  return (
    <Modal show onHide={onClose} centered enforceFocus={false}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{cfg.title}<div className="small text-muted fw-normal">{job.jobNo} · {line.name}</div></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small">{cfg.hint}</p>
        <Row className="g-3">
          <Form.Group as={Col} sm={6}><Form.Label>Quantity</Form.Label><FormControl type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Form.Group>
          {!locked && (
            <Form.Group as={Col} sm={6}>
              <Form.Label>Location</Form.Label>
              <FormSelect value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Default</option>
                {(lookups?.locations || []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </FormSelect>
            </Form.Group>
          )}
          {action === "issue" && <Form.Group as={Col} xs={12}><Form.Label>Technician (who takes the part)</Form.Label><FormControl value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Technician name" autoComplete="off" /></Form.Group>}
          <Form.Group as={Col} xs={12}><Form.Label>Note</Form.Label><FormControl value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" /></Form.Group>
        </Row>
        <Alert variant="light" className="border mt-3 mb-0 py-2 small d-flex flex-wrap gap-3">
          <span>Needed: <strong>{line.qty}</strong></span><span>Reserved: <strong>{qtyFmt(line.reserved)}</strong></span>
          <span>Issued (net): <strong>{qtyFmt(net)}</strong></span><span>In stock now: <strong>{qtyFmt(line.available)}</strong></span>
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={isLoading} onClick={save}>{isLoading ? "Saving..." : cfg.btn}</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ---------- actions of one part line: Issue + (Reserve / Release / Return) ---------- */
function LineActions({ o, l, onAct }) {
  const net = l.issued - l.returned;
  const remaining = Math.max(0, l.qty - net);
  if (!l.partId) return <small className="text-muted text-nowrap">Manual item</small>;
  return (
    <div className="d-inline-flex align-items-center gap-1 so-actions">
      {remaining > 0 && (
        <Button size="sm" variant="primary" className="d-inline-flex align-items-center gap-1 text-nowrap" onClick={() => onAct({ job: o, line: l, action: "issue" })}>
          <Icon icon="mdi:package-up" width="15" height="15" /> Issue
        </Button>
      )}
      <Dropdown align="end">
        <Dropdown.Toggle size="sm" variant="outline-secondary" aria-label="More actions" className="so-more d-inline-flex align-items-center gap-1 text-nowrap"><Icon icon="mdi:dots-horizontal" width="18" height="18" /><span className="d-none d-sm-inline">More</span></Dropdown.Toggle>
        <Dropdown.Menu renderOnMount popperConfig={{ strategy: "fixed" }}>
          {l.qty - net - l.reserved > 0 && <Dropdown.Item className="so-mi" onClick={() => onAct({ job: o, line: l, action: "reserve" })}><span className="so-mi-i text-primary"><Icon icon="mdi:lock-outline" width="18" height="18" /></span>Reserve</Dropdown.Item>}
          {l.reserved > 0 && <Dropdown.Item className="so-mi" onClick={() => onAct({ job: o, line: l, action: "release" })}><span className="so-mi-i text-warning"><Icon icon="mdi:lock-open-variant-outline" width="18" height="18" /></span>Release reservation</Dropdown.Item>}
          {net > 0 && <Dropdown.Item className="so-mi" onClick={() => onAct({ job: o, line: l, action: "return" })}><span className="so-mi-i text-success"><Icon icon="mdi:undo-variant" width="18" height="18" /></span>Return unused</Dropdown.Item>}
          {remaining <= 0 && l.reserved <= 0 && net <= 0 && <Dropdown.ItemText className="small text-muted">No actions</Dropdown.ItemText>}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}

/* ---------- one spare part line: what is needed, how much is done, and what to do next ---------- */
function PartRow({ o, l, onAct }) {
  const net = Math.max(0, l.issued - l.returned);
  const remaining = Math.max(0, l.qty - net);
  const toReserve = Math.max(0, remaining - l.reserved);
  const done = remaining <= 0;
  const pIss = Math.min(100, (net / Math.max(l.qty, 1)) * 100);
  const pRes = Math.min(100 - pIss, (l.reserved / Math.max(l.qty, 1)) * 100);
  let tone = "grey", label = "Manual item";
  if (done) { tone = "green"; label = "Fully issued"; }
  else if (l.partId) {
    if (toReserve <= 0) { tone = "blue"; label = "Reserved"; }
    else if (l.available >= toReserve) { tone = "green"; label = "In stock"; }
    else { tone = "red"; label = `Short by ${qtyFmt(toReserve - Math.max(0, l.available))}`; }
  }
  return (
    <div className={`pr-row tone-${tone}`}>
      <div className="pr-main">
        <div className="pr-name">{l.name}</div>
        <div className="pr-sub">{[l.brand, l.quality].filter(Boolean).join(" · ") || "-"}</div>
      </div>
      <div className="pr-qty">
        <div className="pr-bar" title={`Issued ${qtyFmt(net)} · Reserved ${qtyFmt(l.reserved)} · Needed ${l.qty}`}><span className="pr-iss" style={{ width: `${pIss}%` }} /><span className="pr-res" style={{ width: `${pRes}%` }} /></div>
        <div className="pr-nums"><b>{qtyFmt(net)}</b> / {l.qty} issued{l.reserved > 0 && <> · <span className="text-primary">{qtyFmt(l.reserved)} reserved</span></>}{l.returned > 0 && <> · returned {qtyFmt(l.returned)}</>}</div>
      </div>
      <div className="pr-stock">
        <span className={`pr-pill ${tone}`}>{label}</span>
        <div className="pr-sub">{l.partId ? `${qtyFmt(l.available)} available` : "no stock record"}</div>
      </div>
      <div className="pr-price"><div className="pr-sub">Unit price</div><b>{money(l.unitPrice)}</b></div>
      <div className="pr-act">{done && l.reserved <= 0 && net <= 0 ? null : <LineActions o={o} l={l} onAct={onAct} />}</div>
    </div>
  );
}

// Spare part orders: job list on the left, the selected job's work on the right
const stateOf = (o) => {
  if (o.approval !== "APPROVED") return "approval";                                       // the customer has not approved yet
  const toIssue = (o.lines || []).some((l) => l.qty - Math.max(0, l.issued - l.returned) > 0);
  if (o.noParts && (o.lines || []).length === 0) return "none";
  if (o.linkSentAt && !o.logisticsUpdatedAt) return "waiting";                             // Logistic & Stock has not answered yet
  if (toIssue || o.pendingQuotes > 0) return "issue";                                      // approved, but the parts are not all issued yet
  return (o.lines || []).length > 0 ? "done" : "progress";                                 // Completed only when every part is issued
};
const notApproved = (o) => o.approval !== "APPROVED";
const ApprovalBadge = ({ o }) => (notApproved(o)
  ? <Badge bg="warning" text="dark" className="ov-appr" title="The customer has not confirmed the estimate yet">Customer not approved yet</Badge>
  : <Badge bg="success" className="ov-appr">Customer approved</Badge>);
const STATE_TXT = { approval: "Waiting for customer approval", issue: "Waiting to issue parts", done: "Completed", none: "No parts needed", waiting: "Waiting for Logistic & Stock", progress: "In progress" };

export default function OrdersTab() {
  const focusJob = Number(useSearchParams().get("job")) || null;          // a notification opens this job straight away
  const [status, setStatus] = useState(focusJob ? "all" : "action");
  const [selId, setSelId] = useState(focusJob);
  useEffect(() => { if (focusJob) { setStatus("all"); setSelId(focusJob); } }, [focusJob]);
  const [act, setAct] = useState(null);
  const [q, setQ] = useState("");
  const [runAction] = useJobPartActionMutation();
  const { data = [], isLoading, isError, refetch } = useGetSpareOrdersQuery("all", { refetchOnMountOrArgChange: true });
  const { data: allQuotes = [], refetch: refetchQuotes } = useGetSpareQuotesQuery("all", { refetchOnMountOrArgChange: true });
  const [answerQuote] = useAnswerSpareQuoteMutation();
  useEffect(() => { if (focusJob) { refetch(); refetchQuotes(); } }, [focusJob]); // eslint-disable-line react-hooks/exhaustive-deps
  // a clicked notification (even for the page we are already on) and tab re-focus force a fresh load, so new job orders appear
  useEffect(() => {
    const again = () => { setStatus("all"); refetch(); refetchQuotes(); };
    const vis = () => { if (document.visibilityState === "visible") { refetch(); refetchQuotes(); } };
    window.addEventListener("inventory-orders-refresh", again);
    document.addEventListener("visibilitychange", vis);
    return () => { window.removeEventListener("inventory-orders-refresh", again); document.removeEventListener("visibilitychange", vis); };
  }, [refetch, refetchQuotes]);

  const quotesByJob = useMemo(() => {
    const m = {};
    for (const x of allQuotes) if (x.status !== "REQUESTED") (m[x.jobId] ||= []).push(x);
    return m;
  }, [allQuotes]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const tab = TABS.find((t) => t.k === status) || TABS[0];
    const list = data.filter((o) => tab.match(stateOf(o)));
    return s ? list.filter((o) => [o.jobNo, o.regNo, o.customerName, o.department].some((v) => String(v || "").toLowerCase().includes(s))) : list;
  }, [data, q, status]);
  // on a wide screen the first job is open by default; on a phone the list shows first
  const [wide, setWide] = useState(true);
  useEffect(() => { const f = () => setWide(window.innerWidth >= 992); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const sel = rows.find((o) => o.jobId === selId) || (wide && !selId ? rows[0] : null) || null;
  useEffect(() => { if (focusJob && rows.some((x) => x.jobId === focusJob)) setTimeout(() => document.getElementById(`ov-item-${focusJob}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150); }, [focusJob, rows]);

  const reserveAll = async (job) => {
    let ok = 0, skipped = 0;
    for (const l of job.lines) {
      const left = l.qty - (l.issued - l.returned) - l.reserved;
      if (!l.partId || left <= 0) continue;
      try { await runAction({ jobId: job.jobId, lineId: l.id, action: "reserve", qty: Math.min(left, Math.max(0, l.available)) || undefined }).unwrap(); ok += 1; } catch (_) { skipped += 1; }
    }
    Swal.fire({ icon: ok ? "success" : "info", title: ok ? `${ok} part${ok === 1 ? "" : "s"} reserved` : "Nothing could be reserved", text: skipped ? `${skipped} part${skipped === 1 ? "" : "s"} skipped (no stock available).` : undefined });
  };
  const enterPrice = async (x, jobNo) => {
    const r = await Swal.fire({
      title: `Quotation · ${jobNo}`, text: x.description, input: "number", inputLabel: "Quoted price (LKR)", inputValue: x.quotedPrice || "",
      inputAttributes: { min: 0, step: "any" }, showCancelButton: true, confirmButtonText: "Save price",
      inputValidator: (v) => (!(Number(v) > 0) ? "Enter a valid price" : undefined),
    });
    if (!r.isConfirmed) return;
    try { await answerQuote({ id: x.id, price: r.value, note: x.quotedNote || "" }).unwrap(); }
    catch (ex) { Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not save the price.", icon: "error" }); }
  };

  // numbers of one job
  const calc = (o) => {
    const jq = quotesByJob[o.jobId] || [];
    let need = 0, issued = 0, reserved = 0, toIssue = 0;
    for (const l of o.lines) { const net = Math.max(0, l.issued - l.returned); need += l.qty; issued += Math.min(net, l.qty); reserved += l.reserved; toIssue += Math.max(0, l.qty - net); }
    const waitingQ = jq.filter((x) => x.status !== "QUOTED").length;
    return { jq, need, issued, reserved, toIssue, waitingQ, pct: need > 0 ? Math.round((issued / need) * 100) : 0 };
  };
  const todo = useMemo(() => ({ jobs: rows.length, quotes: rows.reduce((s, o) => s + calc(o).waitingQ, 0), parts: rows.reduce((s, o) => s + o.lines.filter((l) => l.qty - (l.issued - l.returned) > 0).length, 0) }), [rows, quotesByJob]); // eslint-disable-line react-hooks/exhaustive-deps

  const S = sel ? calc(sel) : null;
  const next = !sel ? null
    : S.waitingQ > 0 ? { tone: "warn", icon: "mdi:tag-text-outline", text: `${S.waitingQ} third-party quotation${S.waitingQ === 1 ? "" : "s"} need a price` }
    : S.toIssue > 0 ? { tone: "info", icon: "mdi:package-up", text: `${sel.lines.filter((l) => l.qty - (l.issued - l.returned) > 0).length} part(s) waiting to be issued to the technician` }
    : sel.lines.length > 0 ? { tone: "ok", icon: "mdi:check-circle-outline", text: "All parts are issued. Nothing more to do here." }
    : { tone: "none", icon: "mdi:information-outline", text: "No parts on this job yet." };

  return (
    <Panel
      title={<>Spare part orders <Badge bg="secondary" pill>{rows.length}</Badge></>}
      icon="mdi:clipboard-list-outline"
    >
      <div className="ov-root">
      <div className="ov-tabs" role="tablist" aria-label="Spare part order groups">
        {TABS.map((t) => {
          const n = data.filter((o) => t.match(stateOf(o))).length;
          return (
            <button key={t.k} type="button" role="tab" aria-selected={status === t.k} title={t.hint} className={`ov-tab ${status === t.k ? "on" : ""}`} onClick={() => { setStatus(t.k); setSelId(null); }}>
              <Icon icon={t.icon} width="17" height="17" /><span>{t.label}</span><b>{n}</b>
            </button>
          );
        })}
      </div>
      <style>{`
        .ov-root { --ov-red: #111827; --ov-red-d: #000000; --ov-ink: #111827; }
        .ov-root .btn-primary { background: var(--ov-red); border-color: var(--ov-red); color: #fff; } .ov-root .btn-primary:hover, .ov-root .btn-primary:focus, .ov-root .btn-primary:active { background: var(--ov-red-d) !important; border-color: var(--ov-red-d) !important; }
        .ov-root .btn-outline-primary { color: var(--ov-red); border-color: var(--ov-red); background: #fff; } .ov-root .btn-outline-primary:hover, .ov-root .btn-outline-primary:active { background: var(--ov-red) !important; border-color: var(--ov-red) !important; color: #fff !important; }
        .ov-root .btn-outline-secondary { color: #111827; border-color: #9ca3af; } .ov-root .btn-outline-secondary:hover { background: #111827; border-color: #111827; color: #fff; }
        .ov-root .text-primary { color: var(--ov-red) !important; } .ov-root .bg-primary { background: var(--ov-ink) !important; }
        .ov-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .ov-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 0 0 10px; margin-bottom: 4px; scrollbar-width: none; border-bottom: 1px solid #e5e7eb; }
        .ov-tabs::-webkit-scrollbar { display: none; }
        .ov-tab { display: inline-flex; align-items: center; gap: 7px; flex: 0 0 auto; padding: 8px 14px; border-radius: 999px; border: 1.5px solid #d6d9de; background: #fff; color: #374151; font-weight: 600; font-size: .88rem; white-space: nowrap; transition: all .15s; }
        .ov-tab b { min-width: 22px; padding: 1px 7px; border-radius: 999px; background: #eef0f3; color: #111827; font-size: .76rem; text-align: center; }
        .ov-tab:hover { border-color: #111827; }
        .ov-tab.on { background: #111827; border-color: #111827; color: #fff; box-shadow: inset 0 -3px 0 #c8102e; } .ov-tab.on b { background: #fff; color: #111827; }
        @media (max-width: 575px) { .ov-tab { padding: 7px 11px; font-size: .82rem; } .ov-tab svg { display: none; } }
        .ov-kpi { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; }
        .ov-kpi .ic { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 38px; }
        .ov-kpi b { font-size: 1.25rem; line-height: 1.1; display: block; } .ov-kpi small { color: #6b7280; }
        .ov-kpi.k1 .ic { background: #111827; color: #fff; } .ov-kpi.k2 .ic { background: #e5e7eb; color: #111827; } .ov-kpi.k3 .ic { background: #e5e7eb; color: #111827; }
        .ov-split { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 16px; align-items: start; }
        .ov-list { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; position: sticky; top: 8px; }
        .ov-search { padding: 10px; border-bottom: 1px solid #eef0f3; position: relative; } .ov-search svg { position: absolute; left: 20px; top: 19px; color: #9ca3af; }
        .ov-search input { padding-left: 32px; }
        .ov-scroll { max-height: calc(100vh - 330px); min-height: 200px; overflow-y: auto; }
        .ov-item { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid #f1f3f5; background: #fff; padding: 11px 14px 11px 12px; border-left: 4px solid transparent; cursor: pointer; }
        .ov-item:hover { background: #f8fafc; } .ov-item.on { background: #f3f4f6; border-left-color: #111827; }
        .ov-item .t1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .ov-plate { font-weight: 700; font-size: .74rem; letter-spacing: .04em; padding: 0 7px; border: 1.5px solid #374151; border-radius: 5px; background: #fefce8; color: #111827; }
        .ov-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: 0 0 10px; background: #94a3b8; }
        .ov-dot.progress { background: #111827; } .ov-dot.waiting { background: #f59e0b; } .ov-dot.done { background: #16a34a; } .ov-dot.approval { background: #eab308; } .ov-dot.issue { background: #2563eb; }
        .ov-mini { height: 5px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin-top: 7px; } .ov-mini span { display: block; height: 100%; background: #16a34a; }
        .ov-detail { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .ov-top { padding: 16px 18px; display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #111827, #1f2937); border-bottom: 4px solid #6b7280; color: #fff; }
        .ov-top .plate { font-weight: 800; letter-spacing: .06em; padding: 1px 10px; border-radius: 6px; background: #fef08a; color: #111827; border: 2px solid #111827; font-size: .95rem; }
        .ov-top small { color: #d1d5db; }
        .ov-next { display: flex; align-items: center; gap: 10px; padding: 10px 18px; font-weight: 600; }
        .ov-next.warn { background: #fef3c7; color: #92400e; } .ov-next.info { background: #e5e7eb; color: #111827; } .ov-next.ok { background: #dcfce7; color: #166534; } .ov-next.none { background: #f1f5f9; color: #475569; }
        .ov-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 18px 4px; }
        .ov-tile { border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px; background: #f8fafc; } .ov-tile small { color: #6b7280; display: block; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; } .ov-tile b { font-size: 1.05rem; }
        .ov-sec { padding: 12px 18px 16px; }
        .ov-h { display: flex; align-items: center; gap: 8px; font-weight: 700; margin: 6px 0 10px; } .ov-h .cnt { background: #111827; color: #fff; border-radius: 999px; padding: 0 9px; font-size: .78rem; }
        .ov-back { display: none; }
        .pr-group { font-weight: 700; font-size: .78rem; text-transform: uppercase; letter-spacing: .04em; color: #475569; margin: 4px 0 6px; } .pr-group.extra { color: #b45309; }
        .pr-box { border-radius: 10px; padding: 8px; margin-bottom: 10px; background: #f8fafc; border: 1px solid #e5e7eb; } .pr-box.extra { background: #fffbeb; border-color: #fcd34d; }
        .pr-row { display: grid; grid-template-columns: minmax(160px, 2fr) minmax(170px, 2fr) minmax(120px, 1fr) 80px auto; gap: 8px 14px; align-items: center; background: #fff; border: 1px solid #e5e7eb; border-left: 5px solid #94a3b8; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
        .pr-box .pr-row:last-child { margin-bottom: 0; }
        .pr-row.tone-green { border-left-color: #16a34a; } .pr-row.tone-blue { border-left-color: #111827; } .pr-row.tone-red { border-left-color: #f59e0b; }
        .pr-name { font-weight: 600; overflow-wrap: anywhere; } .pr-sub { font-size: .76rem; color: #6b7280; }
        .pr-bar { height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; display: flex; } .pr-iss { background: #16a34a; } .pr-res { background: #111827; }
        .pr-nums { font-size: .8rem; margin-top: 4px; color: #374151; }
        .pr-pill { display: inline-block; font-size: .74rem; font-weight: 600; padding: 2px 10px; border-radius: 999px; background: #f1f5f9; color: #475569; }
        .pr-pill.green { background: #dcfce7; color: #166534; } .pr-pill.blue { background: #e5e7eb; color: #111827; } .pr-pill.red { background: #fef3c7; color: #92400e; }
        .pr-act { text-align: right; }
        .ov-q { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #d1d5db; border-left: 5px solid #111827; border-radius: 10px; background: #f9fafb; margin-bottom: 8px; } .ov-q.waiting { border-color: #fde68a; border-left-color: #f59e0b; background: #fffbeb; }
        .so-actions { white-space: nowrap; } .so-more::after { display: none !important; } .so-mi { display: flex !important; align-items: center; gap: 10px; white-space: nowrap; padding: 8px 14px; } .so-mi-i { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: 0 0 20px; } .dropdown-menu { z-index: 1080; }
        @media (max-width: 991.98px) {
          .ov-split { grid-template-columns: 1fr; } .ov-list { position: static; } .ov-scroll { max-height: none; }
          .ov-split.has-sel .ov-list { display: none; } .ov-split:not(.has-sel) .ov-detail { display: none; } .ov-back { display: inline-flex; }
          .ov-tiles { grid-template-columns: 1fr 1fr; } .ov-sec, .ov-tiles { padding-left: 12px; padding-right: 12px; }
          .pr-row { grid-template-columns: 1fr 1fr; } .pr-main, .pr-qty { grid-column: 1 / -1; } .pr-act { text-align: left; } .pr-price { text-align: right; }
        }
        @media (max-width: 575.98px) { .ov-kpis { grid-template-columns: 1fr; } }
      `}</style>

      {isLoading ? <Loader /> : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load orders.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>
      ) : (
        <>
          <div className="ov-kpis">
            <div className="ov-kpi k1"><span className="ic"><Icon icon="mdi:car-wrench" width="22" height="22" /></span><div><b>{todo.jobs}</b><small>Jobs in this list</small></div></div>
            <div className="ov-kpi k2"><span className="ic"><Icon icon="mdi:package-up" width="22" height="22" /></span><div><b>{todo.parts}</b><small>Parts still to issue</small></div></div>
            <div className="ov-kpi k3"><span className="ic"><Icon icon="mdi:tag-text-outline" width="22" height="22" /></span><div><b>{todo.quotes}</b><small>Quotations to answer</small></div></div>
          </div>

          <div className={`ov-split ${sel ? "has-sel" : ""}`}>
            {/* ---- job list ---- */}
            <div className="ov-list">
              <div className="ov-search">
                <Icon icon="mdi:magnify" width="18" height="18" />
                <FormControl size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job, vehicle, customer" />
              </div>
              <div className="ov-scroll">
                {rows.length === 0 ? <div className="p-4"><Empty text={q ? "No orders match your search" : "No spare part orders here"} icon="mdi:clipboard-text-outline" /></div> : rows.map((o) => {
                  const st = stateOf(o), c = calc(o);
                  return (
                    <button type="button" key={o.jobId} id={`ov-item-${o.jobId}`} className={`ov-item ${sel?.jobId === o.jobId ? "on" : ""}`} onClick={() => setSelId(o.jobId)}>
                      <div className="t1"><span className="fw-bold">{o.jobNo}</span><span className="ov-plate">{o.regNo || "-"}</span></div>
                      <div className="small text-truncate mt-1">{o.customerName || "-"}</div>
                      <div className="d-flex align-items-center gap-2 mt-1 small text-muted"><span className={`ov-dot ${st}`} /><span className="text-truncate">{STATE_TXT[st]}</span>
                        {c.waitingQ > 0 && <Badge bg="dark" pill className="ms-auto">{c.waitingQ} quote{c.waitingQ === 1 ? "" : "s"}</Badge>}</div>
                      <div className="mt-1"><ApprovalBadge o={o} /></div>
                      {c.need > 0 && <div className="ov-mini" title={`${c.issued} of ${c.need} issued`}><span style={{ width: `${c.pct}%` }} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---- selected job ---- */}
            {sel && (
              <div className="ov-detail">
                <div className="ov-top">
                  <div>
                    <Button size="sm" variant="light" className="ov-back align-items-center gap-1 mb-2" onClick={() => setSelId(null) || setWide(false)}><Icon icon="mdi:arrow-left" width="16" height="16" /> All jobs</Button>
                    <div className="d-flex align-items-center gap-3 flex-wrap"><span className="fs-5 fw-bold">{sel.jobNo}</span><span className="plate">{sel.regNo || "-"}</span></div>
                    <small>{sel.customerName || "-"} · {sel.department || "-"}</small>
                  </div>
                  <div className="text-end"><StatusBadge status={STATE_TXT[stateOf(sel)]} /><div className="mt-1"><ApprovalBadge o={sel} /></div><div className="mt-1 small" style={{ color: "#d1d5db" }}>Quoted total <b className="text-white">LKR {money(sel.total)}</b></div></div>
                </div>
                <div className={`ov-next ${next.tone}`}><Icon icon={next.icon} width="22" height="22" /> {next.text}</div>
                <div className="ov-tiles">
                  <div className="ov-tile"><small>Parts</small><b>{sel.lines.length}</b></div>
                  <div className="ov-tile"><small>Reserved</small><b>{qtyFmt(S.reserved)}</b></div>
                  <div className="ov-tile"><small>Issued</small><b>{qtyFmt(S.issued)} / {qtyFmt(S.need)}</b></div>
                  <div className="ov-tile"><small>Issued value</small><b>LKR {money(sel.issuedValue)}</b></div>
                </div>

                <div className="ov-sec">
                  <div className="ov-h"><Icon icon="mdi:cog-transfer-outline" width="20" height="20" className="text-primary" /> Spare parts <span className="cnt">{sel.lines.length}</span>
                    {sel.lines.length > 0 && <Button size="sm" variant="outline-primary" className="ms-auto d-inline-flex align-items-center gap-1" onClick={() => reserveAll(sel)}><Icon icon="mdi:lock-outline" width="16" height="16" /> Reserve all available</Button>}</div>
                  {sel.lines.length === 0 ? <div className="text-muted small">No parts added yet.</div> : (
                    [...new Set(sel.lines.map((l) => l.extraSeq || 0))].sort((x, y) => x - y).map((seq) => (
                      <div key={seq} className={`pr-box ${seq ? "extra" : ""}`}>
                        {(seq > 0 || sel.lines.some((l) => l.extraSeq)) && <div className={`pr-group ${seq ? "extra" : ""}`}>{seq ? `Extra Job Scope #${seq}` : "Main job"}</div>}
                        {sel.lines.filter((l) => (l.extraSeq || 0) === seq).map((l) => <PartRow key={l.id} o={sel} l={l} onAct={setAct} />)}
                      </div>
                    ))
                  )}
                  {sel.lines.length > 0 && <div className="text-end small mt-2">Issued parts value (goes to the invoice): <strong>LKR {money(sel.issuedValue)}</strong></div>}

                  {S.jq.length > 0 && (
                    <>
                      <div className="ov-h mt-4"><Icon icon="mdi:storefront-outline" width="20" height="20" style={{ color: "#111827" }} /> Third-party quotations <span className="cnt" style={{ background: "#111827", color: "#fff" }}>{S.jq.length}</span></div>
                      {S.jq.map((x) => (
                        <div key={x.id} className={`ov-q ${x.status === "QUOTED" ? "" : "waiting"}`}>
                          {x.photoUrl ? <a href={x.photoUrl} target="_blank" rel="noreferrer"><img src={x.photoUrl} alt="Part" className="rounded" style={{ width: 52, height: 52, objectFit: "cover" }} /></a> : <Icon icon="mdi:image-off-outline" width="36" height="36" className="text-muted" />}
                          <div className="flex-grow-1" style={{ minWidth: 170 }}>
                            <div>{x.description}{x.extraSeq ? <Badge bg="warning" text="dark" className="ms-2">Extra #{x.extraSeq}</Badge> : null}</div>
                            <small className="text-muted">Requested {when(x.createdAt)}{x.quotedNote ? ` · ${x.quotedNote}` : ""}</small>
                          </div>
                          <div className="text-end"><StatusBadge status={x.status === "QUOTED" ? "Quoted" : "Waiting for price"} />{x.quotedPrice != null && <div className="fw-bold text-success mt-1">LKR {money(x.quotedPrice)}</div>}</div>
                          <Button size="sm" variant={x.status === "QUOTED" ? "outline-success" : "warning"} onClick={() => enterPrice(x, sel.jobNo)}>{x.status === "QUOTED" ? "Change price" : "Enter price"}</Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
      {act && <LineActionModal job={act.job} line={act.line} action={act.action} onClose={() => setAct(null)} />}
    </Panel>
  );
}