"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceFilter } from "@/lib/customer-list-utils";

interface ServiceFilterSelectProps {
  value: ServiceFilter;
  onChange: (value: ServiceFilter) => void;
  subscriptions: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export function ServiceFilterSelect({
  value,
  onChange,
  subscriptions,
  loading = false,
}: ServiceFilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">Service</span>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ServiceFilter)}
        disabled={loading}
      >
        <SelectTrigger aria-label="Filter by service" className="min-w-[11rem]">
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
    </div>
  );
}
