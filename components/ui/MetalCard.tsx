import { ReactNode } from "react";

interface MetalCardProps {
    children: ReactNode;
    className?: string;
}

export default function MetalCard({
    children,
    className = "",
}: MetalCardProps) {
    const layoutClasses = className
        ? className
              .split(/\s+/)
              .filter((c) => {
                  if (c === "flex" || c.startsWith("flex-row") || c.startsWith("flex-col") || c.startsWith("flex-wrap")) {
                      return true;
                  }
                  if (c === "grid" || c.startsWith("grid-cols-") || c.startsWith("grid-rows-")) {
                      return true;
                  }
                  return (
                      c.startsWith("items-") ||
                      c.startsWith("justify-") ||
                      c.startsWith("gap-") ||
                      c.startsWith("space-") ||
                      c.startsWith("text-") ||
                      c === "h-full"
                  );
              })
              .join(" ")
        : "";

    const hasExplicitOverflow = /(^|\s)(!?)overflow-(visible|hidden|auto|scroll)/.test(className);
    const overflowClass = hasExplicitOverflow ? "" : "overflow-hidden";

    return (
        <div
            className={`
                group relative ${overflowClass}
                rounded-[28px]
                border border-slate-200 dark:border-white/10
                bg-white dark:bg-[#0c1322]
                shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
                transition-all duration-500
                hover:-translate-y-1
                hover:border-slate-300 dark:hover:border-cyan-400/20
                hover:shadow-md dark:hover:shadow-[0_16px_36px_rgba(21,174,245,.12)]
                ${className}
            `}
        >
            {/* Decorative layers contained in clipped wrapper */}
            <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none">
                {/* Metallic base - Dark Mode only */}
                <div
                    className="
                        hidden dark:block
                        absolute inset-0
                        bg-[linear-gradient(
                            135deg,
                            rgba(255,255,255,.10) 0%,
                            rgba(255,255,255,.03) 18%,
                            transparent 40%,
                            rgba(255,255,255,.02) 70%,
                            rgba(0,0,0,.25) 100%
                        )]
                    "
                />

                {/* Chrome line top - Dark Mode only */}
                <div
                    className="
                        hidden dark:block
                        absolute left-6 right-6 top-0 h-px
                        bg-gradient-to-r
                        from-transparent
                        via-white/90
                        to-transparent
                    "
                />

                {/* Blue edge glow */}
                <div
                    className="
                        absolute inset-0
                        opacity-0
                        transition-opacity
                        duration-500
                        group-hover:opacity-100
                        bg-[radial-gradient(circle_at_top,rgba(21,174,245,.08),transparent_40%)]
                    "
                />

                {/* Metallic reflection - Dark Mode only */}
                <div
                    className="
                        hidden dark:block
                        absolute
                        -left-[40%]
                        top-0
                        h-full
                        w-[30%]
                        -skew-x-[20deg]
                        bg-white/10
                        blur-2xl
                        opacity-0
                        transition-all
                        duration-1000
                        group-hover:left-[130%]
                        group-hover:opacity-100
                    "
                />

                {/* Inner border - Dark Mode only */}
                <div
                    className="
                        hidden dark:block
                        absolute inset-[1px]
                        rounded-[27px]
                        border border-white/5
                    "
                />
            </div>

            {/* Content */}
            <div className={`relative z-10 w-full min-w-0 max-w-full ${layoutClasses}`}>
                {children}
            </div>
        </div>
    );
}