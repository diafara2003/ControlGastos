"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/src/shared/lib/cn";

interface DialogContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const DialogContext = createContext<DialogContextValue>({
  open: false,
  setOpen: () => {},
});

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = useContext(DialogContext);
  if (asChild) {
    return <span onClick={() => setOpen(true)}>{children}</span>;
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useContext(DialogContext);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) setOpen(false);
    },
    [setOpen]
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in"
    >
      <div
        className={cn(
          "relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0",
          "max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-gray-100"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h2>
  );
}
