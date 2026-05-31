"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevenueReportsPanel } from "@/components/admin/revenue-reports-panel";

export default function RevenueReportsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Reports</h2>
          <p className="text-sm text-muted-foreground">
            Revenue logs, transaction history, and CSV export
          </p>
        </div>
      </div>

      <RevenueReportsPanel />
    </div>
  );
}
