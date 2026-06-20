/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { InventoryItem } from "../types";
import { Package, AlertTriangle, HelpCircle, Database, RefreshCw } from "lucide-react";

interface StatsGridProps {
  items: InventoryItem[];
  selectedCategory: string;
  selectedLocation: string;
  activeFilter: "all" | "low" | "out";
  setActiveFilter: (filter: "all" | "low" | "out") => void;
  onResetToDefault: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  items,
  activeFilter,
  setActiveFilter,
  onResetToDefault
}) => {
  const totalItemsCount = items.length;
  const outOfStockItems = items.filter(i => i.stock === 0);
  const lowStockItems = items.filter(i => i.stock > 0 && i.stock <= 10);
  const totalUnits = items.reduce((acc, i) => acc + i.stock, 0);

  return (
    <div id="stats-grid-container" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Items Card */}
      <button
        id="btn-filter-all"
        onClick={() => setActiveFilter("all")}
        className={`text-left p-5 rounded-2xl transition-all duration-300 border ${
          activeFilter === "all"
            ? "bg-zinc-900 border-zinc-950 text-white shadow-lg"
            : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`p-2.5 rounded-xl ${activeFilter === "all" ? "bg-zinc-800" : "bg-emerald-50"}`}>
            <Package className="w-5 h-5 text-emerald-600" />
          </span>
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeFilter === "all" ? "text-emerald-400" : "text-zinc-400"}`}>All Items</span>
        </div>
        <p className="text-3xl font-black tracking-tight">{totalItemsCount}</p>
        <p className="text-xs opacity-75 mt-1 font-medium">Active products cataloged</p>
      </button>

      {/* Out of Stock Card */}
      <button
        id="btn-filter-out"
        onClick={() => setActiveFilter("out")}
        className={`text-left p-5 rounded-2xl transition-all duration-300 border ${
          activeFilter === "out"
            ? "bg-rose-950 border-rose-900 text-rose-100 shadow-lg"
            : "bg-white hover:bg-rose-50/45 border-zinc-200 text-zinc-900 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`p-2.5 rounded-xl ${activeFilter === "out" ? "bg-rose-900/50" : "bg-rose-50"}`}>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </span>
          <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider">Empty Shelf</span>
        </div>
        <p className="text-3xl font-black tracking-tight">{outOfStockItems.length}</p>
        <p className="text-xs text-rose-600/90 mt-1 font-medium">Out of stock items</p>
      </button>

      {/* Low Stock Card */}
      <button
        id="btn-filter-low"
        onClick={() => setActiveFilter("low")}
        className={`text-left p-5 rounded-2xl transition-all duration-300 border ${
          activeFilter === "low"
            ? "bg-amber-950 border-amber-900 text-amber-100 shadow-lg"
            : "bg-white hover:bg-amber-50/45 border-zinc-200 text-zinc-900 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className={`p-2.5 rounded-xl ${activeFilter === "low" ? "bg-amber-900/50" : "bg-amber-50"}`}>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-600 uppercase tracking-wider">Critical</span>
        </div>
        <p className="text-3xl font-black tracking-tight">{lowStockItems.length}</p>
        <p className="text-xs text-amber-600/95 mt-1 font-medium">Low stock (&le;10 units)</p>
      </button>

      {/* Total Units Stats & Preset Reset */}
      <div id="stats-units-card" className="bg-white border border-zinc-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="p-2.5 rounded-xl bg-emerald-50">
            <Database className="w-5 h-5 text-emerald-600" />
          </span>
          <button
            id="btn-reset-defaults"
            onClick={onResetToDefault}
            title="Restore default sample database"
            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-emerald-700 bg-zinc-100 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg font-bold border border-zinc-200/50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Data
          </button>
        </div>
        <div>
          <p className="text-3xl font-black tracking-tight text-zinc-800">{totalUnits}</p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Total active database volume</p>
        </div>
      </div>
    </div>
  );
};
