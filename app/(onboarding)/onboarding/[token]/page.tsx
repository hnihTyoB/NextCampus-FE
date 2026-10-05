"use client";

import { useEffect, useState, useRef, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  Search,
  Check,
} from "lucide-react";

import {
  verifyInviteService,
  getApplicationAttachmentPutUrl,
  createApplicationService,
} from "@/services/application.service";
import { getActiveRegulationService } from "@/services/regulation.service";
import {
  APPLICATION_PREFERRED_DEPARTMENTS,
  getApplicationPreferredPositions,
} from "@/constants/application-preferences";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import FileUpload, { type UploadedFileItem } from "@/components/ui/FileUpload";
import DOMPurify from "isomorphic-dompurify";

const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
const MAX_CV_FILES = 3;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".webp"];
const VIETNAMESE_PHONE_REGEX = /^(0[35789])[0-9]{8}$/;

const POPULAR_UNIVERSITIES = [
  "Đại học Bách Khoa - ĐHQG TP.HCM",
  "Đại học Bách Khoa Hà Nội",
  "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
  "Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
  "Đại học Quốc tế - ĐHQG TP.HCM",
  "Đại học Kinh tế TP.HCM (UEH)",
  "Đại học Ngoại thương (FTU)",
  "Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)",
  "Đại học FPT",
  "Học viện Công nghệ Bưu chính Viễn thông (PTIT)",
  "Đại học Công nghiệp TP.HCM (IUH)",
  "Đại học Tôn Đức Thắng (TDTU)",
  "Đại học Cần Thơ",
  "Đại học Đà Nẵng",
  "Khác / Ngoài danh sách",
];

function getBusinessToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

const buildFormSchema = (t: (key: string, values?: Record<string, string | number>) => string) =>
  z.object({
    fullName: z
      .string()
      .trim()
      .min(2, t("errFullNameRequired"))
      .max(100, t("errFullNameMax")),
    email: z.string().email(t("errEmail")),
    phone: z
      .string()
      .trim()
      .min(1, t("errPhoneRequired"))
      .regex(VIETNAMESE_PHONE_REGEX, t("errPhoneInvalid")),
    university: z.string().trim().min(2, t("errUniversityRequired")),
    major: z.string().trim().optional(),
    preferredDepartment: z.string().min(1, t("errDepartmentRequired")),
    preferredPosition: z.string().min(1, t("errPositionRequired")),
    startDate: z
      .string()
      .min(1, t("errStartDateRequired"))
      .refine((value) => parseDateOnly(value) !== null, {
        message: t("errStartDateRequired"),
      })
      .refine(
        (value) => {
          const d = parseDateOnly(value);
          return !d || value >= getBusinessToday();
        },
        { message: t("errStartDatePast") }
      )
      .refine((value) => {
        const date = parseDateOnly(value);
        return !date || ![0, 6].includes(date.getUTCDay());
      }, t("errStartDateWeekend")),
    duration: z
      .number({ message: t("errDurationMin") })
      .int()
      .min(1, t("errDurationMin"))
      .max(12, t("errDurationMax")),
    acceptedRegulations: z.boolean().refine((val) => val === true, {
      message: t("errRegulationsRequired"),
    }),
  });

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface UploadedCvInfo extends UploadedFileItem {
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  publicUrl: string;
}

