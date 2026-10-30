import { apiSlice } from "@/store/features/apiSlice";

// "Job Activation" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/job_activation.routes"));
const jobActivationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobActivation: builder.query({
      query: (jobId) => `/job_activation/jobs/${jobId}/job-activation`,
      providesTags: ["Evidence"],
    }),
    activateJob: builder.mutation({               // jobId -> the job officially starts
      query: (jobId) => ({ url: `/job_activation/jobs/${jobId}/job-activation`, method: "POST", body: { aware: true } }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetJobActivationQuery, useActivateJobMutation } = jobActivationApi;