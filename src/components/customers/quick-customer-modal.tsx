"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { readApiResponse } from "@/lib/api-error";
import { invalidateCachePrefix } from "@/lib/client-cache";
import { sanitizeMobileInput } from "@/lib/mobile-input";
import { customerToSearchResult, type CustomerSearchResult } from "@/lib/customer-search";

interface QuickCustomerModalProps {
  open: boolean;
  initialName?: string;
  initialMobile?: string;
  onClose: () => void;
  onCreated: (customer: CustomerSearchResult) => void;
}

export function QuickCustomerModal({
  open,
  initialName = "",
  initialMobile = "",
  onClose,
  onCreated,
}: QuickCustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [mobile, setMobile] = useState(initialMobile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setMobile(initialMobile);
    }
  }, [open, initialName, initialMobile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Enter customer name");
      return;
    }
    const mobileDigits = sanitizeMobileInput(mobile);
    if (mobileDigits.length < 10) {
      toast.error("Enter a valid mobile number");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobileDigits,
          status: "ACTIVE",
        }),
      });

      const result = await readApiResponse<{
        id: string;
        name: string;
        mobile: string | null;
        membershipId: string;
        dateJoined: string;
        status: string;
      }>(res, "Failed to create customer");
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      invalidateCachePrefix("/api/customers");
      onCreated(customerToSearchResult(result.data));
      toast.success("Customer saved and selected");
      onClose();
    } catch {
      toast.error("Failed to create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Customer"
      description="Name and mobile only — takes a few seconds."
      maxWidth="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="quick-customer-form" disabled={saving}>
            {saving ? "Creating…" : "Create Customer"}
          </Button>
        </>
      }
    >
      <form id="quick-customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="qc-name">Customer Name *</Label>
          <Input
            id="qc-name"
            className="h-11"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Panah"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qc-mobile">Mobile Number *</Label>
          <Input
            id="qc-mobile"
            className="h-11"
            inputMode="numeric"
            autoComplete="tel"
            value={mobile}
            maxLength={10}
            onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
            placeholder="10-digit mobile"
          />
        </div>
      </form>
    </Modal>
  );
}
