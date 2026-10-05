"use client";

import { Check, X, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

import { useApplications } from "@/hooks/application/useApplications";
import { useReviewApplication } from "@/hooks/application/useReviewApplication";
import type { Application } from "@/types/application";
import Table from "@/components/ui/Table";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

import { toast } from "react-hot-toast";

const COLUMNS =
    "minmax(180px,1.4fr) minmax(200px,1.4fr) minmax(130px,1fr) minmax(130px,1fr) 110px 180px";

export default function PendingInternsTable() {
    const t = useTranslations();
    const locale = useLocale();
    const { data, isLoading, isError, refetch, isFetching } = useApplications({ status: "PENDING" });
    const { mutate: review, isPending: reviewing } = useReviewApplication();

    const applications = data?.data ?? [];

    function handleReview(appId: string, status: "APPROVED" | "REJECTED", onClose?: () => void) {
        review(
            { id: appId, payload: { status } },
            {
                onSuccess: () => {
                    toast.success(
                        status === "APPROVED"
                            ? t("admin.onboarding.approveSuccess")
                            : t("admin.onboarding.rejectSuccess")
                    );
                    onClose?.();
                },
                onError: (err: any) => {
                    const apiMsg = err?.response?.data?.message;
                    toast.error(
                        apiMsg ||
                            (status === "APPROVED"
                                ? t("admin.onboarding.approveError")
                                : t("admin.onboarding.rejectError"))
                    );
                },
            }
        );
    }

    if (isLoading) {
        return (
            <MetalCard className="flex items-center justify-center py-16">
                <Spinner size="lg" />
            </MetalCard>
        );
    }

    if (isError) {
        return (
            <MetalCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm text-rose-300">
                    {t("admin.interns.pendingLoadError")}
                </p>
            </MetalCard>
        );
    }

    if (applications.length === 0) {
        return (
            <MetalCard className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <Clock className="h-6 w-6" />
                </div>
                <p className="text-base font-medium text-foreground">
                    {t("admin.interns.noPending")}
                </p>
            </MetalCard>
        );
    }

    return (
        <Modal>
            <Table
                columns={COLUMNS}
                className="
                    bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)]
                    shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
                    hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)]
                    transition-shadow duration-500
                "
            >
                <Table.Header>
                    <div>{t("admin.interns.colCandidate")}</div>
                    <div>{t("admin.interns.colEmail")}</div>
                    <div>{t("admin.interns.colDepartment")}</div>
                    <div>{t("admin.interns.colPosition")}</div>
                    <div>{t("admin.interns.colSubmitted")}</div>
                    <div className="flex items-center justify-end gap-2">
                        <span>{t("admin.interns.colActions")}</span>
                        <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
                    </div>
                </Table.Header>

                <Table.Body
                    data={applications}
                    render={(app: Application) => (
                        <Table.Row key={app.id}>
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white shadow-sm ring-1 ring-white/10">
                                    {app.fullName.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-foreground truncate">
                                    {app.fullName}
                                </span>
                            </div>

                            <div className="text-sm text-muted truncate">
                                {app.email}
                            </div>

                            <div className="text-sm text-muted truncate">
                                {app.department?.name ?? "—"}
                            </div>

                            <div className="text-sm text-muted truncate">
                                {app.position?.name ?? "—"}
                            </div>

                            <div className="text-sm text-muted">
                                {new Date(app.createdAt).toLocaleDateString(
                                    locale === "vi" ? "vi-VN" : "en-GB",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    },
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <Modal.Open opens={`approve-${app.id}`}>
                                    <button
                                        type="button"
                                        disabled={reviewing}
                                        className="flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                        {t("admin.interns.approve")}
                                    </button>
                                </Modal.Open>

                                <Modal.Open opens={`reject-${app.id}`}>
                                    <button
                                        type="button"
                                        disabled={reviewing}
                                        className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        {t("admin.interns.reject")}
                                    </button>
                                </Modal.Open>

                                <Modal.Window name={`approve-${app.id}`} size="sm">
                                    <ConfirmDialog
                                        title={t("admin.interns.approveTitle")}
                                        message={t("admin.interns.approveMessage", { name: app.fullName })}
                                        action="APPROVED"
                                        appId={app.id}
                                        isPending={reviewing}
                                        onAction={handleReview}
                                    />
                                </Modal.Window>

                                <Modal.Window name={`reject-${app.id}`} size="sm">
                                    <ConfirmDialog
                                        title={t("admin.interns.rejectTitle")}
                                        message={t("admin.interns.rejectMessage", { name: app.fullName })}
                                        action="REJECTED"
                                        appId={app.id}
                                        isPending={reviewing}
                                        onAction={handleReview}
                                    />
                                </Modal.Window>
                            </div>
                        </Table.Row>
                    )}
                />
            </Table>
        </Modal>
    );
}

function ConfirmDialog({
    title,
    message,
    action,
    appId,
    isPending,
    onAction,
    onCloseModal,
}: {
    title: string;
    message: string;
    action: "APPROVED" | "REJECTED";
    appId: string;
    isPending?: boolean;
    onAction: (appId: string, action: "APPROVED" | "REJECTED", onClose?: () => void) => void;
    onCloseModal?: () => void;
}) {
    const t = useTranslations();
    const isApprove = action === "APPROVED";

    return (
        <div className="px-2 py-8 text-center">
            <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner ${
                    isApprove
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
            >
                {isApprove ? <Check className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
            <div className="mt-6 flex justify-center gap-3">
                <button
                    type="button"
                    onClick={onCloseModal}
                    disabled={isPending}
                    className="rounded-xl border border-border dark:border-white/10 bg-card/40 px-5 py-2 text-sm text-muted hover:text-foreground hover:bg-card active:scale-[0.98] transition disabled:opacity-50"
                >
                    {t("admin.interns.cancel")}
                </button>
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        onAction(appId, action, onCloseModal);
                    }}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50 shadow-sm ${
                        isApprove
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-rose-600 hover:bg-rose-500"
                    }`}
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isApprove ? t("admin.interns.approve") : t("admin.interns.reject")}
                </button>
            </div>
        </div>
    );
}
