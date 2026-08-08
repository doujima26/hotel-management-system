"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AMENITY_ICON_NAMES, AmenityIcon } from "@/components/shared/AmenityIcon";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { roomsApi } from "@/lib/api/rooms";
import { getErrorMessage } from "@/types/api";
import { AMENITY_SCOPE_LABELS, type AmenityScope } from "@/types/enums";
import type { Amenity, AmenityCategory } from "@/types/models";

const SCOPE_OPTIONS: { value: AmenityScope; label: string }[] = [
  { value: "hotel", label: AMENITY_SCOPE_LABELS.hotel },
  { value: "room", label: AMENITY_SCOPE_LABELS.room },
];

const NO_CATEGORY = "none";

// Gom tien nghi theo danh muc de danh sach de doc va khop voi cach trang Admin
// dang nhom tien nghi.
function groupByCategory(amenities: Amenity[]): [string, Amenity[]][] {
  const groups = new Map<string, Amenity[]>();
  for (const amenity of amenities) {
    const key = amenity.category ?? "Chưa phân loại";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(amenity);
  }
  return [...groups.entries()];
}

// Bo chon icon dang luoi - Super Admin bam chon thay vi go tay ten icon.
function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-lg border p-2">
      {AMENITY_ICON_NAMES.map((iconName) => (
        <button
          key={iconName}
          type="button"
          onClick={() => onChange(value === iconName ? "" : iconName)}
          title={iconName}
          aria-pressed={value === iconName}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors",
            value === iconName
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          <AmenityIcon icon={iconName} className="size-4" />
        </button>
      ))}
    </div>
  );
}

