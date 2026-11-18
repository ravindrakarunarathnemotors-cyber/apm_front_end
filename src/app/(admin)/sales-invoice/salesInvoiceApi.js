import { apiSlice } from "@/store/features/apiSlice";

// Finance > Sales Invoice: the list of every invoice.  Backend: GET /invoice/list  (invoice.routes.js, mounted at /invoice)
const salesInvoiceApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSalesInvoices: builder.query({            // { q, status, from, to, page, pageSize }
      query: (p = {}) => ({ url: "/invoice/list", params: Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v != null)) }),
      providesTags: ["Evidence"],                // the invoice window invalidates "Evidence" when a payment is added, so this list refreshes
    }),
    createSaleInvoice: builder.mutation({        // { customerId?, customerName, phone?, regNo?, notes?, lines: [{ partId?, description?, qty, unitPrice? }] } -> { id, ref, invoiceNo }
      query: (body) => ({ url: "/invoice/sale", method: "POST", body }),
      invalidatesTags: ["Evidence"],
    }),
    searchSaleParts: builder.query({             // q -> inventory items with price and available stock
      query: (q = "") => ({ url: "/invoice/sale-parts", params: q ? { q } : {} }),
    }),
    searchSaleServices: builder.query({          // q -> department repair types (department, parent, name, price)
      query: (q = "") => ({ url: "/invoice/sale-services", params: q ? { q } : {} }),
    }),
    searchSaleCustomers: builder.query({         // q -> existing customers
      query: (q = "") => ({ url: "/invoice/sale-customers", params: q ? { q } : {} }),
    }),
  }),
});

export const { useGetSalesInvoicesQuery, useCreateSaleInvoiceMutation, useSearchSalePartsQuery, useSearchSaleCustomersQuery, useSearchSaleServicesQuery } = salesInvoiceApi;