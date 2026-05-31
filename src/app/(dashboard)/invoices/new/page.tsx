import { Suspense } from "react";
import NewInvoicePage from "./new-invoice-form";

export default function Page() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <NewInvoicePage />
    </Suspense>
  );
}
