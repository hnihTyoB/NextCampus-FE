"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Edit3, Loader2, Lock, AlertCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useUpdateRole } from "@/hooks/rbac/useUpdateRole";
import type { Role, PortalType } from "@/types/rbac";
import PortalTypeSelector from "./PortalTypeSelector";

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}

function EditRoleForm({
  role,
  onClose,
}: {
  role: Role;
  onClose: () => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState(role.name);
  const [portalType, setPortalType] = useState<PortalType>(role.portalType || "ADMIN");
  const [description, setDescription] = useState(role.description || "");
  const [nameError, setNameError] = useState("");

  const { mutate: updateRole, isPending } = useUpdateRole({
    onSuccess: () => {
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().toUpperCase().replace(/\s+/g, "_");
    if (!role.isSystem && !trimmedName) {
      setNameError(t("admin.roles.editModal.nameRequired"));
      return;
    }
    setNameError("");

    updateRole({
      id: role.id,
      payload: {
        name: role.isSystem ? undefined : trimmedName,
        portalType,
        description: description.trim() || undefined,
      },
    });
  };

  return (
    <div className="p-0 sm:p-1">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4 pr-12">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-400">
          <Edit3 className="h-5 w-5 shrink-0" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              {t("admin.roles.editModal.title")}
            </h3>
            <span className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              {role.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("admin.roles.editModal.description")}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Role Name */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
              {t("admin.roles.editModal.nameLabel")}{" "}
              {!role.isSystem && <span className="text-danger font-bold">*</span>}
            </label>
            {role.isSystem && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                <Lock className="h-3 w-3 shrink-0" />
                <span>{t("admin.roles.editModal.systemRoleNotice")}</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={name}
            disabled={role.isSystem}
            onChange={(e) => {
              setName(e.target.value.toUpperCase());
              if (nameError) setNameError("");
            }}
            aria-invalid={Boolean(nameError)}
            className={`w-full rounded-xl bg-card border px-4 py-2.5 sm:py-3 text-sm text-foreground h-[42px] sm:h-[46px] outline-none transition-all duration-200 placeholder:text-muted/60 ${
              role.isSystem
                ? "opacity-60 cursor-not-allowed bg-muted/20 border-border select-none"
                : nameError
                  ? "border-danger focus-visible:border-danger focus-visible:ring-2 focus-visible:ring-danger/40"
                  : "border-border hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1"
            }`}
          />
          {nameError && (
            <p className="text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{nameError}</span>
            </p>
          )}
        </div>

        {/* Portal Type 3-Card Selector */}
        <PortalTypeSelector
          value={portalType}
          onChange={setPortalType}
          disabled={isPending}
        />

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            {t("admin.roles.editModal.descLabel")}
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 placeholder:text-muted/60 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-border bg-card/60 px-5 h-[42px] text-xs sm:text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-card hover:text-foreground hover:border-border-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 cursor-pointer select-none disabled:opacity-50"
          >
            {t("admin.roles.editModal.cancelBtn")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="
              group relative inline-flex items-center justify-center gap-2 overflow-hidden
              rounded-xl
              h-[42px] px-6
              bg-gradient-to-r from-(--primary-main) to-(--primary-light)
              text-xs sm:text-sm font-semibold text-white
              shadow-[0_0_25px_rgba(21,174,245,0.25)]
              transition-all duration-300
              hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(21,174,245,0.4)] hover:brightness-110
              active:scale-[0.98]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background
              disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer select-none
            "
          >
            <span className="pointer-events-none absolute inset-y-0 -left-24 w-16 rotate-12 bg-white/30 blur-lg transition-all duration-700 group-hover:left-[130%]" />
            <span className="relative flex items-center gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Edit3 className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              )}
              <span>{t("admin.roles.editModal.submitBtn")}</span>
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditRoleModal({
  isOpen,
  onClose,
  role,
}: EditRoleModalProps) {
  if (!role) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <EditRoleForm key={role.id} role={role} onClose={onClose} />
    </Modal>
  );
}
