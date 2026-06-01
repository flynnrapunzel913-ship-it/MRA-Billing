import { cn } from "@/lib/utils";

interface DataRowCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DataRowCard({ children, className, onClick }: DataRowCardProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "glass-row w-full p-4 text-left",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </Comp>
  );
}
