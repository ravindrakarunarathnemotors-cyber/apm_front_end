import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  credentials: "include", // :fire: IMPORTANT
  prepareHeaders: (headers) => {
    headers.set("Content-Type", "application/json");
    return headers;
  },
});

// One refresh at a time: if several requests get 401 together they all wait for the same refresh
let refreshPromise = null;

const readRefreshToken = () => {
  try {
    return (typeof window !== "undefined" && localStorage.getItem("refresh_token")) || null;
  } catch {
    return null;
  }
};

const doRefresh = async (api, extraOptions) => {
  const refresh_token = readRefreshToken();
  const res = await baseQuery(
    {
      url: "/auth/refresh-token",
      method: "POST",
      // the backend reads refresh_token from the body; the cookie is sent too (credentials: include)
      body: refresh_token ? { refresh_token } : {},
    },
    api,
    extraOptions
  );

  if (res?.data) {
    // keep any new tokens the server returns (cookies are set by the server itself)
    try {
      const d = res.data;
      const at = d.access_token || d.accessToken;
      const rt = d.refresh_token || d.refreshToken;
      if (at) sessionStorage.setItem("access_token", at);
      if (rt) localStorage.setItem("refresh_token", rt);
    } catch {}
    return true;
  }
  return false;
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Only 401 means "token missing / expired". 403 is "forbidden" and must not trigger a refresh loop.
  if (result?.error?.status === 401) {
    const url = typeof args === "string" ? args : args?.url;
    if (url && url.includes("/auth/")) return result; // never refresh for login / refresh calls

    if (!refreshPromise) {
      refreshPromise = doRefresh(api, extraOptions).finally(() => {
        refreshPromise = null;
      });
    }
    const ok = await refreshPromise;

    if (ok) {
      result = await baseQuery(args, api, extraOptions); // retry original request once
    } else {
      api.dispatch({ type: "auth/logout" });
    }
  }

  return result;
};


