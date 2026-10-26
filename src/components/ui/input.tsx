import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Handle Enter key to move to next field (desktop app behavior)
      if (e.key === "Enter") {
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) {
          const focusableElements = form.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
          );
          const currentIndex = Array.from(focusableElements).indexOf(e.currentTarget);
          const nextIndex = currentIndex + 1;
          if (nextIndex < focusableElements.length) {
            (focusableElements[nextIndex] as HTMLElement)?.focus();
          }
        }
      }
      // Call original onKeyDown if provided
      onKeyDown?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
