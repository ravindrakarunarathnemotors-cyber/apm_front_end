import { apiSlice } from "@/store/features/apiSlice";

// "Vehicle Job Inspection" checklist (Wash). Backend: app.use("/evidence", require("./routes/job_check.routes"));
const jobCheckApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // dashboard: does this department use it, and at which stage? (by department NAME)
    getJobCheckDepartment: builder.query({
      query: (name) => `/job_check/job-check-department/${encodeURIComponent(name)}`,
    }),
    getJobCheck: builder.query({
      query: (jobId) => `/job_check/jobs/${jobId}/job-check`,
      providesTags: ["Evidence"],
    }),
    // { jobId, checkedItemIds: [], fullyChecked, signedByName }
    saveJobCheck: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/job_check/jobs/${jobId}/job-check`, method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    // checklist editing (permission "jobcheck.manage")
    getJobCheckItems: builder.query({
      query: (departmentId) => `/job_check/departments/${departmentId}/job-check-items`,
      providesTags: ["Evidence"],
    }),
    addJobCheckItem: builder.mutation({ // { departmentId, name, groupName }
      query: ({ departmentId, ...body }) => ({ url: `/job_check/departments/${departmentId}/job-check-items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateJobCheckItem: builder.mutation({ // { id, name?, groupName?, isActive? }
      query: ({ id, ...body }) => ({ url: `/job_check/job-check-items/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const {
  useGetJobCheckDepartmentQuery,
  useGetJobCheckQuery,
  useSaveJobCheckMutation,
  useGetJobCheckItemsQuery,
  useAddJobCheckItemMutation,
  useUpdateJobCheckItemMutation,
} = jobCheckApi;