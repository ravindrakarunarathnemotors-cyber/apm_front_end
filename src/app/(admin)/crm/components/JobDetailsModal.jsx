"use client";

import { Fragment, useEffect, useState } from "react";
import { Alert, Badge, Button, Col, Modal, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetJobDetailsQuery } from "@/store/features/apiSlice";
import { useGetJobHistoryQuery, useGetJobStageDetailsQuery } from "./jobDetailsApi";
import { getDepartmentUi } from "./departmentConfig";

/* =====================================================================================
   Job View window (full screen). Tabs:  Overview | Timeline | Stage details | Estimate | Previous jobs
   - Overview + Timeline come from GET /jobs/:id (fast, always loaded).
   - Stage details / Estimate  -> GET /jobs/:id/stage-details   (loaded only when one of those tabs is opened)
   - Previous jobs             -> GET /jobs/:id/history         (loaded only when that tab is opened)
   Only the open tab is rendered, so the window stays light however much data a job has.
   ===================================================================================== */

/* ----------------------------- helpers ----------------------------- */
const RED = "#c8102e";
const HDR = "linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%)";
const BLK = "linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%)";

const fmtDay = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "-" : d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};
const fmtShort = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "-" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};
const fmtDT = (iso) => (iso ? `${fmtDay(iso)}, ${fmtTime(iso)}` : "-");
const duration = (from, to) => {
  const ms = new Date(to) - new Date(from);
  if (!Number.isFinite(ms) || ms < 60000) return null;
  const mins = Math.round(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
};
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const yesNo = (v) => (v === true ? "Yes" : v === false ? "No" : null);
const localToday = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

const STATUS_BADGE = { IN_PROGRESS: "warning", COMPLETED: "success", CANCELLED: "danger" };
const STATUS_TEXT = { IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" };
const APPROVAL_BADGE = { APPROVED: "success", PENDING: "warning", REJECTED: "danger" };

/* ----------------------------- small building blocks ----------------------------- */
// One detail = one row: label on the left, value on the right
function Info({ label, children, icon }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className="jv-info d-flex justify-content-between align-items-start gap-3 py-2">
      <div className="text-muted small flex-shrink-0" style={{ minWidth: 120 }}>
        {icon && <Icon icon={icon} width="14" height="14" className="me-1" style={{ color: RED }} />}
        {label}
      </div>
      <div className="fw-semibold text-end" style={{ wordBreak: "break-word" }}>
        {empty ? <span className="text-muted fw-normal">-</span> : children}
      </div>
    </div>
  );
}

function Section({ title, icon, right, children, className = "" }) {
  return (
    <div className={`jv-card mb-3 ${className}`}>
      <div className="jv-card-head d-flex align-items-center gap-2">
        <Icon icon={icon} width="19" height="19" style={{ color: RED }} />
        <span className="fw-bold">{title}</span>
        {right && <span className="ms-auto">{right}</span>}
      </div>
      <div className="px-3 py-1">{children}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="text-muted small py-3 text-center">{children}</div>;
}

function Chip({ color = "#475569", icon, children }) {
  return (
    <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 fw-semibold small text-nowrap"
      style={{ color, background: `color-mix(in srgb, ${color} 10%, white)`, border: `1px solid color-mix(in srgb, ${color} 30%, white)` }}>
      {icon && <Icon icon={icon} width="14" height="14" />}
      {children}
    </span>
  );
}

function Loading({ text = "Loading..." }) {
  return (
    <div className="text-center text-muted py-5">
      <Spinner animation="border" size="sm" className="me-2" /> {text}
    </div>
  );
}

function Plate({ children }) {
  return (
    <span className="d-inline-flex fw-bold rounded px-2" style={{ background: "#facc15", color: "#111", border: "1.5px solid #111", letterSpacing: ".05em", fontSize: ".85rem" }}>
      {children}
    </span>
  );
}

/* ----------------------------- timeline ----------------------------- */
const ACCENT = { COMPLETED: "#198754", IN_PROGRESS: RED, PENDING: "#adb5bd" };

function StageDot({ stage }) {
  const base = "rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0";
  if (stage.status === "COMPLETED")
    return <span className={`${base} bg-success text-white`} style={{ width: 32, height: 32 }}><Icon icon="mdi:check" width="20" height="20" /></span>;
  if (stage.status === "IN_PROGRESS")
    return <span className={`${base} text-white`} style={{ width: 32, height: 32, background: RED }}><Icon icon="mdi:progress-clock" width="20" height="20" /></span>;
  return <span className={`${base} bg-light text-muted border small`} style={{ width: 32, height: 32 }}>{stage.stageNo}</span>;
}

function MiniInfo({ label, icon, children }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: "0.72rem" }}>{label}</div>
      <div className="fw-semibold small">
        <Icon icon={icon} width="14" height="14" className="me-1 text-muted" />
        {children}
      </div>
    </div>
  );
}

