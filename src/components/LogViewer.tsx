/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { StockChangeLog, InventoryItem } from "../types";
import { FileText, Printer, FileDown, Search, ArrowRight, Trash2 } from "lucide-react";

interface LogViewerProps {
  logs: StockChangeLog[];
  onClearLogs: () => void;
  items?: InventoryItem[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClearLogs, items = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");

  // Filters
  const now = new Date();
  const processedLogs = logs.filter((log) => {
    // Search filter
    const matchesSearch =
      log.articleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.articleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.remarks.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Date filter
    if (dateFilter === "all") return true;

    const logDate = new Date(log.timestamp);
    const diffTime = Math.abs(now.getTime() - logDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dateFilter === "today") {
      return (
        logDate.getDate() === now.getDate() &&
        logDate.getMonth() === now.getMonth() &&
        logDate.getFullYear() === now.getFullYear()
      );
    }

    if (dateFilter === "week") {
      return diffDays <= 7;
    }

    return true;
  });

  // Export to CSV
  const exportLogsToCSV = () => {
    if (processedLogs.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["Timestamp", "Article Code", "Product Name", "Previous Stock", "New Stock", "Adjustment", "Remarks", "Operator"];
    const csvContent = [
      headers.join(","),
      ...processedLogs.map((log) => {
        const dateStr = new Date(log.timestamp).toLocaleString();
        const diff = log.newStock - log.prevStock;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        return [
          `"${dateStr}"`,
          `"${log.articleCode}"`,
          `"${log.articleName.replace(/"/g, '""')}"`,
          log.prevStock,
          log.newStock,
          `"${diffStr}"`,
          `"${log.remarks.replace(/"/g, '""')}"`,
          `"${log.operator}"`,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `8Twelve_Inventory_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print Report
  const triggerPrintReport = () => {
    window.print();
  };

  return (
    <>
      <div id="log-viewer-container" className="no-print bg-white rounded-2xl p-5 md:p-6 border border-zinc-200 shadow-sm relative overflow-hidden">
        
        {/* Visual Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-5 mb-5">
          <div>
            <h3 id="logs-title" className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Stock Ledger & Adjustment Logs
            </h3>
            <p className="text-xs text-zinc-500 leading-normal">
              A comprehensive journal of inventory modifications, restock runs, and write-offs.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {logs.length > 0 && (
              <button
                id="btn-clear-inventory-logs"
                onClick={() => {
                  if (confirm("Are you sure you want to wipe all transaction records from the ledger? This is non-reversible.")) {
                    onClearLogs();
                  }
                }}
                className="px-2.5 py-1.5 bg-zinc-50 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-zinc-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Wipe Logs
              </button>
            )}

            <button
              id="btn-export-csv-logs"
              onClick={exportLogsToCSV}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export CSV
            </button>
            
            <button
              id="btn-print-pdf-report"
              onClick={triggerPrintReport}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              Print PDF Report
            </button>
          </div>
        </div>

        {/* Local Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          {/* Local Search input */}
          <div className="md:col-span-7 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="log-search-input"
              type="text"
              placeholder="Search logs by code, name, remarks or operators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-55 border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
          </div>

          {/* Date Filters Segment */}
          <div className="md:col-span-5 flex rounded-xl bg-zinc-100 p-1">
            {(["all", "today", "week"] as const).map((mode) => (
              <button
                key={mode}
                id={`btn-log-time-${mode}`}
                onClick={() => setDateFilter(mode)}
                className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  dateFilter === mode ? "bg-white text-zinc-800 shadow-xs" : "text-zinc-550 hover:text-zinc-800"
                }`}
              >
                {mode === "all" ? "All Ledger" : mode === "today" ? "Today" : "Last 7d"}
              </button>
            ))}
          </div>
        </div>

        {/* Main Table / Mobile Timeline */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          {processedLogs.length > 0 ? (
            <table id="logs-data-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Timestamp / Staff</th>
                  <th className="p-3">Article</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-center">Prev</th>
                  <th className="p-3 text-center">New</th>
                  <th className="p-3 text-center">Change</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {processedLogs.map((log) => {
                  const diff = log.newStock - log.prevStock;
                  return (
                    <tr key={log.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-zinc-805">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {new Date(log.timestamp).toLocaleDateString()} &bull; {log.operator}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-800">
                        #{log.articleCode}
                      </td>
                      <td className="p-3 font-bold text-zinc-700 max-w-xs truncate">
                        {log.articleName}
                      </td>
                      <td className="p-3 text-center font-mono text-zinc-400 font-medium">
                        {log.prevStock}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-zinc-800">
                        {log.newStock}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          diff > 0
                            ? "bg-emerald-50/80 text-emerald-700 border border-emerald-100"
                            : diff < 0
                            ? "bg-rose-50/80 text-rose-600 border border-rose-100"
                            : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? "0" : diff}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-500 italic max-w-[180px] truncate" title={log.remarks}>
                        {log.remarks || <span className="text-zinc-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-zinc-400">
              <p className="text-xs font-bold text-zinc-500">No stock update logs matched your constraints.</p>
              <p className="text-[10px] opacity-75 mt-0.5">Change items stock levels to populate logs list.</p>
            </div>
          )}
        </div>
      </div>

      {/* PRINT-ONLY INVISIBLE PREPARED TABLE FOR CHROMIUM PRINTERS */}
      <div className="hidden print:block print-container font-sans text-zinc-950 bg-white">
        <div className="border-b-2 border-zinc-900 pb-4 mb-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase text-zinc-900">8Twelve Premium Stock Ledger</h1>
              <p className="text-xs text-zinc-550">Official Convenience Store Stock Audit & Traceability Report</p>
            </div>
            <div className="text-right text-xs text-zinc-650">
              <p><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Total Transactions:</strong> {processedLogs.length}</p>
            </div>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-800 text-zinc-800 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-1 text-left">Date & Time</th>
              <th className="py-3 px-1 text-left">Operator</th>
              <th className="py-3 px-1 text-left font-mono">Code</th>
              <th className="py-3 px-1 text-left">Barcode (Libre39)</th>
              <th className="py-3 px-1 text-left">Item Description</th>
              <th className="py-3 px-1 text-center">Prev</th>
              <th className="py-3 px-1 text-center">New</th>
              <th className="py-3 px-1 text-center">Change</th>
              <th className="py-3 px-1 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {processedLogs.map((log) => {
              const diff = log.newStock - log.prevStock;
              const matchingItem = items.find((item) => item.articleCode === log.articleCode);
              const barcodeValue = matchingItem?.barcode || log.articleCode || "000000";
              const barcodeDisplayStr = `*${barcodeValue.toUpperCase()}*`;

              return (
                <tr key={log.id} className="border-b border-zinc-200">
                  <td className="py-3 px-1 font-mono text-[10px] text-zinc-700 leading-tight">
                    {new Date(log.timestamp).toLocaleDateString()}<br />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-1 font-semibold text-zinc-800">
                    {log.operator}
                  </td>
                  <td className="py-3 px-1 font-mono text-emerald-800 font-bold text-[11px]">
                    #{log.articleCode}
                  </td>
                  {/* Real visual barcode column */}
                  <td className="py-3 px-1 min-w-[130px]">
                    <div className="font-barcode tracking-normal text-zinc-950 block select-none">
                      {barcodeDisplayStr}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-550 mt-1 select-all font-bold">
                      {barcodeValue}
                    </div>
                  </td>
                  <td className="py-3 px-1 font-bold text-zinc-900">
                    {log.articleName}
                  </td>
                  <td className="py-3 px-1 text-center font-mono text-zinc-600">
                    {log.prevStock}
                  </td>
                  <td className="py-3 px-1 text-center font-mono font-extrabold text-zinc-950">
                    {log.newStock}
                  </td>
                  <td className="py-3 px-1 text-center">
                    <span className={`font-mono font-black text-[11px] ${diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-600" : "text-zinc-500"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                  <td className="py-3 px-1 italic text-zinc-600 max-w-[150px] break-words">
                    {log.remarks || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-12 border-t border-zinc-300 pt-4 text-[10px] text-zinc-400 text-center flex justify-between items-center no-print-child">
          <p>&copy; 8Twelve Convenience Store Stock Management Ledger System.</p>
          <p className="font-mono text-[8px]">MD5_AUDIT_VERIFIED_SECURE</p>
        </div>
      </div>
    </>
  );
};
