"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Option = {
    value: string | null;
    label: string;
};

type InlineSelectProps = {
    ariaLabel: string;
    value: string | null;
    placeholder: string;
    fallbackLabel?: string;
    loading?: boolean;
    disabled?: boolean;
    isDirty?: boolean;
    onDisabledClick?: () => void;
    onChange: (value: string | null) => void;
    options: Option[];
    renderTrigger?: (label: string) => React.ReactNode;
};

export default function InlineSelect({
    ariaLabel,
    value,
    placeholder,
    fallbackLabel,
    loading,
    disabled,
    isDirty,
    onDisabledClick,
    onChange,
    options,
    renderTrigger,
}: InlineSelectProps) {
    const t = useTranslations("batchSave");
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const listboxId = useId();

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Auto close if trigger scrolled out of viewport
        if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
            setOpen(false);
            return;
        }

        const MENU_WIDTH = 220;
        const ESTIMATED_HEIGHT = 220;
        const spaceBelow = vh - rect.bottom;
        const spaceAbove = rect.top;
        const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;

        const maxHeight = openUpward
            ? Math.min(260, Math.max(100, spaceAbove - 16))
            : Math.min(260, Math.max(100, spaceBelow - 16));

        const left = Math.max(8, Math.min(rect.left, vw - MENU_WIDTH - 8));

        setDropdownStyle({
            position: "fixed",
            top: openUpward ? undefined : rect.bottom + 6,
            bottom: openUpward ? vh - rect.top + 6 : undefined,
            left,
            minWidth: Math.max(rect.width, 180),
            maxWidth: Math.min(320, vw - 16),
            maxHeight,
            zIndex: 9999,
        });
    }, []);

    useEffect(() => {
        if (open) {
            updatePosition();
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);
        }
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;
        function handleOutside(e: MouseEvent | TouchEvent) {
            const target = e.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setOpen(false);
                triggerRef.current?.focus();
            }
        }
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("touchstart", handleOutside, { passive: true });
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("touchstart", handleOutside);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const selected = options.find((o) => o.value === value);
    const label =
        selected && selected.value !== null && selected.label
            ? selected.label
            : (fallbackLabel ?? (value && value !== "null" ? value : placeholder));
    const isPlaceholder =
        (!selected || selected.value === null) &&
        !fallbackLabel &&
        (!value || value === "null");
    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );

    const focusOption = (index: number) => {
        const nextIndex = (index + options.length) % options.length;
        setActiveIndex(nextIndex);
        optionRefs.current[nextIndex]?.focus();
    };

    const openDropdown = () => {
        updatePosition();
        setActiveIndex(selectedIndex);
        setOpen(true);
        requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    };

    const closeDropdown = () => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const trigger = renderTrigger ? (
        <div className="relative inline-flex items-center gap-1.5">
            {renderTrigger(label)}
            {isDirty && (
                <span
                    className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    title={t("unsavedChange")}
                />
            )}
        </div>
    ) : (
        <span
            className={`flex items-center gap-1.5 min-w-0 ${
                isPlaceholder ? "italic text-muted" : "font-medium text-foreground"
            } ${isDirty ? "text-amber-500 dark:text-amber-300 font-semibold" : ""}`}
        >
            {isDirty && (
                <span
                    className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    title={t("unsavedChange")}
                />
            )}
            <span className="truncate">{label}</span>
        </span>
    );

    return (
        <div ref={ref} className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listboxId}
                onClick={() => {
                    if (disabled) {
                        onDisabledClick?.();
                        return;
                    }
                    if (open) {
                        setOpen(false);
                    } else {
                        openDropdown();
                    }
                }}
                onKeyDown={(event) => {
                    if (disabled) return;
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        openDropdown();
                    }
                }}
                disabled={loading}
                className={`flex w-full items-center justify-between gap-1 text-left transition hover:text-cyan-400 disabled:opacity-50 cursor-pointer ${
                    isDirty ? "ring-1 ring-amber-400/40 bg-amber-400/5 rounded-lg px-1.5 py-0.5" : ""
                }`}
            >
                {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-cyan-400" />
                ) : (
                    <>
                        <span className="min-w-0 flex-1 truncate">{trigger}</span>
                        <ChevronDown
                            className={`h-3 w-3 shrink-0 text-muted transition-transform duration-200 ${
                                open ? "rotate-180" : ""
                            }`}
                        />
                    </>
                )}
            </button>

            {open &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        id={listboxId}
                        ref={dropdownRef}
                        role="listbox"
                        aria-label={ariaLabel}
                        style={dropdownStyle}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                event.preventDefault();
                                closeDropdown();
                            } else if (event.key === "ArrowDown") {
                                event.preventDefault();
                                focusOption(activeIndex + 1);
                            } else if (event.key === "ArrowUp") {
                                event.preventDefault();
                                focusOption(activeIndex - 1);
                            }
                        }}
                        className="rounded-2xl border border-border bg-card/95 dark:border-white/10 dark:bg-[#0c1322]/95 p-1.5 shadow-xl dark:shadow-[0_16px_48px_rgba(0,0,0,.6)] backdrop-blur-2xl animate-fadeIn"
                    >
                        <div className="max-h-[220px] overflow-y-auto scrollbar-dropdown">
                            {options.map((opt, index) => {
                                const isSelected =
                                    opt.value === value ||
                                    (opt.value === null && value === null);
                                return (
                                    <button
                                        ref={(element) => {
                                            optionRefs.current[index] = element;
                                        }}
                                        key={String(opt.value)}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        tabIndex={index === activeIndex ? 0 : -1}
                                        onClick={() => {
                                            onChange(opt.value);
                                            closeDropdown();
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                                            isSelected
                                                ? "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-400/10 font-semibold"
                                                : "text-muted hover:bg-slate-100 dark:hover:bg-white/5 hover:text-foreground"
                                        }`}
                                    >
                                        <span className="flex-1 truncate text-left">
                                            {opt.label}
                                        </span>
                                        {isSelected && (
                                            <Check className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