function Timeline({ stages, jobStart }) {
  const [showPending, setShowPending] = useState(false);
  const pending = stages.filter((s) => s.status === "PENDING");
  const visible = showPending ? stages : stages.filter((s) => s.status !== "PENDING");

  return (
    <>
      <Row className="g-2">
        {visible.map((s) => {
          const isPending = s.status === "PENDING";
          const took = s.status === "COMPLETED" ? duration(s.startedAt, s.completedAt) : null;
          return (
            <Fragment key={s.stageNo}>
              <Col xl={6}>
                <div className="rounded border bg-white p-3 shadow-sm h-100" style={{ borderLeft: `4px solid ${ACCENT[s.status]}`, opacity: isPending ? 0.7 : 1 }}>
                  <div className="d-flex align-items-center gap-2">
                    <StageDot stage={s} />
                    <div className="flex-grow-1 fw-semibold">Stage {s.stageNo} · {s.stageName}</div>
                    {took && <small className="text-muted text-nowrap">took {took}</small>}
                    <Badge bg={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "danger" : "secondary"}>
                      {s.status === "IN_PROGRESS" ? "In progress" : s.status === "COMPLETED" ? "Completed" : "Pending"}
                    </Badge>
                  </div>

                  {s.status === "COMPLETED" && (
                    <Row className="g-2 mt-2 pt-2 border-top">
                      <Col sm={6}>
                        <MiniInfo label="Completed on" icon="mdi:calendar-check-outline">{fmtDay(s.completedAt)}, {fmtTime(s.completedAt)}</MiniInfo>
                      </Col>
                      <Col sm={6}>
                        <MiniInfo label="Completed by" icon="mdi:account-outline">
                          {s.completedByName ? <>{s.completedByName} <span className="text-muted fw-normal">(@{s.completedByUsername})</span></> : "Unknown user"}
                        </MiniInfo>
                      </Col>
                    </Row>
                  )}
                  {s.status === "IN_PROGRESS" && (
                    <Row className="g-2 mt-2 pt-2 border-top">
                      <Col sm={6}><MiniInfo label="Started on" icon="mdi:clock-start">{fmtDay(s.startedAt)}, {fmtTime(s.startedAt)}</MiniInfo></Col>
                      <Col sm={6}><MiniInfo label="Status" icon="mdi:timer-sand">Waiting to be completed</MiniInfo></Col>
                    </Row>
                  )}
                  {s.remarks && <div className="small mt-2 fst-italic">“{s.remarks}”</div>}
                </div>
              </Col>

              {/* Stage 4 A: initial start confirmed (shown right after the complaint stage) */}
              {jobStart && s.stageNo === 5 && (
                <Col xl={6}>
                  <div className="rounded border bg-white p-3 shadow-sm h-100" style={{ borderLeft: "4px solid #0d9488" }}>
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32 }}>
                        <Icon icon="mdi:play" width="20" height="20" />
                      </span>
                      <div className="flex-grow-1 fw-semibold">
                        Stage 4 A · Initial start confirmed
                        <div className="small text-muted fw-normal">Job started for {jobStart.departmentName}</div>
                      </div>
                      <Badge bg="success">Started</Badge>
                    </div>
                    <Row className="g-2 mt-2 pt-2 border-top">
                      <Col sm={6}><MiniInfo label="Confirmed on" icon="mdi:calendar-check-outline">{fmtDay(jobStart.confirmedAt)}, {fmtTime(jobStart.confirmedAt)}</MiniInfo></Col>
                      <Col sm={6}><MiniInfo label="Confirmed by" icon="mdi:account-outline">{jobStart.confirmedByName || "Unknown user"}</MiniInfo></Col>
                    </Row>
                  </div>
                </Col>
              )}
            </Fragment>
          );
        })}
      </Row>

      {pending.length > 0 && (
        <Button variant="link" size="sm" className="px-0 mt-2" style={{ color: RED }} onClick={() => setShowPending((v) => !v)}>
          {showPending ? "Hide" : "Show"} {pending.length} pending stage{pending.length > 1 ? "s" : ""}
        </Button>
      )}
    </>
  );
}

