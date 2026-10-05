"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  type ReactNode,
} from "react";
import { ChevronDown, Check, Search, AlertCircle } from "lucide-react";
import { useLocale } from "next-intl";

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  containerClassName?: string;
}

export default function Select({
  label,
  required,
  error,
  helperText,
  placeholder,
  searchPlaceholder,
  emptyText,
  options,
  value,
  onChange,
  disabled = false,
  searchable = false,
  className = "",
  containerClassName = "",
}: SelectProps) {
  const locale = useLocale();
  const activePlaceholder =
    placeholder ?? (locale === "vi" ? "Chọn một tùy chọn..." : "Select an option...");
  const activeSearchPlaceholder =
    searchPlaceholder ?? (locale === "vi" ? "Tìm kiếm..." : "Search...");
  const activeEmptyText =
    emptyText ??
    (locale === "vi"
      ? "Không tìm thấy kết quả phù hợp"
      : "No matching results found");
  const generatedId = useId();
  const selectId = generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable && searchTerm
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const handleSelect = (val: string) => {
    onChange?.(val);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col gap-1.5 ${isOpen ? "z-50" : "z-10"} ${containerClassName}`}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1"
        >
          {label}
          {required && <span className="text-danger font-bold">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          flex items-center justify-between gap-2.5
          w-full rounded-xl
          bg-card border text-foreground
          text-sm
          px-4 py-2.5 sm:py-3
          h-[42px] sm:h-[46px]
          transition-all duration-200
          cursor-pointer
          active:scale-[0.99]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5 disabled:pointer-events-none
          outline-none
          ${
            error
              ? "border-danger focus-visible:border-danger focus-visible:ring-2 focus-visible:ring-danger/40"
              : "border-border hover:border-border-strong focus-visible:border-primary-light/50 focus-visible:ring-2 focus-visible:ring-primary-light"
          }
          ${className}
        `}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-muted/60 truncate">{activePlaceholder}</span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label={label || activePlaceholder}
          className="
            absolute top-full left-0 right-0 mt-2 z-[60]
            rounded-2xl border border-border
            bg-white/95 dark:bg-[#0c1222]/95
            p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]
            backdrop-blur-2xl
            animate-fadeIn
          "
        >
          {/* Optional Search */}
          {searchable && (
            <div className="p-1.5 pb-2 border-b border-border dark:border-white/10 mb-1">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={activeSearchPlaceholder}
                  className="w-full rounded-lg bg-slate-100/80 dark:bg-white/5 border border-border dark:border-white/10 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-primary-light/50"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center text-muted">
                {activeEmptyText}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={`
                      flex items-center justify-between gap-2.5
                      w-full rounded-xl px-3 py-2
                      text-xs sm:text-sm font-medium
                      transition-colors duration-150
                      cursor-pointer active:scale-[0.98]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light
                      ${
                        isSelected
                          ? "bg-primary-main/10 dark:bg-primary-main/20 text-primary-main dark:text-cyan-300 font-semibold"
                          : "text-foreground/90 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="shrink-0">{option.icon}</span>
                      )}
                      <span className="truncate" title={option.label}>
                        {option.label}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary-light shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Error or Helper text */}
      {error ? (
        <p
          role="alert"
          className="text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
