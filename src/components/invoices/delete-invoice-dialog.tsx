"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface DeleteInvoiceDialogProps {
  open: boolean;
  invoiceNumber: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteInvoiceDialog({
  open,
  invoiceNumber,
  loading,
  onCancel,
  onConfirm,
}: DeleteInvoiceDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Delete Invoice?"
      maxWidth="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <Trash2 className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted-foreground">
          This invoice will be removed from your lists. You can restore it later from the database
          if needed.
        </p>
        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 dark:border-white/10 dark:bg-muted/30">
          <p className="text-xs text-muted-foreground">Invoice No</p>
          <p className="font-semibold">{invoiceNumber}</p>
        </div>
      </div>
    </Modal>
  );
}
