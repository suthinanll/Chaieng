"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import Tesseract from "tesseract.js";
import {
  PlusCircle,
  Trash2,
  UploadCloud,
  Loader2,
  TrendingUp,
  TrendingDown,
  X,
  CheckCircle2,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { showSuccess, showError, showDeleteConfirm } from "../lib/swalConfig";

interface FinanceRecord {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  slip_url: string | null;
  created_at: string;
}

interface WalletTabProps {
  userId: string;
}

const CATEGORIES = [
  "อาหาร",
  "เดินทาง",
  "ช้อปปิ้ง",
  "ที่อยู่อาศัย",
  "บันเทิง",
  "อื่นๆ",
];
// Theme-aware background/text pairs so category icons stay visible in both
// light and dark mode (raw hex + low opacity was invisible on dark cards).
const CATEGORY_STYLES: { [key: string]: string } = {
  อาหาร: "bg-slate-900/5 dark:bg-slate-100/10 text-slate-700 dark:text-slate-200",
  เดินทาง: "bg-slate-900/5 dark:bg-slate-100/10 text-slate-600 dark:text-slate-300",
  ช้อปปิ้ง: "bg-yellow-400/10 dark:bg-yellow-400/15 text-yellow-600 dark:text-yellow-400",
  ที่อยู่อาศัย: "bg-slate-900/5 dark:bg-slate-100/10 text-slate-500 dark:text-slate-400",
  บันเทิง: "bg-slate-900/5 dark:bg-slate-100/10 text-slate-600 dark:text-slate-300",
  อื่นๆ: "bg-slate-900/5 dark:bg-slate-100/10 text-slate-400 dark:text-slate-500",
};
const INCOME_STYLE =
  "bg-yellow-400/10 dark:bg-yellow-400/15 text-yellow-600 dark:text-yellow-400";

export default function WalletTab({ userId }: WalletTabProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [recordType, setRecordType] = useState("expense");
  const [incomeSource, setIncomeSource] = useState("");
  const [customCategoryDetail, setCustomCategoryDetail] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"all" | "income" | "expense">("all");
  const [historyMonthFilter, setHistoryMonthFilter] = useState("all");
  const [summaryPeriod, setSummaryPeriod] = useState<"day" | "month" | "year">("month");

  // OCR state
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSlipPreview, setOcrSlipPreview] = useState<string | null>(null);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const currentMonthRecords = (data || []).filter((record) => {
        const createdAt = new Date(record.created_at);
        return createdAt >= monthStart;
      });

      const staleRecords = (data || []).filter((record) => {
        const createdAt = new Date(record.created_at);
        return createdAt < monthStart;
      });

      if (staleRecords.length > 0) {
        const { error: deleteError } = await supabase
          .from("finance_records")
          .delete()
          .in(
            "id",
            staleRecords.map((record) => record.id),
          );

        if (deleteError) throw deleteError;
      }

      setRecords(currentMonthRecords);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching finance records:", message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || isNaN(parseFloat(amountInput))) return;

    try {
      const val = parseFloat(amountInput);
      const recordCategory =
        recordType === "income"
          ? (incomeSource.trim() || "รายได้")
          : selectedCategory === "อื่นๆ"
            ? (customCategoryDetail.trim() || "อื่นๆ")
            : selectedCategory;

      const { error } = await supabase.from("finance_records").insert({
        user_id: userId,
        amount: val,
        type: recordType,
        category: recordCategory,
        slip_url: null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setAmountInput("");
      setIncomeSource("");
      setCustomCategoryDetail("");

      showSuccess("บันทึกสำเร็จ!", "เพิ่มข้อมูลลงในประวัติการเงินของคุณแล้ว");
      await fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("บันทึกไม่สำเร็จ", message);
    }
  };

  const handleSaveOcr = async () => {
    if (!amountInput || isNaN(parseFloat(amountInput))) return;

    try {
      const val = parseFloat(amountInput);
      const recordCategory =
        selectedCategory === "อื่นๆ"
          ? (customCategoryDetail.trim() || "อื่นๆ")
          : selectedCategory;

      const { error } = await supabase.from("finance_records").insert({
        user_id: userId,
        amount: val,
        type: "expense",
        category: recordCategory,
        slip_url: "mock_slip_url_scanned",
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setAmountInput("");
      setCustomCategoryDetail("");
      setOcrSlipPreview(null);
      setOcrSuccess(false);

      showSuccess("บันทึกสลิปสำเร็จ!", "ระบบจำแนกและบันทึกค่าใช้จ่ายแล้ว");
      await fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("บันทึกไม่สำเร็จ", message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showDeleteConfirm(
      "ต้องการลบรายการนี้?",
      "หากลบแล้วจะไม่สามารถกู้คืนได้"
    );

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from("finance_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showSuccess("ลบรายการสำเร็จ");
      await fetchRecords();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showError("ลบไม่สำเร็จ", message);
    }
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setOcrSlipPreview(reader.result as string);
      setOcrScanning(true);
      setOcrSuccess(false);
      setOcrProgress(0);

      Tesseract.recognize(file, "tha+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      })
        .then(({ data: { text } }) => {
          setOcrScanning(false);
          setOcrSuccess(true);

          const lowerTextWithSpaces = text.toLowerCase();
          const lowerTextClean = lowerTextWithSpaces.replace(/\s+/g, "");

          const extractAmountCandidates = (ocrText: string) => {
            const candidates: number[] = [];
            const patterns = [
              /(?:จำนวนเงิน|ยอดเงิน|ยอด|ค่าใช้จ่าย|จ่ายแล้ว|total|amount|paid|net)[\s:\-]*฿?\s*(\d+(?:\.\d{1,2})?)/gi,
              /(\d+(?:\.\d{1,2})?)\s*(บาท|baht|bht)/gi,
              /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)/g,
            ];

            patterns.forEach((pattern) => {
              const matches = ocrText.matchAll(pattern);
              for (const match of matches) {
                const value = match[1] ?? match[0];
                const numeric = parseFloat(String(value).replace(/,/g, ""));
                const isLikelyYear = numeric >= 1900 && numeric <= 2099;
                if (
                  Number.isFinite(numeric) &&
                  numeric > 0 &&
                  numeric < 5000000 &&
                  !isLikelyYear
                ) {
                  candidates.push(numeric);
                }
              }
            });

            return Array.from(new Set(candidates));
          };

          const amountCandidates = extractAmountCandidates(text);
          let detectedAmount = 0;

          if (amountCandidates.length > 0) {
            const contextBased = amountCandidates.find((value) => value >= 10);
            detectedAmount = contextBased ?? amountCandidates[0];
          }

          if (detectedAmount === 0 || detectedAmount === 0.0) {
            const anyNumberRegex = /(?:จำนวนเงิน|จ่ายแล้ว|ยอดเงิน)[\s\n]*[:\-]*[\s\n]*(\d+)/i;
            const backupMatch = lowerTextWithSpaces.match(anyNumberRegex);
            if (backupMatch && backupMatch[1]) {
              detectedAmount = parseFloat(backupMatch[1]);
            }
          }

          let detectedCategory = "อาหาร";

          if (
            lowerTextClean.includes("เติมเงิน") ||
            lowerTextClean.includes("topup") ||
            lowerTextClean.includes("mymo")
          ) {
            detectedCategory = "บันเทิง";
          } else if (
            lowerTextClean.includes("ค่าไฟ") ||
            lowerTextClean.includes("ค่าน้ำ") ||
            lowerTextClean.includes("กฟภ") ||
            lowerTextClean.includes("กปภ")
          ) {
            detectedCategory = "ที่อยู่อาศัย";
          } else if (
            lowerTextClean.includes("bts") ||
            lowerTextClean.includes("mrt") ||
            lowerTextClean.includes("รถไฟฟ้า") ||
            lowerTextClean.includes("taxi") ||
            lowerTextClean.includes("grab")
          ) {
            detectedCategory = "เดินทาง";
          } else if (
            lowerTextClean.includes("shopee") ||
            lowerTextClean.includes("lazada") ||
            lowerTextClean.includes("ซื้อของ") ||
            lowerTextClean.includes("ช้อป") ||
            lowerTextClean.includes("7-eleven") ||
            lowerTextClean.includes("เซเว่น")
          ) {
            detectedCategory = "ช้อปปิ้ง";
          }

          setAmountInput(detectedAmount > 0 ? detectedAmount.toFixed(2) : "");
          setSelectedCategory(detectedCategory);
          setRecordType("expense");
        })
        .catch((err) => {
          console.error("OCR Error:", err);
          setOcrScanning(false);
          setOcrSuccess(true);
          setAmountInput("");
        });
    };
    reader.readAsDataURL(file);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const thaiWeekdays = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

  const getThaiDateSearchText = (value: Date) => {
    const day = value.getDate();
    const monthName = thaiMonths[value.getMonth()];
    const weekday = thaiWeekdays[value.getDay()];
    const year = value.getFullYear() + 543;
    return [
      monthName,
      `${day}`,
      `${value.getMonth() + 1}`,
      `${year}`,
      `${weekday}`,
      `${weekday}ที่`,
      value.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    ].join(" ").toLowerCase();
  };

  const formatHistoryDateLabel = (value: Date) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateStart = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const diffDays = Math.round((dateStart.getTime() - todayStart.getTime()) / 86400000);
    const timeLabel = value.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (diffDays === 0) {
      return `วันนี้ • ${timeLabel}`;
    }

    if (diffDays === -1) {
      return `เมื่อวาน • ${timeLabel}`;
    }

    const weekday = thaiWeekdays[value.getDay()];
    const monthName = thaiMonths[value.getMonth()];
    const year = value.getFullYear() + 543;
    return `${weekday}ที่ ${value.getDate()} ${monthName} ${year} • ${timeLabel}`;
  };
  const todayLabel = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isMonthResetDay = now.getDate() === 1;

  const monthlyRecords = records.filter((r) => {
    const date = new Date(r.created_at);
    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  });

  const currentMonthHistory = monthlyRecords.filter((record) => record.type !== undefined);

  const totalIncome = monthlyRecords
    .filter((r) => r.type === "income")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = monthlyRecords
    .filter((r) => r.type === "expense")
    .reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const expenseByCategory: { [key: string]: number } = {};
  CATEGORIES.forEach((cat) => {
    expenseByCategory[cat] = 0;
  });

  monthlyRecords
    .filter((r) => r.type === "expense")
    .forEach((r) => {
      const cat = r.category || "อื่นๆ";
      if (expenseByCategory[cat] !== undefined) {
        expenseByCategory[cat] += r.amount;
      } else {
        expenseByCategory["อื่นๆ"] += r.amount;
      }
    });

  let highestCategory = "";
  let highestAmount = 0;
  CATEGORIES.forEach((cat) => {
    if (expenseByCategory[cat] > highestAmount) {
      highestAmount = expenseByCategory[cat];
      highestCategory = cat;
    }
  });

  const expenseSummary = records
    .filter((record) => record.type === "expense")
    .reduce<Record<string, { total: number; count: number }>>((acc, record) => {
      const date = new Date(record.created_at);
      let key = "";

      if (summaryPeriod === "day") {
        key = date.toISOString().slice(0, 10);
      } else if (summaryPeriod === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = `${date.getFullYear()}`;
      }

      if (!acc[key]) {
        acc[key] = { total: 0, count: 0 };
      }

      acc[key].total += record.amount;
      acc[key].count += 1;
      return acc;
    }, {});

  const expenseSummaryEntries = Object.entries(expenseSummary)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const categorySummary = monthlyRecords
    .filter((record) => record.type === "expense")
    .reduce<Record<string, number>>((acc, record) => {
      const category = record.category || "อื่นๆ";
      acc[category] = (acc[category] || 0) + record.amount;
      return acc;
    }, {});

  const categoryEntries = Object.entries(categorySummary)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const pieColors = ["#eab308", "#94a3b8", "#64748b", "#475569", "#cbd5e1", "#334155"];
  const totalCategoryExpense = categoryEntries.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6 pb-24 lg:pb-8 text-slate-800 dark:text-slate-200 antialiased">
      {/* Tab Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/60 pb-4">
        <div className="rounded-xl bg-neutral-900 dark:bg-neutral-800 p-2 text-yellow-400">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            ระบบการเงิน
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            วิเคราะห์ข้อมูลและสรุปรายรับ-รายจ่าย ประจำเดือนนี้
          </p>
          <p className="mt-1 text-[11px] font-medium text-yellow-600 dark:text-yellow-400">
            {todayLabel}
          </p>
        </div>
      </div>

     {/* Balance Dashboard Cards */}
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
      <TrendingUp className="h-3.5 w-3.5" />
      <span>รายรับเดือนนี้</span>
    </div>
    <p className="mt-2 text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
      +{totalIncome.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
    </p>
  </div>

  <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
      <TrendingDown className="h-3.5 w-3.5" />
      <span>รายจ่ายเดือนนี้</span>
    </div>
    <p className="mt-2 text-xl lg:text-2xl font-black text-slate-500 dark:text-slate-400 tracking-tight">
      -{totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
    </p>
  </div>

  <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl border border-slate-900 dark:border-white bg-slate-900 dark:bg-white p-4">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 dark:text-slate-600">
      <Wallet className="h-3.5 w-3.5" />
      <span>ยอดเหลือสุทธิ</span>
    </div>
    <p className={`mt-2 text-xl lg:text-2xl font-black tracking-tight ${netBalance >= 0 ? "text-yellow-400 dark:text-yellow-600" : "text-white dark:text-slate-900"}`}>
      {netBalance >= 0 ? "+" : ""}
      {netBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
    </p>
  </div>
</div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-inner sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {isMonthResetDay
              ? "วันนี้เป็นวันแรกของเดือน ระบบจะเริ่มสรุปยอดเดือนใหม่เป็น 0"
              : "สรุปยอดเดือนนี้อัปเดตตามรายการที่บันทึกไว้"}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            คุณสามารถกดดูประวัติด้านล่างเพื่อย้อนกลับมาดูรายการเดิมในเดือนนี้ได้
          </p>
        </div>
        <button
          type="button"
          onClick={() => historySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 dark:bg-white px-3 py-2 text-xs font-medium text-white dark:text-slate-900 transition-all hover:bg-slate-700 dark:hover:bg-slate-200"
        >
          ดูประวัติเดือนนี้
        </button>
      </div>

      {/* Summary insights box */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-inner">
        <Image
          src="/icon.png"
          alt="info"
          width={16}
          height={16}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {totalExpense > 0 ? (
            <span>
              เดือนนี้คุณใช้จ่ายไปกับหมวดหมู่{" "}
              <strong className="font-semibold text-yellow-600 dark:text-yellow-400">
                &quot;{highestCategory}&quot;
              </strong>{" "}
              มากที่สุด เป็นจำนวนเงิน{" "}
              <strong className="text-slate-900 dark:text-white font-medium">
                {highestAmount.toLocaleString("th-TH")} บาท
              </strong>
            </span>
          ) : (
            <span className="italic text-slate-400 dark:text-slate-500">
              เดือนนี้ยังไม่มีประวัติการบันทึกค่าใช้จ่าย
            </span>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-wide">
              สรุปการใช้เงิน
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ดูยอดรายจ่ายตามวัน เดือน หรือปี
            </p>
          </div>
          <div className="flex gap-2">
            {(["day", "month", "year"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSummaryPeriod(period)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  summaryPeriod === period
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {period === "day" ? "วัน" : period === "month" ? "เดือน" : "ปี"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {expenseSummaryEntries.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ยังไม่มีข้อมูลรายจ่ายสำหรับสรุป
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex justify-center">
                    <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
                      <circle cx="60" cy="60" r="44" fill="none" stroke="#e2e8f0" strokeWidth="24" />
                      {categoryEntries.reduce<React.ReactNode[]>((segments, item, index) => {
                        const percent = totalCategoryExpense > 0 ? item.total / totalCategoryExpense : 0;
                        let currentAngle = 0;
                        if (index > 0) {
                          for (let i = 0; i < index; i += 1) {
                            currentAngle += (categoryEntries[i].total / totalCategoryExpense) * 360;
                          }
                        }
                        const endAngle = currentAngle + percent * 360;
                        const startX = 60 + Math.cos((currentAngle - 90) * (Math.PI / 180)) * 44;
                        const startY = 60 + Math.sin((currentAngle - 90) * (Math.PI / 180)) * 44;
                        const endX = 60 + Math.cos((endAngle - 90) * (Math.PI / 180)) * 44;
                        const endY = 60 + Math.sin((endAngle - 90) * (Math.PI / 180)) * 44;
                        const largeArcFlag = percent > 0.5 ? 1 : 0;
                        const path = `M 60 60 L ${startX} ${startY} A 44 44 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                        segments.push(
                          <path
                            key={item.category}
                            d={path}
                            fill={pieColors[index % pieColors.length]}
                          />,
                        );
                        return segments;
                      }, [])}
                    </svg>
                  </div>

                  <div className="flex-1 space-y-2">
                    {categoryEntries.map((item, index) => (
                      <div key={item.category} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 dark:bg-slate-900/40 px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {item.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {expenseSummaryEntries.map((item) => {
                  const label =
                    summaryPeriod === "day"
                      ? new Date(`${item.key}T00:00:00`).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : summaryPeriod === "month"
                        ? new Date(`${item.key}-01T00:00:00`).toLocaleDateString("th-TH", {
                            month: "short",
                            year: "numeric",
                          })
                        : `${item.key}`;

                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.count} รายการ
                        </p>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {item.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Input and history */}
      <div className="grid grid-cols-1 gap-6 items-start">
        <div className="space-y-6">
          {/* Slip OCR Scanner Area */}
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-6 text-center shadow-sm">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 tracking-wide">
              สแกนใบเสร็จ / สลิปโอนเงิน
            </h3>
         

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleSlipUpload}
              className="hidden"
            />

            {!ocrSlipPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-xs font-medium text-white dark:text-slate-900 shadow-lg transition-all hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                อัปโหลดรูปภาพสลิป
              </button>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="relative mx-auto max-w-[140px] overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-md">
                  <Image
                    src={ocrSlipPreview}
                    alt="Slip preview"
                    width={400}
                    height={400}
                    unoptimized
                    className="h-auto w-full opacity-60 dark:opacity-50"
                  />

                  {ocrScanning && (
                    <div className="absolute left-0 right-0 h-[2px] bg-yellow-400 shadow-[0_0_10px_#facc15] animate-scan top-0" />
                  )}
                </div>

                {ocrScanning && (
                  <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 font-medium">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      กำลังแปลงข้อความจากสลิป...
                    </div>
                    <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all duration-300"
                        style={{ width: `${ocrProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {ocrProgress}% Complete
                    </div>
                  </div>
                )}

                {ocrSuccess && (
                  <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left shadow-lg">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        ตรวจสอบผลลัพธ์ OCR
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                          ยอดเงินที่ตรวจพบ (บาท)
                        </label>
                        <input
                          type="number"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1.5">
                          ยืนยันหรือเปลี่ยนหมวดหมู่
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedCategory(cat)}
                              className={`rounded-xl px-2 py-2 text-xs text-center border transition-all ${
                                selectedCategory === cat
                                  ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 font-medium shadow-md"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {selectedCategory === "อื่นๆ" && (
                        <div>
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                            ระบุรายละเอียดค่าใช้จ่าย
                          </label>
                          <input
                            type="text"
                            value={customCategoryDetail}
                            onChange={(e) => setCustomCategoryDetail(e.target.value)}
                            placeholder="เช่น ค่ารถ/ค่าเรียน"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 mt-2">
                      <button
                        onClick={handleSaveOcr}
                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-medium text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
                      >
                        บันทึกรายการ
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setOcrSlipPreview(null);
                          setOcrSuccess(false);
                          setAmountInput("");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Insert Form */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-5 shadow-sm">
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-wide">
              เพิ่มรายการด้วยตนเอง
            </h3>
            <form onSubmit={handleAddManual} className="mt-4 space-y-3.5">
              <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setRecordType("expense")}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
                    recordType === "expense"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-inner"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  รายจ่าย
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType("income")}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all cursor-pointer ${
                    recordType === "income"
                      ? "bg-yellow-400 text-slate-900 shadow-inner"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  รายรับ
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="จำนวนเงิน (บาท)"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-medium placeholder-slate-400 dark:placeholder-slate-600"
                />
                {recordType === "expense" && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-medium cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="text-slate-900 dark:text-white bg-white dark:bg-slate-950"
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {recordType === "expense" && selectedCategory === "อื่นๆ" && (
                <input
                  type="text"
                  value={customCategoryDetail}
                  onChange={(e) => setCustomCategoryDetail(e.target.value)}
                  placeholder="ระบุรายละเอียดค่าใช้จ่าย เช่น ค่ารถ / ค่าเรียน"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-medium placeholder-slate-400 dark:placeholder-slate-600"
                />
              )}

              {recordType === "income" && (
                <input
                  type="text"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  placeholder="รับจากอะไร เช่น เงินเดือน / โอนจากเพื่อน"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-medium placeholder-slate-400 dark:placeholder-slate-600"
                />
              )}

              <button
                type="submit"
                className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white py-2.5 text-xs font-medium text-white dark:text-slate-900 transition-all hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 shadow-md cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                บันทึกรายการลงประวัติ
              </button>
            </form>
          </div>

          {/* Transaction History List */}
          <div ref={historySectionRef} className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-wide">
                ประวัติรายการเงินล่าสุด
              </h3>
              <div className="flex flex-wrap gap-2">
                {(["all", "income", "expense"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHistoryFilter(filter)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                      historyFilter === filter
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {filter === "all"
                      ? "ทั้งหมด"
                      : filter === "income"
                        ? "รายรับ"
                        : "รายจ่าย"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-3 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row">

                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="ค้นหาจากเดือน รายรับ รายจ่าย หมวดหมู่ หรือจำนวนเงิน"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-yellow-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : currentMonthHistory.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                ยังไม่มีข้อมูลบันทึกทางการเงินในเดือนนี้
              </p>
            ) : (
              <div className="space-y-2.5">
                {currentMonthHistory
                  .filter((rec) => {
                    const matchesType =
                      historyFilter === "all" || rec.type === historyFilter;
                    const searchText = historySearch.trim().toLowerCase();

                    const recordDate = new Date(rec.created_at);
                    const amountText = rec.amount.toLocaleString("th-TH", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    });
                    const dateText = [
                      recordDate.toLocaleDateString("th-TH"),
                      `${recordDate.getDate()}`,
                      `${recordDate.getMonth() + 1}`,
                      `${recordDate.getFullYear()}`,
                      `${recordDate.getDate()}/${recordDate.getMonth() + 1}/${recordDate.getFullYear()}`,
                      `${recordDate.getDate()}-${recordDate.getMonth() + 1}-${recordDate.getFullYear()}`,
                      getThaiDateSearchText(recordDate),
                    ].join(" ").toLowerCase();
                    const searchableText = `${rec.category || ""} ${rec.type === "income" ? "รายรับ รายได้" : "รายจ่าย"} ${rec.type === "income" ? "income" : "expense"}`.toLowerCase();
                    const typeText = rec.type === "income" ? "รายรับ income" : "รายจ่าย expense";

                    const matchesMonth =
                      historyMonthFilter === "all" ||
                      thaiMonths[recordDate.getMonth()].toLowerCase() === historyMonthFilter.toLowerCase();

                    if (!searchText && historyMonthFilter === "all") {
                      return matchesType && matchesMonth;
                    }

                    return (
                      matchesType &&
                      matchesMonth &&
                      (searchableText.includes(searchText) ||
                        amountText.includes(searchText) ||
                        dateText.includes(searchText) ||
                        typeText.includes(searchText))
                    );
                  })
                  .map((rec) => {
                    const isIncome = rec.type === "income";
                    const recordDate = new Date(rec.created_at);
                    const date = formatHistoryDateLabel(recordDate);
                    const displayLabel = rec.category || (isIncome ? "รายได้" : "อื่นๆ");

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 lg:p-4 shadow-sm hover:border-slate-300 dark:hover:border-slate-700/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-9 w-9 flex items-center justify-center rounded-xl text-sm shrink-0 shadow-sm ${
                              isIncome
                                ? INCOME_STYLE
                                : CATEGORY_STYLES[rec.category || "อื่นๆ"] ||
                                  CATEGORY_STYLES["อื่นๆ"]
                            }`}
                          >
                            {isIncome ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <h4 className="text-xs font-medium text-slate-900 dark:text-white">
                              {isIncome ? "รายได้" : displayLabel}
                            </h4>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {date}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-medium tracking-tight ${
                              isIncome
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {rec.amount.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}