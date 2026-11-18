import { apiSlice } from "@/store/features/apiSlice";

// "Extra Job Scope" endpoints, added here so apiSlice.js needs no change.
// Backend: app.use("/extra-scope", require("./routes/extra_scope.routes"));
const P = "/extra-scope";
const extraScopeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExtraScopes: builder.query({               // jobId -> { job, canAdd, scopes[] }
      query: (jobId) => `${P}/jobs/${jobId}/scopes`,
      providesTags: ["Evidence"],
    }),
    getExtraRepairTree: builder.query({           // jobId -> [{ parent, department, isCurrent, children: [{ id, name, price, label }] }]
      query: (jobId) => `${P}/jobs/${jobId}/repair-tree`,
      providesTags: ["Evidence"],
    }),
    addExtraScope: builder.mutation({             // jobId -> { id }
      query: (jobId) => ({ url: `${P}/jobs/${jobId}/scopes`, method: "POST" }),
      invalidatesTags: ["Evidence"],
    }),
    saveExtraScope: builder.mutation({            // { jobId, scopeId, ...data }  (auto-save, no refetch)
      query: ({ jobId, scopeId, ...body }) => ({ url: `${P}/jobs/${jobId}/scopes/${scopeId}`, method: "PUT", body }),
    }),
    deleteExtraScope: builder.mutation({          // { jobId, scopeId }
      query: ({ jobId, scopeId }) => ({ url: `${P}/jobs/${jobId}/scopes/${scopeId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
    sendExtraScopeSms: builder.mutation({         // { jobId, scopeId, phone? } -> { sms: { sent, to?, error? }, total }
      query: ({ jobId, scopeId, ...body }) => ({ url: `${P}/jobs/${jobId}/scopes/${scopeId}/send-sms`, method: "POST", body }),
    }),
    uploadExtraScopeInventory: builder.mutation({ // { jobId, scopeId } -> { inventory: { sentAt, needsUpload }, parts, quotes }  (spare parts + third-party items -> Inventory & Spare Parts, + notification)
      query: ({ jobId, scopeId }) => ({ url: `${P}/jobs/${jobId}/scopes/${scopeId}/upload-inventory`, method: "POST" }),
      invalidatesTags: ["Evidence", "Inventory"],
    }),
    completeExtraScope: builder.mutation({        // { jobId, scopeId }
      query: ({ jobId, scopeId }) => ({ url: `${P}/jobs/${jobId}/scopes/${scopeId}/complete`, method: "POST" }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
  }),
});

export const {
  useGetExtraScopesQuery, useGetExtraRepairTreeQuery, useAddExtraScopeMutation, useSaveExtraScopeMutation,
  useDeleteExtraScopeMutation, useSendExtraScopeSmsMutation, useUploadExtraScopeInventoryMutation, useCompleteExtraScopeMutation,
} = extraScopeApi;