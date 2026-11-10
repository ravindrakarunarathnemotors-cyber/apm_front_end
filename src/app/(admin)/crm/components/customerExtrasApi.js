import { apiSlice } from "@/store/features/apiSlice";

// Customer Registration extras (added here so apiSlice.js needs no change).
//  getCustomerSources   -> [{ id, name, requiresReferral }]      the "How did you find us?" selector
//  checkReferralCode    -> { valid, customerId?, customerName? }  (lazy: useLazyCheckReferralCodeQuery)
const customerExtrasApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerSources: builder.query({
      query: () => `/api/customer-sources`,
    }),
    getCustomerGroups: builder.query({
      query: () => `/api/customer-groups`,
    }),
    checkReferralCode: builder.query({
      query: (code) => `/api/customers/referral/${encodeURIComponent(code)}`,
    }),
  }),
});

export const { useGetCustomerGroupsQuery, useGetCustomerSourcesQuery, useLazyCheckReferralCodeQuery } = customerExtrasApi;