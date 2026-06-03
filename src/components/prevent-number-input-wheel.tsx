"use client";

import { useEffect } from "react";

/** Block mouse-wheel from changing focused <input type="number"> values site-wide */
export function PreventNumberInputWheel() {
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === "number") {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  return null;
}
