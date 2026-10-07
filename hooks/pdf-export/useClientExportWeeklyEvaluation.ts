"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import React from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { weeklyEvaluationService } from "@/services/weekly-evaluation.service";
import { WeeklyEvaluationReportTemplate } from "@/components/pdf/WeeklyEvaluationReportTemplate";
import type { WeeklyEvaluation } from "@/types/weekly-evaluation";

export async function generateWeeklyEvaluationPdf(evaluation: WeeklyEvaluation): Promise<void> {
  // 1. Tạo container off-screen
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.zIndex = "-1000";
  container.style.width = "794px";
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // 2. Render template React vào DOM
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(WeeklyEvaluationReportTemplate, { evaluation })
      )
    );


    // Chờ font và toàn bộ images (như /logo.png) nạp hoàn tất
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = container.firstElementChild as HTMLElement;
    if (!element) {
      throw new Error("Không thể khởi tạo template báo cáo");
    }

    // 3. Chụp element thành Canvas sắc nét (scale: 2 cho chất lượng in ấn chuẩn 300 DPI)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    // 4. Khởi tạo tài liệu A4 bằng jsPDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");

    // Nếu chiều cao nằm gọn trong 1 trang A4 (cho phép dung sai làm tròn 4mm)
    if (imgHeight <= pageHeight + 4) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight), undefined, "FAST");
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // Chỉ thêm trang mới nếu phần dư thực tế vượt quá 6mm, tránh tạo trang thừa trắng
      while (heightLeft > 6) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
    }

    // 5. Đặt tên file chuẩn mực: phieu-danh-gia-tuan-{week}-{ten-tts}.pdf
    const rawName = evaluation.intern?.fullName || "thuc-tap-sinh";
    const internName = rawName
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    const fileName = `phieu-danh-gia-tuan-${evaluation.week}-${internName || "tts"}.pdf`;
    pdf.save(fileName);
  } finally {
    // 6. Dọn dẹp DOM sạch sẽ
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function useClientExportWeeklyEvaluation() {
  const t = useTranslations("pdfExport");

  return useMutation({
    mutationFn: async (idOrEvaluation: string | WeeklyEvaluation) => {
      let evaluation: WeeklyEvaluation;

      if (typeof idOrEvaluation === "string") {
        const res = await weeklyEvaluationService.getWeeklyEvaluation(idOrEvaluation);
        if (!res?.data) {
          throw new Error("Evaluation not found");
        }
        evaluation = res.data;
      } else {
        evaluation = idOrEvaluation;
      }

      await generateWeeklyEvaluationPdf(evaluation);
      return evaluation;
    },

    onSuccess: () => {
      toast.success(t("exportSuccess"));
    },

    onError: (err) => {
      console.error("[useClientExportWeeklyEvaluation] Error generating PDF:", err);
      toast.error(t("exportFailed"));
    },
  });
}
