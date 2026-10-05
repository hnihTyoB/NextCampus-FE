"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  FileText,
  CircleCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { getActiveRegulationService } from "@/services/regulation.service";
import type { Regulation } from "@/types/regulation";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import styles from "./policies.module.css";

import DOMPurify from "isomorphic-dompurify";

export default function PoliciesPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const t = useTranslations("candidateOnboarding");

  const [regulation, setRegulation] = useState<Regulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    getActiveRegulationService()
      .then((res) => setRegulation(res.data))
      .catch(() => setError(t("unableToLoadPolicies")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-6 py-4 text-foreground shadow-xl backdrop-blur-xl">
          <Spinner size="sm" />
          <span>{t("loadingPolicies")}</span>
        </div>
      </div>
    );
  }

  if (error || !regulation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md items-start gap-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <AlertTriangle className="mt-0.5 h-6 w-6 text-red-500 dark:text-red-400 shrink-0" />
          <div>
            <h2 className="font-semibold text-red-600 dark:text-red-300">
              {t("unableToLoadPolicies")}
            </h2>
            <p className="mt-1 text-sm text-red-600/80 dark:text-red-200/80">
              {error || t("loadRegulationsError")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(regulation.content);

  return (
    <div className="w-full max-w-5xl space-y-6 mx-auto px-4 py-8 md:px-6">
      {/* Hero */}
      <MetalCard className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400 shadow-md">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {t("policiesTitle")}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
              {t("policiesSubtitle")}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-xl border border-border bg-slate-100/70 dark:bg-white/5 px-4 py-2 text-sm text-foreground">
                {t("modalVersion", { version: regulation.version })}
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                {t("policiesActive")}
              </div>
            </div>
          </div>
        </div>
      </MetalCard>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetalCard className="h-full p-5">
          <FileText className="mb-4 h-6 w-6 text-sky-500 dark:text-sky-400" />
          <h3 className="font-semibold text-foreground">
            {t("readCarefullyTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("readCarefullyDesc")}
          </p>
        </MetalCard>

        <MetalCard className="h-full p-5">
          <CircleCheck className="mb-4 h-6 w-6 text-emerald-500 dark:text-emerald-400" />
          <h3 className="font-semibold text-foreground">
            {t("complianceTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("complianceDesc")}
          </p>
        </MetalCard>

        <MetalCard className="h-full p-5 md:col-span-2 xl:col-span-1">
          <ShieldCheck className="mb-4 h-6 w-6 text-violet-500 dark:text-violet-400" />
          <h3 className="font-semibold text-foreground">
            {t("confirmationTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("confirmationDesc")}
          </p>
        </MetalCard>
      </div>

      {/* Policy content */}
      <MetalCard className="overflow-hidden p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {regulation.title}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {t("policiesDocument")}
          </p>
        </div>

        <div
          className={`${styles.content}
            prose dark:prose-invert
            max-h-[60vh]
            overflow-y-auto
            px-6 py-6
            md:px-8
            text-foreground
            prose-headings:text-foreground
            prose-p:text-foreground/90
            prose-li:text-foreground/90
          `}
          dangerouslySetInnerHTML={{
            __html: sanitizedContent,
          }}
        />
      </MetalCard>

      {/* Agreement */}
      <MetalCard className="p-5 md:p-6">
        <label className="flex cursor-pointer items-start gap-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-border accent-sky-500 focus:ring-sky-500"
          />

          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {t("agreePoliciesCheckbox")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {t("agreePoliciesConfirm")}
            </p>
          </div>
        </label>
      </MetalCard>

      {/* Button */}
      <button
        type="button"
        disabled={!agreed}
        onClick={() => router.push(`/onboarding/${params.token}`)}
        className="
          w-full rounded-2xl
          bg-gradient-to-r
          from-sky-500
          to-cyan-400
          px-6 py-4
          text-sm font-semibold text-white
          shadow-[0_0_35px_rgba(21,174,245,0.25)]
          transition-all
          hover:-translate-y-0.5
          disabled:cursor-not-allowed
          disabled:opacity-50
          cursor-pointer
        "
      >
        {t("agreeAndContinue")}
      </button>
    </div>
  );
}
