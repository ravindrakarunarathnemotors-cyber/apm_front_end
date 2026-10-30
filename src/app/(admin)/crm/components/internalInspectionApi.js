import { apiSlice } from "@/store/features/apiSlice";

// "Internal Inspection - 1" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/internal_inspection.routes"));
const internalInspectionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInternalInspection: builder.query({
      query: (jobId) => `/internal_inspection/jobs/${jobId}/internal-inspection`,
      providesTags: ["Evidence"],
    }),
    saveInternalInspection: builder.mutation({    // { jobId, checkedItemIds, extras: [{ section, label, checked }], notes }
      query: ({ jobId, ...body }) => ({ url: `/internal_inspection/jobs/${jobId}/internal-inspection`, method: "PUT", body }),
    }),
    sendInternalReminder: builder.mutation({      // { jobId, kind: "LOGISTICS" | "CUSTOMER" }
      query: ({ jobId, ...body }) => ({ url: `/internal_inspection/jobs/${jobId}/internal-inspection/reminder`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    completeInternalInspection: builder.mutation({ // jobId
      query: (jobId) => ({ url: `/internal_inspection/jobs/${jobId}/internal-inspection/complete`, method: "POST" }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const {
  useGetInternalInspectionQuery,
  useSaveInternalInspectionMutation,
  useSendInternalReminderMutation,
  useCompleteInternalInspectionMutation,
} = internalInspectionApi;