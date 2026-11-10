"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetJobBayAllocationQuery, useSaveJobBayAllocationMutation } from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";
import { usePermissions } from "./permissionsApi"; // action permissions
import ManageTeamsBaysModal from "./ManageTeamsBaysModal";

// Stage 6 · Bay Allocation  (departments that use bays without teams, e.g. Wash)
// Props: jobId (null = closed), onHide, onSaved?({ jobId, stageCompleted })
export default function BayAllocationModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch } = useGetJobBayAllocationQuery(jobId, { skip: !jobId, refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveJobBayAllocationMutation();
  const [bayId, setBayId] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState("");
  const { can } = usePermissions();
  const [managing, setManaging] = useState(false);

  const job = data?.job;
  const ui = getDepartmentUi(job?.departmentName || "");
  const readOnly = data && !data.canAllocate;
  const savedBayId = data?.allocation?.bayId;

  // fill with the saved bay. Not on every refetch, so "Manage bays" does not wipe a choice.
  useEffect(() => {
    if (!data) return;
    setBayId(data.allocation?.bayId ? String(data.allocation.bayId) : "");
    setTouched(false);
    setServerError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, data?.job?.id, data?.allocation?.updatedAt ?? null]);

  const submit = async () => {
    setTouched(true);
    setServerError("");
    if (!bayId) return;
    try {
      const res = await save({ jobId, bayId: Number(bayId) }).unwrap();
      const moved = res.currentStageNo > data.bayStageNo;
      await Swal.fire({ title: "Bay allocated!", text: moved ? `${job.jobNo} moved to the next stage.` : undefined, icon: "success", timer: 1500, showConfirmButton: false });
      onSaved?.({ jobId, stageCompleted: moved });
      onHide();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the bay allocation.");
    }
  };

  return (
    <>
      <Modal show onHide={saving ? undefined : onHide} size="lg" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={!managing}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title className="fs-5 d-flex align-items-center gap-2">
            <Icon icon="mdi:garage-variant" width="24" height="24" color={ui.color} />
            <span>Bay Allocation{job && <span className="text-muted fw-normal"> · {job.departmentName} Department</span>}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="bg-light">
          {isLoading && <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>}
          {isError && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center">
              <span>{loadError?.data?.message || "Failed to load the bay allocation."}</span>
              <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
            </Alert>
          )}

          {data && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div className="small text-muted"><strong className="text-dark">{job.jobNo}</strong> · {job.regNo}</div>
                {can("bay.manage") && (
                  <Button size="sm" variant="outline-primary" onClick={() => setManaging(true)}>
                    <Icon icon="mdi:cog-outline" width="18" height="18" /> Manage bays
                  </Button>
                )}
              </div>

              {readOnly && <Alert variant="secondary" className="py-2">This job is not ready for bay allocation yet.</Alert>}
              {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}

              <div className="bg-white border rounded-3 p-3">
                <div className="fw-bold mb-1">{job.departmentName} Bay</div>
                <Form.Label className="small fw-semibold mb-2">Bay No <span className="text-danger">*</span> <span className="text-muted fw-normal">(select from the list)</span></Form.Label>
                {data.bays.length === 0 ? (
                  <div className="text-muted small">No bays yet - use Manage bays.</div>
                ) : (
                  <div className="row g-2">
                    {data.bays.map((b) => {
                      const selected = bayId === String(b.id);
                      const disabled = readOnly || (!b.isActive && b.id !== savedBayId); // inactive bays cannot be chosen
                      return (
                        <div key={b.id} className="col-6 col-md-3">
                          <label
                            htmlFor={`wbay-${b.id}`}
                            className={`d-flex align-items-center gap-2 flex-wrap border rounded-3 p-2 px-2 h-100 ${selected ? "border-primary bg-primary-subtle" : "bg-white"} ${disabled ? "opacity-50" : ""}`}
                            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                          >
                            <Form.Check type="radio" id={`wbay-${b.id}`} name="wash-bay" checked={selected} disabled={disabled} onChange={() => setBayId(String(b.id))} className="mb-0" />
                            <span className="fw-semibold flex-grow-1">{b.name}</span>
                            <Badge bg={b.isActive ? "success" : "secondary"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                {touched && !bayId && <div className="text-danger small mt-2">Select the bay</div>}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          {data && !readOnly && (
            <Button onClick={submit} disabled={saving}>
              <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : data.allocation ? "Update bay" : "Save bay"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {managing && data && <ManageTeamsBaysModal baysOnly department={{ id: job.departmentId, name: job.departmentName }} onHide={() => setManaging(false)} />}
    </>
  );
}