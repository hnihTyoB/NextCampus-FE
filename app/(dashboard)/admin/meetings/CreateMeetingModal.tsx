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
  Globe,
  Lock,
  FileEdit,
  User,
  Search,
  Headphones,
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
import { useDiscordVoiceRooms } from "@/hooks/meeting/useDiscordVoiceRooms";
import { getUsersService } from "@/services/user.service";
import { meetingService } from "@/services/meeting.service";
import { departmentService } from "@/services/department.service";
import type { CreateMeetingPayload, MeetingType, MeetingVisibility } from "@/types/meeting";

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
            .min(1, t("admin.meetings.titleRequired"))
            .max(200, t("admin.meetings.titleTooLong")),
          description: z.string().optional(),
          departmentId: z.string().optional(),
          meetingType: z.enum(["ONLINE", "OFFLINE", "HYBRID"]),
          location: z.string().optional(),
          meetingLink: z.string().optional(),
          discordChannelId: z.string().optional(),
          meetingDate: z.string().min(1, t("admin.meetings.dateRequired")),
          startTimeStr: z.string().min(1, t("admin.meetings.startTimeRequired")),
          endTimeStr: z.string().min(1, t("admin.meetings.endTimeRequired")),
          visibility: z.enum(["PRIVATE", "TEAM"]),
          status: z.enum(["DRAFT", "SCHEDULED"]),
        })
        .superRefine((d, ctx) => {
          if (d.meetingDate && d.startTimeStr && d.endTimeStr) {
            const startDateTime = new Date(`${d.meetingDate}T${d.startTimeStr}:00`);
            const endDateTime = new Date(`${d.meetingDate}T${d.endTimeStr}:00`);
            if (startDateTime >= endDateTime) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t("admin.meetings.startBeforeEnd"),
                path: ["endTimeStr"],
              });
            }
            if (d.status === "SCHEDULED" && startDateTime <= new Date()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: t("admin.meetings.futureTimeRequired"),
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
              message: t("admin.meetings.linkRequired"),
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
  discordChannelId?: string;
  meetingDate: string;
  startTimeStr: string;
  endTimeStr: string;
  visibility: MeetingVisibility;
  status: "DRAFT" | "SCHEDULED";
}

