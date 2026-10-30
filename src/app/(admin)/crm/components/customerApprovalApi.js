import { apiSlice } from "@/store/features/apiSlice";

// "Customer Approval" stage endpoints, added here so apiSlice.js needs no change.
// Backend: app.use("/evidence", require("./routes/customer_approval.routes"));   (same prefix as the spare parts routes)
const customerApprovalApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerApproval: builder.query({
      query: (jobId) => `/customer_approval/jobs/${jobId}/customer-approval`,
      providesTags: ["Evidence"],
    }),
    saveCustomerApproval: builder.mutation({      // { jobId, estHours, estDays, includeSpareParts, includeLabour, manualItems, washOptionIds, sentVia, decision, agreedScope, extraNote, partsBy, clientPartsFiles, thirdPartyRequest, thirdPartyNote }
      query: ({ jobId, ...body }) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval`, method: "PUT", body }),
    }),
    markClientListSent: builder.mutation({        // jobId
      query: (jobId) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval/client-list-sent`, method: "POST" }),
      invalidatesTags: ["Evidence"],
    }),
    sendApprovalLogistics: builder.mutation({     // { jobId, kind: "REPAIR" | "THIRD_PARTY", note? }
      query: ({ jobId, ...body }) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval/logistics`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    completeCustomerApproval: builder.mutation({  // jobId
      query: (jobId) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval/complete`, method: "POST" }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const {
  useGetCustomerApprovalQuery,
  useSaveCustomerApprovalMutation,
  useMarkClientListSentMutation,
  useSendApprovalLogisticsMutation,
  useCompleteCustomerApprovalMutation,
} = customerApprovalApi;