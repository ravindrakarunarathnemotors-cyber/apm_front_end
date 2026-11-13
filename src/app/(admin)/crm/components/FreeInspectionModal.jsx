"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, FormControl, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetEmployeesQuery } from "@/store/features/apiSlice";
import { useCompleteFreeInspectionMutation, useGetFreeInspectionQuery } from "./freeInspectionApi";

// Free Inspection Schedule (the stage after "Delivery Review"):
//   a. Explain why this is important (Done / Not yet), Customer willingness (Yes / Not now),
//   Schedule (date, time, department) when Yes, Department Head signature  ->  GREAT JOB.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })

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
function EmployeePicker({ value, onChange, employees, disabled, placeholder = "Select the Department Head" }) {
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


/* ----------------------------- the "GREAT JOB" celebration (confetti + fanfare + animated popup) ----------------------------- */
function confetti(ms = 3800) {
  try {
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3000";
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = window.innerWidth * dpr; c.height = window.innerHeight * dpr;
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const colors = ["#c8102e", "#facc15", "#16a34a", "#2563eb", "#f97316", "#a855f7", "#ffffff", "#111111"];
    const make = (x, y, vx, vy) => ({ x, y, vx, vy, w: (6 + Math.random() * 8) * dpr, h: (4 + Math.random() * 6) * dpr, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, color: colors[(Math.random() * colors.length) | 0], life: 1 });
    const parts = [];
    for (let i = 0; i < 110; i++) {           // two bursts from the bottom corners
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const sp = (14 + Math.random() * 14) * dpr;
      parts.push(make(0, H, Math.cos(a - 0.5) * sp * 0.9, Math.sin(a) * sp));
      parts.push(make(W, H, -Math.cos(a - 0.5) * sp * 0.9, Math.sin(a) * sp));
    }
    for (let i = 0; i < 90; i++) parts.push(make(Math.random() * W, -Math.random() * H * 0.5, (Math.random() - 0.5) * 3 * dpr, (2 + Math.random() * 4) * dpr)); // rain from the top
    const t0 = performance.now();
    const tick = (now) => {
      const el = now - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.38 * dpr; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (ms - el) / 900));
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (el < ms) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  } catch (_) { /* the celebration is only decoration */ }
}

function fanfare() {
  try {
    if (localStorage.getItem("notif_muted") === "1") return; // the same mute switch as the notifications
  } catch (_) { /* ignore */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.4], [1318.5, 0.58]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.45);
      o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.5);
    });
    setTimeout(() => ctx.close?.(), 1600);
  } catch (_) { /* ignore */ }
}

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function celebrate({ regNo, jobNo, line }) {
  confetti(); fanfare();
  return Swal.fire({
    html: `
      <style>
        .gj { padding: 6px 4px 2px; }
        .gj-ico { font-size: 76px; line-height: 1; animation: gjPop .7s cubic-bezier(.2,1.6,.4,1) both, gjWiggle 1.6s ease-in-out .7s infinite; display: inline-block; }
        .gj-title { margin: 6px 0 4px; font-size: 2.6rem; font-weight: 900; letter-spacing: .06em; background: linear-gradient(90deg,#c8102e,#f97316,#facc15,#c8102e); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: gjPop .6s .15s cubic-bezier(.2,1.6,.4,1) both, gjShine 2.2s linear infinite; }
        .gj-reg { display: inline-block; padding: 2px 14px; background: #facc15; border: 2px solid #111; border-radius: 8px; font-weight: 800; letter-spacing: .1em; animation: gjPop .5s .35s both; }
        .gj-job { margin-top: 6px; color: #6b7280; font-weight: 600; animation: gjPop .5s .45s both; }
        .gj-line { margin-top: 12px; font-size: 1.05rem; color: #111; animation: gjPop .5s .55s both; }
        @keyframes gjPop { 0% { transform: scale(.2); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes gjWiggle { 0%,100% { transform: rotate(-6deg) scale(1); } 50% { transform: rotate(6deg) scale(1.08); } }
        @keyframes gjShine { to { background-position: -250% 0; } }
      </style>
      <div class="gj">
        <div class="gj-ico">🏆</div>
        <div class="gj-title">GREAT JOB!</div>
        ${regNo ? `<div class="gj-reg">${esc(regNo)}</div>` : ""}
        ${jobNo ? `<div class="gj-job">${esc(jobNo)}</div>` : ""}
        ${line ? `<div class="gj-line">${esc(line)}</div>` : ""}
      </div>`,
    showConfirmButton: false, timer: 4200, timerProgressBar: true, width: 520,
    didOpen: (el) => { el.style.zIndex = 2000; },
  });
}

