"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  Users,
  AlertCircle,
  Clock,
  Video,
  MapPin,
  FileEdit,
  User,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { useAuth } from "@/hooks/auth/useAuth";
import { useCreateMeeting } from "@/hooks/meeting/useCreateMeeting";
import { internService } from "@/services/intern.service";
import { leaderService } from "@/services/leader.service";
import { meetingService } from "@/services/meeting.service";
import { departmentService } from "@/services/department.service";
import type { CreateMeetingPayload, MeetingType } from "@/types/meeting";

interface Props {
  onCloseModal?: () => void;
  defaultDate?: Date;
}

function formatDateToIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeToHHMM(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function useCreateMeetingSchema(t: ReturnType<typeof useTranslations>) {
  return useMemo(
    () =>
      z
        .object({
          title: z
            .string()
            .min(1, t("titleRequired"))
            .max(200, t("titleTooLong")),
          description: z.string().optional(),
          departmentId: z.string().optional(),
          meetingType: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
          location: z.string().optional(),
          meetingLink: z.string().optional(),
          meetingDate: z.string().min(1, t("dateRequired")),
          startTimeStr: z.string().min(1, t("startTimeRequired")),
          endTimeStr: z.string().min(1, t("endTimeRequired")),
          status: z.enum(["DRAFT", "SCHEDULED"]),
        })
        .superRefine((d, ctx) => {
          if (d.meetingDate && d.startTimeStr && d.endTimeStr) {
            const startDateTime = new Date(`${d.meetingDate}T${d.startTimeStr}:00`);
            const endDateTime = new Date(`${d.meetingDate}T${d.endTimeStr}:00`);
            if (startDateTime >= endDateTime) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t("startBeforeEnd"),
                path: ["endTimeStr"],
              });
            }
            if (d.status === "SCHEDULED" && startDateTime <= new Date()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t("futureTimeRequired"),
                path: ["startTimeStr"],
              });
            }
          }
          if (
            (d.meetingType === "ONLINE" || d.meetingType === "HYBRID") &&
            !d.meetingLink?.trim()
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t("linkRequired"),
              path: ["meetingLink"],
            });
          }
        }),
    [t],
  );
}

interface FormValues {
  title: string;
  description?: string;
  departmentId?: string;
  meetingType: MeetingType;
  location?: string;
  meetingLink?: string;
  meetingDate: string;
  startTimeStr: string;
  endTimeStr: string;
  status: "DRAFT" | "SCHEDULED";
}

