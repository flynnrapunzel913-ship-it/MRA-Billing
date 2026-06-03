"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { prefetchRouteData } from "@/lib/nav-prefetch";

type PrefetchLinkProps = ComponentProps<typeof Link>;

/** Link with aggressive route + API prefetch for sub-200ms navigations */
export function PrefetchLink({ href, onMouseEnter, onFocus, onPointerDown, ...props }: PrefetchLinkProps) {
  const path = typeof href === "string" ? href : href.pathname ?? "";

  const warm = () => {
    if (path) prefetchRouteData(path);
  };

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
      onPointerDown={(e) => {
        warm();
        onPointerDown?.(e);
      }}
      {...props}
    />
  );
}
