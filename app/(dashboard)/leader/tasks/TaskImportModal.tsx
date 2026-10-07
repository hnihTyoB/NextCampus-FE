"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Download, Upload, CheckCircle, XCircle, AlertTriangle, FileSpreadsheet, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import Select from "@/components/ui/Select";
import { extractTaskGroups } from "@/types/task-group";
import { useDownloadTemplate } from "@/hooks/task/useDownloadTemplate";
import { usePreviewImport } from "@/hooks/task/usePreviewImport";
import { useExecuteImport } from "@/hooks/task/useExecuteImport";
import { taskGroupService } from "@/services/task-group.service";
import type { ImportPreviewData, ImportResultData } from "@/types/task";
import TaskImportInstructions from "./TaskImportInstructions";
import { toast } from "react-hot-toast";
import { exceedsUploadLimit, UPLOAD_LIMITS_MB } from "@/lib/upload-policy";

interface Props {
  onCloseModal?: () => void;
}

type Step = "template" | "preview" | "result";

const STEPS = [
  { key: "template" as const, label: "Upload & Preview" },
  { key: "preview" as const, label: "Review" },
  { key: "result" as const, label: "Result" },
];

export default function TaskImportModal({ onCloseModal }: Props) {
  const t = useTranslations("leader.tasks");
  const [step, setStep] = useState<Step>("template");
  const [showInstructions, setShowInstructions] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [taskGroupId, setTaskGroupId] = useState("");
  const [taskGroupName, setTaskGroupName] = useState("");
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadMutation = useDownloadTemplate();
  const previewMutation = usePreviewImport();
  const executeMutation = useExecuteImport();

  const { data: taskGroupsData } = useQuery({
    queryKey: ["task-groups"],
    queryFn: () => taskGroupService.getAll(),
    staleTime: 60_000,
  });

  const taskGroups = useMemo(() => extractTaskGroups(taskGroupsData?.data), [taskGroupsData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (
      !f.name.toLowerCase().endsWith(".xlsx") ||
      f.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
      f.type !== "application/octet-stream" &&
      f.type !== ""
    ) {
      toast.error("Please choose a valid .xlsx workbook.");
      e.target.value = "";
      return;
    }
    if (exceedsUploadLimit(f, UPLOAD_LIMITS_MB.taskImport)) {
      toast.error(`Workbook must not exceed ${UPLOAD_LIMITS_MB.taskImport} MB.`);
      e.target.value = "";
      return;
    }
    setFile(f);
    previewMutation.mutate(
      { file: f, taskGroupId: taskGroupId || undefined, taskGroupName: taskGroupName || undefined },
      {
        onSuccess: (data) => {
          setPreviewData(data.data);
          setStep("preview");
        },
      },
    );
  };

  const handleExecute = () => {
    if (!file) return;
    executeMutation.mutate(
      { file, taskGroupId: taskGroupId || undefined, taskGroupName: taskGroupName || undefined },
      {
        onSuccess: (data) => {
          setImportResult(data.data);
          setStep("result");
        },
      },
    );
  };

  const reset = () => {
    setStep("template");
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    previewMutation.reset();
    executeMutation.reset();
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col">
      {/* Sticky Header (Rule 44 Compliant: Icon + Heading inside a dedicated flex container) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-4 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-10 sm:pr-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-700 shadow-sm dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 dark:shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <FileSpreadsheet className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold metal-text truncate">
                Nhập Công Việc Từ Excel
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {step === "template"
                  ? "Bước 1/3 — Tải file mẫu & Tải lên bảng tính"
                  : step === "preview"
                  ? "Bước 2/3 — Xem trước & Kiểm tra dữ liệu"
                  : "Bước 3/3 — Kết quả nhập công việc"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper indicator */}
      <div className="my-5 flex items-center justify-center">
        {[
          { key: "template", label: "Tải file", desc: "Mẫu & bảng tính" },
          { key: "preview", label: "Kiểm tra", desc: "Xem trước dữ liệu" },
          { key: "result", label: "Kết quả", desc: "Hoàn tất nhập việc" },
        ].map((s, i, arr) => {
          const isPassed = currentStepIndex > i;
          const isCurrent = currentStepIndex === i;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                    isPassed
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                      : isCurrent
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50 shadow-sm dark:shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                      : "bg-slate-100 text-muted border border-border dark:bg-white/5 dark:border-white/10"
                  }`}
                >
                  {isPassed ? <CheckCircle className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    isCurrent ? "metal-text metal-glow" : isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
                <span className={`hidden sm:block text-[10px] leading-tight text-center max-w-[100px] transition-colors duration-300 ${isCurrent ? "text-muted" : "text-muted/50"}`}>
                  {s.desc}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={`mx-1 sm:mx-3 mb-6 sm:mb-8 h-px w-8 sm:w-14 md:w-20 transition-colors duration-300 ${
                    isPassed ? "bg-emerald-500/40" : "bg-border dark:bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        {/* ── Step: template ─────────────────────────────────────────────── */}
        {step === "template" && (
          <div className="space-y-5">
            {/* Download template section */}
            <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_100%)] p-5 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold metal-text">
                Bước 1: Tải tệp mẫu Excel
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed">
                Tải tệp mẫu bảng tính Excel chuẩn của hệ thống, điền đầy đủ thông tin các công việc cần giao, sau đó tải lên ở bước tiếp theo.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={downloadMutation.isPending}
                  loadingText={t("downloadingTemplate")}
                  onClick={() => downloadMutation.mutate()}
                >
                  {!downloadMutation.isPending && <Download className="h-4 w-4 mr-2" />}
                  Tải tệp mẫu (.xlsx)
                </Button>
                <Button
                  variant="glass"
                  size="md"
                  onClick={() => setShowInstructions((prev) => !prev)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {showInstructions ? "Ẩn hướng dẫn định dạng" : "Xem hướng dẫn định dạng"}
                </Button>
              </div>
            </div>

            {showInstructions && (
              <TaskImportInstructions onClose={() => setShowInstructions(false)} />
            )}

            {/* Upload section */}
            <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_100%)] p-5 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold metal-text">
                Bước 2: Chọn nhóm công việc & Tải lên tệp
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed">
                Sau khi điền dữ liệu vào bảng tính, chọn hoặc tạo nhóm công việc (tuỳ chọn) rồi chọn tệp Excel để hệ thống kiểm tra dữ liệu trước khi nhập.
              </p>

              {/* Task Group selection */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                    Nhóm công việc (tuỳ chọn)
                  </label>
                  <Select
                    value={taskGroupId}
                    onChange={(val) => {
                      setTaskGroupId(val);
                      setTaskGroupName("");
                    }}
                    placeholder="Chọn nhóm có sẵn..."
                    options={[
                      { value: "", label: "Không chọn nhóm (hoặc để trống)..." },
                      ...taskGroups.map((tg) => ({
                        value: tg.id,
                        label: tg.name,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                    Hoặc nhập tên nhóm mới
                  </label>
                  <input
                    type="text"
                    value={taskGroupName}
                    onChange={(e) => {
                      setTaskGroupName(e.target.value);
                      setTaskGroupId("");
                    }}
                    placeholder="VD: Sprint 1 - Core Development..."
                    className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none transition disabled:opacity-50"
                    disabled={!!taskGroupId}
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] sm:text-xs text-muted">
                💡 <span className="font-medium text-foreground/80">Tự động đặt nhóm:</span> Nếu bạn không chọn nhóm và để trống tên nhóm, hệ thống sẽ tự động khởi tạo một nhóm công việc mới theo thời gian nhập và liên kết trực tiếp với phòng ban của bạn.
              </p>

              <div className="mt-5 pt-4 border-t border-border dark:border-white/10 flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="glass"
                  size="md"
                  isLoading={previewMutation.isPending}
                  loadingText={t("readingFile")}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {!previewMutation.isPending && <Upload className="h-4 w-4 mr-2" />}
                  Chọn tệp Excel (.xlsx)
                </Button>
                {file && (
                  <span className="text-xs sm:text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                    {file.name}
                  </span>
                )}
                {previewMutation.isError && (
                  <p className="w-full mt-2 text-xs sm:text-sm text-red-400">
                    Không thể đọc tệp Excel. Vui lòng đảm bảo tệp đúng định dạng .xlsx và cấu trúc bảng tính hợp lệ.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step: preview ──────────────────────────────────────────────── */}
        {step === "preview" && previewData && (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <StatCard
                value={previewData.totalRows}
                label="Tổng số dòng"
                className="border-border bg-card"
                valueClassName="metal-text"
                labelClassName="text-muted"
              />
              <StatCard
                value={previewData.validRows.length}
                label="Hợp lệ"
                className="border-emerald-500/30 bg-emerald-500/5"
                valueClassName="text-emerald-400"
                labelClassName="text-emerald-400/70"
              />
              <StatCard
                value={previewData.errorRows.length}
                label="Lỗi"
                className="border-red-500/30 bg-red-500/5"
                valueClassName="text-red-400"
                labelClassName="text-red-400/70"
              />
            </div>

            {/* Task Group info */}
            {previewData.taskGroupName && (
              <div className="rounded-xl border border-border bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm text-muted dark:border-white/10 dark:bg-white/[0.03]">
                Nhóm công việc áp dụng:{" "}
                <span className="font-semibold text-foreground">
                  {previewData.taskGroupName}
                </span>
              </div>
            )}

            {/* Intern mappings */}
            {previewData.internMappings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground/90">
                  Khớp nối tài khoản thực tập sinh ({previewData.internMappings.length})
                </h3>
                <Table columns="1fr 1.4fr 1fr 120px">
                    <Table.Header>
                      <div>Excel Alias</div>
                      <div>Email</div>
                      <div>Tên trong hệ thống</div>
                      <div>Trạng thái</div>
                    </Table.Header>
                    <Table.Body
                      data={previewData.internMappings}
                      render={(m) => (
                        <Table.Row key={`${m.ownerAlias}-${m.email}`}>
                          <div className="text-sm">{m.ownerAlias}</div>
                          <div className="truncate text-sm text-muted">{m.email}</div>
                          <div className="text-sm text-muted">
                            {m.internFullName ?? "—"}
                          </div>
                          <div>
                            {m.internId ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                <CheckCircle className="h-3 w-3" /> Tìm thấy
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-400">
                                <AlertTriangle className="h-3 w-3" /> Chưa có
                              </span>
                            )}
                          </div>
                        </Table.Row>
                      )}
                    />
                  </Table>
              </div>
            )}

            {/* Valid rows */}
            {previewData.validRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-foreground/90">
                  Dòng hợp lệ ({previewData.validRows.length})
                </h3>
                <Table columns="100px 1fr 120px 100px 140px 100px">
                    <Table.Header>
                      <div>Mã task</div>
                      <div>Tiêu đề</div>
                      <div>Người làm</div>
                      <div>Ưu tiên</div>
                      <div>Hạn chót</div>
                      <div>Trạng thái</div>
                    </Table.Header>
                    <Table.Body
                      data={previewData.validRows}
                      render={(row) => (
                        <Table.Row key={row.excelCode}>
                          <div className="font-mono text-sm">{row.excelCode}</div>
                          <div className="truncate text-sm">{row.title}</div>
                          <div className="text-sm text-muted">
                            {previewData.internMappings.find(
                              (mapping) =>
                                mapping.email.toLowerCase() === row.ownerEmail?.toLowerCase(),
                            )?.internFullName ?? row.ownerEmail ?? "—"}
                          </div>
                          <div>
                            <PriorityBadge priority={row.priority} />
                          </div>
                          <div className="text-sm text-muted">
                            {new Date(row.deadline).toLocaleDateString("vi-VN")}
                          </div>
                          <div className="text-sm text-muted">
                            {(row as unknown as Record<string, unknown>)._status as string ?? "Cần làm"}
                          </div>
                        </Table.Row>
                      )}
                    />
                  </Table>
              </div>
            )}

            {/* Error rows */}
            {previewData.errorRows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-semibold text-red-400">
                  Dòng có lỗi ({previewData.errorRows.length})
                </h3>
                <Table columns="80px 120px 1fr" className="border-red-500/20 bg-red-500/5">
                    <Table.Header>
                      <div>Dòng</div>
                      <div>Mã task</div>
                      <div>Chi tiết lỗi</div>
                    </Table.Header>
                    <Table.Body
                      data={previewData.errorRows}
                      render={(row) => (
                        <Table.Row key={row.rowIndex}>
                          <div className="text-sm text-red-400">
                            {row.rowIndex}
                          </div>
                          <div className="text-sm text-muted">
                            {row.excelCode ?? "—"}
                          </div>
                          <div className="space-y-0.5">
                            {row.errors.map((err, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-1 text-sm text-red-400"
                              >
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                {err}
                              </div>
                            ))}
                          </div>
                        </Table.Row>
                      )}
                    />
                  </Table>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border dark:border-white/10">
              <Button variant="glass" size="md" onClick={reset}>
                ← Quay lại
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={executeMutation.isPending}
                loadingText={t("importingTasks")}
                onClick={handleExecute}
                disabled={previewData.validRows.length === 0}
              >
                {!executeMutation.isPending && <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Tiến hành nhập {previewData.validRows.length} công việc
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: result ───────────────────────────────────────────────── */}
        {step === "result" && importResult && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-xl font-bold metal-text">Hoàn Tất Nhập Công Việc</h3>
                {importResult.taskGroupName && (
                  <p className="text-xs sm:text-sm text-muted">
                    Nhóm công việc: {importResult.taskGroupName}
                  </p>
                )}
              </div>
            </div>

            {/* Result stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                value={importResult.importedTasks}
                label="Công việc mới"
                className="border-emerald-500/30 bg-emerald-500/5"
                valueClassName="text-emerald-400"
                labelClassName="text-emerald-400/70"
              />
              <StatCard
                value={importResult.importedAssignments}
                label="Lượt giao việc"
                className="border-blue-500/30 bg-blue-500/5"
                valueClassName="text-blue-400"
                labelClassName="text-blue-400/70"
              />
              <StatCard
                value={importResult.importedDependencies}
                label="Mối phụ thuộc"
                className="border-purple-500/30 bg-purple-500/5"
                valueClassName="text-purple-400"
                labelClassName="text-purple-400/70"
              />
              <StatCard
                value={importResult.skippedCodes.length}
                label="Đã cập nhật"
                className="border-amber-500/30 bg-amber-500/5"
                valueClassName="text-amber-400"
                labelClassName="text-amber-400/70"
              />
            </div>

            {/* Skipped (updated) codes */}
            {importResult.skippedCodes.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h4 className="text-sm font-medium text-amber-400">
                  Công việc đã tồn tại (đã cập nhật)
                </h4>
                <p className="mt-1 text-xs text-muted">
                  {importResult.skippedCodes.join(", ")}
                </p>
              </div>
            )}

            {/* Import errors */}
            {importResult.errorRows.length > 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <h4 className="text-sm font-medium text-red-400">Danh sách lỗi</h4>
                <ul className="mt-2 space-y-1">
                  {importResult.errorRows.map((err, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-1 text-sm text-red-400"
                    >
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      {err.excelCode ? `[${err.excelCode}] ` : ""}
                      {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border dark:border-white/10">
              <Button variant="glass" size="md" onClick={reset}>
                Nhập tệp khác
              </Button>
              {onCloseModal && (
                <Button variant="primary" size="md" onClick={onCloseModal}>
                  Đóng
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function StatCard({
  value,
  label,
  className,
  valueClassName,
  labelClassName,
}: {
  value: number;
  label: string;
  className: string;
  valueClassName: string;
  labelClassName: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${className}`}>
      <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
      <p className={`mt-1 text-xs ${labelClassName}`}>{label}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-400",
    MEDIUM: "bg-amber-500/10 text-amber-400",
    LOW: "bg-emerald-500/10 text-emerald-400",
  };

  return (
    <span
      className={`inline-flex rounded-lg px-2 py-0.5 text-xs ${colors[priority] ?? "bg-white/5 text-muted"}`}
    >
      {priority}
    </span>
  );
}
