import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-gradient text-primary-foreground shadow-soft hover:shadow-glow",
        secondary:
          "bg-accent text-accent-foreground hover:bg-muted border border-border",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent hover:border-border-strong",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        danger:
          "bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9.5 px-4",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
export default Button;
