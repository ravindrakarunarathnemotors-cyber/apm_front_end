import { apiSlice } from "@/store/features/apiSlice";

// "Delivery Review" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/delivery_review.routes"));
const deliveryReviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeliveryReview: builder.query({
      query: (jobId) => `/delivery_review/jobs/${jobId}/delivery-review`,
      providesTags: ["Evidence"],
    }),
    saveDeliveryReview: builder.mutation({         // { jobId, checks, answer, note }
      query: ({ jobId, ...body }) => ({ url: `/delivery_review/jobs/${jobId}/delivery-review`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    completeDeliveryReview: builder.mutation({     // { jobId, checks, answer: "YES" }
      query: ({ jobId, ...body }) => ({ url: `/delivery_review/jobs/${jobId}/delivery-review/complete`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetDeliveryReviewQuery, useSaveDeliveryReviewMutation, useCompleteDeliveryReviewMutation } = deliveryReviewApi;