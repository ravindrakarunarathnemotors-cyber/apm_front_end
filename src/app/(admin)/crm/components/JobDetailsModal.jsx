"use client";

import { Fragment, useState } from "react";
import { Alert, Badge, Button, Card, Col, Modal, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetJobDetailsQuery } from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";

/* ----------------------------- helpers ----------------------------- */
const fmtDay = (iso) => {
  const d = new Date(iso);
  return isNaN(d)
    ? "-"
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};
const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};
const duration = (from, to) => {
  const ms = new Date(to) - new Date(from);
  if (!Number.isFinite(ms) || ms < 60000) return null;
  const mins = Math.round(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
};

const STATUS_BADGE = { IN_PROGRESS: "primary", COMPLETED: "success", CANCELLED: "danger" };
const APPROVAL_BADGE = { APPROVED: "success", PENDING: "warning", REJECTED: "danger" };

// One detail = one row: label on the left, value on the right (single column list)
function Info({ label, children, icon }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className="job-info d-flex justify-content-between align-items-start gap-3 py-2 border-bottom">
      <div className="text-muted small flex-shrink-0" style={{ minWidth: 140 }}>
        {icon && <Icon icon={icon} width="14" height="14" className="me-1" />}
        {label}
      </div>
      <div className="fw-semibold text-end" style={{ wordBreak: "break-word" }}>
        {empty ? <span className="text-muted fw-normal">-</span> : children}
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <Card className="mb-3">
      <Card.Header className="bg-transparent fw-bold">
        <Icon icon={icon} width="18" height="18" className="me-1 text-primary" /> {title}
      </Card.Header>
      <Card.Body className="py-1 px-3">{children}</Card.Body>
    </Card>
  );
}

/* ----------------------------- timeline (each stage is a card) ----------------------------- */
const ACCENT = { COMPLETED: "#198754", IN_PROGRESS: "#0d6efd", PENDING: "#adb5bd" };

