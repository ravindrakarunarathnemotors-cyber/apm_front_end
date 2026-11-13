"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { usePermissions } from "./permissionsApi";
import { useCompleteWashDeliveryMutation, useGetWashDeliveryQuery, useSaveWashDeliveryMutation, useSendWashDeliveryOtpMutation, useVerifyWashDeliveryOtpMutation, useOverrideWashDeliveryOtpMutation } from "./washDeliveryApi";

// the reasons offered when the vehicle is released without the OTP (edit this list to add more)
const OVERRIDE_REASONS = [
  "SMS not received (network problem)",
  "SMS gateway / service is down",
  "Customer phone is switched off or out of coverage",
  "Customer's mobile number is wrong or changed",
  "Customer forgot or lost the phone",
  "Vehicle collected by an authorised person (identity checked)",
];

// Wash Delivery Review (the stage after "Delivery Arrangement"): a. payment review ... f. future needs, the OTP sent to the customer to release the vehicle,
// then "Are you all done?"  Yes -> JOB Done Confirmed  /  Need to recheck.
// Props: jobId, onHide, onSaved?({ jobId, stageCompleted })
export default function WashDeliveryReviewModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError } = useGetWashDeliveryQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [saveDraft, { isLoading: saving }] = useSaveWashDeliveryMutation();
  const [complete, { isLoading: completing }] = useCompleteWashDeliveryMutation();
  const [sendOtp, { isLoading: sending }] = useSendWashDeliveryOtpMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyWashDeliveryOtpMutation();
  const [override, { isLoading: overriding }] = useOverrideWashDeliveryOtpMutation();
  const { can } = usePermissions();
  const canOverride = can("washdelivery.override");
  const [code, setCode] = useState("");
  const [otherOn, setOtherOn] = useState(false);   // send the OTP to another number
  const [otherPhone, setOtherPhone] = useState("");
  const [wait, setWait] = useState(0);   // seconds until the OTP can be sent again
  const [checks, setChecks] = useState([]);
  const [answer, setAnswer] = useState(null);   // "YES" | "RECHECK"
  const [note, setNote] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    setChecks(data.header.checks || []); setAnswer(data.header.answer || null); setNote(data.header.note || "");
  }, [data]);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const job = data?.job;
  const otp = data?.otp;
  const otpOk = Boolean(otp?.verifiedAt);
  const done = Boolean(data?.header?.completedAt);
  const locked = !data?.canRecord;
  const items = data?.items || [];
  const ticked = items.filter((x) => checks.includes(x.key)).length;
  const toggle = (k) => !locked && setChecks((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  const fail = (m) => Swal.fire({ title: "Please check", text: m, icon: "error", confirmButtonColor: "#111" });
  const letter = (key) => key.toLowerCase();

  const submit = async () => {
    if (!answer) return fail("Select Yes or Need to recheck.");
    if (answer === "RECHECK") {
      if (!note.trim()) return fail("Enter what must be rechecked.");
      try { await saveDraft({ jobId, checks, answer, note }).unwrap(); Swal.fire({ title: "Saved", text: "The stage stays open until everything is cleared.", icon: "info", timer: 1800, showConfirmButton: false }); } catch (ex) { fail(ex?.data?.message || "Could not save."); }
      return;
    }
    if (ticked < items.length) return fail(`Tick all the items first (${items.length - ticked} left).`);
    if (!otpOk) return fail("Send the OTP to the customer and verify it to release the vehicle.");
    const c = await Swal.fire({ title: "JOB Done Confirmed?", text: "The delivery review completes.", icon: "question", showCancelButton: true, confirmButtonText: "Confirm", confirmButtonColor: "#15803d" });
    if (!c.isConfirmed) return;
    try {
      const r = await complete({ jobId, checks, answer: "YES" }).unwrap();
      onSaved?.({ jobId, stageCompleted: Boolean(r.stageCompleted) });
      onHide();
    } catch (ex) { fail(ex?.data?.message || "Could not complete."); }
  };

  const doSend = async () => {
    try {
      if (otherOn && !otherPhone.trim()) return fail("Type the mobile number.");
      const r = await sendOtp({ jobId, phone: otherOn ? otherPhone.trim() : undefined }).unwrap();
      setCode(""); setWait(data?.resendSeconds || 60);
      Swal.fire({ title: "OTP sent", text: `The code was sent to ${r.sentTo}. It is valid for ${r.expiresInMinutes} minutes.`, icon: "success", timer: 2200, showConfirmButton: false });
    } catch (ex) {
      if (ex?.data?.waitSeconds) setWait(ex.data.waitSeconds);
      fail(ex?.data?.message || "Could not send the OTP.");
    }
  };
  const doOverride = async () => {
    const res = await Swal.fire({
      title: "Release without OTP?",
      html: `
        <div style="text-align:left;font-size:.9rem">
          <div style="margin-bottom:10px;color:#555">Use this only when the OTP cannot be used. Your name, the time and the reason are recorded.</div>
          <label style="font-weight:600;display:block;margin-bottom:4px">Reason</label>
          <select id="ov-reason" class="swal2-select" style="width:100%;margin:0 0 10px;font-size:.95rem">
            <option value="">Select a reason...</option>
            ${OVERRIDE_REASONS.map((x) => `<option value="${x}">${x}</option>`).join("")}
            <option value="__other">Other (type below)</option>
          </select>
          <label style="font-weight:600;display:block;margin-bottom:4px">Note <span style="font-weight:400;color:#777">(required for Other)</span></label>
          <textarea id="ov-note" class="swal2-textarea" maxlength="400" placeholder="e.g. checked the NIC of the person who collected the vehicle" style="width:100%;margin:0;font-size:.9rem"></textarea>
        </div>`,
      focusConfirm: false, showCancelButton: true, confirmButtonText: "Release the vehicle", confirmButtonColor: "#c8102e",
      preConfirm: () => {
        const sel = document.getElementById("ov-reason").value;
        const note = document.getElementById("ov-note").value.trim();
        if (!sel) { Swal.showValidationMessage("Select a reason"); return false; }
        if (sel === "__other" && note.length < 5) { Swal.showValidationMessage("Type the reason (at least 5 characters)"); return false; }
        return sel === "__other" ? note : (note ? `${sel} - ${note}` : sel);
      },
    });
    if (!res.isConfirmed) return;
    try { await override({ jobId, reason: res.value }).unwrap(); Swal.fire({ title: "Released", text: "Recorded as released without OTP.", icon: "success", timer: 1600, showConfirmButton: false }); }
    catch (ex) { fail(ex?.data?.message || "Could not release the vehicle."); }
  };
  const doVerify = async () => {
    if (!/^\d{6}$/.test(code)) return fail("Enter the 6 digit code the customer received.");
    try { await verifyOtp({ jobId, code }).unwrap(); setCode(""); Swal.fire({ title: "Verified", text: "The vehicle can be released.", icon: "success", timer: 1500, showConfirmButton: false }); }
    catch (ex) { fail(ex?.data?.message || "Could not verify the code."); }
  };

  const body = () => {
    if (isLoading) return <div className="text-center py-5"><Spinner /></div>;
    if (isError) return <Alert variant="danger">{loadError?.data?.message || "Could not load this stage."}</Alert>;
    if (!data) return null;
    return (
      <>
        <div className="dr-job">
          <div><div className="small text-muted">Job</div><b>{job.jobNo}</b></div>
          <div><div className="small text-muted">Vehicle</div><b>{job.regNo}</b></div>
          <div><div className="small text-muted">Customer</div><b>{job.customerName}</b></div>
        </div>
        {data.payment && (
          <div className={`d-flex flex-wrap align-items-center gap-2 mb-3 p-2 px-3 rounded-3 ${data.payment.status === "PAID" ? "bg-success-subtle" : "bg-warning-subtle"}`}>
            <Icon icon="mdi:cash-check" width="22" height="22" />
            <span className="fw-semibold">Payment · {data.payment.invoiceNo}</span>
            <span className="ms-auto small">Rs. {Number(data.payment.paid).toLocaleString()} / Rs. {Number(data.payment.total).toLocaleString()} · <b>{data.payment.status}</b></span>
          </div>
        )}
        {done && <Alert variant="success" className="d-flex align-items-center gap-2"><Icon icon="mdi:check-decagram" width="24" height="24" /> JOB Done Confirmed · {new Date(data.header.completedAt).toLocaleString()}</Alert>}
        {!done && !data.canRecord && <Alert variant="info">This job has not reached this stage yet.</Alert>}
        <div className="d-flex align-items-center gap-3 mb-3">
          <ProgressBar now={items.length ? (ticked / items.length) * 100 : 0} variant="success" style={{ flex: 1, height: 10 }} />
          <span className="small fw-semibold">{ticked} / {items.length}</span>
        </div>
        <div className="dr-card">
          <div className="dr-title"><Icon icon="mdi:clipboard-check-outline" width="20" height="20" /> Delivery checklist</div>
          {items.map((x) => (
            <label key={x.key} className={`dr-row ${checks.includes(x.key) ? "on" : ""} ${locked ? "lock" : ""}`}>
              <Form.Check type="checkbox" disabled={locked} checked={checks.includes(x.key)} onChange={() => toggle(x.key)} />
              <span className="dr-l">{letter(x.key)}.</span><span style={{ flex: 1 }}>{x.label}</span>
            </label>
          ))}
        </div>
        <div className="dr-card">
          <div className="dr-title"><Icon icon="mdi:message-lock-outline" width="20" height="20" /> Send OTP to release the vehicle</div>
          {otpOk ? (
            otp.overrideAt ? (
              <div className="p-2 px-3 rounded-3 bg-warning-subtle">
                <div className="fw-semibold d-flex align-items-center gap-2"><Icon icon="mdi:shield-alert-outline" width="22" height="22" /> Released without OTP · {new Date(otp.overrideAt).toLocaleString()}</div>
                <div className="small mt-1" style={{ whiteSpace: "pre-wrap" }}>Reason: {otp.overrideReason}</div>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2 text-success fw-semibold"><Icon icon="mdi:check-decagram" width="22" height="22" /> OTP verified · {new Date(otp.verifiedAt).toLocaleString()}</div>
            )
          ) : (
            <>
              <div className="small text-muted mb-2">
                A 6 digit code is sent by SMS to the customer{data.customerPhone ? ` (${data.customerPhone})` : ""}. The customer gives it when the vehicle is received.
              </div>
              <label className="d-flex align-items-center gap-2 mb-2 small fw-semibold">
                <input type="checkbox" className="form-check-input mt-0" disabled={locked} checked={otherOn} onChange={(e) => setOtherOn(e.target.checked)} />
                Send to another mobile number (the customer's number is wrong / changed)
              </label>
              {otherOn && <Form.Control className="mb-2" style={{ maxWidth: 240 }} inputMode="tel" placeholder="07XXXXXXXX" maxLength={15} disabled={locked} value={otherPhone} onChange={(e) => setOtherPhone(e.target.value.replace(/[^\d+\s-]/g, ""))} />}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Button variant="dark" disabled={locked || sending || wait > 0} onClick={doSend}>
                  {sending ? <Spinner size="sm" /> : <Icon icon="mdi:send-outline" width="18" height="18" />} {otp ? "Send again" : "Send OTP"}{wait > 0 ? ` (${wait}s)` : ""}
                </Button>
                {otp && (
                  <>
                    <Form.Control style={{ maxWidth: 170, letterSpacing: ".3em", textAlign: "center", fontWeight: 700 }} inputMode="numeric" maxLength={6} placeholder="000000" disabled={locked} value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && doVerify()} />
                    <Button variant="outline-dark" disabled={locked || verifying || code.length !== 6} onClick={doVerify}>
                      {verifying ? <Spinner size="sm" /> : <Icon icon="mdi:shield-check-outline" width="18" height="18" />} Verify
                    </Button>
                  </>
                )}
              </div>
              {canOverride && !locked && (
                <div className="mt-3 pt-2 border-top">
                  <Button variant="outline-danger" size="sm" disabled={overriding} onClick={doOverride}>
                    <Icon icon="mdi:shield-off-outline" width="18" height="18" /> OTP not received? Release without OTP
                  </Button>
                </div>
              )}
              {otp && <div className="small text-muted mt-2">Sent to {otp.sentTo} · valid until {new Date(otp.expiresAt).toLocaleTimeString()} · {otp.attemptsLeft} tries left</div>}
            </>
          )}
        </div>
        <div className="dr-card">
          <div className="dr-title"><Icon icon="mdi:help-circle-outline" width="20" height="20" /> Are you all done?</div>
          <div className="d-flex flex-wrap gap-2">
            {[["YES", "Yes", "mdi:check"], ["RECHECK", "Need to recheck", "mdi:close"]].map(([k, label, icon]) => (
              <button key={k} type="button" disabled={locked} className={`dr-choice ${answer === k ? (k === "YES" ? "yes" : "no") : ""}`} onClick={() => setAnswer(k)}><Icon icon={icon} width="18" height="18" /> {label}</button>
            ))}
          </div>
          {answer === "RECHECK" && (
            <div className="mt-3">
              <Form.Label className="small fw-semibold mb-1">What must be rechecked</Form.Label>
              <Form.Control as="textarea" rows={2} disabled={locked} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="sm-down" backdrop="static" enforceFocus={false} backdropClassName="dr-blur" dialogClassName="dr-modal">
      <style>{`
        @media (min-width: 768px) { .modal-dialog.dr-modal { --bs-modal-width: 700px; } }
        .modal-backdrop.dr-blur { background: rgba(15,15,20,.35); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .modal-backdrop.dr-blur.show { opacity: 1; }
        .dr-modal .modal-content { border: 0; border-radius: 18px; overflow: hidden; }
        .dr-modal .dr-head { background: linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%); color: #fff; border: 0; padding: 16px 22px; }
        .dr-modal .modal-body { background: #f6f6f7; padding: 18px 22px; }
        .dr-modal .modal-footer { background: #f6f6f7; border-top: 1px solid #e3e3e6; }
        .dr-modal .modal-footer .btn { min-height: 44px; border-radius: 12px; padding: 0 22px; }
        .dr-job { display: flex; flex-wrap: wrap; gap: 28px; background: #fff; border: 1px solid #e3e3e6; border-left: 5px solid #c8102e; border-radius: 14px; padding: 12px 16px; margin-bottom: 14px; }
        .dr-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; }
        .dr-title { font-size: .8rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #c8102e; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .dr-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid #e5e7eb; border-radius: 12px; cursor: pointer; background: #fff; transition: all .15s; }
        .dr-row:hover:not(.lock) { border-color: #9ca3af; }
        .dr-row.on { border-color: #16a34a; background: #f0fdf4; }
        .dr-row.lock { cursor: default; }
        .dr-row .form-check { margin: 0; min-height: 0; }
        .dr-l { width: 20px; color: #6b7280; font-weight: 600; }
        .dr-choice { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 22px; border-radius: 12px; border: 1.5px solid #d6d9de; background: #fff; font-weight: 700; }
        .dr-choice.yes { border-color: #16a34a; background: #f0fdf4; color: #14532d; }
        .dr-choice.no { border-color: #d97706; background: #fffbeb; color: #92400e; }
      `}</style>
      <Modal.Header closeButton closeVariant="white" className="dr-head">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3 text-white">
          <Icon icon="mdi:car-key" width="30" height="30" />
          <span>Delivery Review{job && <span className="fw-normal" style={{ color: "rgba(255,255,255,.75)" }}>{` / ${job.departmentName} Department`}</span>}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{body()}</Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} style={{ border: "1.5px solid #c4c4ca", fontWeight: 600 }}>Close</Button>
        {data?.canRecord && !done && (
          <Button variant={answer === "RECHECK" ? "warning" : "success"} disabled={saving || completing || !answer} onClick={submit}>
            {saving || completing ? <Spinner size="sm" /> : <Icon icon={answer === "RECHECK" ? "mdi:content-save-outline" : "mdi:check-circle-outline"} />} {answer === "RECHECK" ? "Save (recheck)" : "JOB Done Confirmed"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}