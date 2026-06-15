"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ServiceFilter } from "@/lib/customer-list-utils";

interface ServiceFilterSelectProps {
  value: ServiceFilter;
  onChange: (value: ServiceFilter) => void;
  subscriptions: Array<{ id: string; name: string }>;
  loading?: boolean;
  compact?: boolean;
}

export function ServiceFilterSelect({
  value,
  onChange,
  subscriptions,
  loading = false,
  compact = false,
}: ServiceFilterSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as ServiceFilter)}
      disabled={loading}
    >
      <SelectTrigger
        aria-label="Filter by service"
        className={cn(compact ? "h-8 w-[9.5rem] text-xs" : "min-w-[11rem]")}
      >
        <SelectValue placeholder="All Services" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">All Services</SelectItem>
        {subscriptions.map((subscription) => (
          <SelectItem key={subscription.id} value={subscription.name}>
            {subscription.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
