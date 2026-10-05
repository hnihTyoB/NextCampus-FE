"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Globe,
  Mail,
  Save,
  RotateCcw,
  Eye,
  Info,
  Bell,
  AlertCircle,
} from "lucide-react";
import type { NotificationTemplate } from "@/types/notificationTemplate";
import { useUpsertNotificationTemplate } from "@/hooks/notificationTemplate/useUpsertNotificationTemplate";
import { useResetNotificationTemplate } from "@/hooks/notificationTemplate/useResetNotificationTemplate";
import { TEMPLATE_CATALOG } from "./TemplateSidebar";
import DOMPurify from "isomorphic-dompurify";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import Spinner from "@/components/ui/Spinner";
import { useRBAC } from "@/hooks/rbac/useRBAC";

// ─── Types ────────────────────────────────────────────────────────────────

type Channel = "web" | "email";

const schema = z.object({
  webTitle: z.string().max(200).optional(),
  webContent: z.string().max(2000).optional(),
  emailSubject: z.string().max(200).optional(),
  emailContent: z.string().max(10000).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Sample values for Live Preview ───────────────────────────────────────

const SAMPLE_VALUES: Record<string, string> = {
  taskTitle: "Xây dựng tính năng đăng nhập",
  deadline: "25/07/2026 17:00",
  internName: "Nguyễn Văn A",
  attempt: "2",
  reviewStatus: "APPROVED",
  week: "4",
  totalScore: "8.5",
  applyUrl: "https://nexcampus.vn/onboarding/invite-token-abc123xyz",
  email: "candidate@example.com",
  password: "SecureTempPassword123!",
  loginUrl: "https://nexcampus.vn/login",
  fullName: "Trần Thị B",
  position: "NodeJS Developer Intern",
  department: "Product Engineering",
  resetLink: "https://nexcampus.vn/reset-password?token=reset-token-xyz789",
  time: "21/07/2026 22:00:00",
  ip: "113.161.12.34",
  location: "TP. Hồ Chí Minh, Việt Nam",
  device: "Desktop",
  os: "Windows 11",
  browser: "Google Chrome",
  revokeUrl: "https://nexcampus.vn/security-alert?token=sample-revoke-token-123",
  meetingTitle: "Sprint Planning Q3",
  startTime: "26/07/2026 09:00",
  creatorName: "Lê Văn C (Leader)",
  userName: "Nguyễn Văn A",
  reason: "Trùng lịch bảo vệ đồ án tốt nghiệp",
  status: "APPROVED",
};

function interpolatePreview(template: string): string {
  let processed = template;

  // 1. Replace variables inside href="..." or href='...' raw, to avoid breaking HTML syntax
  processed = processed.replace(
    /(href=["'])(.*?)(["'])/gi,
    (_match: string, prefix: string, content: string, suffix: string) => {
      const cleanContent = content.replace(
        /\{\{(\w+)\}\}/g,
        (__: string, key: string) => {
          return SAMPLE_VALUES[key] !== undefined ? SAMPLE_VALUES[key] : "#";
        }
      );
      return prefix + cleanContent + suffix;
    }
  );

  // 2. Wrap remaining variables outside href attributes with styled <mark> tags
  processed = processed.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
    return SAMPLE_VALUES[key] !== undefined
      ? `<mark class="bg-cyan-500/20 text-cyan-300 rounded px-1 py-0.5 font-mono text-xs font-semibold">${SAMPLE_VALUES[key]}</mark>`
      : `<span class="text-rose-400 font-mono text-xs">{{${key}}}</span>`;
  });

  return processed;
}

// ─── Sub-components ───────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
      {children}
      {required && <span className="text-danger font-bold">*</span>}
    </label>
  );
}

