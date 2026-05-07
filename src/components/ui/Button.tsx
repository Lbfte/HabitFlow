import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-indigo text-white hover:opacity-90 shadow-sm",
      secondary: "bg-surface text-foreground border border-border hover:bg-muted/10 shadow-sm",
      outline: "bg-transparent border border-indigo text-indigo hover:bg-indigo/5",
      ghost: "bg-transparent text-muted hover:text-foreground hover:bg-surface",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    }

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-lg",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        ...props
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
