"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Alert, Button, Col, FormControl, InputGroup, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetConsultantsQuery } from "@/store/features/apiSlice";

const initialsOf = (name) =>
  String(name)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function StageThreeConsultant() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext();

  const selected = useWatch({ control, name: "consultantId" });
  const customerName = useWatch({ control, name: "customerName" });
  const [search, setSearch] = useState("");

  // Consultants (admin users with role_id = 2) come from the database
  const { data: consultants = [], isLoading, isError, refetch } = useGetConsultantsQuery();

  const q = search.trim().toLowerCase();
  const visible = q
    ? consultants.filter((c) => [c.name, c.username, c.mobile].some((v) => String(v ?? "").toLowerCase().includes(q)))
    : consultants;

  return (
    <>
      <h6 className="fw-bold text-primary mb-2">Select Consultant</h6>

      {customerName && (
        <p className="text-success small mb-3">
          <Icon icon="mdi:check-circle-outline" width="16" height="16" /> Customer{" "}
          <strong>{customerName}</strong> has been saved. Select the consultant to start the job.
        </p>
      )}

      {/* Search is only useful when there are many consultants */}
      {consultants.length > 6 && (
        <InputGroup className="mb-3">
          <InputGroup.Text className="bg-white">
            <Icon icon="mdi:magnify" width="20" height="20" />
          </InputGroup.Text>
          <FormControl
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search consultant by name / username / mobile"
          />
        </InputGroup>
      )}

      {isLoading && (
        <div className="text-center text-muted py-4">
          <Spinner animation="border" size="sm" className="me-2" /> Loading consultants...
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load consultants.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>
            Retry
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && consultants.length === 0 && (
        <Alert variant="warning">No active consultants found.</Alert>
      )}

      <Row>
        {visible.map((c) => {
          const value = String(c.id);
          const isSelected = String(selected) === value;
          return (
            <Col xs="12" sm="6" lg="4" key={c.id} className="mb-3">
              <label
                className="d-flex align-items-center gap-3 h-100 rounded p-3"
                style={{
                  cursor: "pointer",
                  border: `2px solid ${isSelected ? "#111111" : "#e2e8f0"}`,
                  backgroundColor: isSelected ? "color-mix(in srgb, #111111 8%, white)" : "#fff",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  value={value}
                  checked={isSelected}
                  {...register("consultantId", {
                    // keep the name in the form too (shown in the success message / jobs table)
                    onChange: () => setValue("consultantName", c.name),
                  })}
                />
                <span
                  className="rounded-circle bg-primary-subtle text-primary fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40 }}
                >
                  {initialsOf(c.name)}
                </span>
                <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                  <strong className="text-truncate">{c.name}</strong>
                  {c.mobile && (
                    <small className="text-truncate">
                      <Icon icon="mdi:phone-outline" width="14" height="14" /> {c.mobile}
                    </small>
                  )}
                  <small className="text-muted text-truncate">@{c.username}</small>
                </span>
              </label>
            </Col>
          );
        })}
      </Row>

      {errors.consultantId && <p className="text-danger">{errors.consultantId.message}</p>}
    </>
  );
}