"use client";

import { useState } from "react";
import { Button, FormControl, InputGroup, Modal, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetDepartmentsQuery } from "@/store/features/apiSlice";
import { ManageListsBody } from "./ManageOptionsModal";
import { getDepartmentUi } from "./departmentConfig";

// Jobs Dashboard -> "Repair Type": 1) pick a department  2) add its parent types and the child types (with labour price).
// Saved in the same tables as "Manage lists" of the complaint window.
function Step({ no, text, done }) {
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span className={`d-inline-flex align-items-center justify-content-center rounded-circle fw-bold ${done ? "bg-success text-white" : "bg-primary text-white"}`} style={{ width: 26, height: 26, fontSize: 13 }}>
        {done ? <Icon icon="mdi:check" width="16" height="16" /> : no}
      </span>
      <span className="fw-semibold small">{text}</span>
    </span>
  );
}

export default function RepairTypeModal({ onHide }) {
  const { data: departments = [], isLoading } = useGetDepartmentsQuery();
  const [departmentId, setDepartmentId] = useState("");
  const [query, setQuery] = useState("");
  const dept = departments.find((d) => String(d.id) === String(departmentId));
  const ui = getDepartmentUi(dept?.name);

  return (
    <Modal show onHide={onHide} size="xl" scrollable centered fullscreen="md-down">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fs-5 d-flex align-items-center gap-3">
          <span className="d-inline-flex align-items-center justify-content-center rounded-3 text-white" style={{ width: 44, height: 44, background: dept ? ui.color : "#2563eb" }}>
            <Icon icon={dept ? ui.icon : "mdi:wrench-cog-outline"} width="26" height="26" />
          </span>
          <span>
            Repair types{dept ? <span className="text-muted fw-normal"> / {dept.name}</span> : ""}
            <div className="small text-muted fw-normal">Set up what each department repairs, and the labour price of each job.</div>
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ background: "#f1f5f9" }}>
        {/* stepper */}
        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
          <Step no={1} text="Choose a department" done={!!dept} />
          <Icon icon="mdi:chevron-right" width="20" height="20" className="text-muted" />
          <Step no={2} text="Add types and labour prices" done={false} />
        </div>

        {/* 1. department cards */}
        <div className="bg-white border rounded-3 p-3 mb-3 shadow-sm">
          <div className="fw-semibold mb-2"><Icon icon="mdi:domain" width="18" height="18" className="me-1 text-muted" /> Department</div>
          {isLoading ? (
            <div className="text-muted"><Spinner size="sm" className="me-2" /> Loading departments...</div>
          ) : (
            <div className="d-flex flex-wrap gap-2">
              {departments.map((d) => {
                const u = getDepartmentUi(d.name);
                const on = String(d.id) === String(departmentId);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className="btn d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold"
                    style={on ? { background: u.color, color: "#fff", borderColor: u.color } : { background: "#fff", color: u.color, border: `1px solid ${u.color}55` }}
                    onClick={() => { setDepartmentId(String(d.id)); setQuery(""); }}
                    aria-pressed={on}
                  >
                    <Icon icon={u.icon} width="22" height="22" /> {d.name}
                    {on && <Icon icon="mdi:check-circle" width="18" height="18" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. types */}
        {dept ? (
          <>
            <InputGroup className="mb-3 shadow-sm">
              <InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></InputGroup.Text>
              <FormControl placeholder={`Search ${dept.name} types...`} value={query} onChange={(e) => setQuery(e.target.value)} />
              {query && <Button variant="outline-secondary" onClick={() => setQuery("")} aria-label="Clear search"><Icon icon="mdi:close" width="18" height="18" /></Button>}
            </InputGroup>
            <ManageListsBody departmentId={departmentId} query={query} color={ui.color} />
          </>
        ) : (
          <div className="text-center text-muted py-5 bg-white border rounded-3">
            <Icon icon="mdi:gesture-tap" width="40" height="40" />
            <div className="mt-2 fw-semibold">Pick a department above</div>
            <div className="small">Its repair types will show up here.</div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}