/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { InventoryItem } from "../types";
import { X, Check, Eye, Trash, Tag, MapPin, Layers, Archive, AlertTriangle } from "lucide-react";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem, changeRemarks?: string) => void;
  editingItem: InventoryItem | null;
  // If we open modal with pre-loaded barcode from scan failure:
  prefilledBarcode?: string;
}

const CATEGORIES = [
  "Frozen Foods",
  "Chor Chilled Drinks",
  "Sauces & Syrups",
  "Dairy & Alternatives",
  "Beverage Powders",
  "Topping & Desserts",
  "Bakery & Cones",
  "Special Collections",
  "General Inventory",
];

const LOCATIONS = [
  "Freezer Cabinet",
  "Chiller Aisle",
  "Aisle A1 - Flavouring",
  "Aisle B2 - Beverages",
  "Aisle C1 - Tea & Coffee",
  "Aisle D4 - Dry Snacks",
  "Aisle E2 - Bakery Supplies",
  "Aisle F1 - General Shelf",
  "Promo Stands",
];

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  prefilledBarcode = "",
}) => {
   const [articleCode, setArticleCode] = useState("");
  const [name, setName] = useState("");
  const [remark, setRemark] = useState("");
  const [location, setLocation] = useState(LOCATIONS[7]); // General shelf as default
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState(CATEGORIES[8]); // General inventory
  const [stock, setStock] = useState<number | "">("");
  const [aliasInput, setAliasInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [validationError, setValidationError] = useState<string | null>(null);
  const [changeLogsRemarks, setChangeLogsRemarks] = useState("");

  // Sync state with editingItem or defaults
  useEffect(() => {
    if (editingItem) {
      setArticleCode(editingItem.articleCode);
      setName(editingItem.name);
      setRemark(editingItem.remark);
      setLocation(editingItem.location);
      setBarcode(editingItem.barcode);
      setCategory(editingItem.category);
      setStock(editingItem.stock);
      setAliasInput(editingItem.aliases ? editingItem.aliases.join(", ") : "");
      setImageUrl(editingItem.imageUrl || "");
      setValidationError(null);
      setChangeLogsRemarks("");
    } else {
      // Auto-generate a random 6-digit article code for convenience shop speed
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      setArticleCode(randomCode);
      setName("");
      setRemark("");
      setLocation(LOCATIONS[7]);
      setBarcode(prefilledBarcode);
      setCategory(CATEGORIES[8]);
      setStock("");
      setAliasInput("");
      setImageUrl("");
      setValidationError(null);
      setChangeLogsRemarks("");
    }
  }, [editingItem, prefilledBarcode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError("Product item name is required.");
      return;
    }

    let finalArticleCode = articleCode.trim();
    if (!finalArticleCode) {
      finalArticleCode = Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Parse aliases
    const aliases = aliasInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const finalStock = stock === "" ? 0 : Number(stock);

    const savedItem: InventoryItem = {
      id: finalArticleCode,
      articleCode: finalArticleCode,
      name: name.trim(),
      remark: remark.trim(),
      location,
      barcode: barcode.trim(),
      category,
      stock: finalStock,
      imageUrl: imageUrl.trim() || undefined,
      aliases,
    };

    onSave(savedItem, changeLogsRemarks.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative border border-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-3xl text-slate-800">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {editingItem ? "Edit Existing Product" : "Re-enroll New Product"}
            </span>
            <h3 className="text-md md:text-lg font-bold tracking-tight mt-1 text-slate-900">
              {editingItem ? `Configure #${editingItem.articleCode}` : "Add Item to 8Twelve Stock"}
            </h3>
          </div>
          <button
            id="btn-close-modal"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable forms */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {validationError && (
            <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Article Code */}
            <div>
              <label htmlFor="modal-article-code" className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Archive className="w-3 h-3 text-slate-400" />
                Article Code *
              </label>
              <input
                id="modal-article-code"
                type="text"
                disabled={!!editingItem}
                value={articleCode}
                onChange={(e) => setArticleCode(e.target.value)}
                placeholder="022788"
                className="w-full bg-slate-50 border border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Barcode */}
            <div>
              <label htmlFor="modal-barcode" className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                Barcode Value *
              </label>
              <input
                id="modal-barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="2095500227888"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="modal-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Article Product Name *
            </label>
            <input
              id="modal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="7E Grilled Mushroom & C. Sausage 80g"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white font-medium text-slate-800"
            />
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="modal-remark" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Product Remarks / Specifications (optional)
            </label>
            <input
              id="modal-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="LTO, #1138 only, promo etc."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label htmlFor="modal-category" className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Shop Category
              </label>
              <select
                id="modal-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="modal-location" className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Aisle Rack Location
              </label>
              <select
                id="modal-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Level Input */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h5 className="text-xs font-bold text-slate-800 uppercase mb-2">Inventory Stock Level settings</h5>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label htmlFor="modal-stock" className="block text-[11px] text-slate-500 font-bold uppercase mb-1">
                  Adjust Stock Count
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="modal-stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stock}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setStock("");
                      } else {
                        setStock(Math.max(0, parseInt(val, 10) || 0));
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-mono font-bold focus:outline-none focus:border-emerald-600"
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setStock((prev) => (prev === "" ? 10 : prev + 10))}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-[10px] font-bold rounded"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setStock((prev) => (prev === "" ? 0 : Math.max(0, prev - 10)))}
                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-[10px] font-bold rounded"
                    >
                      -10
                    </button>
                  </div>
                </div>
              </div>

              {/* Adjust Logs Remarks */}
              <div>
                <label htmlFor="modal-log-remark" className="block text-[11px] text-slate-500 font-bold uppercase mb-1">
                  Remark for Ledger Log
                </label>
                <input
                  id="modal-log-remark"
                  type="text"
                  placeholder="e.g. Weekly Arrival, Stock Correction"
                  value={changeLogsRemarks}
                  onChange={(e) => setChangeLogsRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Aliases */}
          <div>
            <label htmlFor="modal-aliases" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Alternative Aliases (comma-separated for fast lookup)
            </label>
            <input
              id="modal-aliases"
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="Sosej, 7-Eleven sausage, canned bun, milk replacement"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Adding aliases makes items searchable using local slang or alternate brand spellings.
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="modal-image-url" className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Product Image URL (optional)
            </label>
            <input
              id="modal-image-url"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-example"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-50 rounded-b-3xl border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            id="btn-cancel-modal"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-all"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            id="btn-confirm-save-modal"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            {editingItem ? "Commit Updates" : "Register Product"}
          </button>
        </div>
      </div>
    </div>
  );
};
