"use client";

import { Icon } from "@iconify/react";

// Shows under the stage progress bar in the Jobs table and the department dashboards:
//  - green  "Started 04 Oct, 11:05"   -> Stage 4 A confirmed ("Initially JOB STARTS", e.g. Wash). Hover = who confirmed it.
//  - amber  "Not started yet"         -> the department needs the start confirmation but nobody confirmed it yet
//  - nothing for departments that do not use the start confirmation
export default function JobStartBadge({ job }) {
  if (job.startedAt) {
    const d = new Date(job.startedAt);
    const when =
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
      ", " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return (
      <span
        className="d-inline-flex align-items-center gap-1 mt-1 px-2 py-1 rounded-pill small fw-semibold text-nowrap bg-success-subtle text-success"
        title={`Job started${job.departmentName ? ` for ${job.departmentName}` : ""}${job.startedByName ? ` · confirmed by ${job.startedByName}` : ""}`}
      >
        <Icon icon="mdi:play-circle" width="14" height="14" /> Started {when}
      </span>
    );
  }

  if (job.requiresStart && job.status === "IN_PROGRESS") {
    return (
      <span
        className="d-inline-flex align-items-center gap-1 mt-1 px-2 py-1 rounded-pill small fw-semibold text-nowrap bg-warning-subtle text-warning-emphasis"
        title={job.complaintSaved ? "The complaint is saved. The job can be started later." : "The initial start has not been confirmed yet"}
      >
        <Icon icon="mdi:timer-sand" width="14" height="14" /> {job.complaintSaved ? "Saved · not started yet" : "Not started yet"}
      </span>
    );
  }

  return null;
}