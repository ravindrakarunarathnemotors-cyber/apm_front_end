import { apiSlice } from "@/store/features/apiSlice";

// Earlier jobs of the vehicle, loaded a few at a time (only when "Related to a previous repair?" is Yes).
// Backend: GET /evidence/jobs/:id/inspection/history?offset=0&limit=3  (same prefix as the other inspection routes)
const inspectionHistoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInspectionHistory: builder.query({         // { jobId, offset, limit } -> { items[], total, offset, hasMore }
      query: ({ jobId, offset = 0, limit = 3 }) => `/inspection/jobs/${jobId}/inspection/history?offset=${offset}&limit=${limit}`,
      keepUnusedDataFor: 0,
    }),
  }),
  overrideExisting: false,
});

export const { useLazyGetInspectionHistoryQuery } = inspectionHistoryApi;