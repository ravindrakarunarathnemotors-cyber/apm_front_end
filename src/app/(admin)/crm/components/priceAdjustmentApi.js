import { apiSlice } from "@/store/features/apiSlice";

// Price adjustment of the SPARE PARTS of a job (separate from the repair adjustment).
// Backend: PUT /evidence/jobs/:id/inspection/markup   { target: "spare", percent: 5 }  (percent null = same as the repair adjustment)
const priceAdjustmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    setJobSpareMarkup: builder.mutation({
      query: ({ jobId, percent }) => ({ url: `/inspection/jobs/${jobId}/inspection/markup`, method: "PUT", body: { target: "spare", percent } }),
    }),
  }),
  overrideExisting: false,
});

export const { useSetJobSpareMarkupMutation } = priceAdjustmentApi;