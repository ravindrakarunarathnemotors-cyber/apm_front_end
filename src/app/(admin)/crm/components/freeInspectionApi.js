import { apiSlice } from "@/store/features/apiSlice";

// "Free Inspection Schedule" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/free_inspection.routes"));
const freeInspectionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFreeInspection: builder.query({
      query: (jobId) => `/free_inspection/jobs/${jobId}/free-inspection`,
      providesTags: ["Evidence"],
    }),
    completeFreeInspection: builder.mutation({    // { jobId, explained, willing, schedDate, schedTime, schedDepartmentId, signerName, signatureImage }
      query: ({ jobId, ...body }) => ({ url: `/free_inspection/jobs/${jobId}/free-inspection/complete`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetFreeInspectionQuery, useCompleteFreeInspectionMutation } = freeInspectionApi;