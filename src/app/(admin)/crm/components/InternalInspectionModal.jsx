"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Collapse, Form, FormControl, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useCompleteInternalInspectionMutation,
  useGetInternalInspectionQuery,
  useSaveInternalInspectionMutation,
  useSendInternalReminderMutation,
} from "./internalInspectionApi";

// Internal Inspection - 1 (the stage after "Customer Approval"): a confirmation checklist.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
const SECTION_UI = {
  PRE_REPAIR: { icon: "mdi:clipboard-check-outline", color: "#2563eb" },
  PPE: { icon: "mdi:shield-account-outline", color: "#dc2626" },
  VEHICLE_PROTECTION: { icon: "mdi:car-seat", color: "#7c3aed" },
  SPARE_PARTS: { icon: "mdi:cog-transfer-outline", color: "#ea580c" },
};
const letter = (n) => String.fromCharCode(97 + (n % 26));
const when = (v) => (v ? new Date(v).toLocaleString() : "");
const toWaNumber = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("94")) return d;
  return d.startsWith("0") ? `94${d.slice(1)}` : d;
};

function Card({ title, icon, color, summary, done, right, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-3 mb-3" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(15,23,42,.07)", borderLeft: `4px solid ${color}` }}>
      <div className="d-flex flex-wrap align-items-center gap-2 p-2 px-3" role="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{ background: open ? `color-mix(in srgb, ${color} 7%, white)` : "#fff", borderRadius: open ? "0.45rem 0.45rem 0 0" : "0.45rem" }}>
        <span className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ width: 36, height: 36, color, background: `color-mix(in srgb, ${color} 14%, white)` }}>
          <Icon icon={icon} width="20" height="20" />
        </span>
        <div className="me-auto" style={{ minWidth: 150 }}>
          <div className="fw-bold d-flex align-items-center gap-2">{title}{done && <Icon icon="mdi:check-circle" width="18" height="18" className="text-success" />}</div>
          {summary && <div className="small text-muted">{summary}</div>}
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
        <Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="22" height="22" className="text-muted flex-shrink-0" />
      </div>
      <Collapse in={open}><div><div className="p-3 border-top">{children}</div></div></Collapse>
    </div>
  );
}

// One tick row (big tap target)
function Row({ n, label, checked, onChange, disabled, onRemove }) {
  return (
    <label className={`d-flex align-items-center gap-3 border rounded-3 px-3 py-2 mb-2 w-100 ${checked ? "border-success bg-success-subtle" : "bg-white"}`} style={{ cursor: disabled ? "default" : "pointer" }}>
      <Form.Check.Input type="checkbox" className="mt-0" style={{ width: 20, height: 20 }} checked={checked} disabled={disabled} onChange={onChange} />
      <span className="text-muted">{letter(n)}.</span>
      <span className="flex-grow-1">{label}</span>
      {onRemove && !disabled && <button type="button" className="btn btn-sm btn-outline-danger" onClick={(e) => { e.preventDefault(); onRemove(); }}><Icon icon="mdi:delete-outline" width="16" height="16" /></button>}
    </label>
  );
}

