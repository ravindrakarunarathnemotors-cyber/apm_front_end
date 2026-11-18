"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Form, FormControl, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetEmployeesQuery } from "@/store/features/apiSlice";
import {
  useAddInternalCheckItemMutation,
  useGetInternalCheckItemsQuery,
  useGetInternalCheckQuery,
  useSaveInternalCheckMutation,
  useUpdateInternalCheckItemMutation,
} from "./internalCheckApi";
import { usePermissions } from "./permissionsApi";

// Wash "Internal Inspection 2": vacuum cleaning and inspection checklist, restrictions, "Is everything good?" Yes / No and the signature of the Head (select + drawn).
// Props: jobId (null = closed), onHide, onSaved?({ jobId, stageCompleted })

// hand-drawn signature (mouse / finger / pen). onChange(dataUrl | "")
function SignaturePad({ onChange, disabled }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [inked, setInked] = useState(false);
  const pos = (e) => {
    const c = ref.current, r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111827";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext("2d");
    const [x, y] = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setInked(true);
    onChange(ref.current.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setInked(false);
    onChange("");
  };
  return (
    <div>
      <canvas
        ref={ref} width={600} height={160}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        style={{ width: "100%", height: 130, border: "1px dashed #94a3b8", borderRadius: 8, background: "#fff", touchAction: "none", cursor: disabled ? "not-allowed" : "crosshair" }}
      />
      <div className="d-flex justify-content-between align-items-center mt-1">
        <span className="small text-muted">{inked ? "Signature captured" : "Sign inside the box (mouse, finger or pen)"}</span>
        <Button size="sm" variant="outline-secondary" disabled={disabled || !inked} onClick={clear}><Icon icon="mdi:eraser" width="16" height="16" /> Clear</Button>
      </div>
    </div>
  );
}

// Searchable dropdown of the employees: type to filter by name / employee no / designation, click to pick.
function EmployeePicker({ value, onChange, employees, disabled, placeholder = "Select the Head" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");          // what is typed while searching
  const [typing, setTyping] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setTyping(false); } };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const q = (typing ? text : "").trim().toLowerCase();
  const list = employees.filter((e) => !q || [e.name, e.no, e.designation].some((v) => String(v || "").toLowerCase().includes(q)));
  const pick = (e) => { onChange(e.name); setOpen(false); setTyping(false); setText(""); };

  return (
    <div ref={boxRef} className="position-relative">
      <div className="input-group">
        <span className="input-group-text bg-white"><Icon icon="mdi:account-hard-hat-outline" width="20" height="20" /></span>
        <FormControl
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={typing ? text : value}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setTyping(true); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter" && list.length === 1) { e.preventDefault(); pick(list[0]); } if (e.key === "Escape") { setOpen(false); setTyping(false); } }}
        />
        {value && !disabled && (
          <Button variant="outline-secondary" aria-label="Clear" onClick={() => { onChange(""); setText(""); setTyping(false); }}><Icon icon="mdi:close" width="18" height="18" /></Button>
        )}
        <Button variant="outline-secondary" disabled={disabled} aria-label="Open list" onClick={() => setOpen(!open)}><Icon icon={open ? "mdi:chevron-up" : "mdi:chevron-down"} width="20" height="20" /></Button>
      </div>
      {open && !disabled && (
        <div className="position-absolute w-100 bg-white border rounded-3 shadow mt-1" style={{ zIndex: 1055, maxHeight: 240, overflowY: "auto" }}>
          {list.length === 0 && <div className="p-3 text-muted small">No employee found{q ? ` for "${text.trim()}"` : ""}.</div>}
          {list.map((e) => (
            <button key={e.key} type="button" className={`d-flex align-items-center gap-2 w-100 text-start border-0 px-3 py-2 ${e.name === value ? "bg-primary-subtle" : "bg-white"}`} onClick={() => pick(e)}>
              <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-body-tertiary flex-shrink-0 fw-semibold" style={{ width: 30, height: 30, fontSize: 12 }}>{String(e.name || "?").trim().slice(0, 1).toUpperCase()}</span>
              <span className="flex-grow-1">
                <span className="d-block fw-semibold lh-sm">{e.name}</span>
                <span className="small text-muted">{[e.designation, e.no].filter(Boolean).join(" · ")}</span>
              </span>
              {e.name === value && <Icon icon="mdi:check" width="18" height="18" className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const groupItems = (items) => {
  const groups = [];
  items.forEach((i) => {
    const name = i.groupName || "";
    let g = groups.find((x) => x.name === name);
    if (!g) { g = { name, items: [] }; groups.push(g); }
    g.items.push(i);
  });
  return groups;
};

/* ----------------------------- edit the checklist (add / rename / remove) ----------------------------- */
function ManageItems({ department, onHide }) {
  const { data, isLoading, isError, error } = useGetInternalCheckItemsQuery(department.id, { refetchOnMountOrArgChange: true });
  const [addItem, { isLoading: adding }] = useAddInternalCheckItemMutation();
  const [updateItem] = useUpdateInternalCheckItemMutation();
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const groups = [...new Set(items.map((i) => i.groupName).filter(Boolean))];

  const fail = (ex, msg) => Swal.fire({ title: "Failed", text: ex?.data?.message || msg, icon: "error" });
  const add = async () => {
    if (!name.trim()) return;
    try {
      await addItem({ departmentId: department.id, name, groupName: group }).unwrap();
      setName("");
    } catch (ex) { fail(ex, "Could not add the item."); }
  };

  return (
    <Modal show onHide={onHide} centered scrollable size="lg" backdrop="static" style={{ zIndex: 1065 }}>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5"><Icon icon="mdi:playlist-edit" width="24" height="24" /> Edit checklist · {department.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        <div className="bg-white border rounded-3 p-3 mb-3">
          <div className="fw-bold mb-2">Add an item</div>
          <div className="d-flex flex-wrap gap-2">
            <FormControl style={{ flex: "2 1 220px" }} placeholder="Item (e.g. Boot lining vacuumed)" value={name} maxLength={300}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <FormControl style={{ flex: "1 1 160px" }} placeholder="Group (optional)" list="ic-groups" value={group} maxLength={100} onChange={(e) => setGroup(e.target.value)} />
            <datalist id="ic-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
            <Button variant="dark" onClick={add} disabled={adding || !name.trim()}>
              <Icon icon="mdi:plus" width="20" height="20" /> {adding ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>

        {isLoading && <div className="text-center text-muted py-3"><Spinner animation="border" size="sm" className="me-2" />Loading...</div>}
        {isError && <Alert variant="danger">{error?.data?.message || "Could not load the checklist."}</Alert>}
        <div className="d-grid gap-2">
          {items.map((i) => (
            <ItemRow key={`${i.id}-${i.name}-${i.groupName}-${i.isActive}`} item={i} busy={busy} setBusy={setBusy} updateItem={updateItem} fail={fail} />
          ))}
        </div>
        <div className="small text-muted mt-3">
          Rename = alternate an item. Remove hides it from new inspections (jobs already inspected keep what was ticked).
        </div>
      </Modal.Body>
      <Modal.Footer><Button variant="light" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}

function ItemRow({ item, busy, setBusy, updateItem, fail }) {
  const [name, setName] = useState(item.name);
  const [group, setGroup] = useState(item.groupName || "");
  const dirty = name.trim() !== item.name || group.trim() !== (item.groupName || "");
  const run = async (patch, msg) => {
    setBusy(true);
    try { await updateItem({ id: item.id, ...patch }).unwrap(); } catch (ex) { fail(ex, msg); } finally { setBusy(false); }
  };
  return (
    <div className={`d-flex flex-wrap align-items-center gap-2 bg-white border rounded-3 p-2 px-3 ${item.isActive ? "" : "opacity-75"}`}>
      <FormControl size="sm" style={{ flex: "2 1 220px" }} value={name} maxLength={300} disabled={!item.isActive} onChange={(e) => setName(e.target.value)} aria-label="Item" />
      <FormControl size="sm" style={{ flex: "1 1 140px" }} value={group} maxLength={100} disabled={!item.isActive} placeholder="Group" onChange={(e) => setGroup(e.target.value)} aria-label="Group" />
      {item.isActive ? (
        <>
          <Button size="sm" variant="dark" disabled={!dirty || busy || !name.trim()} onClick={() => run({ name, groupName: group }, "Could not save.")}>Save</Button>
          <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => run({ isActive: false }, "Could not remove.")}><Icon icon="mdi:delete-outline" width="18" height="18" /> Remove</Button>
        </>
      ) : (
        <>
          <Badge bg="secondary">Removed</Badge>
          <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => run({ isActive: true }, "Could not restore.")}>Add back</Button>
        </>
      )}
    </div>
  );
}

/* ----------------------------- the form ----------------------------- */
function InternalForm({ data, onHide, onSaved }) {
  const { job, items, saved, canRecord, locked } = data;
  const { can } = usePermissions();
  const canEditList = can("internalcheck.manage");

  const [checked, setChecked] = useState(() => items.filter((i) => i.checked).map((i) => i.id));
  const [allGood, setAllGood] = useState(saved?.allGood ?? null); // true | false | null
  const [restrictions, setRestrictions] = useState(saved?.restrictions || "");
  const [signName, setSignName] = useState(saved?.signedByName || "");
  const [signature, setSignature] = useState("");
  const { data: employeeRows = [] } = useGetEmployeesQuery();
  const people = employeeRows
    .filter((e) => e.status !== "Resigned")
    .map((e) => ({ key: e.dbId, name: e.name, no: e.id, designation: e.designation }))
    .sort((a, b) => (/leader|supervisor/i.test(b.designation || "") - /leader|supervisor/i.test(a.designation || "")) || String(a.name).localeCompare(String(b.name)));
  const signedAlready = Boolean(saved?.signedAt);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [save, { isLoading: saving }] = useSaveInternalCheckMutation();
    const errRef = useRef(null);

  const validIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const done = checked.filter((id) => validIds.has(id)).length;
  const total = items.length;
  const all = total > 0 && done === total;
  const readOnly = !canRecord;
  const busy = saving;

  useEffect(() => { if (tick) errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [tick]);

  const fail = (m) => { setError(m); setTick((t) => t + 1); };
  const toggle = (id) => { setError(""); setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); };
  const setAll = (on) => { setError(""); setChecked(on ? items.map((i) => i.id) : []); };

  const submit = async (complete) => {
    setError("");
    if (complete) {
      if (!all) return fail("Tick every item of the checklist to complete the inspection.");
      if (allGood === false) return fail("Something is not good. Fix it, clean again, then change the answer to Yes.");
      if (allGood !== true) return fail("Select Yes or No for “Is everything good?”.");
      if (!signName.trim()) return fail("Select the Head.");
      if (!signature && !saved?.signatureImage) return fail("The Head must draw the signature.");
    }
    try {
      const res = await save({
        jobId: job.id, checkedItemIds: checked.filter((id) => validIds.has(id)), restrictions, allGood,
        signedByName: signName, signatureImage: complete && signature ? signature : undefined, complete,
      }).unwrap();
      await Swal.fire({
        title: complete ? "Internal inspection completed!" : "Saved",
        text: complete ? (res.stageCompleted ? `${job.jobNo} moved to the next stage.` : "Updated.") : "You can complete it later.",
        icon: "success", timer: 1600, showConfirmButton: false,
      });
      onSaved?.({ jobId: job.id, stageCompleted: Boolean(res.stageCompleted) });
      onHide();
    } catch (ex) {
      fail(ex?.data?.message || "Failed to save the inspection.");
    }
  };

  return (
    <>
      <style>{`
        .jc-card { background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; box-shadow: 0 4px 14px -10px rgba(15,23,42,.45); }
        .jc-title { font-weight: 800; letter-spacing: .04em; text-transform: uppercase; font-size: .85rem; color: #111; display: flex; align-items: center; gap: 8px; }
        .jc-title svg { color: #c8102e; }
        .jc-group { font-weight: 700; font-size: .78rem; text-transform: uppercase; color: #6b7280; letter-spacing: .05em; margin: 12px 0 6px; }
        .jc-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; min-height: 52px; padding: 8px 14px; margin-bottom: 8px; border: 2px solid #e3e3e6; border-radius: 12px; background: #fff; transition: all .12s; }
        .jc-row:hover:not(:disabled) { border-color: #111; }
        .jc-row.on { border-color: #16a34a; background: #f0fdf4; }
        .jc-box { width: 26px; height: 26px; border-radius: 8px; border: 2px solid #9ca3af; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
        .jc-row.on .jc-box { background: #16a34a; border-color: #16a34a; }
        .jc-label { font-weight: 600; color: #111; flex: 1; }
        .jc-full { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 12px; border: 2px solid #e3e3e6; background: #fafafa; }
        .jc-full.on { border-color: #16a34a; background: #f0fdf4; }
        .tc-yn { display: flex; gap: 10px; }
        .tc-yn button { flex: 1; min-height: 52px; border-radius: 12px; border: 2px solid #d4d4d8; background: #fff; font-weight: 800; letter-spacing: .04em; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .12s; }
        .tc-yn button:hover:not(:disabled) { border-color: #111; }
        .tc-yn button.yes.on { background: #16a34a; border-color: #16a34a; color: #fff; }
        .tc-yn button.no.on { background: #f59e0b; border-color: #f59e0b; color: #111; }
      `}</style>
      <Modal.Body className="bg-light">
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <span className="d-inline-flex px-3 py-1 fw-bolder" style={{ background: "#facc15", border: "2px solid #111", borderRadius: 8, letterSpacing: ".08em", fontSize: "1.1rem" }}>{job.regNo}</span>
          <div className="me-auto">
            <div className="fw-bold">{job.jobNo}</div>
            <div className="small text-muted">{job.customerName}</div>
          </div>
          {saved?.signedAt && <Badge bg="success" className="py-2 px-3"><Icon icon="mdi:check-decagram" width="16" height="16" /> Signed by {saved.signedByName}</Badge>}
        </div>

        {locked && <Alert variant="info" className="py-2">This inspection is signed. Only the administrator can change it.</Alert>}
        {!locked && !canRecord && <Alert variant="info" className="py-2">This job has not reached this stage yet.</Alert>}
        {error && <Alert ref={errRef} variant="danger" className="py-2" dismissible onClose={() => setError("")}>{error}</Alert>}

        {/* Vacuum cleaning and inspection checklist */}
        <div className="jc-card">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <div className="jc-title me-auto"><Icon icon="mdi:clipboard-check-outline" width="20" height="20" /> Vacuum Cleaning and Inspection</div>
            {!readOnly && (
              <>
                <Button size="sm" variant="outline-dark" onClick={() => setAll(!all)}>{all ? "Clear all" : "Tick all"}</Button>
                {canEditList && (
                  <Button size="sm" variant="dark" onClick={() => setShowEdit(true)}>
                    <Icon icon="mdi:playlist-edit" width="18" height="18" /> Edit checklist
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <ProgressBar now={total ? (done / total) * 100 : 0} variant={all ? "success" : "dark"} style={{ height: 8, flex: 1 }} />
            <span className="small fw-bold">{done} / {total}</span>
          </div>
          {total === 0 && <Alert variant="warning" className="py-2 small mb-0">No items in the checklist yet.{canEditList ? " Use “Edit checklist” to add them." : ""}</Alert>}
          {groupItems(items).map((g) => (
            <div key={g.name || "_"}>
              {g.name && <div className="jc-group">{g.name}</div>}
              {g.items.map((i) => {
                const on = checked.includes(i.id);
                return (
                  <button key={i.id} type="button" className={`jc-row ${on ? "on" : ""}`} disabled={readOnly} onClick={() => toggle(i.id)} aria-pressed={on}>
                    <span className="jc-box">{on && <Icon icon="mdi:check-bold" width="18" height="18" />}</span>
                    <span className="jc-label">{i.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Restrictions */}
        <div className="jc-card">
          <div className="jc-title mb-2"><Icon icon="mdi:alert-circle-outline" width="20" height="20" /> Restrictions</div>
          <FormControl as="textarea" rows={3} maxLength={2000} disabled={readOnly} placeholder="Anything that could not be cleaned or fixed (stains, damage, missing items...) — leave empty if none" value={restrictions} onChange={(e) => { setError(""); setRestrictions(e.target.value); }} />
        </div>

        {/* Is everything good? */}
        <div className="jc-card">
          <div className="jc-title mb-2"><Icon icon="mdi:thumb-up-outline" width="20" height="20" /> Is everything good?</div>
          <div className="tc-yn">
            <button type="button" className={`yes ${allGood === true ? "on" : ""}`} disabled={readOnly} onClick={() => { setError(""); setAllGood(true); }}>
              <Icon icon="mdi:check-circle-outline" width="22" height="22" /> YES
            </button>
            <button type="button" className={`no ${allGood === false ? "on" : ""}`} disabled={readOnly} onClick={() => { setError(""); setAllGood(false); }}>
              <Icon icon="mdi:close-circle-outline" width="22" height="22" /> NO
            </button>
          </div>
          {allGood === false && <Alert variant="warning" className="mt-3 mb-0 py-2 small">Not everything is good. The job stays in this stage: clean again, then change the answer to Yes. Describe the problem in Restrictions and save.</Alert>}
        </div>

        {/* Signature of the Head */}
        <div className="jc-card">
          <div className="jc-title mb-2"><Icon icon="mdi:draw-pen" width="20" height="20" /> Signature of Head</div>
          <div className="mb-2"><EmployeePicker value={signName} onChange={(v) => { setSignName(v); setError(""); }} employees={people} disabled={readOnly} placeholder="Select the Head" /></div>
          {signedAlready && saved?.signatureImage && !signature && (
            <div className="mb-2">
              <img src={saved.signatureImage} alt="Head signature" style={{ maxWidth: "100%", height: 100, border: "1px solid #e3e3e6", borderRadius: 8, background: "#fff" }} />
              {!readOnly && <div className="small text-muted mt-1">Draw below to replace the signature.</div>}
            </div>
          )}
          {(!signedAlready || !readOnly) && <SignaturePad onChange={(v) => { setSignature(v); setError(""); }} disabled={readOnly} />}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" className="cm-cancel" onClick={onHide} disabled={busy}>Cancel</Button>
        {!readOnly && (
          <>
            <Button variant="outline-success" onClick={() => submit(false)} disabled={busy}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="success" onClick={() => submit(true)} disabled={busy}>
              <Icon icon="mdi:check-circle-outline" width="20" height="20" /> Complete inspection
            </Button>
          </>
        )}
      </Modal.Footer>

      {showEdit && <ManageItems department={{ id: job.departmentId, name: job.departmentName }} onHide={() => setShowEdit(false)} />}
    </>
  );
}

/* ----------------------------- the window ----------------------------- */
export default function WashInternalInspectionModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error, refetch } = useGetInternalCheckQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  return (
    <Modal show={Boolean(jobId)} onHide={onHide} size="xl" fullscreen="xl-down" scrollable centered backdrop="static" dialogClassName="cm-modal">
      <style>{`
        @media (min-width: 992px) { .modal-dialog.cm-modal { --bs-modal-width: 860px; } }
        .cm-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px -18px rgba(0,0,0,.6); }
        .cm-modal .cm-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .cm-modal .modal-body { background: #f6f6f7 !important; padding: 18px 22px; }
        .cm-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; padding: 12px 22px; }
        .cm-modal .btn-outline-success { color: #111; border: 1.5px solid #111; border-radius: 12px; font-weight: 600; background: #fff; min-height: 46px; padding: 0 20px; }
        .cm-modal .btn-outline-success:hover { color: #fff; background: #111; border-color: #111; }
        .cm-modal .modal-footer .btn-success { color: #fff !important; border: 0 !important; border-radius: 12px; font-weight: 700; min-height: 46px; padding: 0 22px; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: inset 0 -3px 0 #c8102e, 0 8px 18px -8px rgba(0,0,0,.6); }
        .cm-modal .cm-cancel { border-radius: 12px; min-height: 46px; padding: 0 20px; font-weight: 600; background: #fff; color: #111; border: 1.5px solid #c4c4ca; }
        .cm-modal .form-control { border-radius: 12px; border: 1.5px solid #c4c4ca; min-height: 46px; }
        .cm-modal .form-control:focus { border-color: #c8102e; box-shadow: 0 0 0 4px rgba(200,16,46,.15); }
        .cm-modal .form-check-input:checked { background-color: #16a34a; border-color: #16a34a; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="cm-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-2 text-white">
          <Icon icon="mdi:car-seat" width="28" height="28" />
          Internal Inspection 2
          {data && <span className="fw-normal small" style={{ color: "rgba(255,255,255,.75)" }}>· {data.job.departmentName}</span>}
        </Modal.Title>
      </Modal.Header>

      {isLoading && <Modal.Body className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</Modal.Body>}
      {isError && (
        <Modal.Body>
          <Alert variant="danger" className="d-flex justify-content-between align-items-center mb-0">
            <span>{error?.data?.message || "Failed to load the internal inspection."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        </Modal.Body>
      )}
      {data && <InternalForm key={data.job.id} data={data} onHide={onHide} onSaved={onSaved} />}
    </Modal>
  );
}