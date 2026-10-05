"use client";

import React, { useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  FileUp,
  FileText,
  FileCheck,
  X,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
} from "lucide-react";

export interface UploadedFileItem {
  id?: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  publicUrl?: string;
  filePath?: string;
}

export interface FileUploadProps<T extends UploadedFileItem = UploadedFileItem> {
  label?: string;
  required?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  allowedExtensions?: string[];
  files: T[];
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatusText?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  onFilesSelected: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  dropzoneTitle?: string;
  dropzoneSubtitle?: string;
}

/**
 * Format bytes to readable string (KB / MB)
 */
function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Return appropriate icon based on file extension / mime type
 */
function getFileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return <FileText className="h-5 w-5 text-rose-500 dark:text-rose-400 shrink-0" />;
  }
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) {
    return <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 shrink-0" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType?.includes("sheet")) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />;
  }
  if (["zip", "rar", "7z", "tar"].includes(ext) || mimeType?.includes("zip")) {
    return <FileArchive className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />;
  }
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext) || mimeType?.includes("image")) {
    return <ImageIcon className="h-5 w-5 text-purple-500 dark:text-purple-400 shrink-0" />;
  }
  return <FileCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />;
}

export default function FileUpload<T extends UploadedFileItem = UploadedFileItem>({
  label,
  required,
  maxFiles = 3,
  maxSizeMB = 10,
  accept = ".pdf,.doc,.docx",
  allowedExtensions = [".pdf", ".doc", ".docx"],
  files = [],
  isUploading = false,
  uploadProgress = 0,
  uploadStatusText = "",
  disabled = false,
  error,
  helperText,
  className = "",
  onFilesSelected,
  onFileRemove,
  dropzoneTitle,
  dropzoneSubtitle,
}: FileUploadProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const locale = useLocale();
  const isEn = locale === "en";

  const canUploadMore = files.length < maxFiles && !disabled && !isUploading;
  const remainingSlots = Math.max(0, maxFiles - files.length);

  const validateAndPassFiles = (rawFiles: FileList | File[]) => {
    const list = Array.from(rawFiles);
    if (list.length === 0) return;

    setLocalError(null);

    if (list.length > remainingSlots) {
      setLocalError(
        isEn
          ? `You can only add up to ${remainingSlots} more files (maximum ${maxFiles} files)`
          : `Bạn chỉ có thể tải thêm tối đa ${remainingSlots} file (giới hạn ${maxFiles} file)`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    for (const f of list) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
        setLocalError(
          isEn
            ? `File "${f.name}" is invalid. Allowed formats: ${allowedExtensions.join(", ")}`
            : `File "${f.name}" không hợp lệ. Chỉ chấp nhận định dạng: ${allowedExtensions.join(", ")}`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (f.size > maxSizeBytes) {
        setLocalError(
          isEn
            ? `File "${f.name}" (${formatFileSize(f.size)}) exceeds maximum size limit of ${maxSizeMB}MB`
            : `File "${f.name}" (${formatFileSize(f.size)}) vượt quá dung lượng tối đa ${maxSizeMB}MB`
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    onFilesSelected(list);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUploadMore) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canUploadMore) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFiles(e.dataTransfer.files);
    }
  };

  const displayError = error || localError;

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Label and File Counter */}
      {(label || maxFiles > 1) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
              {label}
              {required && <span className="text-danger font-bold">*</span>}
            </label>
          ) : <div />}

          {maxFiles > 1 && (
            <span className="text-[11px] font-medium text-muted/80">
              {isEn
                ? `Uploaded ${files.length}/${maxFiles} files`
                : `Đã tải ${files.length}/${maxFiles} file`}
            </span>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={accept}
        disabled={!canUploadMore}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <div
              key={`${file.fileName}-${idx}`}
              className="group flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 transition-all duration-200 hover:border-emerald-500/50"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="shrink-0 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  {getFileIcon(file.fileName, file.mimeType)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate" title={file.fileName}>
                    {file.fileName}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80 flex items-center gap-1.5 mt-0.5">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>•</span>
                    <span className="font-medium">{isEn ? "Uploaded" : "Đã tải lên"}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFileRemove(idx)}
                disabled={disabled || isUploading}
                className="shrink-0 p-1.5 text-muted hover:text-danger hover:bg-danger/10 transition-colors rounded-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={isEn ? "Remove this file" : "Xóa file này"}
                aria-label={isEn ? `Remove file ${file.fileName}` : `Xóa file ${file.fileName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading Progress Bar (Gradient Cyan-to-Blue with Realtime %) */}
      {isUploading && (
        <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card/60 shadow-lg space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-foreground/90">
            <span className="flex items-center gap-2 font-medium truncate pr-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary-light shrink-0" />
              <span className="truncate">
                {uploadStatusText || (isEn ? "Uploading files securely to storage..." : "Đang tải dữ liệu trực tiếp lên máy chủ bảo mật...")}
              </span>
            </span>
            <span className="font-bold text-primary-light text-sm tabular-nums shrink-0">
              {uploadProgress}%
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(21,174,245,0.6)]"
              style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone (Shown when slots are available and not uploading) */}
      {canUploadMore && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`
            group flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl
            border-2 border-dashed transition-all duration-300 cursor-pointer text-center select-none
            outline-none focus-visible:ring-2 focus-visible:ring-primary-light
            ${
              isDragging
                ? "border-primary-light bg-primary-light/10 scale-[1.01] shadow-[0_0_30px_rgba(21,174,245,0.25)]"
                : displayError
                ? "border-danger/50 bg-danger/5 hover:border-danger hover:bg-danger/10"
                : "border-border hover:border-primary-light/60 bg-card/40 hover:bg-card/70 hover:shadow-md"
            }
          `}
        >
          <div
            className={`
              h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300
              ${
                isDragging
                  ? "bg-primary-light/20 border border-primary-light text-primary-light scale-110"
                  : "bg-primary-light/10 border border-primary-light/30 text-primary-light group-hover:scale-110 group-hover:border-primary-light group-hover:shadow-[0_0_20px_rgba(21,174,245,0.3)]"
              }
            `}
          >
            <FileUp className="h-6 w-6" />
          </div>

          <p className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary-light transition-colors">
            {dropzoneTitle ||
              (files.length === 0
                ? (isEn ? "Click to select files or drag and drop here" : "Nhấp để chọn file hoặc kéo thả vào đây")
                : (isEn ? `Click to add more files (${remainingSlots} remaining)` : `Nhấp để tải thêm file (còn ${remainingSlots} file)`))}
          </p>

          <p className="mt-1 text-xs text-muted max-w-sm">
            {dropzoneSubtitle ||
              (isEn
                ? `Supported formats: ${allowedExtensions.map((e) => e.toUpperCase().replace(".", "")).join(", ")} (Max ${maxSizeMB}MB/file • Max ${maxFiles} files)`
                : `Hỗ trợ định dạng ${allowedExtensions.map((e) => e.toUpperCase().replace(".", "")).join(", ")} (Tối đa ${maxSizeMB}MB/file • Tối đa ${maxFiles} file)`)}
          </p>
        </div>
      )}

      {/* Error text */}
      {displayError ? (
        <p
          role="alert"
          className="text-xs text-danger flex items-center gap-1.5 mt-1 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
}
