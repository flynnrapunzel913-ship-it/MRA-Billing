import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

function blockWheelOnNumberInput(event: React.WheelEvent<HTMLInputElement>) {
  if (event.currentTarget.type === "number") {
    event.preventDefault();
    event.stopPropagation();
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, ...props }, ref) => {
    const isNumber = type === "number";

    return (
      <input
        type={type}
        inputMode={
          props.inputMode ??
          (isNumber ? (props.step && String(props.step).includes(".") ? "decimal" : "numeric") : undefined)
        }
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground",
          "shadow-inner backdrop-blur-sm placeholder:text-muted-foreground",
          "transition-all duration-200",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isNumber && "no-number-spin",
          className
        )}
        ref={ref}
        suppressHydrationWarning
        onWheel={(event) => {
          blockWheelOnNumberInput(event);
          onWheel?.(event);
        }}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
