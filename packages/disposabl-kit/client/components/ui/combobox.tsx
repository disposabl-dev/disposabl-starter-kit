"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { useGT } from "gt-react";
import { cn } from "cn";

import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  keywords?: string[];
};

type ComboboxProps = Omit<
  React.ComponentProps<typeof Button>,
  "value" | "defaultValue" | "onChange" | "children" | "asChild"
> & {
  options: readonly ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

function Combobox({
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
  variant = "outline",
  ...props
}: ComboboxProps) {
  const gt = useGT();
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );
  const triggerPlaceholder = placeholder ?? gt("Select an option...");
  const inputPlaceholder = searchPlaceholder ?? gt("Search options...");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          type="button"
          role="combobox"
          aria-expanded={open}
          variant={variant}
          data-slot="combobox-trigger"
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {selectedOption?.label ?? triggerPlaceholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command>
          <CommandInput
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
          />
          <CommandList>
            <CommandEmpty>
              {emptyMessage ?? gt("No options found.")}
            </CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords ?? [])]}
                disabled={option.disabled}
                data-checked={selectedValue === option.value}
                onSelect={() => {
                  if (value === undefined) setInternalValue(option.value);
                  onValueChange?.(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox, type ComboboxOption, type ComboboxProps };
