import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: cn(
          "bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white",
          "shadow-[0_4px_14px_rgba(14,165,233,0.35)]",
          "hover:shadow-[0_6px_20px_rgba(14,165,233,0.45)] hover:-translate-y-px",
          "dark:bg-primary dark:from-transparent dark:to-transparent dark:shadow-none",
          "dark:hover:bg-primary/90 dark:hover:translate-y-0"
        ),
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: cn(
          "border border-[#E2E8F0] bg-white text-slate-700 shadow-sm",
          "hover:bg-[#F8FAFC] hover:text-[#0284C7]",
          "dark:border-input dark:bg-background dark:text-foreground dark:shadow-none",
          "dark:hover:bg-accent dark:hover:text-accent-foreground"
        ),
        secondary: cn(
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80"
        ),
        ghost: cn(
          "hover:bg-[#F1F5F9] hover:text-[#0284C7]",
          "dark:hover:bg-accent dark:hover:text-accent-foreground"
        ),
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
