import { apiSlice } from "@/store/features/apiSlice";

// "Transfer to other departments" stage endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/evidence", require("./routes/dept_transfer.routes"));
const deptTransferApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeptTransfer: builder.query({
      query: (jobId) => `/dept_transfer/jobs/${jobId}/dept-transfer`,
      providesTags: ["Evidence"],
    }),
    saveDeptTransfer: builder.mutation({          // { jobId, transfer, departmentId? } -> creates the linked job (when Yes) and completes the stage
      query: ({ jobId, ...body }) => ({ url: `/dept_transfer/jobs/${jobId}/dept-transfer`, method: "POST", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const { useGetDeptTransferQuery, useSaveDeptTransferMutation } = deptTransferApi;