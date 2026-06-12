import { z } from "zod";

export const agencySchema = z.object({
   id: z.number().optional(),
   name: z.string(),
});
export type Agency = z.infer<typeof agencySchema>;

export const userSchema = z.object({
   id: z.number().optional(),
   email: z.string().email(),
   name: z.string(),
   agency_id: z.number().optional(),
});
export type User = z.infer<typeof userSchema>;

export type Customer = any;
export type Receiver = any;
export type Customs = any;
export type Provider = any;
export type Service = any;
export type ShippingRate = any;
export type Order = any;
export type Payment = any;
export type Product = any;
export type Discount = any;
export type ParcelStatus = string;
export type FinancialDashboard = any;
export type DailyClosing = any;
export type DispatchPaymentCreate = any;
export type Port = any;
export type ShippingLine = any;

// Tracking / Packages
export interface TrackingEvent {
   locationId?: number;
   updatedAt?: string;
   timestamp?: string;
   created_at?: string;
   location?: string | null;
   status?: string;
   statusCode?: string;
   statusName?: string;
   status_details?: string;
   statusDescription?: string;
   notes?: string | null;
}

export interface TrackingParcel {
   hbl: string;
   tracking_number?: string;
   weight: string;
   description: string;
   status?: string;
   events: TrackingEvent[];
   photos?: string[];
   latitude?: string | number;
   longitude?: string | number;
}

export interface TrackingResponse {
   invoiceId?: number;
   orderId?: number;
   order_id?: number;
   agency: string;
   province: string | { name: string };
   city: string | { name: string };
   status?: string;
   weight?: string;
   parcels: TrackingParcel[];
}
