"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Alert, Button, Col, Collapse, Form, FormControl, FormSelect, Modal, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Swal from "sweetalert2";
import { useAddEmployeeMutation, useGetEmployeeFormOptionsQuery, useUpdateEmployeeMutation } from "@/store/features/apiSlice";

/* ----------------------------- who is logged in ----------------------------- */
// sessionStorage "role_id" = 1  ->  the user can choose the branch of the new employee.
// Any other role -> the new employee automatically gets the logged-in user's own branch
// (the server enforces this too, so it cannot be bypassed from the browser).
const ROLE_KEY = "role_id";
const ADMIN_ROLE_ID = "1";
const readIsAdmin = () =>
  typeof window !== "undefined" && String(window.sessionStorage.getItem(ROLE_KEY)) === ADMIN_ROLE_ID;

/* ----------------------------- validation (yup) ----------------------------- */
const SALUTATIONS = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Rev"];
const GENDERS = ["Male", "Female", "Other"];
const STATUSES = ["Active", "Probation", "Resigned"];
const todayISO = () => new Date().toISOString().slice(0, 10);

const makeSchema = (isAdmin) =>
  yup.object({
    salutation: yup.string().oneOf(SALUTATIONS, "Select the salutation").required("Select the salutation"),
    fullName: yup.string().trim().required("Employee name is required").max(150, "Name is too long (max 150 characters)"),
    gender: yup.string().oneOf(["", ...GENDERS], "Select a valid gender"),
    dateOfBirth: yup
      .string()
      .test("not-future", "Date of birth cannot be in the future", (v) => !v || v <= todayISO()),
    nic: yup
      .string()
      .trim()
      .matches(/^(\d{9}[VvXx]|\d{12})$/, { message: "NIC must be 9 digits + V / X, or 12 digits", excludeEmptyString: true }),

    email: yup.string().trim().email("Enter a valid email").max(150, "Email is too long"),
    mobile: yup
      .string()
      .trim()
      .required("Mobile number is required")
      .matches(/^\d{10,11}$/, "Mobile number must be 10 or 11 digits"),
    altMobile: yup
      .string()
      .trim()
      .matches(/^\d{10,11}$/, { message: "Alternative mobile must be 10 or 11 digits", excludeEmptyString: true }),
    address: yup.string().trim().max(500, "Address is too long (max 500 characters)"),

    designationId: yup.string().required("Select the designation"),
    departmentId: yup.string().required("Select the department"),
    branchId: isAdmin ? yup.string().required("Select the branch") : yup.string(),
    joiningDate: yup.string().test("after-dob", "Joining date must be after the date of birth", function (v) {
      const dob = this.parent.dateOfBirth;
      return !v || !dob || v > dob;
    }),
    reportingTo: yup.string(),
    status: yup.string().oneOf(STATUSES, "Select a valid status"),

    about: yup.string().trim().max(1000, "About is too long (max 1000 characters)"),
  });

const DEFAULTS = {
  salutation: "Mr",
  fullName: "",
  gender: "",
  dateOfBirth: "",
  nic: "",
  email: "",
  mobile: "",
  altMobile: "",
  address: "",
  designationId: "",
  departmentId: "",
  branchId: "",
  joiningDate: "",
  reportingTo: "",
  status: "Active",
  about: "",
};

// Values of an existing employee (row of GET /api/employees) -> form values
const fromEmployee = (e) => {
  const t = (x) => (x === null || x === undefined ? "" : String(x));
  return {
    salutation: e.salutation || "Mr",
    fullName: t(e.name),
    gender: t(e.gender),
    dateOfBirth: t(e.dob),
    nic: t(e.nic),
    email: t(e.email),
    mobile: t(e.mobile),
    altMobile: t(e.altMobile),
    address: t(e.address),
    designationId: t(e.designationId),
    departmentId: t(e.departmentId),
    branchId: t(e.branchId),
    joiningDate: t(e.joined),
    reportingTo: t(e.reportingToId),
    status: STATUSES.includes(e.status) ? e.status : "Active",
    about: t(e.about),
  };
};

