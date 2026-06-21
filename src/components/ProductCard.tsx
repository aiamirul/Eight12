/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { InventoryItem } from "../types";
import { Edit, Trash, Plus, Minus, CheckCircle, Tag, MapPin, Archive, EyeOff } from "lucide-react";

interface ProductCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onQuickStockUpdate: (item: InventoryItem, newStock: number, remarks: string) => void;
  onToggleInactive?: (id: string, name: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onEdit,
  onDelete,
  onQuickStockUpdate,
  onToggleInactive,
}) => {
  const [quickStock, setQuickStock] = useState<number>(item.stock);
  const [quickRemarks, setQuickRemarks] = useState("");
  const [successAnimation, setSuccessAnimation] = useState(false);

  const isLowStock = item.stock > 0 && item.stock <= 10;
  const isOutOfStock = item.stock === 0;

  // Temporary stock increment
  const adjustStock = (amount: number) => {
    setQuickStock(prev => Math.max(0, prev + amount));
  };

  const handleSetStockSubmit = () => {
    onQuickStockUpdate(item, quickStock, quickRemarks.trim() || "Mobile Quick Update");
    setQuickRemarks("");
    setSuccessAnimation(true);
    setTimeout(() => setSuccessAnimation(false), 2000);
  };

  // Generate generic color/food illustration icons if no image is uploaded
  const getPlaceholderBg = () => {
    if (item.category.includes("Frozen")) return "from-cyan-400 to-blue-600";
    if (item.category.includes("Chilled")) return "from-blue-400 to-indigo-600";
    if (item.category.includes("Sauces")) return "from-amber-450 to-orange-600";
    if (item.category.includes("Dairy")) return "from-emerald-400 to-teal-600";
    if (item.category.includes("Powders")) return "from-yellow-400 to-amber-600";
    if (item.category.includes("Bakery")) return "from-rose-400 to-red-650";
    if (item.category.includes("Topping")) return "from-purple-400 to-indigo-600";
    return "from-slate-400 to-slate-650";
  };

  return (
    <div
      id={`product-card-${item.articleCode}`}
      className={`relative bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
        isOutOfStock
          ? "border-rose-300 shadow-sm"
          : isLowStock
          ? "border-amber-300 shadow-sm"
          : "border-zinc-200 hover:border-emerald-500 shadow-xs hover:shadow-md"
      }`}
    >
      {/* Stock warning ribbon */}
      {isOutOfStock && (
        <div className="absolute top-2.5 right-2.5 bg-rose-500 text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full z-10 font-mono tracking-wider">
          Out of Stock
        </div>
      )}
      {isLowStock && (
        <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full z-10 font-mono tracking-wider">
          Low Stock
        </div>
      )}

      {/* Top Banner section */}
      <div className={`h-2.5 bg-gradient-to-r ${getPlaceholderBg()}`} />

      {/* Info Body */}
      <div className="p-4 flex-1">
        
        {/* Category & Article code */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
            {item.category}
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/50">
            #{item.articleCode}
          </span>
        </div>

        {/* Name */}
        <h4 id={`product-name-${item.articleCode}`} className="font-extrabold text-sm text-zinc-800 line-clamp-2 leading-tight group-hover:text-emerald-600 transition-colors">
          {item.name}
        </h4>

        {/* Remarks label */}
        {item.remark && (
          <p className="text-[11px] text-amber-900 bg-amber-50/70 border border-amber-100 rounded-md py-0.5 px-2 mt-1.5 inline-block font-semibold">
            Note: {item.remark}
          </p>
        )}

        {/* Location & Barcode details */}
        <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate font-semibold text-zinc-600">{item.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Archive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">Barcode: {item.barcode}</span>
          </div>
        </div>

        {/* Aliases List */}
        {item.aliases && item.aliases.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1 items-center">
            <Tag className="w-3 h-3 text-zinc-400 shrink-0" />
            {item.aliases.map((alias, i) => (
              <span key={i} className="text-[9px] bg-zinc-150 border border-zinc-250 text-zinc-700 px-1.5 py-0.5 rounded font-bold">
                {alias}
              </span>
            ))}
          </div>
        )}

        {/* Last updated metadata indicator */}
        {item.lastUpdatedTime && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono border-t border-zinc-50 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Audit: {new Date(item.lastUpdatedTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({item.lastUpdatedStock} qty)</span>
          </div>
        )}
      </div>

      {/* Stock level setting panel inside card */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200/60 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-500">Stock Count</span>
          <div className="flex items-center gap-1.5">
            {/* Quick adjust buttons */}
            <button
              id={`btn-quick-minus-${item.articleCode}`}
              onClick={() => adjustStock(-1)}
              className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors"
              title="Decrease by 1"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-mono font-bold text-zinc-800 w-8 text-center bg-white border border-zinc-200 rounded py-0.5">
              {quickStock}
            </span>
            <button
              id={`btn-quick-plus-${item.articleCode}`}
              onClick={() => adjustStock(1)}
              className="w-6 h-6 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-zinc-700 transition-colors"
              title="Increase by 1"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Remarks and Submit trigger */}
        <div className="flex gap-1">
          <input
            id={`quick-remarks-input-${item.articleCode}`}
            type="text"
            placeholder="Log remark (e.g. Restock)"
            value={quickRemarks}
            onChange={(e) => setQuickRemarks(e.target.value)}
            className="flex-1 bg-white border border-zinc-200 rounded p-1 text-[10px] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            id={`btn-quick-update-${item.articleCode}`}
            onClick={handleSetStockSubmit}
            disabled={quickStock === item.stock && !quickRemarks.trim()}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold text-[10px] px-2.5 py-1 rounded transition-all shrink-0 active:scale-95"
          >
            Apply
          </button>
        </div>

        {/* Success toast overlay trigger */}
        {successAnimation && (
          <div className="text-[10px] text-emerald-700 font-bold text-center mt-1 bg-emerald-50 border border-emerald-200 rounded py-0.5 animate-pulse flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" /> Corrected stock recorded!
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-3 py-2.5 bg-zinc-100 border-t border-zinc-200/50 flex items-center justify-between gap-1 text-[11px] text-zinc-500">
        <span className="font-mono text-[10px] tracking-tight truncate">
          Current State: <strong className="text-zinc-800 font-bold">{item.stock} in store</strong>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleInactive && (
            <button
              id={`btn-ignore-card-${item.articleCode}`}
              onClick={() => onToggleInactive(item.id, item.name)}
              className="p-1 rounded text-zinc-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              title="Ignore product (excludes from Continuous Shelf Verification)"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id={`btn-edit-card-${item.articleCode}`}
            onClick={() => onEdit(item)}
            className="p-1 rounded text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            title="Edit details"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            id={`btn-delete-card-${item.articleCode}`}
            onClick={() => {
              if (confirm(`Wipe "${item.name}" from 8Twelve catalog registry?`)) {
                onDelete(item.id);
              }
            }}
            className="p-1 rounded text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Deregister item"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
