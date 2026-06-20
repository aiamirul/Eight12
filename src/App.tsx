/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { InventoryItem, StockChangeLog } from "./types";
import { loadDefaultInventory, parseCSVLine } from "./sampleData";
import { StatsGrid } from "./components/StatsGrid";
import { ScannerSimulator } from "./components/ScannerSimulator";
import { ProductCard } from "./components/ProductCard";
import { LogViewer } from "./components/LogViewer";
import { AisleVisualGuide } from "./components/AisleVisualGuide";
import { ItemModal } from "./components/ItemModal";
import {
  Search,
  Plus,
  RefreshCw,
  FileDown,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  Database,
  ArrowUpDown,
  Filter,
  Check,
  AlertCircle
} from "lucide-react";

export default function App() {
  // State variables
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<StockChangeLog[]>([]);
  
  // Filtering & searching states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "low" | "out">("all");
  const [sorting, setSorting] = useState<"name" | "stock-asc" | "stock-desc">("name");

  // Modal open states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState("");

  // Feedback states
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [localTime, setLocalTime] = useState("");

  // Drag and drop CSV upload
  const [csvDragActive, setCsvDragActive] = useState(false);

  // Load state from localStorage on boot
  useEffect(() => {
    const savedInventory = localStorage.getItem("8twelve_inventory");
    const savedLogs = localStorage.getItem("8twelve_logs");

    if (savedInventory) {
      try {
        setItems(JSON.parse(savedInventory));
      } catch (err) {
        console.error("Failed to parse historical inventory", err);
        const defaults = loadDefaultInventory();
        setItems(defaults);
        localStorage.setItem("8twelve_inventory", JSON.stringify(defaults));
      }
    } else {
      const defaults = loadDefaultInventory();
      setItems(defaults);
      localStorage.setItem("8twelve_inventory", JSON.stringify(defaults));
    }

    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (err) {
        console.error("Failed to parse historical logs", err);
        setLogs([]);
      }
    } else {
      // Pre-seed 3 beautiful logs
      const seedLogs: StockChangeLog[] = [
        {
          id: "log_seed_1",
          articleCode: "022788",
          articleName: "7E Grilled Mushroom & C. Sausage 80g",
          prevStock: 0,
          newStock: 25,
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          remarks: "Initial stock intake from logistics",
          operator: "System Admin"
        },
        {
          id: "log_seed_2",
          articleCode: "020928",
          articleName: "Kit Kat Original 2 Finger 17g",
          prevStock: 10,
          newStock: 45,
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          remarks: "Weekly pallet delivery, fresh supply",
          operator: "Weng (Stock lead)"
        },
        {
          id: "log_seed_3",
          articleCode: "210443",
          articleName: "Oatside Barista Blend 1L",
          prevStock: 30,
          newStock: 8,
          timestamp: new Date(Date.now() - 600000).toISOString(),
          remarks: "Disposed expired milk cartons",
          operator: "Azlina (Floor staff)"
        }
      ];
      setLogs(seedLogs);
      localStorage.setItem("8twelve_logs", JSON.stringify(seedLogs));
    }
  }, []);

  // Set real clock for convenience shop vibe
  useEffect(() => {
    const updateTime = () => {
      const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLocalTime(t);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger feedback banner helper
  const triggerAlert = (text: string, type: "success" | "info" = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4500);
  };

  // Reset to original CSV default stock
  const handleResetToDefaults = () => {
    if (confirm("Restore original 8Twelve default inventory sample? Current adjustments and logs will be archived.")) {
      const defaults = loadDefaultInventory();
      setItems(defaults);
      localStorage.setItem("8twelve_inventory", JSON.stringify(defaults));

      const resetLog: StockChangeLog = {
        id: `log_reset_${Date.now()}`,
        articleCode: "ALL",
        articleName: "System Inventory Reset",
        prevStock: 0,
        newStock: defaults.length,
        timestamp: new Date().toISOString(),
        remarks: "Reverted catalog data back to raw CSV specifications.",
        operator: "Manager"
      };
      
      const newLogs = [resetLog];
      setLogs(newLogs);
      localStorage.setItem("8twelve_logs", JSON.stringify(newLogs));
      
      // Clean query filters
      setSearchQuery("");
      setSelectedCategory("");
      setSelectedLocation("");
      setActiveFilter("all");
      
      triggerAlert("Successfully restored default 8Twelve catalog sample!", "info");
    }
  };

  // Add Item or Edit registration
  const handleSaveItem = (savedItem: InventoryItem, logRemarks?: string) => {
    const existingIndex = items.findIndex(item => item.articleCode === savedItem.articleCode);
    let updatedList: InventoryItem[] = [];
    let oldStock = 0;
    let oldName = savedItem.name;

    if (existingIndex > -1) {
      // Edit
      oldStock = items[existingIndex].stock;
      oldName = items[existingIndex].name;
      updatedList = [...items];
      updatedList[existingIndex] = savedItem;
      triggerAlert(`Updated "${savedItem.name}" parameters successfully!`);
    } else {
      // Add Brand New
      updatedList = [savedItem, ...items];
      triggerAlert(`Brand new item "${savedItem.name}" enrolled!`);
    }

    setItems(updatedList);
    localStorage.setItem("8twelve_inventory", JSON.stringify(updatedList));

    // Append to Transaction Logs if stock difference exists or remarks provided
    if (oldStock !== savedItem.stock || logRemarks) {
      const newLog: StockChangeLog = {
        id: `log_${Date.now()}_${savedItem.articleCode}`,
        articleCode: savedItem.articleCode,
        articleName: savedItem.name,
        prevStock: oldStock,
        newStock: savedItem.stock,
        timestamp: new Date().toISOString(),
        remarks: logRemarks || (existingIndex > -1 ? "Attributes/Stock parameters edited" : "New item enrollment"),
        operator: "Desk Staff"
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      localStorage.setItem("8twelve_logs", JSON.stringify(updatedLogs));
    }
  };

  // Delete product listing
  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find(item => item.id === id);
    if (!itemToDelete) return;

    const filtered = items.filter(item => item.id !== id);
    setItems(filtered);
    localStorage.setItem("8twelve_inventory", JSON.stringify(filtered));

    // Record deletion log
    const deletionLog: StockChangeLog = {
      id: `log_del_${Date.now()}_${itemToDelete.articleCode}`,
      articleCode: itemToDelete.articleCode,
      articleName: itemToDelete.name,
      prevStock: itemToDelete.stock,
      newStock: 0,
      timestamp: new Date().toISOString(),
      remarks: "Item de-registered / Deleted from shelves",
      operator: "Supervisor"
    };

    const updatedLogs = [deletionLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("8twelve_logs", JSON.stringify(updatedLogs));
    triggerAlert(`Deregistered "${itemToDelete.name}" from active catalog`, "info");
  };

  // Easy inline stock updates from ProductCard
  const handleQuickStockUpdate = (item: InventoryItem, newStock: number, remarks: string) => {
    const updatedList = items.map(curr => {
      if (curr.id === item.id) {
        return { ...curr, stock: newStock };
      }
      return curr;
    });

    setItems(updatedList);
    localStorage.setItem("8twelve_inventory", JSON.stringify(updatedList));

    // Add change log immediately
    const adjustmentLog: StockChangeLog = {
      id: `log_quick_${Date.now()}_${item.articleCode}`,
      articleCode: item.articleCode,
      articleName: item.name,
      prevStock: item.stock,
      newStock: newStock,
      timestamp: new Date().toISOString(),
      remarks: remarks || "Quick Stock count sync",
      operator: "Aisle Hand"
    };

    const updatedLogs = [adjustmentLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("8twelve_logs", JSON.stringify(updatedLogs));
  };

  // Scanner actions: Item was found
  const handleScannerFoundItem = (item: InventoryItem) => {
    // Scroll directly to item, highlight it, and focus search specifically on it!
    setSearchQuery(item.barcode);
    triggerAlert(`Barcode located! Filtered layout for "${item.name}"`, "success");
  };

  // Barcode scanned is not in our catalog: trigger register wizard
  const handleScannerNotFound = (barcode: string) => {
    setPrefilledBarcode(barcode);
    setEditingItem(null);
    setIsModalOpen(true);
    triggerAlert(`Barcode "${barcode}" not in database. Opening enrollment form!`, "info");
  };

  // Clear change logs
  const handleClearLogs = () => {
    setLogs([]);
    localStorage.removeItem("8twelve_logs");
    triggerAlert("Cleared stock adjustment ledger memory.", "info");
  };

  // Custom bulk CSV Importer
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      let importedCount = 0;
      let duplicateIgnored = 0;
      const newItems: InventoryItem[] = [...items];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCSVLine(line);
        if (parts.length < 5) continue;

        const [articleCode, name, remark, location, barcode] = parts;
        if (!articleCode || !name || !barcode) continue;

        // Check if article code already exists - skip or merge
        const exists = newItems.some(curr => curr.articleCode === articleCode || curr.barcode === barcode);
        if (exists) {
          duplicateIgnored++;
          continue;
        }

        // Determine basic categorizing based on name or locations loaded
        let category = "General Inventory";
        if (location.toLowerCase().includes("beku") || location.toLowerCase().includes("freezer")) {
          category = "Frozen Foods";
        } else if (location.toLowerCase().includes("sejuk") || location.toLowerCase().includes("chiller")) {
          category = "Chor Chilled Drinks";
        } else if (name.toLowerCase().includes("syrup") || name.toLowerCase().includes("sauce")) {
          category = "Sauces & Syrups";
        }

        newItems.unshift({
          id: articleCode,
          articleCode,
          name,
          aliases: [],
          remark: remark || "",
          location: location || "Aisle F1 - General Shelf",
          barcode,
          category,
          stock: 12, // default starting intake
        });
        importedCount++;
      }

      setItems(newItems);
      localStorage.setItem("8twelve_inventory", JSON.stringify(newItems));

      // Log import run
      const importLog: StockChangeLog = {
        id: `log_import_${Date.now()}`,
        articleCode: "BULK",
        articleName: `Bulk Import run [${importedCount} products]`,
        prevStock: 0,
        newStock: importedCount,
        timestamp: new Date().toISOString(),
        remarks: `Imported customized inventory sheets. Ignored ${duplicateIgnored} duplicate entries.`,
        operator: "Logistics Admin"
      };
      setLogs([importLog, ...logs]);
      localStorage.setItem("8twelve_logs", JSON.stringify([importLog, ...logs]));

      triggerAlert(`Successfully imported ${importedCount} items! Ignored ${duplicateIgnored} duplicates.`, "success");
    };
    reader.readAsText(file);
  };

  // Drag over handlers for main body imports
  const handleCsvDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setCsvDragActive(true);
    } else if (e.type === "dragleave") {
      setCsvDragActive(false);
    }
  };

  const handleCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        const dummyEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleCsvImport(dummyEvent);
      } else {
        alert("Please drop a valid .csv spreadsheet file!");
      }
    }
  };

  // Export entire inventory list to CSV
  const handleExportInventoryCSV = () => {
    if (items.length === 0) {
      alert("No inventory records found.");
      return;
    }

    const headers = ["Article Code", "Article Name", "Remark", "Location", "Barcode", "Current Stock", "Category", "Aliases"];
    const csvContent = [
      headers.join(","),
      ...items.map((item) => {
        return [
          `"${item.articleCode}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.remark.replace(/"/g, '""')}"`,
          `"${item.location.replace(/"/g, '""')}"`,
          `"${item.barcode}"`,
          item.stock,
          `"${item.category}"`,
          `"${item.aliases ? item.aliases.join(", ") : ""}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `8Twelve_Store_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert("CSV catalog compiled and downloaded!", "info");
  };

  // Filter & Sort core engine
  const filteredProducts = items.filter((item) => {
    // Search filter: acts on Name, Article Code, Barcode, or list of Aliases
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.articleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    // Category filter
    if (selectedCategory && item.category !== selectedCategory) return false;

    // Location filter
    if (selectedLocation && item.location !== selectedLocation) return false;

    // Stock alert state filters
    if (activeFilter === "out") {
      return item.stock === 0;
    } else if (activeFilter === "low") {
      return item.stock > 0 && item.stock <= 10;
    }

    return true;
  });

  // Apply sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sorting === "name") {
      return a.name.localeCompare(b.name);
    } else if (sorting === "stock-asc") {
      return a.stock - b.stock;
    } else if (sorting === "stock-desc") {
      return b.stock - a.stock;
    }
    return 0;
  });

  // Distinct category list computed dynamically
  const uniqueCategories = Array.from(new Set(items.map((i) => i.category)));
  // Distinct location list computed dynamically
  const uniqueLocations = Array.from(new Set(items.map((i) => i.location)));

  return (
    <div
      onDragEnter={handleCsvDrag}
      onDragOver={handleCsvDrag}
      onDragLeave={handleCsvDrag}
      onDrop={handleCsvDrop}
      className={`min-h-screen bg-zinc-100 text-zinc-900 flex flex-col font-sans transition-all duration-300 ${
        csvDragActive ? "ring-8 ring-emerald-500/40 ring-inset bg-emerald-50/25" : ""
      }`}
    >
      
      {/* 8TWELVE BRAND HEADER (Bento Theme Style) */}
      <header id="brand-header" className="mx-4 mt-6 md:mx-8 md:mt-8 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm sticky top-4 z-40 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title with "8TWELVE" Bento Style */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-xs select-none">
              8
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-800 leading-none">
                8TWELVE <span className="text-emerald-600 font-normal">STOCK</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Live Store Database &bull; LocalSync Active
              </p>
            </div>
          </div>

          {/* Center clock widget */}
          <div className="flex items-center bg-zinc-50 border border-zinc-200/50 rounded-xl px-4 py-1.5 text-zinc-600 h-9">
            <Clock className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-800 mr-2">{localTime}</span>
            <div className="h-3 w-[1px] bg-zinc-200 mr-2" />
            <Calendar className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
            <span className="text-[11px] font-semibold text-zinc-500 whitespace-nowrap">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            
            {/* Custom CSV upload button */}
            <label className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-200/60 transition-all active:scale-95">
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Sheet CSV</span>
              <input
                id="bulk-csv-uploader"
                type="file"
                accept=".csv"
                onChange={handleCsvImport}
                className="hidden"
              />
            </label>

            {/* Quick register product trigger */}
            <button
              id="btn-add-new-item"
              onClick={() => {
                setEditingItem(null);
                setPrefilledBarcode("");
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-zinc-900 text-white h-9 px-4 rounded-xl font-medium text-xs hover:bg-zinc-800 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>
      </header>

      {/* DRAG AND DROP SHEETS BANNER OVERLAY */}
      {csvDragActive && (
        <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-xs flex items-center justify-center z-50 pointer-events-none no-print">
          <div className="bg-white/95 p-8 rounded-3xl border-3 border-dashed border-emerald-500 text-center max-w-sm shadow-2xl animate-bounce">
            <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-900 text-md">Import 8Twelve Inventory List</h4>
            <p className="text-xs text-slate-500 mt-1">
              Release the CSV database spreadsheet file to merge items directly into the system logs.
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Floating alerts toasts */}
        {alertMessage && (
          <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-3 shadow-xl flex items-center gap-2 text-xs font-semibold max-w-md mx-auto animate-fade-in relative overflow-hidden">
            <div className={`w-1.5 absolute left-0 top-0 bottom-0 ${alertMessage.type === "success" ? "bg-emerald-500" : "bg-blue-500"}`} />
            <span className="p-1 rounded bg-slate-800 shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <p className="pl-1 text-slate-200">{alertMessage.text}</p>
          </div>
        )}

        {/* DASHBOARD GRID COUNTER */}
        <StatsGrid
          items={items}
          selectedCategory={selectedCategory}
          selectedLocation={selectedLocation}
          activeFilter={activeFilter}
          setActiveFilter={(f) => {
            setActiveFilter(f);
            triggerAlert(`Filtered workspace to show ${f === "all" ? "complete lists" : f === "low" ? "low stock goods" : "depleted storage shelf items"}.`, "info");
          }}
          onResetToDefault={handleResetToDefaults}
        />

        {/* CORE BARCODE SEARCH SCAN ENGINE */}
        <ScannerSimulator
          items={items}
          onItemScanned={handleScannerFoundItem}
          onBarcodeNotFound={handleScannerNotFound}
        />

        {/* SPLIT LAYOUT (SIDE FILTERS + PRODUCTS GRID) */}
        <div id="dashboard-catalog-section" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* LEFT SIDEBAR CONTROLS: Location map, quick category filters */}
          <div className="space-y-6 no-print lg:sticky lg:top-20">

            {/* Interactive map visualization */}
            <AisleVisualGuide
              selectedCategory={selectedCategory}
              selectedLocation={selectedLocation}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                triggerAlert(cat ? `Category focus: ${cat}` : "Cleared category selector", "info");
              }}
              onSelectLocation={(loc) => {
                setSelectedLocation(loc);
                triggerAlert(loc ? `Location focus: ${loc}` : "Cleared location selector", "info");
              }}
            />

            {/* General Filter values box (Bento Style) */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Detailed Facets
                </h3>
                {(selectedCategory || selectedLocation || activeFilter !== "all" || searchQuery) && (
                  <button
                    id="btn-clear-all-criteria"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedLocation("");
                      setActiveFilter("all");
                      setSearchQuery("");
                      triggerAlert("Reset workspace search filters.", "info");
                    }}
                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Category selector */}
              <div>
                <label htmlFor="category-select-facet" className="block text-xs font-bold text-zinc-600 mb-1">
                  Shelf Category
                </label>
                <select
                  id="category-select-facet"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    triggerAlert(e.target.value ? `Filtering category: ${e.target.value}` : "Cleared category", "info");
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                >
                  <option value="">All Categories ({uniqueCategories.length})</option>
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Selector */}
              <div>
                <label htmlFor="location-select-facet" className="block text-xs font-bold text-zinc-600 mb-1">
                  Rack & Aisle Area
                </label>
                <select
                  id="location-select-facet"
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    triggerAlert(e.target.value ? `Filtering location coord: ${e.target.value}` : "Cleared zone", "info");
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                >
                  <option value="">All Aisle Areas ({uniqueLocations.length})</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT PANELS: Product Grid Lists */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Search/Sort bar card (Bento Style) */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 no-print">
              
              {/* Keyboard Search input with Instant Aliases parser */}
              <div className="relative w-full sm:max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="catalog-text-search"
                  type="text"
                  placeholder="Query article code, barcode, title, or aliases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-205 rounded-xl pl-9 pr-4 py-2 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-800"
                />
              </div>

              {/* Utilities control count */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                <span className="font-bold text-zinc-700 shrink-0 font-mono bg-zinc-100 px-2.5 py-1 rounded-md text-[11px]">
                  Showing {sortedProducts.length} items
                </span>

                <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block" />

                {/* Sorter selection */}
                <div className="flex items-center gap-1 shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <select
                    id="catalog-sorting"
                    value={sorting}
                    onChange={(e) => setSorting(e.target.value as any)}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 text-xs text-zinc-700 font-mono focus:outline-none"
                  >
                    <option value="name">Name A-Z</option>
                    <option value="stock-asc">Stock (Low &rarr; High)</option>
                    <option value="stock-desc">Stock (High &rarr; Low)</option>
                  </select>
                </div>

                {/* Direct CSV download list */}
                <button
                  id="btn-export-inventory-catalog"
                  onClick={handleExportInventoryCSV}
                  title="Export currently filtered items as CSV"
                  className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-650 hover:text-zinc-800 transition-colors"
                >
                  <FileDown className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            </div>

            {/* Filter tags header */}
            {(selectedCategory || selectedLocation || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Selected Facets:</span>
                {selectedCategory && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 py-0.5 px-2 rounded-full flex items-center gap-1">
                    Cat: {selectedCategory}
                    <button onClick={() => setSelectedCategory("")} className="hover:text-rose-600 font-bold ml-1">&times;</button>
                  </span>
                )}
                {selectedLocation && (
                  <span className="text-[11px] bg-blue-50 text-blue-800 border border-blue-200 py-0.5 px-2 rounded-full flex items-center gap-1">
                    Aisle: {selectedLocation}
                    <button onClick={() => setSelectedLocation("")} className="hover:text-rose-600 font-bold ml-1">&times;</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="text-[11px] bg-slate-100 text-slate-800 border border-slate-200 py-0.5 px-2 rounded-full flex items-center gap-1 font-mono">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery("")} className="hover:text-rose-600 font-bold ml-1">&times;</button>
                  </span>
                )}
              </div>
            )}

            {/* Products container grid list */}
            {sortedProducts.length > 0 ? (
              <div id="products-grid-catalog" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    item={p}
                    onEdit={(item) => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteItem}
                    onQuickStockUpdate={handleQuickStockUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-6">
                <div className="mx-auto w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 rounded-full mb-3">
                  <AlertCircle className="w-5 h-5 text-slate-500" />
                </div>
                <h4 className="font-bold text-slate-800">No items found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  We couldn't locate any products matching your search terms or aisles choice. Check your query spelling, or click "Plus Enroll Item" to register a new one.
                </p>
                <button
                  id="btn-clear-search-fallback"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("");
                    setSelectedLocation("");
                    setActiveFilter("all");
                  }}
                  className="mt-4 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM AUDIT & REPORT LEDGER SECTION */}
        <div id="ledger-logs-section" className="no-print pt-4">
          <LogViewer
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        </div>
      </main>

      {/* FOOTER ACCENTS (Bento Style) */}
      <footer id="developer-footer" className="bg-white border border-zinc-200 rounded-2xl py-6 mx-4 md:mx-8 mb-8 text-center text-xs text-zinc-400 no-print shadow-sm">
        <p className="font-bold text-zinc-700">&copy; 8Twelve Convenience Store &bull; Mobile Inventory Intelligence Suite</p>
        <p className="opacity-75 mt-1 font-mono text-[10px]">
          Designed with Outfit typography pairings, solid Zinc grids, and LocalStorage durable state buffers.
        </p>
      </footer>

      {/* RETAILER ITEM modal */}
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        prefilledBarcode={prefilledBarcode}
      />
    </div>
  );
}
