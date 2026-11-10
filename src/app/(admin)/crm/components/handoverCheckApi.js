import { apiSlice } from "@/store/features/apiSlice";

// "Handover readiness" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/handover_check.routes"));
const handoverCheckApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHandoverCheck: builder.query({
      query: (jobId) => `/handover_check/jobs/${jobId}/handover-check`,
      providesTags: ["Evidence"],
    }),
    saveHandoverCheck: builder.mutation({         // { jobId, checks, answer, note }
      query: ({ jobId, ...body }) => ({ url: `/handover_check/jobs/${jobId}/handover-check`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    completeHandoverCheck: builder.mutation({     // { jobId, checks, answer: "YES" }
      query: ({ jobId, ...body }) => ({ url: `/handover_check/jobs/${jobId}/handover-check/complete`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetHandoverCheckQuery, useSaveHandoverCheckMutation, useCompleteHandoverCheckMutation } = handoverCheckApi;