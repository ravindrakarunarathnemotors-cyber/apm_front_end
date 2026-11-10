"use client";

import { useState } from "react";
import { Button, Collapse } from "react-bootstrap";
import { Icon } from "@iconify/react";
import CustomerWizard from "./components/CustomerWizard";
import JobsTable from "./components/JobsTable";
import JobDetailsModal from "./components/JobDetailsModal";

const CrmPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [viewJobId, setViewJobId] = useState(null); // job opened in the View modal

  return (
    <>
      {/* Full-width grey header row: title on the left, button on the right */}
      <div
        className="d-flex justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <h4 className="mb-0 text-dark">CRM</h4>

        <Button
          variant={showForm ? "outline-dark" : "light"}
          className={`d-inline-flex align-items-center gap-1 text-nowrap fw-semibold ${showForm ? "" : "border-0 text-white"}`}
          style={showForm ? { minHeight: 52, padding: "0 22px", fontSize: "1.05rem" } : { minHeight: 52, padding: "0 22px", fontSize: "1.05rem", background: "linear-gradient(135deg,#0a0a0a 0%,#7a0a14 55%,#c8102e 100%)", boxShadow: "0 6px 16px -6px rgba(200,16,46,.6)" }}
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? (
            <>
              <Icon icon="mdi:close" width="24" height="24" /> Close
            </>
          ) : (
            <>
              <Icon icon="mdi:account-plus-outline" width="24" height="24" />
              <span className="d-none d-sm-inline">Add Customer / Create Job</span>
              <span className="d-sm-none">Add Customer</span>
            </>
          )}
        </Button>
      </div>

      {/* The form is mounted only while it is open, so it starts fresh every time */}
      <Collapse in={showForm} mountOnEnter unmountOnExit>
        <div>
          <CustomerWizard onDone={() => setShowForm(false)} />
        </div>
      </Collapse>

      {/* Jobs created so far, with their current stage */}
      <JobsTable onView={(job) => setViewJobId(job.id)} />

      {/* View: full details + timeline of a job */}
      <JobDetailsModal jobId={viewJobId} onHide={() => setViewJobId(null)} />
    </>
  );
};

export default CrmPage;