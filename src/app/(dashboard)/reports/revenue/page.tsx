"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyCollectionPanel } from "@/components/admin/daily-collection-panel";

export default function RevenuePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Collection</h2>
          <p className="text-sm text-muted-foreground">
            End-of-day closing sheet — revenue, expenses, and collection status
          </p>
        </div>
      </div>

      <DailyCollectionPanel />
    </div>
  );
}
