"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceFilter } from "@/lib/customer-list-utils";

const OPTIONS: { value: ServiceFilter; label: string }[] = [
  { value: "all", label: "All Services" },
  { value: "swimming", label: "Swimming" },
  { value: "coaching", label: "Coaching" },
];

interface ServiceFilterSelectProps {
  value: ServiceFilter;
  onChange: (value: ServiceFilter) => void;
}

export function ServiceFilterSelect({ value, onChange }: ServiceFilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">Service</span>
      <Select value={value} onValueChange={(v) => onChange(v as ServiceFilter)}>
        <SelectTrigger aria-label="Filter by service">
          <SelectValue placeholder="All Services" />
        </SelectTrigger>
        <SelectContent align="end">
          {OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
