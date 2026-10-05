"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { LogOut, User, Menu } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { useTranslations } from "next-intl";
import Spinner from "../ui/Spinner";
import NotificationBell from "../notification/NotificationBell";
import ThemeToggle from "../theme/ThemeToggle";
import LanguageToggle from "./LanguageToggle";

type HeaderProps = {
  role: string;
  onMenuClick?: () => void;
};

export default function Header({ role, onMenuClick }: HeaderProps) {
    const t = useTranslations();
    const { state } = useAuth();
    const { logoutMutate, isLoading } = useLogout();
    const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
    const hasAvatar = Boolean(
        state.user?.avatarUrl && failedAvatarUrl !== state.user.avatarUrl
    );

    const handleLogout = () => {
        logoutMutate();
    };

  return (
    <>
      {/* FULL PAGE SPINNER: Shown while logging out */}
      {typeof document !== "undefined" && isLoading && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
          <Spinner size="lg" />
          <p className="mt-4 text-white/80 text-sm font-medium tracking-wide animate-pulse">
            {t("header.loggingOut")}
          </p>
        </div>,
        document.body
      )}

      <header className="sticky top-0 z-20 h-20 border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">
        {/* Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white cursor-pointer transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <h2 className="text-base sm:text-xl metal-text font-semibold tracking-wide truncate">
            {role}
          </h2>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Language Switcher */}
          <LanguageToggle />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile */}
          <Link
            href={`/${role.toLowerCase()}/profile`}
            title={state.user?.fullName ?? "User"}
            className="flex items-center gap-2 md:gap-3 rounded-full border border-slate-200 bg-slate-100/80 hover:bg-slate-200/80 text-foreground dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 p-1 md:px-3 md:py-2 backdrop-blur-lg transition cursor-pointer max-w-fit md:max-w-[260px] min-w-0"
          >
            {hasAvatar ? (
              <Image
                src={state.user!.avatarUrl!}
                alt={state.user?.fullName ?? "User"}
                width={40}
                height={40}
                unoptimized
                onError={() => setFailedAvatarUrl(state.user?.avatarUrl ?? null)}
                className="h-8 w-8 md:h-10 md:w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-main to-primary-light shadow-sm">
                {state.user?.fullName ? (
                  <span className="text-xs md:text-sm font-bold text-white uppercase select-none">
                    {state.user.fullName.trim().charAt(0)}
                  </span>
                ) : (
                  <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                )}
              </div>
            )}
            <span className="hidden md:inline-flex items-center min-w-0">
              <span
                className="max-w-[140px] md:max-w-[170px] lg:max-w-[200px] truncate text-sm sm:text-base font-medium metal-text leading-normal"
                style={{ fontFamily: "var(--font-body-vi), sans-serif" }}
              >
                {state.user?.fullName ?? "User"}
              </span>
            </span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            aria-label={t("header.logout") || "Đăng xuất"}
            title={t("header.logout") || "Đăng xuất"}
            className="
                flex items-center justify-center
                w-11 h-11 rounded-xl
                border border-slate-200
                bg-slate-100/80
                text-slate-600
                backdrop-blur-lg
                transition-all duration-300
                hover:bg-rose-50
                hover:text-rose-600
                hover:border-rose-200
                dark:border-white/10
                dark:bg-white/10
                dark:text-white/70
                dark:hover:bg-red-500/20
                dark:hover:text-red-400
                cursor-pointer
            "
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
    </>
  );
}