export default function OnboardingPage() {
  const t = useTranslations("candidateOnboarding");
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? "";

  // Verification state
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  // Upload CV state
  const [cvFiles, setCvFiles] = useState<UploadedCvInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Regulation modal state
  const [regulationContent, setRegulationContent] = useState<string | null>(null);
  const [regulationVersion, setRegulationVersion] = useState<string | null>(null);
  const [regulationId, setRegulationId] = useState<string | undefined>(undefined);
  const [isLoadingRegulation, setIsLoadingRegulation] = useState(false);
  const [showRegulationModal, setShowRegulationModal] = useState(false);

  // Searchable university state
  const [uniSearch, setUniSearch] = useState("");
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const uniContainerRef = useRef<HTMLDivElement>(null);

  // Submission state
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Zod schema based on current locale translations
  const formSchema = useMemo(() => buildFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      university: "",
      major: "",
      preferredDepartment: "",
      preferredPosition: "",
      startDate: "",
      duration: 3,
      acceptedRegulations: false,
    },
  });

  const selectedDepartment = watch("preferredDepartment");
  const selectedUniversity = watch("university");

  // Step 1: Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerificationError(t("errTokenInvalid"));
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    verifyInviteService(token)
      .then((res) => {
        if (res.success && res.data.valid) {
          setInviteEmail(res.data.email);
          setValue("email", res.data.email);
          setVerificationError(null);
        } else {
          setVerificationError(t("errTokenDefault"));
        }
      })
      .catch((err: unknown) => {
        let errorMsg = t("errTokenDefault");
        if (axios.isAxiosError(err)) {
          const code = err.response?.data?.code || err.response?.data?.errorCode;
          if (code === "TOKEN_USED") {
            errorMsg = t("errTokenUsed");
          } else if (code === "TOKEN_EXPIRED") {
            errorMsg = t("errTokenExpired");
          } else if (code === "TOKEN_REVOKED") {
            errorMsg = t("errTokenRevoked");
          } else if (err.response?.data?.message) {
            errorMsg = err.response.data.message;
          }
        }
        setVerificationError(errorMsg);
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token, setValue, t]);

  // Close university dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (uniContainerRef.current && !uniContainerRef.current.contains(e.target as Node)) {
        setShowUniDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch regulation for reading
  const openRegulationModal = async () => {
    setShowRegulationModal(true);
    if (regulationContent) return;

    setIsLoadingRegulation(true);
    try {
      const res = await getActiveRegulationService();
      if (res.data) {
        setRegulationContent(res.data.content);
        setRegulationVersion(String(res.data.version));
        setRegulationId(res.data.id);
      }
    } catch {
      toast.error(t("loadRegulationsError"));
    } finally {
      setIsLoadingRegulation(false);
    }
  };

  // Upload CV handler directly to Cloudflare R2
  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const uploadedResults: UploadedCvInfo[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatusText(
          t("uploadStatus", {
            current: i + 1,
            total: files.length,
            name: file.name,
          })
        );

        // 1. Get presigned upload URL from Backend v2
        const urlRes = await getApplicationAttachmentPutUrl(
          token,
          file.name,
          file.type || "application/pdf"
        );
        const { uploadUrl, key, publicUrl } = urlRes.data;

        // 2. Upload directly to Cloudflare R2 via HTTP PUT with progress tracking
        await axios.put(uploadUrl, file, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const currentFilePercent = Math.round((progressEvent.loaded * 100) / total);
            const overallPercent = Math.round(
              ((i + currentFilePercent / 100) / files.length) * 100
            );
            setUploadProgress(overallPercent);
          },
        });

        uploadedResults.push({
          fileName: file.name,
          filePath: key || urlRes.data.fileKey,
          mimeType: file.type || "application/pdf",
          fileSize: file.size,
          publicUrl: publicUrl || uploadUrl.split("?")[0],
        });
      }

      setCvFiles((prev) => [...prev, ...uploadedResults]);
      toast.success(
        files.length === 1
          ? t("uploadSuccess")
          : t("uploadSuccessCount", { count: files.length })
      );
    } catch (err: unknown) {
      console.error("[Onboarding] Upload files error:", err);
      toast.error(t("uploadError"));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const handleRemoveCv = (indexToRemove: number) => {
    setCvFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Application
  const onSubmit = async (values: FormValues) => {
    if (cvFiles.length === 0) {
      toast.error(t("errAtLeastOneFile"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: values.fullName,
        email: inviteEmail || values.email,
        phone: values.phone,
        university: values.university,
        major: values.major || undefined,
        preferredDepartment: values.preferredDepartment,
        preferredPosition: values.preferredPosition,
        startDate: values.startDate,
        duration: values.duration,
        token,
        acceptedRegulations: values.acceptedRegulations,
        regulationId,
        cvUrl: cvFiles[0].publicUrl,
        uploadedFiles: cvFiles.map((f) => ({
          fileName: f.fileName,
          filePath: f.filePath,
          mimeType: f.mimeType,
          fileSize: f.fileSize,
        })),
      };

      const res = await createApplicationService(payload);
      if (res.success) {
        toast.success(t("submitSuccess"));
        startTransition(() => {
          router.push(`/onboarding/${token}/success`);
        });
      }
    } catch (err: unknown) {
      console.error("[Onboarding] Submit error:", err);
      let errorMsg = t("submitError");
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render: Loading token verification
  if (isVerifying) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-6 py-4 text-foreground shadow-2xl backdrop-blur-xl">
          <Spinner size="sm" />
          <span className="text-sm font-medium">{t("verifying")}</span>
        </div>
      </div>
    );
  }

  // Render: Token Invalid / Expired / Used
  if (verificationError) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center p-4">
        <MetalCard className="max-w-md w-full p-6 sm:p-8 text-center border-rose-500/20 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">{t("linkUnavailable")}</h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">{verificationError}</p>
          <div className="mt-6 rounded-xl border border-border bg-slate-50 dark:bg-white/[0.03] p-4 text-xs text-muted text-left space-y-1.5">
            <p className="font-semibold text-foreground">{t("troubleshootTitle")}</p>
            <p>{t("troubleshootSubmitted")}</p>
            <p>{t("troubleshootExpired")}</p>
          </div>
        </MetalCard>
      </div>
    );
  }

  const positions = selectedDepartment
    ? getApplicationPreferredPositions(selectedDepartment)
    : [];

  const filteredUnis = POPULAR_UNIVERSITIES.filter((u) =>
    u.toLowerCase().includes(uniSearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-4xl px-4 py-8 sm:py-12 mx-auto space-y-6">
      {/* Header with standard icon and heading alignment */}
      <MetalCard className="p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 shrink-0 text-primary-light" />
              <h1 className="text-2xl font-bold metal-text md:text-3xl">
                {t("pageTitle")}
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">
              {t("pageSubtitle")}
            </p>
          </div>
        </div>
      </MetalCard>

      {/* Main Application Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <MetalCard className={`p-6 md:p-8 space-y-6 overflow-visible relative transition-all ${showUniDropdown ? "z-40" : "z-30"}`}>
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wider text-xs">
              {t("section1Title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("fullName")} <span className="text-danger font-bold">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="text"
                  placeholder={t("fullNamePlaceholder")}
                  {...register("fullName")}
                  className={`w-full rounded-xl border bg-slate-50/80 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-primary-light/50 ${
                    errors.fullName ? "border-danger focus:border-danger" : "border-border dark:border-white/10"
                  }`}
                />
              </div>
              {errors.fullName && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email (Readonly from invite) */}
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("email")} <span className="text-danger font-bold">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="email"
                  value={inviteEmail}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-border dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-muted cursor-not-allowed outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {t("emailNote")}
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("phone")} <span className="text-danger font-bold">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  {...register("phone")}
                  className={`w-full rounded-xl border bg-slate-50/80 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-primary-light/50 ${
                    errors.phone ? "border-danger focus:border-danger" : "border-border dark:border-white/10"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.phone.message}
                </p>
              )}
            </div>

            {/* University (Searchable Dropdown) */}
            <div className={`relative ${showUniDropdown ? "z-50" : "z-10"}`} ref={uniContainerRef}>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("university")} <span className="text-danger font-bold">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="text"
                  placeholder={t("universityPlaceholder")}
                  value={selectedUniversity}
                  onChange={(e) => {
                    setValue("university", e.target.value, { shouldValidate: true });
                    setUniSearch(e.target.value);
                    setShowUniDropdown(true);
                  }}
                  onFocus={() => {
                    setUniSearch(selectedUniversity || "");
                    setShowUniDropdown(true);
                  }}
                  className={`w-full rounded-xl border bg-slate-50/80 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-primary-light/50 ${
                    errors.university ? "border-danger focus:border-danger" : "border-border dark:border-white/10"
                  }`}
                />
              </div>

              {showUniDropdown && (
                <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-white/95 dark:bg-[#0B1020]/95 p-1 shadow-2xl backdrop-blur-xl scrollbar-dropdown">
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted border-b border-border dark:border-white/5 flex items-center gap-2">
                    <Search className="h-3 w-3" /> {t("suggestedUnis")}
                  </div>
                  {filteredUnis.length === 0 ? (
                    <div className="p-3 text-xs text-muted">
                      {t("useCustomUni", { name: uniSearch })}
                    </div>
                  ) : (
                    filteredUnis.map((uni) => (
                      <button
                        key={uni}
                        type="button"
                        onClick={() => {
                          setValue("university", uni, { shouldValidate: true });
                          setShowUniDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition hover:bg-slate-100 dark:hover:bg-white/10 ${
                          selectedUniversity === uni
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-medium"
                            : "text-foreground"
                        }`}
                      >
                        <span className="truncate">{uni}</span>
                        {selectedUniversity === uni && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />}
                      </button>
                    ))
                  )}
                </div>
              )}

              {errors.university && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.university.message}
                </p>
              )}
            </div>

            {/* Major */}
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("major")}
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="text"
                  placeholder={t("majorPlaceholder")}
                  {...register("major")}
                  className="w-full rounded-xl border border-border dark:border-white/10 bg-slate-50/80 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted/60 focus:border-primary-light/50"
                />
              </div>
            </div>
          </div>
        </MetalCard>

        {/* Section 2: Preferred Department & Position */}
        <MetalCard className="p-6 md:p-8 space-y-6 overflow-visible relative z-20">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wider text-xs">
              {t("section2Title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Preferred Department */}
            <Select
              label={t("preferredDepartment")}
              required
              error={errors.preferredDepartment?.message}
              placeholder={t("selectDepartmentPlaceholder")}
              value={selectedDepartment}
              options={APPLICATION_PREFERRED_DEPARTMENTS.map((dept) => ({
                value: dept,
                label: dept,
              }))}
              onChange={(val) => {
                setValue("preferredDepartment", val, { shouldValidate: true });
                setValue("preferredPosition", "");
              }}
            />

            {/* Preferred Position */}
            <Select
              label={t("preferredPosition")}
              required
              disabled={!selectedDepartment}
              error={errors.preferredPosition?.message}
              placeholder={!selectedDepartment ? t("selectDepartmentFirst") : t("selectPositionPlaceholder")}
              value={watch("preferredPosition")}
              options={positions.map((pos) => ({
                value: pos,
                label: pos,
              }))}
              onChange={(val) => {
                setValue("preferredPosition", val, { shouldValidate: true });
              }}
            />

            {/* Start Date (Weekend + Past Date blocked) */}
            <div>
              <DatePicker
                label={t("startDate")}
                required
                value={watch("startDate")}
                minDate={getBusinessToday()}
                onChange={(d) => {
                  setValue("startDate", d, { shouldValidate: true });
                }}
                onClear={() => {
                  setValue("startDate", "", { shouldValidate: true });
                }}
                error={errors.startDate?.message}
                helperText={t("startDateHelper")}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("duration")}
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted/70 shrink-0" />
                <input
                  type="number"
                  min={1}
                  max={12}
                  {...register("duration", { valueAsNumber: true })}
                  className={`w-full rounded-xl border bg-slate-50/80 dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary-light/50 ${
                    errors.duration ? "border-danger focus:border-danger" : "border-border dark:border-white/10"
                  }`}
                />
              </div>
              {errors.duration && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.duration.message}
                </p>
              )}
            </div>
          </div>
        </MetalCard>

        {/* Section 3: Document & CV Upload directly to Cloudflare R2 (Max 3 files) */}
        <MetalCard className="p-6 md:p-8 space-y-5 relative z-10">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-semibold text-foreground uppercase tracking-wider text-xs">
              {t("section3Title")}
            </h2>
          </div>

          <FileUpload
            maxFiles={MAX_CV_FILES}
            maxSizeMB={10}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            allowedExtensions={ALLOWED_EXTENSIONS}
            files={cvFiles}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatusText={uploadStatusText}
            disabled={isSubmitting}
            onFilesSelected={handleUploadFiles}
            onFileRemove={handleRemoveCv}
            dropzoneTitle={
              cvFiles.length === 0
                ? t("dropzoneEmpty")
                : t("dropzoneMore", { remaining: MAX_CV_FILES - cvFiles.length })
            }
            dropzoneSubtitle={t("dropzoneSubtitle")}
          />
        </MetalCard>

        {/* Section 4: Regulations acceptance */}
        <MetalCard className="p-6 md:p-8 space-y-4 relative z-0">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("acceptedRegulations")}
              className="mt-1 h-4 w-4 rounded border-border text-primary-light accent-primary-light focus:ring-primary-light/50 cursor-pointer"
            />
            <div className="text-xs text-muted leading-relaxed">
              {t("agreementPrefix")}{" "}
              <button
                type="button"
                onClick={openRegulationModal}
                className="text-primary-light hover:underline font-semibold"
              >
                {t("regulationsLink")}
              </button>{" "}
              <span className="text-danger font-bold">*</span>
            </div>
          </label>
          {errors.acceptedRegulations && (
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.acceptedRegulations.message}
            </p>
          )}
        </MetalCard>

        {/* Submit action */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting || isUploading || cvFiles.length === 0}
            className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold shadow-[0_0_30px_rgba(21,174,245,0.3)] hover:shadow-[0_0_40px_rgba(21,174,245,0.5)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t("submitButton")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Regulation Modal */}
      {showRegulationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-2xl w-full max-h-[85vh] flex flex-col rounded-3xl border border-border dark:border-white/10 bg-white dark:bg-[#0B1020] text-foreground shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border dark:border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-light shrink-0" />
                <div>
                  <h3 className="font-bold text-base text-foreground">{t("modalTitle")}</h3>
                  {regulationVersion && (
                    <span className="text-[11px] text-primary-light font-medium">
                      {t("modalVersion", { version: regulationVersion })}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegulationModal(false)}
                className="rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 text-sm text-foreground/90 leading-relaxed space-y-4 scrollbar-dropdown">
              {isLoadingRegulation ? (
                <div className="flex h-40 items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : regulationContent ? (
                <div
                  className="prose dark:prose-invert max-w-none text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(regulationContent) }}
                />
              ) : (
                <div className="space-y-3 text-xs text-muted">
                  <p className="font-semibold text-foreground">{t("defaultRulesTitle")}</p>
                  <p>{t("defaultRule1")}</p>
                  <p>{t("defaultRule2")}</p>
                  <p>{t("defaultRule3")}</p>
                  <p>{t("defaultRule4")}</p>
                </div>
              )}
            </div>

            <div className="border-t border-border dark:border-white/10 px-6 py-4 flex justify-end bg-slate-50/50 dark:bg-white/[0.02]">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setValue("acceptedRegulations", true, { shouldValidate: true });
                  setShowRegulationModal(false);
                }}
              >
                {t("modalAgreeButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}