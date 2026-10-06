"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  User,
  Users,
  Loader2,
  AlertCircle,
  Building,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  useGroupAiRecommendation,
  useConfirmGroupAiAllocation,
} from "@/hooks/task-group/useGroupAiAllocation";
import { useTaskGroup } from "@/hooks/task-group/useTaskGroup";
import { useAuth } from "@/hooks/auth/useAuth";
import { hasPermission } from "@/lib/portal";
import axios from "axios";

interface Props {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

interface DraftAssignment {
  taskId: string;
  internId: string;
  supportId: string | null;
}

const priorityBadge: Record<string, string> = {
  HIGH: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  LOW: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

export default function TaskGroupAiAllocationModal({
  groupId,
  groupName,
  onClose,
}: Props) {
  const { data, isLoading, isError, error, refetch } = useGroupAiRecommendation(groupId);
  const { data: groupData } = useTaskGroup(groupId);
  const { state } = useAuth();
  const confirmMutation = useConfirmGroupAiAllocation();

  const errorMessage = useMemo(() => {
    if (!error) return null;
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      return error.response.data.message;
    }
    return error.message;
  }, [error]);
  const hasGlobalAccess =
    hasPermission(state.user?.permissions, "INTERN_DELETE") ||
    hasPermission(state.user?.permissions, "USER_ROLE_ASSIGN");

  const interns = (groupData?.data.members ?? [])
    .map((member) => {
      if (member.intern) return member.intern;
      return {
        id: member.userId || member.user?.id || member.internId || "",
        fullName: member.user?.fullName || "",
        leaderId: member.user?.internshipProfile?.mentorId || null,
        status: member.user?.internshipProfile?.status ?? "ACTIVE",
        user: { email: member.user?.email || null, avatarUrl: member.user?.avatarUrl || null },
        department: member.user?.internshipProfile?.department || null,
        position: member.user?.internshipProfile?.position || null,
      };
    })
    .filter(
      (intern) =>
        intern &&
        intern.status === "ACTIVE" &&
        (hasGlobalAccess || intern.leaderId === state.user?.id),
    );

  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, DraftAssignment>
  >({});
  const drafts = useMemo(() => {
    const initialDrafts: Record<string, DraftAssignment> = {};
    data?.tasks.forEach((task) => {
      if (task.suggestedOwner) {
        initialDrafts[task.taskId] = {
          taskId: task.taskId,
          internId: task.suggestedOwner.id,
          supportId: task.suggestedSupport?.id ?? null,
        };
      }
    });
    return { ...initialDrafts, ...draftOverrides };
  }, [data, draftOverrides]);

  const handleOwnerChange = (taskId: string, internId: string) => {
    const currentDraft = drafts[taskId];
    setDraftOverrides((prev) => ({
      ...prev,
      [taskId]: {
        taskId,
        internId,
        supportId:
          currentDraft?.supportId === internId
            ? null
            : currentDraft?.supportId ?? null,
      },
    }));
  };

  const handleSupportChange = (taskId: string, supportId: string) => {
    setDraftOverrides((prev) => ({
      ...prev,
      [taskId]: {
        taskId,
        internId: drafts[taskId]?.internId ?? "",
        supportId: supportId === "" ? null : supportId,
      },
    }));
  };

  const handleConfirm = () => {
    const validAssignments = Object.values(drafts).filter(
      (d) => d.taskId && d.internId,
    );
    if (validAssignments.length === 0) return;

    confirmMutation.mutate(
      {
        groupId,
        payload: { assignments: validAssignments },
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const selectedCount = Object.values(drafts).filter((d) => d.taskId && d.internId).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/80 p-4 pt-[3vh] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-[28px] border border-border bg-card shadow-glass overflow-hidden dark:border-white/10 dark:bg-[#0d1117]"
      >
        {/* Top bar glowing accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-muted hover:text-foreground transition-all cursor-pointer dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-border shrink-0 dark:border-slate-800">
          <div className="flex items-start gap-3.5 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">AI Phân công hàng loạt</h2>
                {data?.department && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400">
                    <Building className="h-3 w-3" />
                    {data.department.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Nhóm công việc: <span className="text-white font-medium">{groupName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/20">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                <div className="absolute inset-0 rounded-full animate-ping bg-sky-400/10" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Đang phân tích và tính toán điểm phù hợp...</p>
                <p className="text-xs text-slate-500 mt-1">Đánh giá workload, skill match, performance & cơ hội học tập</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
              <p className="text-sm font-medium text-rose-300">Không thể đề xuất AI</p>
              <p className="text-xs text-slate-400">
                {errorMessage ?? "Đã xảy ra lỗi. Vui lòng thử lại."}
              </p>
              <Button
                variant="glass"
                size="sm"
                onClick={() => refetch()}
              >
                Thử lại
              </Button>
            </div>
          )}

          {/* Data loaded */}
          {data && (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
                  <p className="text-2xl font-bold text-white">{data.summary.totalUnassignedTasks}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Task chưa giao</p>
                </div>
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-center">
                  <p className="text-2xl font-bold text-sky-400">{data.summary.totalAllocated}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Đã có gợi ý</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{data.summary.unallocatableTasks}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Chưa có ứng viên</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
                  <p className="text-2xl font-bold text-violet-400">{data.summary.internsEvaluatedCount}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Intern được duyệt</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    {data.summary.membersUsedCount}/{data.summary.totalMemberCount}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Thành viên tham gia</p>
                </div>
              </div>

              {/* Notice */}
              <p className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-sky-400 shrink-0" />
                <span>Leader có thể xem trước và tùy chỉnh người phụ trách (Owner/Support) từng task trước khi bấm nút xác nhận bên dưới.</span>
              </p>

              {/* Task Allocation List */}
              <div className="space-y-3">
                {data.tasks.map((task) => {
                  const currentDraft = drafts[task.taskId];
                  return (
                    <div
                      key={task.taskId}
                      className={`rounded-2xl border p-4 transition-all space-y-3 ${
                        currentDraft?.internId
                          ? "border-slate-800 bg-slate-900/30 hover:border-slate-700"
                          : "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      {/* Task Info row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.taskCode && (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              {task.taskCode}
                            </span>
                          )}
                          <p className="font-semibold text-sm text-white truncate">{task.taskTitle}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              priorityBadge[task.priority] ?? ""
                            }`}
                          >
                            {task.priority}
                          </span>
                          {task.estDays && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              Est: {task.estDays}d
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Reason string */}
                      {task.reason && (
                        <p className="text-xs text-slate-400 italic">
                          <span className="font-medium text-sky-400">Lý do AI:</span> {task.reason}
                        </p>
                      )}

                      {/* Selectors grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Owner select */}
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-400 mb-1">
                            <User className="h-3 w-3 text-sky-400" />
                            Người phụ trách chính (Owner) *
                          </label>
                          <Select
                            value={currentDraft?.internId ?? ""}
                            onChange={(val) => handleOwnerChange(task.taskId, val)}
                            placeholder="-- Chưa chọn Owner --"
                            options={[
                              { value: "", label: "-- Chưa chọn Owner --" },
                              ...interns.map((i) => ({
                                value: i.id,
                                label: `${i.fullName} ${i.position?.name ? `(${i.position.name})` : ""}${task.suggestedOwner?.id === i.id ? " ★ AI gợi ý" : ""}`,
                              })),
                            ]}
                          />
                        </div>

                        {/* Support select */}
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-semibold uppercase text-slate-400 mb-1">
                            <Users className="h-3 w-3 text-violet-400" />
                            Người hỗ trợ (Support) (Không bắt buộc)
                          </label>
                          <Select
                            value={currentDraft?.supportId ?? ""}
                            onChange={(val) => handleSupportChange(task.taskId, val)}
                            placeholder="-- Không có Support --"
                            options={[
                              { value: "", label: "-- Không có Support --" },
                              ...interns
                                .filter((i) => i.id !== currentDraft?.internId)
                                .map((i) => ({
                                  value: i.id,
                                  label: `${i.fullName} ${i.position?.name ? `(${i.position.name})` : ""}${task.suggestedSupport?.id === i.id ? " ★ AI gợi ý" : ""}`,
                                })),
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              Đã sẵn sàng giao: <strong className="text-sky-400">{selectedCount}</strong> / {data.summary.totalUnassignedTasks} tasks
            </span>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={confirmMutation.isPending}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-50"
              >
                Hủy
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                isLoading={confirmMutation.isPending}
                disabled={selectedCount === 0}
              >
                {!confirmMutation.isPending && <CheckCircle2 className="h-4 w-4 mr-2" />}
                Xác nhận Phân công ({selectedCount})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
