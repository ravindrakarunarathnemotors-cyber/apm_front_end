import { apiSlice } from "@/store/features/apiSlice";

// Extra data for the full-screen job View window. Loaded only when its tab is opened (keeps the window fast).
//  getJobStageDetails -> { complaint, allocation, evidence, inspection, spare, estimate, internal, activation, damageReport }
//  getJobHistory      -> { sameVehicle: [...], other: [...], lastJob }
const jobDetailsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobStageDetails: builder.query({
      query: (jobId) => `/api/jobs/${jobId}/stage-details`,
      providesTags: ["Jobs"],
    }),
    getJobHistory: builder.query({
      query: (jobId) => `/api/jobs/${jobId}/history`,
    }),
  }),
});

export const { useGetJobStageDetailsQuery, useGetJobHistoryQuery } = jobDetailsApi;