import { z } from "zod";
import {
  ITEM_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  COACHING_PACKAGE_TYPE,
} from "@/lib/constants";
import { SUBSCRIPTION_DURATION_UNITS } from "@/lib/subscription-duration";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^\S+$/, "Username cannot contain spaces"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Minimal fields for fast receptionist customer creation */
export const quickCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine(
      (val) => /^\d{10}$/.test(val.replace(/\D/g, "")),
      "Enter a 10-digit mobile number"
    ),
});

export const customerSchema = quickCustomerSchema.extend({
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  parentName: z.string().optional(),
  gstNumber: z.string().optional(),
  membershipId: z.string().optional(),
  dateJoined: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

export const invoiceItemSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  packageStartDate: z.string().optional(),
  packageEndDate: z.string().optional(),
  subscriptionPlanId: z.string().optional(),
  planNameSnapshot: z.string().optional(),
  descriptionSnapshot: z.string().optional(),
  durationSnapshot: z.string().optional(),
  durationValueSnapshot: z.number().int().positive().optional(),
  durationUnitSnapshot: z.enum(SUBSCRIPTION_DURATION_UNITS).optional(),
  usageDaysSnapshot: z.number().int().positive().optional(),
  feesSnapshot: z.number().nonnegative().optional(),
});

export const invoiceSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(2, "Customer name is required"),
    customerMobile: z.string().optional(),
    customerAddress: z.string().optional(),
    customerGst: z.string().optional(),
    invoiceDate: z.string(),
    notes: z.string().optional(),
    gstEnabled: z.boolean().optional(),
    cgstRate: z.number().min(0).max(100).optional(),
    sgstRate: z.number().min(0).max(100).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES),
    paymentMethod: z.enum(PAYMENT_METHODS),
    amountPaid: z.number().nonnegative().optional(),
    items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === "PARTIALLY_PAID") {
      if (data.amountPaid === undefined || data.amountPaid <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter amount paid for partial payment",
          path: ["amountPaid"],
        });
      }
    }

    data.items.forEach((item, index) => {
      if (item.itemType !== COACHING_PACKAGE_TYPE) return;

      if (item.packageStartDate && item.packageEndDate) {
        const start = new Date(item.packageStartDate);
        const end = new Date(item.packageEndDate);
        if (end < start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End date must be on or after start date",
            path: ["items", index, "packageEndDate"],
          });
        }
      }
    });
  });

const settingsOptionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (value == null ? undefined : value));

const settingsNumber = z.preprocess(
  (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  },
  z.number().min(0).max(100)
);

export const settingsSchema = z.object({
  academyName: z.string().min(2, "Academy name must be at least 2 characters"),
  address: z.string(),
  phonePrimary: z.string(),
  phoneSecondary: settingsOptionalString,
  email: z.string().email("Enter a valid email").or(z.literal("")),
  website: settingsOptionalString,
  gstNumber: z.string(),
  gstEnabled: z.boolean(),
  defaultCgstRate: settingsNumber,
  defaultSgstRate: settingsNumber,
  bankName: settingsOptionalString,
  bankAccount: settingsOptionalString,
  bankIfsc: settingsOptionalString,
  bankBranch: settingsOptionalString,
  upiId: settingsOptionalString,
  upiQrCode: settingsOptionalString,
  logoUrl: z.string(),
  signatureUrl: settingsOptionalString,
  footerImageUrl: z.string(),
  headerImageUrl: z.string(),
  brandColor: z.string(),
  termsAndConditions: z.string(),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^\S+$/, "Username cannot contain spaces"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "RECEPTIONIST"]),
});

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^\S+$/, "Username cannot contain spaces"),
  role: z.enum(["ADMIN", "RECEPTIONIST"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const catalogItemStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const subscriptionPlanSchema = z.object({
  planName: z.string().min(1, "Plan name is required"),
  description: z.string().optional().nullable(),
  usageDays: z.number().int().positive().optional().nullable(),
  durationValue: z.number().int().positive("Validity must be at least 1"),
  durationUnit: z.enum(SUBSCRIPTION_DURATION_UNITS),
  fees: z.number().nonnegative("Fees must be zero or greater"),
  isActive: z.boolean(),
});

export const academyProductSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional(),
  price: z.number().nonnegative("Price must be zero or greater"),
  status: catalogItemStatusSchema.default("ACTIVE"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanSchema>;
export type AcademyProductInput = z.infer<typeof academyProductSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;

export const stockEntrySchema = z.object({
  itemName: z.string().min(2, "Item name is required"),
  category: z.string().min(1, "Category is required"),
  quantityPurchased: z.number().int().positive("Quantity must be at least 1"),
  totalCost: z.number().nonnegative("Total purchase cost must be zero or greater"),
  supplierName: z.string().min(2, "Supplier name is required"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  remarks: z.string().optional(),
  billPdfUrl: z.string().optional(),
  billFileName: z.string().optional(),
});

export type StockEntryInput = z.infer<typeof stockEntrySchema>;

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, "Expense date is required"),
  paidTo: z.string().min(2, "Paid to must be at least 2 characters"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
