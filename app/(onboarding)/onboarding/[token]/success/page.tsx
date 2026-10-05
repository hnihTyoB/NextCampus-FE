"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";

export default function SuccessPage() {
  const t = useTranslations("candidateOnboarding");

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
      <MetalCard className="max-w-md w-full p-8 text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 shadow-lg">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {t("successTitle")}
          </h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            {t("successDescription")}
          </p>
        </div>
        <p className="text-xs text-muted/70 pt-2 border-t border-border">
          {t("successCloseTip")}
        </p>
      </MetalCard>
    </div>
  );
}
