"use client";

import { useEffect, useState } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Button, Col, Form, FormControl, FormSelect, Row } from "react-bootstrap";
import { Icon } from "@iconify/react";
import Field from "./Field";
import CustomerSearch from "./CustomerSearch";
import { useGetDepartmentsQuery } from "@/store/features/apiSlice";
import { useGetCustomerGroupsQuery, useGetCustomerSourcesQuery, useLazyCheckReferralCodeQuery } from "./customerExtrasApi";

export const VEHICLE_TYPES = ["Car", "SUV", "Van", "Jeep", "Pickup / Cab", "Lorry", "Bus", "Motorbike", "Three-wheeler", "Other"];

// a brand-new, completely empty vehicle form (never reuse an old object, so nothing is carried over)
export const emptyVehicle = {
  regNo: "",
  vehicleType: "",
  year: "",
  mileage: "",
  isAppointment: false, // shows the appointment details below (only for vehicles that come with an appointment)
  appointmentDate: "",
  appointmentTime: "",
  appointmentDepartmentId: "",
  salesOfficer: "",
  chassisNo: "",
  engineNo: "",
  tyreSize: "",
  color: "",
  matter: "",
};

// Navigation is controlled by the wizard's Next / Back buttons.
// part = 0 -> Personal Information, part = 1 -> Vehicle Information
// leaving = true -> plays the exit animation
export const ANIM_MS = 400;

const PERSONAL_KEYS = [
  "customerName",
  "nic",
  "companyName",
  "contactNumber",
  "altContactNumber",
  "email",
  "profession",
  "birthDate",
  "sourceId",
  "groupId",
  "referredByCode",
  "ownReferralCode",
  "loyaltyPoints",
];

