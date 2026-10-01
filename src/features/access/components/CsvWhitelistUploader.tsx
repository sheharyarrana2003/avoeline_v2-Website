"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Trash2, X } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";

interface CsvWhitelistUploaderProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}

interface ParseReport {
  valid: string[];
  invalid: { line: number; text: string }[];
  duplicates: string[];
}

export const CsvWhitelistUploader: React.FC<CsvWhitelistUploaderProps> = ({
  emails,
  onChange,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ParseReport | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const validateAndParse = (content: string) => {
    // Strip UTF-8 BOM if present
    const cleanContent = content.replace(/^﻿/, "");
    const lines = cleanContent.split(/\r\n|\r|\n/);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validSet = new Set<string>();
    const existingSet = new Set(emails.map((e) => e.toLowerCase().trim()));
    const invalid: { line: number; text: string }[] = [];
    const duplicates: string[] = [];

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (!line) return;

      // Check comma/semicolon/tab separation
      const cells = line.split(/[,;\t]/).map((c) => c.replace(/^["']|["']$/g, "").trim());
      const candidate = cells[0]?.toLowerCase();

      // Skip header row if first cell looks like "email" or "email address"
      if (idx === 0 && (/^e-?mail/i.test(candidate) || !candidate.includes("@"))) {
        return;
      }

      if (!candidate || !emailRegex.test(candidate)) {
        invalid.push({ line: idx + 1, text: line.slice(0, 50) });
        return;
      }

      if (validSet.has(candidate) || existingSet.has(candidate)) {
        duplicates.push(candidate);
        return;
      }

      validSet.add(candidate);
    });

    const parsedValid = Array.from(validSet);
    setReport({
      valid: parsedValid,
      invalid,
      duplicates,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      validateAndParse(text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    validateAndParse(manualInput);
    setManualInput("");
  };

  const applyValidEmails = () => {
    if (!report || report.valid.length === 0) return;
    const merged = Array.from(new Set([...emails, ...report.valid]));
    onChange(merged);
    setReport(null);
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(emails.filter((e) => e !== emailToRemove));
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const text = String(event.target?.result || "");
              validateAndParse(text);
            };
            reader.readAsText(file);
          }
        }}
        className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
          isDragging
            ? "border-primary-500 bg-primary-50/40 dark:bg-primary-950/20"
            : "border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/30 hover:border-neutral-400"
        }`}
      >
        <Upload className="w-6 h-6 mx-auto text-neutral-400 mb-2" />
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Upload Email Whitelist CSV
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Drag and drop your .csv file here, or click to browse.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
          id="whitelist-csv-input"
        />

        <label
          htmlFor="whitelist-csv-input"
          className={`inline-block mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 shadow-sm cursor-pointer hover:bg-neutral-50 transition ${
            disabled ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          Choose File
        </label>
      </div>

      {/* Manual Paste Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualAdd())}
          placeholder="Or paste an email address and hit Add"
          disabled={disabled}
          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={handleManualAdd}
          disabled={disabled || !manualInput.trim()}
          className={buttonClass("secondary", "sm")}
        >
          Add
        </button>
      </div>

      {/* Validation & Preview Report Modal/Box */}
      {report && (
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              CSV Parse Preview
            </span>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="block font-bold text-sm">{report.valid.length}</span>
              Valid Emails
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <span className="block font-bold text-sm">{report.duplicates.length}</span>
              Duplicates
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="block font-bold text-sm">{report.invalid.length}</span>
              Invalid Rows
            </div>
          </div>

          {report.invalid.length > 0 && (
            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 max-h-24 overflow-y-auto">
              <span className="font-semibold block mb-1">Skipped invalid formats:</span>
              {report.invalid.slice(0, 5).map((inv, idx) => (
                <div key={idx} className="truncate">
                  Line {inv.line}: &quot;{inv.text}&quot;
                </div>
              ))}
              {report.invalid.length > 5 && (
                <div>...and {report.invalid.length - 5} more</div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setReport(null)}
              className={buttonClass("ghost", "sm")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={report.valid.length === 0}
              onClick={applyValidEmails}
              className={buttonClass("primary", "sm")}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Add {report.valid.length} to Whitelist
            </button>
          </div>
        </div>
      )}

      {/* Current Whitelisted Emails List */}
      {emails.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Whitelisted Emails ({emails.length})</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-rose-600 hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="text-neutral-400 hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
