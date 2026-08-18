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
  // Bao ra ngoai khi nguoi dung chot 1 thanh pho, chi truyen o form tim kiem.
  onCommit?: (value: string) => void;
}

// O chon thanh pho, go de loc trong danh sach 63 tinh/thanh.
export function CityAutocomplete({
  id,
  value,
  onValueChange,
  placeholder = "Nhập điểm đến",
  inputGroupClassName,
  onCommit,
}: CityAutocompleteProps) {
  const highlightedValueRef = useRef<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInvalid(e: SyntheticEvent<HTMLInputElement>) {
    e.currentTarget.setCustomValidity(EMPTY_CITY_MESSAGE);
  }

  // Xoa co loi cu khi gia tri o thay doi.
  function handleValueChange(next: string) {
    inputRef.current?.setCustomValidity("");
    onValueChange(next);
  }

  // Bat phim Enter tren goi y dang to sang de chon thanh pho va tim kiem ngay.
  function handleKeyDownCapture(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || !onCommit) return;

    const highlighted = highlightedValueRef.current;
    if (!highlighted) {
      // Khong co goi y to sang: de trinh duyet tu xu ly.
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    // Dat gia tri vao DOM truoc khi bao ra ngoai.
    const input = inputRef.current;
    if (input) {
      input.value = highlighted;
      input.setCustomValidity("");
    }
    onValueChange(highlighted);
    onCommit(highlighted);
  }

  return (
    <Autocomplete
      items={VIETNAM_PROVINCES}
      value={value}
      onValueChange={handleValueChange}
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
          ref={inputRef}
          id={id}
          placeholder={placeholder}
          required={Boolean(onCommit)}
          onInvalid={handleInvalid}
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
