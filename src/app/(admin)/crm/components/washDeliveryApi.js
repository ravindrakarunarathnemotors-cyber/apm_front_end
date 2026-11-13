import { apiSlice } from "@/store/features/apiSlice";

// Wash "Delivery Review" stage (checklist + OTP to release the vehicle). Backend: app.use("/evidence", require("./routes/wash_delivery.routes"));
const washDeliveryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWashDeliveryDepartment: builder.query({
      query: (name) => `/wash_delivery/wash-delivery-department/${encodeURIComponent(name)}`,
    }),
    getWashDelivery: builder.query({
      query: (jobId) => `/wash_delivery/jobs/${jobId}/wash-delivery`,
      providesTags: ["Evidence"],
    }),
    saveWashDelivery: builder.mutation({            // { jobId, checks, answer, note }
      query: ({ jobId, ...body }) => ({ url: `/wash_delivery/jobs/${jobId}/wash-delivery`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    sendWashDeliveryOtp: builder.mutation({         // { jobId, phone? }  (phone = another number than the customer's)
      query: ({ jobId, ...body }) => ({ url: `/wash_delivery/jobs/${jobId}/wash-delivery/otp/send`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    verifyWashDeliveryOtp: builder.mutation({       // { jobId, code }
      query: ({ jobId, ...body }) => ({ url: `/wash_delivery/jobs/${jobId}/wash-delivery/otp/verify`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    overrideWashDeliveryOtp: builder.mutation({     // { jobId, reason }  (permission washdelivery.override)
      query: ({ jobId, ...body }) => ({ url: `/wash_delivery/jobs/${jobId}/wash-delivery/otp/override`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    completeWashDelivery: builder.mutation({        // { jobId, checks, answer: "YES" }
      query: ({ jobId, ...body }) => ({ url: `/wash_delivery/jobs/${jobId}/wash-delivery/complete`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const {
  useGetWashDeliveryDepartmentQuery,
  useGetWashDeliveryQuery,
  useSaveWashDeliveryMutation,
  useSendWashDeliveryOtpMutation,
  useVerifyWashDeliveryOtpMutation,
  useOverrideWashDeliveryOtpMutation,
  useCompleteWashDeliveryMutation,
} = washDeliveryApi;