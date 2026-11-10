"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, ButtonGroup, Form, FormControl, FormSelect, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddEvidenceFileMutation,
  useGetJobEvidenceQuery,
  useCreateDamageReportLinkMutation,
  useGetDamageReportQuery,
  useSaveDamageReportMutation,
  useSetDamageReportDecisionMutation,
} from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";
import { checkPicked, newFileName, uploadToStorage } from "./evidenceUpload";

// Stage 8 · Vehicle Damages Report (can be skipped)
// Props: jobId (null = closed), onHide, onSaved?({ jobId, stageCompleted })

const ACTIONS = [
  ["REPAIR", "Repair"],
  ["DEEP_CHECK", "Deep check"],
  ["BOTH", "Both"],
];
const letter = (n) => `${String.fromCharCode(97 + (n % 26))}.`;

// Yes / No buttons
function YesNo({ value, onChange, disabled }) {
  return (
    <ButtonGroup size="sm">
      <Button variant={value === true ? "success" : "outline-secondary"} disabled={disabled} onClick={() => onChange(true)}>Yes</Button>
      <Button variant={value === false ? "danger" : "outline-secondary"} disabled={disabled} onClick={() => onChange(false)}>No</Button>
    </ButtonGroup>
  );
}

const Section = ({ title, hint, children, tone, action }) => (
  <div className={`border rounded-3 p-2 px-3 mb-2 ${tone || "bg-white"}`}>
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div className="fw-bold">{title}</div>
      {action}
    </div>
    {hint && <div className="small text-muted mb-2">{hint}</div>}
    {children}
  </div>
);