export default function FreeInspectionModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetFreeInspectionQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [complete, { isLoading: completing }] = useCompleteFreeInspectionMutation();
  const { data: employeeRows = [] } = useGetEmployeesQuery();
  const people = employeeRows
    .filter((e) => e.status !== "Resigned")
    .map((e) => ({ key: e.dbId, name: e.name, no: e.id, designation: e.designation }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const [explained, setExplained] = useState(null);   // true = Done, false = Not yet
  const [willing, setWilling] = useState(null);       // "YES" | "NOT_NOW"
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [deptId, setDeptId] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState("");

  const job = data?.job;
  const h = data?.header;
  const done = Boolean(h?.completedAt);
  const locked = !data?.canRecord;
  const today = new Date().toISOString().slice(0, 10);
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });

  const submit = async () => {
    if (explained !== true) return fail("Explain why this is important to the customer first (Done).");
    if (!willing) return fail("Select the customer willingness: Yes / Not now.");
    if (willing === "YES") {
      if (!date) return fail("Select the schedule date.");
      if (!time) return fail("Select the schedule time.");
      if (!deptId) return fail("Select the schedule department.");
    }
    if (!signerName.trim()) return fail("Select the Department Head.");
    if (people.length > 0 && !people.some((p) => p.name === signerName.trim())) return fail("Select the Department Head from the list.");
    if (!signature) return fail("The Department Head must draw the signature.");
    try {
      const r = await complete({ jobId, explained, willing, schedDate: date, schedTime: time, schedDepartmentId: deptId ? Number(deptId) : undefined, signerName, signatureImage: signature }).unwrap();
      await celebrate({
        regNo: job?.regNo, jobNo: job?.jobNo,
        line: willing === "YES" ? `Free inspection booked for ${date} at ${time}. Thank you!` : "All done. Thank you!",
      });
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { fail(ex?.data?.message || "Could not complete the stage."); }
  };

  const choice = (value, current, set, label, icon, tone) => (
    <button key={label} type="button" disabled={locked} className={`fi-choice ${current === value ? tone : ""}`} onClick={() => set(value)}><Icon icon={icon} width="18" height="18" /> {label}</button>
  );

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load this stage."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="fi-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}

        {done ? (
          <>
            <div className="fi-great"><Icon icon="mdi:party-popper" width="34" height="34" /> <div><div className="fw-bold fs-4">GREAT JOB</div><div className="small">{new Date(h.completedAt).toLocaleString()}</div></div></div>
            <div className="fi-card">
              <div className="fi-title"><Icon icon="mdi:calendar-check-outline" width="20" height="20" /> Free inspection</div>
              <div>a. Explained why this is important: <b>{h.explained ? "Done" : "Not yet"}</b></div>
              <div>Customer willingness: <b>{h.willing === "YES" ? "Yes" : "Not now"}</b></div>
              {h.willing === "YES" && <div>Schedule: <b>{h.schedDate} {h.schedTime} · {h.schedDepartmentName}</b></div>}
              {h.signedByName && <div className="mt-2 small">Department Head: {h.signedByName}</div>}
              {h.signatureImage && <img src={h.signatureImage} alt="Department Head signature" style={{ maxWidth: "100%", height: 90, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, marginTop: 6 }} />}
            </div>
          </>
        ) : (
          <>
            <div className="fi-card">
              <div className="fi-title"><Icon icon="mdi:message-text-outline" width="20" height="20" /> a. Explain why this is important</div>
              <div className="d-flex flex-wrap gap-2">{[choice(true, explained, setExplained, "Done", "mdi:check", "yes"), choice(false, explained, setExplained, "Not yet", "mdi:clock-outline", "no")]}</div>
            </div>
            <div className="fi-card">
              <div className="fi-title"><Icon icon="mdi:account-heart-outline" width="20" height="20" /> Customer willingness</div>
              <div className="d-flex flex-wrap gap-2">{[choice("YES", willing, setWilling, "Yes", "mdi:check", "yes"), choice("NOT_NOW", willing, setWilling, "Not now", "mdi:close", "no")]}</div>
            </div>
            {willing === "YES" && (
              <div className="fi-card">
                <div className="fi-title"><Icon icon="mdi:calendar-clock-outline" width="20" height="20" /> Schedule</div>
                <div className="row g-2">
                  <div className="col-sm-4"><Form.Label className="small fw-semibold mb-1">Date</Form.Label><Form.Control type="date" min={today} disabled={locked} value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div className="col-sm-4"><Form.Label className="small fw-semibold mb-1">Time</Form.Label><Form.Control type="time" disabled={locked} value={time} onChange={(e) => setTime(e.target.value)} /></div>
                  <div className="col-sm-4">
                    <Form.Label className="small fw-semibold mb-1">Department</Form.Label>
                    <Form.Select disabled={locked} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                      <option value="">Select</option>
                      {data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Form.Select>
                  </div>
                </div>
              </div>
            )}
            <div className="fi-card">
              <div className="fi-title"><Icon icon="mdi:draw-pen" width="20" height="20" /> Department Head signature</div>
              <div className="mb-2"><EmployeePicker value={signerName} onChange={setSignerName} employees={people} placeholder="Select the Department Head" /></div>
              <SignaturePad onChange={setSignature} />
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="fi-blur" dialogClassName="fi-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.fi-modal { --bs-modal-width: 720px; } }
        .modal-backdrop.fi-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.fi-blur.show { opacity: 1; }
        .fi-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .fi-modal .fi-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .fi-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .fi-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .fi-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .fi-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .fi-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .fi-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .fi-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 24px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
        .fi-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .fi-choice.no { border-color: #d97706; background: #fffbeb; color: #92400e; }
        .fi-great { display: flex; align-items: center; gap: 14px; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; color: #fff; background: linear-gradient(135deg,#052e16,#15803d 60%,#22c55e); }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="fi-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:calendar-check-outline" width="30" height="30" />
          <span>Free Inspection Schedule{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <Button variant="success" disabled={completing} onClick={submit}>{completing ? <Spinner size="sm" /> : <Icon icon="mdi:check-circle-outline" />} Complete stage</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}