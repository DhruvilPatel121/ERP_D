import * as React from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyMessage = "No results found.",
  className,
  disabled = false,
}: ComboboxProps) {
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setSearch("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange("");
    setSearch("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    setSearch(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    // Calculate dropdown position
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (filteredOptions.length === 1) {
          // If only one match, select it on Enter
          handleSelect(filteredOptions[0].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case "Tab":
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={search || (selectedOption?.label || "")}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-8", className)}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen &&
        createPortal(
          <div
            className="fixed z-[9999] bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
            ref={dropdownRef}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={(el) => (itemRefs.current[index] = el)}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer flex items-center gap-2",
                    value === option.value && "bg-muted/80",
                    highlightedIndex === index && "bg-accent"
                  )}
                >
                  {value === option.value && (
                    <Check size={14} className="text-primary" />
                  )}
                  <span className={value === option.value ? "font-medium" : ""}>
                    {option.label}
                  </span>
                </div>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