export default function CreateMeetingModal({ onCloseModal, defaultDate }: Props) {
  const t = useTranslations("leader.meetings");
  const { state } = useAuth();
  const currentUser = state.user;
  const createMeeting = useCreateMeeting();

  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  const initialDate = defaultDate || new Date();
  const initialDateStr = formatDateToIsoDate(initialDate);
  const initialStartTime = formatTimeToHHMM(initialDate);
  const nextHourDate = new Date(initialDate.getTime() + 3600000);
  const initialEndTime = formatTimeToHHMM(nextHourDate);

  const { data: internsData } = useQuery({
    queryKey: ["interns", { leaderId: currentUser?.id }],
    queryFn: () => internService.getInterns({ leaderId: currentUser!.id, limit: 100 }),
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
  });

  const { data: leadersData } = useQuery({
    queryKey: ["leaders", { limit: 100 }],
    queryFn: () => leaderService.getLeaders({ limit: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getDepartments(),
    staleTime: 1000 * 60 * 5,
  });

  const interns = useMemo(() => internsData?.data ?? [], [internsData]);
  const leaders = useMemo(
    () =>
      (leadersData?.data ?? [])
        .filter((l) => l.userId !== currentUser?.id)
        .map((l) => ({ id: l.userId, fullName: l.user.fullName || l.user.email })),
    [leadersData, currentUser?.id],
  );
  const departments = useMemo(() => departmentsData?.data ?? [], [departmentsData]);

  const schema = useCreateMeetingSchema(t);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      meetingType: "ONLINE",
      status: "SCHEDULED",
      meetingDate: initialDateStr,
      startTimeStr: initialStartTime,
      endTimeStr: initialEndTime,
      title: "",
      description: "",
      location: "",
      meetingLink: "",
      departmentId: "",
    },
  });

  const watchMeetingType = watch("meetingType");
  const watchStatus = watch("status");
  const watchMeetingDate = watch("meetingDate");
  const watchStartTimeStr = watch("startTimeStr");
  const watchEndTimeStr = watch("endTimeStr");

  const allUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const intern of interns) {
      if (intern.userId) ids.add(intern.userId);
    }
    for (const leader of leaders) {
      if (leader.id) ids.add(leader.id);
    }
    return Array.from(ids);
  }, [interns, leaders]);

  const queryStartTime = useMemo(() => {
    try {
      if (!watchMeetingDate || !watchStartTimeStr) return "";
      return new Date(`${watchMeetingDate}T${watchStartTimeStr}:00`).toISOString();
    } catch {
      return "";
    }
  }, [watchMeetingDate, watchStartTimeStr]);

  const queryEndTime = useMemo(() => {
    try {
      if (!watchMeetingDate || !watchEndTimeStr) return "";
      return new Date(`${watchMeetingDate}T${watchEndTimeStr}:00`).toISOString();
    } catch {
      return "";
    }
  }, [watchMeetingDate, watchEndTimeStr]);

  const { data: busyUsersRes } = useQuery({
    queryKey: ["meetings", "busy-users", queryStartTime, queryEndTime, allUserIds.join(",")],
    queryFn: () => meetingService.getBusyUsers(queryStartTime, queryEndTime, allUserIds.join(",")),
    enabled:
      !!queryStartTime &&
      !!queryEndTime &&
      new Date(queryStartTime) < new Date(queryEndTime) &&
      allUserIds.length > 0,
    staleTime: 1000 * 30,
  });
  const busyUserIds = useMemo(() => new Set(busyUsersRes?.data ?? []), [busyUsersRes]);

  const filteredInterns = useMemo(() => {
    if (!participantSearch.trim()) return interns;
    const q = participantSearch.trim().toLowerCase();
    return interns.filter((i) => i.fullName?.toLowerCase().includes(q));
  }, [interns, participantSearch]);

  const filteredLeaders = useMemo(() => {
    if (!participantSearch.trim()) return leaders;
    const q = participantSearch.trim().toLowerCase();
    return leaders.filter((l) => l.fullName?.toLowerCase().includes(q));
  }, [leaders, participantSearch]);

  function toggleParticipant(id: string) {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSelectAllInterns() {
    const internIds = filteredInterns.map((i) => i.userId);
    const allSelected = internIds.every((id) => selectedParticipantIds.includes(id));
    if (allSelected) {
      setSelectedParticipantIds((prev) => prev.filter((id) => !internIds.includes(id)));
    } else {
      setSelectedParticipantIds((prev) => Array.from(new Set([...prev, ...internIds])));
    }
  }

  function handleSelectAllLeaders() {
    const leaderIds = filteredLeaders.map((l) => l.id);
    const allSelected = leaderIds.every((id) => selectedParticipantIds.includes(id));
    if (allSelected) {
      setSelectedParticipantIds((prev) => prev.filter((id) => !leaderIds.includes(id)));
    } else {
      setSelectedParticipantIds((prev) => Array.from(new Set([...prev, ...leaderIds])));
    }
  }

  function onSubmit(data: FormValues) {
    if (!currentUser) {
      toast.error(t("mustBeLoggedIn"));
      return;
    }

    if (selectedParticipantIds.length === 0) {
      toast.error(t("selectOneParticipant"));
      return;
    }

    const startDateTime = new Date(`${data.meetingDate}T${data.startTimeStr}:00`);
    const endDateTime = new Date(`${data.meetingDate}T${data.endTimeStr}:00`);

    const payload: CreateMeetingPayload = {
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      departmentId: data.departmentId || undefined,
      hostId: currentUser.id,
      meetingType: data.meetingType,
      location: data.location?.trim() || undefined,
      meetingLink: data.meetingLink?.trim() || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      visibility: "PRIVATE",
      status: data.status,
      participantIds: selectedParticipantIds,
    };

    createMeeting.mutate(payload, {
      onSuccess: () => {
        onCloseModal?.();
      },
    });
  }

  const MEETING_TYPE_OPTIONS = [
    { value: "ONLINE", label: t("online"), icon: Video },
    { value: "OFFLINE", label: t("offline"), icon: MapPin },
    { value: "HYBRID", label: t("hybrid"), icon: Users },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
      {/* Sticky Header (Rule 44 Compliant) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-3 sm:pb-3.5 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-9 sm:pr-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 shadow-sm dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <Calendar className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold metal-text truncate">
                {t("scheduleMeeting")}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {selectedParticipantIds.length > 0
                  ? t("participantsInvited", { n: selectedParticipantIds.length })
                  : t("inviteHint")}
              </p>
            </div>
          </div>

          {/* Host Badge */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border dark:border-white/10 bg-card/60 dark:bg-card/40 px-3 py-1.5 text-xs text-muted shrink-0">
            <User className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span className="font-medium text-foreground max-w-[140px] truncate">
              {currentUser?.fullName || currentUser?.email}
            </span>
            <span className="rounded border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-300 px-1.5 py-0.5 text-[10px] font-semibold">
              {t("roleHost")}
            </span>
          </div>
        </div>
      </div>

      {/* Form Fields: Standard 2-Column Responsive Grid */}
      <div className="py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {/* Title */}
          <div className="col-span-full">
            <Input
              label={t("formTitle")}
              required
              placeholder={t("titlePlaceholder")}
              leftIcon={<FileEdit className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          {/* Meeting Type Selector */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
              <span>{t("formMeetingType")}</span>
              <span className="text-danger font-bold">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MEETING_TYPE_OPTIONS.map(({ value, label, icon: IconComponent }) => {
                const isSelected = watchMeetingType === value;
                return (
                  <label
                    key={value}
                    className={`
                      group relative flex items-center justify-center gap-1.5 rounded-xl border px-2
                      h-[42px] sm:h-[46px]
                      text-xs font-semibold transition-all duration-200 cursor-pointer select-none
                      ${
                        isSelected
                          ? "border-cyan-500/70 bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-500/30 dark:border-cyan-400/80 dark:bg-cyan-500/15 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(6,182,212,0.25)] dark:ring-cyan-400/40"
                          : "border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.03] text-muted hover:text-foreground hover:border-border-strong dark:hover:border-white/20 hover:bg-card-hover"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register("meetingType")}
                      className="sr-only"
                    />
                    <IconComponent
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isSelected ? "text-cyan-600 dark:text-cyan-400" : "text-muted group-hover:text-foreground"
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                );
              })}
            </div>
            {errors.meetingType && (
              <p className="text-xs text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.meetingType.message}</span>
              </p>
            )}
          </div>

          {/* Department Selection */}
          <div className="col-span-1">
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("department")}
                  placeholder={t("selectDepartment")}
                  value={field.value || ""}
                  onChange={(val) => field.onChange(val)}
                  searchable
                  options={[
                    { value: "", label: t("allDepartments") },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    })),
                  ]}
                  error={errors.departmentId?.message}
                />
              )}
            />
          </div>

          {/* Date Selection */}
          <div className="col-span-1">
            <DatePicker
              label={t("date")}
              required
              value={watchMeetingDate}
              onChange={(newDate) =>
                setValue("meetingDate", newDate, { shouldValidate: true })
              }
              error={errors.meetingDate?.message}
            />
          </div>

          {/* Time Selection */}
          <div className="col-span-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Controller
                  name="startTimeStr"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      label={t("startTime")}
                      required
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      onClear={() => field.onChange("")}
                      error={errors.startTimeStr?.message}
                    />
                  )}
                />
              </div>

              <div>
                <Controller
                  name="endTimeStr"
                  control={control}
                  render={({ field }) => (
                    <TimePicker
                      label={t("endTime")}
                      required
                      value={field.value}
                      onChange={(val) => field.onChange(val)}
                      onClear={() => field.onChange("")}
                      error={errors.endTimeStr?.message}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Meeting Link (ONLINE or HYBRID) */}
          {(watchMeetingType === "ONLINE" || watchMeetingType === "HYBRID") && (
            <div className={watchMeetingType === "HYBRID" ? "col-span-1" : "col-span-full"}>
              <Input
                label={t("formMeetingLink")}
                required
                type="url"
                leftIcon={<Video className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                placeholder={t("linkPlaceholder")}
                error={errors.meetingLink?.message}
                {...register("meetingLink")}
              />
            </div>
          )}

          {/* Location (OFFLINE or HYBRID) */}
          {(watchMeetingType === "OFFLINE" || watchMeetingType === "HYBRID") && (
            <div className={watchMeetingType === "HYBRID" ? "col-span-1" : "col-span-full"}>
              <Input
                label={t("formLocation")}
                type="text"
                leftIcon={<MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                placeholder={t("locationPlaceholder")}
                error={errors.location?.message}
                {...register("location")}
              />
            </div>
          )}

          {/* Status */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
              <span>{t("formStatus")}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "SCHEDULED", label: t("scheduled"), icon: Clock },
                { value: "DRAFT", label: t("draft"), icon: FileEdit },
              ].map(({ value, label, icon: IconComponent }) => {
                const isSelected = watchStatus === value;
                return (
                  <label
                    key={value}
                    className={`
                      group relative flex items-center justify-center gap-2 rounded-xl border px-3
                      h-[42px] sm:h-[46px]
                      text-xs font-semibold transition-all duration-200 cursor-pointer select-none
                      ${
                        isSelected
                          ? "border-cyan-500/70 bg-cyan-50 text-cyan-700 shadow-sm ring-1 ring-cyan-500/30 dark:border-cyan-400/80 dark:bg-cyan-500/15 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(6,182,212,0.25)] dark:ring-cyan-400/40"
                          : "border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.03] text-muted hover:text-foreground hover:border-border-strong dark:hover:border-white/20 hover:bg-card-hover"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register("status")}
                      className="sr-only"
                    />
                    <IconComponent
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isSelected ? "text-cyan-600 dark:text-cyan-400" : "text-muted group-hover:text-foreground"
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="col-span-full">
            <Textarea
              label={t("formDescription")}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              error={errors.description?.message}
              {...register("description")}
            />
          </div>

          {/* Participant Selection: Interns & Leaders */}
          <div className="col-span-full space-y-3 rounded-xl sm:rounded-2xl border border-border/70 dark:border-white/10 bg-card/40 dark:bg-white/[0.02] p-2.5 sm:p-4 shadow-glass backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-xs sm:text-sm font-semibold text-foreground/90 flex items-center gap-1.5 select-none">
                <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>{t("createModal.title")}</span>
                <span className="text-danger font-bold">*</span>
              </label>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder={t("searchParticipants")}
                  className="w-full rounded-xl border border-border/70 dark:border-white/10 bg-card dark:bg-white/[0.03] pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted outline-none transition focus:border-cyan-500 dark:focus:border-cyan-400/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Interns */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {t("yourInterns")} ({filteredInterns.length})
                  </span>
                  {filteredInterns.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllInterns}
                      className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition cursor-pointer"
                    >
                      {filteredInterns.every((i) => selectedParticipantIds.includes(i.userId))
                        ? t("deselectAll")
                        : t("selectAll")}
                    </button>
                  )}
                </div>
                <div className="h-44 space-y-1 overflow-y-auto overscroll-contain no-scrollbar pr-1 rounded-xl border border-border/60 dark:border-white/5 bg-card/60 dark:bg-white/[0.02] p-1.5 sm:p-2">
                  {filteredInterns.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted">0</p>
                  ) : (
                    filteredInterns.map((intern) => {
                      const isSelected = selectedParticipantIds.includes(intern.userId);
                      const isBusy = busyUserIds.has(intern.userId);
                      return (
                        <label
                          key={intern.userId}
                          onClick={() => toggleParticipant(intern.userId)}
                          className={`
                            flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition text-xs select-none
                            ${
                              isSelected
                                ? "border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300"
                                : "hover:bg-card-hover border border-transparent text-foreground"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Square className="h-3.5 w-3.5 shrink-0 text-muted" />
                            )}
                            <span className="truncate">{intern.fullName}</span>
                          </div>
                          {isBusy && (
                            <span className="rounded border border-rose-300 bg-rose-100/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                              {t("busy")}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Other Leaders */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {t("otherLeaders")} ({filteredLeaders.length})
                  </span>
                  {filteredLeaders.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllLeaders}
                      className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition cursor-pointer"
                    >
                      {filteredLeaders.every((l) => selectedParticipantIds.includes(l.id))
                        ? t("deselectAll")
                        : t("selectAll")}
                    </button>
                  )}
                </div>
                <div className="h-44 space-y-1 overflow-y-auto overscroll-contain no-scrollbar pr-1 rounded-xl border border-border/60 dark:border-white/5 bg-card/60 dark:bg-white/[0.02] p-1.5 sm:p-2">
                  {filteredLeaders.length === 0 ? (
                    <p className="p-3 text-center text-xs text-muted">0</p>
                  ) : (
                    filteredLeaders.map((leader) => {
                      const isSelected = selectedParticipantIds.includes(leader.id);
                      const isBusy = busyUserIds.has(leader.id);
                      return (
                        <label
                          key={leader.id}
                          onClick={() => toggleParticipant(leader.id)}
                          className={`
                            flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 transition text-xs select-none
                            ${
                              isSelected
                                ? "border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300"
                                : "hover:bg-card-hover border border-transparent text-foreground"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                            ) : (
                              <Square className="h-3.5 w-3.5 shrink-0 text-muted" />
                            )}
                            <span className="truncate">{leader.fullName}</span>
                          </div>
                          {isBusy && (
                            <span className="rounded border border-rose-300 bg-rose-100/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-medium shrink-0">
                              {t("busy")}
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-1 text-xs text-muted">
              {selectedParticipantIds.length > 0 ? (
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                  {t("selected", { n: selectedParticipantIds.length })}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400/80">{t("selectOneParticipant")}</span>
              )}
            </div>
          </div>
        </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pt-3 pb-1 -mb-1 border-t border-border dark:border-white/10 flex items-center justify-end gap-2.5 sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={createMeeting.isPending}
          onClick={onCloseModal}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={createMeeting.isPending}
          className="shadow-sm dark:shadow-lg dark:shadow-cyan-950/40"
        >
          {t("createMeeting")}
        </Button>
      </div>
    </form>
  );
}
