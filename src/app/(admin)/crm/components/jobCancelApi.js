import { apiSlice } from "@/store/features/apiSlice";

// Cancel a job (Job Activation stage).  Backend: POST /invoice/jobs/:id/cancel  { reason, inspectionFee? }
const jobCancelApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    cancelJob: builder.mutation({
      query: ({ jobId, reason, inspectionFee }) => ({ url: `/invoice/jobs/${jobId}/cancel`, method: "POST", body: { reason, inspectionFee } }),
      invalidatesTags: ["Evidence"],
    }),
  }),
  overrideExisting: false,
});

export const { useCancelJobMutation } = jobCancelApi;