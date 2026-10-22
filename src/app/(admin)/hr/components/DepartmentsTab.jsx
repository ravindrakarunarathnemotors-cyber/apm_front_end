"use client";

import { useMemo, useState } from "react";
import { Alert, Badge, Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import {
  useAddDepartmentMutation,
  useGetDepartmentssQuery,
  useUpdateDepartmentMutation,
} from "@/store/features/apiSlice";
import { DEPARTMENTS } from "./hrData";
import { Avatar, Empty, Panel, colorOf } from "./hrUi";

// colour / icon / head come from the sample list when the name matches, other departments get defaults
const look = (name) => {
  const s = DEPARTMENTS.find((d) => d.name === name);
  const color = s?.color || colorOf(name);
  return { color, icon: s?.icon || "mdi:domain", head: s?.head };
};

/* ----------------------------- add / edit popup ----------------------------- */
function DepartmentModal({ item, onClose }) {
  const isEdit = Boolean(item);
  const [add, { isLoading: adding }] = useAddDepartmentMutation();
  const [update, { isLoading: updating }] = useUpdateDepartmentMutation();
  const saving = adding || updating;

  const [name, setName] = useState(item?.name || "");
  const [sortOrder, setSortOrder] = useState(item ? String(item.sortOrder) : "");
  const [isActive, setIsActive] = useState(item ? item.isActive : true);
  const [showInJobStage, setShowInJobStage] = useState(item ? item.showInJobStage : false);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState("");

  const nameError = !name.trim() ? "Department name is required" : name.trim().length > 50 ? "Name is too long (max 50 characters)" : "";
  const sortError = sortOrder.trim() !== "" && !/^-?\d+$/.test(sortOrder.trim()) ? "Sort order must be a whole number" : "";

  const save = async () => {
    setTouched(true);
    if (nameError || sortError) return;
    setServerError("");
    const payload = { name: name.trim(), sortOrder: sortOrder.trim(), isActive, showInJobStage };
    try {
      if (isEdit) await update({ id: item.id, ...payload }).unwrap();
      else await add(payload).unwrap();
      await Swal.fire({ title: isEdit ? "Department updated!" : "Department added!", icon: "success", timer: 1300, showConfirmButton: false });
      onClose();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the department.");
    }
  };

  return (
    <Modal show onHide={saving ? undefined : onClose} centered backdrop="static">
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5">{isEdit ? "Edit department" : "Add department"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {serverError && <Alert variant="danger" className="py-2">{serverError}</Alert>}
        <Form noValidate onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold mb-1">Department name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} isInvalid={touched && Boolean(nameError)} placeholder="e.g. Customer Service" autoFocus />
            <Form.Control.Feedback type="invalid">{nameError}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold mb-1">Sort order</Form.Label>
            <Form.Control value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} isInvalid={touched && Boolean(sortError)} inputMode="numeric" placeholder="Leave empty to put it at the end" />
            <Form.Control.Feedback type="invalid">{sortError}</Form.Control.Feedback>
          </Form.Group>
          <Form.Check
            type="switch"
            id="dept-active"
            className="mb-2"
            label={isActive ? "Active (can be selected for employees)" : "Inactive (hidden from the employee form)"}
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <Form.Check
            type="switch"
            id="dept-job-stage"
            label="Also show in the job stages (CRM - Select Department)"
            checked={showInJobStage}
            onChange={(e) => setShowInJobStage(e.target.checked)}
          />
          <div className="form-text">Turn this on only for departments that do service jobs (Mechanical, Wash...). Office departments (Accounts, HR) should stay off.</div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Add department"}</Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ----------------------------- the tab ----------------------------- */
export default function DepartmentsTab({ hr }) {
  const { employees } = hr;
  const { data, isLoading, isError, refetch } = useGetDepartmentssQuery();
  const [update, { isLoading: toggling }] = useUpdateDepartmentMutation();

  const [showInactive, setShowInactive] = useState(true);
  const [modal, setModal] = useState(null); // null | "add" | department row

  const rows = useMemo(() => (data?.rows || []).filter((d) => showInactive || d.isActive), [data, showInactive]);

  const setActive = async (d, next) => {
    if (!next) {
      const ask = await Swal.fire({
        title: `Deactivate "${d.name}"?`,
        text: d.employeeCount > 0
          ? `${d.employeeCount} employee(s) stay in this department, but it cannot be selected for new employees${d.showInJobStage ? " and it will disappear from the job stages" : ""}.`
          : "It will no longer be selectable.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Deactivate",
      });
      if (!ask.isConfirmed) return;
    }
    try {
      await update({ id: d.id, name: d.name, sortOrder: String(d.sortOrder), isActive: next, showInJobStage: d.showInJobStage }).unwrap();
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not change the status.", icon: "error" });
    }
  };

  return (
    <Panel
      title="Departments"
      icon="mdi:domain"
      action={
          <Button size="sm" onClick={() => setModal("add")}>
            <Icon icon="mdi:plus" width="18" height="18" /> Add department
          </Button>
      }
    >
      <Form.Check type="switch" id="show-inactive-departments" className="small mb-3" label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />

      {isLoading ? (
        <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading departments...</div>
      ) : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load departments.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty text="No departments found" />
      ) : (
        <Row className="g-3">
          {rows.map((d) => {
            const { color, icon, head } = look(d.name);
            const members = employees.filter((e) => e.departmentId === d.id && e.status !== "Resigned");
            const designations = new Set(members.map((m) => m.designation)).size;
            return (
              <Col key={d.id} sm={6} xl={4}>
                <div className="border rounded-3 p-3 h-100 bg-white" style={d.isActive ? undefined : { opacity: 0.65 }}>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span
                      className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 48, height: 48, color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
                    >
                      <Icon icon={icon} width="26" height="26" />
                    </span>
                    <div style={{ minWidth: 0 }} className="flex-grow-1">
                      <div className="fw-bold">{d.name}</div>
                      <div className="small text-muted text-truncate">{head ? `Head: ${head}` : d.showInJobStage ? "Job stage department" : "Office department"}</div>
                    </div>
                    {!d.isActive && <Badge bg="secondary">Inactive</Badge>}
                  </div>

                  <div className="d-flex gap-4 mb-3">
                    <div><div className="fs-4 fw-bold lh-1">{d.employeeCount}</div><div className="small text-muted">Employees</div></div>
                    <div><div className="fs-4 fw-bold lh-1">{designations}</div><div className="small text-muted">Designations</div></div>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    {members.slice(0, 5).map((m, i) => (
                      <span key={m.dbId} title={m.name} style={{ marginLeft: i ? -8 : 0, border: "2px solid #fff", borderRadius: "50%" }}>
                        <Avatar name={m.name} size={30} />
                      </span>
                    ))}
                    {members.length > 5 && <span className="small text-muted ms-2">+{members.length - 5} more</span>}
                    {members.length === 0 && <span className="small text-muted">No employees yet</span>}
                  </div>

                  <div className="d-flex justify-content-between align-items-center border-top pt-2">
                    <Form.Check type="switch" id={`dept-${d.id}`} disabled={toggling} checked={d.isActive} onChange={(e) => setActive(d, e.target.checked)} label={d.isActive ? "Active" : "Inactive"} />
                    <Button size="sm" variant="outline-secondary" onClick={() => setModal(d)}><Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit</Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      {modal && <DepartmentModal key={modal === "add" ? "add" : modal.id} item={modal === "add" ? null : modal} onClose={() => setModal(null)} />}
    </Panel>
  );
}