import { apiSlice } from "@/store/features/apiSlice";

// Spare parts master search with a row limit, so the window loads only a few rows first and more when the user asks / types.
// args: { q, quality, limit }  ->  [{ id, partNo, name, brand, quality, price, stockQty, isActive }]
const sparePartsSearchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    searchSpareLimited: builder.query({
      query: ({ q = "", quality = "", limit = 5 } = {}) => ({ url: "/spare/spare-parts/catalog", params: { q, quality, limit } }),
      providesTags: ["Evidence"],
    }),
  }),
});

export const { useSearchSpareLimitedQuery } = sparePartsSearchApi;