/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Sparkles, Navigation } from "lucide-react";

interface AisleVisualGuideProps {
  selectedCategory: string;
  selectedLocation: string;
  onSelectCategory: (cat: string) => void;
  onSelectLocation: (loc: string) => void;
}

export const AisleVisualGuide: React.FC<AisleVisualGuideProps> = ({
  selectedCategory,
  selectedLocation,
  onSelectCategory,
  onSelectLocation,
}) => {
  // Hardcoded coordinate spots for visual map
  const elements = [
    {
      id: "frozen",
      name: "Frozen Foods",
      label: "F1 - Freezer Cabinets",
      category: "Frozen Foods",
      top: "15%",
      left: "15%",
      color: "bg-cyan-500",
      bgLight: "bg-cyan-50 border-cyan-200 text-cyan-800",
    },
    {
      id: "chilled",
      name: "Chor Chilled Drinks",
      label: "Chiller Aisle",
      category: "Chor Chilled Drinks",
      top: "15%",
      left: "60%",
      color: "bg-blue-500",
      bgLight: "bg-blue-50 border-blue-200 text-blue-800",
    },
    {
      id: "sauces",
      name: "Sauces & Syrups",
      label: "Aisle A1 - Flavorings",
      category: "Sauces & Syrups",
      top: "52%",
      left: "20%",
      color: "bg-amber-500",
      bgLight: "bg-amber-50 border-amber-200 text-amber-800",
    },
    {
      id: "beverage-powders",
      name: "Beverage Powders",
      label: "Aisle C1 - Tea/Coffee",
      category: "Beverage Powders",
      top: "52%",
      left: "65%",
      color: "bg-teal-500",
      bgLight: "bg-teal-50 border-teal-200 text-teal-800",
    },
    {
      id: "bakery",
      name: "Bakery & Cones",
      label: "Aisle E2 - Bakery Supplies",
      category: "Bakery & Cones",
      top: "80%",
      left: "15%",
      color: "bg-rose-500",
      bgLight: "bg-rose-50 border-rose-200 text-rose-800",
    },
    {
      id: "toppings",
      name: "Topping & Desserts",
      label: "Aisle D4 - Dry Snacks",
      category: "Topping & Desserts",
      top: "80%",
      left: "60%",
      color: "bg-purple-500",
      bgLight: "bg-purple-50 border-purple-200 text-purple-800",
    },
  ];

  return (
    <div id="aisle-visual-guide" className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">Aisle Floorplan</h4>
          <h3 className="text-sm font-extrabold text-zinc-800 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-emerald-600 rotate-45" />
            Store Location Guide
          </h3>
        </div>
        <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-650 px-2.5 py-0.5 rounded-full font-mono font-bold">
          FLOORPLAN
        </span>
      </div>

      <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed font-sans">
        Select a category block to highlight its aisle coordinate layout inside the convenience store database.
      </p>

      {/* Visual map representation */}
      <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden shadow-inner p-3">
        {/* Floor lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-10 pointer-events-none">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-white" />
          ))}
        </div>

        {/* Counter area / Cashier spot */}
        <div className="absolute bottom-2 right-2 px-3 py-1 bg-zinc-900 text-[10px] text-emerald-400 font-mono font-bold rounded-lg border border-emerald-950/60 shadow-lg">
          [ CASHIER & ENTRY ]
        </div>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-zinc-900 text-[9px] text-zinc-400 font-mono rounded">
          FRONT DOOR
        </div>

        {/* Aisle markers */}
        {elements.map((el) => {
          const isSelected = selectedCategory === el.category;
          return (
            <button
              key={el.id}
              id={`btn-map-node-${el.id}`}
              onClick={() => onSelectCategory(isSelected ? "" : el.category)}
              className={`absolute transition-all duration-350 p-2.5 rounded-xl border text-left cursor-pointer group shadow-sm ${
                isSelected
                  ? `${el.bgLight} border-2 scale-105 ring-4 ring-emerald-500/20 z-10`
                  : "bg-zinc-900/90 hover:bg-zinc-850 border-zinc-800 text-zinc-300 scale-100"
              }`}
              style={{
                top: el.top,
                left: el.left,
                width: "36%",
              }}
            >
              <div className="flex items-center gap-1 w-full truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${el.color} ${isSelected ? "animate-ping" : ""}`} />
                <span className="text-[10px] font-mono font-bold uppercase truncate">{el.name}</span>
              </div>
              <p className="text-[8px] opacity-70 truncate mt-0.5 font-sans">
                {el.label}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 font-bold bg-zinc-50 border border-zinc-200/50 p-2.5 rounded-xl">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          Tip: Tap any map quadrant to filter items.
        </span>
      </div>
    </div>
  );
};
