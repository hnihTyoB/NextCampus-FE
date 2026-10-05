"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Shield } from "lucide-react";

interface ActorAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  isSystem?: boolean;
  fallbackTitle?: string;
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name?: string | null): string {
  if (!name) return "SY";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SY";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ActorAvatar({
  avatarUrl,
  name,
  isSystem = false,
  fallbackTitle,
  size = "sm",
  className = "",
}: ActorAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const cleanAvatarUrl = useMemo(() => {
    if (!avatarUrl || typeof avatarUrl !== "string") return null;
    const trimmed = avatarUrl.trim();
    if (
      trimmed === "" ||
      trimmed === "null" ||
      trimmed === "undefined" ||
      trimmed === "None"
    ) {
      return null;
    }
    return trimmed;
  }, [avatarUrl]);

  const hasAvatar = Boolean(cleanAvatarUrl && failedUrl !== cleanAvatarUrl);

  const sizeClass = size === "md" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const pixelSize = size === "md" ? 40 : 36;
  const initials = getInitials(name);

  if (isSystem) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300 shadow-xs ${className}`}
        title={name || fallbackTitle || "System"}
      >
        <Shield className={`${iconSize} shrink-0`} />
      </div>
    );
  }

  if (hasAvatar) {
    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 overflow-hidden shadow-xs ${className}`}
      >
        <Image
          src={cleanAvatarUrl!}
          alt={name || "Avatar"}
          width={pixelSize}
          height={pixelSize}
          unoptimized
          onError={() => setFailedUrl(cleanAvatarUrl)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-main to-primary-light font-bold text-white shadow-xs dark:from-slate-700 dark:to-slate-800 dark:ring-1 dark:ring-white/10 select-none ${className}`}
      title={name || "User"}
    >
      {initials}
    </div>
  );
}
