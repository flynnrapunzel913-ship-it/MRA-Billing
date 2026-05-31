import { create } from "zustand";
import { lineTotal, type InvoiceLineItem } from "@/lib/invoice-utils";
import {
  ITEM_TYPES,
  type ItemType,
  type PaymentStatusType,
  type PaymentMethodType,
  isCoachingPackage,
} from "@/lib/constants";

interface InvoiceFormState {
  customerName: string;
  customerMobile: string;
  invoiceDate: string;
  notes: string;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType | null;
  amountPaid: number;
  items: InvoiceLineItem[];
  setCustomerName: (name: string) => void;
  setCustomerMobile: (mobile: string) => void;
  setInvoiceDate: (date: string) => void;
  setNotes: (notes: string) => void;
  setGstEnabled: (enabled: boolean) => void;
  setCgstRate: (rate: number) => void;
  setSgstRate: (rate: number) => void;
  setPaymentStatus: (status: PaymentStatusType) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setAmountPaid: (amount: number) => void;
  addItem: (itemType?: ItemType) => void;
  updateItem: (index: number, item: InvoiceLineItem) => void;
  removeItem: (index: number) => void;
  reset: () => void;
}

const today = new Date().toISOString().split("T")[0];

const defaultItem = (itemType: ItemType = ITEM_TYPES[0]): InvoiceLineItem => ({
  itemType,
  description: "",
  quantity: 1,
  unitPrice: 0,
  packageStartDate: "",
  packageEndDate: "",
});

export const useInvoiceStore = create<InvoiceFormState>((set) => ({
  customerName: "",
  customerMobile: "",
  invoiceDate: today,
  notes: "",
  gstEnabled: true,
  cgstRate: 9,
  sgstRate: 9,
  paymentStatus: "FULLY_PAID",
  paymentMethod: null,
  amountPaid: 0,
  items: [defaultItem()],
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerMobile: (customerMobile) => set({ customerMobile }),
  setInvoiceDate: (invoiceDate) => set({ invoiceDate }),
  setNotes: (notes) => set({ notes }),
  setGstEnabled: (gstEnabled) => set({ gstEnabled }),
  setCgstRate: (cgstRate) => set({ cgstRate }),
  setSgstRate: (sgstRate) => set({ sgstRate }),
  setPaymentStatus: (paymentStatus) =>
    set((state) => ({
      paymentStatus,
      amountPaid:
        paymentStatus === "PARTIALLY_PAID"
          ? state.amountPaid
          : paymentStatus === "PENDING"
            ? 0
            : state.amountPaid,
    })),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAmountPaid: (amountPaid) => set({ amountPaid }),
  addItem: (itemType) =>
    set((state) => ({ items: [...state.items, defaultItem(itemType)] })),
  updateItem: (index, item) =>
    set((state) => {
      const next = { ...item };
      if (!isCoachingPackage(next.itemType)) {
        next.packageStartDate = "";
        next.packageEndDate = "";
      }
      return {
        items: state.items.map((existing, i) => (i === index ? next : existing)),
      };
    }),
  removeItem: (index) =>
    set((state) => ({
      items: state.items.length > 1 ? state.items.filter((_, i) => i !== index) : state.items,
    })),
  reset: () =>
    set({
      customerName: "",
      customerMobile: "",
      invoiceDate: today,
      notes: "",
      gstEnabled: true,
      cgstRate: 9,
      sgstRate: 9,
      paymentStatus: "FULLY_PAID",
      paymentMethod: null,
      amountPaid: 0,
      items: [defaultItem()],
    }),
}));

export { lineTotal };
