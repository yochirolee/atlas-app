import axios from "axios";
import {
   type Customer,
   type Receiver,
   type Customs,
   type Agency,
   type Provider,
   type Service,
   type ShippingRate,
   type Order,
   type Payment,
   type User,
   type Product,
   agencySchema,
   userSchema,
   type Discount,
   type ParcelStatus,
   type FinancialDashboard,
   type DailyClosing,
   type DispatchPaymentCreate,
   type Port,
   type ShippingLine,
} from "@/data/types";
import { useAppStore } from "@/stores/app-store";
import { z } from "zod";

const createAgencyFormSchema = z.object({
   agency: agencySchema,
   user: userSchema,
});

export type CreateAgencyFormSchema = z.infer<typeof createAgencyFormSchema>;
const isDev = process.env.NODE_ENV === "development";
const config = {
   baseURL:
      process.env.EXPO_PUBLIC_API_URL || (isDev ? "http://10.1.10.214:3000/api/v1" : "https://api.ctenvios.com/api/v1"),
   headers: { "Content-Type": "application/json" },
};
console.log("API Base URL:", config.baseURL);

export const axiosInstance = axios.create(config);

// Add request interceptor to include session token in headers
axiosInstance.interceptors.request.use(
   async (config) => {
      try {
         // Get the current session
         const token = useAppStore.getState().session?.token;
         // If we have a session, include the session token in the headers
         if (token) {
            config.headers.Authorization = `Bearer ${token}`;
         }
      } catch (error) {
         console.error("Error al obtener la sesión", error);
      }

      return config;
   },

   (error) => {
      return Promise.reject(error);
   },
);

// Add response interceptor for better error handling with React Query
axiosInstance.interceptors.response.use(
   (response) => {
      return response;
   },
   (error) => {
      // Handle 401 Unauthorized responses
      if (error.response?.status === 401) {
         useAppStore.setState({ session: null, user: null, agency: null });
         // In React Native, navigate to login by using expo-router or state
      }

      // Let React Query handle the error
      return Promise.reject(error);
   },
);

