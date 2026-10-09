"use client";

import { useTranslations, useLocale } from "next-intl";
import { X, Calendar, Clock, RotateCcw } from "lucide-react";

interface TaskImportInstructionsProps {
  onClose: () => void;
}

export default function TaskImportInstructions({ onClose }: TaskImportInstructionsProps) {
  const tg = useTranslations("leader.tasks.importInstructions");
  const locale = useLocale();

  const isVi = locale === "vi";

  const columnsTaskPhanCong = [
    {
      name: "Task ID",
      required: true,
      desc: isVi ? "Mã công việc duy nhất, VD:" : "Unique task identifier, e.g.:",
      code: "BE1-01",
      extra: isVi ? "Dùng để định danh công việc và thiết lập quan hệ phụ thuộc." : "Used to identify tasks and set up dependencies.",
    },
    {
      name: "Task",
      required: true,
      desc: isVi ? "Tên / tiêu đề công việc." : "Task title / name.",
    },
    {
      name: "Start",
      required: false,
      desc: isVi
        ? "Ngày bắt đầu. Mặc định để trống khi import (nếu có gán Intern sẽ tự động nhận ngày hôm nay). Có thể điều chỉnh ngày mốc hàng loạt sau khi nhập."
        : "Start date. Empty by default on import (defaults to today if intern assigned). Can be shifted in batch post-import.",
    },
    {
      name: "Due",
      required: false,
      desc: isVi
        ? "Hạn chót. Tự động tính: Ngày bắt đầu + (ceil(Est. Days) - 1) lúc 23:59:59. Nếu chưa có ngày bắt đầu, để trống."
        : "Deadline. Automatically calculated: Start date + (ceil(Est. Days) - 1) at 23:59:59. If no start date, left empty.",
    },
    {
      name: "Priority",
      required: true,
      desc: isVi ? "Mức độ ưu tiên:" : "Priority level:",
      codes: ["P0 (HIGH)", "P1 (MEDIUM)", "P2 (LOW)"],
    },
    {
      name: "Owner",
      required: false,
      desc: isVi
        ? "Email của TTS nhận việc, hoặc alias được map qua sheet 'Lists'. Khi nhập email hợp lệ, task nhận ngày bắt đầu là hôm nay."
        : "Email of assigned intern, or alias mapped in 'Lists' sheet. When valid, start date sets to today.",
    },
    {
      name: "Support",
      required: false,
      desc: isVi
        ? "Email của TTS hỗ trợ, hoặc alias được map qua sheet 'Lists'. Chỉ có thể giao khi đã có Owner."
        : "Email of supporting intern, or alias in 'Lists' sheet. Cannot assign without an Owner.",
    },
    {
      name: "Status",
      required: false,
      desc: isVi ? "Trạng thái ban đầu:" : "Initial status:",
      codes: ["To Do", "In Progress", "Review", "Done", "Blocked"],
      extra: isVi ? "Mặc định: To Do." : "Default: To Do.",
    },
    {
      name: "Mô tả",
      required: false,
      desc: isVi ? "Mô tả chi tiết nội dung công việc." : "Detailed task description.",
    },
    {
      name: "Giai đoạn",
      required: false,
      desc: isVi ? "Tên giai đoạn (Phase), VD:" : "Phase name, e.g.:",
      code: "Phase 1 - Foundation",
    },
    {
      name: "Module",
      required: false,
      desc: isVi ? "Tên phân hệ / module, VD:" : "Module name, e.g.:",
      code: "Setup",
    },
    {
      name: "Est Days",
      required: false,
      desc: isVi
        ? "Số ngày ước tính (VD: 1, 1.5, 3). Dùng để tự động tính hạn chót 23:59:59."
        : "Estimated days (e.g., 1, 1.5, 3). Used for automatic 23:59:59 deadline calculation.",
    },
    {
      name: "Acceptance Criteria",
      required: false,
      desc: isVi ? "Tiêu chí nghiệm thu / hoàn thành." : "Acceptance criteria for task completion.",
    },
    {
      name: "Notes",
      required: false,
      desc: isVi ? "Ghi chú bổ sung cho thực tập sinh." : "Additional notes for assignees.",
    },
    {
      name: "Dependency",
      required: false,
      desc: isVi ? "Danh sách Task ID phụ thuộc, phân cách bằng dấu phẩy, VD:" : "Comma-separated list of prerequisite Task IDs, e.g.:",
      code: "BE1-01, BE1-02",
    },
    {
      name: "Attachments",
      required: false,
      desc: isVi ? "Danh sách URL tài liệu, phân cách bằng dấu phẩy, VD:" : "Comma-separated document URLs, e.g.:",
      code: "https://example.com/doc.pdf",
    },
  ];

  const columnsLists = [
    {
      name: "Owners",
      required: false,
      desc: isVi
        ? "Tên hiển thị trong Excel (dùng ở cột Owner/Support của sheet Task_Phan_Cong)."
        : "Display name in Excel (used in Owner/Support column of Task_Phan_Cong sheet).",
    },
    {
      name: "Email",
      required: false,
      desc: isVi
        ? "Email duy nhất của tài khoản thực tập sinh trong hệ thống. Khi khớp, hệ thống hiển thị tên đầy đủ."
        : "Unique email of intern in system. When matched, full name is displayed.",
    },
  ];

  return (
    <div className="max-h-[50vh] overflow-y-auto scrollbar-dropdown rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_100%)] p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold metal-text">
            {tg("title")}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {tg("subtitle")}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close instructions"
          className="rounded-xl border border-border bg-card p-1.5 text-muted transition-colors hover:bg-card-hover hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 3 Core System Rules Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{tg("startRuleTitle")}</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            {tg("startRuleDesc")}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{tg("dueRuleTitle")}</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            {tg("dueRuleDesc")}
          </p>
        </div>

        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{tg("adjustRuleTitle")}</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            {tg("adjustRuleDesc")}
          </p>
        </div>
      </div>

      {/* Sheet 1: Task_Phan_Cong */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Sheet: <code className="text-cyan-400 font-mono">Task_Phan_Cong</code> ({isVi ? "Bắt buộc" : "Required"})
        </h4>
        <div className="grid grid-cols-[140px_80px_1fr] gap-3 border-b border-border pb-2 text-xs font-medium text-muted">
          <div>{isVi ? "Tên cột" : "Column Name"}</div>
          <div>{isVi ? "Yêu cầu" : "Required"}</div>
          <div>{isVi ? "Mô tả & Định dạng" : "Description & Format"}</div>
        </div>
        {columnsTaskPhanCong.map((col) => (
          <div key={col.name} className="grid grid-cols-[140px_80px_1fr] gap-3 border-b border-border/40 py-2.5 text-xs">
            <div className="font-mono font-medium text-foreground">{col.name}</div>
            <div>
              {col.required ? (
                <span className="inline-flex rounded-md bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                  {isVi ? "Bắt buộc" : "Required"}
                </span>
              ) : (
                <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                  {isVi ? "Tuỳ chọn" : "Optional"}
                </span>
              )}
            </div>
            <div className="text-muted leading-relaxed">
              {col.desc}{" "}
              {col.code && (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-300 font-mono text-[11px]">
                  {col.code}
                </code>
              )}
              {col.codes && (
                <span className="inline-flex flex-wrap gap-1">
                  {col.codes.map((c) => (
                    <code key={c} className="rounded bg-white/10 px-1 py-0.5 text-cyan-300 font-mono text-[11px]">
                      {c}
                    </code>
                  ))}
                </span>
              )}
              {col.extra && <> {col.extra}</>}
            </div>
          </div>
        ))}
      </div>

      {/* Sheet 2: Lists */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Sheet: <code className="text-cyan-400 font-mono">Lists</code> ({isVi ? "Tuỳ chọn" : "Optional"})
        </h4>
        <p className="mb-3 text-xs text-muted">
          {isVi
            ? "Sheet này dùng để ánh xạ biệt danh (alias) sang email thực tế của thực tập sinh."
            : "This sheet maps aliases to actual intern system emails."}
        </p>
        <div className="grid grid-cols-[140px_80px_1fr] gap-3 border-b border-border pb-2 text-xs font-medium text-muted">
          <div>{isVi ? "Tên cột" : "Column Name"}</div>
          <div>{isVi ? "Yêu cầu" : "Required"}</div>
          <div>{isVi ? "Mô tả & Định dạng" : "Description & Format"}</div>
        </div>
        {columnsLists.map((col) => (
          <div key={col.name} className="grid grid-cols-[140px_80px_1fr] gap-3 border-b border-border/40 py-2.5 text-xs">
            <div className="font-mono font-medium text-foreground">{col.name}</div>
            <div>
              <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-muted">
                {isVi ? "Tuỳ chọn" : "Optional"}
              </span>
            </div>
            <div className="text-muted leading-relaxed">{col.desc}</div>
          </div>
        ))}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline cursor-pointer"
        >
          {tg("closeBtn")}
        </button>
      </div>
    </div>
  );
}
