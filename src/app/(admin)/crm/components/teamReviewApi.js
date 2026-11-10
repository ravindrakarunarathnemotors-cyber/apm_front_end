import { apiSlice } from "@/store/features/apiSlice";

// "Review Team Inspection Sheet" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/team_review.routes"));
const teamReviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeamReview: builder.query({
      query: (jobId) => `/team_review/jobs/${jobId}/team-review`,
      providesTags: ["Evidence"],
    }),
    decideTeamReview: builder.mutation({          // { jobId, approved, note?, signerName?, signatureImage?, extras? }
      query: ({ jobId, ...body }) => ({ url: `/team_review/jobs/${jobId}/team-review`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetTeamReviewQuery, useDecideTeamReviewMutation } = teamReviewApi;