/* ---------- photos / videos of one damage: choose from the job's photos, or upload new ones ---------- */
function Thumb({ f, selected, onToggle, uploading, error }) {
  return (
    <div style={{ width: 96 }}>
      <div
        role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className={`position-relative rounded-2 overflow-hidden bg-dark ${selected ? "border border-3 border-primary" : "border"}`}
        style={{ width: 96, height: 96, cursor: "pointer", opacity: uploading ? 0.6 : 1 }}
      >
        {f.fileType === "VIDEO"
          ? <video src={f.fileUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
          : <img src={f.fileUrl} alt={f.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {f.fileType === "VIDEO" && <span className="position-absolute top-50 start-50 translate-middle text-white" style={{ textShadow: "0 0 6px #000" }}><Icon icon="mdi:play-circle" width="30" height="30" /></span>}
        {uploading && <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"><Spinner animation="border" size="sm" variant="light" /></div>}
        {selected && <span className="position-absolute top-0 end-0 m-1 badge bg-primary rounded-circle p-1"><Icon icon="mdi:check" width="14" height="14" /></span>}
      </div>
      {error && <div className="small text-danger">{error}</div>}
    </div>
  );
}

function DamageMediaPicker({ title, job, jobId, files, selectedIds, onChange, onUploaded, onHide }) {
  const [addFile] = useAddEvidenceFileMutation();
  const [queue, setQueue] = useState([]); // uploads in progress: { key, url, name, fileType, error }
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const galleryRef = useRef(null);
  const seq = useRef(0);
  const toggle = (id) => onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  const pick = (kind) => ({ photo: photoRef, video: videoRef, gallery: galleryRef })[kind].current?.click();

  const uploadOne = async (en) => {
    setQueue((q) => q.map((x) => (x.key === en.key ? { ...x, error: "" } : x)));
    try {
      const url = await uploadToStorage(en.file, en.name);
      const res = await addFile({ jobId, itemId: null, fileName: en.name, fileUrl: url, mimeType: en.file.type, size: en.file.size }).unwrap();
      onUploaded(res.file); // the new file joins the job's photos and is selected for this damage
      URL.revokeObjectURL(en.url);
      setQueue((q) => q.filter((x) => x.key !== en.key));
    } catch (ex) {
      setQueue((q) => q.map((x) => (x.key === en.key ? { ...x, error: ex?.data?.message || ex?.message || "Upload failed" } : x)));
    }
  };
  const onPicked = (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = "";
    const rejected = [];
    const entries = [];
    for (const file of list) {
      const why = checkPicked(file);
      if (why) { rejected.push(why); continue; }
      seq.current += 1;
      entries.push({ key: `u${Date.now()}-${seq.current}`, file, url: URL.createObjectURL(file), name: newFileName(job, file, files.length + seq.current), fileType: file.type.startsWith("video/") ? "VIDEO" : "IMAGE", error: "" });
    }
    if (rejected.length) Swal.fire({ title: "Some files were skipped", html: rejected.map((f) => `<div style="font-size:.9rem">${f}</div>`).join(""), icon: "warning" });
    if (!entries.length) return;
    setQueue((q) => [...q, ...entries]);
    (async () => { for (const en of entries) await uploadOne(en); })();
  };

  return (
    <div className="border border-primary rounded-3 p-2 mt-2 bg-light">
      <div className="d-flex justify-content-between align-items-center mb-1"><div className="fw-semibold small">Photos / videos · {title}</div><Button size="sm" variant="link" className="p-0" onClick={onHide}>Close</Button></div>
      <div>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div className="small text-muted">Tap a photo or video to attach it to this damage. Upload new ones if they are not here yet.</div>
          <div className="d-flex flex-wrap gap-1">
            <Button size="sm" variant="outline-primary" onClick={() => pick("photo")}><Icon icon="mdi:camera-outline" width="16" height="16" /> Photo</Button>
            <Button size="sm" variant="outline-primary" onClick={() => pick("video")}><Icon icon="mdi:video-outline" width="16" height="16" /> Video</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => pick("gallery")}><Icon icon="mdi:upload" width="16" height="16" /> Upload many</Button>
          </div>
        </div>
        {files.length === 0 && queue.length === 0 && (
          <div className="text-center text-muted py-4">
            No photos or videos found for this job yet. Use Photo, Video or Upload many.
            <div className="small mt-1">(If the Evidence stage already has photos, update the backend file damage_report.routes.js and restart.)</div>
          </div>
        )}
        <div className="d-flex flex-wrap gap-2">
          {queue.map((q) => (
            <div key={q.key}>
              <Thumb f={{ fileType: q.fileType, fileUrl: q.url, fileName: q.name }} uploading={!q.error} error={q.error} onToggle={() => {}} />
              {q.error && <a href="#retry" className="small" onClick={(ev) => { ev.preventDefault(); uploadOne(q); }}>Retry</a>}
            </div>
          ))}
          {files.map((f) => <Thumb key={f.id} f={f} selected={selectedIds.includes(f.id)} onToggle={() => toggle(f.id)} />)}
        </div>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPicked} />
        <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={onPicked} />
        <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPicked} />
      </div>
      <div className="d-flex justify-content-between align-items-center mt-2">
        <span className="small text-muted">{selectedIds.length} selected</span>
        <Button onClick={onHide} disabled={queue.some((q) => !q.error)}>Done</Button>
      </div>

    </div>
  );
}

export default function DamageReportModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isFetching, isError, error: loadError, refetch } = useGetDamageReportQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const evi = useGetJobEvidenceQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveDamageReportMutation();
  const [makeLink, { isLoading: linking }] = useCreateDamageReportLinkMutation();
  const [setDecision, { isLoading: deciding }] = useSetDamageReportDecisionMutation();

  const [damages, setDamages] = useState([{ description: "", fileIds: [] }]); // [{ description, fileIds }]
  const [extraFiles, setExtraFiles] = useState([]); // files uploaded in this window
  const [pickFor, setPickFor] = useState(null); // index of the damage whose photos / videos are being chosen
  const [showAsk, setShowAsk] = useState(false); // the customer questions appear after the damages are filled and the user continues
  const [needDeep, setNeedDeep] = useState(null);
  const [needRepair, setNeedRepair] = useState(null);
  const [agreed, setAgreed] = useState([{ description: "", action: "REPAIR" }]);
  const [serverError, setServerError] = useState("");
  const [touched, setTouched] = useState(false);

  // fill the form from the saved report (or from the damages found in stage 7)
  // (only once per opening - a later refresh must not wipe what the user is typing)
  const initRef = useRef(null);
  useEffect(() => {
    if (!data || isFetching || initRef.current === jobId) return;
    initRef.current = jobId;
    const r = data.report;
    const list = r?.damages?.length ? r.damages.map((d) => ({ description: d.description, fileIds: d.fileIds || [] })) : data.evidenceDamages?.length ? data.evidenceDamages.map((d) => ({ description: d, fileIds: [] })) : [{ description: "", fileIds: [] }];
    setDamages(list);
    setNeedDeep(r ? r.needDeepCheck : null);
    setNeedRepair(r ? r.needRepair : null);
    const act = r?.needDeepCheck && r?.needRepair ? "BOTH" : r?.needDeepCheck ? "DEEP_CHECK" : "REPAIR";
    setAgreed(r?.agreed?.length ? r.agreed.map((a) => ({ ...a })) : r && !r.skipped && list.some((d) => d.description.trim()) ? list.filter((d) => d.description.trim()).map((d) => ({ description: d.description, action: act })) : [{ description: "", action: "REPAIR" }]);
  }, [data]);

  const job = data?.job;
  const baseFiles = data?.files?.length ? data.files : evi.data?.files || [];
  const jobFiles = [...baseFiles, ...extraFiles.filter((x) => !baseFiles.some((f) => f.id === x.id))];
  const report = data?.report;
  const ui = getDepartmentUi(job?.departmentName || "Mechanical");
  const decided = Boolean(report?.decision);
  const askVisible = showAsk || Boolean(report?.confirmSentAt && !report?.skipped); // once the link has been sent, everything stays visible
  const readOnly = !data?.canRecord || decided;
  const needAny = needDeep === true || needRepair === true;

  const defaultAction = needDeep && needRepair ? "BOTH" : needDeep ? "DEEP_CHECK" : "REPAIR";
  // agreed list = the damages found (a, b, c ...), copied automatically; staff can edit them
  const agreedFromDamages = () => {
    const list = damages.filter((d) => d.description.trim()).map((d) => ({ description: d.description.trim(), action: defaultAction }));
    return list.length ? list : [{ description: "", action: defaultAction }];
  };
  useEffect(() => {
    if (needAny && agreed.every((a) => !a.description.trim()) && damages.some((d) => d.description.trim())) setAgreed(agreedFromDamages());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needAny]);

  // validation
  const problems = [];
  if (needDeep === null) problems.push("Answer: need damage deeply checked? (Yes / No)");
  if (needRepair === null) problems.push("Answer: need damage repaired? (Yes / No)");
  if (needAny && !agreed.some((a) => a.description.trim())) problems.push("Write what was agreed to do (a, b, c ...)");

  const submit = async () => {
    setTouched(true);
    setServerError("");
    if (problems.length) return;
    if (needAny && !report?.decision && !report?.confirmSentAt) {
      const w = await Swal.fire({
        title: "Link not sent yet",
        html: "The link has <b>not been sent</b> to the customer yet. The job moves to the next stage once the link is sent (the customer can confirm later).<br>Save the changes anyway?",
        icon: "warning", showCancelButton: true, confirmButtonText: "Save anyway", cancelButtonText: "Back", confirmButtonColor: "#d97706",
      });
      if (!w.isConfirmed) return;
    }
    try {
      const body = {
        jobId,
        skip: false,
        damages: damages.map((d) => ({ description: d.description.trim(), fileIds: d.fileIds })).filter((d) => d.description),
        needDeepCheck: needDeep,
        needRepair,
        agreed: needAny ? agreed.map((a) => ({ description: a.description.trim(), action: a.action })).filter((a) => a.description) : [],
      };
      const res = await save(body).unwrap();
      await Swal.fire({
        title: res.stageCompleted ? "Report saved!" : "Report saved",
        text: res.stageCompleted ? `${job.jobNo} moved to the next stage.` : "Send the link to the customer to move the job on.",
        icon: "success", timer: 1700, showConfirmButton: false,
      });
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) });
      onHide(); // close after every save
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the damages report.");
    }
  };

  // saves the whole form (damages, answers, agreed items); false = not saved (validation / server error)
  const persist = async () => {
    setTouched(true);
    setServerError("");
    if (problems.length) return false;
    try {
      await save({
        jobId, skip: false,
        damages: damages.map((d) => ({ description: d.description.trim(), fileIds: d.fileIds })).filter((d) => d.description),
        needDeepCheck: needDeep,
        needRepair,
        agreed: needAny ? agreed.map((a) => ({ description: a.description.trim(), action: a.action })).filter((a) => a.description) : [],
      }).unwrap();
      return true;
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the damages report.");
      return false;
    }
  };

  // step 1: save the damages (with their photos) and send the link to the customer; the questions below appear after that
  const sendDamagesLink = async () => {
    setServerError("");
    if (askVisible) { await sendConfirmLink(); return; } // already past this step: save the whole form (answers included) and resend
    try {
      await save({
        jobId, skip: false, needDeepCheck: null, needRepair: null, agreed: [],
        damages: damages.map((d) => ({ description: d.description.trim(), fileIds: d.fileIds })).filter((d) => d.description),
      }).unwrap();
      const res = await makeLink(jobId).unwrap();
      setShowAsk(true);
      await share({ title: "Customer link ready", path: res.path, text: `Vehicle damages report for ${job.regNo}` });
    } catch (ex) {
      setServerError(ex?.data?.message || "Could not send the link.");
    }
  };

  // "Skip this step": asks once, then saves the skip and the job moves to the next stage
  const doSkip = async () => {
    const ask = await Swal.fire({
      title: "Skip the Vehicle Damages Report?",
      text: `${job.jobNo} will move on to the next stage without a damages report.`,
      icon: "question", showCancelButton: true, confirmButtonText: "Yes, skip this step", cancelButtonText: "Cancel", confirmButtonColor: "#d97706",
    });
    if (!ask.isConfirmed) return;
    setServerError("");
    try {
      const res = await save({ jobId, skip: true }).unwrap();
      await Swal.fire({ title: "Step skipped", text: `${job.jobNo} moved to the next stage.`, icon: "success", timer: 1500, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) });
      onHide();
    } catch (ex) {
      setServerError(ex?.data?.message || "Could not skip this step.");
    }
  };

  // share a link: copied, can be opened or sent by WhatsApp
  const share = async ({ title, path, text }) => {
    const url = `${window.location.origin}${path}`;
    try { await navigator.clipboard.writeText(url); } catch (_) { /* clipboard may be blocked */ }
    const r = await Swal.fire({
      title,
      html: `<div style="word-break:break-all;font-size:.9rem">${url}</div><div class="text-muted mt-2" style="font-size:.8rem">The link is copied.</div>`,
      icon: "success", showCancelButton: true, showDenyButton: true,
      confirmButtonText: "Open page", denyButtonText: "Send by WhatsApp", cancelButtonText: "Close",
    });
    if (r.isConfirmed) window.open(path, "_blank", "noopener");
    if (r.isDenied) window.open(`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`, "_blank", "noopener");
  };

  const sendConfirmLink = async () => {
    if (!(await persist())) return; // the customer must see what is typed now
    try {
      const res = await makeLink(jobId).unwrap();
      await share({ title: "Confirmation link ready", path: res.path, text: `Please confirm the agreed work for ${job.regNo}` });
      if (res.stageCompleted) {
        // the link is sent: the job does not wait for the customer, it moves on to the next stage
        onSaved?.({ jobId, stageCompleted: true });
        onHide();
      }
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not create the link.", icon: "error" });
    }
  };

  // staff records the customer's answer (for example given by phone)
  const record = async (decision) => {
    if (decision && !(await persist())) return;
    let note = "";
    if (decision) {
      const r = await Swal.fire({
        title: decision === "CONFIRMED" ? "Customer confirmed?" : "Customer declined?",
        input: "text", inputLabel: "Note (optional) - e.g. confirmed by phone", inputAttributes: { maxlength: 500 },
        showCancelButton: true, confirmButtonText: "Save answer",
      });
      if (!r.isConfirmed) return;
      note = r.value || "";
    } else {
      const r = await Swal.fire({ title: "Reset the customer's answer?", icon: "warning", showCancelButton: true, confirmButtonText: "Reset" });
      if (!r.isConfirmed) return;
    }
    try {
      const res = await setDecision({ jobId, decision, note }).unwrap();
      onSaved?.({ jobId, stageCompleted: Boolean(res.stageCompleted) });
      if (res.stageCompleted) {
        await Swal.fire({ title: "Answer saved", text: `${job.jobNo} moved to the next stage.`, icon: "success", timer: 1500, showConfirmButton: false });
        onHide();
      }
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not save the answer.", icon: "error" });
    }
  };

  const setDamage = (n, patch) => setDamages((d) => d.map((x, i) => (i === n ? { ...x, ...patch } : x)));
  const setAgree = (n, patch) => setAgreed((a) => a.map((x, i) => (i === n ? { ...x, ...patch } : x)));

  return (
    <Modal show onHide={saving ? undefined : onHide} size="lg" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={false}>
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <Icon icon="mdi:file-alert-outline" width="24" height="24" color={ui.color} />
          <span>
            Vehicle Damages Report
            {job && <span className="text-muted fw-normal"> / {job.departmentName} Department</span>}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        {isLoading && <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError?.data?.message || "Failed to load the damages report."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        )}

        {data && (
          <>
            <div className="small text-muted mb-3"><strong className="text-dark">{job.jobNo}</strong> · {job.regNo}</div>
            {!data.canRecord && <Alert variant="secondary" className="py-2">This job is not ready for the damages report yet.</Alert>}
            {decided && (
              <Alert variant={report.decision === "CONFIRMED" ? "success" : "warning"} className="py-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span>
                  <strong>Customer {report.decision === "CONFIRMED" ? "confirmed" : "declined"}</strong>
                  {" "}({report.decidedVia === "LINK" ? "through the link" : "recorded by staff"}, {new Date(report.decidedAt).toLocaleString()})
                  {report.customerNote && <div className="small">“{report.customerNote}”</div>}
                </span>
                <Button size="sm" variant="outline-dark" disabled={deciding} onClick={() => record(null)}>Reset answer</Button>
              </Alert>
            )}
            {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}

            {report?.skipped && <Alert variant="info" className="py-2">This step was skipped. You can still fill in the report below if it is needed.</Alert>}

            <>
                {/* 1. Considerable damage found */}
                <Section
                  title="Considerable damage found"
                  hint="Filled from Vehicle Evidence (stage 7). Attach the photos or videos that show each damage."
                >
                  <div className="d-flex flex-column gap-2">
                    {damages.map((d, n) => {
                      const chosen = d.fileIds.map((id) => jobFiles.find((f) => f.id === id)).filter(Boolean);
                      return (
                        <div key={n}>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-semibold text-muted" style={{ width: 20 }}>{letter(n)}</span>
                            <FormControl size="sm" value={d.description} maxLength={300} disabled={readOnly} onChange={(e) => setDamage(n, { description: e.target.value })} placeholder="Describe the damage" />
                            <Button size="sm" variant="outline-primary" className="text-nowrap" disabled={readOnly} onClick={() => setPickFor(n)} title="Attach photos / videos to this damage">
                              <Icon icon="mdi:image-plus-outline" width="16" height="16" /> {chosen.length > 0 ? chosen.length : "Photos"}
                            </Button>
                            <Button size="sm" variant="outline-danger" aria-label="Remove" disabled={readOnly || (damages.length === 1 && !d.description && chosen.length === 0)} onClick={() => setDamages((x) => (x.length === 1 ? [{ description: "", fileIds: [] }] : x.filter((_, i) => i !== n)))}>
                              <Icon icon="mdi:close" width="16" height="16" />
                            </Button>
                          </div>
                          {pickFor === n && (
                            <DamageMediaPicker
                              title={`Damage ${letter(n).replace(".", "")}${d.description ? ` – ${d.description}` : ""}`}
                              job={job} jobId={jobId} files={jobFiles} selectedIds={d.fileIds}
                              onChange={(ids) => setDamage(n, { fileIds: ids })}
                              onUploaded={(file) => { setExtraFiles((x) => [...x, file]); setDamages((dd) => dd.map((x, i) => (i === n ? { ...x, fileIds: [...new Set([...x.fileIds, file.id])] } : x))); }}
                              onHide={() => setPickFor(null)}
                            />
                          )}
                          {chosen.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1" style={{ marginLeft: 28 }}>
                              {chosen.map((f) => (
                                <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" title={f.fileName} className="position-relative d-block rounded-2 overflow-hidden bg-dark" style={{ width: 52, height: 52 }}>
                                  {f.fileType === "VIDEO"
                                    ? <><video src={f.fileUrl} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} /><span className="position-absolute top-50 start-50 translate-middle text-white"><Icon icon="mdi:play-circle" width="20" height="20" /></span></>
                                    : <img src={f.fileUrl} alt={f.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button size="sm" variant="outline-primary" className="mt-2" disabled={readOnly || damages.length >= 30} onClick={() => setDamages((x) => [...x, { description: "", fileIds: [] }])}>
                    <Icon icon="mdi:plus" width="16" height="16" /> Add damage
                  </Button>
                </Section>

                {(
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 border rounded-3 p-2 px-3 mb-2 bg-light">
                    <span className="small text-muted">
                      {damages.some((d) => d.description.trim()) ? (report?.confirmSentAt ? "Link already sent. You can send it again." : "Damages are filled. Send the link to the customer, then the questions appear.") : "Fill at least one damage to continue."}
                    </span>
                    <Button size="sm" variant="primary" disabled={readOnly || saving || linking || !damages.some((d) => d.description.trim())} onClick={sendDamagesLink}>
                      <Icon icon="mdi:send-outline" width="16" height="16" /> {saving || linking ? "Sending..." : report?.confirmSentAt ? "Resend link" : "Send link to customer"}
                    </Button>
                  </div>
                )}
                {askVisible && (<>

                {/* 3. Ask from the customer */}
                <Section title="Ask from the customer">
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <span>Need damage deeply to be checked?</span>
                      <YesNo value={needDeep} onChange={setNeedDeep} disabled={readOnly} />
                    </div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <span>Need damage to be repaired?</span>
                      <YesNo value={needRepair} onChange={setNeedRepair} disabled={readOnly} />
                    </div>
                  </div>
                  {touched && (needDeep === null || needRepair === null) && <div className="text-danger small mt-1">Answer both questions.</div>}
                </Section>

                {/* 4. What agreed to do (only if yes) */}
                {askVisible && needAny && (
                  <Section title="What agreed to do" hint="Each agreed item becomes a “Sub concern” in the Inspection Sheet (stage 7) once the customer confirms.">
                    <div className="d-flex flex-column gap-2">
                      {agreed.map((a, n) => (
                        <div key={n} className="d-flex align-items-center gap-2 flex-wrap flex-sm-nowrap">
                          <span className="fw-semibold text-muted" style={{ width: 20 }}>{letter(n)}</span>
                          <FormControl size="sm" className="flex-grow-1" style={{ minWidth: 160 }} value={a.description} maxLength={300} disabled={readOnly} onChange={(e) => setAgree(n, { description: e.target.value })} placeholder="What was agreed" />
                          <FormSelect size="sm" style={{ width: 130 }} value={a.action} disabled={readOnly} onChange={(e) => setAgree(n, { action: e.target.value })} aria-label="Action">
                            {ACTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          </FormSelect>
                          <Button size="sm" variant="outline-danger" aria-label="Remove" disabled={readOnly || (agreed.length === 1 && !a.description)} onClick={() => setAgreed((x) => (x.length === 1 ? [{ description: "", action: "REPAIR" }] : x.filter((_, i) => i !== n)))}>
                            <Icon icon="mdi:close" width="16" height="16" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline-primary" className="mt-2" disabled={readOnly || agreed.length >= 30} onClick={() => setAgreed((x) => [...x, { description: "", action: "REPAIR" }])}>
                      <Icon icon="mdi:plus" width="16" height="16" /> Add item
                    </Button>
                    <Button size="sm" variant="outline-secondary" className="mt-2 ms-2" disabled={readOnly} onClick={() => setAgreed(agreedFromDamages())}>
                      <Icon icon="mdi:content-copy" width="16" height="16" /> Fill from damages found
                    </Button>
                    {touched && !agreed.some((a) => a.description.trim()) && <div className="text-danger small mt-1">Write what was agreed to do.</div>}
                  </Section>
                )}

                {/* 5. Customer confirmation */}
                {needAny && (
                  <Section title="Customer confirmation" hint="Send the link so the customer can confirm, or record the answer yourself (for example by phone).">
                    {!report ? (
                      <div className="small text-muted">Save the report first, then the confirmation link can be sent.</div>
                    ) : (
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                          <Badge bg={decided ? (report.decision === "CONFIRMED" ? "success" : "warning") : "secondary"} text={report.decision === "DECLINED" ? "dark" : undefined}>
                            {decided ? (report.decision === "CONFIRMED" ? "Customer confirmed: Yes" : "Customer confirmed: No") : "Waiting for the customer"}
                          </Badge>
                          <div className="small text-muted mt-1">{report.confirmSentAt ? `Link created ${new Date(report.confirmSentAt).toLocaleString()}` : "Link not sent yet"}</div>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {report.confirmToken && (
                            <Button size="sm" variant="outline-secondary" onClick={() => window.open(`/damage-report/${report.confirmToken}`, "_blank", "noopener")}>
                              <Icon icon="mdi:open-in-new" width="16" height="16" /> Open page
                            </Button>
                          )}
                          {!decided && data.canRecord && (
                            <>
                              <Button size="sm" variant="outline-success" disabled={linking} onClick={sendConfirmLink}>
                                <Icon icon="mdi:send-outline" width="16" height="16" /> {report.confirmSentAt ? "Copy / send again" : "Send link to confirm"}
                              </Button>
                              <Button size="sm" variant="success" disabled={deciding} onClick={() => record("CONFIRMED")}>Customer confirmed</Button>
                              <Button size="sm" variant="outline-danger" disabled={deciding} onClick={() => record("DECLINED")}>Declined</Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Section>
                )}
                </>)}
                {touched && problems.length > 0 && <Form.Text className="text-danger d-block">{problems.join(" · ")}</Form.Text>}
            </>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-between">
        <div>
          {data && !readOnly && !report?.skipped && (
            <Button variant="outline-warning" className="text-dark" onClick={doSkip} disabled={saving}>
              <Icon icon="mdi:skip-next-circle-outline" width="20" height="20" /> Skip this step
            </Button>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={onHide} disabled={saving}>Close</Button>
          {data && !readOnly && askVisible && (
            <Button variant="primary" onClick={submit} disabled={saving}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : report && !report.skipped ? "Update report" : "Save report"}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
}