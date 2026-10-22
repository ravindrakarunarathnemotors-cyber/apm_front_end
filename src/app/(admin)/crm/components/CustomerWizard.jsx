"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button, Form } from "react-bootstrap";
import ComponentContainerCard from "@/components/ComponentContainerCard";
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
  vehicles: yup.array().of(vehicleSchema).min(1, "Add at least one vehicle"),

  // Stage 2
  category: yup.string(),
  categoryApprovalStatus: yup.string(), // set when an existing customer is picked (PENDING / APPROVED)
  hrRemarks: yup.string().trim(),
  extraBenefits: yup.array().of(yup.object({ text: yup.string().trim() })),

  // Stage 3 (checked manually when the job is started, so "Submit" in Stage 2 is not blocked)
  consultantId: yup.string(),
  consultantName: yup.string(),
});

// Each stage has "parts" (sub-steps). Next/Back buttons walk through the parts first,
// then move to the next stage. The progress bar fills based on the parts.
// part.required = fields that must be filled before moving on (checked in addition to the schema)
const BASE_STAGES = [
  {
    label: "Stage 1 · Add Customer",
    parts: [
      {
        fields: ["customerName", "nic", "companyName", "contactNumber", "altContactNumber", "email", "profession"],
      },
      { fields: ["vehicles"] },
    ],
    Component: StageOneForm,
  },
  {
    label: "Stage 2 · Customer Category",
    parts: [{ fields: ["category", "hrRemarks", "extraBenefits"] }],
    Component: StageTwoCategory,
    submitStage: true, // shows "Submit" and "Submit & Start Job" buttons
  },
  {
    label: "Stage 3 · Consultant",
    parts: [{ fields: ["consultantId"], required: [{ field: "consultantId", message: "Please select a consultant" }] }],
    Component: StageThreeConsultant,
  },
];

const defaultValues = {
  customerId: "",
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
  // true after "Submit & Start Job": the customer is already saved, so earlier stages are locked
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

  // Stage 2: "Submit" (save only) or "Submit & Start Job" (save, then go to Stage 3)
  const saveCustomer = async (data, startJob) => {
    setSubmitting(true);
    try {
      // Saves the customer + vehicles (new customer, or update of one picked from the search box)
      const result = await addCustomer(data).unwrap();
      setSavedCustomer(result.customer);

      if (startJob) {
        // Keep the ERP id in the form so the saved customer stays linked
        methods.setValue("customerId", result.customer.customerId);

        await Swal.fire({
          title: "Customer saved!",
          text: "Now select the consultant to start the job.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setCustomerSaved(true);
        setStep(2);
        setPart(0);
      } else {
        await Swal.fire({
          title: "Success!",
          text: result.message || "Customer saved successfully!",
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
    <ComponentContainerCard title="Customer Registration">
      {/* Stepper + progress bar */}
      <div className="d-flex align-items-center mb-4 overflow-x-auto pb-1">
        {stages.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="d-flex align-items-center flex-fill">
              <div className="d-flex flex-column align-items-center" style={{ minWidth: 90 }}>
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${
                    done || active ? "bg-primary text-white" : "bg-light text-muted border"
                  }`}
                  style={{ width: 36, height: 36, transition: "all 0.3s ease" }}
                >
                  {done ? <Icon icon="material-symbols:check-rounded" width="20" height="20" /> : i + 1}
                </div>
                <small
                  className={`mt-1 text-center ${active ? "fw-bold text-primary" : "text-muted"}`}
                  style={{ fontSize: "0.72rem" }}
                >
                  {s.label}
                </small>
              </div>

              {i < stages.length - 1 && (
                <div className="flex-fill bg-secondary-subtle rounded overflow-hidden" style={{ height: 4 }}>
                  <div
                    className="bg-primary h-100"
                    style={{ width: `${fillPercent(i)}%`, transition: "width 0.4s ease" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FormProvider {...methods}>
        <Form onSubmit={(e) => e.preventDefault()}>
          <Component
            part={part}
            leaving={leaving}
            savedVehicles={savedVehicles}
            onSavedVehicles={setSavedVehicles}
          />

          <div className="d-flex flex-wrap justify-content-between gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={back}
              disabled={(step === 0 && part === 0) || backLocked || busy}
            >
              <Icon icon="material-symbols:arrow-back-rounded" width="20" height="20" /> Back
            </Button>

            {isSubmitStep ? (
              <div className="d-flex flex-wrap gap-2 justify-content-end">
                <Button
                  variant="success"
                  onClick={methods.handleSubmit((d) => saveCustomer(d, false))}
                  disabled={busy}
                >
                  <Icon icon="material-symbols:check-circle-rounded" width="20" height="20" />{" "}
                  {submitting ? "Saving..." : "Submit"}
                </Button>
                <Button
                  variant="primary"
                  onClick={methods.handleSubmit((d) => saveCustomer(d, true))}
                  disabled={busy}
                >
                  <Icon icon="mdi:play-circle-outline" width="20" height="20" /> Submit &amp; Start Job
                </Button>
              </div>
            ) : isFinalStep ? (
              <Button variant="success" onClick={startJob} disabled={busy}>
                <Icon icon="mdi:play-circle-outline" width="20" height="20" />{" "}
                {submitting ? "Starting..." : "Start Job"}
              </Button>
            ) : (
              <Button variant="primary" onClick={next} disabled={busy}>
                Next <Icon icon="material-symbols:arrow-forward-rounded" width="20" height="20" />
              </Button>
            )}
          </div>
        </Form>
      </FormProvider>
    </ComponentContainerCard>
  );
}