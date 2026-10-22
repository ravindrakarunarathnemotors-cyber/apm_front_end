"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Alert, Badge, Button, Col, Form, FormControl, InputGroup, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useAddBranchMutation, useGetBranchesQuery, useUpdateBranchMutation } from "@/store/features/apiSlice";
import { Empty, Panel } from "./hrUi";

/* ----------------------------- validation (yup) ----------------------------- */
const schema = yup.object({
  code: yup.string().trim().required("Branch code is required").max(20, "Max 20 characters"),
  name: yup.string().trim().required("Branch name is required").max(100, "Max 100 characters"),
  address: yup.string().trim().required("Address is required"),
  city: yup.string().trim().required("City is required").max(50, "Max 50 characters"),
  district: yup.string().trim().max(50, "Max 50 characters"),
  postalCode: yup.string().trim().max(10, "Max 10 characters"),
  phone: yup.string().trim().required("Phone number is required").matches(/^\d{10,11}$/, "Phone number must be 10 or 11 digits"),
  secondaryPhone: yup.string().trim().matches(/^\d{10,11}$/, { message: "Secondary phone must be 10 or 11 digits", excludeEmptyString: true }),
  email: yup.string().trim().email("Enter a valid email").max(100, "Max 100 characters"),
  managerName: yup.string().trim().max(100, "Max 100 characters"),
  openingTime: yup.string().required("Opening time is required"),
  closingTime: yup
    .string()
    .required("Closing time is required")
    .test("after-open", "Closing time must be after the opening time", function (v) {
      return !v || !this.parent.openingTime || v > this.parent.openingTime;
    }),
  maxDailyCapacity: yup
    .number()
    .transform((val, orig) => (orig === "" ? NaN : val))
    .typeError("Enter a number")
    .integer("Must be a whole number")
    .min(1, "Minimum is 1")
    .max(1000, "Maximum is 1000")
    .required("Daily capacity is required"),
});

const DEFAULTS = {
  code: "", name: "", address: "", city: "", district: "", postalCode: "", phone: "", secondaryPhone: "",
  email: "", managerName: "", openingTime: "08:00", closingTime: "17:00", maxDailyCapacity: 15,
};

const fromBranch = (b) => {
  const t = (x) => (x === null || x === undefined ? "" : String(x));
  return {
    code: t(b.code), name: t(b.name), address: t(b.address), city: t(b.city), district: t(b.district),
    postalCode: t(b.postalCode), phone: t(b.phone), secondaryPhone: t(b.secondaryPhone), email: t(b.email),
    managerName: t(b.managerName), openingTime: t(b.openingTime) || "08:00", closingTime: t(b.closingTime) || "17:00",
    maxDailyCapacity: b.maxDailyCapacity ?? 15,
  };
};

function Field({ label, required, error, md = 6, children }) {
  return (
    <Col xs={12} md={md}>
      <Form.Label className="small fw-semibold mb-1">{label} {required && <span className="text-danger">*</span>}</Form.Label>
      {children}
      {error && <div className="text-danger small mt-1">{error}</div>}
    </Col>
  );
}

