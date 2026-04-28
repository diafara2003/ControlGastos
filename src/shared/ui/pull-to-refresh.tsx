"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 60;
const MAX_PULL = 80;
const HEADER_HEIGHT = 56;

export function PullToRefresh() {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const triggerRefresh = useCallback(() => {
    setRefreshing(true);
    setPullDistance(THRESHOLD);
    window.dispatchEvent(new CustomEvent("trigger-sync"));
    window.dispatchEvent(new CustomEvent("transactions-updated"));

    const timer = setTimeout(() => {
      setRefreshing(false);
      setPullDistance(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only activate on mobile via media query
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) return;

    const onResize = () => {
      if (mq.matches) {
        setPullDistance(0);
        setRefreshing(false);
        pullingRef.current = false;
      }
    };
    mq.addEventListener("change", onResize);

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) return;
      // Don't activate inside modals/dialogs
      const target = e.target as HTMLElement;
      if (target.closest("[role='dialog']") || target.closest("[data-radix-portal]")) return;

      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || refreshing) return;
      if (window.scrollY > 0) {
        pullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const deltaY = e.touches[0].clientY - startYRef.current;
      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      // Prevent native bounce
      document.body.style.overscrollBehaviorY = "contain";

      // Apply resistance curve
      const distance = Math.min(deltaY * 0.5, MAX_PULL);
      setPullDistance(distance);
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      document.body.style.overscrollBehaviorY = "";

      if (pullDistance >= THRESHOLD && !refreshing) {
        triggerRefresh();
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      mq.removeEventListener("change", onResize);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.style.overscrollBehaviorY = "";
    };
  }, [refreshing, pullDistance, triggerRefresh]);

  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 360;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[45] flex items-center justify-center md:hidden"
      style={{
        top: HEADER_HEIGHT,
        height: pullDistance,
        transition: pullingRef.current ? "none" : "height 0.3s ease-out",
        overflow: "hidden",
      }}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-gray-100 dark:border-slate-700 ${
          refreshing ? "h-9 w-9" : "h-8 w-8"
        }`}
        style={{
          opacity: progress,
          transform: `scale(${0.5 + progress * 0.5})`,
          transition: pullingRef.current ? "none" : "all 0.3s ease-out",
        }}
      >
        <RefreshCw
          className={`h-4 w-4 text-emerald-600 ${refreshing ? "animate-spin" : ""}`}
          style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
      </div>
    </div>
  );
}
