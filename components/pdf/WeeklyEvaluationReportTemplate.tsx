"use client";

import React from "react";
import type { WeeklyEvaluation, EvaluationRatings, RatingLevel } from "@/types/weekly-evaluation";
import {
  CRITERIA_SECTIONS,
  RATING_LABELS,
  RATING_SCORES,
  getRatingLevel,
} from "@/types/weekly-evaluation";

interface Props {
  evaluation: WeeklyEvaluation;
}

const RATING_PRINT_BADGES: Record<RatingLevel, string> = {
  TOT: "bg-emerald-50 text-emerald-800 border-emerald-300",
  KHA: "bg-blue-50 text-blue-800 border-blue-300",
  TB: "bg-amber-50 text-amber-800 border-amber-300",
  TBY: "bg-orange-50 text-orange-800 border-orange-300",
  YEU: "bg-rose-50 text-rose-800 border-rose-300",
};

/**
 * Tính điểm trung bình của 12 tiêu chí chuẩn hóa theo 1 chữ số thập phân (thang 10.0)
 */
function computeScore(
  ratings?: EvaluationRatings | Record<string, unknown> | null,
  defaultScore: number = 0
): number {
  if (!ratings) return parseFloat(defaultScore.toFixed(1));
  const allKeys = CRITERIA_SECTIONS.flatMap((s) => s.criteria.map((c) => c.key));
  const validScores = allKeys
    .map((k) => {
      const lvl = getRatingLevel(ratings, k);
      return lvl && RATING_SCORES[lvl] !== undefined ? RATING_SCORES[lvl] : null;
    })
    .filter((s): s is number => s !== null);

  if (validScores.length === 0) return parseFloat(defaultScore.toFixed(1));
  return parseFloat((validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1));
}

function getRatingClassification(score: number): { label: string; color: string } {
  if (score >= 9.0) return { label: "Xuất Sắc", color: "text-emerald-800 bg-emerald-50 border-emerald-300" };
  if (score >= 8.0) return { label: "Tốt (Giỏi)", color: "text-blue-800 bg-blue-50 border-blue-300" };
  if (score >= 6.5) return { label: "Khá", color: "text-cyan-800 bg-cyan-50 border-cyan-300" };
  if (score >= 5.0) return { label: "Trung Bình", color: "text-amber-800 bg-amber-50 border-amber-300" };
  return { label: "Yếu / Chưa Đạt", color: "text-rose-800 bg-rose-50 border-rose-300" };
}

