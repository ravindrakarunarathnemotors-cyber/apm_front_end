import { apiSlice } from "@/store/features/apiSlice";

// Wash "Drying Area" stage. Backend: app.use("/evidence", require("./routes/drying_check.routes"));
const dryingCheckApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDryingCheckDepartment: builder.query({
      query: (name) => `/drying_check/drying-check-department/${encodeURIComponent(name)}`,
    }),
    getDryingCheck: builder.query({
      query: (jobId) => `/drying_check/jobs/${jobId}/drying-check`,
      providesTags: ["Evidence"],
    }),
    // { jobId, checkedItemIds, fluids, filters, goInspection, complete }
    saveDryingCheck: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/drying_check/jobs/${jobId}/drying-check`, method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    // stock search for the filters: { kind: "AIR" | "AC", q }
    searchDryingFilterParts: builder.query({
      query: ({ kind, q }) => `/drying_check/drying-filter-parts?kind=${kind}&q=${encodeURIComponent(q || "")}`,
    }),
    // checklist editing (permission "dryingcheck.manage")
    getDryingItems: builder.query({
      query: (departmentId) => `/drying_check/departments/${departmentId}/drying-items`,
      providesTags: ["Evidence"],
    }),
    addDryingItem: builder.mutation({ // { departmentId, name, groupName }
      query: ({ departmentId, ...body }) => ({ url: `/drying_check/departments/${departmentId}/drying-items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateDryingItem: builder.mutation({ // { id, name?, groupName?, isActive? }
      query: ({ id, ...body }) => ({ url: `/drying_check/drying-items/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
    // prices (fluids per litre, filter cleaning)
    getDryingPrices: builder.query({
      query: () => `/drying_check/drying-prices`,
      providesTags: ["Evidence"],
    }),
    addDryingFluid: builder.mutation({ // { name, pricePerLitre }
      query: (body) => ({ url: `/drying_check/drying-fluids`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateDryingFluid: builder.mutation({ // { id, name?, pricePerLitre?, isActive? }
      query: ({ id, ...body }) => ({ url: `/drying_check/drying-fluids/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateDryingFilterType: builder.mutation({ // { kind, cleanPrice }
      query: ({ kind, ...body }) => ({ url: `/drying_check/drying-filter-types/${kind}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const {
  useGetDryingCheckDepartmentQuery,
  useGetDryingCheckQuery,
  useSaveDryingCheckMutation,
  useLazySearchDryingFilterPartsQuery,
  useGetDryingItemsQuery,
  useAddDryingItemMutation,
  useUpdateDryingItemMutation,
  useGetDryingPricesQuery,
  useAddDryingFluidMutation,
  useUpdateDryingFluidMutation,
  useUpdateDryingFilterTypeMutation,
} = dryingCheckApi;