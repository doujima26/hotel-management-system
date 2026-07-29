import {
  AlertCircle,
  Ban,
  BedDouble,
  CheckCircle2,
  Clock,
  DoorOpen,
  LogOut,
  Minus,
  RotateCcw,
  Sparkles,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  HOTEL_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ROOM_STATUS_LABELS,
  type BookingStatus,
  type HotelStatus,
  type PaymentStatus,
  type RoomStatus,
} from "@/types/enums";

// He mau trang thai dung chung toan he thong (xem tai-lieu-thiet-ke-extranet.md
// muc 5): 1 mau = 1 y nghia, khong dung 1 mau cho 2 y nghia khac nhau. Luon kem
// icon de khong phu thuoc rieng vao mau (accessibility).
type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-subtle text-success-strong",
  warning: "bg-warning-subtle text-warning-strong",
  danger: "bg-danger-subtle text-danger-strong",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info-subtle text-info-strong",
};

const BOOKING_TONES: Record<BookingStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: "warning", icon: Clock },
  confirmed: { tone: "success", icon: CheckCircle2 },
  checked_in: { tone: "info", icon: CheckCircle2 },
  checked_out: { tone: "neutral", icon: LogOut },
  cancelled: { tone: "danger", icon: XCircle },
  no_show: { tone: "danger", icon: Ban },
};

const HOTEL_TONES: Record<HotelStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: "warning", icon: Clock },
  approved: { tone: "success", icon: CheckCircle2 },
  rejected: { tone: "danger", icon: XCircle },
  suspended: { tone: "danger", icon: AlertCircle },
};

const ROOM_TONES: Record<RoomStatus, { tone: Tone; icon: LucideIcon }> = {
  available: { tone: "success", icon: DoorOpen },
  occupied: { tone: "info", icon: BedDouble },
  cleaning: { tone: "warning", icon: Sparkles },
  maintenance: { tone: "danger", icon: Wrench },
};

const PAYMENT_TONES: Record<PaymentStatus, { tone: Tone; icon: LucideIcon }> = {
  pending: { tone: "warning", icon: Clock },
  completed: { tone: "success", icon: CheckCircle2 },
  failed: { tone: "danger", icon: XCircle },
  refunded: { tone: "neutral", icon: RotateCcw },
};

function Pill({ tone, icon: Icon, label, className }: { tone: Tone; icon: LucideIcon; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="size-3 shrink-0" />
      {label}
    </span>
  );
}

// Badge trang thai booking.
export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { tone, icon } = BOOKING_TONES[status] ?? { tone: "neutral" as Tone, icon: Minus };
  return <Pill tone={tone} icon={icon} label={BOOKING_STATUS_LABELS[status] ?? status} className={className} />;
}

// Badge trang thai duyet khach san.
export function HotelStatusBadge({ status, className }: { status: HotelStatus; className?: string }) {
  const { tone, icon } = HOTEL_TONES[status] ?? { tone: "neutral" as Tone, icon: Minus };
  return <Pill tone={tone} icon={icon} label={HOTEL_STATUS_LABELS[status] ?? status} className={className} />;
}

// Badge trang thai phong vat ly (so do phong).
export function RoomStatusBadge({ status, className }: { status: RoomStatus; className?: string }) {
  const { tone, icon } = ROOM_TONES[status] ?? { tone: "neutral" as Tone, icon: Minus };
  return <Pill tone={tone} icon={icon} label={ROOM_STATUS_LABELS[status] ?? status} className={className} />;
}

// Badge trang thai thanh toan cua booking.
export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { tone, icon } = PAYMENT_TONES[status] ?? { tone: "neutral" as Tone, icon: Minus };
  return <Pill tone={tone} icon={icon} label={PAYMENT_STATUS_LABELS[status] ?? status} className={className} />;
}

// Badge bat/tat chung (tai khoan, dich vu, khuyen mai...).
export function ActiveBadge({ active, activeLabel = "Đang bật", inactiveLabel = "Đã tắt" }: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return active ? (
    <Pill tone="success" icon={CheckCircle2} label={activeLabel} />
  ) : (
    <Pill tone="neutral" icon={Minus} label={inactiveLabel} />
  );
}
