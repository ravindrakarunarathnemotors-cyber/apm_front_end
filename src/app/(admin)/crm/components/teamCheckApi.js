import { apiSlice } from "@/store/features/apiSlice";

// Wash "Team Self-Inspection". Backend: app.use("/evidence", require("./routes/team_check.routes"));
const teamCheckApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // dashboard: does this department use it, and at which stage? (by department NAME)
    getTeamCheckDepartment: builder.query({
      query: (name) => `/team_check/team-check-department/${encodeURIComponent(name)}`,
    }),
    getTeamCheck: builder.query({
      query: (jobId) => `/team_check/jobs/${jobId}/team-check`,
      providesTags: ["Evidence"],
    }),
    // { jobId, checkedItemIds: [], transferred, teamHeadChecked, signedByName, signatureImage?, complete }
    saveTeamCheck: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/team_check/jobs/${jobId}/team-check`, method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    // "Transferred = No": the rewash starts and the inspection is cleared
    startTeamCheckRewash: builder.mutation({
      query: (jobId) => ({ url: `/team_check/jobs/${jobId}/team-check/rewash`, method: "POST" }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    // checklist editing (permission "teamcheck.manage")
    getTeamCheckItems: builder.query({
      query: (departmentId) => `/team_check/departments/${departmentId}/team-check-items`,
      providesTags: ["Evidence"],
    }),
    addTeamCheckItem: builder.mutation({ // { departmentId, name, groupName }
      query: ({ departmentId, ...body }) => ({ url: `/team_check/departments/${departmentId}/team-check-items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    updateTeamCheckItem: builder.mutation({ // { id, name?, groupName?, isActive? }
      query: ({ id, ...body }) => ({ url: `/team_check/team-check-items/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Evidence"],
    }),
  }),
});

export const {
  useGetTeamCheckDepartmentQuery,
  useGetTeamCheckQuery,
  useSaveTeamCheckMutation,
  useStartTeamCheckRewashMutation,
  useGetTeamCheckItemsQuery,
  useAddTeamCheckItemMutation,
  useUpdateTeamCheckItemMutation,
} = teamCheckApi;