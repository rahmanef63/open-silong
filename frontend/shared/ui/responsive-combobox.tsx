"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

/**
 * Responsive Combobox (search autocomplete).
 * Desktop: Popover + Command. Mobile: Drawer + Command.
 */

export interface ResponsiveComboboxOption<T extends string = string> {
  value: T;
  label: string;
  keywords?: string[];
  disabled?: boolean;
}

export interface ResponsiveComboboxProps<T extends string = string> {
  value?: T;
  onValueChange?: (value: T | undefined) => void;
  options: ReadonlyArray<ResponsiveComboboxOption<T>>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  drawerTitle?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  renderOption?: (option: ResponsiveComboboxOption<T>, checked: boolean) => React.ReactNode;
}

export function ResponsiveCombobox<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyMessage = "Tidak ada hasil.",
  drawerTitle = "Pilih opsi",
  disabled,
  triggerClassName,
  contentClassName,
  renderOption,
}: ResponsiveComboboxProps<T>) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value],
  );

  const handleSelect = (next: T) => {
    const newValue: T | undefined = next === value ? undefined : next;
    onValueChange?.(newValue);
    setOpen(false);
  };

  const commandBody = (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((opt) => {
            const checked = opt.value === value;
            return (
              <CommandItem
                key={opt.value}
                value={[opt.label, ...(opt.keywords ?? [])].join(" ")}
                disabled={opt.disabled}
                onSelect={() => handleSelect(opt.value)}
              >
                {renderOption ? (
                  renderOption(opt, checked)
                ) : (
                  <>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        checked ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt.label}
                  </>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const trigger = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      className={cn(
        "w-full justify-between font-normal",
        !value && "text-muted-foreground",
        triggerClassName,
      )}
    >
      <span className="line-clamp-1 text-left">
        {selectedLabel ?? placeholder}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>{drawerTitle}</DrawerTitle>
          </DrawerHeader>
          <div className={cn("px-3 pb-4", contentClassName)}>{commandBody}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("w-(--radix-popover-trigger-width) p-0", contentClassName)}>
        {commandBody}
      </PopoverContent>
    </Popover>
  );
}
