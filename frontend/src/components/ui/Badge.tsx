import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", styles[variant], className)}>
      {children}
    </span>
  );
}

export function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "active":
      return "success";
    case "pending_scan":
      return "warning";
    case "quarantined":
    case "rejected":
      return "danger";
    case "archived":
      return "default";
    default:
      return "info";
  }
}
