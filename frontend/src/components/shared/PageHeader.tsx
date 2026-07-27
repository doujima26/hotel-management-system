interface PageHeaderProps {
  title: string;
  // Cau mo ta ngan duoi tieu de - noi ro trang nay dung de lam gi.
  description?: string;
  // Khe cho hanh dong chinh cua trang (nut tao moi, bo loc, dieu huong lich…).
  action?: React.ReactNode;
}

// Tieu de trang dung chung cho toan khu quan tri: dat diem neo thi giac duy nhat
// cua man hinh (24px) va gom hanh dong chinh ve mot cho co dinh ben phai.
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
