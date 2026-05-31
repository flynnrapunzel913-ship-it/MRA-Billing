import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateInput(date: Date | string) {
  return new Date(date).toISOString().split("T")[0];
}

export function generateMembershipId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `MRA${year}${random}`;
}
