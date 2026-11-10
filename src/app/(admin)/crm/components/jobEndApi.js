import { apiSlice } from "@/store/features/apiSlice";

// "Job Completed / Copy job card to Account Department" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/job_end.routes"));
const jobEndApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobEnd: builder.query({
      query: (jobId) => `/job_end/jobs/${jobId}/job-end`,
      providesTags: ["Evidence"],
    }),
    endJob: builder.mutation({                    // step 1: Job Completed
      query: (jobId) => ({ url: `/job_end/jobs/${jobId}/job-end/end`, method: "POST" }),
      invalidatesTags: ["Evidence"],
    }),
    confirmJobCardCopy: builder.mutation({        // step 2: Confirmed (job card copied to the Account Department)
      query: (jobId) => ({ url: `/job_end/jobs/${jobId}/job-end/confirm`, method: "POST" }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetJobEndQuery, useEndJobMutation, useConfirmJobCardCopyMutation } = jobEndApi;