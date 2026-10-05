"use client";

import { useState } from "react";
import { UserPlus, Clock, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { useApplications } from "@/hooks/application/useApplications";
import InviteInternForm from "../onboarding/InviteInternForm";
import CreateInternModal from "./CreateInternModal";
import PendingInternsTable from "./PendingInternsTable";
import MetalCard from "@/components/ui/MetalCard";
import Modal from "@/components/ui/Modal";
import { toast } from "react-hot-toast";
import { useCreateInvite } from "@/hooks/application/useCreateInvite";
import { useRBAC } from "@/hooks/rbac/useRBAC";

export default function InternHeader() {
    const t = useTranslations();
    const { can } = useRBAC();
    const canCreateIntern = can("INTERN_CREATE");
    const canCreateInvite = can("APPLICATION_CREATE");
    const canReadApplications = can("APPLICATION_READ");

    const [showDirectModal, setShowDirectModal] = useState(false);
    const [showPending, setShowPending] = useState(false);

    const { data: pendingData } = useApplications(
        { status: "PENDING" },
        { enabled: canReadApplications },
    );
    const pendingCount = pendingData?.meta?.total ?? 0;

    const { mutate: createInvite, isPending } = useCreateInvite();

    return (
        <Modal>
            <MetalCard>
                <div className="p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold metal-text">
                                    {t("admin.interns.title")}
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-muted">
                                {t("admin.interns.description")}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            {canCreateIntern && (
                                <button
                                    type="button"
                                    onClick={() => setShowDirectModal(true)}
                                    className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 shadow-sm cursor-pointer"
                                >
                                    <UserCheck className="h-4 w-4 shrink-0" />
                                    <span>{t("admin.interns.directAdd")}</span>
                                </button>
                            )}

                            {canCreateInvite && (
                                <Modal.Open opens="invite-intern">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-95 shadow-sm cursor-pointer"
                                    >
                                        <UserPlus className="h-4 w-4 shrink-0" />
                                        <span>{t("admin.interns.addIntern")}</span>
                                    </button>
                                </Modal.Open>
                            )}

                            {canReadApplications && (
                                <button
                                    type="button"
                                    onClick={() => setShowPending((prev) => !prev)}
                                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition active:scale-95 shadow-sm cursor-pointer ${
                                        showPending
                                            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300"
                                            : "border-border dark:border-white/10 bg-card/60 text-muted hover:border-border-strong hover:bg-card hover:text-foreground"
                                    }`}
                                >
                                    <Clock className="h-4 w-4 shrink-0" />
                                    <span>{t("admin.interns.pendingInterns")}</span>
                                    {pendingCount > 0 && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-semibold text-amber-400">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </MetalCard>

            {canReadApplications && showPending && (
                <div className="mt-6 animate-fadeIn">
                    <PendingInternsTable />
                </div>
            )}

            <CreateInternModal
                open={showDirectModal}
                onClose={() => setShowDirectModal(false)}
            />

            <Modal.Window name="invite-intern" size="sm">
                <InviteInternForm
                    isPending={isPending}
                    onSubmit={(email, onSuccess) =>
                        createInvite(
                            { email },
                            {
                                onSuccess: () => {
                                    toast.success(t("admin.onboarding.createSuccess"));
                                    onSuccess();
                                },
                                onError: () => {
                                    toast.error(t("admin.onboarding.createError"));
                                },
                            }
                        )
                    }
                />
            </Modal.Window>
        </Modal>
    );
}
