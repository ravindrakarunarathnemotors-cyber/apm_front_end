import { apiSlice } from "@/store/features/apiSlice";

// "Team Self-Inspection" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/team_inspection.routes"));
const teamInspectionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeamInspection: builder.query({
      query: (jobId) => `/team_inspection/jobs/${jobId}/team-inspection`,
      providesTags: ["Evidence"],
    }),
    saveTeamInspection: builder.mutation({        // { jobId, checks, trialNeeded, trialPerson, jobCardNote }  (draft)
      query: ({ jobId, ...body }) => ({ url: `/team_inspection/jobs/${jobId}/team-inspection`, method: "PUT", body }),
    }),
    completeTeamInspection: builder.mutation({    // same body: saves it and moves the job to the next stage
      query: ({ jobId, ...body }) => ({ url: `/team_inspection/jobs/${jobId}/team-inspection/complete`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetTeamInspectionQuery, useSaveTeamInspectionMutation, useCompleteTeamInspectionMutation } = teamInspectionApi;