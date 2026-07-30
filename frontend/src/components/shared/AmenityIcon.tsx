import {
  Accessibility,
  Armchair,
  Baby,
  Bath,
  BedDouble,
  Briefcase,
  Car,
  Cigarette,
  CircleHelp,
  Clock,
  Coffee,
  CookingPot,
  Dog,
  DoorOpen,
  Dumbbell,
  Flame,
  Leaf,
  Lock,
  MapPin,
  Microwave,
  Mountain,
  Music,
  ParkingCircle,
  Phone,
  Refrigerator,
  ShieldCheck,
  Shirt,
  Snowflake,
  Sofa,
  Sparkles,
  Star,
  Sun,
  Tv,
  Users,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  Wind,
  Wine,
  type LucideIcon,
} from "lucide-react";

// Anh xa ten icon luu trong DB (amenities.icon - dang chu thuong, vd "wifi",
// "snowflake") sang component icon tuong ung. Khai bao tuong minh thay vi nap
// ca bo icon de khong keo toan bo thu vien vao bundle. Ten khong co trong bang
// (Super Admin nhap icon la) se dung icon mac dinh.
const ICON_MAP: Record<string, LucideIcon> = {
  accessibility: Accessibility,
  armchair: Armchair,
  baby: Baby,
  bath: Bath,
  bed: BedDouble,
  "bed-double": BedDouble,
  briefcase: Briefcase,
  car: Car,
  cigarette: Cigarette,
  clock: Clock,
  coffee: Coffee,
  "cooking-pot": CookingPot,
  dog: Dog,
  "door-open": DoorOpen,
  dumbbell: Dumbbell,
  flame: Flame,
  leaf: Leaf,
  lock: Lock,
  "map-pin": MapPin,
  microwave: Microwave,
  mountain: Mountain,
  music: Music,
  "parking-circle": ParkingCircle,
  phone: Phone,
  refrigerator: Refrigerator,
  "shield-check": ShieldCheck,
  shirt: Shirt,
  snowflake: Snowflake,
  sofa: Sofa,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  tv: Tv,
  users: Users,
  utensils: Utensils,
  "washing-machine": WashingMachine,
  waves: Waves,
  wifi: Wifi,
  wind: Wind,
  wine: Wine,
};

// Danh sach ten icon dung duoc - Super Admin chon tu day khi tao/sua tien nghi
// (thay vi go tay ten icon, de go sai thanh icon dau hoi mac dinh).
export const AMENITY_ICON_NAMES = Object.keys(ICON_MAP);

// Icon cua 1 tien nghi. Tu quy doi ten ve chu thuong + gach ngang de khop du
// Super Admin nhap "Wifi", "WiFi" hay "wi_fi".
export function AmenityIcon({ icon, className }: { icon: string | null; className?: string }) {
  const key = (icon ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  const Icon = ICON_MAP[key] ?? CircleHelp;
  return <Icon className={className} />;
}
