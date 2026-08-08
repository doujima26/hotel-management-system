"use client";

import { useRef } from "react";
import type { KeyboardEvent, SyntheticEvent } from "react";
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

const EMPTY_CITY_MESSAGE = "Vui lòng nhập điểm đến để bắt đầu tìm kiếm.";

interface CityAutocompleteProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  inputGroupClassName?: string;
  // Bao khi nguoi dung "chot" 1 thanh pho (Enter hoac bam chon) - khac voi
  // onValueChange (ban goi moi lan go phim). Chi truyen prop nay o cac form
  // tim kiem (khong truyen o form dang ky khach san). Khi co prop nay:
  // - O nhap thanh "required" that su (native HTML) - bam nut submit hoac Enter
  //   luc dang trong deu bi trinh duyet chan lai va hien canh bao do, khong
  //   phu thuoc vao JS tu viet, hoat dong dung voi CA nut bam lan phim Enter.
  // - Enter luc dang co goi y to sang se tu chon goi y do vao o roi tim kiem
  //   ngay (khong can Enter lan 2), giong Booking.com.
  onCommit?: (value: string) => void;
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
  onCommit,
}: CityAutocompleteProps) {
  const highlightedValueRef = useRef<string | undefined>(undefined);

  function handleInvalid(e: SyntheticEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity(EMPTY_CITY_MESSAGE);
  }

  // Dung onKeyDownCapture tren div bao ngoai (khong phai onKeyDown tren rieng
  // input cua Base UI) de dam bao handler nay LUON chay truoc, bat ke Base UI
  // tu xu ly Enter noi bo the nao - phase capture tren phan tu cha luon chay
  // truoc phase bubble/target cua phan tu con theo dung chuan DOM event.
  function handleKeyDownCapture(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || !onCommit) return;

    const highlighted = highlightedValueRef.current;
    if (!highlighted) {
      // Khong co goi y nao dang to sang: de trinh duyet tu xu ly binh thuong -
      // neu o dang trong, thuoc tinh required se tu chan submit va hien canh
      // bao (qua onInvalid o tren); neu da co chu, submit binh thuong.
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onValueChange(highlighted);
    onCommit(highlighted);
  }

  return (
    <Autocomplete
      items={VIETNAM_PROVINCES}
      value={value}
      onValueChange={onValueChange}
      onItemHighlighted={(highlightedValue) => {
        highlightedValueRef.current = highlightedValue;
      }}
      autoHighlight
      openOnInputClick
    >
      <AutocompleteInputGroup className={inputGroupClassName} onKeyDownCapture={handleKeyDownCapture}>
        <AutocompleteIcon>
          <MapPin />
        </AutocompleteIcon>
        <AutocompleteInput
          id={id}
          placeholder={placeholder}
          required={Boolean(onCommit)}
          onInvalid={handleInvalid}
          onChange={(e) => e.currentTarget.setCustomValidity("")}
        />
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
