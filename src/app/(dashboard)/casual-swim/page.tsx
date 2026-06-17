import { CasualSwimPanel } from "@/components/casual-swim/casual-swim-panel";

export default function CasualSwimPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Generate Ticket</h1>
        <p className="text-sm text-muted-foreground">
          Walk-in casual swimming and rental billing
        </p>
      </div>
      <CasualSwimPanel />
    </div>
  );
}
