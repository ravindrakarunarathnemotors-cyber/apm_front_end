"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button, Card, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import { Icon } from "@iconify/react";
import StageOneForm, { emptyVehicle, ANIM_MS } from "./StageOneForm";
import StageTwoCategory from "./StageTwoCategory";
import StageThreeConsultant from "./StageThreeConsultant";
import { useAddCustomerMutation, useCreateJobMutation } from "@/store/features/apiSlice";

const phoneRegex = /^\d{10,11}$/;
const currentYear = new Date().getFullYear();

// Treat an empty number field as undefined so it does not raise a type error
const optionalNumber = () =>
  yup
    .number()
    .transform((v, orig) => (orig === "" || orig == null ? undefined : v))
    .typeError("Enter a valid number");

// Only Vehicle Registration Number is required. Everything else is optional.
const vehicleSchema = yup.object({
  regNo: yup.string().trim().required("Vehicle registration number is required"),
  year: optionalNumber()
    .min(1950, "Year is too old")
    .max(currentYear + 1, "Year is invalid"),
  mileage: optionalNumber().min(0, "Mileage cannot be negative"),
  vehicleType: yup.string().trim().max(30),
  isAppointment: yup.boolean(),
  appointmentDate: yup.string(),
  appointmentTime: yup.string(),
  appointmentDepartmentId: yup.mixed(),
  salesOfficer: yup.string().trim().max(100, "Sales officer is too long"),
  chassisNo: yup.string().trim(),
  engineNo: yup.string().trim(),
  tyreSize: yup.string().trim(),
  color: yup.string().trim(),
  matter: yup.string().trim(),
});

// Required: Customer Name, Contact Number, Vehicle Registration Number
const schema = yup.object({
  // Stage 1
  customerId: yup.string(),
  customerName: yup.string().trim().required("Customer name is required"),
  nic: yup.string().trim(),
  companyName: yup.string().trim(),
  contactNumber: yup
    .string()
    .matches(phoneRegex, "Phone number must be between 10 and 11 digits")
    .required("Contact number is required"),
  altContactNumber: yup
    .string()
    .matches(phoneRegex, { message: "Phone number must be between 10 and 11 digits", excludeEmptyString: true }),
  email: yup.string().trim().email("Invalid email"), // optional, but must be valid if filled
  profession: yup.string().trim(),
  birthDate: yup
    .string()
    .test("birth", "Invalid birthday", (v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= new Date().toISOString().slice(0, 10) && v >= "1900-01-01")),
  sourceId: yup.string(),
  groupId: yup.string(),
  sourceRequiresReferral: yup.boolean(),
  referredByCode: yup
    .string()
    .trim()
    .nullable(),
  ownReferralCode: yup.string(),
  loyaltyPoints: yup.mixed(),
  vehicles: yup.array().of(vehicleSchema).min(1, "Add at least one vehicle"),

  // Stage 2
  category: yup.string(),
  categoryApprovalStatus: yup.string(), // set when an existing customer is picked (PENDING / APPROVED)
  hrRemarks: yup.string().trim(),
  extraBenefits: yup.array().of(yup.object({ text: yup.string().trim() })),

  // Stage 3 (checked manually when the job is started, so "Save" in Stage 2 is not blocked)
  consultantId: yup.string(),
  consultantName: yup.string(),
});

// Each stage has "parts" (sub-steps). Next/Back buttons walk through the parts first,
// then move to the next stage. The progress bar fills based on the parts.
// part.required = fields that must be filled before moving on (checked in addition to the schema)
const BASE_STAGES = [
  {
    label: "Stage 1 · Add Customer",
    short: "Customer",
    icon: "mdi:account-plus-outline",
    parts: [
      {
        fields: ["customerName", "nic", "companyName", "contactNumber", "altContactNumber", "email", "profession", "birthDate", "sourceId", "referredByCode"],
      },
      { fields: ["vehicles"] },
    ],
    Component: StageOneForm,
  },
  {
    label: "Stage 2 · Customer Category",
    short: "Category",
    icon: "mdi:shield-star-outline",
    parts: [{ fields: ["category", "hrRemarks", "extraBenefits"] }],
    Component: StageTwoCategory,
    submitStage: true, // shows "Save" and "Save & Add Consultant" buttons
  },
  {
    label: "Stage 3 · Consultant",
    short: "Consultant",
    icon: "mdi:account-tie-outline",
    parts: [{ fields: ["consultantId"], required: [{ field: "consultantId", message: "Please select a consultant" }] }],
    Component: StageThreeConsultant,
  },
];

const defaultValues = {
  customerId: "",
  birthDate: "",
  sourceId: "",
  groupId: "",
  sourceRequiresReferral: false,
  referredByCode: "",
  ownReferralCode: "",
  loyaltyPoints: "",
  vehicles: [{ ...emptyVehicle }],
  category: "",
  categoryApprovalStatus: "",
  consultantId: "",
  consultantName: "",
  hrRemarks: "",
  extraBenefits: [],
};