/* ----------------------------- overview ----------------------------- */
function Overview({ data }) {
  const { job, customer, vehicle, consultant, createdBy } = data;
  const dept = job.departmentName ? getDepartmentUi(job.departmentName) : null;
  const today = localToday();
  const apptState = !vehicle.appointmentDate ? "" : vehicle.appointmentDate === today ? "today" : vehicle.appointmentDate > today ? "upcoming" : "past";
  const apptColor = apptState === "today" ? RED : apptState === "past" ? "#64748b" : "#15803d";

  return (
    <Row className="g-3">
      <Col xl={4} lg={6}>
        <Section title="Customer" icon="mdi:account-circle-outline">
          <Info label="Name">{customer.name}</Info>
          <Info label="Customer ID (ERP)">{customer.customerId}</Info>
          <Info label="Mobile" icon="mdi:phone-outline">{customer.contactNumber}</Info>
          <Info label="WhatsApp number" icon="mdi:whatsapp">{customer.altContactNumber}</Info>
          <Info label="Email" icon="mdi:email-outline">{customer.email}</Info>
          <Info label="NIC / Passport">{customer.nic}</Info>
          <Info label="Company">{customer.companyName}</Info>
          <Info label="Profession">{customer.profession}</Info>
          <Info label="Date of birth" icon="mdi:cake-variant-outline">{customer.birthDate ? fmtShort(customer.birthDate) : null}</Info>
          <Info label="Customer category" icon="mdi:account-group-outline">{customer.groupName}</Info>
          <Info label="Found us through" icon="mdi:bullhorn-outline">{customer.sourceName}</Info>
          <Info label="Referred by">{customer.referredByName}</Info>
          <Info label="Referral code" icon="mdi:gift-outline">{customer.referralCode}</Info>
          <Info label="Loyalty points" icon="mdi:star-circle-outline">{customer.loyaltyPoints != null ? Number(customer.loyaltyPoints).toLocaleString() : null}</Info>
          <Info label="HR category">
            {customer.categoryName && (
              <>{customer.categoryName} <Badge bg={APPROVAL_BADGE[customer.categoryApprovalStatus] || "secondary"}>{customer.categoryApprovalStatus}</Badge></>
            )}
          </Info>
          <Info label="HR D. remarks">{customer.categoryRemarks}</Info>
        </Section>
      </Col>

      <Col xl={4} lg={6}>
        <Section title="Vehicle" icon="mdi:car-outline">
          <Info label="Registration number">{vehicle.regNo ? <Plate>{vehicle.regNo}</Plate> : null}</Info>
          <Info label="Year of manufacture">{vehicle.year}</Info>
          <Info label="Mileage">{vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} km` : null}</Info>
          <Info label="Colour">{vehicle.colour}</Info>
          <Info label="Chassis number">{vehicle.chassisNo}</Info>
          <Info label="Engine number">{vehicle.engineNo}</Info>
          <Info label="Tyre size">{vehicle.tyreSize}</Info>
        </Section>

        <Section title="Appointment" icon="mdi:calendar-clock-outline"
          right={vehicle.appointmentDate ? <Chip color={apptColor}>{apptState === "today" ? "Today" : apptState === "upcoming" ? "Upcoming" : "Past"}</Chip> : <Chip>Walk-in</Chip>}>
          {vehicle.appointmentDate ? (
            <>
              <Info label="Date">{fmtDay(`${vehicle.appointmentDate}T00:00:00`)}</Info>
              <Info label="Time">{vehicle.appointmentTime}</Info>
              <Info label="Sales officer" icon="mdi:account-tie-outline">{vehicle.salesOfficer}</Info>
              <Info label="Department">{vehicle.appointmentDepartment}</Info>
            </>
          ) : (
            <Empty>This vehicle came without an appointment.</Empty>
          )}
          <Info label="Customer matter">{vehicle.matter}</Info>
        </Section>
      </Col>

      <Col xl={4} lg={12}>
        <Section title="Job" icon="mdi:briefcase-outline">
          <Info label="Job number">{job.jobNo}</Info>
          <Info label="Status"><Badge bg={STATUS_BADGE[job.status] || "secondary"}>{STATUS_TEXT[job.status] || job.status}</Badge></Info>
          <Info label="Current stage">Stage {job.stageNo} · {job.stageName}</Info>
          <Info label="Department">
            {dept && <span style={{ color: dept.color }}><Icon icon={dept.icon} width="16" height="16" className="me-1" />{job.departmentName}</span>}
          </Info>
          <Info label="Created">{fmtDT(job.createdAt)}</Info>
          <Info label="Last updated">{fmtDT(job.updatedAt)}</Info>
          <Info label="Job started by" icon="mdi:account-outline">{createdBy ? `${createdBy.name} (@${createdBy.username})` : null}</Info>
        </Section>

        <Section title="Consultant" icon="mdi:account-tie-outline">
          <Info label="Name">{consultant.name}</Info>
          <Info label="Mobile" icon="mdi:phone-outline">{consultant.mobile}</Info>
          <Info label="Email" icon="mdi:email-outline">{consultant.email}</Info>
        </Section>
      </Col>
    </Row>
  );
}

/* ----------------------------- stage details ----------------------------- */
function Tick({ ok }) {
  return ok
    ? <Icon icon="mdi:check-circle" width="18" height="18" style={{ color: "#16a34a" }} />
    : <Icon icon="mdi:checkbox-blank-circle-outline" width="18" height="18" style={{ color: "#94a3b8" }} />;
}

const SECTION_NAMES = { PRE_REPAIR: "Pre-repair preparation", PPE: "PPE", VEHICLE_PROTECTION: "Customer vehicle protection", SPARE_PARTS: "Spare parts" };
const DECISION_TEXT = { TOTAL: "Total approved", PARTIAL: "Partially approved" };
const VIA_TEXT = { SMS: "SMS", WHATSAPP: "WhatsApp", ERP: "ERP system", PHONE_CALL: "Phone call", EMAIL: "Email" };
const timeText = (e) => (e.estDays || e.estHours ? [e.estDays ? `${e.estDays} day(s)` : null, e.estHours ? `${e.estHours} hour(s)` : null].filter(Boolean).join(" ") : null);

function Thumbs({ list, onPick }) {
  return (
    <div className="d-flex flex-wrap gap-2 py-2">
      {list.map((f) => (
        <button key={f.id ?? f.url} type="button" className="jv-thumb" onClick={() => onPick(f)} title={f.name}>
          {f.type === "VIDEO" || /video/.test(f.mime || "")
            ? <span className="d-flex align-items-center justify-content-center h-100 text-white"><Icon icon="mdi:play-circle-outline" width="30" height="30" /></span>
            : <img src={f.url} alt={f.name} loading="lazy" decoding="async" />}
        </button>
      ))}
    </div>
  );
}

function StageDetails({ jobId }) {
  const { data, isLoading, isError, refetch } = useGetJobStageDetailsQuery(jobId);
  const [preview, setPreview] = useState(null);
  if (isLoading) return <Loading text="Loading stage details..." />;
  if (isError || !data) return <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load the stage details.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>;

  const { complaint, allocation, evidence, inspection, spare, estimate, internal, activation, damageReport } = data;
  const files = evidence?.files || [];
  const general = files.filter((f) => f.category !== "PROPERTY");
  const property = files.filter((f) => f.category === "PROPERTY");
  const missing = [
    !complaint && "Customer complaint", !allocation && "Team / bay allocation", files.length === 0 && "Vehicle evidence", !inspection && "Job inspection",
    !spare && "Spare parts", !estimate && "Customer approval", !internal && "Internal inspection", !activation && "Job activation", !damageReport && "Damages report",
  ].filter(Boolean);

  return (
    <>
      <Row className="g-3">
        <Col xl={6}>
          {complaint && (
            <Section title="Customer complaint" icon="mdi:message-alert-outline" right={<Chip color="#64748b">{fmtDT(complaint.createdAt)}</Chip>}>
              <Info label="Complaint">{complaint.complaint}</Info>
              <Info label="Remarks">{complaint.remarks}</Info>
              <Info label="Vehicle pass issued">{yesNo(complaint.vehiclePassIssued)}</Info>
              <Info label="Initial customer approval">{yesNo(complaint.initialApproval)}</Info>
              <Info label="Job start confirmed">{complaint.startConfirmedAt ? fmtDT(complaint.startConfirmedAt) : null}</Info>
              <Info label="Recorded by">{complaint.recordedBy}</Info>
              {(complaint.options || []).length > 0 && (
                <div className="py-2">
                  <div className="text-muted small mb-1">Selected options</div>
                  <div className="d-flex flex-wrap gap-1">
                    {complaint.options.map((o, i) => (
                      <Chip key={i} color={o.level === "SUB" ? "#64748b" : RED}>
                        {o.listTitle}: {o.group ? `${o.group} › ` : ""}{o.name}{o.price ? ` · ${rs(o.price)}` : ""}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {allocation && (
            <Section title={allocation.type === "TEAM" ? "Team allocation" : "Bay allocation"} icon="mdi:account-group-outline" right={<Chip color="#64748b">{fmtDT(allocation.at)}</Chip>}>
              {allocation.type === "TEAM" && <Info label="Team">{allocation.teamName}</Info>}
              <Info label="Bay" icon="mdi:garage-variant">{allocation.bayName}</Info>
              {allocation.type === "TEAM" && (
                <>
                  <Info label="Team leader">{allocation.leader}</Info>
                  <Info label="PPE used">{yesNo(allocation.ppe)}</Info>
                  <Info label="Vehicle protection applied">{yesNo(allocation.protection)}</Info>
                </>
              )}
            </Section>
          )}

          {files.length > 0 && (
            <Section title="Vehicle evidence" icon="mdi:car-search-outline" right={<Chip color={RED}>{files.length} file{files.length === 1 ? "" : "s"}</Chip>}>
              <Info label="Property inside the vehicle">{yesNo(evidence.propertyInside)}</Info>
              {general.length > 0 && <><div className="text-muted small pt-2">Vehicle photos / videos ({general.length})</div><Thumbs list={general} onPick={setPreview} /></>}
              {property.length > 0 && <><div className="text-muted small pt-2">Customer property ({property.length})</div><Thumbs list={property} onPick={setPreview} /></>}
            </Section>
          )}

          {inspection && (
            <Section title="Vehicle job inspection" icon="mdi:clipboard-check-outline" right={inspection.signedAt ? <Chip color="#16a34a" icon="mdi:draw">Signed</Chip> : null}>
              <Info label="Test run">{inspection.testRun === "NECESSARY" ? "Necessary" : inspection.testRun === "NOT_NECESSARY" ? "Not necessary" : null}</Info>
              <Info label="Faults found">{yesNo(inspection.faultsFound)}</Info>
              <Info label="Related to previous repair">{yesNo(inspection.previousRepair)}</Info>
              <Info label="New repair">{yesNo(inspection.newRepair)}</Info>
              <Info label="Warranty available">{yesNo(inspection.warranty)}</Info>
              <Info label="History remarks">{inspection.historyRemarks}</Info>
              {(inspection.repairTypes || []).length > 0 && (
                <div className="py-2">
                  <div className="text-muted small mb-1">Type of repair</div>
                  <div className="d-flex flex-wrap gap-1">{inspection.repairTypes.map((t) => <Chip key={t} color={RED}>{t}</Chip>)}</div>
                </div>
              )}
              {["FAULT", "IDENTIFIED_FAULT", "ROOT_CAUSE"].map((k) => {
                const list = (inspection.items || []).filter((x) => x.kind === k);
                if (!list.length) return null;
                return (
                  <div key={k} className="py-2 border-top">
                    <div className="text-muted small mb-1">{k === "FAULT" ? "Faults recorded" : k === "IDENTIFIED_FAULT" ? "Identified faults" : "Root causes"}</div>
                    <ul className="mb-0 ps-3">{list.map((x, i) => <li key={i}>{x.description}</li>)}</ul>
                  </div>
                );
              })}
              {(inspection.repairs || []).length > 0 && (
                <div className="py-2 border-top">
                  <div className="text-muted small mb-1">Repair items</div>
                  {inspection.repairs.map((r, i) => (
                    <div key={i} className="d-flex justify-content-between gap-2 py-1" style={{ opacity: r.status === "ACTIVE" ? 1 : 0.55, textDecoration: r.status === "ACTIVE" ? "none" : "line-through" }}>
                      <span>{r.description}{r.repairType ? <span className="text-muted"> · {r.repairType}</span> : null}{r.status !== "ACTIVE" ? <span className="text-muted"> ({r.status.toLowerCase()})</span> : null}</span>
                      <strong className="text-nowrap">{r.warrantyClaim ? <span className="badge text-bg-success">Warranty claim</span> : rs(r.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
              {(inspection.files || []).length > 0 && (
                <>
                  <div className="text-muted small pt-2 border-top">Attachments ({inspection.files.length})</div>
                  <Thumbs list={inspection.files.map((f, i) => ({ ...f, id: `i${i}`, type: /video/.test(f.mime || "") ? "VIDEO" : "IMAGE" }))} onPick={setPreview} />
                </>
              )}
              <Info label="Signed by">{inspection.signedBy ? `${inspection.signedBy}${inspection.signedAt ? ` · ${fmtDT(inspection.signedAt)}` : ""}` : null}</Info>
            </Section>
          )}
        </Col>

        <Col xl={6}>
          {spare && (
            <Section title="Spare part review & order" icon="mdi:cog-transfer-outline" right={<Chip color={RED}>{rs(spare.value)}</Chip>}>
              {spare.noParts && <Info label="Spare parts">Not needed for this job</Info>}
              {(spare.parts || []).length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-1 jv-table">
                    <thead><tr><th>Part</th><th>Brand</th><th>Quality</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Total</th></tr></thead>
                    <tbody>
                      {spare.parts.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}{p.stock === "OUT_OF_STOCK" && <span className="ms-1 text-danger small">(out of stock)</span>}</td>
                          <td>{p.brand || "-"}</td><td>{p.quality || "-"}</td>
                          <td className="text-end">{p.qty}</td><td className="text-end">{rs(p.unitPrice)}</td><td className="text-end fw-semibold">{rs(p.qty * p.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(spare.quotes || []).length > 0 && (
                <div className="py-2 border-top">
                  <div className="text-muted small mb-1">Third-party quotations</div>
                  {spare.quotes.map((q, i) => (
                    <div key={i} className="d-flex justify-content-between gap-2 py-1">
                      <span>{q.description || "Quoted item"}</span>
                      <strong>{q.quotedPrice != null ? rs(q.quotedPrice) : <span className="text-muted fw-normal">waiting</span>}</strong>
                    </div>
                  ))}
                </div>
              )}
              <Info label="Link sent to third parties">{spare.linkSentAt ? fmtDT(spare.linkSentAt) : null}</Info>
              <Info label="Stage completed">{spare.completedAt ? fmtDT(spare.completedAt) : null}</Info>
            </Section>
          )}

          {estimate && (
            <Section title="Customer approval" icon="mdi:account-check-outline" right={estimate.completedAt ? <Chip color="#16a34a" icon="mdi:check">Completed</Chip> : <Chip color="#d97706">Open</Chip>}>
              <Info label="Estimated time">{timeText(estimate)}</Info>
              <Info label="Estimated total"><span style={{ color: RED }}>{rs(estimate.total)}</span></Info>
              <Info label="Estimate sent via">{(estimate.sentVia || []).length ? estimate.sentVia.map((v) => VIA_TEXT[v] || v).join(", ") : null}</Info>
              <Info label="Customer confirmation">{estimate.decision ? <Badge bg={estimate.decision === "TOTAL" ? "success" : "warning"}>{DECISION_TEXT[estimate.decision] || estimate.decision}</Badge> : null}</Info>
              {(estimate.agreedScope || []).length > 0 && (
                <div className="py-2"><div className="text-muted small mb-1">Agreed scope</div><ul className="mb-0 ps-3">{estimate.agreedScope.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
              <Info label="Extra note">{estimate.extraNote}</Info>
              <Info label="Spare parts supplied by">{estimate.partsBy === "COMPANY" ? "Company" : estimate.partsBy === "CLIENT" ? "Customer" : estimate.partsBy}</Info>
              <Info label="Repair request to Logistic & Stock">{estimate.repairRequestSentAt ? fmtDT(estimate.repairRequestSentAt) : null}</Info>
              <Info label="Third-party request">{estimate.thirdPartyRequest ? `Yes${estimate.thirdPartyNote ? ` · ${estimate.thirdPartyNote}` : ""}` : null}</Info>
            </Section>
          )}

          {internal && (
            <Section title="Internal inspection - 1" icon="mdi:clipboard-list-outline"
              right={internal.completedAt ? <Chip color="#16a34a" icon="mdi:check">Completed</Chip> : <Chip color="#d97706">Open</Chip>}>
              {Object.keys(SECTION_NAMES).map((sec) => {
                const list = [...(internal.items || []).filter((x) => x.section === sec), ...(internal.extras || []).filter((x) => x.section === sec).map((x) => ({ ...x, label: `${x.label} (extra)` }))];
                if (!list.length) return null;
                return (
                  <div key={sec} className="py-2 border-bottom">
                    <div className="text-muted small mb-1">{SECTION_NAMES[sec]} · {list.filter((x) => x.checked).length}/{list.length}</div>
                    {list.map((x, i) => <div key={i} className="d-flex align-items-start gap-2 py-1"><Tick ok={x.checked} /><span>{x.label}</span></div>)}
                  </div>
                );
              })}
              <Info label="Notes">{internal.notes}</Info>
              <Info label="Logistics reminder sent">{internal.logisticsReminderAt ? fmtDT(internal.logisticsReminderAt) : null}</Info>
              <Info label="Customer reminder sent">{internal.customerReminderAt ? fmtDT(internal.customerReminderAt) : null}</Info>
            </Section>
          )}

          {activation && (
            <Section title="Job activation" icon="mdi:rocket-launch-outline" right={<Chip color="#16a34a" icon="mdi:rocket-launch">Activated</Chip>}>
              <Info label="Activated on">{fmtDT(activation.activatedAt)}</Info>
              <Info label="Activated by">{activation.activatedBy}</Info>
            </Section>
          )}

          {damageReport && (
            <Section title="Vehicle damages report" icon="mdi:file-alert-outline" right={damageReport.skipped ? <Chip>Skipped</Chip> : null}>
              <Info label="Need deep check">{yesNo(damageReport.needDeepCheck)}</Info>
              <Info label="Need repair">{yesNo(damageReport.needRepair)}</Info>
              <Info label="Customer decision">{damageReport.decision === "CONFIRMED" ? "Confirmed" : damageReport.decision === "DECLINED" ? "Declined" : null}</Info>
              <Info label="Decided on">{damageReport.decidedAt ? fmtDT(damageReport.decidedAt) : null}</Info>
              <Info label="Customer note">{damageReport.customerNote}</Info>
              {(damageReport.damages || []).length > 0 && (
                <div className="py-2 border-top"><div className="text-muted small mb-1">Damages</div><ul className="mb-0 ps-3">{damageReport.damages.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
              )}
              {(damageReport.agreed || []).length > 0 && (
                <div className="py-2 border-top">
                  <div className="text-muted small mb-1">Agreed actions</div>
                  {damageReport.agreed.map((a, i) => <div key={i} className="d-flex justify-content-between gap-2 py-1"><span>{a.description}</span><Chip color={RED}>{a.action.replace("_", " ").toLowerCase()}</Chip></div>)}
                </div>
              )}
            </Section>
          )}
        </Col>
      </Row>

      {missing.length > 0 && (
        <div className="small text-muted mt-1"><Icon icon="mdi:information-outline" width="16" height="16" className="me-1" />Not recorded yet: {missing.join(" · ")}</div>
      )}

      <Modal show={Boolean(preview)} onHide={() => setPreview(null)} centered size="lg" contentClassName="bg-dark">
        <Modal.Body className="p-1 text-center" onClick={() => setPreview(null)}>
          {preview && (preview.type === "VIDEO" || /video/.test(preview.mime || "")
            ? <video src={preview.url} controls autoPlay playsInline style={{ maxWidth: "100%", maxHeight: "80vh" }} />
            : <img src={preview.url} alt={preview.name} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />)}
        </Modal.Body>
      </Modal>
    </>
  );
}

/* ----------------------------- estimate ----------------------------- */
function Line({ left, sub, amount, muted, claim }) {
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 py-2 border-bottom" style={{ opacity: muted ? 0.5 : 1 }}>
      <div>{left}{sub && <div className="small text-muted">{sub}</div>}</div>
      <div className="fw-semibold text-nowrap">{claim ? <span className="badge text-bg-success">Warranty claim</span> : rs(amount)}</div>
    </div>
  );
}

function Estimate({ jobId }) {
  const { data, isLoading, isError, refetch } = useGetJobStageDetailsQuery(jobId);
  if (isLoading) return <Loading text="Loading estimate..." />;
  if (isError || !data) return <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load the estimate.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>;

  const { spare, estimate, inspection } = data;
  const parts = spare?.parts || [];
  const quotes = (spare?.quotes || []).filter((q) => q.quotedPrice != null);
  const labour = (inspection?.repairs || []).filter((r) => r.status === "ACTIVE");
  const manual = estimate?.manualItems || [];
  const wash = estimate?.washItems || [];
  const includeSpare = estimate ? estimate.includeSpareParts : true;
  const includeLabour = estimate ? estimate.includeLabour : true;

  if (!estimate && parts.length === 0 && quotes.length === 0 && labour.length === 0) {
    return <Empty>No estimate yet. It is prepared in the Customer Approval stage.</Empty>;
  }

  const spareTotal = includeSpare ? (spare?.value || 0) : 0;
  const labourTotal = includeLabour ? labour.filter((r) => !r.warrantyClaim).reduce((t, r) => t + (r.amount || 0), 0) : 0;
  const manualTotal = manual.reduce((t, m) => t + (Number(m.amount) || 0), 0);
  const washTotal = wash.reduce((t, w) => t + (Number(w.price) || 0), 0);
  const markupPct = Number(estimate?.markupPercent) || 0; // price adjustment (markup) chosen in the Vehicle Job Inspection
  const markupTotal = estimate?.markup != null ? Number(estimate.markup) : Math.round((spareTotal + labourTotal + manualTotal) * markupPct) / 100; // the server adds it to each line
  const total = Math.round((spareTotal + labourTotal + manualTotal + markupTotal + washTotal) * 100) / 100;

  return (
    <Row className="g-3">
      <Col xl={8}>
        <Section title="Estimate" icon="mdi:calculator-variant-outline"
          right={estimate ? <Chip color={estimate.completedAt ? "#16a34a" : "#d97706"}>{estimate.completedAt ? "Approval stage completed" : "Draft"}</Chip> : <Chip color="#d97706">Not prepared yet (preview)</Chip>}>
          <div className="fw-bold small text-uppercase text-muted pt-2">Spare parts {!includeSpare && "(not included)"}</div>
          {parts.length === 0 && quotes.length === 0 && <div className="text-muted small py-2">No spare parts.</div>}
          {parts.map((p, i) => <Line key={`p${i}`} muted={!includeSpare} left={p.name} sub={`${p.brand || ""}${p.brand && p.quality ? " · " : ""}${p.quality || ""} · ${p.qty} × ${rs(p.unitPrice)}`} amount={p.qty * p.unitPrice} claim={p.warrantyClaim} />)}
          {quotes.map((q, i) => <Line key={`q${i}`} muted={!includeSpare} left={q.description || "Third-party item"} sub="Third-party quotation" amount={q.quotedPrice} />)}

          <div className="fw-bold small text-uppercase text-muted pt-3">Cost for repair {!includeLabour && "(labour not included)"}</div>
          {labour.length === 0 && manual.length === 0 && <div className="text-muted small py-2">No repair lines.</div>}
          {labour.map((r, i) => <Line key={`l${i}`} muted={!includeLabour} left={r.description} sub={r.repairType} amount={r.amount} claim={r.warrantyClaim} />)}
          {manual.map((m, i) => <Line key={`m${i}`} left={m.description || m.name || "Extra item"} sub="Added manually" amount={Number(m.amount) || 0} />)}

          {markupPct > 0 && <Line left={`Price adjustment +${markupPct}%`} sub="On spare parts and cost for repair" amount={markupTotal} />}
          {wash.length > 0 && (
            <>
              <div className="fw-bold small text-uppercase text-muted pt-3">Wash</div>
              {wash.map((w, i) => <Line key={`w${i}`} left={w.name} sub={w.group} amount={Number(w.price) || 0} />)}
            </>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3 mb-2 px-3 py-3 rounded-3 text-white" style={{ background: HDR }}>
            <span className="fw-bold">Estimated total</span>
            <span className="fw-bold fs-4">{rs(total)}</span>
          </div>
        </Section>
      </Col>
      <Col xl={4}>
        <Section title="Summary" icon="mdi:chart-box-outline">
          <Info label="Spare parts">{rs(spareTotal)}</Info>
          <Info label="Cost for repair">{rs(labourTotal + manualTotal)}</Info>
          {markupPct > 0 && <Info label={`Price adjustment +${markupPct}%`}>{rs(markupTotal)}</Info>}
          <Info label="Wash">{rs(washTotal)}</Info>
          <Info label="Estimated total"><span style={{ color: RED }}>{rs(total)}</span></Info>
        </Section>
        {estimate && (
          <Section title="Approval" icon="mdi:account-check-outline">
            <Info label="Estimated time">{timeText(estimate)}</Info>
            <Info label="Sent via">{(estimate.sentVia || []).length ? estimate.sentVia.map((v) => VIA_TEXT[v] || v).join(", ") : null}</Info>
            <Info label="Customer confirmation">{estimate.decision ? <Badge bg={estimate.decision === "TOTAL" ? "success" : "warning"}>{DECISION_TEXT[estimate.decision] || estimate.decision}</Badge> : null}</Info>
            <Info label="Extra note">{estimate.extraNote}</Info>
          </Section>
        )}
      </Col>
    </Row>
  );
}

/* ----------------------------- previous jobs ----------------------------- */
function JobList({ rows, onOpenJob }) {
  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0 jv-table">
        <thead><tr><th>Job</th><th>Date</th><th>Vehicle</th><th>Department</th><th>Complaint</th><th>Status / stage</th><th className="text-end">Estimate</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><span className="jv-jobno">{r.jobNo}</span></td>
              <td className="text-nowrap small">{fmtShort(r.createdAt)}</td>
              <td className="text-nowrap"><Plate>{r.regNo}</Plate>{r.mileage != null && <div className="small text-muted">{Number(r.mileage).toLocaleString()} km</div>}</td>
              <td>{r.departmentName || "-"}</td>
              <td style={{ maxWidth: 260 }}><div className="small text-truncate" title={r.complaint || ""}>{r.complaint || "-"}</div></td>
              <td><Badge bg={STATUS_BADGE[r.status] || "secondary"}>{STATUS_TEXT[r.status] || r.status}</Badge>{r.status === "IN_PROGRESS" && <div className="small text-muted">{r.stageName}</div>}</td>
              <td className="text-end text-nowrap fw-semibold">{r.estimatedTotal != null ? rs(r.estimatedTotal) : "-"}</td>
              <td className="text-end"><Button size="sm" className="jv-btn" onClick={() => onOpenJob(r.id)}><Icon icon="mdi:eye-outline" width="16" height="16" /> Open</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function History({ jobId, onOpenJob }) {
  const { data, isLoading, isError, refetch } = useGetJobHistoryQuery(jobId);
  if (isLoading) return <Loading text="Loading previous jobs..." />;
  if (isError || !data) return <Alert variant="danger" className="d-flex justify-content-between align-items-center"><span>Failed to load the previous jobs.</span><Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button></Alert>;

  const { sameVehicle = [], other = [], lastJob } = data;
  if (!lastJob) return <Empty>This customer has no previous jobs.</Empty>;

  return (
    <>
      <div className="jv-card mb-3" style={{ borderLeft: `5px solid ${RED}` }}>
        <div className="jv-card-head d-flex align-items-center gap-2">
          <Icon icon="mdi:history" width="19" height="19" style={{ color: RED }} />
          <span className="fw-bold">Last previous job</span>
          <Button size="sm" className="jv-btn ms-auto" onClick={() => onOpenJob(lastJob.id)}><Icon icon="mdi:eye-outline" width="16" height="16" /> Open this job</Button>
        </div>
        <div className="px-3 py-2">
          <Row className="g-2">
            <Col md={3}><div className="text-muted small">Job</div><span className="jv-jobno">{lastJob.jobNo}</span></Col>
            <Col md={3}><div className="text-muted small">Date</div><div className="fw-semibold">{fmtShort(lastJob.createdAt)}</div></Col>
            <Col md={3}><div className="text-muted small">Vehicle</div><Plate>{lastJob.regNo}</Plate>{lastJob.sameVehicle && <span className="ms-2 small text-success fw-semibold">same vehicle</span>}</Col>
            <Col md={3}><div className="text-muted small">Department</div><div className="fw-semibold">{lastJob.departmentName || "-"}</div></Col>
            <Col md={6}><div className="text-muted small">Complaint</div><div>{lastJob.complaint || "-"}</div></Col>
            <Col md={3}><div className="text-muted small">Status</div><Badge bg={STATUS_BADGE[lastJob.status] || "secondary"}>{STATUS_TEXT[lastJob.status] || lastJob.status}</Badge></Col>
            <Col md={3}><div className="text-muted small">Estimate</div><div className="fw-bold" style={{ color: RED }}>{lastJob.estimatedTotal != null ? rs(lastJob.estimatedTotal) : "-"}</div></Col>
          </Row>
        </div>
      </div>

      {sameVehicle.length > 0 && (
        <Section title={`Previous jobs of this vehicle (${sameVehicle.length})`} icon="mdi:car-clock"><JobList rows={sameVehicle} onOpenJob={onOpenJob} /></Section>
      )}
      {other.length > 0 && (
        <Section title={`Other jobs of this customer (${other.length})`} icon="mdi:account-clock-outline"><JobList rows={other} onOpenJob={onOpenJob} /></Section>
      )}
    </>
  );
}

/* ----------------------------- modal ----------------------------- */
const TABS = [
  { key: "overview", label: "Overview", icon: "mdi:view-dashboard-outline" },
  { key: "timeline", label: "Timeline", icon: "mdi:timeline-clock-outline" },
  { key: "stages", label: "Stage details", icon: "mdi:clipboard-text-clock-outline" },
  { key: "estimate", label: "Estimate", icon: "mdi:calculator-variant-outline" },
  { key: "history", label: "Previous jobs", icon: "mdi:history" },
];

export default function JobDetailsModal({ jobId, onHide }) {
  // A previous job can be opened inside the same window; "Back" returns to the job that was opened first.
  const [openedId, setOpenedId] = useState(null);
  const [tab, setTab] = useState("overview");
  useEffect(() => { setOpenedId(null); setTab("overview"); }, [jobId]);
  const activeId = openedId || jobId;

  const { data, isLoading, isError, refetch } = useGetJobDetailsQuery(activeId, { skip: !activeId });
  const { job, vehicle, customer, stages = [], jobStart } = data || {};
  const dept = job?.departmentName ? getDepartmentUi(job.departmentName) : null;
  const done = stages.filter((s) => s.status === "COMPLETED").length;

  const openPrevious = (id) => { setOpenedId(id); setTab("overview"); };

  return (
    <Modal show={Boolean(jobId)} onHide={onHide} fullscreen scrollable contentClassName="jv-content">
      <style>{`
        .jv-content { background: #f6f6f7; }
        .jv-head { background: ${HDR}; color: #fff; padding: 14px 20px 0; flex-shrink: 0; }
        .jv-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin-top: 12px; }
        .jv-tabs::-webkit-scrollbar { display: none; }
        .jv-tab { border: 0; background: rgba(255,255,255,.12); color: #fff; font-weight: 600; padding: 10px 18px; border-radius: 12px 12px 0 0; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: background .15s; }
        .jv-tab:hover { background: rgba(255,255,255,.22); }
        .jv-tab.on { background: #f6f6f7; color: #111; box-shadow: inset 0 3px 0 ${RED}; }
        .jv-card { background: #fff; border: 1px solid #e3e3e6; border-radius: 14px; box-shadow: 0 4px 14px -10px rgba(15,23,42,.4); overflow: hidden; }
        .jv-card-head { padding: 11px 16px; border-bottom: 1px solid #ececef; background: #fafafb; }
        .jv-info + .jv-info { border-top: 1px solid #f1f1f3; }
        .jv-table thead th { background: #111; color: #fff; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; border: 0; padding: 9px 8px; white-space: nowrap; }
        .jv-table td { padding: 9px 8px; font-size: .88rem; }
        .jv-jobno { display: inline-block; background: #111; color: #fff; border-radius: 8px; padding: 3px 10px; font-weight: 700; font-size: .8rem; box-shadow: inset 3px 0 0 ${RED}; }
        .jv-btn { color: #fff !important; border: 0 !important; border-radius: 10px; font-weight: 600; background: ${BLK}; box-shadow: inset 0 -3px 0 ${RED}; }
        .jv-btn:hover { filter: brightness(1.25); }
        .jv-thumb { width: 92px; height: 92px; border-radius: 10px; overflow: hidden; border: 1.5px solid #c4c4ca; background: #111; padding: 0; cursor: pointer; }
        .jv-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .jv-thumb:hover { border-color: ${RED}; }
        .jv-body { padding: 16px 20px 28px; }
        @media (max-width: 575.98px) { .jv-head { padding: 10px 12px 0; } .jv-body { padding: 12px 10px 24px; } .jv-tab { padding: 9px 12px; } }
      `}</style>

      <div className="jv-head">
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
          <Icon icon="mdi:clipboard-text-outline" width="32" height="32" />
          <div className="me-auto">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fs-4 fw-bold">{job ? job.jobNo : "Job details"}</span>
              {job && <Badge bg={STATUS_BADGE[job.status] || "secondary"} text={job.status === "IN_PROGRESS" ? "dark" : undefined}>{STATUS_TEXT[job.status] || job.status}</Badge>}
              {job?.departmentName && dept && (
                <span className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1 small fw-semibold" style={{ background: "rgba(255,255,255,.18)" }}>
                  <Icon icon={dept.icon} width="15" height="15" /> {job.departmentName}
                </span>
              )}
              {openedId && (
                <Button size="sm" variant="light" className="ms-1 fw-semibold" onClick={() => { setOpenedId(null); setTab("history"); }}>
                  <Icon icon="mdi:arrow-left" width="16" height="16" /> Back to the first job
                </Button>
              )}
            </div>
            {job && (
              <div className="small" style={{ color: "rgba(255,255,255,.8)" }}>
                {customer?.name} · {vehicle?.regNo} · Stage {job.stageNo} {job.stageName}
              </div>
            )}
          </div>
          <Button variant="light" className="fw-semibold border-0 px-3" style={{ borderRadius: 10, minHeight: 40 }} onClick={onHide}>
            <Icon icon="mdi:close" width="20" height="20" /> Close
          </Button>
        </div>

        <div className="jv-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`jv-tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
              <Icon icon={t.icon} width="18" height="18" /> {t.label}
              {t.key === "timeline" && stages.length > 0 && <span className="small opacity-75">{done}/{stages.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <Modal.Body className="jv-body">
        {isLoading && <Loading text="Loading job details..." />}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>Failed to load job details.</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        )}

        {/* only the open tab is mounted, so nothing heavy is loaded or drawn until it is needed */}
        {data && tab === "overview" && <Overview data={data} />}
        {data && tab === "timeline" && <Timeline stages={stages} jobStart={jobStart} />}
        {data && tab === "stages" && <StageDetails jobId={activeId} />}
        {data && tab === "estimate" && <Estimate jobId={activeId} />}
        {data && tab === "history" && <History jobId={activeId} onOpenJob={openPrevious} />}
      </Modal.Body>
    </Modal>
  );
}