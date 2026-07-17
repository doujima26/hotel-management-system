"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roomsApi } from "@/lib/api/rooms";
import { ApiError } from "@/types/api";
import { useAdminHotel } from "../layout";

export default function AdminAmenitiesPage() {
  const hotel = useAdminHotel();
  const approved = hotel.status === "approved";
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const {
    data: amenities,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["amenities"],
    queryFn: () => roomsApi.listAmenities(),
    enabled: approved,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", hotel.id],
    queryFn: () => roomsApi.listRoomTypes(hotel.id),
    enabled: approved,
  });

  const roomTypeId = selectedRoomTypeId ? Number(selectedRoomTypeId) : null;

  const { data: assignedAmenities } = useQuery({
    queryKey: ["room-type-amenities", roomTypeId],
    queryFn: () => roomsApi.listRoomTypeAmenities(roomTypeId as number),
    enabled: approved && roomTypeId !== null,
  });

  async function handleCreate() {
    setFormError(null);
    setSubmitting(true);
    try {
      await roomsApi.createAmenity({ name: name.trim(), category: category.trim() || undefined });
      toast.success("Tao tien nghi thanh cong");
      setName("");
      setCategory("");
      await queryClient.invalidateQueries({ queryKey: ["amenities"] });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Tao tien nghi that bai");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign(amenityId: number) {
    if (roomTypeId === null) return;
    setAssignError(null);
    try {
      await roomsApi.assignAmenityToRoomType(roomTypeId, amenityId);
      toast.success("Gan tien nghi thanh cong");
      await queryClient.invalidateQueries({ queryKey: ["room-type-amenities", roomTypeId] });
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Gan tien nghi that bai");
    }
  }

  const assignedIds = new Set(assignedAmenities?.map((a) => a.id));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tao tien nghi khach san</CardTitle>
          <CardDescription>
            {approved ? "Tien nghi dung chung cho toan khach san, se gan vao tung loai phong ben duoi." : "Khach san can duoc duyet truoc khi tao tien nghi."}
          </CardDescription>
        </CardHeader>
        {approved && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amenity_name">Ten tien nghi</Label>
                <Input id="amenity_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vi du: Wifi mien phi" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amenity_category">Danh muc (khong bat buoc)</Label>
                <Input id="amenity_category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Vi du: Ket noi" />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button onClick={handleCreate} disabled={submitting || !name.trim()} className="self-start">
              {submitting ? "Dang tao..." : "Tao tien nghi"}
            </Button>
          </CardContent>
        )}
      </Card>

      {approved && (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Danh sach tien nghi</h2>
            {isLoading && <p className="text-muted-foreground">Dang tai...</p>}
            {error && (
              <p className="text-sm text-destructive">
                {error instanceof ApiError ? error.message : "Khong the tai danh sach tien nghi"}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {amenities?.map((amenity) => (
                <Badge key={amenity.id} variant="outline">
                  {amenity.name}
                  {amenity.category ? ` · ${amenity.category}` : ""}
                </Badge>
              ))}
              {amenities && amenities.length === 0 && <p className="text-sm text-muted-foreground">Chua co tien nghi nao.</p>}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gan tien nghi vao loai phong</CardTitle>
              <CardDescription>Chon 1 loai phong, sau do bam gan cho tung tien nghi.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="room_type_select">Loai phong</Label>
                <Select
                  value={selectedRoomTypeId || "none"}
                  onValueChange={(v) => setSelectedRoomTypeId(!v || v === "none" ? "" : v)}
                >
                  <SelectTrigger id="room_type_select" className="w-full sm:w-64">
                    <SelectValue placeholder="Chon loai phong" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chon loai phong</SelectItem>
                    {roomTypes?.map((rt) => (
                      <SelectItem key={rt.id} value={String(rt.id)}>
                        {rt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {assignError && <p className="text-sm text-destructive">{assignError}</p>}
              {roomTypeId !== null && (
                <div className="flex flex-wrap gap-2">
                  {amenities?.map((amenity) => {
                    const assigned = assignedIds.has(amenity.id);
                    return (
                      <Button
                        key={amenity.id}
                        type="button"
                        size="sm"
                        variant={assigned ? "secondary" : "outline"}
                        disabled={assigned}
                        onClick={() => handleAssign(amenity.id)}
                      >
                        {amenity.name} {assigned ? "✓" : ""}
                      </Button>
                    );
                  })}
                  {amenities && amenities.length === 0 && (
                    <p className="text-sm text-muted-foreground">Chua co tien nghi nao de gan.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