const api = {
   tracking: {
      lookup: async (tracking_number: string) => {
         const response = await axiosInstance.get(`/parcels/${tracking_number}/tracking`);
         return response.data;
      },
   },
   customer: {
      get: async (page: number | 0, limit: number | 50) => {
         const response = await axiosInstance.get("/customers", {
            params: {
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      getReceivers: async (customerId: number, page: number | 0, limit: number | 50) => {
         const response = await axiosInstance.get(`/customers/${customerId}/receivers`, {
            params: {
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      search: async (query: string, page: number | 0, limit: number | 50) => {
         if (query === "" || query === undefined) {
            const response = await axiosInstance.get("/customers", {
               params: {
                  page: page + 1,
                  limit: limit,
               },
            });
            return response.data;
         }
         const response = await axiosInstance.get("/customers/search", {
            params: {
               query,
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      create: async (data: Customer) => {
         const response = await axiosInstance.post("/customers", data);
         return response.data;
      },
      update: async (id: number, data: Customer) => {
         const response = await axiosInstance.put(`/customers/${id}`, data);
         return response.data;
      },
   },
   provinces: {
      get: async () => {
         const response = await axiosInstance.get("/provinces");
         return response.data;
      },
   },
   receivers: {
      get: async (page: number | 0, limit: number | 50) => {
         const response = await axiosInstance.get("/receivers", {
            params: {
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      getByCI: async (ci: string) => {
         const response = await axiosInstance.get(`/receivers/ci/${ci}`);
         return response.data;
      },
      search: async (query: string, page: number | 0, limit: number | 50) => {
         if (query === "" || query === undefined) {
            const response = await axiosInstance.get("/receivers", {
               params: {
                  page: page + 1,
                  limit: limit,
               },
            });
            return response.data;
         }
         const response = await axiosInstance.get("/receivers/search", {
            params: {
               query,
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      create: async (data: Receiver, customerId?: number) => {
         const response = await axiosInstance.post("/receivers", data, {
            params: {
               customerId,
            },
         });
         return response.data;
      },
      update: async (id: number, data: Receiver) => {
         const response = await axiosInstance.put(`/receivers/${id}`, data);
         return response.data;
      },
   },
   orders: {
      search: async (
         search: string,
         page: number | 1,
         limit: number | 20,
         startDate: string,
         endDate: string,
         payment_status?: string,
         agency_id?: number,
      ) => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit: limit,
         };
         if (search) params.search = search;
         if (startDate) params.startDate = startDate;
         if (endDate) params.endDate = endDate;
         if (payment_status) params.payment_status = payment_status;
         if (agency_id) params.agency_id = agency_id;

         const response = await axiosInstance.get("/orders", { params });
         return response.data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/orders/${id}`);
         return response.data;
      },
      getParcelsByOrderId: async (order_id: number) => {
         const response = await axiosInstance.get(`/orders/${order_id}/parcels`);
         return response.data;
      },
      create: async (data: Order) => {
         const response = await axiosInstance.post("/orders", data);
         return response.data;
      },
      getHistory: async (order_id: number) => {
         const response = await axiosInstance.get(`/orders/${order_id}/history`);
         return response.data;
      },
      payOrder: async (order_id: number, data: Payment) => {
         const response = await axiosInstance.post(`/orders/${order_id}/payments`, data);
         return response.data;
      },
      deletePayment: async (payment_id: number) => {
         const response = await axiosInstance.delete(`/orders/${payment_id}/payments`);
         return response.data;
      },
      delete: async (order_id: number, reason: string) => {
         const response = await axiosInstance.delete(`/orders/${order_id}`, {
            data: {
               reason,
            },
         });
         return response.data;
      },
      restore: async (order_id: number) => {
         const response = await axiosInstance.post(`/orders/${order_id}/restore`);
         return response.data;
      },
      deleteDiscount: async (discount_id: number) => {
         const response = await axiosInstance.delete(`/orders/${discount_id}/discounts`);
         return response.data;
      },
      createDiscount: async (order_id: number, data: Discount) => {
         const response = await axiosInstance.post(`/orders/${order_id}/discounts`, data);
         return response.data;
      },
   },
   users: {
      get: async (page: number | 1, limit: number | 25) => {
         const response = await axiosInstance.get("/users", {
            params: {
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      create: async (data: User) => {
         const response = await axiosInstance.post("/users/sign-up/email", data);
         return response.data;
      },
      getSession: async () => {
         const response = await axiosInstance.get("/users/get-session");
         return response.data;
      },
      signIn: async (email: string, password: string) => {
         const response = await axiosInstance.post("/users/sign-in/email", {
            email,
            password,
         });
         return response.data;
      },
      signOut: async () => {
         const response = await axiosInstance.post("/users/sign-out");
         return response.data;
      },
      resetPassword: async (token: string, newPassword: string) => {
         const response = await axiosInstance.post("/users/reset-password", {
            token,
            newPassword,
         });
         return response.data;
      },
      forgotPassword: async (email: string) => {
         const response = await axiosInstance.post("/users/forgot-password", { email });
         return response.data;
      },
      update: async (id: number, data: User) => {
         const response = await axiosInstance.put(`/users/${id}`, data);
         return response.data;
      },
      deleteSelf: async () => {
         const response = await axiosInstance.delete("/users/self");
         return response.data;
      },
   },
   providers: {
      get: async () => {
         const response = await axiosInstance.get("/providers");
         return response.data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/providers/${id}`);
         return response.data;
      },
      create: async (data: Provider) => {
         const response = await axiosInstance.post("/providers", data);
         return response.data;
      },
   },
   agencies: {
      get: async () => {
         const response = await axiosInstance.get("/agencies");
         return response.data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/agencies/${id}`);
         return response.data;
      },
      getUsers: async (id: number) => {
         const response = await axiosInstance.get(`/agencies/${id}/users`);
         return response.data;
      },
      search: async (query: string, page: number | 1, limit: number | 50) => {
         const response = await axiosInstance.get("/agencies/search", {
            params: {
               query,
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      create: async (data: CreateAgencyFormSchema) => {
         const response = await axiosInstance.post("/agencies", data);
         return response.data;
      },
      update: async (id: number, data: Agency) => {
         const response = await axiosInstance.put(`/agencies/${id}`, data);
         return response.data;
      },
      servicesWithRates: async (id: number) => {
         const response = await axiosInstance.get(`/agencies/${id}/services-with-rates`);
         return response.data;
      },
      getActiveServicesWithRates: async (id: number) => {
         const response = await axiosInstance.get(`/agencies/${id}/active-services-with-rates`);
         return response.data;
      },
      getIntegrations: async (agencyId: number) => {
         const response = await axiosInstance.get(`/partners/admin/agency/${agencyId}`);
         return response.data;
      },
      uploadLogo: async (agencyId: number, file: File | any) => {
         const formData = new FormData();
         formData.append("logo", file as any);
         const response = await axiosInstance.post(`/agencies/${agencyId}/logo`, formData, {
            headers: {
               "Content-Type": "multipart/form-data",
            },
         });
         return response.data;
      },
      deleteLogo: async (agencyId: number) => {
         const response = await axiosInstance.delete(`/agencies/${agencyId}/logo`);
         return response.data;
      },
   },
   partners: {
      createAdmin: async (data: {
         name: string;
         email: string;
         contact_name: string;
         phone: string;
         agency_id: number;
         rate_limit: number;
         forwarder_id: number;
      }) => {
         const response = await axiosInstance.post("/partners/admin", data);
         return response.data;
      },
      getApiKeys: async (partnerId: number) => {
         const response = await axiosInstance.get(`/partners/admin/${partnerId}/api-keys`);
         return response.data;
      },
      createApiKey: async (
         partnerId: number,
         data?: { name?: string; environment?: string; expires_in_days?: number },
      ) => {
         const response = await axiosInstance.post(`/partners/admin/${partnerId}/api-keys`, data ?? {});
         return response.data;
      },
   },
   customs: {
      get: async (page: number | 1, limit: number | 25) => {
         const response = await axiosInstance.get("/customs-rates", {
            params: {
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      search: async (query: string, page: number | 1, limit: number | 25) => {
         const response = await axiosInstance.get("/customs-rates/search", {
            params: {
               query,
               page: page + 1,
               limit: limit,
            },
         });
         return response.data;
      },
      create: async (data: Customs) => {
         const response = await axiosInstance.post("/customs-rates", data);
         return response.data;
      },
      update: async (id: number, data: Customs) => {
         const response = await axiosInstance.put(`/customs-rates/${id}`, data);
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/customs-rates/${id}`);
         return response.data;
      },
   },
   ports: {
      get: async (page: number = 0, limit: number = 25) => {
         const response = await axiosInstance.get("/ports", {
            params: { page: page + 1, limit },
         });
         const data = response.data;
         if (Array.isArray(data)) {
            return { rows: data, total: data.length };
         }
         return data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/ports/${id}`);
         return response.data;
      },
      create: async (data: Port) => {
         const response = await axiosInstance.post("/ports", data);
         return response.data;
      },
      update: async (id: number, data: Partial<Port>) => {
         const response = await axiosInstance.put(`/ports/${id}`, data);
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/ports/${id}`);
         return response.data;
      },
   },
   shippingLines: {
      get: async (page: number = 0, limit: number = 25) => {
         const response = await axiosInstance.get("/shipping-lines", {
            params: { page: page + 1, limit },
         });
         const data = response.data;
         if (Array.isArray(data)) {
            return { rows: data, total: data.length };
         }
         return data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/shipping-lines/${id}`);
         return response.data;
      },
      create: async (data: ShippingLine) => {
         const response = await axiosInstance.post("/shipping-lines", data);
         return response.data;
      },
      update: async (id: number, data: Partial<ShippingLine>) => {
         const response = await axiosInstance.put(`/shipping-lines/${id}`, data);
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/shipping-lines/${id}`);
         return response.data;
      },
   },
   services: {
      create: async (data: Service) => {
         const response = await axiosInstance.post("/services", data);
         return response.data;
      },
      update: async (id: number, data: Service) => {
         const response = await axiosInstance.put(`/services/${id}`, data);
         return response.data;
      },
   },
   shippingRates: {
      create: async (data: ShippingRate) => {
         const response = await axiosInstance.post("/shipping-rates", data);
         return response.data;
      },
      update: async (rate_id: number, data: ShippingRate) => {
         const response = await axiosInstance.put(`/shipping-rates/${rate_id}`, data);
         return response.data;
      },
      toggleStatus: async (rate_id: number, is_active: boolean) => {
         const response = await axiosInstance.patch(`/shipping-rates/${rate_id}/change-status`, { is_active });
         return response.data;
      },
   },
   roles: {
      get: async () => {
         const response = await axiosInstance.get("/roles");
         return response.data;
      },
   },
   analytics: {
      getPackagesWeightByAgency: async () => {
         const response = await axiosInstance.get("/analytics/packages-weight-in-agencies");
         return response.data;
      },
      getSales: async () => {
         const response = await axiosInstance.get("/analytics/sales");
         return response.data;
      },
      getSalesByYear: async (year: number, agencyId?: number) => {
         const params: Record<string, number> = { year };
         if (agencyId != null) params.agency_id = agencyId;
         const response = await axiosInstance.get("/analytics/sales", { params });
         return response.data;
      },
      getDailySalesByAgency: async () => {
         const response = await axiosInstance.get("/analytics/daily-sales-by-agency");
         return response.data;
      },
      getDailySalesByAgencyInRange: async (params: {
         year: number;
         startDate: string;
         endDate: string;
         agencyId?: number;
      }) => {
         const requestParams: Record<string, string | number> = {
            year: params.year,
            startDate: params.startDate,
            endDate: params.endDate,
         };
         if (params.agencyId != null) requestParams.agency_id = params.agencyId;
         const response = await axiosInstance.get("/analytics/sales/daily/agency", {
            params: requestParams,
         });
         return response.data;
      },
   },
   financialReports: {
      getDashboard: async (): Promise<FinancialDashboard> => {
         const response = await axiosInstance.get("/financial-reports/dashboard");
         return response.data;
      },
      getDailyClosing: async (filters?: {
         date?: string;
         period?: "day" | "week" | "month";
         start_date?: string;
         end_date?: string;
         timezone?: string;
         user_id?: string;
         agency_id?: number;
      }): Promise<DailyClosing> => {
         const response = await axiosInstance.get("/financial-reports/daily-closing", {
            params: filters,
         });
         return response.data;
      },
      getSalesReportPdf: async (filters?: {
         date?: string;
         period?: "day" | "week" | "month";
         start_date?: string;
         end_date?: string;
         timezone?: string;
         user_id?: string;
         agency_id?: number;
      }): Promise<Blob> => {
         const response = await axiosInstance.get("/financial-reports/sales-report/pdf", {
            params: filters,
            responseType: "blob",
         });
         return response.data;
      },
      getSalesByUser: async (params: { agency_id: number; period: "day" | "week" | "month" | "year" }) => {
         const response = await axiosInstance.get("/financial-reports/sales/user", {
            params,
         });
         return response.data;
      },
   },
   products: {
      get: async () => {
         const response = await axiosInstance.get("/products");
         return response.data;
      },
      create: async (data: Product) => {
         const response = await axiosInstance.post("/products", data);
         return response.data;
      },
      update: async (id: number, data: Product) => {
         const response = await axiosInstance.put(`/products/${id}`, data);
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/products/${id}`);
         return response.data;
      },
      addService: async (product_id: number, service_id: number) => {
         const response = await axiosInstance.post(`/products/${product_id}/connect-service`, { service_id });
         return response.data;
      },
   },
   dispatch: {
      get: async (
         page: number = 1,
         limit: number = 25,
         status?: string,
         payment_status?: string,
         dispatch_id?: number,
         agency_id?: number,
      ) => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit: limit,
         };
         if (status) {
            params.status = status;
         }
         if (payment_status) {
            params.payment_status = payment_status;
         }
         if (dispatch_id) {
            params.dispatch_id = dispatch_id;
         }
         if (agency_id) {
            params.agency_id = agency_id;
         }
         const response = await axiosInstance.get("/dispatches", { params });
         return response.data;
      },
      getById: async (dispatch_id: number) => {
         const response = await axiosInstance.get(`/dispatches/${dispatch_id}`);
         return response.data;
      },
      create: async () => {
         const response = await axiosInstance.post("/dispatches");
         return response.data;
      },
      deleteDispatch: async (dispatch_id: number) => {
         const response = await axiosInstance.delete(`/dispatches/${dispatch_id}`);
         return response.data;
      },
      addParcelByScan: async (dispatch_id: number, scannedValue: string) => {
         const response = await axiosInstance.post(`/dispatches/${dispatch_id}/add-by-scan`, {
            scanned_value: scannedValue,
         });
         return response.data;
      },
      removeParcel: async (dispatch_id: number, hbl: string) => {
         const response = await axiosInstance.delete(`/dispatches/${dispatch_id}/remove-parcel/${hbl}`);
         return response.data;
      },
      readyForDispatch: async (page: number = 1, limit: number = 20) => {
         const response = await axiosInstance.get(`/dispatches/ready-for-dispatch`, {
            params: {
               page,
               limit,
            },
         });
         return response.data;
      },
      getParcelsByDispatchId: async (
         dispatch_id: number,
         page: number = 1,
         limit: number = 20,
         status?: ParcelStatus,
      ) => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit,
         };

         if (status) {
            params.status = status;
         }

         const response = await axiosInstance.get(`/dispatches/${dispatch_id}/parcels`, {
            params,
         });
         return response.data;
      },
      finalizeCreate: async (dispatch_id: number) => {
         const response = await axiosInstance.post(`/dispatches/${dispatch_id}/finalize-create`);
         return response.data;
      },
      createFromParcels: async (tracking_numbers: string[]) => {
         const response = await axiosInstance.post(`/dispatches/receive-parcels`, { tracking_numbers });
         return response.data;
      },
      receiveParcel: async (dispatch_id: number, tracking_number: string) => {
         const response = await axiosInstance.post(`/dispatches/${dispatch_id}/receive-parcel`, { tracking_number });
         return response.data;
      },
      completeReceive: async (dispatch_id: number) => {
         const response = await axiosInstance.post(`/dispatches/${dispatch_id}/complete-receive`);
         return response.data;
      },
      verifyParcel: async (tracking_number: string) => {
         const response = await axiosInstance.get(`/dispatches/verify-parcel/${tracking_number}`);
         return response.data;
      },
      smartReceive: async (tracking_numbers: string[]) => {
         const response = await axiosInstance.post(`/dispatches/smart-receive`, { tracking_numbers });
         return response.data;
      },
      getPayments: async (dispatch_id: number) => {
         const response = await axiosInstance.get(`/dispatches/${dispatch_id}/payments`);
         return response.data;
      },
      addPayment: async (dispatch_id: number, data: DispatchPaymentCreate) => {
         const response = await axiosInstance.post(`/dispatches/${dispatch_id}/payments`, data);
         return response.data;
      },
      deletePayment: async (dispatch_id: number, payment_id: number) => {
         const response = await axiosInstance.delete(`/dispatches/${dispatch_id}/payments/${payment_id}`);
         return response.data;
      },
   },
   delivery: {
      syncStop: async (data: {
         local_id: string;
         latitude: number | null;
         longitude: number | null;
         accuracy: number | null;
         photos: { url: string; public_id: string }[];
         hbls: string[];
      }) => {
         const response = await axiosInstance.post("/delivery/stops/sync", data);
         return response.data;
      },
   },
   pallets: {
      get: async (page: number | 0, limit: number | 25) => {
         const response = await axiosInstance.get("/pallets", {
            params: {
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      create: async () => {
         const response = await axiosInstance.post("/pallets");
         return response.data;
      },
      addParcelByScan: async (pallet_id: number, scannedValue: string) => {
         const response = await axiosInstance.post(`/pallets/${pallet_id}/parcels/by-scan`, {
            scanned_value: scannedValue,
         });
         return response.data;
      },
      removeParcel: async (pallet_id: number, trackingNumber: string) => {
         const response = await axiosInstance.delete(`/pallets/${pallet_id}/remove-parcel/${trackingNumber}`);
         return response.data;
      },
      readyForPallet: async (page: number = 1, limit: number = 20, agency_id?: number) => {
         const response = await axiosInstance.get(`/pallets/ready-for-pallet`, {
            params: {
               page,
               limit,
               ...(agency_id ? { agency_id } : {}),
            },
         });
         return response.data;
      },
      getParcelsByPalletId: async (pallet_id: number, page: number = 1, limit: number = 20) => {
         const response = await axiosInstance.get(`/pallets/${pallet_id}/parcels`, {
            params: {
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      delete: async (pallet_id: number) => {
         const response = await axiosInstance.delete(`/pallets/${pallet_id}`);
         return response.data;
      },
   },
   logs: {
      getAppLogs: async (
         page: number = 1,
         limit: number = 20,
         filters?: {
            level?: string;
            source?: string;
            status_code?: number;
            user_id?: string;
            path?: string;
            method?: string;
            startDate?: Date;
            endDate?: Date;
         },
      ) => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit,
         };

         if (filters) {
            if (filters.level) params.level = filters.level;
            if (filters.source) params.source = filters.source;
            if (filters.status_code !== undefined) params.status_code = filters.status_code;
            if (filters.user_id) params.user_id = filters.user_id;
            if (filters.path) params.path = filters.path;
            if (filters.method) params.method = filters.method;
            if (filters.startDate) params.startDate = filters.startDate.toISOString();
            if (filters.endDate) params.endDate = filters.endDate.toISOString();
         }

         const response = await axiosInstance.get(`/logs`, {
            params,
         });
         return response.data;
      },
      getLogById: async (id: number) => {
         const response = await axiosInstance.get(`/logs/${id}`);
         return response.data;
      },
      toggleAppLogs: async (currentAppLogsStatus: boolean) => {
         const response = await axiosInstance.put(`/config/logging-status`, {
            enabled: !currentAppLogsStatus,
         });
         return response.data;
      },
      logStatus: async () => {
         const response = await axiosInstance.get(`/config/logging-status`);
         return response.data;
      },
      deleteAllLogs: async () => {
         const response = await axiosInstance.delete(`/logs`);
         return response.data;
      },
   },
   issues: {
      getAll: async (
         page: number = 1,
         limit: number = 20,
         filters?: {
            status?: string;
            priority?: string;
            type?: string;
            order_id?: number;
            parcel_id?: number;
            assigned_to_id?: string;
            issue_id?: number;
         },
      ) => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit,
         };

         if (filters) {
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.type) params.type = filters.type;
            if (filters.order_id != null) params.order_id = filters.order_id;
            if (filters.parcel_id != null) params.parcel_id = filters.parcel_id;
            if (filters.assigned_to_id) params.assigned_to_id = filters.assigned_to_id;
            if (filters.issue_id != null) params.issue_id = filters.issue_id;
         }

         const response = await axiosInstance.get(`/issues`, {
            params,
         });
         return response.data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/issues/${id}`);
         return response.data;
      },
      create: async (data: any) => {
         const response = await axiosInstance.post(`/issues`, data);
         return response.data;
      },
      update: async (id: number, data: any) => {
         const response = await axiosInstance.patch(`/issues/${id}`, data);
         return response.data;
      },
      resolve: async (id: number, data?: { resolution_notes?: string }) => {
         const response = await axiosInstance.post(`/issues/${id}/resolve`, data || {});
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/issues/${id}`);
         return response.data;
      },
      getComments: async (id: number) => {
         const response = await axiosInstance.get(`/issues/${id}/comments`);
         return response.data;
      },
      addComment: async (id: number, data: { content: string; is_internal?: boolean }) => {
         const response = await axiosInstance.post(`/issues/${id}/comments`, data);
         return response.data;
      },
      deleteComment: async (id: number, commentId: number) => {
         const response = await axiosInstance.delete(`/issues/${id}/comments/${commentId}`);
         return response.data;
      },
      getAttachments: async (id: number) => {
         const response = await axiosInstance.get(`/issues/${id}/attachments`);
         return response.data;
      },
      addAttachment: async (id: number, data: any) => {
         const response = await axiosInstance.post(`/issues/${id}/attachments`, data);
         return response.data;
      },
      deleteAttachment: async (id: number, attachmentId: number) => {
         const response = await axiosInstance.delete(`/issues/${id}/attachments/${attachmentId}`);
         return response.data;
      },
   },
   containers: {
      get: async (page: number = 0, limit: number = 20) => {
         const response = await axiosInstance.get("/containers", {
            params: {
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      getById: async (id: number) => {
         const response = await axiosInstance.get(`/containers/${id}`);
         return response.data;
      },
      create: async (data: any) => {
         const response = await axiosInstance.post("/containers", data);
         return response.data;
      },
      update: async (id: number, data: any) => {
         const response = await axiosInstance.put(`/containers/${id}`, data);
         return response.data;
      },
      updateStatus: async (id: number, data: { status: string; location?: string; description?: string }) => {
         const response = await axiosInstance.patch(`/containers/${id}/status`, data);
         return response.data;
      },
      delete: async (id: number) => {
         const response = await axiosInstance.delete(`/containers/${id}`);
         return response.data;
      },
      addParcelByScan: async (containerId: number, scannedValue: string) => {
         const response = await axiosInstance.post(`/containers/${containerId}/parcels/by-scan`, {
            scanned_value: scannedValue,
         });
         return response.data;
      },
      removeParcel: async (containerId: number, trackingNumber: string) => {
         const response = await axiosInstance.delete(`/containers/${containerId}/parcels/${trackingNumber}`);
         return response.data;
      },
      getParcels: async (containerId: number, page: number = 0, limit: number = 20) => {
         const response = await axiosInstance.get(`/containers/${containerId}/parcels`, {
            params: {
               page: page + 1,
               limit,
            },
         });
         return response.data;
      },
      searchParcels: async (
         containerId: number,
         query: string,
         page: number = 0,
         limit: number = 20,
      ): Promise<{ rows: unknown[]; total: number }> => {
         const response = await axiosInstance.get(`/containers/${containerId}/parcels/search`, {
            params: { query, page: page + 1, limit },
         });
         return response.data;
      },
      readyForContainer: async (page: number = 1, limit: number = 20) => {
         const response = await axiosInstance.get(`/containers/ready-for-container`, {
            params: {
               page,
               limit,
            },
         });
         return response.data;
      },
   },
   parcels: {
      search: async (
         searchQuery: string,
         page: number,
         limit: number,
         status?: string,
         searchIn?: "description" | "customer" | "receiver" | "order_id" | "hbl",
      ): Promise<{ rows: unknown[]; total?: number }> => {
         const params: Record<string, string | number> = {
            page: page + 1,
            limit,
         };
         if (status && status !== "") params.status = status;
         const trimmed = (searchQuery ?? "").toString().trim();
         if (trimmed && searchIn) {
            if (searchIn === "order_id" && Number.isFinite(Number(trimmed))) {
               params.order_id = Number(trimmed);
            } else if (searchIn === "description") {
               params.description = trimmed;
            } else if (searchIn === "customer") {
               params.customer = trimmed;
            } else if (searchIn === "receiver") {
               params.receiver = trimmed;
            } else if (searchIn === "hbl") {
               params.hbl = trimmed;
            }
         }
         const response = await axiosInstance.get("/parcels", { params });
         const data = response.data as { rows?: unknown[]; total?: number };
         return { rows: data.rows ?? [], total: data.total };
      },
      updateStatus: async (parcel: { hbl: string; status: string }) => {
         const hbl = parcel.hbl?.trim();
         if (!hbl) {
            throw new Error("Cannot update parcel status without hbl");
         }
         const response = await axiosInstance.patch(`/parcels/${encodeURIComponent(hbl)}/status`, {
            status: parcel.status,
         });
         return response.data;
      },
      tracking: async (hbl: string) => {
         const response = await axiosInstance.get(`/parcels/${hbl}/tracking`);
         return response.data;
      },
   },
};

export default api;