// Dropdown chon danh muc - dung chung cho form tao va dialog sua.
function CategorySelect({
  id,
  value,
  categories,
  onChange,
}: {
  id: string;
  value: string;
  categories: AmenityCategory[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value || NO_CATEGORY} onValueChange={(v) => onChange(!v || v === NO_CATEGORY ? "" : v)}>
      <SelectTrigger id={id} className="w-full">
        {/* Phai tu format: mac dinh SelectValue hien gia tri tho (id danh muc). */}
        <SelectValue>
          {(current) =>
            current === NO_CATEGORY
              ? "Chưa phân loại"
              : (categories.find((c) => String(c.id) === current)?.name ?? "Chưa phân loại")
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CATEGORY}>Chưa phân loại</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function SuperAdminAmenitiesPage() {
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<AmenityScope>("hotel");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<AmenityCategory | null>(null);
  const [categoryBusyId, setCategoryBusyId] = useState<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["amenity-categories"],
    queryFn: () => roomsApi.listAmenityCategories(),
  });

  const {
    data: amenities,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["super-admin-amenities", scope],
    queryFn: () => roomsApi.listAmenities(scope),
  });

  // Dem so tien nghi dang dung tung danh muc - chi dem trong pham vi dang xem,
  // nen ghi ro o nhan de khong hieu nham la tong tren toan he thong.
  const amenityCountByCategoryId = new Map<number, number>();
  for (const amenity of amenities ?? []) {
    if (amenity.category_id === null) continue;
    amenityCountByCategoryId.set(amenity.category_id, (amenityCountByCategoryId.get(amenity.category_id) ?? 0) + 1);
  }

  async function handleCreateCategory() {
    setCategoryError(null);
    setCategorySubmitting(true);
    try {
      await roomsApi.createAmenityCategory(categoryName.trim(), categoryIcon || undefined);
      toast.success("Tạo danh mục thành công");
      setCategoryName("");
      setCategoryIcon("");
      await queryClient.invalidateQueries({ queryKey: ["amenity-categories"] });
    } catch (err) {
      setCategoryError(getErrorMessage(err, "Tạo danh mục thất bại"));
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    setCategoryError(null);
    setCategoryBusyId(id);
    try {
      await roomsApi.deleteAmenityCategory(id);
      toast.success("Xóa danh mục thành công");
      await queryClient.invalidateQueries({ queryKey: ["amenity-categories"] });
    } catch (err) {
      setCategoryError(getErrorMessage(err, "Xóa danh mục thất bại"));
    } finally {
      setCategoryBusyId(null);
    }
  }

  async function saveCategoryEdit(newName: string, newIcon: string) {
    if (!editingCategory) return;
    setCategoryError(null);
    setCategoryBusyId(editingCategory.id);
    try {
      await roomsApi.updateAmenityCategory(editingCategory.id, newName.trim(), newIcon || undefined);
      toast.success("Cập nhật danh mục thành công");
      await queryClient.invalidateQueries({ queryKey: ["amenity-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
      setEditingCategory(null);
    } catch (err) {
      setCategoryError(getErrorMessage(err, "Cập nhật danh mục thất bại"));
    } finally {
      setCategoryBusyId(null);
    }
  }

  async function handleCreate() {
    if (name.trim().length < 2) {
      setFormError("Tên tiện nghi tối thiểu 2 ký tự");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createAmenity({
        name: name.trim(),
        scope,
        category_id: categoryId ? Number(categoryId) : undefined,
      });
      toast.success("Tạo tiện nghi thành công");
      setName("");
      setCategoryId("");
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
    } catch (err) {
      setFormError(getErrorMessage(err, "Tạo tiện nghi thất bại"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(amenityId: number) {
    setDeleteError(null);
    setDeleteBusyId(amenityId);
    try {
      await roomsApi.deleteAmenity(amenityId);
      toast.success("Xóa tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Xóa tiện nghi thất bại"));
    } finally {
      setDeleteBusyId(null);
    }
  }

  async function saveEdit(values: { name: string; categoryId: string }) {
    if (!editing) return;
    if (values.name.trim().length < 2) {
      setEditError("Tên tiện nghi tối thiểu 2 ký tự");
      return;
    }
    setEditError(null);
    setEditSubmitting(true);
    try {
      await roomsApi.updateAmenity(editing.id, {
        name: values.name.trim(),
        category_id: values.categoryId ? Number(values.categoryId) : undefined,
      });
      toast.success("Cập nhật tiện nghi thành công");
      await queryClient.invalidateQueries({ queryKey: ["super-admin-amenities", scope] });
      setEditing(null);
    } catch (err) {
      setEditError(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Danh mục tiện nghi</CardTitle>
          <CardDescription>
            Nhóm để phân loại tiện nghi (ví dụ: Giải trí, Tầm nhìn). Dùng chung cho cả tiện nghi khách sạn lẫn tiện nghi
            phòng. Không xóa được danh mục đang có tiện nghi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category_name">Tên danh mục</Label>
            <Input
              id="category_name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ví dụ: Giải trí"
              className="sm:max-w-sm"
              maxLength={50}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Icon (không bắt buộc)
              {categoryIcon && <span className="ml-2 font-normal text-muted-foreground">đã chọn: {categoryIcon}</span>}
            </Label>
            <IconPicker value={categoryIcon} onChange={setCategoryIcon} />
          </div>
          {categoryError && <p className="text-sm text-destructive">{categoryError}</p>}
          <Button
            onClick={handleCreateCategory}
            disabled={categorySubmitting || !categoryName.trim()}
            className="self-start"
          >
            {categorySubmitting ? "Đang tạo..." : "Tạo danh mục"}
          </Button>

          {categories?.length === 0 && (
            <EmptyState title="Chưa có danh mục nào" hint="Tạo danh mục trước, sau đó gán tiện nghi vào danh mục." />
          )}
          {categories && categories.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <AmenityIcon icon={category.icon} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{category.name}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {amenityCountByCategoryId.get(category.id) ?? 0} tiện nghi
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setEditingCategory(category)}
                    aria-label={`Sửa danh mục ${category.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={categoryBusyId === category.id}
                    aria-label={`Xóa danh mục ${category.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiện nghi</CardTitle>
          <CardDescription>
            Danh mục tiện nghi dùng chung toàn hệ thống, tách theo 2 loại: &quot;Tiện nghi&quot; (chung khách sạn) và
            &quot;Tiện nghi phòng&quot; (riêng từng loại phòng). Admin từng khách sạn chỉ chọn từ danh mục này, không tự
            tạo mới.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_scope">Loại tiện nghi</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as AmenityScope)}>
                <SelectTrigger id="amenity_scope">
                  {/* Phai tu format: mac dinh SelectValue hien gia tri tho. */}
                  <SelectValue>{(current) => SCOPE_OPTIONS.find((opt) => opt.value === current)?.label ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_name">Tên tiện nghi</Label>
              <Input
                id="amenity_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hồ bơi"
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amenity_category">Danh mục</Label>
              <CategorySelect
                id="amenity_category"
                value={categoryId}
                categories={categories ?? []}
                onChange={setCategoryId}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleCreate} disabled={submitting || !name.trim()} className="self-start">
            {submitting ? "Đang tạo..." : "Tạo tiện nghi"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Danh sách {AMENITY_SCOPE_LABELS[scope].toLowerCase()}</h2>
        {isLoading && <p className="text-muted-foreground">Đang tải...</p>}
        {error && (
          <p className="text-sm text-destructive">
            {getErrorMessage(error, "Không thể tải danh sách tiện nghi")}
          </p>
        )}
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        {amenities && amenities.length === 0 && (
          <EmptyState title="Chưa có tiện nghi nào" hint="Dùng biểu mẫu phía trên để thêm tiện nghi đầu tiên vào danh mục." />
        )}

        {groupByCategory(amenities ?? []).map(([categoryLabel, items]) => (
          <div key={categoryLabel} className="flex flex-col gap-2">
            {/* Icon thuoc ve danh muc nen hien o tieu de nhom, khong lap lai
                tren tung the tien nghi. */}
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <AmenityIcon icon={items[0]?.category_icon ?? null} className="size-3.5 shrink-0" />
              {categoryLabel} <span className="font-normal">({items.length})</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((amenity) => (
                <div key={amenity.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                  <span className="flex-1 truncate text-sm">{amenity.name}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditing(amenity)} aria-label={`Sửa ${amenity.name}`}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(amenity.id)}
                    disabled={deleteBusyId === amenity.id}
                    aria-label={`Xóa ${amenity.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          submitting={categoryBusyId === editingCategory.id}
          error={categoryError}
          onClose={() => setEditingCategory(null)}
          onSave={saveCategoryEdit}
        />
      )}

      {editing && (
        <EditAmenityDialog
          amenity={editing}
          categories={categories ?? []}
          error={editError}
          submitting={editSubmitting}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </div>
  );
}

function EditCategoryDialog({
  category,
  error,
  submitting,
  onClose,
  onSave,
}: {
  category: AmenityCategory;
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa danh mục</DialogTitle>
          <DialogDescription>
            Đổi tên/icon danh mục - các tiện nghi đang thuộc danh mục này sẽ theo tên và icon mới.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_category_name">Tên danh mục</Label>
            <Input id="edit_category_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>
              Icon (không bắt buộc)
              {icon && <span className="ml-2 font-normal text-muted-foreground">đã chọn: {icon}</span>}
            </Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSave(name, icon)} disabled={submitting || !name.trim()}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAmenityDialog({
  amenity,
  categories,
  error,
  submitting,
  onClose,
  onSave,
}: {
  amenity: Amenity;
  categories: AmenityCategory[];
  error: string | null;
  submitting: boolean;
  onClose: () => void;
  onSave: (values: { name: string; categoryId: string }) => void;
}) {
  const [name, setName] = useState(amenity.name);
  const [categoryId, setCategoryId] = useState(amenity.category_id ? String(amenity.category_id) : "");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa tiện nghi</DialogTitle>
          <DialogDescription>Cập nhật tên và danh mục của tiện nghi (icon lấy theo danh mục).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_name">Tên tiện nghi</Label>
            <Input id="edit_amenity_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit_amenity_category">Danh mục</Label>
            <CategorySelect id="edit_amenity_category" value={categoryId} categories={categories} onChange={setCategoryId} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSave({ name, categoryId })} disabled={submitting}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
