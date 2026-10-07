"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useTranslations } from "next-intl";
import React from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import { pdfExportService } from "@/services/pdf-export.service";
import { InternshipSummaryReportTemplate } from "@/components/pdf/InternshipSummaryReportTemplate";
import type { InternshipSummaryData } from "@/types/pdf-export";

export async function generateInternshipSummaryPdf(summary: InternshipSummaryData): Promise<void> {
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
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(InternshipSummaryReportTemplate, { summary })
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = container.firstElementChild as HTMLElement;
    if (!element) {
      throw new Error("Không thể khởi tạo template báo cáo");
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    const cleanName = (summary.internName || "thuc-tap-sinh")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();

    const fileName = `tong-ket-thuc-tap-${cleanName}.pdf`;
    pdf.save(fileName);
  } finally {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function useClientExportInternshipSummary() {
  const t = useTranslations("pdfExport");

  return useMutation({
    mutationFn: async (internId: string) => {
      // 1. Lấy dữ liệu tổng kết từ API Backend v2
      const res = await pdfExportService.getInternshipSummaryData(internId);
      if (!res?.data) {
        throw new Error("Không tìm thấy dữ liệu tổng kết thực tập");
      }

      // 2. Xuất trực tiếp trên Client bằng html2canvas + jsPDF
      await generateInternshipSummaryPdf(res.data);

      // 3. Kích hoạt ngầm ghi vết ExportHistory trên Backend (không chặn người dùng)
      pdfExportService.exportInternshipSummary(internId).catch(() => {});

      return res.data;
    },

    onSuccess: () => {
      toast.success(t("exportSuccess"));
    },

    onError: (err) => {
      console.error("[useClientExportInternshipSummary] Error generating PDF:", err);
      toast.error(t("exportFailed"));
    },
  });
}
