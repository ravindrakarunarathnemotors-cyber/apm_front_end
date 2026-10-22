"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Form, FormControl, InputGroup, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddEvidenceFileMutation,
  useCreateEvidenceLinkMutation,
  useGetJobEvidenceQuery,
  useGetPreEvidenceQuery,
  useRemoveEvidenceFileMutation,
  useSaveJobEvidenceMutation,
  useSavePreEvidenceMutation,
  useSendEvidenceSmsMutation,
} from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";
import ManageInspectionItemsModal from "./ManageInspectionItemsModal";

// Stage 7 · Vehicle Evidence of Damages
// Props: jobId (null = closed), onHide, onSaved?({ jobId }),
//        preDepartment (stage 4: the job has no department yet - photos / videos + the reminder checklist), onNext? (stage 4: "Next: Select Department")

// ---- photo / video upload (same /file/upload endpoint as the profile picture) ----
const UPLOAD_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/file/upload`;
const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 100;
// same address fix as the profile picture page (storage host -> public host). Empty it if you do not need it.
const URL_FIX = ["https://i4i4.fra.idrivee2-52.com", "https://d8y1.c2.e2-9.dev"];
const pad = (n) => String(n).padStart(2, "0");
const stampOf = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
// new name: JOB-00014_BDV7757_20261012-093105_1.jpg  (job no + vehicle no + date/time + running number)
const newFileName = (job, file, n) => {
  const fromName = (file.name.split(".").pop() || "").toLowerCase();
  const ext = EXT[file.type] || (/^[a-z0-9]{2,5}$/.test(fromName) ? fromName : file.type.startsWith("video/") ? "mp4" : "jpg");
  const safe = (v) => String(v || "").replace(/[^A-Za-z0-9-]+/g, "").toUpperCase();
  return `${safe(job.jobNo)}_${safe(job.regNo)}_${stampOf()}_${n}.${ext}`;
};

// Saved files + files that are being uploaded (shown at once from the device, with their status).
// entry = { key, url, name, type: "IMAGE"|"VIDEO", status: "saved"|"uploading"|"error", error?, onRemove, onRetry? }
function MediaThumbs({ entries, onOpen, disabled }) {
  if (!entries.length) return null;
  return (
    <div className="d-flex flex-wrap gap-2 mt-2">
      {entries.map((e) => (
        <div key={e.key} style={{ width: 104 }}>
          <div
            className={`position-relative rounded-2 overflow-hidden bg-dark ${e.status === "error" ? "border border-2 border-danger" : "border"}`}
            style={{ width: 104, height: 104, cursor: "pointer" }}
            role="button"
            tabIndex={0}
            title={e.name}
            onClick={() => onOpen(e)}
            onKeyDown={(ev) => ev.key === "Enter" && onOpen(e)}
          >
            {e.type === "VIDEO" ? (
              <>
                <video src={e.url} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
                <span className="position-absolute top-50 start-50 translate-middle text-white" style={{ textShadow: "0 0 6px #000" }}>
                  <Icon icon="mdi:play-circle" width="34" height="34" />
                </span>
              </>
            ) : (
              // plain <img>: works for blob: previews and for the storage host without next.config changes
              <img src={e.url} alt={e.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            {e.status === "uploading" && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: "rgba(0,0,0,.45)" }}>
                <Spinner animation="border" size="sm" variant="light" />
              </div>
            )}
            {e.status === "saved" && <span className="position-absolute bottom-0 start-0 m-1 badge bg-success"><Icon icon="mdi:check" width="12" height="12" /></span>}
            {!disabled && e.status !== "uploading" && (
              <button type="button" aria-label="Remove" onClick={(ev) => { ev.stopPropagation(); e.onRemove(); }} className="btn btn-sm btn-dark position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center" style={{ width: 22, height: 22, opacity: 0.9 }}>
                <Icon icon="mdi:close" width="14" height="14" />
              </button>
            )}
          </div>
          {e.status === "uploading" && <div className="small text-primary text-truncate">Uploading...</div>}
          {e.status === "error" && (
            <div className="small text-danger" style={{ lineHeight: 1.2 }}>
              {e.error} {e.onRetry && <a href="#retry" onClick={(ev) => { ev.preventDefault(); e.onRetry(); }}>Retry</a>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// big preview of one photo / video
function PreviewModal({ entry, onHide }) {
  return (
    <Modal show onHide={onHide} centered size="lg" contentClassName="bg-dark text-white">
      <Modal.Header closeButton closeVariant="white" className="border-0">
        <Modal.Title className="fs-6 text-break">{entry.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center p-2">
        {entry.type === "VIDEO" ? (
          <video src={entry.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "75vh" }} />
        ) : (
          <img src={entry.url} alt={entry.name} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} />
        )}
      </Modal.Body>
    </Modal>
  );
}

function PickButtons({ onPick, disabled }) {
  return (
    <div className="d-flex flex-wrap gap-1">
      <Button size="sm" variant="outline-primary" disabled={disabled} onClick={() => onPick("photo")} title="Take a photo with the camera">
        <Icon icon="mdi:camera-outline" width="16" height="16" /> Photo
      </Button>
      <Button size="sm" variant="outline-primary" disabled={disabled} onClick={() => onPick("video")} title="Record a video with the camera">
        <Icon icon="mdi:video-outline" width="16" height="16" /> Video
      </Button>
      <Button size="sm" variant="outline-secondary" disabled={disabled} onClick={() => onPick("gallery")} title="Choose many photos / videos at once from this device">
        <Icon icon="mdi:upload" width="16" height="16" /> Upload many
      </Button>
    </div>
  );
}

const CONDITIONS = [["OK", "OK", "success"], ["DAMAGED", "Damaged", "danger"], ["NA", "N/A", "secondary"]];

export default function VehicleEvidenceModal({ jobId, onHide, onSaved, preDepartment = false, onNext }) {
  const full = useGetJobEvidenceQuery(jobId, { skip: !jobId || preDepartment, refetchOnMountOrArgChange: true });
  const pre = useGetPreEvidenceQuery(jobId, { skip: !jobId || !preDepartment, refetchOnMountOrArgChange: true });
  const { isLoading, isError, error: loadError, refetch } = preDepartment ? pre : full;
  // stage 4 (no department yet) is shown with the same window: UPLOAD_ONLY layout, the common reminder checklist
  const data = useMemo(() => {
    if (!preDepartment) return full.data;
    const p = pre.data;
    if (!p) return undefined;
    return {
      job: { ...p.job, departmentName: "", evidenceMode: "UPLOAD_ONLY" },
      evidenceStageNo: 4,
      canRecord: Boolean(p.canAdd),
      canManage: false,
      items: [],
      propertyInside: p.propertyInside ?? null,
      evidence: { items: [], damages: [], moreDetails: p.remark || "", updatedAt: `pre:${String(p.propertyInside)}`, saved: Boolean(p.link), ...(p.link || {}) },
      files: p.files || [],
      subConcerns: [],
    };
  }, [preDepartment, full.data, pre.data]);
  const [save, { isLoading: saving0 }] = useSaveJobEvidenceMutation();
  const [savePre, { isLoading: savingPre }] = useSavePreEvidenceMutation();
  const saving = saving0 || savingPre;
  const [createLink, { isLoading: linking }] = useCreateEvidenceLinkMutation();
  const [sendSmsApi, { isLoading: smsSending }] = useSendEvidenceSmsMutation();
  const [phone, setPhone] = useState(null); // null = not edited -> the customer's number
  const [addFile] = useAddEvidenceFileMutation();
  const [removeFile] = useRemoveEvidenceFileMutation();
  const [queue, setQueue] = useState([]); // files picked on this device: { key, itemId, file, url (preview), name, type, status, error }
  const [preview, setPreview] = useState(null); // entry shown in the big preview
  const seqRef = useRef(0);
  const uploading = queue.some((q) => q.status === "uploading");
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const galleryRef = useRef(null);
  const targetRef = useRef(null); // itemId the next picked files belong to (null = general)

  const [rows, setRows] = useState({}); // itemId -> { condition, photosTaken, videosTaken, note }
  const [damages, setDamages] = useState([""]);
  const [more, setMore] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState("");
  const [managing, setManaging] = useState(false);
  const [propertyInside, setPropertyInside] = useState(null); // stage 4: customer property inside the vehicle? true / false / null (not answered)
  const categoryRef = useRef("GENERAL"); // category of the next picked files

  const job = data?.job;
  const ui = getDepartmentUi(job?.departmentName || "");
  const readOnly = data && !data.canRecord;
  // department.evidence_mode = 'PHOTOS_ONLY': this stage is only for uploading photos / videos (no checklist, no damages list)
  const photosOnly = job?.evidenceMode === "PHOTOS_ONLY";
  // 'NO_DAMAGES': checklist + photos / videos per item, but no "Damages found" list (damages are written in the stage 8 report)
  const noDamages = job?.evidenceMode !== "FULL" && Boolean(job?.evidenceMode);
  // 'UPLOAD_ONLY': the checklist areas are only upload slots - photos / videos per area, no OK / Damaged / N/A, no notes
  const uploadOnly = job?.evidenceMode === "UPLOAD_ONLY";

  // fill the form with the saved evidence (or empty). Not on every refetch, so "Manage checklist" does not wipe it.
  useEffect(() => {
    if (!data) return;
    const saved = data.evidence;
    const next = {};
    (saved?.items || []).forEach((i) => {
      if (i.itemId) next[i.itemId] = { condition: i.condition, photosTaken: i.photosTaken, videosTaken: i.videosTaken, note: i.note || "" };
    });
    setRows(next);
    setDamages(saved?.damages?.length ? saved.damages : [""]);
    setMore(saved?.moreDetails || "");
    setPropertyInside(data.propertyInside ?? null);
    setTouched(false);
    setServerError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, data?.job?.id, data?.evidence?.updatedAt ?? null]);

  const items = data?.items || [];
  const files = data?.files || [];
  const isProp = (f) => f.category === "PROPERTY";
  const filesOf = (itemId) => files.filter((f) => (f.itemId ?? null) === itemId && !isProp(f));
  const propFiles = files.filter(isProp);
  const propQueue = queue.filter((q) => q.category === "PROPERTY");
  const patch = (id, p) => setRows((r) => ({ ...r, [id]: { condition: "", photosTaken: false, videosTaken: false, note: "", ...r[id], ...p } }));
  // Every item is optional: only the items that were answered are saved, the rest are skipped.
  // An item that has a note / photos / videos must also get OK / Damaged / N/A, or it would be lost from the report.
  const hasStuff = (i) => {
    const r = rows[i.id] || {};
    return Boolean((r.note || "").trim() || r.photosTaken || r.videosTaken || filesOf(i.id).length || queue.some((q) => q.itemId === i.id));
  };
  const needCondition = items.filter((i) => !rows[i.id]?.condition && hasStuff(i));
  const hasErrors = needCondition.length > 0 && !uploadOnly;
  const answeredCount = items.filter((i) => rows[i.id]?.condition).length;
  const [openItems, setOpenItems] = useState({}); // itemId -> details panel open
  const markAllOk = () => setRows((r) => { const n = { ...r }; items.forEach((i) => { if (!n[i.id]?.condition) n[i.id] = { photosTaken: false, videosTaken: false, note: "", ...n[i.id], condition: "OK" }; }); return n; });

  const payload = () => ({
    jobId,
    // UPLOAD_ONLY: a ticked reminder is saved as an "OK" row (nothing is shown to the customer); unticked = no row
    items: (uploadOnly
      ? items.filter((i) => rows[i.id]?.condition === "OK").map((i) => ({ ...i, __tick: true }))
      : items.filter((i) => rows[i.id]?.condition)
    ).map((i) => {
      if (i.__tick) return { itemId: i.id, condition: "OK", photosTaken: false, videosTaken: false, note: "" };
      const fs = filesOf(i.id);
      const r = rows[i.id] || {};
      return { itemId: i.id, ...r, photosTaken: Boolean(r.photosTaken) || fs.some((f) => f.fileType === "IMAGE"), videosTaken: Boolean(r.videosTaken) || fs.some((f) => f.fileType === "VIDEO") };
    }),
    damages: damages.map((d) => d.trim()).filter(Boolean),
    moreDetails: more.trim(),
  });

  // stage 4: what is still missing before the department can be selected
  const stage4Problem = !preDepartment ? "" :
    filesOf(null).length === 0 ? "Upload at least one photo or video of the vehicle."
    : propertyInside === null ? "Answer: is there customer property inside the vehicle?"
    : propertyInside === true && propFiles.length === 0 ? "Add photos / videos of the property inside the vehicle."
    : "";
  const submit = async (goNext = false) => {
    setTouched(true);
    setServerError("");
    if (hasErrors) return;
    if (preDepartment) {
      // stage 4: only the ticks of the reminder checklist are saved (photos / videos are saved as they are uploaded)
      try {
        const pr = await savePre({ jobId, propertyInside, remark: more.trim() }).unwrap();
        onSaved?.({ jobId, stageCompleted: false });
        // saved: when the evidence is complete the department window opens by itself
        await reportSms(pr?.sms);
        if (!stage4Problem && onNext) onNext(); else onHide();
      } catch (ex) {
        setServerError(ex?.data?.message || "Failed to save the vehicle evidence.");
      }
      return;
    }
    if (photosOnly && files.length === 0 && queue.length === 0) {
      const ask = await Swal.fire({ title: "No photos / videos added", text: "Save the evidence without any photo or video?", icon: "question", showCancelButton: true, confirmButtonText: "Save anyway" });
      if (!ask.isConfirmed) return;
    }
    try {
      const res = await save(payload()).unwrap();
      await reportSms(res?.sms);
      onSaved?.({ jobId, stageCompleted: res.currentStageNo > data.evidenceStageNo });
      onHide();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the vehicle evidence.");
    }
  };

  // ---- pick -> preview at once -> rename -> upload -> register ----
  const pick = (kind, itemId, category = "GENERAL") => {
    targetRef.current = itemId;
    categoryRef.current = category;
    ({ photo: photoRef, video: videoRef, gallery: galleryRef })[kind].current?.click();
  };

  const patchQ = (key, p) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const dropQ = (key) => setQueue((q) => { const x = q.find((y) => y.key === key); if (x) URL.revokeObjectURL(x.url); return q.filter((y) => y.key !== key); });

  const uploadOne = async (entry) => {
    patchQ(entry.key, { status: "uploading", error: "" });
    try {
      const renamed = new File([entry.file], entry.name, { type: entry.file.type, lastModified: Date.now() });
      const fd = new FormData();
      fd.append("file", renamed);
      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.fileUrl) throw new Error(up.message || `Upload failed (${res.status})`);
      const url = URL_FIX[0] ? up.fileUrl.replace(URL_FIX[0], URL_FIX[1]) : up.fileUrl;
      await addFile({ jobId, itemId: entry.itemId, category: entry.category || "GENERAL", fileName: entry.name, fileUrl: url, mimeType: entry.file.type, size: entry.file.size }).unwrap();
      dropQ(entry.key); // the saved copy now shows in the list
    } catch (ex) {
      patchQ(entry.key, { status: "error", error: ex?.data?.message || ex?.message || "Upload failed" });
    }
  };

  const onPicked = (e) => {
    const list = Array.from(e.target.files || []);
    const itemId = targetRef.current;
    const category = categoryRef.current;
    e.target.value = ""; // the same file can be picked again
    const entries = [];
    const rejected = [];
    for (const file of list) {
      const isVideo = file.type.startsWith("video/");
      if (!isVideo && !file.type.startsWith("image/")) { rejected.push(`${file.name}: only images and videos`); continue; }
      const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
      if (file.size > maxMb * 1024 * 1024) { rejected.push(`${file.name}: larger than ${maxMb}MB`); continue; }
      seqRef.current = Math.max(seqRef.current, files.length) + 1;
      entries.push({
        key: `q${Date.now()}-${seqRef.current}`, itemId, category, file, url: URL.createObjectURL(file),
        name: newFileName(job, file, seqRef.current), type: isVideo ? "VIDEO" : "IMAGE", status: "uploading", error: "",
      });
    }
    if (rejected.length) Swal.fire({ title: "Some files were skipped", html: rejected.map((f) => `<div style="font-size:.9rem">${f}</div>`).join(""), icon: "warning" });
    if (!entries.length) return;
    setQueue((q) => [...q, ...entries]);
    // upload one after another (keeps the running numbers and the server calm)
    (async () => { for (const en of entries) await uploadOne(en); })();
  };

  const removeOne = async (f) => {
    const ask = await Swal.fire({ title: "Remove this file?", text: f.fileName, icon: "warning", showCancelButton: true, confirmButtonText: "Remove" });
    if (!ask.isConfirmed) return;
    try { await removeFile(f.id).unwrap(); } catch (ex) { Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not remove the file.", icon: "error" }); }
  };

  // saved files + queued files of one place (an item, or null = general) as thumbnails
  const entriesOf = (itemId) => [
    ...filesOf(itemId).map((f) => ({ key: `f${f.id}`, url: f.fileUrl, name: f.fileName, type: f.fileType, status: "saved", onRemove: () => removeOne(f) })),
    ...queue.filter((q) => q.itemId === itemId && q.category !== "PROPERTY").map((q) => ({ key: q.key, url: q.url, name: q.name, type: q.type, status: q.status, error: q.error, onRemove: () => dropQ(q.key), onRetry: () => uploadOne(q) })),
  ];

  // free the previews when the window closes
  const queueRef = useRef([]);
  queueRef.current = queue;
  useEffect(() => () => { queueRef.current.forEach((q) => URL.revokeObjectURL(q.url)); }, []);

  // the server SMSes the customer link after every save; show what happened
  const reportSms = async (sms) => {
    if (!sms) return;
    if (sms.sent) await Swal.fire({ title: "Evidence saved!", text: `The report link was sent to the customer by SMS (${sms.to}).`, icon: "success", timer: 2000, showConfirmButton: false });
    else await Swal.fire({ title: "Evidence saved", text: `The SMS to the customer was not sent: ${sms.error || "unknown error"}. You can send the link from the Customer link section.`, icon: "warning" });
  };

  // copy the customer link (needs saved evidence)
  const copyLink = async () => {
    try {
      const res = await createLink(jobId).unwrap();
      const url = `${window.location.origin}${res.path}`;
      try { await navigator.clipboard.writeText(url); } catch (_) { /* clipboard may be blocked */ }
      const r = await Swal.fire({
        title: "Customer link ready",
        html: `<div style="word-break:break-all;font-size:.9rem">${url}</div><div class="text-muted mt-2" style="font-size:.8rem">The link is copied.</div>`,
        icon: "success", showCancelButton: true, confirmButtonText: "Open report", cancelButtonText: "Close",
      });
      if (r.isConfirmed) window.open(res.path, "_blank", "noopener");
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not create the link.", icon: "error" });
    }
  };

  // send the link by SMS to the number in the box (editable; default = the customer's WhatsApp / mobile number)
  const linkReady = Boolean(data?.evidence) && (!preDepartment || Boolean(data.evidence.saved)); // saved evidence exists
  const phoneValue = phone ?? job?.whatsappNumber ?? "";
  const sendBySms = async () => {
    try {
      const r = await sendSmsApi({ jobId, phone: phoneValue.trim() || undefined }).unwrap();
      if (r.sms?.sent) Swal.fire({ title: "SMS sent", text: `The report link was sent to ${r.sms.to}.`, icon: "success", timer: 1800, showConfirmButton: false });
      else Swal.fire({ title: "SMS not sent", text: r.sms?.error || "Could not send the SMS.", icon: "warning" });
    } catch (ex) {
      Swal.fire({ title: "SMS not sent", text: ex?.data?.message || "Could not send the SMS.", icon: "error" });
    }
  };

  const setDamage = (n, v) => setDamages((d) => d.map((x, i) => (i === n ? v : x)));

  return (
    <>
      <Modal show onHide={saving ? undefined : onHide} size="lg" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={!managing && !preview}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title className="fs-5 d-flex align-items-center gap-2">
            <Icon icon="mdi:car-search-outline" width="24" height="24" color={ui.color} />
            <span>
              {preDepartment ? "Vehicle Evidence" : "Vehicle Evidence of Damages"}
              {job && !preDepartment && <span className="text-muted fw-normal">{` / ${job.departmentName} Department / Open window`}</span>}
            </span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="bg-light">
          {isLoading && <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>}
          {isError && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center">
              <span>{loadError?.data?.message || "Failed to load the vehicle evidence."}</span>
              <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
            </Alert>
          )}

          {data && (
            <>
              <div className="small text-muted mb-3"><strong className="text-dark">{job.jobNo}</strong> · {job.regNo}</div>
              {readOnly && <Alert variant="secondary" className="py-2">This job is not ready for vehicle evidence yet.</Alert>}
              {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}

              {/* UPLOAD_ONLY: one place to upload everything, and the checklist is only a reminder of what to photograph */}
              {uploadOnly && (
                <>
                  <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="fw-bold">Photos / videos</div>
                        <div className="small text-muted">Take photos or videos of the vehicle, or choose them from the gallery. You can add many at once.</div>
                      </div>
                      <PickButtons onPick={(k) => pick(k, null)} disabled={readOnly} />
                    </div>
                    <MediaThumbs entries={[null, ...items.map((i) => i.id)].flatMap((id) => entriesOf(id))} onOpen={setPreview} disabled={readOnly} />
                  </div>

                  {preDepartment && (
                    <div className={`bg-white border rounded-3 p-2 px-3 mb-2 ${propertyInside === true ? "border-warning" : ""}`}>
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                          <div className="fw-bold">Ask the customer</div>
                          <div className="text-muted">Is there any property inside the vehicle?</div>
                        </div>
                        <div className="btn-group" role="group" aria-label="Property inside the vehicle">
                          <Button variant={propertyInside === true ? "warning" : "outline-secondary"} disabled={readOnly} onClick={() => setPropertyInside(true)}>
                            <Icon icon="mdi:bag-personal-outline" width="18" height="18" /> Yes
                          </Button>
                          <Button variant={propertyInside === false ? "success" : "outline-secondary"} disabled={readOnly} onClick={() => setPropertyInside(false)}>
                            <Icon icon="mdi:check" width="18" height="18" /> No
                          </Button>
                        </div>
                      </div>
                      {propertyInside === true && (
                        <div className="mt-2 pt-2 border-top">
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div className="small text-muted">Take photos or videos of the customer's property inside the vehicle (bags, tools, documents ...).</div>
                            <PickButtons onPick={(k) => pick(k, null, "PROPERTY")} disabled={readOnly} />
                          </div>
                          <MediaThumbs
                            entries={[
                              ...propFiles.map((f) => ({ key: `f${f.id}`, url: f.fileUrl, name: f.fileName, type: f.fileType, status: "saved", onRemove: () => removeOne(f) })),
                              ...propQueue.map((q) => ({ key: q.key, url: q.url, name: q.name, type: q.type, status: q.status, error: q.error, onRemove: () => dropQ(q.key), onRetry: () => uploadOne(q) })),
                            ]}
                            onOpen={setPreview}
                            disabled={readOnly}
                          />
                          {propFiles.length + propQueue.length === 0 && <div className="small text-danger mt-1">Add at least one photo or video.</div>}
                        </div>
                      )}
                      {propertyInside === false && <div className="small text-success mt-1">No property inside the vehicle.</div>}
                    </div>
                  )}

                  {!preDepartment && (
                  <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                      <div>
                        <span className="fw-bold">Initial Vehicle Inspection</span>
                        <span className="text-muted small ms-2">{items.filter((i) => rows[i.id]?.condition === "OK").length} of {items.length} taken</span>
                      </div>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-success" disabled={readOnly || items.length === 0} onClick={() => setRows((r) => { const n = { ...r }; items.forEach((i) => { n[i.id] = { photosTaken: false, videosTaken: false, note: "", ...n[i.id], condition: "OK" }; }); return n; })}>
                          <Icon icon="mdi:check-all" width="16" height="16" /> Select all
                        </Button>
                        <Button size="sm" variant="outline-secondary" disabled={readOnly || items.length === 0} onClick={() => setRows((r) => { const n = { ...r }; items.forEach((i) => { if (n[i.id]) n[i.id] = { ...n[i.id], condition: "" }; }); return n; })}>
                          Clear
                        </Button>
                        {data.canManage && (
                          <Button size="sm" variant="outline-primary" onClick={() => setManaging(true)} title="Add / remove checklist items">
                            <Icon icon="mdi:playlist-edit" width="16" height="16" /> Edit checklist
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="small text-muted mb-2">A reminder of what to photograph or film. Tick each area when it is done.</div>
                    {items.length === 0 ? (
                      <div className="text-muted small">The checklist is empty. Use Edit checklist to add items.</div>
                    ) : (
                      <div className="border rounded-2 overflow-hidden">
                        {items.map((it, n) => (
                          <label key={it.id} className={`d-flex align-items-center gap-2 px-2 py-2 mb-0 ${n ? "border-top" : ""} ${rows[it.id]?.condition === "OK" ? "bg-success-subtle" : ""}`} style={{ cursor: readOnly ? "default" : "pointer" }}>
                            <Form.Check.Input type="checkbox" className="mt-0" disabled={readOnly} checked={rows[it.id]?.condition === "OK"} onChange={() => patch(it.id, { condition: rows[it.id]?.condition === "OK" ? "" : "OK" })} />
                            <span className="small fw-semibold">{it.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </>
              )}

              {!photosOnly && !uploadOnly && (
              <>
              {/* 1. Initial Vehicle Inspection - every item is optional */}
              <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                  <div>
                    <span className="fw-bold">Initial Vehicle Inspection</span>
                    <span className="text-muted small ms-2">{answeredCount} of {items.length} checked</span>
                  </div>
                  <div className="d-flex gap-1">
                    <Button size="sm" variant="outline-success" disabled={readOnly || answeredCount === items.length} onClick={markAllOk}>
                      <Icon icon="mdi:check-all" width="16" height="16" /> Mark all OK
                    </Button>
                    {data.canManage && (
                      <Button size="sm" variant="outline-primary" onClick={() => setManaging(true)} title="Add / remove checklist items">
                        <Icon icon="mdi:playlist-edit" width="16" height="16" /> Edit checklist
                      </Button>
                    )}
                  </div>
                </div>
                <div className="small text-muted mb-2">Fill only what you checked. Items left blank are skipped.</div>

                {items.length === 0 ? (
                  <div className="text-muted small">The checklist is empty. Use Edit checklist to add items.</div>
                ) : (
                  <div className="border rounded-2 overflow-hidden">
                    {items.map((it, n) => {
                      const r = rows[it.id] || {};
                      const itemFiles = filesOf(it.id);
                      const entries = entriesOf(it.id);
                      const need = touched && !r.condition && hasStuff(it);
                      const expanded = Boolean(openItems[it.id]);
                      const hasImg = itemFiles.some((f) => f.fileType === "IMAGE");
                      const hasVid = itemFiles.some((f) => f.fileType === "VIDEO");
                      return (
                        <div key={it.id} className={`px-2 py-1 ${n ? "border-top" : ""} ${need ? "bg-danger-subtle" : ""}`}>
                          <div className="d-flex align-items-center gap-2">
                            <div className="flex-grow-1 text-truncate small fw-semibold" title={it.name}>{it.name}</div>
                            <div className="d-flex gap-1 flex-shrink-0">
                              {CONDITIONS.map(([key, label, color]) => (
                                <Button key={key} size="sm" className="py-0 px-2" variant={r.condition === key ? color : `outline-${color}`} disabled={readOnly}
                                  onClick={() => patch(it.id, { condition: r.condition === key ? "" : key })} title={r.condition === key ? "Click again to clear" : undefined}>
                                  {label}
                                </Button>
                              ))}
                              <Button size="sm" variant={expanded ? "secondary" : "outline-secondary"} className="py-0 px-2 position-relative" aria-label="Notes, photos and videos" aria-expanded={expanded}
                                onClick={() => setOpenItems((o) => ({ ...o, [it.id]: !o[it.id] }))}>
                                <Icon icon={expanded ? "mdi:chevron-up" : "mdi:camera-plus-outline"} width="16" height="16" />
                                {!expanded && entries.length > 0 && <span className="badge bg-primary rounded-pill position-absolute top-0 start-100 translate-middle" style={{ fontSize: 10 }}>{entries.length}</span>}
                              </Button>
                            </div>
                          </div>
                          {!expanded && (r.note || "").trim() && <div className="small text-muted text-truncate ps-1">Note: {r.note}</div>}
                          {expanded && (
                            <div className="pb-2 pt-1">
                              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                <FormControl size="sm" className="flex-grow-1" style={{ minWidth: 160, width: "auto" }} placeholder="Note (optional)" maxLength={500} value={r.note || ""} disabled={readOnly} onChange={(e) => patch(it.id, { note: e.target.value })} />
                                <PickButtons onPick={(k) => pick(k, it.id)} disabled={readOnly} />
                              </div>
                              <div className="d-flex flex-wrap gap-3">
                                <Form.Check inline type="checkbox" id={`ph-${it.id}`} label="Photographs taken" checked={Boolean(r.photosTaken) || hasImg} disabled={readOnly || hasImg} onChange={(e) => patch(it.id, { photosTaken: e.target.checked })} />
                                <Form.Check inline type="checkbox" id={`vd-${it.id}`} label="Videos taken" checked={Boolean(r.videosTaken) || hasVid} disabled={readOnly || hasVid} onChange={(e) => patch(it.id, { videosTaken: e.target.checked })} />
                              </div>
                              <MediaThumbs entries={entries} onOpen={setPreview} disabled={readOnly} />
                            </div>
                          )}
                          {need && <div className="text-danger small">Select OK, Damaged or N/A for this item (it has a note / photos), or remove them.</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!noDamages && (
              <>
              {/* 2. Damages found */}
              <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                <div className="fw-bold">Damages found</div>
                <div className="small text-muted mb-2">Except the damages the client mentioned</div>
                <div className="d-flex flex-column gap-2">
                  {damages.map((d, n) => (
                    <div key={n} className="d-flex align-items-center gap-2">
                      <span className="fw-semibold text-muted" style={{ width: 20 }}>{String.fromCharCode(97 + (n % 26))}.</span>
                      <FormControl size="sm" value={d} maxLength={300} disabled={readOnly} onChange={(e) => setDamage(n, e.target.value)} placeholder="Describe the damage" />
                      <Button size="sm" variant="outline-danger" disabled={readOnly || damages.length === 1 && !d} onClick={() => setDamages((x) => (x.length === 1 ? [""] : x.filter((_, i) => i !== n)))} aria-label="Remove">
                        <Icon icon="mdi:close" width="16" height="16" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline-primary" className="mt-2" disabled={readOnly || damages.length >= 30} onClick={() => setDamages((x) => [...x, ""])}>
                  <Icon icon="mdi:plus" width="16" height="16" /> Add damage
                </Button>
              </div>

              </>
              )}
              </>
              )}

              {/* Sub concerns: what the customer confirmed in the stage 8 damages report */}
              {(data.subConcerns || []).length > 0 && (
                <div className="bg-white border border-warning rounded-3 p-2 px-3 mb-2">
                  <div className="fw-bold d-flex align-items-center gap-2"><Icon icon="mdi:subdirectory-arrow-right" width="18" height="18" /> Sub concerns</div>
                  <div className="small text-muted mb-2">Confirmed by the customer in the Vehicle Damages Report</div>
                  <div className="d-flex flex-column gap-1">
                    {data.subConcerns.map((c, n) => (
                      <div key={n} className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-muted" style={{ width: 20 }}>{String.fromCharCode(97 + (n % 26))}.</span>
                        <span className="flex-grow-1">{c.description}</span>
                        <span className="badge text-bg-warning">{{ REPAIR: "Repair", DEEP_CHECK: "Deep check", BOTH: "Repair + Deep check" }[c.action] || c.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General photos / videos (not tied to one checklist item) */}
              {!uploadOnly && (
              <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-bold">{photosOnly ? "Photos / videos" : "Other photos / videos"}</div>
                    <div className="small text-muted">{photosOnly ? "Take photos or videos of the vehicle, or choose them from the gallery. You can add many." : "Whole vehicle, odometer, damages ... (not tied to one item)"}</div>
                  </div>
                  <PickButtons onPick={(k) => pick(k, null)} disabled={readOnly} />
                </div>
                <MediaThumbs entries={entriesOf(null)} onOpen={setPreview} disabled={readOnly} />
              </div>
              )}

              {/* hidden pickers: camera photo, camera video, gallery (many files). On a phone / tablet the camera opens. */}
              <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPicked} />
              <input ref={videoRef} type="file" accept="video/*" capture="environment" hidden onChange={onPicked} />
              <input ref={galleryRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPicked} />

              {/* 3. More details */}
              <div className="bg-white border rounded-3 p-2 px-3 mb-2">
                <Form.Label className="fw-bold mb-1 small">{preDepartment ? "Remark" : "More details"}</Form.Label>
                <FormControl as="textarea" rows={2} maxLength={2000} value={more} disabled={readOnly} onChange={(e) => setMore(e.target.value)} placeholder={preDepartment ? "Remark (optional)" : "Any other detail about the condition of the vehicle (optional)"} />
              </div>

              {/* 4. Customer link */}
              <div className="bg-white border rounded-3 p-2 px-3">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-bold">Customer link (evidence report)</div>
                    <div className={`small ${data.evidence?.smsSentAt ? "text-success" : "text-muted"}`}>
                      {data.evidence?.smsSentAt
                        ? `Sent by SMS to ${data.evidence.smsSentTo || "the customer"} · ${new Date(data.evidence.smsSentAt).toLocaleString()}`
                        : linkReady ? "Not sent yet" : "Save the evidence first"}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {data.evidence?.linkToken && (
                      <Button variant="outline-secondary" size="sm" onClick={() => window.open(`/evidence/${data.evidence.linkToken}`, "_blank", "noopener")}>
                        <Icon icon="mdi:open-in-new" width="18" height="18" /> Open report
                      </Button>
                    )}
                    <Button variant="outline-secondary" size="sm" disabled={!linkReady || linking} onClick={copyLink}>
                      <Icon icon="mdi:content-copy" width="18" height="18" /> Copy link
                    </Button>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                  <InputGroup style={{ maxWidth: 300 }}>
                    <InputGroup.Text><Icon icon="mdi:cellphone" width="18" height="18" /></InputGroup.Text>
                    <FormControl type="tel" inputMode="tel" placeholder="Mobile number (07XXXXXXXX)" value={phoneValue} disabled={!linkReady} onChange={(e) => setPhone(e.target.value)} />
                  </InputGroup>
                  <Button variant="success" disabled={!linkReady || smsSending || !phoneValue.trim()} onClick={sendBySms}>
                    {smsSending ? <Spinner size="sm" /> : <Icon icon="mdi:message-text-outline" width="18" height="18" />} {data.evidence?.smsSentAt ? "Send again by SMS" : "Send by SMS"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {data && !readOnly && preDepartment && stage4Problem && <span className="small text-muted align-self-center me-auto">{stage4Problem}</span>}
          <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          {data && !readOnly && (
            <Button onClick={() => submit(false)} disabled={saving || uploading} title={uploading ? "Wait until the uploads finish" : undefined}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : data.evidence ? "Update evidence" : "Save evidence"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {preview && <PreviewModal entry={preview} onHide={() => setPreview(null)} />}
      {managing && data && !preDepartment && <ManageInspectionItemsModal department={{ id: job.departmentId, name: job.departmentName }} onHide={() => setManaging(false)} />}
    </>
  );
}