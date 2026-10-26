import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: { from?: string; to?: string };
  onChange: (value: { from?: string; to?: string }) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    onChange({ from: undefined, to: undefined });
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "";
    return format(new Date(dateStr), "yyyy-MM-dd");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={value.from || ""}
            onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
            className="h-7 text-xs w-32"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={value.to || ""}
            onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
            className="h-7 text-xs w-32"
            placeholder="To"
          />
        </div>
        {(value.from || value.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 w-7 p-0"
          >
            <X size={12} />
          </Button>
        )}
      </div>
    </div>
  );
}
