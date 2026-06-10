"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminFinancialSummary } from "@/components/admin/admin-financial-summary";

export default function DailyRevenuePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Revenue</h2>
          <p className="text-sm text-muted-foreground">
            Collections, expenses, and net amount for the pool
          </p>
        </div>
      </div>

      <AdminFinancialSummary />
    </div>
  );
}
