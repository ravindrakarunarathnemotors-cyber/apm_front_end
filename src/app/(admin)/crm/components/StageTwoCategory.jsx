"use client";

import { useEffect } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Alert, Badge, Button, Col, FormControl, FormLabel, Row, Spinner } from "react-bootstrap";
import { Icon } from "@iconify/react";
import { useGetCustomerCategoriesQuery } from "@/store/features/apiSlice";

// The category name IS the colour (Blue, Silver, Gold, Platinum).
// Plain CSS names like "silver" / "gold" are too pale for text, so we use stronger shades for them.
const NAME_COLORS = {
  blue: "#2563eb",
  silver: "#64748b",
  gold: "#d97706",
  platinum: "#7c3aed",
};

const colorFromName = (name) => {
  const n = String(name).trim().toLowerCase();
  if (NAME_COLORS[n]) return NAME_COLORS[n];
  // Any other category named after a valid CSS colour (e.g. "Red", "Green") uses that colour directly
  if (typeof CSS !== "undefined" && CSS.supports("color", n)) return n;
  return "#2563eb";
};

// Pick an icon for a feature line coming from the DB
const iconFor = (line) => {
  if (/^notify/i.test(line)) return "mdi:bell-outline";
  if (/^category switch/i.test(line)) return "mdi:shield-check-outline";
  if (line.includes(" · ")) return "mdi:cash-multiple"; // spend band line: "Rs. ... · 2% off the bill"
  return "mdi:check-circle-outline";
};

function FeatureLine({ line }) {
  // "+ More options to be added"
  if (line.startsWith("+")) {
    return <div className="text-muted fst-italic">{line}</div>;
  }

  // "Rs. 500,000 – 2,500,000 · 2% off the bill" -> discount part in bold
  const [main, ...rest] = line.split(" · ");
  return (
    <div className="mb-1">
      <Icon icon={iconFor(line)} width="16" height="16" /> {main}
      {rest.length > 0 && (
        <>
          {" · "}
          <strong>{rest.join(" · ")}</strong>
        </>
      )}
    </div>
  );
}

export default function StageTwoCategory() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({ control, name: "extraBenefits" });

  // Categories (id, name, features[]) come from the database
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useGetCustomerCategoriesQuery();

  const selected = watch("category");
  const existingCustomerId = watch("customerId");
  const approvalStatus = watch("categoryApprovalStatus");

  // Default: nothing selected yet -> select the first category (Blue)
  useEffect(() => {
    if (!selected && categories.length > 0) {
      setValue("category", categories[0].name.toUpperCase(), { shouldDirty: false });
    }
  }, [categories, selected, setValue]);

  // Existing customer whose category is already APPROVED -> show only that category, no changes allowed
  const locked = Boolean(existingCustomerId && selected && approvalStatus === "APPROVED");

  const visibleCategories = locked
    ? categories.filter((c) => c.name.toUpperCase() === selected)
    : categories;

  // Any category chosen here is sent to HR D. as Pending Approval (same rule as the backend)
  const needsApproval = !locked && Boolean(selected);
  const isPendingFromDb = Boolean(existingCustomerId && approvalStatus === "PENDING");

  return (
    <>
      <h6 className="fw-bold text-primary mb-2">Customer Category</h6>

      {locked && (
        <Alert variant="success" className="py-2 small">
          <Icon icon="mdi:check-decagram-outline" width="18" height="18" /> This customer&apos;s category has already
          been approved by <strong>HR D.</strong> and cannot be changed.
        </Alert>
      )}

      {isLoading && (
        <div className="text-center text-muted py-4">
          <Spinner animation="border" size="sm" className="me-2" /> Loading categories...
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Failed to load customer categories.</span>
          <Button size="sm" variant="outline-danger" onClick={refetch}>
            Retry
          </Button>
        </Alert>
      )}

      <Row>
        {visibleCategories.map((cat) => {
          const key = cat.name.toUpperCase(); // BLUE, SILVER, GOLD, PLATINUM (value saved in the form)
          const color = colorFromName(cat.name);
          const isSelected = selected === key;

          return (
            <Col md="6" key={cat.id} className="mb-3">
              <label
                className="d-block h-100 rounded p-3"
                style={{
                  cursor: locked ? "default" : "pointer",
                  border: `2px solid ${isSelected ? color : "#e2e8f0"}`,
                  backgroundColor: isSelected ? `color-mix(in srgb, ${color} 8%, white)` : "#fff",
                  transition: "all 0.2s ease",
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-2">
                  {locked ? (
                    <Badge bg="success" className="d-inline-flex align-items-center gap-1">
                      <Icon icon="mdi:check" width="14" height="14" /> Approved
                    </Badge>
                  ) : (
                    <input type="radio" value={key} checked={isSelected} {...register("category")} />
                  )}
                  <strong style={{ color, fontSize: "1.1rem" }}>{cat.name}</strong>
                  {isSelected && isPendingFromDb && (
                    <Badge bg="warning" text="dark" className="ms-auto">
                      Pending HR D. approval
                    </Badge>
                  )}
                </div>

                <div className="small">
                  {cat.features.map((line, i) => (
                    <FeatureLine key={i} line={line} />
                  ))}
                </div>
              </label>
            </Col>
          );
        })}
      </Row>

      {errors.category && <p className="text-danger">{errors.category.message}</p>}

      {needsApproval && (
        <Alert variant="warning">
          The selected category will be sent to <strong>HR D.</strong> as <strong>Pending Approval</strong>.
        </Alert>
      )}

      {!locked && (
        <Row>
          <Col md="12" className="mb-2">
            <FormLabel className="col-form-label text-start">HR D. Remarks</FormLabel>
            <FormControl
              as="textarea"
              rows={2}
              {...register("hrRemarks")}
              placeholder="Reason for category selection / switch (optional)"
            />
          </Col>
        </Row>
      )}

      <h6 className="fw-bold text-primary mt-3 mb-2">Additional Benefits</h6>
      {fields.map((field, index) => (
        <div key={field.id} className="d-flex gap-2 mb-2">
          <FormControl
            type="text"
            {...register(`extraBenefits.${index}.text`)}
            placeholder="Describe the extra benefit"
          />
          <Button variant="outline-danger" onClick={() => remove(index)}>
            <Icon icon="mdi:delete-outline" width="18" height="18" />
          </Button>
        </div>
      ))}
      <Button variant="outline-primary" size="sm" onClick={() => append({ text: "" })}>
        <Icon icon="mdi:plus" width="18" height="18" /> Add Benefit
      </Button>
    </>
  );
}