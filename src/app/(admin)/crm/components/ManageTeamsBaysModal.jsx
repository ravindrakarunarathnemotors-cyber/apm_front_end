"use client";

import { Modal } from "react-bootstrap";
import { Icon } from "@iconify/react";
import ManageTeamsBays from "./ManageTeamsBays";

// The "Teams & Bays" window of a department dashboard (create / edit / activate / deactivate).
// Props: baysOnly (departments without teams, e.g. Wash), onHide and EITHER department = { id, name } OR just departmentName = "Mechanical"
export default function ManageTeamsBaysModal({ department, departmentName, onHide, baysOnly = false }) {
  return (
    <Modal show onHide={onHide} size="lg" centered scrollable fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 d-flex align-items-center gap-2">
          <Icon icon={baysOnly ? "mdi:garage-variant" : "mdi:account-group-outline"} width="24" height="24" /> {baysOnly ? "Bays" : "Teams & Bays"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        <ManageTeamsBays departmentId={department?.id} departmentName={department?.name || departmentName} baysOnly={baysOnly} />
      </Modal.Body>
    </Modal>
  );
}