function StageDot({ stage }) {
  const base = "rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0";
  if (stage.status === "COMPLETED") {
    return (
      <span className={`${base} bg-success text-white`} style={{ width: 32, height: 32 }}>
        <Icon icon="mdi:check" width="20" height="20" />
      </span>
    );
  }
  if (stage.status === "IN_PROGRESS") {
    return (
      <span className={`${base} bg-primary text-white`} style={{ width: 32, height: 32 }}>
        <Icon icon="mdi:progress-clock" width="20" height="20" />
      </span>
    );
  }
  return (
    <span className={`${base} bg-light text-muted border small`} style={{ width: 32, height: 32 }}>
      {stage.stageNo}
    </span>
  );
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
      {visible.map((s) => {
        const isPending = s.status === "PENDING";
        const took = s.status === "COMPLETED" ? duration(s.startedAt, s.completedAt) : null;
        return (
          <Fragment key={s.stageNo}>
          <div
            className="rounded border bg-white p-3 mb-2 shadow-sm"
            style={{ borderLeft: `4px solid ${ACCENT[s.status]}`, opacity: isPending ? 0.7 : 1 }}
          >
            <div className="d-flex align-items-center gap-2">
              <StageDot stage={s} />
              <div className="flex-grow-1 fw-semibold">
                Stage {s.stageNo} · {s.stageName}
              </div>
              {took && <small className="text-muted text-nowrap">took {took}</small>}
              <Badge bg={s.status === "COMPLETED" ? "success" : s.status === "IN_PROGRESS" ? "primary" : "secondary"}>
                {s.status === "IN_PROGRESS" ? "In progress" : s.status === "COMPLETED" ? "Completed" : "Pending"}
              </Badge>
            </div>

            {s.status === "COMPLETED" && (
              <Row className="g-2 mt-2 pt-2 border-top">
                <Col sm={6}>
                  <MiniInfo label="Completed on" icon="mdi:calendar-check-outline">
                    {fmtDay(s.completedAt)}, {fmtTime(s.completedAt)}
                  </MiniInfo>
                </Col>
                <Col sm={6}>
                  <MiniInfo label="Completed by" icon="mdi:account-outline">
                    {s.completedByName ? (
                      <>
                        {s.completedByName} <span className="text-muted fw-normal">(@{s.completedByUsername})</span>
                      </>
                    ) : (
                      "Unknown user"
                    )}
                  </MiniInfo>
                </Col>
              </Row>
            )}

            {s.status === "IN_PROGRESS" && (
              <Row className="g-2 mt-2 pt-2 border-top">
                <Col sm={6}>
                  <MiniInfo label="Started on" icon="mdi:clock-start">
                    {fmtDay(s.startedAt)}, {fmtTime(s.startedAt)}
                  </MiniInfo>
                </Col>
                <Col sm={6}>
                  <MiniInfo label="Status" icon="mdi:timer-sand">
                    Waiting to be completed
                  </MiniInfo>
                </Col>
              </Row>
            )}

            {s.remarks && <div className="small mt-2 fst-italic">“{s.remarks}”</div>}
          </div>

            {/* Stage 4 A: initial start confirmed (shown right after the complaint stage) */}
            {jobStart && s.stageNo === 5 && (
              <div
                className="rounded border bg-white p-3 mb-2 shadow-sm"
                style={{ borderLeft: "4px solid #0d9488" }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 32, height: 32 }}>
                    <Icon icon="mdi:play" width="20" height="20" />
                  </span>
                  <div className="flex-grow-1 fw-semibold">
                    Stage 4 A · Initial start confirmed
                    <div className="small text-muted fw-normal">
                      Job started for {jobStart.departmentName}
                    </div>
                  </div>
                  <Badge bg="success">Started</Badge>
                </div>
                <Row className="g-2 mt-2 pt-2 border-top">
                  <Col sm={6}>
                    <MiniInfo label="Confirmed on" icon="mdi:calendar-check-outline">
                      {fmtDay(jobStart.confirmedAt)}, {fmtTime(jobStart.confirmedAt)}
                    </MiniInfo>
                  </Col>
                  <Col sm={6}>
                    <MiniInfo label="Confirmed by" icon="mdi:account-outline">
                      {jobStart.confirmedByName || "Unknown user"}
                    </MiniInfo>
                  </Col>
                </Row>
              </div>
            )}
          </Fragment>
        );
      })}

      {pending.length > 0 && (
        <Button variant="link" size="sm" className="px-0" onClick={() => setShowPending((v) => !v)}>
          {showPending ? "Hide" : "Show"} {pending.length} pending stage{pending.length > 1 ? "s" : ""}
        </Button>
      )}
    </>
  );
}

