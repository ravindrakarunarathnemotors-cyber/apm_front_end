"use client";

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Form, FormSelect, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useGetEmployeesQuery, useGetJobTeamAllocationQuery, useSaveJobTeamAllocationMutation } from "@/store/features/apiSlice";
import { getDepartmentUi } from "./departmentConfig";
import ManageTeamsBaysModal from "./ManageTeamsBaysModal"; // opens on top of this window as its own popup

// Stage 6 · Team Allocation  (every department)
// Props: jobId (null = closed), onHide, onSaved?({ jobId, stageCompleted })
export default function TeamAllocationModal({ jobId, onHide, onSaved }) {
  const { data, isLoading, isError, error: loadError, refetch } = useGetJobTeamAllocationQuery(jobId, {
    skip: !jobId,
    refetchOnMountOrArgChange: true,
  });
  const [save, { isLoading: saving }] = useSaveJobTeamAllocationMutation();

  const [managing, setManaging] = useState(false); // "Manage teams and bays" popup
  const [teamId, setTeamId] = useState("");
  const [bayId, setBayId] = useState("");
  const [leaderId, setLeaderId] = useState(""); // team leader of THIS job
  const [subLeaderId, setSubLeaderId] = useState(""); // sub leader of THIS job (optional)
  const [ppe, setPpe] = useState(""); // "yes" | "no"
  const [protection, setProtection] = useState("");
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState("");

  const job = data?.job;
  const readOnly = data && !data.canAllocate;
  const ui = getDepartmentUi(job?.departmentName || "");

  // fill the form with the saved allocation (or empty for a new one)
  useEffect(() => {
    if (!data) return;
    const a = data.allocation;
    setTeamId(a?.teamId ? String(a.teamId) : "");
    setBayId(a?.bayId ? String(a.bayId) : "");
    setLeaderId(a?.teamLeaderId ? String(a.teamLeaderId) : "");
    setSubLeaderId(a?.subLeaderId ? String(a.subLeaderId) : "");
    setPpe(a ? (a.ppeUsed ? "yes" : "no") : "");
    setProtection(a ? (a.vehicleProtectionApplied ? "yes" : "no") : "");
    setTouched(false);
    setServerError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, data?.job?.id, data?.allocation?.updatedAt ?? null]); // not on every refetch, so a half-filled form survives "Manage teams and bays"

  const close = () => {
    setManaging(false);
    onHide();
  };

  // an inactive team that is already saved stays selectable for this job
  const savedTeamId = data?.allocation?.teamId;
  const savedBayId = data?.allocation?.bayId;
  const teamOptions = (data?.teams || []).filter((t) => t.isActive || t.id === savedTeamId);
  const pickedTeam = (data?.teams || []).find((t) => String(t.id) === teamId); // its leader / sub leader / members are shown below

  // Team <-> Bay are linked: picking a team selects its bay, picking a bay selects its team.
  const bayUsable = (b) => b && (b.isActive || b.id === savedBayId);
  const applyTeam = (t) => {
    setTeamId(t ? String(t.id) : "");
    setLeaderId(t?.leaderId ? String(t.leaderId) : "");
    setSubLeaderId(t?.subLeaderId ? String(t.subLeaderId) : "");
  };
  const onTeamChange = (id) => {
    const t = (data?.teams || []).find((x) => String(x.id) === id);
    applyTeam(t);
    const bay = (data?.bays || []).find((b) => b.id === t?.bayId);
    setBayId(bayUsable(bay) ? String(bay.id) : ""); // team without a usable bay: choose the bay yourself
  };
  const onBayChange = (id) => {
    setBayId(id);
    const t = (data?.teams || []).find((x) => String(x.bayId) === id && (x.isActive || x.id === savedTeamId));
    if (t) applyTeam(t);
  };
  // the bay of the chosen team is fixed: it cannot be changed here (choose another team instead)
  const bayLocked = Boolean(pickedTeam?.bayId) && bayId === String(pickedTeam.bayId);

  // people to choose from: the team first, then every other employee who has not resigned
  const { data: employees = [] } = useGetEmployeesQuery(undefined, { skip: !jobId });
  const teamPeople = (pickedTeam?.members || []).map((m) => ({ id: m.employeeId, name: m.name, no: m.employeeNo }));
  const teamIds = new Set(teamPeople.map((p) => p.id));
  const others = employees
    .filter((e) => e.status !== "Resigned" && !teamIds.has(e.dbId))
    .map((e) => ({ id: e.dbId, name: e.name, no: e.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // a saved person who has since resigned must stay visible
  const savedExtra = [
    [data?.allocation?.teamLeaderId, data?.allocation?.teamLeaderName],
    [data?.allocation?.subLeaderId, data?.allocation?.subLeaderName],
  ].filter(([id]) => id && !teamIds.has(id) && !others.some((o) => o.id === id));
  const personSelect = (value, onChange, isInvalid, placeholder, exclude) => (
    <FormSelect value={value} onChange={(e) => onChange(e.target.value)} isInvalid={isInvalid} disabled={readOnly}>
      <option value="">{placeholder}</option>
      {teamPeople.length > 0 && (
        <optgroup label="Team members">
          {teamPeople.filter((p) => String(p.id) !== exclude).map((p) => <option key={p.id} value={p.id}>{p.name}{p.no ? ` (${p.no})` : ""}</option>)}
        </optgroup>
      )}
      <optgroup label="Other employees">
        {savedExtra.filter(([id]) => String(id) !== exclude).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        {others.filter((p) => String(p.id) !== exclude).map((p) => <option key={p.id} value={p.id}>{p.name}{p.no ? ` (${p.no})` : ""}</option>)}
      </optgroup>
    </FormSelect>
  );

  const errors = {
    team: !teamId ? "Select the team" : "",
    bay: !bayId ? "Select the bay" : "",
    leader: !leaderId ? "Select the team leader" : "",
    subLeader: leaderId && leaderId === subLeaderId ? "Sub leader must be a different person" : "",
    ppe: !ppe ? "Select Yes or No" : "",
    protection: !protection ? "Select Yes or No" : "",
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async () => {
    setTouched(true);
    setServerError("");
    if (hasErrors) return;
    try {
      const res = await save({
        jobId,
        teamId: Number(teamId),
        bayId: Number(bayId),
        teamLeaderId: Number(leaderId),
        subLeaderId: subLeaderId ? Number(subLeaderId) : null,
        ppeUsed: ppe === "yes",
        vehicleProtectionApplied: protection === "yes",
      }).unwrap();
      await Swal.fire({
        title: "Team allocated!",
        text: res.currentStageNo > data.teamStageNo ? `${job.jobNo} moved to the next stage.` : undefined,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      onSaved?.({ jobId, stageCompleted: res.currentStageNo > data.teamStageNo });
      close();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the team allocation.");
    }
  };

  const yesNo = (name, value, onChange, error) => (
    <div>
      <div className="d-flex gap-3">
        {[["yes", "Yes"], ["no", "No"]].map(([k, label]) => (
          <Form.Check key={k} inline type="radio" id={`${name}-${k}`} name={name} label={label} checked={value === k} onChange={() => onChange(k)} disabled={!data?.canAllocate} />
        ))}
      </div>
      {touched && error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );

  return (
    <>
    {/* enforceFocus is off while the Teams & Bays popup is open, so its inputs can be typed in */}
    <Modal show onHide={saving ? undefined : close} size="lg" centered scrollable fullscreen="md-down" backdrop="static" enforceFocus={!managing}>
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <Icon icon="mdi:account-group-outline" width="24" height="24" color={ui.color} />
          <span>
            Team Allocation
            {job && <span className="text-muted fw-normal"> · {job.departmentName} Department</span>}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        {isLoading && <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading...</div>}
        {isError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>{loadError?.data?.message || "Failed to load the team allocation."}</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        )}

        {data && (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="small text-muted">
                <strong className="text-dark">{job.jobNo}</strong> · {job.regNo}
              </div>
              <Button size="sm" variant="outline-primary" onClick={() => setManaging(true)}>
                <Icon icon="mdi:cog-outline" width="18" height="18" /> Manage teams and bays
              </Button>
            </div>

            {readOnly && <Alert variant="secondary" className="py-2">This job is not ready for team allocation yet.</Alert>}
            {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}

            <div className="bg-white border rounded-3 p-3 mb-3">
              <div className="fw-bold mb-3">{job.departmentName} Team Detail</div>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold mb-1">Team name <span className="text-danger">*</span></Form.Label>
                <FormSelect value={teamId} onChange={(e) => onTeamChange(e.target.value)} isInvalid={touched && Boolean(errors.team)} disabled={readOnly}>
                  <option value="">{teamOptions.length ? "Select team" : "No teams yet - use Manage teams and bays"}</option>
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.isActive ? "" : " (inactive)"}</option>
                  ))}
                </FormSelect>
                <Form.Control.Feedback type="invalid">{errors.team}</Form.Control.Feedback>
                {pickedTeam && (
                  <div className="small text-muted mt-2 border rounded-2 p-2 bg-light">
                    <div><strong>Leader:</strong> {pickedTeam.leaderName || "-"}{pickedTeam.subLeaderName && <> · <strong>Sub leader:</strong> {pickedTeam.subLeaderName}</>}</div>
                    <div>
                      <strong>Members ({pickedTeam.memberIds?.length || 0}):</strong>{" "}
                      {(pickedTeam.members || []).filter((m) => m.role === "MEMBER").map((m) => m.name).join(", ") || "-"}
                    </div>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold mb-1">Bay No <span className="text-danger">*</span> <span className="text-muted fw-normal">(select from the list)</span></Form.Label>
                {bayLocked && <div className="small text-muted mb-2"><Icon icon="mdi:lock-outline" width="14" height="14" /> This bay belongs to the selected team. To use another bay, select another team.</div>}
                {(data.bays || []).length === 0 ? (
                  <div className="text-muted small">No bays yet - use Manage teams and bays.</div>
                ) : (
                  <div className="row g-2">
                    {data.bays.map((b) => {
                      const selected = bayId === String(b.id);
                      // inactive bays are shown but cannot be selected (unless this job already uses it)
                      const disabled = readOnly || bayLocked || (!b.isActive && b.id !== savedBayId);
                      return (
                        <div key={b.id} className="col-6 col-md-3">
                        <label
                          htmlFor={`bay-${b.id}`}
                          className={`d-flex align-items-center gap-2 border rounded-3 p-2 px-2 h-100 flex-wrap ${selected ? "border-primary bg-primary-subtle" : "bg-white"} ${disabled ? "opacity-50" : ""}`}
                          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
                        >
                          <Form.Check type="radio" id={`bay-${b.id}`} name="bay" checked={selected} disabled={disabled} onChange={() => onBayChange(String(b.id))} className="mb-0" />
                          <span className="fw-semibold flex-grow-1">{b.name}</span>
                          <Badge bg={b.isActive ? "success" : "secondary"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                        </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                {touched && errors.bay && <div className="text-danger small mt-1">{errors.bay}</div>}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold mb-1">Team leader <span className="text-danger">*</span> <span className="text-muted fw-normal">(for this job)</span></Form.Label>
                {personSelect(leaderId, setLeaderId, touched && Boolean(errors.leader), "Select team leader", subLeaderId)}
                <Form.Control.Feedback type="invalid">{errors.leader}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-semibold mb-1">Sub leader <span className="text-muted fw-normal">(optional, for this job)</span></Form.Label>
                {personSelect(subLeaderId, setSubLeaderId, touched && Boolean(errors.subLeader), "No sub leader", leaderId)}
                <Form.Control.Feedback type="invalid">{errors.subLeader}</Form.Control.Feedback>
              </Form.Group>
            </div>

            <div className="bg-white border rounded-3 p-3">
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold mb-1">Personal Protective Equipment ? <span className="text-danger">*</span></Form.Label>
                {yesNo("ppe", ppe, setPpe, errors.ppe)}
              </Form.Group>
              <Form.Group>
                <Form.Label className="fw-semibold mb-1">Customer Vehicle Protection applied ? <span className="text-danger">*</span></Form.Label>
                {yesNo("protection", protection, setProtection, errors.protection)}
              </Form.Group>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
        {data && !readOnly && (
          <Button onClick={submit} disabled={saving}>
            <Icon icon="mdi:content-save-outline" width="20" height="20" />{" "}
            {saving ? "Saving..." : data.allocation ? "Update allocation" : "Save allocation"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>

    {managing && data && (
      <ManageTeamsBaysModal department={{ id: job.departmentId, name: job.departmentName }} onHide={() => setManaging(false)} />
    )}
    </>
  );
}