// Each section is a card that can be collapsed by the user
const SECTIONS = [
  { key: "personal", title: "Personal details", icon: "mdi:account-outline", fields: ["salutation", "fullName", "gender", "dateOfBirth", "nic"] },
  { key: "contact", title: "Contact details", icon: "mdi:phone-outline", fields: ["email", "mobile", "altMobile", "address"] },
  { key: "job", title: "Job details", icon: "mdi:briefcase-outline", fields: ["designationId", "departmentId", "branchId", "joiningDate", "reportingTo", "status"] },
  { key: "about", title: "About", icon: "mdi:text-account", fields: ["about"] },
];

/* ----------------------------- small UI parts ----------------------------- */
function Field({ label, required, error, md = 6, lg, hint, children }) {
  return (
    <Col xs={12} md={md} lg={lg || md}>
      <Form.Label className="small fw-semibold mb-1">
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      {children}
      {error && <div className="text-danger small mt-1">{error}</div>}
      {!error && hint && <div className="form-text mt-1">{hint}</div>}
    </Col>
  );
}

function SectionCard({ section, open, onToggle, errorCount, summary, children }) {
  return (
    <div className="bg-white rounded-3 shadow-sm mb-3 border" style={errorCount ? { borderColor: "#dc3545" } : undefined}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-100 bg-transparent border-0 d-flex align-items-center gap-2 p-3 text-start"
      >
        <span
          className="rounded-3 d-inline-flex align-items-center justify-content-center flex-shrink-0 bg-primary-subtle text-primary"
          style={{ width: 36, height: 36 }}
        >
          <Icon icon={section.icon} width="20" height="20" />
        </span>
        <span className="fw-bold">{section.title}</span>
        {errorCount > 0 && (
          <span className="badge rounded-pill bg-danger">
            {errorCount} error{errorCount > 1 ? "s" : ""}
          </span>
        )}
        {!open && summary && <span className="text-muted small text-truncate ms-2 d-none d-sm-inline">{summary}</span>}
        <Icon
          icon="mdi:chevron-down"
          width="24"
          height="24"
          className="ms-auto flex-shrink-0 text-muted"
          style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      <Collapse in={open}>
        <div>
          <div className="p-3 pt-0">{children}</div>
        </div>
      </Collapse>
    </div>
  );
}

