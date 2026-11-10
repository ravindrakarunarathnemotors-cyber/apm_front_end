import { apiSlice } from "@/store/features/apiSlice";

// Invoice + payments (added here so apiSlice.js needs no change).
// Backend: app.use("/invoice", require("./routes/invoice.routes"));
const P = "/invoice";
const invoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvoice: builder.query({
      query: (jobId) => `${P}/jobs/${jobId}`,
      providesTags: ["Evidence"],
    }),
    updateInvoice: builder.mutation({            // { jobId, discountAmount?, taxEnabled?, taxPercent?, notes? }
      query: ({ jobId, ...body }) => ({ url: `${P}/jobs/${jobId}`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    addInvoiceLine: builder.mutation({           // { jobId, description, qty, unitPrice }
      query: ({ jobId, ...body }) => ({ url: `${P}/jobs/${jobId}/lines`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    deleteInvoiceLine: builder.mutation({        // { jobId, lineId }
      query: ({ jobId, lineId }) => ({ url: `${P}/jobs/${jobId}/lines/${lineId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
    addInvoicePayment: builder.mutation({        // { jobId, amount, method, reference?, note?, paidAt? }
      query: ({ jobId, ...body }) => ({ url: `${P}/jobs/${jobId}/payments`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    voidInvoicePayment: builder.mutation({       // { jobId, paymentId }
      query: ({ jobId, paymentId }) => ({ url: `${P}/jobs/${jobId}/payments/${paymentId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const {
  useGetInvoiceQuery, useUpdateInvoiceMutation, useAddInvoiceLineMutation, useDeleteInvoiceLineMutation,
  useAddInvoicePaymentMutation, useVoidInvoicePaymentMutation,
} = invoiceApi;