/* ----------------------------- modal ----------------------------- */
export default function JobDetailsModal({ jobId, onHide }) {
  const { data, isLoading, isError, refetch } = useGetJobDetailsQuery(jobId, { skip: !jobId });
  const { job, customer, vehicle, consultant, createdBy, jobStart, stages = [] } = data || {};
  const dept = job?.departmentName ? getDepartmentUi(job.departmentName) : null;

  return (
    <Modal show={Boolean(jobId)} onHide={onHide} size="xl" dialogClassName="job-modal" fullscreen="md-down" scrollable centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex flex-wrap align-items-center gap-2">
          <Icon icon="mdi:clipboard-text-outline" width="24" height="24" />
          {job ? job.jobNo : "Job details"}
          {job && <Badge bg={STATUS_BADGE[job.status] || "secondary"}>{job.status.replace("_", " ")}</Badge>}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        <style>{`
          /* bigger modal: up to 1400px wide, almost the full screen height */
          .modal-dialog.job-modal { --bs-modal-width: min(1400px, 96vw); }
          .job-modal .modal-content { min-height: 88vh; }
          .job-info:last-child { border-bottom: 0 !important; }
          @media (min-width: 992px) {
            .job-timeline-scroll { max-height: 72vh; overflow-y: auto; padding-right: 4px; }
          }
        `}</style>

        {isLoading && (
          <div className="text-center text-muted py-5">
            <Spinner animation="border" size="sm" className="me-2" /> Loading job details...
          </div>
        )}

        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>Failed to load job details.</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        )}

        {data && (
          <Row className="g-3">
            {/* LEFT (7/12): timeline, every stage is a card. On phones it comes after the details. */}
            <Col lg={7} className="order-2 order-lg-1">
              <div className="fw-bold mb-2">
                <Icon icon="mdi:timeline-clock-outline" width="18" height="18" className="me-1 text-primary" />
                Timeline
                <span className="text-muted fw-normal ms-2 small">
                  {stages.filter((s) => s.status === "COMPLETED").length}/{stages.length} stages completed
                </span>
              </div>
              <div className="job-timeline-scroll">
                <Timeline stages={stages} jobStart={jobStart} />
              </div>
            </Col>

            {/* RIGHT (5/12): details in ONE column */}
            <Col lg={5} className="order-1 order-lg-2">
              <Section title="Customer" icon="mdi:account-circle-outline">
                <Info label="Name">{customer.name}</Info>
                <Info label="Customer ID (ERP)">{customer.customerId}</Info>
                <Info label="Mobile" icon="mdi:phone-outline">{customer.contactNumber}</Info>
                <Info label="WhatsApp number">{customer.altContactNumber}</Info>
                <Info label="Email" icon="mdi:email-outline">{customer.email}</Info>
                <Info label="NIC / Passport">{customer.nic}</Info>
                <Info label="Company">{customer.companyName}</Info>
                <Info label="Profession">{customer.profession}</Info>
                <Info label="Category">
                  {customer.categoryName && (
                    <>
                      {customer.categoryName}{" "}
                      <Badge bg={APPROVAL_BADGE[customer.categoryApprovalStatus] || "secondary"}>
                        {customer.categoryApprovalStatus}
                      </Badge>
                    </>
                  )}
                </Info>
                <Info label="HR D. remarks">{customer.categoryRemarks}</Info>
              </Section>

              <Section title="Vehicle" icon="mdi:car-outline">
                <Info label="Registration number">{vehicle.regNo}</Info>
                <Info label="Year of manufacture">{vehicle.year}</Info>
                <Info label="Mileage">{vehicle.mileage != null ? `${Number(vehicle.mileage).toLocaleString()} km` : null}</Info>
                <Info label="Colour">{vehicle.colour}</Info>
                <Info label="Chassis number">{vehicle.chassisNo}</Info>
                <Info label="Engine number">{vehicle.engineNo}</Info>
                <Info label="Tyre size">{vehicle.tyreSize}</Info>
                <Info label="Appointment" icon="mdi:calendar-clock-outline">
                  {vehicle.appointmentDate ? `${vehicle.appointmentDate} ${vehicle.appointmentTime || ""}` : null}
                </Info>
                <Info label="Customer matter">{vehicle.matter}</Info>
              </Section>

              <Section title="Job" icon="mdi:briefcase-outline">
                <Info label="Current stage">Stage {job.stageNo} · {job.stageName}</Info>
                <Info label="Department">
                  {dept && (
                    <span style={{ color: dept.color }}>
                      <Icon icon={dept.icon} width="16" height="16" className="me-1" />
                      {job.departmentName}
                    </span>
                  )}
                </Info>
                <Info label="Consultant" icon="mdi:account-tie-outline">{consultant.name}</Info>
                <Info label="Consultant mobile" icon="mdi:phone-outline">{consultant.mobile}</Info>
                <Info label="Consultant email">{consultant.email}</Info>
                <Info label="Job started by" icon="mdi:account-outline">
                  {createdBy ? `${createdBy.name} (@${createdBy.username})` : null}
                </Info>
                <Info label="Created">{`${fmtDay(job.createdAt)}, ${fmtTime(job.createdAt)}`}</Info>
                <Info label="Last updated">{`${fmtDay(job.updatedAt)}, ${fmtTime(job.updatedAt)}`}</Info>
              </Section>
            </Col>
          </Row>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}