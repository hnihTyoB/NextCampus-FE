"use client";

import { useState } from "react";
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import DOMPurify from "isomorphic-dompurify";
import Button from "@/components/ui/Button";
import { useActiveRegulation } from "@/hooks/regulation/useActiveRegulation";
import { useAcknowledgeRegulation } from "@/hooks/regulation/useAcknowledgeRegulation";

export default function InternRegulationModal() {
  const t = useTranslations("intern.dashboard");
  const { data: response, isLoading } = useActiveRegulation();
  const acknowledgeMutation = useAcknowledgeRegulation();

  const [hasAgreed, setHasAgreed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isManuallyOpened, setIsManuallyOpened] = useState(false);

  const regulation = response?.data;
  const isUnacknowledged = Boolean(regulation && regulation.isActive && !regulation.isAcknowledged);
  const showFullModal = (!isDismissed && isUnacknowledged) || isManuallyOpened;

  if (isLoading || !regulation || !regulation.isActive) {
    return null;
  }

  // If already acknowledged, show a subtle success badge/banner or null
  if (regulation.isAcknowledged) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-400 shadow-soft">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="font-medium">
            {t("regulationAcknowledged")} (v{regulation.version})
          </span>
        </div>
        {regulation.acknowledgedAt && (
          <span className="text-xs text-emerald-400/80">
            {new Date(regulation.acknowledgedAt).toLocaleDateString("vi-VN")}
          </span>
        )}
      </div>
    );
  }

  // TTS has not acknowledged the active regulation yet: Show high-priority Warning Banner & Modal
  const sanitizedContent = DOMPurify.sanitize(regulation.content);

  const handleAcknowledge = () => {
    if (!hasAgreed) return;
    acknowledgeMutation.mutate(regulation.id, {
      onSuccess: () => {
        setIsDismissed(true);
        setIsManuallyOpened(false);
      },
    });
  };

  return (
    <>
      {/* Persistent Warning Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-glass animate-fadeIn">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  {regulation.title} (v{regulation.version})
                </span>
              </div>
              <h3 className="mt-1 text-base font-bold text-foreground">
                {t("regulationAcknowledgeTitle")}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {t("regulationAcknowledgeDesc")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsManuallyOpened(true);
                setIsDismissed(false);
              }}
              className="flex items-center gap-1.5"
            >
              <FileText className="h-4 w-4" />
              <span>{t("readAndAcknowledgeNow")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mandatory Modal */}
      {showFullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-[#0b1020] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-main/20 text-primary-light shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {regulation.title}
                  </h2>
                  <p className="text-xs text-muted">
                    {t("regulationVersionUpdated", {
                      version: regulation.version,
                      date: new Date(regulation.updatedAt).toLocaleDateString("vi-VN"),
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Regulation scrollable content */}
            <div
              className="mt-4 max-h-[50vh] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300 leading-relaxed prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            {/* Agreement Checkbox */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-primary-light cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-200 font-medium">
                  {t("agreeTermsCheckbox")}
                </span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  setIsDismissed(true);
                  setIsManuallyOpened(false);
                }}
                disabled={acknowledgeMutation.isPending}
              >
                {t("close")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcknowledge}
                disabled={!hasAgreed || acknowledgeMutation.isPending}
                isLoading={acknowledgeMutation.isPending}
                className="flex items-center gap-1.5"
              >
                {!acknowledgeMutation.isPending && <CheckCircle2 className="h-4 w-4" />}
                <span>{t("acknowledgeRegulationBtn")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
