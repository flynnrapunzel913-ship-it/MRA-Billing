import { create } from "zustand";
import {
  calculateInvoiceTotals,
  calculatePaymentAmounts,
  lineTotal,
  type InvoiceLineItem,
} from "@/lib/invoice-utils";
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
  customerAddress: string;
  saveCustomer: boolean;
  invoiceDate: string;
  notes: string;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType | null;
  amountPaid: number;
  items: InvoiceLineItem[];
  setCustomerName: (name: string) => void;
  setCustomerMobile: (mobile: string) => void;
  setCustomerAddress: (address: string) => void;
  setSaveCustomer: (save: boolean) => void;
  setInvoiceDate: (date: string) => void;
  setNotes: (notes: string) => void;
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
  customerAddress: "",
  saveCustomer: false,
  invoiceDate: today,
  notes: "",
  paymentStatus: "FULLY_PAID",
  paymentMethod: null,
  amountPaid: 0,
  items: [defaultItem()],
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerMobile: (customerMobile) => set({ customerMobile }),
  setCustomerAddress: (customerAddress) => set({ customerAddress }),
  setSaveCustomer: (saveCustomer) => set({ saveCustomer }),
  setInvoiceDate: (invoiceDate) => set({ invoiceDate }),
  setNotes: (notes) => set({ notes }),
  setPaymentStatus: (paymentStatus) => set({ paymentStatus }),
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
      customerAddress: "",
      saveCustomer: false,
      invoiceDate: today,
      notes: "",
      paymentStatus: "FULLY_PAID",
      paymentMethod: null,
      amountPaid: 0,
      items: [defaultItem()],
    }),
}));

export { lineTotal };