export default function InternalInspectionModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch, isFetching } = useGetInternalInspectionQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveInternalInspectionMutation();
  const [complete, { isLoading: completing }] = useCompleteInternalInspectionMutation();
  const [remind, { isLoading: reminding }] = useSendInternalReminderMutation();

  const [checked, setChecked] = useState(null);     // array of item ids
  const [extras, setExtras] = useState([]);          // [{ section, label, checked }]
  const [notes, setNotes] = useState("");
  const [drafts, setDrafts] = useState({});          // new "more option" text per section
  const [error, setError] = useState("");
  const snapRef = useRef("");

  const job = data?.job;
  const readOnly = data && !data.canRecord;
  const snap = (c, e, n) => JSON.stringify({ c: [...c].sort(), e, n });

  useEffect(() => {
    if (!data || checked) return;
    const c = data.sections.flatMap((s) => s.items.filter((i) => i.checked).map((i) => i.id));
    const e = data.sections.flatMap((s) => s.extras.map((x) => ({ section: s.key, label: x.label, checked: x.checked })));
    setChecked(c); setExtras(e); setNotes(data.header.notes || "");
    snapRef.current = snap(c, e, data.header.notes || "");
  }, [data, checked]);

  const dirty = checked && snap(checked, extras, notes) !== snapRef.current;
  const toggleItem = (id) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleExtra = (i) => setExtras((x) => x.map((e, n) => (n === i ? { ...e, checked: !e.checked } : e)));
  const addExtra = (section) => {
    const t = (drafts[section] || "").trim();
    if (!t) return;
    setExtras((x) => [...x, { section, label: t, checked: false }]);
    setDrafts((d) => ({ ...d, [section]: "" }));
  };
  const selectAll = (s) => {
    const ids = s.items.map((i) => i.id);
    const all = ids.every((id) => checked.includes(id));
    setChecked((c) => (all ? c.filter((x) => !ids.includes(x)) : [...new Set([...c, ...ids])]));
    setExtras((x) => x.map((e) => (e.section === s.key ? { ...e, checked: !all } : e)));
  };

  const doSave = async () => {
    await save({ jobId, checkedItemIds: checked, extras, notes }).unwrap();
    snapRef.current = snap(checked, extras, notes);
  };
  const saveClick = async () => {
    setError("");
    try { await doSave(); Swal.fire({ title: "Saved", icon: "success", timer: 900, showConfirmButton: false }); } catch (ex) { setError(ex?.data?.message || "Could not save."); }
  };

  const total = data ? data.sections.reduce((n, s) => n + s.items.length, 0) + extras.length : 0;
  const done = checked ? data.sections.reduce((n, s) => n + s.items.filter((i) => checked.includes(i.id)).length, 0) + extras.filter((e) => e.checked).length : 0;

  const finish = async () => {
    setError("");
    const left = total - done;
    const ok = await Swal.fire({
      title: left ? `${left} item(s) are not confirmed` : "Complete Internal Inspection?",
      text: left ? "Complete the stage anyway?" : `${job.jobNo} moves to the next stage. The checklist can no longer be changed.`,
      icon: left ? "warning" : "question", showCancelButton: true, confirmButtonText: "Complete",
    });
    if (!ok.isConfirmed) return;
    try {
      await doSave();
      const r = await complete(jobId).unwrap();
      await Swal.fire({ title: "Done!", icon: "success", timer: 1200, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { setError(ex?.data?.message || "Could not complete the stage."); }
  };

  const tryClose = async () => {
    if (!dirty) return onHide();
    const r = await Swal.fire({ title: "Save your changes?", text: "You have changes that are not saved yet.", icon: "warning", showCancelButton: true, showDenyButton: true, confirmButtonText: "Save & close", denyButtonText: "Close without saving", cancelButtonText: "Stay" });
    if (r.isConfirmed) { try { await doSave(); onHide(); } catch (ex) { setError(ex?.data?.message || "Could not save."); } }
    else if (r.isDenied) onHide();
  };

  const logisticsReminder = async () => {
    setError("");
    try {
      await doSave();
      const r = await remind({ jobId, kind: "LOGISTICS" }).unwrap();
      Swal.fire({ title: "Reminder sent", text: r.sms?.sent ? "Sent to the Logistic & Spare parts division by SMS." : "Recorded for the Logistic & Spare parts division.", icon: "success", timer: 1800, showConfirmButton: false });
    } catch (ex) { setError(ex?.data?.message || "Could not send the reminder."); }
  };
  const customerReminder = async () => {
    setError("");
    try {
      await doSave();
      const phone = toWaNumber(job.contactNumber);
      const text = `Dear ${job.customerName}, please bring the spare parts for your vehicle ${job.regNo} (${job.jobNo}) so that we can continue the repair. Thank you.`;
      if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      await remind({ jobId, kind: "CUSTOMER" }).unwrap();
      if (!phone) Swal.fire({ title: "Recorded", text: "The customer has no mobile number, so WhatsApp was not opened. Remind the customer manually.", icon: "info" });
    } catch (ex) { setError(ex?.data?.message || "Could not send the reminder."); }
  };

  const body = () => {
    if (isLoading || (data && !checked)) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load the Internal Inspection."}</Alert>;
    if (!data) return null;
    const ap = data.approval;
    return (
      <>
        <div className="bg-white rounded-3 p-3 mb-3" style={{ border: "1px solid #e2e8f0" }}>
          <div className="d-flex flex-wrap gap-4 align-items-center">
            <div><div className="small text-muted">Job</div><div className="fw-bold">{job.jobNo}</div></div>
            <div><div className="small text-muted">Vehicle</div><div className="fw-bold">{job.regNo}</div></div>
            <div><div className="small text-muted">Customer</div><div className="fw-bold">{job.customerName}</div></div>
            <div className="ms-auto text-end" style={{ minWidth: 160 }}>
              <div className="small text-muted">{done} / {total} confirmed</div>
              <ProgressBar now={total ? (done / total) * 100 : 0} variant="success" style={{ height: 8 }} />
            </div>
          </div>
        </div>
        {readOnly && <Alert variant="info" className="py-2">{data.header.completedAt ? "This stage is completed. The checklist is read only." : "This job has not reached this stage yet."}</Alert>}

        {data.sections.map((s) => {
          const ui = SECTION_UI[s.key] || { icon: "mdi:clipboard-text-outline", color: "#2563eb" };
          const extra = extras.map((e, i) => ({ ...e, i })).filter((e) => e.section === s.key);
          const count = s.items.filter((i) => checked.includes(i.id)).length + extra.filter((e) => e.checked).length;
          const all = s.items.length + extra.length;
          return (
            <Card key={s.key} title={s.title} icon={ui.icon} color={ui.color} summary={`${count} / ${all} confirmed`} done={all > 0 && count === all}
              right={!readOnly && s.items.length > 0 && <Button size="sm" variant="outline-secondary" onClick={() => selectAll(s)}>{s.items.every((i) => checked.includes(i.id)) ? "Clear all" : "Confirm all"}</Button>}>
              {s.key === "PRE_REPAIR" && ap && (
                <div className="rounded-3 p-2 px-3 mb-3 small" style={{ background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                  <div className="fw-semibold mb-1">From Customer Approval</div>
                  <div>Estimated time: <b>{[ap.estHours ? `${ap.estHours} Hrs` : "", ap.estDays ? `${ap.estDays} Days` : ""].filter(Boolean).join(" / ") || "-"}</b></div>
                  <div>Confirmation: <b>{ap.decision === "TOTAL" ? "Total approved" : ap.decision === "PARTIAL" ? "Agreed scope only" : "-"}</b></div>
                  {ap.decision === "PARTIAL" && ap.agreedScope?.length > 0 && <ul className="mb-0 ps-3">{ap.agreedScope.map((x, n) => <li key={n}>{x}</li>)}</ul>}
                  {ap.extraNote && <div>Extra note: {ap.extraNote}</div>}
                </div>
              )}
              {s.items.map((i, n) => <Row key={i.id} n={n} label={i.label} checked={checked.includes(i.id)} disabled={readOnly} onChange={() => toggleItem(i.id)} />)}
              {extra.map((e, n) => (
                <Row key={`x${e.i}`} n={s.items.length + n} label={<>{e.label} <span className="badge text-bg-light border ms-1">added</span></>} checked={e.checked} disabled={readOnly}
                  onChange={() => toggleExtra(e.i)} onRemove={() => setExtras((x) => x.filter((_, k) => k !== e.i))} />
              ))}
              {!readOnly && (
                <div className="d-flex gap-2 mt-1">
                  <FormControl size="sm" maxLength={200} placeholder="Add another option" value={drafts[s.key] || ""} onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addExtra(s.key)} />
                  <Button size="sm" variant="outline-primary" onClick={() => addExtra(s.key)}><Icon icon="mdi:plus" width="16" height="16" /> Add</Button>
                </div>
              )}

              {s.key === "SPARE_PARTS" && (
                <div className="border rounded-3 p-3 mt-3" style={{ background: "#fffaf5" }}>
                  <div className="small mb-2">
                    Spare parts provided by: <b>{ap?.partsBy === "CLIENT" ? "the customer" : ap?.partsBy === "COMPANY" ? "the company" : "-"}</b>
                    {data.parts.length > 0 && <> · {data.parts.length} part(s) in the list</>}
                  </div>
                  {!readOnly && (
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <Button size="sm" variant="primary" disabled={reminding} onClick={logisticsReminder}><Icon icon="mdi:bell-ring-outline" width="16" height="16" /> Send reminder to Logistic and Spare parts division</Button>
                      {data.header.logisticsReminderAt && <span className="small text-success"><Icon icon="mdi:check-circle" width="16" height="16" /> Sent {when(data.header.logisticsReminderAt)}</span>}
                    </div>
                  )}
                  {ap?.partsBy === "CLIENT" && (
                    <div className="border-top mt-3 pt-3">
                      <div className="fw-semibold small mb-2">The customer brings the spare parts</div>
                      {!readOnly && (
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                          <Button size="sm" variant="success" disabled={reminding} onClick={customerReminder}><Icon icon="mdi:whatsapp" width="16" height="16" /> Send customer reminder to bring spare parts</Button>
                          {data.header.customerReminderAt && <span className="small text-success"><Icon icon="mdi:check-circle" width="16" height="16" /> Sent {when(data.header.customerReminderAt)}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        <Card title="Notes" icon="mdi:note-text-outline" color="#64748b" summary="Optional">
          <FormControl as="textarea" rows={2} maxLength={1000} disabled={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Card>
        {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
      </>
    );
  };

  return (
    <Modal show onHide={tryClose} size="xl" centered scrollable fullscreen="lg-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 44, height: 44, background: "#2563eb" }}>
            <Icon icon="mdi:clipboard-list-outline" width="26" height="26" />
          </span>
          <span>Internal Inspection - 1{job && <span className="text-muted fw-normal">{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: "#f1f5f9" }}>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" className="me-auto" disabled={isFetching} onClick={refetch}><Icon icon="mdi:refresh" width="16" height="16" /> Refresh</Button>
        <Button variant="outline-secondary" onClick={tryClose}>Close</Button>
        {data && !readOnly && checked && (
          <>
            <Button variant="outline-primary" disabled={saving || !dirty} onClick={saveClick}>{saving ? <Spinner size="sm" /> : <Icon icon="mdi:content-save-outline" width="18" height="18" />} Save</Button>
            <Button variant="success" disabled={completing || saving} onClick={finish}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" width="18" height="18" />} Complete stage</Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}