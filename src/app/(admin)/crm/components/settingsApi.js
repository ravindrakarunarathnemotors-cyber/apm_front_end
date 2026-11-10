import { apiSlice } from "@/store/features/apiSlice";

// Settings module endpoints (added here so apiSlice.js needs no change).
// Backend: app.use("/settings", require("./routes/settings.routes"));
const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyProfile: builder.query({
      query: () => "/settings/company",
      providesTags: ["Evidence"],
    }),
    saveCompanyProfile: builder.mutation({       // { name, logoUrl, address, phone, email, website }
      query: (body) => ({ url: "/settings/company", method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    getTerms: builder.query({
      query: () => "/settings/terms",
      providesTags: ["Evidence"],
    }),
    saveTerms: builder.mutation({                // { estimate: ["term", ...] }
      query: (body) => ({ url: "/settings/terms", method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    getInvoiceSettings: builder.query({
      query: () => "/settings/invoice",
      providesTags: ["Evidence"],
    }),
    saveInvoiceSettings: builder.mutation({
      query: (body) => ({ url: "/settings/invoice", method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    getNumbering: builder.query({
      query: () => "/settings/numbering",
      providesTags: ["Evidence"],
    }),
    saveNumbering: builder.mutation({
      query: (body) => ({ url: "/settings/numbering", method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    getSmsSettings: builder.query({
      query: () => "/settings/sms",
      providesTags: ["Evidence"],
    }),
    saveSmsSettings: builder.mutation({
      query: (body) => ({ url: "/settings/sms", method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    sendTestSms: builder.mutation({              // { phone, message? }
      query: (body) => ({ url: "/settings/sms/test", method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    getSmsLog: builder.query({
      query: (limit = 50) => `/settings/sms/log?limit=${limit}`,
      providesTags: ["Evidence"],
    }),
    getPricing: builder.query({
      query: () => "/settings/pricing",
      providesTags: ["Evidence"],
    }),
    savePricing: builder.mutation({              // { adjustmentOptions: [2, 5, 8, 10, 12] }
      query: (body) => ({ url: "/settings/pricing", method: "PUT", body }),
      invalidatesTags: ["Evidence", "Jobs"],
    }),
    getSettingsLog: builder.query({
      query: (group = "company") => `/settings/log?group=${group}`,
      providesTags: ["Evidence"],
    }),
  }),
});

export const { useGetCompanyProfileQuery, useSaveCompanyProfileMutation, useGetTermsQuery, useSaveTermsMutation, useGetInvoiceSettingsQuery, useSaveInvoiceSettingsMutation, useGetNumberingQuery, useSaveNumberingMutation, useGetPricingQuery, useSavePricingMutation, useGetSmsSettingsQuery, useSaveSmsSettingsMutation, useSendTestSmsMutation, useGetSmsLogQuery, useGetSettingsLogQuery } = settingsApi;

// used by the documents (estimate, invoice ...): the company name, logo and contact line, with safe defaults
export const DEFAULT_COMPANY = { name: "KARUNARATHNE AUTO ZONE", logoUrl: "", address: "", phone: "", email: "", website: "" };

// "Terms & conditions" block for the estimate documents (inline styles, so no document CSS needs to change)
const escT = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const termsHtml = (terms) => {
  const list = (Array.isArray(terms) ? terms : []).filter(Boolean);
  if (!list.length) return "";
  return `<div style="margin-top:22px;page-break-inside:avoid"><div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8f0b0b;margin-bottom:6px">Terms &amp; conditions</div><ol style="margin:0;padding-left:18px;font-size:10.5px;line-height:1.55;color:#57534e">${list.map((t) => `<li style="margin-bottom:2px">${escT(t)}</li>`).join("")}</ol></div>`;
};