/* ----------------------------- add / edit popup ----------------------------- */
function BranchModal({ item, onClose }) {
  const isEdit = Boolean(item);
  const [add, { isLoading: adding }] = useAddBranchMutation();
  const [update, { isLoading: updating }] = useUpdateBranchMutation();
  const saving = adding || updating;

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: isEdit ? fromBranch(item) : DEFAULTS,
    mode: "onTouched",
  });
  const [isActive, setIsActive] = useState(item ? item.isActive : true);
  const [serverError, setServerError] = useState("");
  const err = (k) => errors[k]?.message;
  const bad = (k) => Boolean(errors[k]);

  const onValid = async (values) => {
    setServerError("");
    const payload = { ...values, isActive };
    try {
      if (isEdit) await update({ id: item.id, ...payload }).unwrap();
      else await add(payload).unwrap();
      await Swal.fire({ title: isEdit ? "Branch updated!" : "Branch added!", icon: "success", timer: 1300, showConfirmButton: false });
      onClose();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to save the branch.");
    }
  };
  const onInvalid = () => setTimeout(() => document.querySelector(".is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);

  return (
    <Modal show onHide={saving ? undefined : onClose} size="lg" scrollable centered fullscreen="md-down" backdrop="static">
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5">{isEdit ? `Edit branch - ${item.name}` : "Add branch"}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-light">
        {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}
        <Form noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="bg-white border rounded-3 p-3 mb-3">
            <div className="fw-bold mb-2">Branch</div>
            <Row className="g-3">
              <Field label="Branch code" required md={4} error={err("code")}><FormControl {...register("code")} isInvalid={bad("code")} placeholder="e.g. COL-01" /></Field>
              <Field label="Branch name" required md={8} error={err("name")}><FormControl {...register("name")} isInvalid={bad("name")} placeholder="e.g. Colombo Main" /></Field>
              <Field label="Manager name" md={12} error={err("managerName")}><FormControl {...register("managerName")} isInvalid={bad("managerName")} /></Field>
            </Row>
          </div>

          <div className="bg-white border rounded-3 p-3 mb-3">
            <div className="fw-bold mb-2">Address and contact</div>
            <Row className="g-3">
              <Field label="Address" required md={12} error={err("address")}><FormControl as="textarea" rows={2} {...register("address")} isInvalid={bad("address")} /></Field>
              <Field label="City" required md={4} error={err("city")}><FormControl {...register("city")} isInvalid={bad("city")} /></Field>
              <Field label="District" md={4} error={err("district")}><FormControl {...register("district")} isInvalid={bad("district")} /></Field>
              <Field label="Postal code" md={4} error={err("postalCode")}><FormControl {...register("postalCode")} isInvalid={bad("postalCode")} /></Field>
              <Field label="Phone" required md={6} error={err("phone")}><FormControl type="tel" {...register("phone")} isInvalid={bad("phone")} placeholder="0112345678" /></Field>
              <Field label="Secondary phone" md={6} error={err("secondaryPhone")}><FormControl type="tel" {...register("secondaryPhone")} isInvalid={bad("secondaryPhone")} /></Field>
              <Field label="Email" md={12} error={err("email")}><FormControl type="email" {...register("email")} isInvalid={bad("email")} placeholder="branch@company.lk" /></Field>
            </Row>
          </div>

          <div className="bg-white border rounded-3 p-3">
            <div className="fw-bold mb-2">Working hours and capacity</div>
            <Row className="g-3">
              <Field label="Opening time" required md={4} error={err("openingTime")}><FormControl type="time" {...register("openingTime")} isInvalid={bad("openingTime")} /></Field>
              <Field label="Closing time" required md={4} error={err("closingTime")}><FormControl type="time" {...register("closingTime")} isInvalid={bad("closingTime")} /></Field>
              <Field label="Max daily capacity (jobs)" required md={4} error={err("maxDailyCapacity")}><FormControl type="number" min={1} {...register("maxDailyCapacity")} isInvalid={bad("maxDailyCapacity")} /></Field>
              <Col xs={12}>
                <Form.Check
                  type="switch"
                  id="branch-active"
                  label={isActive ? "Active (can be selected for employees)" : "Inactive (hidden from the employee form)"}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </Col>
            </Row>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit(onValid, onInvalid)} disabled={saving}>
          <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : isEdit ? "Update branch" : "Add branch"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* ----------------------------- the tab ----------------------------- */
export default function BranchesTab() {
  const { data, isLoading, isError, refetch } = useGetBranchesQuery();
  const [update, { isLoading: toggling }] = useUpdateBranchMutation();

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [modal, setModal] = useState(null); // null | "add" | branch row

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.rows || []).filter(
      (b) =>
        (showInactive || b.isActive) &&
        (!s || [b.name, b.code, b.city, b.district, b.phone, b.managerName].some((v) => String(v ?? "").toLowerCase().includes(s)))
    );
  }, [data, q, showInactive]);

  const setActive = async (b, next) => {
    if (!next) {
      const ask = await Swal.fire({
        title: `Deactivate "${b.name}"?`,
        text: `${b.employeeCount} employee(s) and ${b.userCount} user(s) belong to this branch. They keep working, but the branch cannot be selected for new employees, and users of this branch will not be able to add employees until it is active again.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Deactivate",
      });
      if (!ask.isConfirmed) return;
    }
    try {
      await update({ id: b.id, ...fromBranch(b), isActive: next }).unwrap();
    } catch (ex) {
      Swal.fire({ title: "Failed", text: ex?.data?.message || "Could not change the status.", icon: "error" });
    }
  };

  return (
    <Panel
      title={<>Branches <Badge bg="secondary" pill>{rows.length}</Badge></>}
      icon="mdi:store-marker-outline"
      action={<Button size="sm" onClick={() => setModal("add")}><Icon icon="mdi:plus" width="18" height="18" /> Add branch</Button>}
    >
      <Row className="g-2 mb-3 align-items-center">
        <Col xs={12} md={6}>
          <InputGroup>
            <InputGroup.Text className="bg-white"><Icon icon="mdi:magnify" width="20" height="20" /></InputGroup.Text>
            <FormControl value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / code / city / phone / manager" />
          </InputGroup>
        </Col>
        <Col xs={12} md={6} className="d-flex justify-content-md-end">
          <Form.Check type="switch" id="show-inactive-branches" className="small" label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        </Col>
      </Row>

      {isLoading ? (
        <div className="text-center text-muted py-5"><Spinner animation="border" size="sm" className="me-2" /> Loading branches...</div>
      ) : isError ? (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load branches.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
        </Alert>
      ) : rows.length === 0 ? (
        <Empty text={(data?.rows || []).length === 0 ? "No branches yet. Click Add branch." : "No branches match your search"} />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead className="table-light">
            <tr><th>Branch</th><th>Location</th><th>Contact</th><th>Hours</th><th>Capacity</th><th>Employees</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className={b.isActive ? "" : "text-muted"}>
                <td>
                  <div className="fw-semibold">{b.name}</div>
                  <small className="text-muted">{b.code}{b.managerName ? ` · ${b.managerName}` : ""}</small>
                </td>
                <td className="small">{[b.city, b.district].filter(Boolean).join(", ")}</td>
                <td className="small">
                  <div>{b.phone}</div>
                  <small className="text-muted">{b.email}</small>
                </td>
                <td className="small text-nowrap">{b.openingTime} - {b.closingTime}</td>
                <td>{b.maxDailyCapacity}</td>
                <td>{b.employeeCount}</td>
                <td>
                  <Form.Check type="switch" id={`branch-${b.id}`} disabled={toggling} checked={b.isActive} onChange={(e) => setActive(b, e.target.checked)} label={b.isActive ? "Active" : "Inactive"} />
                </td>
                <td className="text-end">
                  <Button size="sm" variant="outline-secondary" onClick={() => setModal(b)}><Icon icon="mdi:pencil-outline" width="16" height="16" /> Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {modal && <BranchModal key={modal === "add" ? "add" : modal.id} item={modal === "add" ? null : modal} onClose={() => setModal(null)} />}
    </Panel>
  );
}