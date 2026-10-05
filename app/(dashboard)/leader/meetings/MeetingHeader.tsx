"use client";

import { Calendar, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Modal from "@/components/ui/Modal";
import CreateMeetingModal from "./CreateMeetingModal";
import { useRBAC } from "@/hooks/rbac/useRBAC";

export default function MeetingHeader() {
  const t = useTranslations("leader.meetings");
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
                  {t("title")}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted">
                {t("description")}
              </p>
            </div>

            {canCreate && (
              <div className="flex items-center gap-3">
                <Modal.Open opens="create-meeting">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 hover:bg-cyan-200/80 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-400/50 dark:hover:bg-cyan-500/20 px-4 py-2.5 text-sm font-medium transition active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t("scheduleMeeting")}</span>
                  </button>
                </Modal.Open>
              </div>
            )}
          </div>
        </div>
      </MetalCard>

      <Modal.Window name="create-meeting" size="md">
        <CreateMeetingModal />
      </Modal.Window>
    </Modal>
  );
}
