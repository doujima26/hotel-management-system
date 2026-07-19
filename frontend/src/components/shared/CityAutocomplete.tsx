"use client";

import { MapPin } from "lucide-react";
import {
  Autocomplete,
  AutocompleteClear,
  AutocompleteEmpty,
  AutocompleteIcon,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@/components/ui/autocomplete";
import { VIETNAM_PROVINCES } from "@/lib/constants/vietnamProvinces";

interface CityAutocompleteProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  inputGroupClassName?: string;
}

// O chon thanh pho kieu Booking.com - go de loc trong danh sach 63 tinh/thanh
// (VIETNAM_PROVINCES), dung chung cho ca tim kiem cua khach va dang ky khach
// san cua Admin de chinh ta thanh pho luon dong bo giua 2 phia.
export function CityAutocomplete({
  id,
  value,
  onValueChange,
  placeholder = "Nhập điểm đến",
  inputGroupClassName,
}: CityAutocompleteProps) {
  return (
    <Autocomplete items={VIETNAM_PROVINCES} value={value} onValueChange={onValueChange}>
      <AutocompleteInputGroup className={inputGroupClassName}>
        <AutocompleteIcon>
          <MapPin />
        </AutocompleteIcon>
        <AutocompleteInput id={id} placeholder={placeholder} />
        <AutocompleteClear />
      </AutocompleteInputGroup>
      <AutocompletePopup>
        <AutocompleteEmpty>Không tìm thấy thành phố phù hợp</AutocompleteEmpty>
        <AutocompleteList>
          {(item: string) => (
            <AutocompleteItem key={item} value={item}>
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex flex-col">
                <span className="font-medium">{item}</span>
                <span className="text-xs text-muted-foreground">Việt Nam</span>
              </span>
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompletePopup>
    </Autocomplete>
  );
}