/* ----------------------------- the form ----------------------------- */
// Add: <EmployeeFormModal onClose={...} />      Edit: <EmployeeFormModal employee={row} onClose={...} />
export default function EmployeeFormModal({ onClose, employee }) {
  const isEdit = Boolean(employee);
  const { data: options, isLoading: loadingOptions, isError: optionsError, refetch } = useGetEmployeeFormOptionsQuery();
  const [addEmployee, { isLoading: adding }] = useAddEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const saving = adding || updating;

  const [isAdmin] = useState(readIsAdmin);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: yupResolver(makeSchema(isAdmin)), defaultValues: isEdit ? fromEmployee(employee) : DEFAULTS, mode: "onTouched" });

  const [open, setOpen] = useState({ personal: true, contact: true, job: true, about: true });
  const [serverError, setServerError] = useState("");

  const v = watch();
  const err = (k) => errors[k]?.message;
  const bad = (k) => Boolean(errors[k]);
  const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));
  const setAll = (value) => setOpen({ personal: value, contact: value, job: value, about: value });
  const errorCount = (s) => s.fields.filter((f) => errors[f]).length;

  const nameOf = (list = [], id) => list.find((x) => String(x.id) === String(id))?.name;
  const summaries = {
    personal: [v.salutation, v.fullName].filter(Boolean).join(" ") || "Not filled yet",
    contact: [v.mobile, v.email].filter(Boolean).join(" · ") || "Not filled yet",
    job: [nameOf(options?.designations, v.designationId), nameOf(options?.departments, v.departmentId)].filter(Boolean).join(" · ") || "Not filled yet",
    about: v.about ? `${v.about.slice(0, 50)}${v.about.length > 50 ? "..." : ""}` : "Empty",
  };

  // A section with an error opens by itself and the page scrolls to the first error
  const onInvalid = (errs) => {
    const needOpen = SECTIONS.filter((s) => s.fields.some((f) => errs[f])).map((s) => [s.key, true]);
    setOpen((p) => ({ ...p, ...Object.fromEntries(needOpen) }));
    setTimeout(() => document.querySelector(".is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
  };

  const onValid = async (values) => {
    setServerError("");
    const body = {}; // plain JSON payload (empty values are sent too, so an edit can clear a field)
    Object.entries(values).forEach(([k, val]) => {
      if (k === "branchId" && !isAdmin) return; // the server uses the user's own branch
      body[k] = String(val ?? "").trim();
    });

    try {
      const res = isEdit
        ? await updateEmployee({ id: employee.dbId, ...body }).unwrap()
        : await addEmployee(body).unwrap();
      await Swal.fire({
        title: isEdit ? "Employee updated!" : "Employee added!",
        text: `${values.salutation} ${values.fullName.trim()} (${res.employee.id})`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      onClose();
    } catch (ex) {
      setServerError(ex?.data?.message || "Failed to add the employee.");
    }
  };

  // Editing: an employee may still hold a designation / department / branch that is inactive now,
  // so keep that one visible in the list (otherwise the select would show empty).
  const withCurrent = (list = [], id, name) =>
    isEdit && id && name && !list.some((o) => String(o.id) === String(id)) ? [...list, { id, name: `${name} (inactive)` }] : list;

  const opts = (list = []) =>
    list.map((o) => (
      <option key={o.id} value={o.id}>
        {o.name}
        {o.employeeNo ? ` (${o.employeeNo})` : ""}
      </option>
    ));

  return (
    <Modal show onHide={saving ? undefined : onClose} size="xl" scrollable centered fullscreen="md-down" backdrop="static">
      <Modal.Header closeButton={!saving}>
        <Modal.Title className="fs-5">
          <Icon icon="mdi:account-plus-outline" width="24" height="24" className="me-2" />
          {isEdit ? `Edit employee - ${employee.id}` : "Add employee"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light">
        {loadingOptions && (
          <div className="text-center text-muted py-5">
            <Spinner animation="border" size="sm" className="me-2" /> Loading...
          </div>
        )}
        {optionsError && (
          <Alert variant="danger" className="d-flex justify-content-between align-items-center">
            <span>Failed to load the form options.</span>
            <Button size="sm" variant="outline-danger" onClick={refetch}>Retry</Button>
          </Alert>
        )}
        {serverError && <Alert variant="danger" className="py-2" dismissible onClose={() => setServerError("")}>{serverError}</Alert>}

        {options && (
          <Form noValidate onSubmit={(e) => e.preventDefault()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted"><span className="text-danger">*</span> required</span>
              <span className="small">
                <Button variant="link" size="sm" className="p-0 me-3" onClick={() => setAll(true)}>Expand all</Button>
                <Button variant="link" size="sm" className="p-0" onClick={() => setAll(false)}>Collapse all</Button>
              </span>
            </div>

            {/* ---- Personal details ---- */}
            <SectionCard section={SECTIONS[0]} open={open.personal} onToggle={() => toggle("personal")} errorCount={errorCount(SECTIONS[0])} summary={summaries.personal}>
              <Row className="g-3">
                <Col xs={12}>
                  <Row className="g-3">
                    <Field label="Employee ID" md={6} lg={4} hint="Generated automatically, cannot be changed">
                      <FormControl readOnly tabIndex={-1} value={isEdit ? employee.id : options.nextEmployeeNo || "Auto-generated"} className="bg-light fw-semibold" />
                    </Field>
                    <Field label="Salutation" required md={6} lg={2} error={err("salutation")}>
                      <FormSelect {...register("salutation")} isInvalid={bad("salutation")}>
                        {(options.salutations || SALUTATIONS).map((s) => <option key={s}>{s}</option>)}
                      </FormSelect>
                    </Field>
                    <Field label="Employee name" required md={12} lg={6} error={err("fullName")}>
                      <FormControl {...register("fullName")} isInvalid={bad("fullName")} placeholder="Full name" />
                    </Field>
                    <Field label="NIC" md={6} lg={4} error={err("nic")}>
                      <FormControl {...register("nic")} isInvalid={bad("nic")} placeholder="123456789V / 200012345678" />
                    </Field>
                    <Field label="Gender" md={6} lg={4} error={err("gender")}>
                      <FormSelect {...register("gender")} isInvalid={bad("gender")}>
                        <option value="">Select</option>
                        {(options.genders || GENDERS).map((g) => <option key={g}>{g}</option>)}
                      </FormSelect>
                    </Field>
                    <Field label="Date of birth" md={6} lg={4} error={err("dateOfBirth")}>
                      <FormControl type="date" {...register("dateOfBirth")} isInvalid={bad("dateOfBirth")} max={todayISO()} />
                    </Field>
                  </Row>
                </Col>
              </Row>
            </SectionCard>

            {/* ---- Contact details ---- */}
            <SectionCard section={SECTIONS[1]} open={open.contact} onToggle={() => toggle("contact")} errorCount={errorCount(SECTIONS[1])} summary={summaries.contact}>
              <Row className="g-3">
                <Field label="Employee email" md={6} lg={4} error={err("email")}>
                  <FormControl type="email" {...register("email")} isInvalid={bad("email")} placeholder="name@company.lk" />
                </Field>
                <Field label="Mobile" required md={6} lg={4} error={err("mobile")}>
                  <FormControl type="tel" {...register("mobile")} isInvalid={bad("mobile")} placeholder="07XXXXXXXX" />
                </Field>
                <Field label="Alternative mobile" md={6} lg={4} error={err("altMobile")}>
                  <FormControl type="tel" {...register("altMobile")} isInvalid={bad("altMobile")} placeholder="07XXXXXXXX" />
                </Field>
                <Field label="Address" md={12} error={err("address")}>
                  <FormControl as="textarea" rows={2} {...register("address")} isInvalid={bad("address")} />
                </Field>
              </Row>
            </SectionCard>

            {/* ---- Job details ---- */}
            <SectionCard section={SECTIONS[2]} open={open.job} onToggle={() => toggle("job")} errorCount={errorCount(SECTIONS[2])} summary={summaries.job}>
              <Row className="g-3">
                <Field label="Designation" required md={6} lg={4} error={err("designationId")}>
                  <FormSelect {...register("designationId")} isInvalid={bad("designationId")}>
                    <option value="">Select designation</option>
                    {opts(withCurrent(options.designations, employee?.designationId, employee?.designation))}
                  </FormSelect>
                </Field>
                <Field label="Department" required md={6} lg={4} error={err("departmentId")}>
                  <FormSelect {...register("departmentId")} isInvalid={bad("departmentId")}>
                    <option value="">Select department</option>
                    {opts(withCurrent(options.departments, employee?.departmentId, employee?.department))}
                  </FormSelect>
                </Field>

                {isAdmin ? (
                  <Field label="Branch" required md={6} lg={4} error={err("branchId")}>
                    <FormSelect {...register("branchId")} isInvalid={bad("branchId")}>
                      <option value="">Select branch</option>
                      {opts(options.branches)}
                    </FormSelect>
                  </Field>
                ) : (
                  <Field label="Branch" md={6} lg={4} hint="Your own branch is used automatically">
                    <FormControl readOnly value={options.myBranch?.name || "No branch assigned to your account"} className={options.myBranch ? "bg-light" : "bg-light text-danger"} />
                  </Field>
                )}

                <Field label="Joining date" md={6} lg={4} error={err("joiningDate")}>
                  <FormControl type="date" {...register("joiningDate")} isInvalid={bad("joiningDate")} />
                </Field>
                <Field label="Reporting to" md={6} lg={4} error={err("reportingTo")}>
                  <FormSelect {...register("reportingTo")}>
                    <option value="">No one</option>
                    {opts((options.reportingCandidates || []).filter((c) => !isEdit || c.id !== employee.dbId))}
                  </FormSelect>
                </Field>
                {isEdit && (
                  <Field label="Status" md={6} lg={4} error={err("status")}>
                    <FormSelect {...register("status")} isInvalid={bad("status")}>
                      {STATUSES.map((x) => <option key={x}>{x}</option>)}
                    </FormSelect>
                  </Field>
                )}
              </Row>
            </SectionCard>

            {/* ---- About ---- */}
            <SectionCard section={SECTIONS[3]} open={open.about} onToggle={() => toggle("about")} errorCount={errorCount(SECTIONS[3])} summary={summaries.about}>
              <Row className="g-3">
                <Field label="About" md={12} error={err("about")}>
                  <FormControl as="textarea" rows={3} {...register("about")} isInvalid={bad("about")} placeholder="A short note about the employee" />
                </Field>
              </Row>
            </SectionCard>
          </Form>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit(onValid, onInvalid)} disabled={saving || !options}>
          <Icon icon="mdi:content-save-outline" width="20" height="20" /> {saving ? "Saving..." : isEdit ? "Update employee" : "Save employee"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}