// A section heading: coloured icon bubble, title and a short line under it
function SectionHead({ icon, color = "#111111", title, subtitle, right }) {
  return (
    <div className="d-flex align-items-center gap-3 mb-2">
      <span className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
        style={{ width: 34, height: 34, color, background: `color-mix(in srgb, ${color} 12%, white)` }}>
        <Icon icon={icon} width="21" height="21" />
      </span>
      <div className="me-auto">
        <div className="fw-bold" style={{ fontSize: "1rem", color: "#0f172a" }}>{title}</div>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export default function StageOneForm({
  part = 0,
  leaving = false,
  savedVehicles = [],
  onSavedVehicles = () => {},
}) {
  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext();

  const { fields, append, remove, replace, update } = useFieldArray({ control, name: "vehicles" });

  const { data: departments = [] } = useGetDepartmentsQuery();
  const customerName = useWatch({ control, name: "customerName" });
  const currentVehicles = useWatch({ control, name: "vehicles" }) || [];

  // "How did you find us?" + the friend's referral code
  const { data: sources = [] } = useGetCustomerSourcesQuery();
  const { data: groups = [] } = useGetCustomerGroupsQuery();
  const sourceId = useWatch({ control, name: "sourceId" });
  const referredByCode = useWatch({ control, name: "referredByCode" });
      const needsReferral = Boolean(sources.find((x) => String(x.id) === String(sourceId))?.requiresReferral);
  const [checkCode] = useLazyCheckReferralCodeQuery();
  const [refState, setRefState] = useState(null); // null | "checking" | { valid, customerName }

  useEffect(() => { setValue("sourceRequiresReferral", needsReferral); }, [needsReferral, setValue]);
  useEffect(() => {
    const code = String(referredByCode || "").trim();
    if (!needsReferral || code.length < 4) { setRefState(null); return undefined; }
    let cancelled = false;
    setRefState("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkCode(code, false).unwrap();
        if (!cancelled) setRefState(r);
      } catch { if (!cancelled) setRefState(null); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [referredByCode, needsReferral]); // eslint-disable-line react-hooks/exhaustive-deps

  const normReg = (v) => String(v ?? "").toLowerCase().replace(/[\s-]/g, "");
  const isAdded = (v) =>
    currentVehicles.some((x) => normReg(x?.regNo) && normReg(x?.regNo) === normReg(v.regNo));

  // Auto-fill the form when a customer is selected from the search dropdown
  const handleSelectCustomer = (c) => {
    const opts = { shouldDirty: true };
    setValue("customerId", c.customerId || "", opts);
    PERSONAL_KEYS.forEach((key) => setValue(key, c[key] ?? "", opts));
    // Category of the existing customer is auto-selected in Stage 2.
    // If its status is APPROVED, Stage 2 shows only that category and locks it.
    setValue("category", c.categoryName ? c.categoryName.toUpperCase() : "", opts);
    setValue("categoryApprovalStatus", c.categoryApprovalStatus || "", opts);
    // Vehicles are NOT filled automatically. They are offered in the Vehicle Information step.
    onSavedVehicles(c.vehicles || []);
    replace([{ ...emptyVehicle }]);
    clearErrors();
  };

  // Fill the vehicle form from a saved vehicle: use the first empty form, otherwise add a new one
  const fillFromSaved = (v) => {
    // appointment details and the customer matter belong to ONE visit, so they are never copied from the saved vehicle
    const filled = { ...emptyVehicle, ...v, isAppointment: false, appointmentDate: "", appointmentTime: "", appointmentDepartmentId: "", salesOfficer: "", matter: "" };
    const emptyIdx = currentVehicles.findIndex(
      (x) => !x?.regNo && !x?.chassisNo && !x?.engineNo
    );
    if (emptyIdx >= 0) update(emptyIdx, filled);
    else append(filled);
    clearErrors("vehicles");
  };

  const panelClass = `step-panel ${leaving ? "step-exit" : "step-enter"}`;

  return (
    <div className="step-wrapper">
      <style>{`
        .step-wrapper { overflow-x: hidden; }
        .mf-card { background: #f6f6f7; border: 1px solid #e3e3e6; border-top: 4px solid var(--mf-card, #111111); border-radius: 16px; padding: 12px 16px 2px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(15,23,42,.05), 0 10px 26px -14px rgba(15,23,42,.18); }
        .mf-card.mf-vehicle { --mf-card: #111111; }
        @media (max-width: 575.98px) { .mf-card { padding: 16px 14px 4px; border-radius: 14px; } }
        .step-panel { animation-duration: ${ANIM_MS}ms; animation-fill-mode: both; animation-timing-function: ease; }
        .step-enter { animation-name: stepEnter; }
        .step-exit  { animation-name: stepExit; }
        @keyframes stepEnter {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes stepExit {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-24px); }
        }
        .mf-group { display:flex; align-items:center; gap:6px; margin:8px 0 6px; padding-bottom:4px; border-bottom:1.5px solid #efeff0; color:#111111; font-weight:800; font-size:.8rem; letter-spacing:.06em; text-transform:uppercase; }
        .row > .mf-group:first-child { margin-top:0; }
        @media (prefers-reduced-motion: reduce) {
          .step-panel { animation: none; }
        }
      `}</style>

      {/* PERSONAL INFORMATION */}
      {part === 0 && (
        <div className={panelClass}>
          <CustomerSearch onSelect={handleSelectCustomer} />

          <div className="mf-card" style={{ "--mf-accent": "#111111" }}>
            <SectionHead icon="mdi:account-circle-outline" color="#111111" title="Personal Information" subtitle="Who is the customer? Name and contact number are required." />
<Row>
              <Col xs={12} className="mf-group"><Icon icon="mdi:account-outline" width="17" height="17" /> Customer details</Col>
              <Field label="Customer ID (ERP System)" icon="mdi:identifier">
                <FormControl
                  type="text"
                  {...register("customerId")}
                  placeholder="Auto-generated by ERP"
                  readOnly
                  tabIndex={-1}
                />
              </Field>
              <Field label="Customer Name" required icon="mdi:account-outline" error={errors.customerName?.message}>
                <FormControl type="text" {...register("customerName")} placeholder="Enter customer name" />
              </Field>
              <Field label="NIC / Passport No." icon="mdi:card-account-details-outline" error={errors.nic?.message}>
                <FormControl type="text" {...register("nic")} placeholder="Enter NIC / Passport number" />
              </Field>
              <Field label="Date of Birth" icon="mdi:cake-variant-outline" error={errors.birthDate?.message}>
                <FormControl type="date" max={new Date().toISOString().slice(0, 10)} {...register("birthDate")} />
              </Field>
              <Col xs={12} className="mf-group"><Icon icon="mdi:phone-outline" width="17" height="17" /> Contact</Col>
              <Field label="Contact Number" required icon="mdi:phone-outline" error={errors.contactNumber?.message}>
                <FormControl type="tel" {...register("contactNumber")} placeholder="07XXXXXXXX" />
              </Field>
              <Field label="WhatsApp Number" icon="mdi:whatsapp" error={errors.altContactNumber?.message}>
                <FormControl type="tel" {...register("altContactNumber")} placeholder="07XXXXXXXX" />
              </Field>
              <Field label="Email Address" icon="mdi:email-outline" error={errors.email?.message}>
                <FormControl type="email" {...register("email")} placeholder="name@example.com" />
              </Field>
              <Field label="Company Name" icon="mdi:domain" error={errors.companyName?.message}>
                <FormControl type="text" {...register("companyName")} placeholder="Enter company name" />
              </Field>
              <Col xs={12} className="mf-group"><Icon icon="mdi:account-group-outline" width="17" height="17" /> Customer profile</Col>
              <Field label="Customer Category" icon="mdi:account-group-outline" error={errors.groupId?.message}>
                <FormSelect {...register("groupId")}>
                  <option value="">Select</option>
                  {groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </FormSelect>
              </Field>
              <Field label="Profession" icon="mdi:briefcase-outline" error={errors.profession?.message}>
                <FormControl type="text" {...register("profession")} placeholder="Enter profession" />
              </Field>
              <Field label="How did you find us?" icon="mdi:bullhorn-outline" error={errors.sourceId?.message}>
                <FormSelect {...register("sourceId")}>
                  <option value="">Select</option>
                  {sources.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </FormSelect>
              </Field>
              {needsReferral && (
                <Field
                  label="Friend's Referral Code (optional)" icon="mdi:ticket-percent-outline" error={errors.referredByCode?.message}
                  hint={
                    refState === "checking" ? "Checking..." :
                    refState && refState.valid ? <span className="text-success fw-semibold">✓ {refState.customerName} ({refState.customerId})</span> :
                    refState && !refState.valid ? <span className="text-danger fw-semibold">This referral code was not found</span> :
                    "Ask your friend for his / her code (e.g. KAZ-7H3QPM)"
                  }
                >
                  <FormControl type="text" autoComplete="off" style={{ textTransform: "uppercase", letterSpacing: ".06em" }} {...register("referredByCode")} placeholder="KAZ-XXXXXX" />
                </Field>
              )}
            </Row>
          </div>
        </div>
      )}

      {/* VEHICLE INFORMATION */}
      {part === 1 && (
        <div className={panelClass}>
          <SectionHead icon="mdi:car-outline" color="#111111" title="Vehicle Information" subtitle="Only the registration number is required." />

          {savedVehicles.length > 0 && (
            <div className="rounded-4 p-3 mb-3" style={{ background: "#efeff0", border: "2px solid #8a8a92", boxShadow: "0 8px 20px -10px rgba(17,17,17,.45)" }}>
              <div className="fw-bold small mb-2" style={{ color: "#111111" }}>
                <Icon icon="mdi:car-search-outline" width="20" height="20" /> Saved vehicles
                {customerName ? ` of ${customerName}` : ""} (select to fill the form)
              </div>
              <div className="d-flex flex-column gap-2">
                {savedVehicles.map((v) => {
                  const added = isAdded(v);
                  return (
                    <div
                      key={v.regNo}
                      className="d-flex flex-wrap justify-content-between align-items-center gap-2 rounded-3 bg-white p-2 px-3"
                      style={{ border: added ? "1.5px solid #16a34a" : "1.5px solid #c4c4ca" }}
                    >
                      <div>
                        <span className="d-inline-block fw-bold px-2 rounded" style={{ fontSize: ".92rem", letterSpacing: ".06em", background: "#fef9c3", border: "1.5px solid #1e293b", color: "#0f172a", lineHeight: 1.35 }}>{v.regNo}</span>
                        <div className="small text-muted mt-1">
                          {[v.vehicleType, v.year, v.color, v.mileage && `${v.mileage} km`].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "success" : undefined}
                        style={added ? undefined : { background: "#111111", borderColor: "#111111", color: "#fff" }}
                        disabled={added}
                        onClick={() => fillFromSaved(v)}
                      >
                        {added ? (
                          <>
                            <Icon icon="mdi:check" width="16" height="16" /> Added
                          </>
                        ) : (
                          "Use this vehicle"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {fields.map((field, index) => {
            const e = errors.vehicles?.[index] || {};
            const name = (key) => `vehicles.${index}.${key}`;

            return (
              <div key={field.id} className="mf-card mf-vehicle" style={{ "--mf-accent": "#111111" }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold text-white" style={{ width: 30, height: 30, background: "#111111", fontSize: ".85rem" }}>{index + 1}</span>
                    <span className="fw-bold">Vehicle {index + 1}</span>
                  </div>
                  {fields.length > 1 && (
                    <Button variant="outline-danger" size="sm" className="rounded-pill" onClick={() => remove(index)}>
                      <Icon icon="mdi:delete-outline" width="18" height="18" /> Remove
                    </Button>
                  )}
                </div>

                <Row>
                  <Field label="Vehicle Registration Number" required icon="mdi:card-text-outline" error={e.regNo?.message}>
                    <FormControl autoComplete="off" type="text" {...register(name("regNo"))} placeholder="e.g. CAB-1234" />
                  </Field>
                  <Field label="Vehicle Type" icon="mdi:car-estate" error={e.vehicleType?.message}>
                    <FormSelect autoComplete="off" {...register(name("vehicleType"))}>
                      <option value="">Select vehicle type</option>
                      {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </FormSelect>
                  </Field>
                  <Field label="Year of Manufacture" icon="mdi:calendar-outline" error={e.year?.message}>
                    <FormControl autoComplete="off" type="number" {...register(name("year"))} placeholder="e.g. 2018" />
                  </Field>
                  <Field label="Mileage (km)" icon="mdi:speedometer" error={e.mileage?.message}>
                    <FormControl autoComplete="off" type="number" {...register(name("mileage"))} placeholder="Enter mileage" />
                  </Field>
                  <Field label="Colour" icon="mdi:palette-outline" error={e.color?.message}>
                    <FormControl autoComplete="off" type="text" {...register(name("color"))} placeholder="Enter colour" />
                  </Field>
                  <Field label="Chassis Number" icon="mdi:numeric" error={e.chassisNo?.message}>
                    <FormControl autoComplete="off" type="text" {...register(name("chassisNo"))} placeholder="Enter chassis number" />
                  </Field>
                  <Field label="Engine Number" icon="mdi:engine-outline" error={e.engineNo?.message}>
                    <FormControl autoComplete="off" type="text" {...register(name("engineNo"))} placeholder="Enter engine number" />
                  </Field>
                  <Field label="Tyre Size" icon="mdi:tire" error={e.tyreSize?.message}>
                    <FormControl autoComplete="off" type="text" {...register(name("tyreSize"))} placeholder="e.g. 205/55 R16" />
                  </Field>
                  <Col md="12" className="mb-2">
                    <div className="rounded-3 px-3 py-1" style={{ background: "#efeff0", border: "1px solid #c4c4ca" }}>
                    <Form.Check
                      type="switch"
                      id={`appt-${field.id}`}
                      label="This vehicle comes with an appointment"
                      {...register(name("isAppointment"), {
                        onChange: (ev) => {
                          if (!ev.target.checked) {
                            ["appointmentDate", "appointmentTime", "appointmentDepartmentId", "salesOfficer"].forEach((k) => setValue(name(k), ""));
                          }
                        },
                      })}
                    />
                    </div>
                  </Col>
                  {currentVehicles[index]?.isAppointment && (
                    <>
                      <Field label="Appointment Date" icon="mdi:calendar-check-outline" error={e.appointmentDate?.message}>
                        <FormControl autoComplete="off" type="date" {...register(name("appointmentDate"))} />
                      </Field>
                      <Field label="Appointment Time" icon="mdi:clock-outline" error={e.appointmentTime?.message}>
                        <FormControl autoComplete="off" type="time" {...register(name("appointmentTime"))} />
                      </Field>
                      <Field label="Department" icon="mdi:domain" error={e.appointmentDepartmentId?.message}>
                        <FormSelect autoComplete="off" {...register(name("appointmentDepartmentId"))}>
                          <option value="">Select department</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </FormSelect>
                      </Field>
                      <Field label="Sales Officer" icon="mdi:account-tie-outline" error={e.salesOfficer?.message}>
                        <FormControl autoComplete="off" type="text" maxLength={100} {...register(name("salesOfficer"))} placeholder="Enter sales officer" />
                      </Field>
                    </>
                  )}
                  <Field label="Customer Matter in Brief" md="12" icon="mdi:message-text-outline">
                    <FormControl
                      as="textarea"
                      rows={2}
                      {...register(name("matter"))}
                      placeholder="Describe the customer's matter briefly"
                    />
                  </Field>
                </Row>
              </div>
            );
          })}

          {typeof errors.vehicles?.message === "string" && (
            <p className="text-danger">{errors.vehicles.message}</p>
          )}

          <div className="d-grid d-sm-block">
            <Button variant="dark" className="rounded-pill px-4 fw-bold border-0" style={{ minHeight: 46, background: "linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%)", boxShadow: "inset 0 -3px 0 #8a8a92" }} onClick={() => append({ ...emptyVehicle })}>
              <Icon icon="mdi:car-plus" width="20" height="20" /> Add a Vehicle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}