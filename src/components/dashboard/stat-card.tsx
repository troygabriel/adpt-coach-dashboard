import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "accent" | "success";
}

export function StatCard({ title, value, icon, description, variant = "default" }: StatCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className={cn(
                "text-3xl font-bold",
                variant === "accent" && "text-accent",
                variant === "success" && "text-success",
                variant === "default" && "text-foreground"
              )}
            >
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              variant === "accent" && "bg-accent/10 text-accent",
              variant === "success" && "bg-success/10 text-success",
              variant === "default" && "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