export default function CreateMeetingModal({ onCloseModal, defaultDate }: Props) {
  const t = useTranslations();
  const { state } = useAuth();
  const currentUser = state.user;
  const createMeeting = useCreateMeeting();
  const [selectedLeaderIds, setSelectedLeaderIds] = useState<string[]>([]);
  const [leaderSearch, setLeaderSearch] = useState("");

  const initialDate = defaultDate || new Date();
  const initialDateStr = formatDateToIsoDate(initialDate);
  const initialStartTime = formatTimeToHHMM(initialDate);
  const nextHourDate = new Date(initialDate.getTime() + 3600000);
  const initialEndTime = formatTimeToHHMM(nextHourDate);

  const { data: leadersData } = useQuery({
    queryKey: ["users", { roleName: "LEADER", limit: 100 }],
    queryFn: () => getUsersService({ roleName: "LEADER", limit: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getDepartments(),
    staleTime: 1000 * 60 * 5,
  });

  const leaders = useMemo(() => leadersData?.data ?? [], [leadersData]);
  const departments = useMemo(() => departmentsData?.data ?? [], [departmentsData]);

  const { data: voiceRoomsRes } = useDiscordVoiceRooms(true);
  const voiceRooms = useMemo(() => voiceRoomsRes?.data ?? [], [voiceRoomsRes]);

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
      visibility: "TEAM",
      status: "SCHEDULED",
      meetingDate: initialDateStr,
      startTimeStr: initialStartTime,
      endTimeStr: initialEndTime,
      title: "",
      description: "",
      location: "",
      meetingLink: "",
      discordChannelId: "",
      departmentId: "",
    },
  });

  const watchMeetingType = watch("meetingType");
  const watchVisibility = watch("visibility");
  const watchStatus = watch("status");
  const watchMeetingDate = watch("meetingDate");
  const watchStartTimeStr = watch("startTimeStr");
  const watchEndTimeStr = watch("endTimeStr");

  const allUserIds = useMemo(() => {
    return leaders.map((l) => l.id).filter(Boolean);
  }, [leaders]);

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

  const filteredLeaders = useMemo(() => {
    if (!leaderSearch.trim()) return leaders;
    const query = leaderSearch.trim().toLowerCase();
    return leaders.filter(
      (leader) =>
        (leader.fullName && leader.fullName.toLowerCase().includes(query)) ||
        (leader.email && leader.email.toLowerCase().includes(query)),
    );
  }, [leaders, leaderSearch]);

  function toggleLeader(id: string) {
    setSelectedLeaderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleSelectAllLeaders() {
    if (selectedLeaderIds.length === leaders.length) {
      setSelectedLeaderIds([]);
    } else {
      setSelectedLeaderIds(leaders.map((l) => l.id));
    }
  }

  function onSubmit(data: FormValues) {
    if (!currentUser) {
      toast.error(t("admin.meetings.mustBeLoggedIn"));
      return;
    }

    if (data.visibility === "PRIVATE" && selectedLeaderIds.length === 0) {
      toast.error(t("admin.meetings.selectLeaderPrivate"));
      return;
    }

    const startIso = new Date(`${data.meetingDate}T${data.startTimeStr}:00`).toISOString();
    const endIso = new Date(`${data.meetingDate}T${data.endTimeStr}:00`).toISOString();

    const payload: CreateMeetingPayload = {
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      departmentId: data.departmentId || undefined,
      hostId: currentUser.id,
      meetingType: data.meetingType,
      location: data.location?.trim() || undefined,
      meetingLink: data.meetingLink?.trim() || undefined,
      discordChannelId: data.discordChannelId?.trim() || undefined,
      startTime: startIso,
      endTime: endIso,
      visibility: data.visibility,
      status: data.status,
      participantIds:
        data.visibility === "PRIVATE" && selectedLeaderIds.length > 0
          ? selectedLeaderIds
          : undefined,
    };

    createMeeting.mutate(payload, {
      onSuccess: () => onCloseModal?.(),
    });
  }

  const MEETING_TYPES: Array<{
    type: MeetingType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { type: "ONLINE", label: t("admin.meetings.online"), icon: Video },
    { type: "OFFLINE", label: t("admin.meetings.offline"), icon: MapPin },
    { type: "HYBRID", label: t("admin.meetings.hybrid"), icon: Globe },
  ];

  const VISIBILITY_OPTIONS: Array<{
    value: MeetingVisibility;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "TEAM", label: t("admin.meetings.formCompany"), icon: Globe },
    { value: "PRIVATE", label: t("admin.meetings.formPrivate"), icon: Lock },
  ];

  const STATUS_OPTIONS: Array<{
    value: "SCHEDULED" | "DRAFT";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { value: "SCHEDULED", label: t("admin.meetings.scheduled"), icon: Clock },
    { value: "DRAFT", label: t("admin.meetings.draft"), icon: FileEdit },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
      {/* Sticky Header (Rule 44 Compliant: Icon + Heading inside a dedicated flex container) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-3 sm:pb-4 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-9 sm:pr-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300 shadow-sm dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <Calendar className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold metal-text truncate">
                {t("admin.meetings.scheduleMeeting")}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {watchVisibility === "TEAM"
                  ? t("admin.meetings.visibleToAll")
                  : selectedLeaderIds.length > 0
                  ? t(
                      selectedLeaderIds.length > 1
                        ? "admin.meetings.leadersInvited"
                        : "admin.meetings.leaderInvited",
                      { n: selectedLeaderIds.length },
                    )
                  : t("admin.meetings.selectLeaders")}
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
              {t("admin.meetings.roleHost")}
            </span>
          </div>
        </div>
      </div>

      {/* Form Fields: Standard 2-Column Responsive Grid */}
      <div className="py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {/* Title */}
        <div className="col-span-full">
          <Input
            label={t("admin.meetings.formTitle")}
            required
            placeholder={t("admin.meetings.titlePlaceholder")}
            error={errors.title?.message}
            {...register("title")}
          />
        </div>

        {/* Meeting Type Selector */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            <span>{t("admin.meetings.formMeetingType")}</span>
            <span className="text-danger font-bold">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MEETING_TYPES.map(({ type, label, icon: IconComponent }) => {
              const isSelected = watchMeetingType === type;
              return (
                <label
                  key={type}
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
                    value={type}
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
                label={t("admin.meetings.department")}
                placeholder={t("admin.meetings.selectDepartment")}
                value={field.value || ""}
                onChange={(val) => field.onChange(val)}
                searchable
                options={[
                  { value: "", label: t("admin.meetings.allDepartments") },
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

        {/* Meeting Link (ONLINE or HYBRID) */}
        {(watchMeetingType === "ONLINE" || watchMeetingType === "HYBRID") && (
          <div className={watchMeetingType === "HYBRID" ? "col-span-1" : "col-span-full"}>
            <Input
              label={t("admin.meetings.formMeetingLink")}
              required
              type="url"
              leftIcon={<Video className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
              placeholder={t("admin.meetings.linkPlaceholder")}
              error={errors.meetingLink?.message}
              {...register("meetingLink")}
            />
          </div>
        )}

        {/* Discord Voice Room (ONLINE or HYBRID) */}
        {(watchMeetingType === "ONLINE" || watchMeetingType === "HYBRID") && (
          <div className="col-span-full space-y-2">
            <Controller
              name="discordChannelId"
              control={control}
              render={({ field }) => (
                <Select
                  label={t("admin.meetings.formDiscordVoiceRoom")}
                  placeholder={t("admin.meetings.selectDiscordVoiceRoom")}
                  value={field.value || ""}
                  onChange={(val) => field.onChange(val)}
                  options={[
                    { value: "", label: t("admin.meetings.noDiscordRoom") },
                    ...voiceRooms.map((room) => {
                      const privacyTag = room.isPrivate
                        ? `🔒 [${t("admin.meetings.privateRoomTag")}]`
                        : `🌐 [${t("admin.meetings.publicRoomTag")}]`;
                      return {
                        value: room.id,
                        label: `${room.name} ${privacyTag} (${room.currentMembersCount} ${t("admin.meetings.onlineMembers")})`,
                      };
                    }),
                  ]}
                  error={errors.discordChannelId?.message}
                />
              )}
            />
            {watch("discordChannelId") && (
              <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-300 dark:text-indigo-200">
                <Headphones className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <p className="leading-relaxed">
                  {t("admin.meetings.discordVoiceRoomNotice")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location (OFFLINE or HYBRID) */}
        {(watchMeetingType === "OFFLINE" || watchMeetingType === "HYBRID") && (
          <div className={watchMeetingType === "HYBRID" ? "col-span-1" : "col-span-full"}>
            <Input
              label={t("admin.meetings.formLocation")}
              type="text"
              leftIcon={<MapPin className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
              placeholder={t("admin.meetings.locationPlaceholder")}
              error={errors.location?.message}
              {...register("location")}
            />
          </div>
        )}

        {/* Date Selection */}
        <div className="col-span-1">
          <DatePicker
            label={t("admin.meetings.date")}
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
                    label={t("admin.meetings.startTime")}
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
                    label={t("admin.meetings.endTime")}
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

        {/* Visibility */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            <span>{t("admin.meetings.formVisibility")}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {VISIBILITY_OPTIONS.map(({ value, label, icon: IconComponent }) => {
              const isSelected = watchVisibility === value;
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
                    {...register("visibility")}
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

        {/* Status */}
        <div className="col-span-1 flex flex-col gap-1.5">
          <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
            <span>{t("admin.meetings.formStatus")}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(({ value, label, icon: IconComponent }) => {
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

        {/* Leader Invitation (Only when Visibility === PRIVATE) */}
        {watchVisibility === "PRIVATE" && (
          <div className="col-span-full rounded-xl sm:rounded-2xl border border-border dark:border-white/10 bg-card/40 dark:bg-white/[0.02] p-2.5 sm:p-4 shadow-glass backdrop-blur-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs sm:text-sm font-semibold text-foreground/90 select-none flex items-center gap-2">
                <Users className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                <span>{t("admin.meetings.inviteLeaders")}</span>
                <span className="text-danger font-bold">*</span>
                {selectedLeaderIds.length > 0 && (
                  <span className="ml-1 rounded-full border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/20 dark:text-cyan-300 px-2 py-0.5 text-[11px] font-bold">
                    {t(
                      selectedLeaderIds.length > 1
                        ? "admin.meetings.leadersSelectedPlural"
                        : "admin.meetings.leadersSelected",
                      { n: selectedLeaderIds.length },
                    )}
                  </span>
                )}
              </label>

              {leaders.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllLeaders}
                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline transition self-start sm:self-auto cursor-pointer"
                >
                  {selectedLeaderIds.length === leaders.length
                    ? t("admin.meetings.deselectAll")
                    : t("admin.meetings.selectAll")}
                </button>
              )}
            </div>

            {/* Quick search leaders */}
            {leaders.length > 5 && (
              <div className="relative mt-2.5 sm:mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={leaderSearch}
                  onChange={(e) => setLeaderSearch(e.target.value)}
                  placeholder={t("admin.meetings.searchLeaders")}
                  className="w-full rounded-xl bg-card dark:bg-white/[0.04] border border-border dark:border-white/10 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted outline-none transition focus:border-cyan-500 dark:focus:border-cyan-400/50"
                />
              </div>
            )}

            {leaders.length === 0 ? (
              <p className="mt-3 text-xs text-muted">
                {t("admin.meetings.noLeadersAvailable")}
              </p>
            ) : filteredLeaders.length === 0 ? (
              <p className="mt-3 text-xs text-muted text-center py-2">
                {t("admin.meetings.noLeadersAvailable")}
              </p>
            ) : (
              <div className="mt-2.5 sm:mt-3 max-h-44 space-y-1.5 overflow-y-auto overscroll-contain rounded-xl border border-border dark:border-white/10 bg-card/60 dark:bg-white/[0.02] p-1.5 sm:p-2 no-scrollbar">
                {filteredLeaders.map((leader) => {
                  const isBusy = busyUserIds.has(leader.id);
                  const isSelected = selectedLeaderIds.includes(leader.id);
                  return (
                    <label
                      key={leader.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-all select-none ${
                        isSelected
                          ? "border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 shadow-sm"
                          : "hover:bg-card-hover dark:hover:bg-white/5 text-foreground/90 border border-transparent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLeader(leader.id)}
                        className="rounded accent-cyan-600 dark:accent-cyan-500 h-4 w-4 cursor-pointer"
                      />
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300 bg-cyan-100/80 text-[11px] font-bold text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-950/70 dark:text-cyan-300">
                          {(leader.fullName || leader.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs sm:text-sm font-medium">
                            {leader.fullName || leader.email}
                          </p>
                          {leader.fullName && leader.email && (
                            <p className="truncate text-[11px] text-muted">
                              {leader.email}
                            </p>
                          )}
                        </div>
                      </div>
                      {isBusy && (
                        <span className="shrink-0 rounded-lg border border-rose-300 bg-rose-100/80 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                          {t("admin.meetings.busy")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="col-span-full">
          <Textarea
            label={t("admin.meetings.formDescription")}
            placeholder={t("admin.meetings.descriptionPlaceholder")}
            rows={2}
            error={errors.description?.message}
            {...register("description")}
          />
        </div>
      </div>

      {/* Sticky Action Footer (Always pinned at bottom of modal viewport) */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pt-3 pb-1 -mb-1 border-t border-border dark:border-white/10 flex items-center justify-end gap-2.5 sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={createMeeting.isPending}
          onClick={onCloseModal}
        >
          {t("admin.meetings.cancel")}
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={createMeeting.isPending}
          className="shadow-sm dark:shadow-lg dark:shadow-cyan-950/40"
        >
          {t("admin.meetings.createMeeting")}
        </Button>
      </div>
    </form>
  );
}
