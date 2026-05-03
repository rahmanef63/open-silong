"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

/**
 * Responsive Select. Desktop: Radix Select. Mobile: Drawer bottom-sheet.
 */

type Mode = "select" | "drawer";

interface SelectCtx {
  mode: Mode;
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = React.createContext<SelectCtx>({
  mode: "select",
});

export interface ResponsiveSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
  forceMode?: Mode;
}

export function ResponsiveSelect({
  value,
  defaultValue,
  onValueChange,
  open,
  onOpenChange,
  disabled,
  children,
  forceMode,
}: ResponsiveSelectProps) {
  const isMobile = useIsMobile();
  const mode: Mode = forceMode ?? (isMobile ? "drawer" : "select");
  const [internalValue, setInternalValue] = React.useState<string | undefined>(
    defaultValue,
  );
  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (v: string) => {
    if (value === undefined) setInternalValue(v);
    onValueChange?.(v);
  };

  if (mode === "select") {
    return (
      <SelectContext.Provider value={{ mode, value: currentValue, onValueChange: handleChange }}>
        <Select
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleChange}
          open={open}
          onOpenChange={onOpenChange}
          disabled={disabled}
        >
          {children}
        </Select>
      </SelectContext.Provider>
    );
  }
  return (
    <SelectContext.Provider value={{ mode, value: currentValue, onValueChange: handleChange }}>
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    </SelectContext.Provider>
  );
}

export interface ResponsiveSelectTriggerProps
  extends React.ComponentProps<typeof SelectTrigger> {
  placeholder?: string;
}

export function ResponsiveSelectTrigger({
  className,
  placeholder,
  children,
  ...props
}: ResponsiveSelectTriggerProps) {
  const { mode, value } = React.useContext(SelectContext);
  const optionsRef = React.useContext(SelectOptionsContext);

  if (mode === "select") {
    return (
      <SelectTrigger className={className} {...props}>
        {children ?? <SelectValue placeholder={placeholder} />}
      </SelectTrigger>
    );
  }

  const label = value ? optionsRef?.getLabel(value) ?? value : placeholder;

  return (
    <DrawerTrigger asChild>
      <button
        type="button"
        data-slot="responsive-select-trigger"
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          !value && "text-muted-foreground",
          className,
        )}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <span className="line-clamp-1 text-left">{label}</span>
        <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
      </button>
    </DrawerTrigger>
  );
}

interface OptionsRef {
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  getLabel: (value: string) => string | undefined;
}
const SelectOptionsContext = React.createContext<OptionsRef | null>(null);

export interface ResponsiveSelectContentProps
  extends React.ComponentProps<typeof SelectContent> {
  drawerTitle?: string;
  drawerClassName?: string;
}

export function ResponsiveSelectContent({
  className,
  drawerTitle,
  drawerClassName,
  children,
  ...props
}: ResponsiveSelectContentProps) {
  const { mode } = React.useContext(SelectContext);
  const labelsRef = React.useRef<Map<string, string>>(new Map());
  const optionsApi = React.useMemo<OptionsRef>(
    () => ({
      register: (v, l) => labelsRef.current.set(v, l),
      unregister: (v) => labelsRef.current.delete(v),
      getLabel: (v) => labelsRef.current.get(v),
    }),
    [],
  );

  if (mode === "select") {
    return (
      <SelectOptionsContext.Provider value={optionsApi}>
        <SelectContent className={className} {...props}>
          {children}
        </SelectContent>
      </SelectOptionsContext.Provider>
    );
  }
  return (
    <SelectOptionsContext.Provider value={optionsApi}>
      <DrawerContent className={cn("max-h-[85dvh]", drawerClassName)}>
        <DrawerHeader className={drawerTitle ? "pb-1" : "sr-only"}>
          <DrawerTitle className={drawerTitle ? "" : "sr-only"}>
            {drawerTitle ?? "Pilih opsi"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-4">{children}</div>
      </DrawerContent>
    </SelectOptionsContext.Provider>
  );
}

export interface ResponsiveSelectItemProps
  extends React.ComponentProps<typeof SelectItem> {
  value: string;
}

export function ResponsiveSelectItem({
  value,
  children,
  className,
  ...props
}: ResponsiveSelectItemProps) {
  const { mode, value: selected, onValueChange } = React.useContext(SelectContext);
  const options = React.useContext(SelectOptionsContext);

  React.useEffect(() => {
    if (!options) return;
    const label = typeof children === "string" ? children : String(value);
    options.register(value, label);
    return () => options.unregister(value);
  }, [options, value, children]);

  if (mode === "select") {
    return (
      <SelectItem value={value} className={className} {...props}>
        {children}
      </SelectItem>
    );
  }
  const checked = selected === value;
  return (
    <DrawerClose asChild>
      <button
        type="button"
        role="option"
        aria-selected={checked}
        onClick={() => onValueChange?.(value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm outline-none",
          "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
          )}
        >
          {checked && <Check className="h-3 w-3" />}
        </span>
        <span className="flex-1">{children}</span>
      </button>
    </DrawerClose>
  );
}