function formatDateDisplay(d?: string | Date | null): string {
  if (!d) return "—";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getAiInsightDisplay(
  aiComment?: string | null,
  leaderComment?: string | null,
  finalScore?: number
): string {
  const cleanLeader = (leaderComment || "").trim().toLowerCase();
  let cleanAi = (aiComment || "").trim();

  // Loại bỏ tiền tố rườm rà nếu có
  if (cleanAi.startsWith("[AI Gợi ý]:")) {
    cleanAi = cleanAi.replace(/^\[AI Gợi ý\]:\s*/i, "").trim();
  }

  // Nếu aiComment rỗng hoặc bị trùng lặp với nhận xét của Leader
  if (!cleanAi || cleanAi.toLowerCase() === cleanLeader) {
    if (finalScore !== undefined) {
      if (finalScore >= 8.0) {
        return "Hệ thống ghi nhận hiệu suất hoàn thành nhiệm vụ xuất sắc trong tuần. Nắm vững quy trình và chủ động giải quyết công việc. Đề xuất tiếp tục duy trì và tham gia các bài toán kỹ thuật phức tạp hơn.";
      }
      if (finalScore >= 6.5) {
        return "Thực tập sinh đạt tiến độ ổn định, bám sát các yêu cầu nghiệp vụ. Đề xuất rà soát kỹ lưỡng code trước khi tạo PR và chủ động trao đổi giải pháp với người hướng dẫn.";
      }
      if (finalScore >= 5.0) {
        return "Tiến độ và kỹ năng ở mức trung bình. Cần chủ động hỏi Mentor hơn khi gặp khó khăn về state và styling responsive, nâng cao tính kỷ luật và báo cáo công việc đúng hạn.";
      }
      return "Hiệu suất tuần chưa đạt kỳ vọng. Đề xuất tổ chức buổi họp 1-1 với người hướng dẫn để rà soát khó khăn kỹ thuật, củng cố kiến thức nền tảng và cải thiện tiến độ.";
    }
    return "Hệ thống ghi nhận thực tập sinh đang trong giai đoạn tiếp thu dự án, cần tiếp tục nỗ lực hoàn thành các chỉ tiêu đề ra.";
  }

  return cleanAi;
}

export const WeeklyEvaluationReportTemplate: React.FC<Props> = ({ evaluation }) => {
  const ratings = evaluation.ratings;
  const finalScore = computeScore(ratings, evaluation.score ?? evaluation.totalScore ?? 0);
  const classification = getRatingClassification(finalScore);
  const reportDate = formatDateDisplay(evaluation.createdAt || new Date());
  const now = new Date();
  const aiInsight = getAiInsightDisplay(evaluation.aiComment, evaluation.comment, finalScore);

  return (
    <div
      id={`evaluation-report-${evaluation.id}`}
      style={{
        width: "794px",
        height: "1123px",
        maxHeight: "1123px",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxSizing: "border-box",
        // Căn lề chuẩn A4: Lề trên 54px (~14.5mm), lề trái/phải 58px (~15.3mm), lề dưới 48px (~13mm)
        padding: "54px 58px 46px 58px",
        pageBreakInside: "avoid",
        pageBreakAfter: "avoid",
      }}
      className="mx-auto box-border text-[11px] leading-tight flex flex-col justify-between"
    >
      {/* ─── PHẦN NỘI DUNG CHÍNH (HEADER -> BẢNG -> ĐIỂM -> NHẬN XÉT) ───────── */}
      <div className="space-y-3">
        {/* ─── HEADER: BRANDING & OFFICIAL METADATA ─────────────────────────── */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2.5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="NexCampus Logo"
              className="h-10 w-10 object-contain drop-shadow-xs"
              crossOrigin="anonymous"
            />
            <div>
              <span className="font-extrabold tracking-wider text-base text-slate-900 uppercase block leading-none mb-1">
                NexCampus Platform
              </span>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                Hệ Thống Đánh Giá & Quản Lý Thực Tập Chuẩn Doanh Nghiệp
              </p>
            </div>
          </div>
          <div className="text-right text-[10.5px] space-y-0.5 text-slate-600 font-mono">
            <div>Mẫu số: <span className="font-bold text-slate-800">04-ĐGT/NC</span></div>
            <div>Mã đánh giá: <span className="font-bold text-slate-800">{evaluation.id.slice(0, 8).toUpperCase()}</span></div>
            <div>Ngày lập: <span className="text-slate-800">{reportDate}</span></div>
          </div>
        </div>

        {/* ─── DOCUMENT TITLE ────────────────────────────────────────────────── */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900 leading-tight">
            PHIẾU ĐÁNH GIÁ KẾT QUẢ THỰC TẬP HÀNG TUẦN
          </h1>
          <div className="inline-block px-3 py-0.5 bg-slate-100 rounded-full text-slate-700 font-semibold text-[11px]">
            Tuần {evaluation.week} · Năm {evaluation.year || now.getFullYear()}
            {evaluation.startDate && evaluation.endDate && (
              <span className="ml-1.5 font-normal text-slate-500">
                ({formatDateDisplay(evaluation.startDate)} - {formatDateDisplay(evaluation.endDate)})
              </span>
            )}
          </div>
        </div>

        {/* ─── SECTION 1: INTERN & SUPERVISOR INFORMATION ───────────────────── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
            <span>I. Thông Tin Chung</span>
            <span className="font-normal text-[10px] text-slate-500 lowercase">Thông tin hành chính & đơn vị phụ trách</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            <div>
              <span className="text-slate-500 inline-block w-28">Họ và tên TTS:</span>
              <strong className="text-slate-900 font-bold">{evaluation.intern?.fullName || "—"}</strong>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-28">Người hướng dẫn:</span>
              <strong className="text-slate-800 font-bold">{evaluation.leader?.fullName || evaluation.leader?.email || "—"}</strong>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-28">Email tài khoản:</span>
              <span className="text-slate-700 font-mono text-[10.5px]">{evaluation.intern?.user?.email || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-28">Phòng ban:</span>
              <span className="text-slate-800 font-medium">
                {evaluation.intern?.department?.name || "Bộ phận Phát triển Phần mềm"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-28">Mã thực tập sinh:</span>
              <span className="text-slate-700 font-mono text-[10.5px]">
                {"internCode" in (evaluation.intern || {})
                  ? String((evaluation.intern as Record<string, unknown>).internCode)
                  : `INT-${evaluation.intern?.id?.slice(0, 6).toUpperCase()}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 inline-block w-28">Vị trí thực tập:</span>
              <span className="text-slate-800">
                {evaluation.intern?.position?.name || "Thực tập sinh Công nghệ"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: 12 EVALUATION CRITERIA TABLE ───────────────────────── */}
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
            <span>II. Kết Quả Đánh Giá Chi Tiết Theo 12 Tiêu Chí</span>
            <span className="font-semibold text-[10px] text-slate-500">Thang điểm 10.0 quy đổi chuẩn</span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-left font-semibold">
                <th className="border border-slate-300 px-2 py-1 w-9 text-center">STT</th>
                <th className="border border-slate-300 px-2.5 py-1">Tiêu Chí Đánh Giá</th>
                <th className="border border-slate-300 px-2 py-1 w-36 text-center">Mức Đánh Giá</th>
                <th className="border border-slate-300 px-2 py-1 w-24 text-center">Điểm Quy Đổi</th>
              </tr>
            </thead>
            <tbody>
              {CRITERIA_SECTIONS.map((section, sIdx) => {
                let sectionStartIndex = 0;
                if (sIdx === 1) sectionStartIndex = 5;
                if (sIdx === 2) sectionStartIndex = 10;

                const sectionLevels = section.criteria
                  .map((c) => getRatingLevel(ratings, c.key))
                  .filter((lvl): lvl is RatingLevel => lvl !== undefined);

                const sectionAvg = sectionLevels.length > 0
                  ? (sectionLevels.reduce((a, lvl) => a + RATING_SCORES[lvl], 0) / sectionLevels.length).toFixed(1)
                  : "—";

                return (
                  <React.Fragment key={section.id}>
                    {/* Section Group Header */}
                    <tr className="bg-slate-50/90 font-bold text-slate-800">
                      <td colSpan={3} className="border border-slate-300 px-2.5 py-1 uppercase text-[10.5px] tracking-wide">
                        {section.name}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-bold text-blue-700 font-mono">
                        {sectionAvg !== "—" ? `${sectionAvg} / 10.0` : "—"}
                      </td>
                    </tr>
                    {/* Criteria items */}
                    {section.criteria.map((criterion, cIdx) => {
                      const level = getRatingLevel(ratings, criterion.key);
                      const levelLabel = level ? RATING_LABELS[level] : "—";
                      const score = level ? RATING_SCORES[level] : null;
                      const badgeStyle = level
                        ? RATING_PRINT_BADGES[level]
                        : "bg-slate-100 text-slate-400 border-slate-200";
                      const globalIdx = sectionStartIndex + cIdx + 1;

                      return (
                        <tr key={criterion.key} className="hover:bg-slate-50/40">
                          <td className="border border-slate-300 px-1.5 py-0.5 text-center font-mono text-slate-500">
                            {globalIdx}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-0.5 text-slate-800">
                            <div className="font-medium">{criterion.label}</div>
                            {criterion.tooltip && (
                              <div className="text-[9px] text-slate-400 mt-0.5 italic leading-tight">
                                {criterion.tooltip}
                              </div>
                            )}
                          </td>
                          <td className="border border-slate-300 px-2 py-0.5 text-center font-medium">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${badgeStyle}`}>
                              {levelLabel}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-2 py-0.5 text-center font-bold text-slate-800 font-mono">
                            {score !== null ? `${score.toFixed(1)}` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── SECTION 3: TOTAL SCORE & SUMMARY ──────────────────────────────── */}
        <div className="rounded-lg border border-slate-300 px-3 py-2 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wide">
              KẾT QUẢ ĐÁNH GIÁ TỔNG THỂ:
            </span>
            <span className="text-xl font-black text-blue-700 tracking-tight leading-none font-mono">
              {finalScore.toFixed(1)}
              <span className="text-xs font-semibold text-slate-400 ml-0.5">/ 10.0</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${classification.color}`}>
              Xếp loại: {classification.label}
            </span>
          </div>
          <div className="text-right text-[10.5px] text-slate-500">
            <span>Trạng thái: <strong className="text-emerald-700 font-bold">Đã Hoàn Tất Đánh Giá</strong></span>
            {evaluation.viewedAt && (
              <span className="ml-2 text-slate-400">· TTS đã xem: {formatDateDisplay(evaluation.viewedAt)}</span>
            )}
          </div>
        </div>

        {/* ─── SECTION 4: LEADER COMMENTS & AI INSIGHTS (SIDE-BY-SIDE 2-COL) ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cột Trái: Leader Nhận xét */}
          <div className="flex flex-col">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              III. Nhận Xét Của Người Hướng Dẫn (Leader)
            </div>
            <div className="flex-1 border border-slate-200 rounded-md p-2.5 bg-white text-[10.5px] text-slate-800 leading-normal whitespace-pre-wrap min-h-[56px]">
              {evaluation.comment || "Thực tập sinh thể hiện tinh thần làm việc tích cực, hoàn thành tốt các nhiệm vụ được phân công trong tuần."}
            </div>
          </div>

          {/* Cột Phải: Phân tích AI độc lập */}
          <div className="flex flex-col">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-sky-800 mb-1 flex items-center justify-between">
              <span>Đề Xuất Phân Tích & Hỗ Trợ Từ AI NexCampus</span>
              <span className="text-[9px] font-normal text-slate-400 lowercase">(tham chiếu khách quan)</span>
            </div>
            <div className="flex-1 border border-sky-100 rounded-md p-2.5 bg-sky-50/40 text-[10.5px] text-slate-700 leading-normal whitespace-pre-wrap italic min-h-[56px]">
              {aiInsight}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PHẦN CHÂN BÁO CÁO (CHỮ KÝ, CON DẤU & CHÂN TRANG HÀNH CHÍNH) ───── */}
      <div className="space-y-2 pt-2">
        {/* ─── SECTION 5: SIGNATURES & E-SEAL ─────────────────────────────────── */}
        <div className="pt-2 border-t border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 text-center">
            IV. Xác Nhận & Phê Duyệt Của Các Bên
          </div>
          <div className="grid grid-cols-2 text-center text-xs">
            {/* Bên Thực tập sinh */}
            <div className="flex flex-col items-center justify-between min-h-[88px]">
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">THỰC TẬP SINH</p>
                <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="h-9 flex items-center justify-center my-0.5">
                {evaluation.viewedAt ? (
                  <div className="border border-dashed border-emerald-400 bg-emerald-50/80 rounded px-2.5 py-0.5 text-[9.5px] font-mono text-emerald-800">
                    ✓ ĐÃ XÁC NHẬN TRỰC TUYẾN ({formatDateDisplay(evaluation.viewedAt)})
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">(Đã gửi đến tài khoản TTS)</span>
                )}
              </div>
              <p className="font-bold text-slate-900 text-[11px]">{evaluation.intern?.fullName || "—"}</p>
            </div>

            {/* Bên Người hướng dẫn */}
            <div className="flex flex-col items-center justify-between min-h-[88px]">
              <div>
                <p className="text-[10px] text-slate-500 italic">
                  TP. Hồ Chí Minh, ngày {now.getDate()} tháng {now.getMonth() + 1} năm {now.getFullYear()}
                </p>
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">NGƯỜI HƯỚNG DẪN (LEADER)</p>
                <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              </div>
              <div className="h-9 flex items-center justify-center my-0.5">
                <div className="border-2 border-dashed border-blue-400 bg-blue-50/80 rounded-md px-3 py-0.5 text-center shadow-xs">
                  <span className="font-black text-blue-700 tracking-wide text-[10px] block leading-tight">
                    ✓ ĐÃ PHÊ DUYỆT ĐIỆN TỬ
                  </span>
                  <span className="text-[8.5px] text-blue-600 font-mono block leading-none">
                    MÃ: {evaluation.id.slice(0, 8).toUpperCase()} · NEXCAMPUS VERIFIED
                  </span>
                </div>
              </div>
              <p className="font-bold text-slate-900 text-[11px]">
                {evaluation.leader?.fullName || evaluation.leader?.email || "Trưởng nhóm hướng dẫn"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── FOOTER: OFFICIAL DOCUMENT METADATA ────────────────────────────── */}
        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-[9.5px] text-slate-400 font-mono">
          <span>NexCampus Platform · Mẫu số: 04-ĐGT/NC</span>
          <span className="italic">Tài liệu đánh giá thực tập nội bộ – Bảo mật theo quy định</span>
          <span className="font-semibold text-slate-500">Trang 1/1</span>
        </div>
      </div>
    </div>
  );
};