export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ClientStaff', 'User', 'Client', 'Hub', 'Roles', 'Services', 'Invoice', 'Ticket', 'Quotation'],
  endpoints: (builder) => ({
    // ✅ ADD THIS LOGIN ENDPOINT
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response) => {
        // Store non-sensitive user data
        if (response.user_id) {
          sessionStorage.setItem('user_id', response.user_id);
          sessionStorage.setItem('role_id', response.role_id);
          if (response.client_id) sessionStorage.setItem('client_id', response.client_id);
          if (response.hub_id) sessionStorage.setItem('hub_id', response.hub_id);
          if (response.hacc) sessionStorage.setItem('hacc', response.hacc);
        }
        return response;
      },
    }),

    // ✅ ADD LOGOUT ENDPOINT
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Clear all local storage
          if (typeof window !== 'undefined') {
            sessionStorage.clear();
            localStorage.clear();
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Still clear local data even if API call fails
          sessionStorage.clear();
          localStorage.clear();
        }
      },
    }),

    getClientStaff: builder.query({
      query: () => '/api/client-staff',
      providesTags: ['ClientStaff'],
    }),

    refreshToken: builder.mutation({
      query: (refreshToken) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
    }),
    addUser: builder.mutation({
      query: (newUser) => ({
        url: '/api/adduser',
        method: 'POST',
        body: newUser,
      }),
    }),
    addRole: builder.mutation({
      query: (newRole) => ({
        url: '/api/addrole',
        method: 'POST',
        body: newRole,
      }),
    }),
    getSidebarMenu: builder.query({
      query: (roleid) => ({
        url: '/api/sidebar',
        method: 'POST',
        body: { roleid },
      }),
      providesTags: ['Sidebar'],
    }),

    getSidebarMenuItems: builder.query({
      query: () => '/api/sidebar-items',
      providesTags: ['Sidebaritems'],
    }),
    getRoles: builder.mutation({
      query: () => ({
        url: '/api/get-roles',
        method: 'POST',
        body: {
          client_id: sessionStorage.getItem('user_id'),
        },
      }),
      providesTags: ['Roles'],
    }),

    updateRoleStatus: builder.mutation({
      query: ({ roleId, status }) => ({
        url: '/api/update-role-status',
        method: 'POST',
        body: { roleId, status },
      }),
      invalidatesTags: ['Roles'],
    }),
    getRolePrivileges: builder.mutation({
      query: (roleId) => ({
        url: `/api/get-role-privileges`,
        method: 'POST',
        body: { roleId },
      }),
    }),
    updateRolePrivileges: builder.mutation({
      query: ({ roleId, privileges }) => ({
        url: '/api/update-role-privileges',
        method: 'POST',
        body: { roleId, privileges },
      }),
      invalidatesTags: ['Roles'],
    }),
    getRolesTable: builder.mutation({
      query: ({ client_id, page = 1, limit = 25, search = '' }) => ({
        url: '/api/get-role-table', // Update to your backend endpoint for roles
        method: 'POST',
        body: { client_id, page, limit, search },
      }),
      providesTags: ['Roles'],
    }),
    checkUsername: builder.mutation({
      query: (username) => ({
        url: `/api/check-username`,
        method: 'POST',
        body: { username },
      }),
    }),

    updateUser: builder.mutation({
      query: ({ data }) => ({
        url: `/api/edit-user`,
        method: 'POST',
        body: data,
      }),
    }),

    getUserLogs: builder.mutation({
      query: ({ client_id, skip, limit, user_id, fromDate, toDate }) => ({
        url: '/api/get-user-logs',
        method: 'POST',
        body: { client_id, skip, limit, user_id, fromDate, toDate },
      }),
      providesTags: ['UserLogs'],
    }),

    updatesmstempStatus: builder.mutation({
      query: ({ tempid, status, user_id }) => ({
        url: '/clients/sms-template-status', // ✅ Ensure correct API route
        method: 'POST',
        body: { tempid, status, user_id }, // ✅ Match backend parameter names
      }),
      invalidatesTags: ['Clients'], // ✅ Adjust if needed, or change to ["SmsTemplates"]
    }),

    EditNotificationSettings: builder.mutation({
      query: ({ roleId, email_notifications_status, api_access_status, sms_notifications_status, user_id, status, two_way_api_status }) => ({
        url: '/clients/edit-client-notifications-settings',
        method: 'POST',
        body: { roleId, email_notifications_status, api_access_status, sms_notifications_status, user_id, status, two_way_api_status },
      }),
      invalidatesTags: ['Clients'],
    }),

    GetGeneralSettings: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-general-settings',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateGeneralSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-general-settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetSMSSettings: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-smsgateway-settings',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    GetSMSNotification: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-notification-settings',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateSmsSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-sms-settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    UpdateSMSNotification: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-notification-settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetMaintenanceSettings: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-maintenance-settings',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    getAdminNotifications: builder.query({
      query: ({ page = 1, limit = 10 }) =>
        `/admin/notifications?page=${page}&limit=${limit}`,
    }),

    getAdminUnreadCount: builder.query({
      query: () => ({
        url: '/admin/notifications/unread-count',
        method: 'GET',
      }),
    }),

    markNotificationsRead: builder.mutation({
      query: (body) => ({
        url: '/admin/notifications/mark-read',
        method: 'PATCH',
        body,
      }),
    }),

    UpdateMaintenanceSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-maintenance-settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetEMAILSettings: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-emailgateway-settings',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateEmailSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-email-settings',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetCompanyDetails: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-company-details',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateCompanyDetails: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-company-details',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetBankDetails: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-bank-details',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateBankDetails: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-bank-details',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetSystemColors: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-system-color',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    UpdateSystemColors: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-system-color',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    UpdateSystemImages: builder.mutation({
      query: (settings) => ({
        url: '/settings/update-system-images',
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: ['GeneralSettings'],
    }),

    GetSystemImages: builder.query({
      query: ({ user_id, role_id }) => ({
        url: '/settings/get-system-images',
        method: 'POST',
        body: { user_id, role_id },
      }),
      providesTags: ['GeneralSettings'],
    }),

    getLoadingImages: builder.query({
      query: () => ({
        url: '/settings/get-loading-images',
        method: 'GET', // Changed to GET as no request body is required
      }),
      providesTags: ['GeneralSettings'],
    }),

    GetSmsTemplate: builder.query({
      query: ({ page, limit, action }) => {
        return `/settings/get-sms-template?page=${page}&limit=${limit}&action=${action || ''}`
      },
      providesTags: ['SmsTemplates'],
    }),

    GetSmsTemplog: builder.query({
      query: ({ page, limit, action, startDate, endDate, mobileNo, status }) => {
        const params = new URLSearchParams({
          page,
          limit,
          action: action || '',
          startDate: startDate || '',
          endDate: endDate || '',
          mobileNo: mobileNo || '',
          status: status || '',
        })

        return `/ratecard/get-sms-temp-log?${params.toString()}`
      },
      providesTags: ['SmsTemplates'],
    }),

    //add client
    CheckClientkUsername: builder.mutation({
      query: (username) => ({
        url: `/api/client-username`,
        method: 'POST',
        body: { username },
      }),
    }),

    GetSMSActions: builder.query({
      query: () => ({
        url: '/api/get-smsaction',
        method: 'POST',
      }),
      providesTags: ['SMSActions'],
    }),





    getUserDetails: builder.query({
      query: (user_id) => ({
        url: '/api/get-user-details',
        method: 'POST',
        body: { user_id },
      }),
      providesTags: ['Client'],
    }),
    //reason







    changePassword: builder.mutation({
      query: ({ current_password, new_password }) => ({
        url: '/settings/change-password',
        method: 'POST',
        body: {
          current_password,
          new_password,
        },
      }),
    }),

    updateProfilePicture: builder.mutation({
      query: ({ profile_image }) => ({
        url: '/settings/update-profile-picture',
        method: 'POST',
        body: {
          profile_image,
        },
      }),
    }),

    getUserProfile: builder.query({
      query: () => ({
        url: '/settings/user-details',
        method: 'POST',
      }),
    }),

    // Add Features endpoints
    getFeatures: builder.query({
      query: (params = {}) => {
        const { category, status, billing_cycle, search } = params
        let queryString = '/api/features?'

        if (category && category !== 'all') queryString += `category=${category}&`
        if (status) queryString += `status=${status}&`
        if (billing_cycle && billing_cycle !== 'all') queryString += `billing_cycle=${billing_cycle}&`
        if (search) queryString += `search=${search}&`

        // Remove trailing & or ? if no params
        queryString = queryString.replace(/[?&]$/, '')

        return {
          url: queryString || '/features',
          method: 'GET',
        }
      },
      providesTags: ['Feature'],
    }),

    getFeatureById: builder.query({
      query: (featureId) => `/features/${featureId}`,
      providesTags: (result, error, featureId) => [{ type: 'Feature', id: featureId }],
    }),

    createFeature: builder.mutation({
      query: (featureData) => ({
        url: '/features',
        method: 'POST',
        body: featureData,
      }),
      invalidatesTags: ['Feature'],
    }),

    updateFeature: builder.mutation({
      query: ({ featureId, ...featureData }) => ({
        url: `/features/${featureId}`,
        method: 'PUT',
        body: featureData,
      }),
      invalidatesTags: (result, error, { featureId }) => [{ type: 'Feature', id: featureId }],
    }),

    deleteFeature: builder.mutation({
      query: (featureId) => ({
        url: `/features/${featureId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Feature'],
    }),

    getFeatureCategories: builder.query({
      query: () => '/features/categories/list',
      providesTags: ['Feature'],
    }),

    getFeaturesByBillingCycle: builder.query({
      query: (cycle) => `/features/billing/${cycle}`,
      providesTags: ['Feature'],
    }),

    getAllFeatures: builder.query({
      query: () => `/api/get-all-features`,
      providesTags: ['Features'],
    }),

    // Add this endpoint to your apiSlice
    getPackageById: builder.query({
      query: (packageId) => `/api/get-package/${packageId}`,
      providesTags: (result, error, id) => [{ type: 'Package', id }],
    }),


    getResourceAllocation: builder.query({
      query: (serviceId) => `/api/${serviceId}/resources`,
      providesTags: (result, error, serviceId) => [
        { type: 'ResourceAllocation', id: serviceId }
      ],
    }),

    // Update resource allocation
    // In your apiSlice.js
    updateResourceAllocation: builder.mutation({
      query: ({ serviceId, resources }) => ({  // Change from 'resourceData' to 'resources'
        url: `/api/${serviceId}/resources`,
        method: 'PUT',
        body: { resources },  // Wrap in resources object
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: 'ResourceAllocation', id: serviceId }
      ],
    }),

    getServerHealth: builder.query({
      query: (serverId) => `/api/server-nodes/${serverId}/health`,
      providesTags: (result, error, serverId) => [{ type: 'ServerHealth', id: serverId }],
    }),

    getBatchServerHealth: builder.query({
      query: (serverIds) => ({
        url: '/server-nodes/health/batch',
        method: 'POST',
        body: { serverIds },
      }),
      providesTags: (result, error, serverIds) =>
        serverIds?.map(id => ({ type: 'ServerHealth', id })) || [],
    }),

    getNewClients: builder.query({
      query: () => '/api/get-new-clients',
    }),

    convertNewClient: builder.mutation({
      query: (id) => ({
        url: `/api/convert-client/${id}`,
        method: 'POST',
      }),
    }),


    // Start new line
    getBranches: builder.mutation({
      query: () => ({
        url: '/api/get-branches',
        method: 'POST',
        body: {
          client_id: sessionStorage.getItem('user_id'),
        },
      }),
      providesTags: ['Branches'],
    }),

    // Save a new customer + vehicles, or update an existing one picked from the search box
    AddCustomer: builder.mutation({
      query: (body) => ({
        url: `/api/customers`,
        method: "POST",
        body,                       // the whole wizard form values
      }),
      invalidatesTags: ["Customers"],
    }),

    // Search box: name / NIC / mobile / vehicle number
    SearchCustomers: builder.query({
      query: (q) => ({
        url: `/api/customers/search`,
        params: { q },
      }),
      providesTags: ["Customers"],
    }),

    // Customer categories from the DB (id, name, features[])
    GetCustomerCategories: builder.query({
      query: () => `/api/customer-categories`,
    }),

    GetDepartments: builder.query({
      query: () => `/api/departments`,
    }),

    GetConsultants: builder.query({
      query: () => `/api/consultants`,
    }),

    CreateJob: builder.mutation({
      query: (body) => ({
        url: `/api/jobs`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Jobs"],   // refreshes the Jobs table automatically
    }),

    // Jobs table
    GetJobs: builder.query({
      query: () => `/api/jobs`,
      providesTags: ["Jobs"],
    }),

    // Consultants (admin_user with role_id = 2) for Stage 3: [{ id, name, username, mobile, ... }]
    GetConsultants: builder.query({
      query: () => `/api/consultants`,
    }),

    SetJobDepartment: builder.mutation({
      query: ({ id, departmentId }) => ({
        url: `/api/jobs/${id}/department`,
        method: "PATCH",
        body: { departmentId },
      }),
      invalidatesTags: ["Jobs"],
    }),

    GetJobDetails: builder.query({
      query: (id) => `/api/jobs/${id}`,
      providesTags: ["Jobs"],
    }),

    // Jobs table. Optional department name for the department dashboards, e.g. useGetJobsQuery("Mechanical")
    GetJobs: builder.query({
      query: (department) =>
        department ? `/api/jobs?department=${encodeURIComponent(department)}` : `/api/jobs`,
      providesTags: ["Jobs"],
    }),

    // Consultants (admin_user with role_id = 2) for Stage 3: [{ id, name, username, mobile, ... }]
    GetConsultants: builder.query({
      query: () => `/api/consultants`,
    }),
    // ---- Stage 5: customer complaint (per department) ----
    // Opens the form: job + the department's type lists + saved complaint + other departments
    GetJobComplaint: builder.query({
      query: (jobId) => `/api/jobs/${jobId}/complaint`,
      providesTags: ["Complaint"],
    }),

    // Save: { jobId, complaint, remarks, vehiclePassIssued, initialCustomerApproval, optionIds: [] }
    SaveJobComplaint: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/api/jobs/${jobId}/complaint`, method: "POST", body }),
      invalidatesTags: ["Jobs", "Complaint"],
    }),

    // "Shift To Other Department": { jobId, departmentId, reason }
    ShiftJobDepartment: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/api/jobs/${jobId}/shift-department`, method: "PATCH", body }),
      invalidatesTags: ["Jobs", "Complaint"],
    }),

    // ---- Manage the type lists (only users allowed by the backend) ----
    GetComplaintLists: builder.query({
      query: (departmentId) => `/api/departments/${departmentId}/complaint-lists`,
      providesTags: ["ComplaintLists"],
    }),
    AddComplaintOption: builder.mutation({
      query: ({ listId, ...body }) => ({ url: `/api/complaint-lists/${listId}/options`, method: "POST", body }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),
    UpdateComplaintOption: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/api/complaint-options/${id}`, method: "PATCH", body }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),
    RemoveComplaintOption: builder.mutation({
      query: (id) => ({ url: `/api/complaint-options/${id}`, method: "DELETE" }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),

    // Jobs table. Optional department name for the department dashboards, e.g. useGetJobsQuery("Mechanical")
    GetJobs: builder.query({
      query: (department) =>
        department ? `/api/jobs?department=${encodeURIComponent(department)}` : `/api/jobs`,
      providesTags: ["Jobs"],
    }),

    // Consultants (admin_user with role_id = 2) for Stage 3: [{ id, name, username, mobile, ... }]
    GetConsultants: builder.query({
      query: () => `/api/consultants`,
    }),

    // Opens the form: job + the department's type lists + saved complaint + other departments
    GetJobComplaint: builder.query({
      query: (jobId) => `/complaint/jobs/${jobId}/complaint`,
      providesTags: ["Complaint"],
    }),

    // Save: { jobId, complaint, remarks, vehiclePassIssued, initialCustomerApproval, optionIds: [] }
    SaveJobComplaint: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/complaint/jobs/${jobId}/complaint`, method: "POST", body }),
      invalidatesTags: ["Jobs", "Complaint"],
    }),

    // "Shift To Other Department": { jobId, departmentId, reason }
    ShiftJobDepartment: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/complaint/jobs/${jobId}/shift-department`, method: "PATCH", body }),
      invalidatesTags: ["Jobs", "Complaint"],
    }),

    // ---- Manage the type lists (only users allowed by the backend) ----
    GetComplaintLists: builder.query({
      query: (departmentId) => `/complaint/departments/${departmentId}/complaint-lists`,
      providesTags: ["ComplaintLists"],
    }),
    AddComplaintOption: builder.mutation({
      query: ({ listId, ...body }) => ({ url: `/complaint/complaint-lists/${listId}/options`, method: "POST", body }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),
    UpdateComplaintOption: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/complaint/complaint-options/${id}`, method: "PATCH", body }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),
    RemoveComplaintOption: builder.mutation({
      query: (id) => ({ url: `/complaint/complaint-options/${id}`, method: "DELETE" }),
      invalidatesTags: ["ComplaintLists", "Complaint"],
    }),

    // HR: employees list (Employees tab, and every HR tab that needs names)
    GetEmployees: builder.query({
      query: () => `/hrm/employees`,
      providesTags: ["Employees"],
    }),

    // HR: dropdowns of the Add employee form (designations, departments, branches, roles, reporting persons)
    GetEmployeeFormOptions: builder.query({
      query: () => `/hrm/employee-form-options`,
      providesTags: ["Employees"],
    }),

    // HR: add employee (plain JSON body)
    AddEmployee: builder.mutation({
      query: (payload) => ({
        url: `/hrm/employees`,
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["Employees"],
    }),

    UpdateEmployee: builder.mutation({
      query: ({ id, ...payload }) => ({
        url: `/hrm/employees/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["Employees"],
    }),
    // HR: designations (all, active + inactive)
    GetDesignations: builder.query({
      query: () => `/hrm/designations`,
      providesTags: ["Designations"],
    }),
    AddDesignation: builder.mutation({
      query: (payload) => ({ url: `/hrm/designations`, method: "POST", body: payload }),
      invalidatesTags: ["Designations", "Employees"],
    }),
    UpdateDesignation: builder.mutation({
      query: ({ id, ...payload }) => ({ url: `/hrm/designations/${id}`, method: "PUT", body: payload }),
      invalidatesTags: ["Designations", "Employees"],
    }),

    // HR: departments (all, active + inactive)
    GetDepartmentss: builder.query({
      query: () => `/hrm/departments`,
      providesTags: ["Departments"],
    }),
    AddDepartment: builder.mutation({
      query: (payload) => ({ url: `/hrm/departments`, method: "POST", body: payload }),
      invalidatesTags: ["Departments", "Employees"],
    }),
    UpdateDepartment: builder.mutation({
      query: ({ id, ...payload }) => ({ url: `/hrm/departments/${id}`, method: "PUT", body: payload }),
      invalidatesTags: ["Departments", "Employees"],
    }),
    // HR: branches (all, active + inactive)
    GetBranches: builder.query({
      query: () => `/hrm/branches`,
      providesTags: ["Branches"],
    }),
    AddBranch: builder.mutation({
      query: (payload) => ({ url: `/hrm/branches`, method: "POST", body: payload }),
      invalidatesTags: ["Branches", "Employees"],
    }),
    UpdateBranch: builder.mutation({
      query: ({ id, ...payload }) => ({ url: `/hrm/branches/${id}`, method: "PUT", body: payload }),
      invalidatesTags: ["Branches", "Employees"],
    }),

    GetJobTeamAllocation: builder.query({
      query: (jobId) => `/team/jobs/${jobId}/team-allocation`,
      providesTags: ["TeamAllocation"],
    }),
    // Save: { jobId, teamId, bayId, teamLeaderId, subLeaderId, ppeUsed, vehicleProtectionApplied }
    SaveJobTeamAllocation: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/team/jobs/${jobId}/team-allocation`, method: "PUT", body }),
      invalidatesTags: ["Jobs", "TeamAllocation"],
    }),
 
    // Dashboard: id + "uses team allocation?" of a department, looked up by NAME ("Mechanical")
    GetTeamDepartment: builder.query({
      query: (name) => `/team/team-department/${encodeURIComponent(name)}`,
      providesTags: ["TeamsBays"],
    }),
 
    // ---- Manage the Teams and Bays of a department ----
    GetTeamsBays: builder.query({
      query: (departmentId) => `/team/departments/${departmentId}/teams-bays`,
      providesTags: ["TeamsBays"],
    }),
    AddTeam: builder.mutation({
      query: ({ departmentId, ...body }) => ({ url: `/team/departments/${departmentId}/teams`, method: "POST", body }),
      invalidatesTags: ["TeamsBays", "TeamAllocation"],
    }),
    UpdateTeam: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/team/teams/${id}`, method: "PUT", body }),
      invalidatesTags: ["TeamsBays", "TeamAllocation"],
    }),
    AddBay: builder.mutation({
      query: ({ departmentId, ...body }) => ({ url: `/team/departments/${departmentId}/bays`, method: "POST", body }),
      invalidatesTags: ["TeamsBays", "TeamAllocation"],
    }),
    UpdateBay: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/team/bays/${id}`, method: "PUT", body }),
      invalidatesTags: ["TeamsBays", "TeamAllocation"],
    }),

    

// Dashboard: id + "uses vehicle evidence?" of a department, by NAME ("Mechanical")
    GetEvidenceDepartment: builder.query({
      query: (name) => `/evidence/evidence-department/${encodeURIComponent(name)}`,
      providesTags: ["InspectionItems"],
    }),
 
    // Stage 7 window: job + checklist + saved evidence
    GetJobEvidence: builder.query({
      query: (jobId) => `/evidence/jobs/${jobId}/vehicle-evidence`,
      providesTags: ["Evidence", "InspectionItems"],
    }),
    // Save: { jobId, items: [{itemId, condition, photosTaken, videosTaken, note}], damages: [], moreDetails }
    SaveJobEvidence: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/evidence/jobs/${jobId}/vehicle-evidence`, method: "PUT", body }),
      invalidatesTags: ["Jobs", "Evidence"],
    }),
    // Creates the customer report link: arg = jobId  ->  { token, path }
    CreateEvidenceLink: builder.mutation({
      query: (jobId) => ({ url: `/evidence/jobs/${jobId}/vehicle-evidence/link`, method: "POST" }),
      invalidatesTags: ["Evidence"],
    }),
 
    // Photos / videos: after the file is uploaded to /file/upload, register it. arg = { jobId, itemId?, fileName, fileUrl, mimeType, size }
    AddEvidenceFile: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/evidence/jobs/${jobId}/vehicle-evidence/files`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    RemoveEvidenceFile: builder.mutation({
      query: (id) => ({ url: `/evidence/vehicle-evidence/files/${id}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
 
    // Manage the checklist (all items incl. inactive)
    GetInspectionItems: builder.query({
      query: (departmentId) => `/evidence/departments/${departmentId}/inspection-items`,
      providesTags: ["InspectionItems"],
    }),
    AddInspectionItem: builder.mutation({
      query: ({ departmentId, ...body }) => ({ url: `/evidence/departments/${departmentId}/inspection-items`, method: "POST", body }),
      invalidatesTags: ["InspectionItems"],
    }),
    UpdateInspectionItem: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/evidence/inspection-items/${id}`, method: "PUT", body }),
      invalidatesTags: ["InspectionItems"],
    }),
    RemoveInspectionItem: builder.mutation({
      query: (id) => ({ url: `/evidence/inspection-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["InspectionItems", "Evidence"],
    }),

        // Dashboard: id + "uses bay allocation?" of a department, by NAME ("Wash")
    GetBayDepartment: builder.query({
      query: (name) => `/bay/bay-department/${encodeURIComponent(name)}`,
      providesTags: ["TeamsBays"],
    }),
    // Stage 6 window: job + bays + saved allocation
    GetJobBayAllocation: builder.query({
      query: (jobId) => `/bay/jobs/${jobId}/bay-allocation`,
      providesTags: ["BayAllocation", "TeamsBays"],
    }),
    // Save: { jobId, bayId }
    SaveJobBayAllocation: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/bay/jobs/${jobId}/bay-allocation`, method: "PUT", body }),
      invalidatesTags: ["Jobs", "BayAllocation"],
    }),

      GetDamageReportDepartment: builder.query({
      query: (name) => `/damagereport/damage-report-department/${encodeURIComponent(name)}`,
    }),
    // Stage 8 window: job + saved report + stage 7 link + the damages found in stage 7
    GetDamageReport: builder.query({
      query: (jobId) => `/damagereport/jobs/${jobId}/damage-report`,
      providesTags: ["DamageReport"],
    }),
    // Save: { jobId, skip: true }   or   { jobId, skip: false, damages: [], needDeepCheck, needRepair, agreed: [{description, action}] }
    SaveDamageReport: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/damagereport/jobs/${jobId}/damage-report`, method: "PUT", body }),
      invalidatesTags: ["Jobs", "DamageReport", "Evidence"],
    }),
    // Customer confirm link: arg = jobId -> { token, path }
    CreateDamageReportLink: builder.mutation({
      query: (jobId) => ({ url: `/damagereport/jobs/${jobId}/damage-report/link`, method: "POST" }),
      invalidatesTags: ["DamageReport"],
    }),
    // Staff records the customer's answer: { jobId, decision: "CONFIRMED" | "DECLINED" | null (reset), note? }
    SetDamageReportDecision: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/damagereport/jobs/${jobId}/damage-report/decision`, method: "POST", body }),
      invalidatesTags: ["Jobs", "DamageReport", "Evidence"],
    }),
 
    GetPreEvidence: builder.query({
      query: (jobId) => `/evidence/jobs/${jobId}/pre-evidence`,
      providesTags: ["Evidence"],
    }),
    SavePreEvidence: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/evidence/jobs/${jobId}/pre-evidence`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),

        // Sends the customer report link by SMS: arg = { jobId, phone? }  ->  { sms: { sent, to?, error? } }
    SendEvidenceSms: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/evidence/jobs/${jobId}/vehicle-evidence/sms`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),




    
    // Mechanical stage 7 "Vehicle Job Inspection"
    GetJobInspection: builder.query({
      query: (jobId) => `/inspection/jobs/${jobId}/inspection`,
      providesTags: ["Evidence"],
    }),
    // { jobId, testRun, faultsFound, faults[], identifiedFaults[], rootCauses[], previousRepair, newRepair, warranty, historyRemarks, repairTypes[], complete?, signerName? }
    SaveJobInspection: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/inspection/jobs/${jobId}/inspection`, method: "PUT", body }),
      invalidatesTags: ["Jobs", "Evidence"],
    }),
    // repair list: { jobId, description, amount, repairType? }
    AddRepairItem: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/inspection/jobs/${jobId}/inspection/repair-items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    // alternate (replace) a line: { jobId, itemId, description, amount, repairType? }
    AlternateRepairItem: builder.mutation({
      query: ({ jobId, itemId, ...body }) => ({ url: `/inspection/jobs/${jobId}/inspection/repair-items/${itemId}`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    RemoveRepairItem: builder.mutation({
      query: ({ jobId, itemId }) => ({ url: `/inspection/jobs/${jobId}/inspection/repair-items/${itemId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
    // scanner report: after the file is uploaded to /file/upload -> { jobId, fileName, fileUrl, mimeType, size }
    AddInspectionFile: builder.mutation({
      query: ({ jobId, ...body }) => ({ url: `/inspection/jobs/${jobId}/inspection/files`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    RemoveInspectionFile: builder.mutation({
      query: (fileId) => ({ url: `/inspection/inspection/files/${fileId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),

    // "Spare Part Review & Order"
    GetSpareParts: builder.query({
      query: (jobId) => `/spare/jobs/${jobId}/spare-parts`,
      providesTags: ["Evidence"],
    }),
    AddSparePartItem: builder.mutation({            // { jobId, partId }  or  { jobId, name, brand, quality, qty, unitPrice }
      query: ({ jobId, ...body }) => ({ url: `/spare/jobs/${jobId}/spare-parts/items`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    UpdateSparePartItem: builder.mutation({         // { jobId, itemId, qty?, unitPrice?, brand?, name? }
      query: ({ jobId, itemId, ...body }) => ({ url: `/spare/jobs/${jobId}/spare-parts/items/${itemId}`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    RemoveSparePartItem: builder.mutation({         // { jobId, itemId }
      query: ({ jobId, itemId }) => ({ url: `/spare/jobs/${jobId}/spare-parts/items/${itemId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
    AddSpareQuote: builder.mutation({               // { jobId, photoUrl?, description }
      query: ({ jobId, ...body }) => ({ url: `/spare/jobs/${jobId}/spare-parts/quotes`, method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    RemoveSpareQuote: builder.mutation({            // { jobId, quoteId }
      query: ({ jobId, quoteId }) => ({ url: `/spare/jobs/${jobId}/spare-parts/quotes/${quoteId}`, method: "DELETE" }),
      invalidatesTags: ["Evidence"],
    }),
    SendSparePartsLink: builder.mutation({          // jobId -> { token, path, sms }
      query: (jobId) => ({ url: `/spare/jobs/${jobId}/spare-parts/link`, method: "POST" }),
      invalidatesTags: ["Evidence"],
    }),
    SetSparePartsHeader: builder.mutation({         // { jobId, noParts }
      query: ({ jobId, ...body }) => ({ url: `/spare/jobs/${jobId}/spare-parts`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    CompleteSpareParts: builder.mutation({          // jobId
      query: (jobId) => ({ url: `/spare/jobs/${jobId}/spare-parts/complete`, method: "POST" }),
      invalidatesTags: ["Jobs", "Evidence"],
    }),
    // spare parts master: { q?, quality?, all? }
    SearchSpareCatalog: builder.query({
      query: ({ q = "", quality = "", all = false } = {}) => ({ url: "/spare/spare-parts/catalog", params: { q, quality, all: all ? 1 : 0 } }),
      providesTags: ["Evidence"],
    }),
    AddCatalogPart: builder.mutation({              // { name, brand, quality, price, stockQty, partNo }
      query: (body) => ({ url: "/spare/spare-parts/catalog", method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    UpdateCatalogPart: builder.mutation({           // { id, name, brand, quality, price, stockQty, partNo, isActive }
      query: ({ id, ...body }) => ({ url: `/spare/spare-parts/catalog/${id}`, method: "PUT", body }),
      invalidatesTags: ["Evidence"],
    }),
    AddSpareOption: builder.mutation({              // { kind: "BRAND" | "QUALITY", name }
      query: (body) => ({ url: "/spare/spare-parts/options", method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),


 // Inventory
    GetInventoryLookups: builder.query({
      query: () => `/Inventory/inventory/lookups`,
      providesTags: ["Inventory"],
    }),
    GetInventoryItems: builder.query({              // { q?, categoryId?, low?, all? }
      query: ({ q = "", categoryId = "", low = false, all = false } = {}) =>
        `/Inventory/inventory/items?q=${encodeURIComponent(q)}&categoryId=${categoryId}&low=${low ? 1 : 0}&all=${all ? 1 : 0}`,
      providesTags: ["Inventory"],
    }),
    AddInventoryItem: builder.mutation({            // { name, categoryId, partNo, brand, quality, unit, price, reorderLevel }
      query: (body) => ({ url: `/Inventory/inventory/items`, method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    UpdateInventoryItem: builder.mutation({         // { id, ...same fields, isActive }
      query: ({ id, ...body }) => ({ url: `/Inventory/inventory/items/${id}`, method: "PUT", body }),
      invalidatesTags: ["Inventory"],
    }),
    GetInventoryMovements: builder.query({          // partId -> { movements, balances }
      query: (partId) => `/Inventory/inventory/items/${partId}/movements`,
      providesTags: ["Inventory"],
    }),
    PostInventoryMovement: builder.mutation({       // { partId, locationId, type, qty, unitCost?, refNo?, note? }
      query: (body) => ({ url: `/Inventory/inventory/movements`, method: "POST", body }),
      invalidatesTags: ["Inventory", "Evidence"],
    }),
    AddInventoryCategory: builder.mutation({        // { name, kind: JOB_ITEM | INTERNAL }
      query: (body) => ({ url: `/Inventory/inventory/categories`, method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    AddStockLocation: builder.mutation({            // { name }
      query: (body) => ({ url: `/evidence/inventory/locations`, method: "POST", body }),
      invalidatesTags: ["Inventory"],
    }),
    GetInventoryDashboard: builder.query({
      query: () => `/Inventory/inventory/dashboard`,
      providesTags: ["Inventory", "Evidence"],
    }),
    GetSpareOrders: builder.query({                 // status: open | waiting | done | all
      query: (status = "open") => `/Inventory/inventory/spare-orders?status=${status}`,
      providesTags: ["Inventory", "Evidence"],
    }),
    GetSpareQuotes: builder.query({                 // status: pending | all
      query: (status = "pending") => `/Inventory/inventory/quotes?status=${status}`,
      providesTags: ["Inventory", "Evidence"],
    }),
    AnswerSpareQuote: builder.mutation({            // { id, price, note }
      query: ({ id, ...body }) => ({ url: `/Inventory/inventory/quotes/${id}`, method: "PUT", body }),
      invalidatesTags: ["Inventory", "Evidence"],
    }),
    GetStockLedger: builder.query({                 // { type?, q? }
      query: ({ type = "", q = "" } = {}) => `/Inventory/inventory/movements?type=${type}&q=${encodeURIComponent(q)}`,
      providesTags: ["Inventory"],
    }),
    JobPartAction: builder.mutation({               // { jobId, lineId, action: reserve|release|issue|return, qty?, locationId?, note? }
      query: ({ jobId, lineId, action, ...body }) => ({ url: `/Inventory/inventory/jobs/${jobId}/parts/${lineId}/${action}`, method: "POST", body }),
      invalidatesTags: ["Inventory", "Evidence"],
    }),

InvGet: builder.query({                       // GET /evidence/inventory/<path>
  query: (path) => `/inventoryfull/inventory/${path}`,
  providesTags: ["Inventory"],
}),
InvSend: builder.mutation({                   // { url, method = "POST", body }
  query: ({ url, method = "POST", body }) => ({ url: `/inventoryfull/inventory/${url}`, method, body }),
  invalidatesTags: ["Inventory", "Evidence"],
}),

    getCustomerSources: builder.query({
      query: () => `/api/customer-sources`,
    }),
    checkReferralCode: builder.query({
      query: (code) => `/api/customers/referral/${encodeURIComponent(code)}`,
    }),


  }),
})



export const {
  useLoginMutation,        // Add this
  useLogoutMutation,       // Add this
  useGetClientStaffQuery,
  useRefreshTokenMutation,
  useAddUserMutation,
  useAddRoleMutation,
  useGetSidebarMenuQuery,
  useGetSidebarMenuItemsQuery,
  useGetRolesMutation,
  useGetRolesTableMutation,
  useUpdateRoleStatusMutation,
  useGetRolePrivilegesMutation,
  useUpdateRolePrivilegesMutation,
  useCheckUsernameMutation,
  useUpdateUserMutation,
  useGetUserLogsMutation,
  useEditNotificationSettingsMutation,
  useGetGeneralSettingsQuery,
  useUpdateGeneralSettingsMutation,
  useGetSMSSettingsQuery,
  useGetSMSNotificationQuery,
  useUpdateSmsSettingsMutation,
  useUpdateSMSNotificationMutation,
  useGetMaintenanceSettingsQuery,
  useUpdateMaintenanceSettingsMutation,
  useGetEMAILSettingsQuery,
  useUpdateEmailSettingsMutation,
  useGetCompanyDetailsQuery,
  useUpdateCompanyDetailsMutation,
  useGetBankDetailsQuery,
  useUpdateBankDetailsMutation,
  useGetSystemColorsQuery,
  useUpdateSystemColorsMutation,
  useUpdateSystemImagesMutation,
  useGetSystemImagesQuery,
  useGetLoadingImagesQuery,
  useCheckClientkUsernameMutation,
  useGetSMSActionsQuery,
  useGetSmsTemplateQuery,
  useUpdatesmstempStatusMutation,
  useGetSmsTemplogQuery,
  useGetUserDetailsQuery,
  useGetAdminNotificationsQuery,
  useGetAdminUnreadCountQuery,
  useMarkNotificationsReadMutation,
  useChangePasswordMutation,
  useUpdateProfilePictureMutation,
  useGetUserProfileQuery,
  useLazyGetUserProfileQuery,
  useGetFeaturesQuery,
  useGetFeatureByIdQuery,
  useCreateFeatureMutation,
  useUpdateFeatureMutation,
  useDeleteFeatureMutation,
  useGetFeatureCategoriesQuery,
  useGetFeaturesByBillingCycleQuery,
  useGetAllFeaturesQuery,
  useGetPackageByIdQuery,
  useGetResourceAllocationQuery,
  useUpdateResourceAllocationMutation,
  useGetServerHealthQuery,
  useGetBatchServerHealthQuery,
  useGetNewClientsQuery,
  useConvertNewClientMutation,
  useGetBranchesMutation,
  useAddCustomerMutation,
  useLazySearchCustomersQuery,
  useGetCustomerCategoriesQuery,
  useGetDepartmentsQuery,
  useGetConsultantsQuery,
  useCreateJobMutation,
  useGetJobsQuery,
  useSetJobDepartmentMutation,
  useGetJobDetailsQuery,
  useGetJobComplaintQuery,
  useSaveJobComplaintMutation,
  useShiftJobDepartmentMutation,
  useGetComplaintListsQuery,
  useAddComplaintOptionMutation,
  useUpdateComplaintOptionMutation,
  useRemoveComplaintOptionMutation,
  useGetEmployeesQuery,
  useGetEmployeeFormOptionsQuery,
  useAddEmployeeMutation,
  useUpdateEmployeeMutation,
  useGetDesignationsQuery,
  useAddDesignationMutation,
  useUpdateDesignationMutation,
  useGetDepartmentssQuery,
  useAddDepartmentMutation,
  useUpdateDepartmentMutation,
  useGetBranchesQuery,
  useAddBranchMutation,
  useUpdateBranchMutation,
  useGetJobTeamAllocationQuery,
  useSaveJobTeamAllocationMutation,
  useGetTeamsBaysQuery,
  useAddTeamMutation,
  useUpdateTeamMutation,
  useAddBayMutation,
  useUpdateBayMutation,
  useGetTeamDepartmentQuery,
  useGetEvidenceDepartmentQuery,
useGetJobEvidenceQuery,
useSaveJobEvidenceMutation,
useCreateEvidenceLinkMutation,
useGetInspectionItemsQuery,
useAddInspectionItemMutation,
useUpdateInspectionItemMutation,
useRemoveInspectionItemMutation,
useAddEvidenceFileMutation,
useRemoveEvidenceFileMutation,
useGetBayDepartmentQuery, 
useGetJobBayAllocationQuery, 
useSaveJobBayAllocationMutation,
useGetDamageReportDepartmentQuery,
useGetDamageReportQuery,
useSaveDamageReportMutation,
useCreateDamageReportLinkMutation,
useSetDamageReportDecisionMutation,
  useGetPreEvidenceQuery,
  useSavePreEvidenceMutation,
    useSendEvidenceSmsMutation,

  useGetJobInspectionQuery,
useSaveJobInspectionMutation,
useAddRepairItemMutation,
useAlternateRepairItemMutation,
useRemoveRepairItemMutation,
useAddInspectionFileMutation,
useRemoveInspectionFileMutation,
useGetSparePartsQuery, 
useAddSparePartItemMutation, 
useUpdateSparePartItemMutation, 
useRemoveSparePartItemMutation,
useAddSpareQuoteMutation, 
useRemoveSpareQuoteMutation, 
useSendSparePartsLinkMutation, 
useSetSparePartsHeaderMutation,
useCompleteSparePartsMutation, 
useSearchSpareCatalogQuery, 
useAddCatalogPartMutation, 
useUpdateCatalogPartMutation,
useAddSpareOptionMutation,
useGetInventoryLookupsQuery, 
useGetInventoryItemsQuery, 
useAddInventoryItemMutation, 
useUpdateInventoryItemMutation,
useGetInventoryMovementsQuery, 
usePostInventoryMovementMutation, 
useAddInventoryCategoryMutation, 
useAddStockLocationMutation,

useGetInventoryDashboardQuery, 
useGetSpareOrdersQuery, 
useGetSpareQuotesQuery, 
useAnswerSpareQuoteMutation, 
useGetStockLedgerQuery,
useJobPartActionMutation,
useInvGetQuery,
  useInvSendMutation,
 useGetCustomerSourcesQuery, 
 useLazyCheckReferralCodeQuery 
} = apiSlice