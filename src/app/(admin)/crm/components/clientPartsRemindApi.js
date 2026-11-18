import { apiSlice } from "@/store/features/apiSlice";

// Reminders for "the customer brings the spare parts" / "prepare the spare parts".
// Customer Approval stage : POST /evidence/jobs/:id/customer-approval/remind-inventory | remind-customer-parts
// Internal Inspection - 1 : POST /evidence/jobs/:id/internal-inspection/notify-inventory | notify-customer   { phone? }
const clientPartsRemindApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    remindInventoryClientParts: builder.mutation({
      query: ({ jobId }) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval/remind-inventory`, method: "POST", body: {} }),
    }),
    remindCustomerClientParts: builder.mutation({
      query: ({ jobId, phone }) => ({ url: `/customer_approval/jobs/${jobId}/customer-approval/remind-customer-parts`, method: "POST", body: { phone } }),
    }),
    notifyInventoryFromInspection: builder.mutation({
      query: ({ jobId }) => ({ url: `/customer_approval/jobs/${jobId}/internal-inspection/notify-inventory`, method: "POST", body: {} }),
    }),
    notifyCustomerFromInspection: builder.mutation({
      query: ({ jobId, phone }) => ({ url: `/customer_approval/jobs/${jobId}/internal-inspection/notify-customer`, method: "POST", body: { phone } }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useRemindInventoryClientPartsMutation, useRemindCustomerClientPartsMutation,
  useNotifyInventoryFromInspectionMutation, useNotifyCustomerFromInspectionMutation,
} = clientPartsRemindApi;