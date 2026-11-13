import { apiSlice } from "@/store/features/apiSlice";

// Wash "Internal Inspection 2". Backend: app.use("/evidence", require("./routes/internal_check.routes"));
const internalCheckApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // dashboard: does this department use it, and at which stage? (by department NAME)
    getInternalCheckDepartment: builder.query({
      query: (name) => `/internal_check/internal-check-department/${encodeURIComponent(name)}`,
    }),
    getInternalCheck: builder.query({
      query: (jobId) => `/internal_check/jobs/${jobId}/internal-check`,
      providesTags: ["Evidence"],
    }),
    // { jobId, checkedItemIds: [], restrictions, allGood, signedByName, signatureImage?, complete }
    saveInternalCheck: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/internal_check/jobs/${jobId}/internal-check`, method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    // checklist editing (permission "internalcheck.manage")
    getInternalCheckItems: builder.query({
      query: (departmentId) => `/internal_check/departments/${departmentId}/internal-check-items`,
      providesTags: ["Evidence"],
    }),
    addInternalCheckItem: builder.mutation({ // { departmentId, name, groupName }
      query: ({ departmentId, ...body }) => ({ url: `/internal_check/departments/${departmentId}/internal-check-items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateInternalCheckItem: builder.mutation({ // { id, name?, groupName?, isActive? }
      query: ({ id, ...body }) => ({ url: `/internal_check/internal-check-items/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const {
  useGetInternalCheckDepartmentQuery,
  useGetInternalCheckQuery,
  useSaveInternalCheckMutation,
  useGetInternalCheckItemsQuery,
  useAddInternalCheckItemMutation,
  useUpdateInternalCheckItemMutation,
} = internalCheckApi;