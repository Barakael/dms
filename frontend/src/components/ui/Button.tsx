import { cn } from "@/lib/utils";

const variants = {
  default: "bg-brand-blue hover:bg-brand-blue-lt text-white",
  outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
  danger: "bg-danger hover:bg-danger-dark text-white",
  ghost: "hover:bg-white/10 text-white",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
