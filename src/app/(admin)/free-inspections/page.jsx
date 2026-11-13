"use client";

import JobsTabs from "../crm/components/JobsTabs";
import FreeInspectionSchedulePanel from "../crm/components/FreeInspectionSchedulePanel";

// "Free Inspections" tab page: the same tab bar as the other job pages + the scheduled free inspections (display only).
const FreeInspectionsPage = () => (
  <>
    <JobsTabs />
    <FreeInspectionSchedulePanel />
  </>
);

export default FreeInspectionsPage;