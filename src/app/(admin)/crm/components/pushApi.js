import { apiSlice } from "@/store/features/apiSlice";

// Uses the same apiSlice as everything else (cookies + automatic token refresh)
const pushApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPushKey: builder.query({ query: () => `/push/push/public-key` }),
    subscribePush: builder.mutation({
      query: (subscription) => ({ url: `/push/push/subscribe`, method: "POST", body: { subscription } }),
    }),
    // notification history for the top bar bell (job assigned etc.)
    getMyNotifications: builder.query({ query: (limit = 10) => `/push/my-notifications?limit=${limit}` }),
    markMyNotificationsRead: builder.mutation({
      query: (body) => ({ url: `/push/my-notifications/read`, method: "POST", body }), // { ids: [..] } or { all: true }
    }),
    unsubscribePush: builder.mutation({
      query: (endpoint) => ({ url: `/push/push/unsubscribe`, method: "POST", body: { endpoint } }),
    }),
  }),
});

export const {
  useGetPushKeyQuery, useSubscribePushMutation, useUnsubscribePushMutation,
  useGetMyNotificationsQuery, useMarkMyNotificationsReadMutation,
} = pushApi;