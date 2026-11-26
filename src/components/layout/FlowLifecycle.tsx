"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isFlowRoute, useFlowStore } from "@/store/flow";

/**
 * Clears the flow's photo (and revokes its object URL) as soon as the user is on a page outside
 * the flow, e.g. back on the landing page (SPEC §5: the image is discarded after use). Renders
 * nothing. Closing the tab frees everything anyway.
 */
export function FlowLifecycle() {
  const pathname = usePathname();
  useEffect(() => {
    if (!isFlowRoute(pathname)) useFlowStore.getState().clearPhoto();
  }, [pathname]);
  return null;
}
