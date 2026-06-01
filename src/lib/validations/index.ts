import { z } from "zod";
import {
  ITEM_TYPES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  COACHING_PACKAGE_TYPE,
} from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/** Minimal fields for fast receptionist customer creation */
export const quickCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  mobile: z
    .string()
    .min(10, "Mobile number is required")
    .max(15, "Enter a valid mobile number"),
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

export const settingsSchema = z.object({
  academyName: z.string().min(2),
  address: z.string(),
  phonePrimary: z.string(),
  phoneSecondary: z.string().optional(),
  email: z.string().email().or(z.literal("")),
  website: z.string().optional(),
  gstNumber: z.string(),
  gstEnabled: z.boolean(),
  defaultCgstRate: z.number().min(0).max(100),
  defaultSgstRate: z.number().min(0).max(100),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankBranch: z.string().optional(),
  upiId: z.string().optional(),
  upiQrCode: z.string().optional(),
  logoUrl: z.string(),
  signatureUrl: z.string().optional(),
  footerImageUrl: z.string(),
  headerImageUrl: z.string(),
  brandColor: z.string(),
  termsAndConditions: z.string(),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "RECEPTIONIST"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
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

export const subscriptionSchema = z.object({
  name: z.string().min(2, "Subscription name is required"),
  description: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  price: z.number().nonnegative("Price must be zero or greater"),
  status: catalogItemStatusSchema.default("ACTIVE"),
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
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type AcademyProductInput = z.infer<typeof academyProductSchema>;
export type QuickCustomerInput = z.infer<typeof quickCustomerSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
