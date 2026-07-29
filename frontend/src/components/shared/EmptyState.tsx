import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  // Cau huong dan viec can lam tiep theo - tranh man hinh trong khong biet lam gi.
  hint?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

// Khoi hien thi khi danh sach chua co du lieu: neu ro trang thai + viec can lam.
export function EmptyState({ title, hint, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
