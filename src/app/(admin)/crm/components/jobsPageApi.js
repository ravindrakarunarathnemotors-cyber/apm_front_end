import { apiSlice } from "@/store/features/apiSlice";

// Server-side jobs endpoints, added here so apiSlice.js needs no change.
//  getJobsPage    -> { rows, total, page, pageSize, filters: { consultants, departments, stages } }
//                    args: { page, pageSize, search, consultant, department, stage, status }
//  getJobsSummary -> { total, active, done, today, noDept, departments: [{ name, active, done, avgProgress, stages: [{ stageNo, stageName, n }] }] }
const jobsPageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobsPage: builder.query({
      query: (a = {}) => {
        const q = new URLSearchParams();
        Object.entries(a).forEach(([k, v]) => { if (v !== "" && v != null) q.set(k, v); });
        return `/api/jobs/page?${q.toString()}`;
      },
      providesTags: ["Jobs"],
    }),
    getJobsSummary: builder.query({
      query: () => `/api/jobs/summary`,
      providesTags: ["Jobs"],
    }),
  }),
});

export const { useGetJobsPageQuery, useGetJobsSummaryQuery } = jobsPageApi;