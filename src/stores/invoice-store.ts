import { create } from "zustand";
import { lineTotal, type InvoiceLineItem } from "@/lib/invoice-utils";
import {
  ITEM_TYPES,
  type ItemType,
  type PaymentStatusType,
  type PaymentMethodType,
  isCoachingPackage,
  COACHING_PACKAGE_TYPE,
} from "@/lib/constants";
import type { CustomerSearchResult } from "@/lib/customer-search";
import { planInvoiceDescription, type SubscriptionPlanRow } from "@/lib/subscription-plans";
import {
  calculatePackageEndDate,
  formatPlanCoverageSummary,
} from "@/lib/subscription-duration";

interface InvoiceFormState {
  customerId: string | null;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerAddress: string;
  customerGst: string;
  invoiceDate: string;
  notes: string;
  gstEnabled: boolean;
  cgstRate: number;
  sgstRate: number;
  paymentStatus: PaymentStatusType;
  paymentMethod: PaymentMethodType | null;
  amountPaid: number;
  items: InvoiceLineItem[];
  setSelectedCustomer: (customer: CustomerSearchResult) => void;
  clearSelectedCustomer: () => void;
  clearCustomerLink: () => void;
  setCustomerName: (name: string) => void;
  setCustomerMobile: (mobile: string) => void;
  setCustomerEmail: (email: string) => void;
  setCustomerAddress: (address: string) => void;
  setCustomerGst: (gst: string) => void;
  setInvoiceDate: (date: string) => void;
  setNotes: (notes: string) => void;
  setGstEnabled: (enabled: boolean) => void;
  setCgstRate: (rate: number) => void;
  setSgstRate: (rate: number) => void;
  setPaymentStatus: (status: PaymentStatusType) => void;
  setPaymentMethod: (method: PaymentMethodType) => void;
  setAmountPaid: (amount: number) => void;
  addItem: (itemType?: ItemType) => void;
  addSubscriptionFromCatalog: (item: SubscriptionPlanRow) => boolean;
  addProductFromCatalog: (item: { name: string; price: number }) => boolean;
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

function isPlaceholderItem(item: InvoiceLineItem): boolean {
  return !item.description.trim() && item.unitPrice <= 0;
}

function applyCatalogItem(
  items: InvoiceLineItem[],
  newItem: InvoiceLineItem
): InvoiceLineItem[] | null {
  if (items.length === 0) {
    return [newItem];
  }
  const placeholderIndex = items.findIndex(isPlaceholderItem);
  if (placeholderIndex >= 0) {
    return items.map((item, index) => (index === placeholderIndex ? newItem : item));
  }
  return null;
}

export const useInvoiceStore = create<InvoiceFormState>((set) => ({
  customerId: null,
  customerName: "",
  customerMobile: "",
  customerEmail: "",
  customerAddress: "",
  customerGst: "",
  invoiceDate: today,
  notes: "",
  gstEnabled: true,
  cgstRate: 0,
  sgstRate: 0,
  paymentStatus: "FULLY_PAID",
  paymentMethod: null,
  amountPaid: 0,
  items: [],
  setSelectedCustomer: (customer) =>
    set({
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile || "",
      customerEmail: customer.email || "",
      customerAddress: customer.address || "",
      customerGst: customer.gstNumber || "",
    }),
  clearSelectedCustomer: () =>
    set({
      customerId: null,
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      customerAddress: "",
      customerGst: "",
    }),
  clearCustomerLink: () =>
    set({
      customerId: null,
      customerEmail: "",
      customerAddress: "",
      customerGst: "",
    }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerMobile: (customerMobile) => set({ customerMobile }),
  setCustomerEmail: (customerEmail) => set({ customerEmail }),
  setCustomerAddress: (customerAddress) => set({ customerAddress }),
  setCustomerGst: (customerGst) => set({ customerGst }),
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
  addSubscriptionFromCatalog: (item) => {
    let added = false;
    set((state) => {
      const startDate = state.invoiceDate;
      const next = applyCatalogItem(state.items, {
        itemType: COACHING_PACKAGE_TYPE,
        description: planInvoiceDescription(item),
        quantity: 1,
        unitPrice: item.fees,
        packageStartDate: startDate,
        packageEndDate: calculatePackageEndDate(
          startDate,
          item.durationValue,
          item.durationUnit
        ),
        subscriptionPlanId: item.id,
        planNameSnapshot: item.planName,
        descriptionSnapshot: item.description ?? undefined,
        durationSnapshot: formatPlanCoverageSummary({
          usageDays: item.usageDays,
          durationValue: item.durationValue,
          durationUnit: item.durationUnit,
        }),
        durationValueSnapshot: item.durationValue,
        durationUnitSnapshot: item.durationUnit,
        usageDaysSnapshot: item.usageDays ?? undefined,
        feesSnapshot: item.fees,
      });
      if (!next) return state;
      added = true;
      return { items: next };
    });
    return added;
  },
  addProductFromCatalog: (item) => {
    let added = false;
    set((state) => {
      const next = applyCatalogItem(state.items, {
        itemType: "Accessories / Products" as ItemType,
        description: item.name,
        quantity: 1,
        unitPrice: item.price,
        packageStartDate: "",
        packageEndDate: "",
      });
      if (!next) return state;
      added = true;
      return { items: next };
    });
    return added;
  },
  updateItem: (index, item) =>
    set((state) => {
      const next = { ...item };
      if (!isCoachingPackage(next.itemType)) {
        next.packageStartDate = "";
        next.packageEndDate = "";
        next.durationValueSnapshot = undefined;
        next.durationUnitSnapshot = undefined;
        next.usageDaysSnapshot = undefined;
      } else if (next.packageStartDate && next.durationValueSnapshot && next.durationUnitSnapshot) {
        next.packageEndDate = calculatePackageEndDate(
          next.packageStartDate,
          next.durationValueSnapshot,
          next.durationUnitSnapshot
        );
      }
      return {
        items: state.items.map((existing, i) => (i === index ? next : existing)),
      };
    }),
  removeItem: (index) =>
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    })),
  reset: () =>
    set({
      customerId: null,
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      customerAddress: "",
      customerGst: "",
      invoiceDate: today,
      notes: "",
      gstEnabled: true,
      cgstRate: 0,
      sgstRate: 0,
      paymentStatus: "FULLY_PAID",
      paymentMethod: null,
      amountPaid: 0,
      items: [],
    }),
}));

export { lineTotal };
