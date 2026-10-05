"use client";

import { Calendar, Plus, User, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Modal from "@/components/ui/Modal";
import CreateMeetingModal from "./CreateMeetingModal";
import { useRBAC } from "@/hooks/rbac/useRBAC";

interface MeetingHeaderProps {
  scope?: "my" | "all";
  onScopeChange?: (scope: "my" | "all") => void;
}

export default function MeetingHeader({
  scope = "my",
  onScopeChange,
}: MeetingHeaderProps) {
  const t = useTranslations();
  const { can } = useRBAC();
  const canCreate = can("MEETING_CREATE");

  return (
    <Modal>
      <MetalCard>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-6 w-6 shrink-0 text-cyan-400" />
                <h2 className="text-2xl font-bold metal-text">
                  {t("admin.meetings.title")}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                {t("admin.meetings.description")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onScopeChange && (
                <div className="flex items-center rounded-xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.03] p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onScopeChange("my")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      scope === "my"
                        ? "border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <User className={`h-3.5 w-3.5 shrink-0 ${scope === "my" ? "text-cyan-700 dark:text-cyan-300" : "text-muted"}`} />
                    <span>{t("admin.meetings.myMeetings")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onScopeChange("all")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      scope === "all"
                        ? "border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    <Layers className={`h-3.5 w-3.5 shrink-0 ${scope === "all" ? "text-cyan-700 dark:text-cyan-300" : "text-muted"}`} />
                    <span>{t("admin.meetings.allMeetings")}</span>
                  </button>
                </div>
              )}

              {canCreate && (
                <Modal.Open opens="create-meeting">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 hover:bg-cyan-200/80 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-400/50 dark:hover:bg-cyan-500/20 px-4 py-2.5 text-sm font-medium transition active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t("admin.meetings.scheduleMeeting")}</span>
                  </button>
                </Modal.Open>
              )}
            </div>
          </div>
        </div>
      </MetalCard>

      <Modal.Window name="create-meeting" size="md">
        <CreateMeetingModal />
      </Modal.Window>
    </Modal>
  );
}
