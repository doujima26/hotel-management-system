"use client"

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Autocomplete = AutocompletePrimitive.Root

function AutocompleteInputGroup({
  className,
  ...props
}: AutocompletePrimitive.InputGroup.Props) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
      className={cn(
        "flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteIcon({
  className,
  ...props
}: AutocompletePrimitive.Icon.Props) {
  return (
    <AutocompletePrimitive.Icon
      data-slot="autocomplete-icon"
      className={cn("flex shrink-0 items-center text-muted-foreground [&_svg]:size-4", className)}
      {...props}
    />
  )
}

function AutocompleteInput({
  className,
  ...props
}: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
      className={cn(
        "h-full w-full min-w-0 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteClear({
  className,
  ...props
}: AutocompletePrimitive.Clear.Props) {
  return (
    <AutocompletePrimitive.Clear
      data-slot="autocomplete-clear"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md p-0.5 text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </AutocompletePrimitive.Clear>
  )
}

function AutocompletePopup({
  className,
  children,
  sideOffset = 4,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<AutocompletePrimitive.Positioner.Props, "sideOffset">) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-popup"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteList({
  className,
  ...props
}: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cn("flex flex-col gap-0.5 p-1", className)}
      {...props}
    />
  )
}

function AutocompleteItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteEmpty({
  className,
  ...props
}: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cn("px-2 py-3 text-center text-sm text-muted-foreground empty:m-0 empty:p-0", className)}
      {...props}
    />
  )
}

export {
  Autocomplete,
  AutocompleteInputGroup,
  AutocompleteIcon,
  AutocompleteInput,
  AutocompleteClear,
  AutocompletePopup,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
}
