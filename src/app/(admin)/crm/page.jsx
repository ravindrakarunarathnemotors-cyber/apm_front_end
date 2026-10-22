"use client";

import { useState } from "react";
import { Button, Collapse } from "react-bootstrap";
import { Icon } from "@iconify/react";
import CustomerWizard from "./components/CustomerWizard";
import JobsTable from "./components/JobsTable";
import JobDetailsModal from "./components/JobDetailsModal";
import { useGetJobsQuery } from "@/store/features/apiSlice";

const CrmPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [viewJobId, setViewJobId] = useState(null); // job opened in the View modal

  // Jobs come from the database. Starting a job refreshes this list automatically.
  const { data: jobs = [], isLoading } = useGetJobsQuery();

  return (
    <>
      {/* Full-width grey header row: title on the left, button on the right */}
      <div
        className="d-flex justify-content-between align-items-center gap-2 mb-3 px-3 py-2 rounded border"
        style={{ backgroundColor: "#e5e7eb" }}
      >
        <h4 className="mb-0 text-dark">CRM</h4>

        <Button
          variant={showForm ? "outline-dark" : "primary"}
          className="d-inline-flex align-items-center gap-1 text-nowrap fw-semibold"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          {showForm ? (
            <>
              <Icon icon="mdi:close" width="20" height="20" /> Close
            </>
          ) : (
            <>
              <Icon icon="mdi:account-plus-outline" width="20" height="20" />
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
      <JobsTable jobs={jobs} loading={isLoading} onView={(job) => setViewJobId(job.id)} />

      {/* View: full details + timeline of a job */}
      <JobDetailsModal jobId={viewJobId} onHide={() => setViewJobId(null)} />
    </>
  );
};

export default CrmPage;