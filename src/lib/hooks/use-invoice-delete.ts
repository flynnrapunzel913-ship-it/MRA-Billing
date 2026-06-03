"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { invalidateCache } from "@/lib/client-cache";
import { readApiResponse } from "@/lib/api-error";
import type { InvoiceListRow } from "@/lib/invoice-list-utils";

export function useInvoiceDelete(options?: {
  redirectAfterDelete?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${deleteTarget.id}`, { method: "DELETE" });
      const result = await readApiResponse<{ success?: boolean }>(
        res,
        "Failed to delete invoice"
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Invoice deleted successfully");
      setDeleteTarget(null);
      invalidateCache("/api/invoices");
      invalidateCache("/api/dashboard");
      await options?.onSuccess?.();
      if (options?.redirectAfterDelete) {
        router.push(options.redirectAfterDelete);
      }
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
  };
}
