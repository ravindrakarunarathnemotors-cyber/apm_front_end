"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddDesignationMutation,
  useGetDesignationsQuery,
  useUpdateDesignationMutation,
} from "@/store/features/apiSlice";
import { Avatar, Empty, Panel } from "./hrUi";

const LEVEL_BG = { Management: "dark", Senior: "primary", Executive: "info", Staff: "secondary", Junior: "light" };

/* ----------------------------- add / edit popup ----------------------------- */
function DesignationModal({ item, levels, onClose }) {
  const isEdit = Boolean(item);
  const [add, { isLoading: adding }] = useAddDesignationMutation();
  const [update, { isLoading: updating }] = useUpdateDesignationMutation();
  const saving = adding || updating;

  const [name, setName] = useState(item?.name || "");
  const [level, setLevel] = useState(item?.level || "");
  const [isActive, setIsActive] = useState(item ? item.isActive : true);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState("");

  const nameError = !name.trim() ? "Designation name is required" : name.trim().length > 100 ? "Name is too long (max 100 characters)" : "";

  const save = async () => {
    setTouched(true);
    if (nameError) return;
    setServerError("");
    const payload = { name: name.trim(), level, isActive };
    try {
      if (isEdit) await update({ id: item.id, ...payload }).unwrap();
      else await add(payload).unwrap();
      await Swal.fire({ title: isEdit ? "Designation updated!" : "Designation added!", icon: "success", timer: 1300, showConfirmButton: false });
      onClose();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the designation.");
    }
  };

  return (
    <Modal show onHide={saving ? undefined : onClose} centered backdrop="static">
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5">{isEdit ? "Edit designation" : "Add designation"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {serverError && <Alert variant="danger" className="py-2">{serverError}</Alert>}
        <Form noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold mb-1">Designation name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} isInvalid={touched && Boolean(nameError)} placeholder="e.g. Service Advisor" autoFocus />
            <Form.Control.Feedback type="invalid">{nameError}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold mb-1">Level</Form.Label>
            <Form.Select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">Not set</option>
              {levels.map((l) => <option key={l}>{l}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Check
            type="switch"
            id="designation-active"
            label={isActive ? "Active (can be selected for employees)" : "Inactive (hidden from the employee form)"}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Add designation"}</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ----------------------------- the tab ----------------------------- */
export default function DesignationsTab({ hr }) {
  const { employees } = hr;
  const { data, isLoading, isError, refetch } = useGetDesignationsQuery();
  const [update, { isLoading: toggling }] = useUpdateDesignationMutation();

  const [level, setLevel] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [modal, setModal] = useState(null); // null | "add" | designation row

  const levels = data?.levels || [];

  const rows = useMemo(
    () =>
      (data?.rows || [])
        .filter((d) => (!level || d.level === level) && (showInactive || d.isActive))
        .map((d) => ({ ...d, members: employees.filter((e) => e.designationId === d.id && e.status !== "Resigned") })),
    [data, employees, level, showInactive]
  );

  const setActive = async (d, next) => {
    if (!next) {
      const ask = await Swal.fire({
        title: `Deactivate "${d.name}"?`,
        text: d.employeeCount > 0
          ? `${d.employeeCount} employee(s) keep this designation, but it cannot be selected for new employees.`
          : "It will no longer be selectable in the employee form.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Deactivate",
      });
      if (!ask.isConfirmed) return;
    }
    try {
      await update({ id: d.id, name: d.name, level: d.level || "", isActive: next }).unwrap();
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not change the status.", icon: "error" });
    }
  };

  return (
    <Panel
      title="Designations"
      icon="mdi:badge-account-horizontal-outline"
      action={
          <Button size="sm" onClick={() => setModal("add")}>
            <Icon icon="mdi:plus" width="18" height="18" /> Add designation
          </Button>
      }
    >
      <div className="d-flex gap-1 flex-wrap align-items-center mb-3">
        {["", ...levels].map((l) => (
          <Button key={l} size="sm" variant={level === l ? "primary" : "outline-secondary"} className="rounded-pill" onClick={() => setLevel(l)}>{l || "All"}</Button>
        ))}
        <Form.Check type="switch" id="show-inactive-designations" className="ms-auto small" label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
      </div>

      {isLoading ? (
        <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading designations...</div>
      ) : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load designations.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty text="No designations found" />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Designation</th><th>Level</th><th>Employees</th><th>People</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className={d.isActive ? "" : "text-muted"}>
                <td className="fw-semibold">{d.name}</td>
                <td>{d.level ? <Badge bg={LEVEL_BG[d.level]} text={d.level === "Junior" ? "dark" : undefined} className="border">{d.level}</Badge> : "-"}</td>
                <td>{d.employeeCount}</td>
                <td>
                  <div className="d-flex align-items-center">
                    {d.members.slice(0, 5).map((m, i) => (
                      <span key={m.dbId} title={m.name} style={{ marginLeft: i ? -8 : 0, border: "2px solid #fff", borderRadius: "50%" }}>
                        <Avatar name={m.name} size={28} />
                      </span>
                    ))}
                    {d.members.length > 5 && <span className="small text-muted ms-2">+{d.members.length - 5}</span>}
                    {d.members.length === 0 && <span className="small text-muted">-</span>}
                  </div>
                </td>
                <td>
                  <Form.Check type="switch" id={`desig-${d.id}`} disabled={toggling} checked={d.isActive} onChange={(e) => setActive(d, e.target.checked)} label={d.isActive ? "Active" : "Inactive"} />
                </td>
                <td className="text-end">
                  <Button size="sm" variant="outline-secondary" onClick={() => setModal(d)}><Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {modal && <DesignationModal key={modal === "add" ? "add" : modal.id} item={modal === "add" ? null : modal} levels={levels} onClose={() => setModal(null)} />}
    </Panel>
  );
}