export type PackageStatus = 'in_transit' | 'delivered' | 'pending' | 'customs' | 'returned' | 'out_for_delivery';

export interface TimelineEvent {
  id: string;
  status: string;
  location: string;
  timestamp: string;
  date: string;
  note?: string;
}

export interface FinancialInfo {
  subtotal: number;
  shipping: number;
  insurance: number;
  customs: number;
  duties: number;
  total: number;
  currency: string;
  paid: boolean;
  paymentMethod?: string;
  invoiceId?: string;
}

export interface Package {
  id: string;
  trackingNumber: string;
  qrCode: string;
  description: string;
  sender: string;
  recipient: string;
  origin: string;
  destination: string;
  status: PackageStatus;
  weight: string;
  dimensions: string;
  carrier: string;
  service: string;
  estimatedDelivery: string;
  timeline: TimelineEvent[];
  financial: FinancialInfo;
  items: number;
  fragile: boolean;
  priority: 'standard' | 'express' | 'overnight';
}

export const MOCK_PACKAGES: Package[] = [
  {
    id: 'PKG001',
    trackingNumber: 'CT-2024-09182736',
    qrCode: 'CT2024091827360001',
    description: 'Electronics – Laptop & Accessories',
    sender: 'TechSupplies Corp.',
    recipient: 'Juan García',
    origin: 'Shenzhen, CN',
    destination: 'Miami, FL, US',
    status: 'customs',
    weight: '3.4 kg',
    dimensions: '45 × 32 × 12 cm',
    carrier: 'DHL Express',
    service: 'International Express',
    estimatedDelivery: 'Feb 28, 2026',
    items: 4,
    fragile: true,
    priority: 'express',
    timeline: [
      { id: 't1', status: 'Package Created', location: 'Shenzhen, CN', timestamp: '09:00', date: 'Feb 20' },
      { id: 't2', status: 'Picked Up', location: 'Shenzhen DHL Hub', timestamp: '14:30', date: 'Feb 20' },
      { id: 't3', status: 'Departed Origin', location: 'Guangzhou Airport', timestamp: '23:15', date: 'Feb 20' },
      { id: 't4', status: 'Arrived at Hub', location: 'Cincinnati, OH', timestamp: '07:40', date: 'Feb 22' },
      { id: 't5', status: 'In Transit', location: 'Miami Int\'l Airport', timestamp: '11:20', date: 'Feb 23' },
      { id: 't6', status: 'Customs Inspection', location: 'Miami CBP Office', timestamp: '09:00', date: 'Feb 24', note: 'Under review – Est. clearance 48h' },
    ],
    financial: {
      subtotal: 1849.99,
      shipping: 89.50,
      insurance: 18.50,
      customs: 0,
      duties: 277.50,
      total: 2235.49,
      currency: 'USD',
      paid: false,
      paymentMethod: 'Invoice',
      invoiceId: 'INV-2024-0092',
    },
  },
  {
    id: 'PKG002',
    trackingNumber: 'CT-2024-08374629',
    qrCode: 'CT2024083746290002',
    description: 'Apparel – Clothing Bundle',
    sender: 'FashionHub LA',
    recipient: 'María López',
    origin: 'Los Angeles, CA',
    destination: 'Bogotá, CO',
    status: 'out_for_delivery',
    weight: '2.1 kg',
    dimensions: '55 × 40 × 15 cm',
    carrier: 'FedEx International',
    service: 'Economy International',
    estimatedDelivery: 'Feb 27, 2026',
    items: 12,
    fragile: false,
    priority: 'standard',
    timeline: [
      { id: 't1', status: 'Order Placed', location: 'Los Angeles, CA', timestamp: '10:00', date: 'Feb 18' },
      { id: 't2', status: 'Processing', location: 'FashionHub Warehouse', timestamp: '16:00', date: 'Feb 18' },
      { id: 't3', status: 'Shipped', location: 'LAX FedEx Hub', timestamp: '08:30', date: 'Feb 19' },
      { id: 't4', status: 'International Departure', location: 'LAX Airport', timestamp: '22:00', date: 'Feb 19' },
      { id: 't5', status: 'Customs Cleared', location: 'Bogotá, CO', timestamp: '06:00', date: 'Feb 24' },
      { id: 't6', status: 'Out for Delivery', location: 'Bogotá Delivery Hub', timestamp: '08:00', date: 'Feb 27', note: 'Driver assigned – Est. 2:00 PM' },
    ],
    financial: {
      subtotal: 342.00,
      shipping: 45.00,
      insurance: 3.42,
      customs: 51.30,
      duties: 0,
      total: 441.72,
      currency: 'USD',
      paid: true,
      paymentMethod: 'Credit Card •••• 4242',
      invoiceId: 'INV-2024-0085',
    },
  },
  {
    id: 'PKG003',
    trackingNumber: 'CT-2024-07193847',
    qrCode: 'CT2024071938470003',
    description: 'Auto Parts – Engine Components',
    sender: 'AutoParts Pro',
    recipient: 'Carlos Mendez',
    origin: 'Detroit, MI',
    destination: 'Mexico City, MX',
    status: 'in_transit',
    weight: '18.5 kg',
    dimensions: '80 × 60 × 40 cm',
    carrier: 'UPS Freight',
    service: 'Ground International',
    estimatedDelivery: 'Mar 3, 2026',
    items: 3,
    fragile: false,
    priority: 'standard',
    timeline: [
      { id: 't1', status: 'Order Confirmed', location: 'Detroit, MI', timestamp: '11:00', date: 'Feb 23' },
      { id: 't2', status: 'Picked Up', location: 'Detroit UPS Center', timestamp: '15:00', date: 'Feb 23' },
      { id: 't3', status: 'In Transit', location: 'Dallas, TX Hub', timestamp: '04:00', date: 'Feb 25' },
    ],
    financial: {
      subtotal: 1200.00,
      shipping: 165.00,
      insurance: 12.00,
      customs: 0,
      duties: 120.00,
      total: 1497.00,
      currency: 'USD',
      paid: true,
      paymentMethod: 'Bank Transfer',
      invoiceId: 'INV-2024-0079',
    },
  },
  {
    id: 'PKG004',
    trackingNumber: 'CT-2024-06283746',
    qrCode: 'CT2024062837460004',
    description: 'Medical Supplies – Diagnostic Equipment',
    sender: 'MedEquip Solutions',
    recipient: 'Hospital Nacional',
    origin: 'Frankfurt, DE',
    destination: 'San José, CR',
    status: 'pending',
    weight: '7.2 kg',
    dimensions: '60 × 45 × 30 cm',
    carrier: 'Lufthansa Cargo',
    service: 'Priority Air',
    estimatedDelivery: 'Mar 5, 2026',
    items: 6,
    fragile: true,
    priority: 'overnight',
    timeline: [
      { id: 't1', status: 'Order Placed', location: 'Frankfurt, DE', timestamp: '09:00', date: 'Feb 26' },
      { id: 't2', status: 'Awaiting Pickup', location: 'Frankfurt Hub', timestamp: '12:00', date: 'Feb 26', note: 'Export documentation pending' },
    ],
    financial: {
      subtotal: 8750.00,
      shipping: 420.00,
      insurance: 87.50,
      customs: 0,
      duties: 0,
      total: 9257.50,
      currency: 'EUR',
      paid: false,
      paymentMethod: 'Wire Transfer',
      invoiceId: 'INV-2024-0077',
    },
  },
  {
    id: 'PKG005',
    trackingNumber: 'CT-2024-05192837',
    qrCode: 'CT2024051928370005',
    description: 'Books & Educational Material',
    sender: 'Academic Publishers',
    recipient: 'Universidad Central',
    origin: 'New York, NY',
    destination: 'Lima, PE',
    status: 'delivered',
    weight: '12.0 kg',
    dimensions: '70 × 50 × 35 cm',
    carrier: 'USPS International',
    service: 'Priority Mail Intl',
    estimatedDelivery: 'Feb 22, 2026',
    items: 30,
    fragile: false,
    priority: 'standard',
    timeline: [
      { id: 't1', status: 'Shipped', location: 'New York, NY', timestamp: '10:00', date: 'Feb 14' },
      { id: 't2', status: 'Departed US', location: 'JFK Airport', timestamp: '18:00', date: 'Feb 14' },
      { id: 't3', status: 'Customs Cleared', location: 'Lima Airport', timestamp: '07:30', date: 'Feb 19' },
      { id: 't4', status: 'Out for Delivery', location: 'Lima Central Hub', timestamp: '09:00', date: 'Feb 22' },
      { id: 't5', status: 'Delivered', location: 'Universidad Central, Lima', timestamp: '14:25', date: 'Feb 22', note: 'Signed by: Secretaría' },
    ],
    financial: {
      subtotal: 480.00,
      shipping: 95.00,
      insurance: 4.80,
      customs: 48.00,
      duties: 0,
      total: 627.80,
      currency: 'USD',
      paid: true,
      paymentMethod: 'Credit Card •••• 8821',
      invoiceId: 'INV-2024-0068',
    },
  },
  {
    id: 'PKG006',
    trackingNumber: 'CT-2024-04182736',
    qrCode: 'CT2024041827360006',
    description: 'Household Items – Kitchen Appliances',
    sender: 'HomeGoods Direct',
    recipient: 'Ana Martínez',
    origin: 'Chicago, IL',
    destination: 'Buenos Aires, AR',
    status: 'returned',
    weight: '8.3 kg',
    dimensions: '65 × 48 × 38 cm',
    carrier: 'DHL Express',
    service: 'International Standard',
    estimatedDelivery: 'Feb 15, 2026',
    items: 2,
    fragile: true,
    priority: 'standard',
    timeline: [
      { id: 't1', status: 'Shipped', location: 'Chicago, IL', timestamp: '08:00', date: 'Feb 8' },
      { id: 't2', status: 'In Transit', location: 'Miami Hub', timestamp: '16:00', date: 'Feb 9' },
      { id: 't3', status: 'Customs Hold', location: 'Buenos Aires Customs', timestamp: '10:00', date: 'Feb 13', note: 'Restricted item – documentation required' },
      { id: 't4', status: 'Return Initiated', location: 'Buenos Aires Port', timestamp: '14:00', date: 'Feb 14', note: 'Returned to sender – customs rejected' },
      { id: 't5', status: 'Returned', location: 'Chicago, IL', timestamp: '11:30', date: 'Feb 20' },
    ],
    financial: {
      subtotal: 620.00,
      shipping: 78.00,
      insurance: 6.20,
      customs: 0,
      duties: 0,
      total: 704.20,
      currency: 'USD',
      paid: true,
      paymentMethod: 'Credit Card •••• 5571',
      invoiceId: 'INV-2024-0058',
    },
  },
];

export const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string; dimColor: string; icon: string }> = {
  in_transit: { label: 'In Transit', color: '#00D4FF', dimColor: 'rgba(0,212,255,0.12)', icon: 'airplane' },
  delivered: { label: 'Delivered', color: '#10B981', dimColor: 'rgba(16,185,129,0.12)', icon: 'checkmark-circle' },
  pending: { label: 'Pending', color: '#F59E0B', dimColor: 'rgba(245,158,11,0.12)', icon: 'time' },
  customs: { label: 'Customs', color: '#8B5CF6', dimColor: 'rgba(139,92,246,0.12)', icon: 'shield-checkmark' },
  returned: { label: 'Returned', color: '#EF4444', dimColor: 'rgba(239,68,68,0.12)', icon: 'return-down-back' },
  out_for_delivery: { label: 'Out for Delivery', color: '#F59E0B', dimColor: 'rgba(245,158,11,0.12)', icon: 'bicycle' },
};

export const FINANCIAL_SUMMARY = {
  totalOutstanding: 11492.99,
  totalPaid: 3270.72,
  totalCustomsDue: 277.50,
  activeShipments: 4,
  deliveredThisMonth: 1,
  inCustoms: 1,
};