function VariableChips({
  variables,
  onInsert,
}: {
  variables: readonly string[];
  onInsert: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onInsert(v)}
          className="
            group flex items-center gap-1
            rounded-lg sm:rounded-xl border border-cyan-400/25
            bg-cyan-500/10 px-2.5 py-1.5
            font-mono text-xs font-medium text-cyan-300
            transition-all duration-200 cursor-pointer
            hover:scale-105 hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:text-cyan-200
            active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
          "
          title={`Nhấn để chèn {{${v}}}`}
        >
          <span>{"{{" + v + "}}"}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

type Props = {
  type: string;
  template: NotificationTemplate | null;
};

export default function TemplateEditor({ type, template }: Props) {
  const meta = TEMPLATE_CATALOG.find((t) => t.type === type);
  if (!meta) return null;
  return <TemplateEditorInner type={type} template={template} meta={meta} />;
}

function TemplateEditorInner({
  type,
  template,
  meta,
}: Props & { meta: (typeof TEMPLATE_CATALOG)[number] }) {
  const t = useTranslations();
  const { canAny } = useRBAC();
  const canManage = canAny([
    "NOTIFICATION_TEMPLATE_MANAGE",
    "TEMPLATE_MANAGE",
    "NOTIFICATION_UPDATE",
  ]);
  const { mutate: upsert, isPending: saving } = useUpsertNotificationTemplate();
  const { mutate: reset, isPending: resetting } = useResetNotificationTemplate();

  const [channel, setChannel] = useState<Channel>("web");

  // Localized label and description
  const label = t.has(`admin.emails.catalog.${type}.label`)
    ? t(`admin.emails.catalog.${type}.label`)
    : meta.label;

  const description = t.has(`admin.emails.catalog.${type}.description`)
    ? t(`admin.emails.catalog.${type}.description`)
    : meta.description;

  // Helper to determine effective email content (fallback to catalog if old DB template lacks new variables)
  const getEffectiveEmailContent = (
    tmpl: NotificationTemplate | null,
    m: typeof meta
  ) => {
    if (!tmpl?.emailContentTemplate) return m.defaults.emailContentTemplate ?? "";
    if (
      tmpl.type === "PASSWORD_RESET" &&
      !tmpl.emailContentTemplate.includes("{{ip}}")
    ) {
      return m.defaults.emailContentTemplate ?? "";
    }
    return tmpl.emailContentTemplate;
  };

  // Effective defaults: DB record values, else catalog defaults
  const defaults = {
    webTitle: template?.titleTemplate ?? meta?.defaults.titleTemplate ?? "",
    webContent: template?.contentTemplate ?? meta?.defaults.contentTemplate ?? "",
    emailSubject:
      template?.emailSubjectTemplate ?? meta?.defaults.emailSubjectTemplate ?? "",
    emailContent: getEffectiveEmailContent(template, meta),
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset: resetForm,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Switch to first available channel of this template if current channel not supported
  useEffect(() => {
    if (meta && !(meta.channels as readonly string[]).includes(channel)) {
      setChannel(meta.channels[0] as Channel);
    }
  }, [type, meta, channel]);

  // Reset form when selected template changes
  useEffect(() => {
    resetForm({
      webTitle: template?.titleTemplate ?? meta?.defaults.titleTemplate ?? "",
      webContent: template?.contentTemplate ?? meta?.defaults.contentTemplate ?? "",
      emailSubject:
        template?.emailSubjectTemplate ?? meta?.defaults.emailSubjectTemplate ?? "",
      emailContent: getEffectiveEmailContent(template, meta),
    });
  }, [type, template, meta, resetForm]);

  // Watch live values
  const webTitle = watch("webTitle");
  const webContent = watch("webContent");
  const emailSubject = watch("emailSubject");
  const emailContent = watch("emailContent");

  // Cursor refs for variable insertion — must be merged with RHF refs
  const webTitleRef = useRef<HTMLInputElement>(null);
  const webContentRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedRef = useRef<
    "webTitle" | "webContent" | "emailSubject" | "emailContent"
  >("webContent");

  // Destructure RHF refs so we can merge them with our DOM refs
  const { ref: webTitleRhfRef, ...webTitleRest } = register("webTitle");
  const { ref: webContentRhfRef, ...webContentRest } = register("webContent");
  const { ref: emailSubjectRhfRef, ...emailSubjectRest } =
    register("emailSubject");
  const { ref: emailContentRhfRef, ...emailContentRest } =
    register("emailContent");

  function insertVariable(varName: string) {
    const field = lastFocusedRef.current;
    const token = `{{${varName}}}`;

    const getEl = () => {
      if (field === "webTitle") return webTitleRef.current;
      if (field === "webContent") return webContentRef.current;
      if (field === "emailSubject") return emailSubjectRef.current;
      if (field === "emailContent") return emailContentRef.current;
      return null;
    };

    const el = getEl();
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const current = (getValues(field) as string) ?? "";
    const newValue =
      current.substring(0, start) + token + current.substring(end);

    setValue(field, newValue, { shouldDirty: true });

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  function onSave(data: FormValues) {
    if (!meta) return;

    // Helper to check missing variables in title/content
    const checkChannelVariables = (
      titleStr: string = "",
      contentStr: string = "",
      channelName: string
    ) => {
      const combined = `${titleStr} ${contentStr}`;
      const missing: string[] = [];
      for (const variable of meta.variables) {
        if (!combined.includes(`{{${variable}}}`)) {
          missing.push(`{{${variable}}}`);
        }
      }
      if (missing.length > 0) {
        toast.error(
          t("admin.emails.missingVariables", {
            channel: channelName,
            vars: missing.join(", "),
          })
        );
        return false;
      }
      return true;
    };

    if ((meta.channels as readonly string[]).includes("web")) {
      if (!data.webTitle?.trim()) {
        toast.error(t("admin.emails.webTitleRequired"));
        return;
      }
      if (!data.webContent?.trim()) {
        toast.error(t("admin.emails.webContentRequired"));
        return;
      }
      if (!checkChannelVariables(data.webTitle, data.webContent, "Web")) {
        return;
      }
    }

    if ((meta.channels as readonly string[]).includes("email")) {
      if (!data.emailSubject?.trim()) {
        toast.error(t("admin.emails.emailSubjectRequired"));
        return;
      }
      if (!data.emailContent?.trim()) {
        toast.error(t("admin.emails.emailContentRequired"));
        return;
      }
      if (
        !checkChannelVariables(data.emailSubject, data.emailContent, "Email")
      ) {
        return;
      }
    }

    const titleTemplate =
      data.webTitle?.trim() ||
      data.emailSubject?.trim() ||
      meta.defaults.emailSubjectTemplate ||
      "Notification";

    const contentTemplate = data.webContent?.trim() || "Notification";

    upsert({
      type,
      payload: {
        titleTemplate,
        contentTemplate,
        emailSubjectTemplate: data.emailSubject || null,
        emailContentTemplate: data.emailContent || null,
      },
    });
  }

  function onReset() {
    if (!template?.id) return;
    reset(template.id, {
      onSuccess: () => {
        resetForm({
          webTitle: meta?.defaults.titleTemplate ?? "",
          webContent: meta?.defaults.contentTemplate ?? "",
          emailSubject: meta?.defaults.emailSubjectTemplate ?? "",
          emailContent: meta?.defaults.emailContentTemplate ?? "",
        });
      },
    });
  }

  const inputClass =
    "w-full rounded-xl bg-card border border-border text-foreground px-4 py-2.5 sm:py-3 text-sm h-[42px] sm:h-[46px] outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 placeholder:text-muted/60 font-mono";

  const textareaClass =
    "w-full rounded-xl bg-card border border-border text-foreground px-4 py-2.5 sm:py-3 text-sm outline-none transition-all duration-200 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 placeholder:text-muted/60 font-mono custom-scrollbar";

  const previewTitle =
    channel === "web"
      ? webTitle || meta.defaults.titleTemplate || "—"
      : emailSubject ||
        webTitle ||
        meta.defaults.emailSubjectTemplate ||
        meta.defaults.titleTemplate ||
        "—";

  const previewContent =
    channel === "web"
      ? webContent || meta.defaults.contentTemplate || "—"
      : emailContent ||
        webContent ||
        meta.defaults.emailContentTemplate ||
        meta.defaults.contentTemplate ||
        "—";

  const Icon = meta.icon;

  return (
    <div
      className="
        rounded-3xl
        border border-border
        bg-card/90 dark:bg-[#0c1222]/90
        shadow-[0_12px_40px_rgba(0,0,0,.35)]
        backdrop-blur-xl
        overflow-hidden
        flex flex-col
      "
    >
      {/* Editor Header */}
      <div className="border-b border-border/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/[0.02]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Icon className="h-5 w-5 shrink-0" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {label}
            </h2>
            <p className="text-xs text-muted mt-0.5">{description}</p>
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="rounded-xl border border-border bg-white/5 px-3 py-1 font-mono text-xs text-primary-light font-semibold">
            {type}
          </span>
        </div>
      </div>

      {/* Channel Tabs */}
      <div className="border-b border-border/80 px-6 flex gap-2 pt-3 bg-white/[0.01]">
        {(meta.channels as readonly string[]).includes("web") && (
          <button
            type="button"
            onClick={() => setChannel("web")}
            className={`
              flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer
              ${
                channel === "web"
                  ? "border border-b-0 border-border bg-card text-cyan-400 shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }
            `}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span>{t("admin.emails.web")}</span>
          </button>
        )}

        {(meta.channels as readonly string[]).includes("email") && (
          <button
            type="button"
            onClick={() => setChannel("email")}
            className={`
              flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer
              ${
                channel === "email"
                  ? "border border-b-0 border-border bg-card text-cyan-400 shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }
            `}
          >
            <Mail className="h-4 w-4 shrink-0" />
            <span>{t("admin.emails.email")}</span>
            {(meta.channels as readonly string[]).includes("web") &&
              !template?.emailSubjectTemplate &&
              !template?.emailContentTemplate && (
                <span className="rounded-full bg-cyan-500/15 border border-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-300 font-medium">
                  {t("admin.emails.inheritsWeb")}
                </span>
              )}
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-6 flex-1">
        {channel === "web" && (
          <div className="space-y-4">
            {/* Web Title */}
            <div className="space-y-1.5">
              <FieldLabel required>{t("admin.emails.notifTitle")}</FieldLabel>
              <input
                {...webTitleRest}
                ref={(el) => {
                  webTitleRhfRef(el);
                  webTitleRef.current = el;
                }}
                type="text"
                placeholder={t("admin.emails.titlePlaceholder")}
                onFocus={() => (lastFocusedRef.current = "webTitle")}
                className={inputClass}
              />
              {errors.webTitle && (
                <p className="text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.webTitle.message}</span>
                </p>
              )}
            </div>

            {/* Web Content */}
            <div className="space-y-1.5">
              <FieldLabel required>{t("admin.emails.notifContent")}</FieldLabel>
              <textarea
                {...webContentRest}
                ref={(el) => {
                  webContentRhfRef(el);
                  webContentRef.current = el;
                }}
                rows={4}
                placeholder={t("admin.emails.contentPlaceholder")}
                onFocus={() => (lastFocusedRef.current = "webContent")}
                className={`${textareaClass} resize-none`}
              />
              {errors.webContent && (
                <p className="text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.webContent.message}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {channel === "email" && (
          <div className="space-y-4">
            {/* Email Subject */}
            <div className="space-y-1.5">
              <FieldLabel required>{t("admin.emails.emailSubject")}</FieldLabel>
              <p className="text-xs text-muted">
                {t("admin.emails.emailSubjectHint")}
              </p>
              <input
                {...emailSubjectRest}
                ref={(el) => {
                  emailSubjectRhfRef(el);
                  emailSubjectRef.current = el;
                }}
                type="text"
                placeholder={
                  webTitle
                    ? `${t("admin.emails.fallsBackWebTitle")}: "${webTitle}"`
                    : t("admin.emails.fallsBackWebTitle")
                }
                onFocus={() => (lastFocusedRef.current = "emailSubject")}
                className={inputClass}
              />
            </div>

            {/* Email Content */}
            <div className="space-y-1.5">
              <FieldLabel required>{t("admin.emails.emailBody")}</FieldLabel>
              <p className="text-xs text-muted">
                {t("admin.emails.emailBodyHint")}
              </p>
              <textarea
                {...emailContentRest}
                ref={(el) => {
                  emailContentRhfRef(el);
                  emailContentRef.current = el;
                }}
                rows={6}
                placeholder={
                  webContent
                    ? `${t("admin.emails.fallsBackWebContent")}:\n"${webContent}"`
                    : t("admin.emails.fallsBackWebContent")
                }
                onFocus={() => (lastFocusedRef.current = "emailContent")}
                className={`${textareaClass} resize-y min-h-[140px] max-h-[480px]`}
              />
            </div>
          </div>
        )}

        {/* Available Variables */}
        <div className="space-y-2 rounded-2xl border border-border bg-background/50 p-4">
          <div className="flex items-center gap-2">
            <FieldLabel>{t("admin.emails.availableVariables")}</FieldLabel>
            <Info className="h-3.5 w-3.5 text-muted shrink-0" />
            <span className="text-xs text-muted">
              {t("admin.emails.clickToInsert")}
            </span>
          </div>
          <VariableChips
            variables={meta.variables}
            onInsert={insertVariable}
          />
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FieldLabel>{t("admin.emails.livePreview")}</FieldLabel>
              <Eye className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            </div>
            <span className="text-xs text-muted">
              {t("admin.emails.sampleSubstituted")}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-inner">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                .preview-html ul {
                  list-style-type: disc !important;
                  padding-left: 1.25rem !important;
                  margin-top: 0.5rem !important;
                  margin-bottom: 0.5rem !important;
                }
                .preview-html ol {
                  list-style-type: decimal !important;
                  padding-left: 1.25rem !important;
                  margin-top: 0.5rem !important;
                  margin-bottom: 0.5rem !important;
                }
                .preview-html li {
                  display: list-item !important;
                  margin-bottom: 0.25rem !important;
                }
                .email-paper {
                  background-color: #ffffff !important;
                  color: #1e293b !important;
                  border-radius: 16px !important;
                  padding: 1.5rem !important;
                  width: 100% !important;
                  max-width: 620px !important;
                  box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
                  border: 1px solid #e2e8f0 !important;
                  line-height: 1.6 !important;
                  text-align: left !important;
                }
                .email-paper a {
                  color: #2563eb !important;
                  text-decoration: underline !important;
                }
                .email-paper a[style*="background-color"] {
                  color: #ffffff !important;
                  text-decoration: none !important;
                }
                .email-paper mark {
                  background-color: #ecfeff !important;
                  color: #0891b2 !important;
                }
              `,
              }}
            />

            {channel === "email" ? (
              <div className="space-y-4">
                {/* Envelope Meta Header */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted w-14 shrink-0">
                      {t("admin.emails.subject")}:
                    </span>
                    <p
                      className="text-foreground font-semibold preview-html truncate"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          interpolatePreview(previewTitle),
                          { ADD_ATTR: ["style", "target"] }
                        ),
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <span className="font-semibold w-14 shrink-0">
                      {t("admin.emails.sender")}:
                    </span>
                    <span>NexCampus System &lt;no-reply@nexcampus.vn&gt;</span>
                  </div>
                </div>

                {/* Simulated Email Canvas */}
                <div className="rounded-2xl bg-slate-950/80 p-4 sm:p-6 flex justify-center border border-border">
                  <div
                    className="email-paper preview-html text-sm"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        interpolatePreview(previewContent),
                        { ADD_ATTR: ["style", "target"] }
                      ),
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Simulated Web Notification Popover Item */
              <div className="rounded-2xl border border-cyan-400/20 bg-card p-4 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                      <Bell className="h-3.5 w-3.5 shrink-0" />
                    </div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      NexCampus System
                    </span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {t("admin.emails.justNow")}
                  </span>
                </div>

                <div className="space-y-1">
                  <p
                    className="text-sm font-bold text-foreground preview-html"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        interpolatePreview(previewTitle),
                        { ADD_ATTR: ["style", "target"] }
                      ),
                    }}
                  />
                  <p
                    className="text-xs sm:text-sm text-muted leading-relaxed preview-html"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        interpolatePreview(previewContent),
                        { ADD_ATTR: ["style", "target"] }
                      ),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        {canManage && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border pt-5">
            {/* Restore Default */}
            <div>
              {template?.id ? (
                <button
                  type="button"
                  onClick={onReset}
                  disabled={resetting}
                  className="
                    flex items-center gap-2 rounded-xl border border-rose-500/20
                    bg-rose-500/5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-400
                    transition-all duration-200 cursor-pointer
                    hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300
                    active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {resetting ? (
                    <Spinner size="sm" />
                  ) : (
                    <RotateCcw className="h-4 w-4 shrink-0" />
                  )}
                  <span>{t("admin.emails.restoreDefault")}</span>
                </button>
              ) : (
                <p className="text-xs text-muted flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                  <span>{t("admin.emails.usingFallback")}</span>
                </p>
              )}
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving || (!isDirty && !!template)}
              className="
                group relative inline-flex items-center justify-center gap-2 overflow-hidden
                rounded-xl sm:rounded-2xl
                h-[42px] sm:h-[46px] px-6 sm:px-8
                bg-gradient-to-r from-(--primary-main) to-(--primary-light)
                text-sm font-semibold text-white
                shadow-[0_0_25px_rgba(21,174,245,0.25)]
                transition-all duration-300
                hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(21,174,245,0.4)] hover:brightness-110
                active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer select-none
              "
            >
              <span
                className="
                  pointer-events-none absolute inset-y-0 -left-24 w-16 rotate-12
                  bg-white/30 blur-lg
                  transition-all duration-700
                  group-hover:left-[130%]
                "
              />
              <span className="relative flex items-center gap-2">
                {saving ? (
                  <Spinner size="sm" />
                ) : (
                  <Save className="h-4 w-4 shrink-0" />
                )}
                <span>{t("admin.emails.saveChanges")}</span>
              </span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
