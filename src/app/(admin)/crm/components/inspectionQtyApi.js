import { apiSlice } from "@/store/features/apiSlice";

// Extra endpoints of the Vehicle Job Inspection: change only the quantity of a Repair list line, and the price adjustment (markup %) of the job. Added here so apiSlice.js needs no change.
const inspectionQtyApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    updateRepairQty: builder.mutation({            // { jobId, itemId, qty }
      query: ({ jobId, itemId, qty }) => ({ url: `/inspection/jobs/${jobId}/inspection/repair-items/${itemId}/qty`, method: "PATCH", body: { qty } }),
      invalidatesTags: ["Evidence"],
    }),
    setJobMarkup: builder.mutation({               // { jobId, percent }  (0, 2, 5, 8, 10, 12)
      query: ({ jobId, percent }) => ({ url: `/inspection/jobs/${jobId}/inspection/markup`, method: "PUT", body: { percent } }),
      invalidatesTags: ["Evidence"],
    }),
    setRepairWarranty: builder.mutation({          // { jobId, itemId, claim }  - repair line is a warranty claim (not charged)
      query: ({ jobId, itemId, claim }) => ({ url: `/inspection/jobs/${jobId}/inspection/repair-items/${itemId}/warranty`, method: "PATCH", body: { claim } }),
      invalidatesTags: ["Evidence"],
    }),
    setPartWarranty: builder.mutation({            // { jobId, itemId, claim }  - spare part is a warranty claim (not charged)
      query: ({ jobId, itemId, claim }) => ({ url: `/spare/jobs/${jobId}/spare-parts/items/${itemId}/warranty`, method: "PATCH", body: { claim } }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const { useUpdateRepairQtyMutation, useSetJobMarkupMutation, useSetRepairWarrantyMutation, useSetPartWarrantyMutation } = inspectionQtyApi;