// onDone(result): called after the customer / job has been saved (the page closes the form).
// result.job is set when a job was started, so the page can add it to the Jobs table.
export default function CustomerWizard({ onDone }) {
  const [step, setStep] = useState(0);
  const [part, setPart] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Vehicles of the customer picked from the search box (offered in the Vehicle step)
  const [savedVehicles, setSavedVehicles] = useState([]);
  // true after "Save & Add Consultant": the customer is already saved, so earlier stages are locked
  const [customerSaved, setCustomerSaved] = useState(false);
  // Customer returned by the API after saving: { id, customerId, categoryApprovalStatus, vehicles }
  const [savedCustomer, setSavedCustomer] = useState(null);

  const [addCustomer] = useAddCustomerMutation();
  const [createJob] = useCreateJobMutation();

  const methods = useForm({
    resolver: yupResolver(schema),
    mode: "onTouched",
    defaultValues,
  });

  const stages = BASE_STAGES;

  const stage = stages[step];
  const { Component } = stage;
  const currentPart = stage.parts[part];
  const isLastPart = part === stage.parts.length - 1;
  const isSubmitStep = stage.submitStage && isLastPart;
  const isFinalStep = step === stages.length - 1 && isLastPart && !stage.submitStage;
  const busy = leaving || submitting;
  const backLocked = customerSaved && step === 2 && part === 0;

  // Switch to another part within the same stage (with exit animation)
  const changePart = (delta) => {
    setLeaving(true);
    setTimeout(() => {
      setPart((p) => p + delta);
      setLeaving(false);
    }, ANIM_MS);
  };

  const checkRequired = (list = []) => {
    let ok = true;
    list.forEach(({ field, message }) => {
      const v = methods.getValues(field);
      if (!v || String(v).trim() === "") {
        methods.setError(field, { type: "required", message });
        ok = false;
      }
    });
    return ok;
  };

  const next = async () => {
    const valid = await methods.trigger(currentPart.fields);
    if (!valid || !checkRequired(currentPart.required)) return;

    if (!isLastPart) {
      changePart(1);
    } else {
      setStep((s) => s + 1);
      setPart(0);
    }
  };

  const back = () => {
    if (part > 0) {
      changePart(-1);
    } else if (step > 0) {
      setStep(step - 1);
      setPart(stages[step - 1].parts.length - 1);
    }
  };

  const resetAll = (result) => {
    methods.reset(defaultValues);
    setSavedVehicles([]);
    setCustomerSaved(false);
    setSavedCustomer(null);
    setStep(0);
    setPart(0);
    onDone?.(result);
  };

  // Stage 2: "Save" (save only) or "Save & Add Consultant" (save, then go to Stage 3)
  const saveCustomer = async (data, startJob) => {
    setSubmitting(true);
    try {
      // Saves the customer + vehicles (new customer, or update of one picked from the search box)
      const result = await addCustomer(data).unwrap();
      setSavedCustomer(result.customer);
      methods.setValue("ownReferralCode", result.customer.referralCode || "");
      methods.setValue("loyaltyPoints", result.customer.loyaltyPoints ?? 0);
      const codeHtml = result.customer.referralCode
        ? `<div class="mt-2">Referral code of this customer</div><div style="font-size:1.6rem;font-weight:800;letter-spacing:.1em;color:#111111">${result.customer.referralCode}</div>`
        : "";

      if (startJob) {
        // Keep the ERP id in the form so the saved customer stays linked
        methods.setValue("customerId", result.customer.customerId);

        await Swal.fire({
          title: "Customer saved!",
          html: `Now select the consultant to start the job.${codeHtml}`,
          icon: "success",
          confirmButtonText: "OK",
        });
        setCustomerSaved(true);
        setStep(2);
        setPart(0);
      } else {
        await Swal.fire({
          title: "Success!",
          html: `${result.message || "Customer saved successfully!"}${codeHtml}`,
          icon: "success",
          confirmButtonText: "OK",
        });
        resetAll();
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: err?.data?.message || "Failed to save customer.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Last step: "Start Job"
  const startJob = async () => {
    if (!checkRequired(currentPart.required)) return;

    setSubmitting(true);
    try {
      const data = methods.getValues();
      if (!savedCustomer) throw new Error("Customer is not saved yet");

      // One job per vehicle. The vehicle details are copied into the job on the server,
      // stages 1-3 are marked COMPLETED and the job moves on to stage 4.
      const result = await createJob({
        customerId: savedCustomer.id,
        consultantId: Number(data.consultantId),
        vehicleIds: savedCustomer.vehicles.map((v) => v.id),
      }).unwrap();

      await Swal.fire({
        title: "Job started!",
        text: `${result.jobs.map((j) => j.jobNo).join(", ")} assigned to ${data.consultantName}.`,
        icon: "success",
        confirmButtonText: "OK",
      });

      // The Jobs table refreshes itself (CreateJob invalidates the "Jobs" tag)
      resetAll();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: err?.data?.message || "Failed to start the job.",
        icon: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // How much of the connector line should be filled (0 - 100%)
  const fillPercent = (i) => {
    if (i < step) return 100;
    if (i > step) return 0;
    return (part / stages[i].parts.length) * 100;
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="d-flex align-items-center gap-2 text-white py-2 px-3 px-md-4" style={{ borderRadius: "0.375rem 0.375rem 0 0", background: "linear-gradient(135deg,#000000 0%,#1c1c1c 55%,#3d3d3d 100%)" }}>
        <Icon icon="mdi:account-plus-outline" width="24" height="24" />
        <span className="fw-bold fs-6">Customer Registration</span>
      </Card.Header>
      <Card.Body className="p-3">
      {/* Stepper + progress bar */}
      <style>{`
        .cw-step { transition: all .3s ease; }
        .cw-actions { position: sticky; bottom: 0; z-index: 5; background: #fff; }
        .cw-actions .btn { border-radius: 999px; padding: 0 28px; min-height: 48px; font-weight: 700; font-size: 1rem; display: inline-flex; align-items: center; gap: 6px; border: 0; transition: transform .12s, filter .15s, box-shadow .15s; }
        .cw-actions .btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.12); }
        .cw-actions .btn:disabled { opacity: .55; }
        .cw-actions .cw-main, .cw-actions .cw-save, .cw-actions .cw-back { color: #fff; background: linear-gradient(135deg,#000000 0%,#1c1c1c 50%,#3d3d3d 100%); box-shadow: 0 8px 18px -8px rgba(0,0,0,.65), inset 0 -3px 0 #8a8a92; }
        @media (max-width: 575.98px) {
          .cw-actions .btn { padding: 10px 18px; }
          .cw-step-label { display: none; }
        }
      `}</style>
      <div className="rounded-4 px-3 py-2 mb-2" style={{ background: "#f8fafc", border: "1px solid #e5eaf1" }}>
        <div className="d-flex align-items-center overflow-x-auto">
          {stages.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.label} className="d-flex align-items-center flex-fill" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <div
                    className="cw-step rounded-circle d-flex align-items-center justify-content-center fw-bold"
                    style={{
                      width: 34, height: 34,
                      color: done || active ? "#fff" : "#94a3b8",
                      background: done ? "#111111" : active ? "linear-gradient(135deg,#3d3d3d,#000000)" : "#fff",
                      border: done || active ? "none" : "2px solid #e2e8f0",
                      boxShadow: active ? "0 6px 16px -4px rgba(17,17,17,.45)" : "none",
                    }}
                  >
                    {done ? <Icon icon="material-symbols:check-rounded" width="20" height="20" /> : <Icon icon={s.icon} width="20" height="20" />}
                  </div>
                  <div className="cw-step-label lh-sm">
                    <div className="text-uppercase" style={{ fontSize: ".62rem", letterSpacing: ".12em", color: "#94a3b8" }}>Stage {i + 1}</div>
                    <div className={active ? "fw-bold" : "fw-semibold"} style={{ fontSize: ".9rem", color: active ? "#111111" : done ? "#111111" : "#64748b" }}>{s.short}</div>
                  </div>
                </div>

                {i < stages.length - 1 && (
                  <div className="flex-fill rounded-pill overflow-hidden mx-3" style={{ height: 5, minWidth: 24, background: "#e2e8f0" }}>
                    <div className="h-100 rounded-pill" style={{ width: `${fillPercent(i)}%`, background: "linear-gradient(90deg,#6b6b72,#111111)", transition: "width 0.4s ease" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FormProvider {...methods}>
        <Form onSubmit={(e) => e.preventDefault()}>
          <Component
            part={part}
            leaving={leaving}
            savedVehicles={savedVehicles}
            onSavedVehicles={setSavedVehicles}
          />

          <div className="cw-actions d-flex flex-wrap justify-content-between gap-2 mt-2 py-2 border-top">
            <Button
              variant="light"
              className="cw-back"
              onClick={back}
              disabled={(step === 0 && part === 0) || backLocked || busy}
            >
              <Icon icon="material-symbols:arrow-back-rounded" width="20" height="20" /> Back
            </Button>

            {isSubmitStep ? (
              <div className="d-flex flex-wrap gap-2 justify-content-end">
                <Button
                  variant="success"
                  className="cw-save"
                  onClick={methods.handleSubmit((d) => saveCustomer(d, false))}
                  disabled={busy}
                >
                  <Icon icon="material-symbols:check-circle-rounded" width="20" height="20" />{" "}
                  {submitting ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="primary"
                  className="cw-main"
                  onClick={methods.handleSubmit((d) => saveCustomer(d, true))}
                  disabled={busy}
                >
                  <Icon icon="mdi:account-tie-outline" width="20" height="20" /> Save &amp; Add Consultant
                </Button>
              </div>
            ) : isFinalStep ? (
              <Button variant="success" className="cw-save" onClick={startJob} disabled={busy}>
                <Icon icon="mdi:play-circle-outline" width="20" height="20" />{" "}
                {submitting ? "Starting..." : "Start Job"}
              </Button>
            ) : (
              <Button variant="primary" className="cw-main" onClick={next} disabled={busy}>
                Next <Icon icon="material-symbols:arrow-forward-rounded" width="22" height="22" />
              </Button>
            )}
          </div>
        </Form>
      </FormProvider>
      </Card.Body>
    </Card>
  );
}