"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Alert, Button, Col, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { getDepartmentUi } from "./departmentConfig";
import { useGetDepartmentsQuery } from "@/store/features/apiSlice";

export default function StageThreeDepartment() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const selected = useWatch({ control, name: "department" });
  const customerName = useWatch({ control, name: "customerName" });

  // Departments (id, name) come from the database
  const { data: departments = [], isLoading, isError, refetch } = useGetDepartmentsQuery();

  return (
    <>
      <h6 className="fw-bold text-primary mb-2">Select Department from Initial Discussion</h6>

      {customerName && (
        <p className="text-success small mb-3">
          <Icon icon="mdi:check-circle-outline" width="16" height="16" /> Customer{" "}
          <strong>{customerName}</strong> has been saved. Select the department to start the job.
        </p>
      )}

      {isLoading && (
        <div className="text-center text-muted py-4">
          <Spinner animation="border" size="sm" className="me-2" /> Loading departments...
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load departments.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>
            Retry
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && departments.length === 0 && (
        <Alert variant="warning">No departments found. Please add departments in the database.</Alert>
      )}

      <Row>
        {departments.map((d) => {
          const ui = getDepartmentUi(d.name);
          const isSelected = selected === ui.key;
          return (
            <Col xs="12" sm="6" lg="4" key={d.id} className="mb-3">
              <label
                className="d-flex align-items-center gap-2 h-100 rounded p-3"
                style={{
                  cursor: "pointer",
                  border: `2px solid ${isSelected ? ui.color : "#e2e8f0"}`,
                  backgroundColor: isSelected ? `color-mix(in srgb, ${ui.color} 8%, white)` : "#fff",
                  transition: "all 0.2s ease",
                }}
              >
                <input type="radio" value={ui.key} checked={isSelected} {...register("department")} />
                <Icon icon={ui.icon} width="26" height="26" color={ui.color} />
                <strong style={{ color: isSelected ? ui.color : undefined }}>{d.name}</strong>
              </label>
            </Col>
          );
        })}
      </Row>

      {errors.department && <p className="text-danger">{errors.department.message}</p>}

      <Alert variant="info" className="mb-0 py-2 small">
        The next windows will change according to this selection.
      </Alert>
    </>
  );
}