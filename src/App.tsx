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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  AlertCircle,
  RotateCcw,
  Edit2,
  X,
  History,
  Printer,
  Copy
} from "lucide-react";

// Deterministic CSS Barcode Generator Component
function BarcodeVisual({ value }: { value: string }) {
  if (!value) return <span className="text-zinc-450">-</span>;
  
  // Calculate deterministic hash from characters
  const hash = value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 12345;
  const linePattern: { type: "bar" | "gap"; width: number }[] = [];
  
  // Build 26 lines of deterministic alternating dark-light combinations
  for (let i = 0; i < 26; i++) {
    const isBar = i % 2 === 0;
    if (isBar) {
      const width = ((hash + i * i * 3) % 3) + 1; // 1px to 3px
      linePattern.push({ type: "bar", width });
    } else {
      const width = ((hash + i * 7) % 2) + 1; // 1px to 2px
      linePattern.push({ type: "gap", width });
    }
  }

  return (
    <div className="flex flex-col items-center justify-center select-none py-1">
      {/* Visual Stripe Patterns */}
      <div className="flex items-stretch h-6 bg-white px-1">
        {linePattern.map((item, idx) => (
          <div
            key={idx}
            className={`h-full ${item.type === "bar" ? "bg-zinc-950" : "bg-transparent"}`}
            style={{ width: `${item.width}px` }}
          />
        ))}
      </div>
      {/* Text Number Label underneath */}
      <span className="text-[9px] font-mono font-black text-zinc-700 tracking-[0.12em] mt-0.5 print:text-[8px]">
        {value}
      </span>
    </div>
  );
}

// Helper to convert OKLCH color strings to standard RGB/RGBA elements so html2canvas doesn't crash on Tailwind 4 styles
function replaceOklchInString(str: string): string {
  if (!str || !str.includes("oklch")) return str;
  
  return str.replace(/oklch\s*\(([^)]+)\)/gi, (match, inner) => {
    try {
      const parts = inner.trim().split(/[\s,/\x20]+/);
      const filteredParts = parts.filter(p => p.length > 0);
      if (filteredParts.length < 3) return "#ffffff";
      
      const lStr = filteredParts[0];
      const cStr = filteredParts[1];
      const hStr = filteredParts[2];
      const alphaStr = filteredParts[3];

      const l = lStr.endsWith("%") ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const c = parseFloat(cStr);
      const h = parseFloat(hStr.replace("deg", ""));
      
      let a = 1;
      if (alphaStr) {
        if (alphaStr.endsWith("%")) {
          a = parseFloat(alphaStr) / 100;
        } else {
          a = parseFloat(alphaStr);
        }
      }

      // Convert OKLCH to standard OKLab coordinates
      const hRad = (h * Math.PI) / 180;
      const L = l;
      const a_ = c * Math.cos(hRad);
      const b_ = c * Math.sin(hRad);

      // OKLab to LMS
      const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
      const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
      const s_ = L - 0.0894841775 * a_ - 1.2914855480 * b_;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      // LMS to XYZ
      const x = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const y = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const z = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

      // XYZ to standard sRGB
      let r = +3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
      let g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
      let b = +0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

      // sRGB Gamma correction
      r = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - 0.055;
      g = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1 / 2.4) - 0.055;
      b = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1 / 2.4) - 0.055;

      const R = Math.max(0, Math.min(255, Math.round(r * 255)));
      const G = Math.max(0, Math.min(255, Math.round(g * 255)));
      const B = Math.max(0, Math.min(255, Math.round(b * 255)));

      return a === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${a})`;
    } catch (e) {
      return "#ffffff";
    }
  });
}

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
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState("");

  // Feedback states
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [localTime, setLocalTime] = useState("");

  // Drag and drop CSV upload
  const [csvDragActive, setCsvDragActive] = useState(false);

  // Audit Mode states
  const [isAuditMode, setIsAuditMode] = useState<boolean>(() => {
    return localStorage.getItem("8twelve_audit_mode") === "true";
  });
  const [recentlyAuditedIds, setRecentlyAuditedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("8twelve_recently_audited");
    return saved ? JSON.parse(saved) : [];
  });
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [selectedAuditItem, setSelectedAuditItem] = useState<InventoryItem | null>(null);
  const [auditNewStock, setAuditNewStock] = useState<number | "">("");
  const [auditRemarks, setAuditRemarks] = useState("Audited Stock Adjustments");

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

    const itemWithUpdates: InventoryItem = {
      ...savedItem,
      lastUpdatedTime: new Date().toISOString(),
      lastUpdatedStock: savedItem.stock
    };

    if (existingIndex > -1) {
      // Edit
      oldStock = items[existingIndex].stock;
      oldName = items[existingIndex].name;
      updatedList = [...items];
      updatedList[existingIndex] = itemWithUpdates;
      triggerAlert(`Updated "${savedItem.name}" parameters successfully!`);
    } else {
      // Add Brand New
      updatedList = [itemWithUpdates, ...items];
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
        return { 
          ...curr, 
          stock: newStock,
          lastUpdatedTime: new Date().toISOString(),
          lastUpdatedStock: newStock
        };
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

  // Audit Mode stock update, persistent history, and state cleanser
  const handleAuditStockUpdate = (item: InventoryItem, newStockValue: number, remarksToLog: string) => {
    const updatedList = items.map(curr => {
      if (curr.id === item.id) {
        return { 
          ...curr, 
          stock: newStockValue,
          lastUpdatedTime: new Date().toISOString(),
          lastUpdatedStock: newStockValue
        };
      }
      return curr;
    });

    setItems(updatedList);
    localStorage.setItem("8twelve_inventory", JSON.stringify(updatedList));

    const adjustmentLog: StockChangeLog = {
      id: `log_audit_${Date.now()}_${item.articleCode}`,
      articleCode: item.articleCode,
      articleName: item.name,
      prevStock: item.stock,
      newStock: newStockValue,
      timestamp: new Date().toISOString(),
      remarks: remarksToLog || "Audited Stock Adjustments",
      operator: "Audit Operator"
    };

    const updatedLogs = [adjustmentLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem("8twelve_logs", JSON.stringify(updatedLogs));

    // Save and bring to top of list
    const updatedRecents = [item.id, ...recentlyAuditedIds.filter(id => id !== item.id)];
    setRecentlyAuditedIds(updatedRecents);
    localStorage.setItem("8twelve_recently_audited", JSON.stringify(updatedRecents));

    triggerAlert(`Audited stock count for "${item.name}" updated to ${newStockValue}!`, "success");

    // Clear state inputs ready for next scan
    setSelectedAuditItem(null);
    setAuditSearchQuery("");
    setAuditNewStock("");
    setAuditRemarks("Audited Stock Adjustments");
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

    const headers = ["Article Code", "Article Name", "Remark", "Location", "Barcode", "Current Stock", "Category", "Aliases", "Last Updated Time", "Last Updated Stock"];
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
          `"${item.aliases ? item.aliases.join(", ") : ""}"`,
          `"${item.lastUpdatedTime || ""}"`,
          item.lastUpdatedStock !== undefined ? item.lastUpdatedStock : ""
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

  // Export entire inventory list to Landscape A4 PDF
  const handleExportLandscapePDF = async () => {
    try {
      const totalPages = displayPages.length;
      triggerAlert(`Compiling ${totalPages} Landscape A4 pages (12 items per page)...`, "info");

      // Create jsPDF in Landscape A4 mode
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = 297;
      const pdfHeight = 210;

      for (let index = 0; index < totalPages; index++) {
        const element = document.getElementById(`printable-page-block-${index}`);
        if (!element) {
          console.warn(`Page element printable-page-block-${index} not found on screen.`);
          continue;
        }

        // Temporarily adjust styles on the page element for optimal PDF canvas ratio
        const originalStyle = element.style.cssText;
        element.style.width = "1120px"; // Optimally sized for A4 Landscape aspect ratio
        element.style.maxWidth = "none";
        element.style.boxShadow = "none";
        element.style.borderRadius = "0px";

        const canvas = await html2canvas(element, {
          scale: 2.2, // Ultra crisp vector and barcode scaling
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          onclone: (clonedDoc) => {
            // Replace OKLCH strings inside stylesheet <style> tags so html2canvas doesn't crash on standard colors
            clonedDoc.querySelectorAll("style").forEach((styleEl) => {
              if (styleEl.textContent) {
                styleEl.textContent = replaceOklchInString(styleEl.textContent);
              }
            });

            // Also scan and replace inline styles of cloned elements
            const pageBlock = clonedDoc.getElementById(`printable-page-block-${index}`);
            if (pageBlock) {
              pageBlock.querySelectorAll("*").forEach((el) => {
                const htmlEl = el as HTMLElement;
                if (htmlEl.style && htmlEl.style.cssText) {
                  htmlEl.style.cssText = replaceOklchInString(htmlEl.style.cssText);
                }
              });
            }
          }
        });

        // Restore original container style to maintain screen styling
        element.style.cssText = originalStyle;

        const imgData = canvas.toDataURL("image/jpeg", 0.98);

        if (index > 0) {
          pdf.addPage();
        }

        // Add exact high-res image representing landscape layout to PDF page
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`8Twelve_Store_Inventory_Landscape_${new Date().toISOString().slice(0, 10)}.pdf`);
      triggerAlert("Landscape A4 PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF download crashed:", err);
      triggerAlert("PDF compile failed. Please reload or export via CSV instead.", "info");
    }
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

  // matched target finder for step 1 in Audit Mode
  const matchedAuditItems = auditSearchQuery.trim() === ""
    ? []
    : items.filter(item =>
        item.name.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        item.articleCode.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        item.barcode.toLowerCase().includes(auditSearchQuery.toLowerCase())
      ).slice(0, 5);

  const CHUNK_SIZE = 12;
  const chunkedPages: InventoryItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunkedPages.push(items.slice(i, i + CHUNK_SIZE));
  }
  const displayPages = chunkedPages.length > 0 ? chunkedPages : [[]];

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
            
            {/* Download A4 Landscape PDF Button */}
            <button
              id="top-btn-print-all"
              onClick={() => {
                setIsPrintPreviewOpen(true);
                triggerAlert("Opening master A4 stock sheet download station...", "info");
              }}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 h-9 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Compile inventory lists as A4 Landscape PDF report"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-600" />
              <span>A4 Landscape PDF</span>
            </button>

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

        <div className="no-print space-y-6">
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

          {/* AUDIT MODE MASTER CONTROLLER SLIDER */}
          <div className="bg-zinc-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm no-print">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-all duration-300 ${isAuditMode ? "bg-emerald-550 text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">Active Shelf Audit & Stock Adjustment Mode</h2>
                <p className="text-xs text-zinc-405">
                  {isAuditMode 
                   ? "Optimized linear workflow checklist: Scan/search, set stocks, track recent runs." 
                   : "Standard Catalog View: Multi-shelf exploration, bulk uploads, aisles maps."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] sm:text-xs font-mono font-bold whitespace-nowrap ${isAuditMode ? "text-emerald-400" : "text-zinc-400"}`}>
                {isAuditMode ? "⚡ AUDIT ACTIVE" : "👁️ STANDARD VIEW"}
              </span>
              <button
                id="btn-toggle-audit-mode"
                onClick={() => {
                  const newValue = !isAuditMode;
                  setIsAuditMode(newValue);
                  localStorage.setItem("8twelve_audit_mode", String(newValue));
                  triggerAlert(newValue ? "Enabled linear Audit Mode dashboard." : "Returned to standard explorer dashboard.", "info");
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isAuditMode ? "bg-emerald-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isAuditMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {isAuditMode ? (
            /* AUDIT WORKSPACE STATION WITH STEPS */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: THE LINEAR AUDIT STEPS (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-zinc-100 pb-4">
                    <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                      Step 1: Scan or Search Product
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Perform active shelving lookup by entering name description, ID codes, barcode, or scanning.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Lookup Input */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        id="audit-lookup-search"
                        type="text"
                        placeholder="Type article code, title, or barcode..."
                        value={auditSearchQuery}
                        onChange={(e) => {
                          setAuditSearchQuery(e.target.value);
                          // Auto match exact check
                          const cleanQuery = e.target.value.trim().toLowerCase();
                          if (cleanQuery) {
                            const exactMatch = items.find(item => 
                              item.barcode === cleanQuery || 
                              item.articleCode.toLowerCase() === cleanQuery
                            );
                            if (exactMatch) {
                              setSelectedAuditItem(exactMatch);
                              setAuditNewStock(exactMatch.stock);
                              triggerAlert(`Matched exact product: "${exactMatch.name}"`, "success");
                            }
                          }
                        }}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                      />
                      {auditSearchQuery && (
                        <button
                          onClick={() => {
                            setAuditSearchQuery("");
                            setSelectedAuditItem(null);
                            setAuditNewStock("");
                          }}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 hover:text-zinc-650"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Results */}
                    {matchedAuditItems.length > 0 && !selectedAuditItem && (
                      <div className="border border-zinc-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                        {matchedAuditItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedAuditItem(item);
                              setAuditSearchQuery(item.name);
                              setAuditNewStock(item.stock);
                              triggerAlert(`Loaded active audit target: "${item.name}"`, "info");
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-emerald-50/45 transition-colors flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-zinc-800 truncate">{item.name}</p>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                                Code: #{item.articleCode} &bull; Barcode: {item.barcode}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded ${
                              item.stock <= 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            } shrink-0`}>
                              {item.stock} left
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Quick helper selection */}
                    {!selectedAuditItem && (
                      <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/50">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <span>📝</span> Suggestive active shelf targets
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {items.slice(0, 4).map(itm => (
                            <button
                              key={itm.id}
                              onClick={() => {
                                setSelectedAuditItem(itm);
                                setAuditSearchQuery(itm.name);
                                setAuditNewStock(itm.stock);
                              }}
                              className="px-2 py-1 bg-white border border-zinc-250 hover:border-emerald-500 rounded-lg text-[10px] text-zinc-650 hover:text-emerald-700 transition-all font-mono"
                            >
                              Code {itm.articleCode} ({itm.stock} left)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2 PANEL */}
                {selectedAuditItem ? (
                  <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-zinc-100 pb-4">
                      <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                        Step 2: Update stock value
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Input the verified physical counted stock quantity below.
                      </p>
                    </div>

                    {/* Preview details card container */}
                    <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[9px] font-bold uppercase py-0.5 px-1.5 bg-zinc-200 rounded text-zinc-600">
                          ID Code: #{selectedAuditItem.articleCode}
                        </span>
                        <h4 className="font-bold text-zinc-800 text-sm mt-1 truncate" title={selectedAuditItem.name}>
                          {selectedAuditItem.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                          Zone: {selectedAuditItem.location} &bull; Barcode: {selectedAuditItem.barcode}
                        </p>
                      </div>
                      <div className="bg-white py-1 px-3 border border-zinc-200 rounded-lg text-center shrink-0 min-w-[90px]">
                        <span className="text-[9px] font-mono text-zinc-400 block uppercase">Book Stock</span>
                        <span className="text-xl font-bold font-mono text-zinc-800">{selectedAuditItem.stock}</span>
                      </div>
                    </div>

                    {/* Form input details */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="audit-new-stock-input" className="block text-xs font-bold text-zinc-700 mb-1">
                          Counted shelf stock count quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = typeof auditNewStock === "number" ? auditNewStock : selectedAuditItem.stock;
                              setAuditNewStock(Math.max(0, curr - 1));
                            }}
                            className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 active:scale-95 border border-zinc-300 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-all"
                          >
                            -1
                          </button>
                          <input
                            id="audit-new-stock-input"
                            type="number"
                            min="0"
                            placeholder="Count quantity..."
                            value={auditNewStock}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAuditNewStock(val === "" ? "" : Number(val));
                            }}
                            className="flex-1 text-center bg-zinc-50 border border-zinc-300 py-2 rounded-xl text-md font-black font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const curr = typeof auditNewStock === "number" ? auditNewStock : selectedAuditItem.stock;
                              setAuditNewStock(curr + 1);
                            }}
                            className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 active:scale-95 border border-zinc-350 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-all"
                          >
                            +1
                          </button>
                        </div>
                      </div>

                      {/* Presets quantity row */}
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1">
                          Quick Presets Values
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setAuditNewStock(0)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                          >
                            0 (Empty)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = typeof auditNewStock === "number" ? auditNewStock : selectedAuditItem.stock;
                              setAuditNewStock(curr + 5);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-250 rounded-lg transition"
                          >
                            +5 Restock
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const curr = typeof auditNewStock === "number" ? auditNewStock : selectedAuditItem.stock;
                              setAuditNewStock(curr + 10);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-250 rounded-lg transition"
                          >
                            +10 Refill
                          </button>
                          <button
                            type="button"
                            onClick={() => setAuditNewStock(selectedAuditItem.stock)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-300 rounded-lg transition"
                          >
                            Reset ({selectedAuditItem.stock})
                          </button>
                        </div>
                      </div>

                      {/* Remarks block */}
                      <div>
                        <label htmlFor="audit-remarks-form" className="block text-[11px] font-bold text-zinc-500 mb-1">
                          Ledger Entry Comment / discrepancy reason
                        </label>
                        <input
                          id="audit-remarks-form"
                          type="text"
                          value={auditRemarks}
                          onChange={(e) => setAuditRemarks(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs"
                          placeholder="Specify reasons..."
                        />
                      </div>

                      {/* Save stock buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          id="btn-cancel-active-audit"
                          type="button"
                          onClick={() => {
                            setSelectedAuditItem(null);
                            setAuditSearchQuery("");
                            setAuditNewStock("");
                          }}
                          className="px-4 py-2 border border-zinc-200 rounded-xl text-xs hover:bg-zinc-50 font-semibold text-zinc-650 shrink-0"
                        >
                          Clear Selection
                        </button>
                        <button
                          id="btn-save-audit-run"
                          type="button"
                          disabled={auditNewStock === ""}
                          onClick={() => {
                            if (auditNewStock === "") return;
                            handleAuditStockUpdate(selectedAuditItem, Number(auditNewStock), auditRemarks);
                          }}
                          className="flex-1 text-center font-bold bg-zinc-900 hover:bg-zinc-800 text-white py-2 px-4 rounded-xl disabled:opacity-50 text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Save stock & add to Recent list
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-3xl p-8 text-center text-zinc-400 flex flex-col items-center justify-center min-h-[180px]">
                    <Database className="w-6 h-6 text-zinc-300 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-zinc-650 font-sans">Pending product audit selection</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">Please search or pick a product from step 1 above to begin stock verification.</p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: RECENTLY AUDITED SESSION ACTIVITY LIST (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-sans">
                      <History className="w-4 h-4 text-emerald-600 shrink-0" />
                      Step 3: Recent Activity (Click to edit)
                    </h3>
                    {recentlyAuditedIds.length > 0 && (
                      <button
                        id="btn-clear-recent-audits"
                        onClick={() => {
                          if (confirm("Clear recent session list? This won't affect stored physical inventory counts.")) {
                            setRecentlyAuditedIds([]);
                            localStorage.removeItem("8twelve_recently_audited");
                            triggerAlert("Cleared recent audit list.", "info");
                          }
                        }}
                        className="text-[10px] text-zinc-400 hover:text-rose-600 font-bold"
                      >
                        Clear List
                      </button>
                    )}
                  </div>

                  {recentlyAuditedIds.length > 0 ? (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                      {recentlyAuditedIds.map((id) => {
                        const auditedItem = items.find(it => it.id === id);
                        if (!auditedItem) return null;
                        return (
                          <div
                            key={id}
                            className="p-3 bg-zinc-50/70 border border-zinc-150 rounded-2xl hover:bg-emerald-50/10 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-zinc-800 truncate" title={auditedItem.name}>
                                {auditedItem.name}
                              </h4>
                              <div className="text-[9px] text-zinc-400 font-mono mt-0.5 flex flex-wrap items-center gap-1">
                                <span>Code: #{auditedItem.articleCode}</span>
                                <span>&bull;</span>
                                <span className="font-extrabold text-emerald-800 font-sans">
                                  Counted Value: {auditedItem.stock}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                id={`btn-edit-recent-${auditedItem.articleCode}`}
                                onClick={() => {
                                  setSelectedAuditItem(auditedItem);
                                  setAuditNewStock(auditedItem.stock);
                                  setAuditRemarks("Adjusted recent audit stock parameter");
                                  setAuditSearchQuery(auditedItem.name);
                                  triggerAlert(`Edit recent item "${auditedItem.name}"`, "info");
                                }}
                                className="p-1.5 bg-white border border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 rounded-lg text-zinc-500 transition-colors flex items-center gap-1 font-bold text-[9px]"
                                title="Edit again"
                              >
                                <Edit2 className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                id={`btn-delete-recent-${auditedItem.articleCode}`}
                                onClick={() => {
                                  const updated = recentlyAuditedIds.filter(rid => rid !== id);
                                  setRecentlyAuditedIds(updated);
                                  localStorage.setItem("8twelve_recently_audited", JSON.stringify(updated));
                                  triggerAlert(`Removed "${auditedItem.name}" from session list.`, "info");
                                }}
                                className="p-1.5 bg-white border border-zinc-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-zinc-400 transition-colors"
                                title="Remove row"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-zinc-50 border border-zinc-100 rounded-2xl">
                      <p className="text-[11px] text-zinc-400 font-medium">No recent audits registered.</p>
                      <p className="text-[9px] text-zinc-400 opacity-75 mt-0.5">Scanned and updated item records will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
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
        </>
        )}
        </div>

        {/* BOTTOM AUDIT & REPORT LEDGER SECTION */}
        <div id="ledger-logs-section" className="pt-4">
          <LogViewer
            logs={logs}
            onClearLogs={handleClearLogs}
            items={items}
          />
        </div>

        {/* PRINT ONLY: COMPLETE STOCK SHEET WITH LAST UPDATED DETAILS */}
        <div className="hidden print:block print-only print-container bg-white text-zinc-950 p-6 font-sans">
          {displayPages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className="printable-page-block border-b border-zinc-200 pb-8 mb-8 print:break-after-page" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
              <div className="border-b-2 border-zinc-900 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
                      8Twelve Store - Master Stock Inventory Sheet
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1">
                      Comprehensive audit ledger record containing item codes, barcodes, stocks level, and last updated event details.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-zinc-100 text-zinc-805 px-2.5 py-1 rounded font-mono font-bold tracking-wider inline-block">
                      PAGE {pageIdx + 1} OF {displayPages.length}
                    </span>
                    <p className="text-xs font-mono font-bold text-zinc-700 mt-1.5">{localTime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-200">
                  <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-150">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Total Product Listings</span>
                    <span className="text-xl font-bold font-mono text-zinc-900">{items.length} skus</span>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-150">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Accumulated Gross Stock Counter</span>
                    <span className="text-xl font-bold font-mono text-zinc-900 text-emerald-800">
                      {items.reduce((sum, i) => sum + i.stock, 0)} units
                    </span>
                  </div>
                  <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-150">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Aisles coordinates and areas</span>
                    <span className="text-xl font-bold font-mono text-zinc-900">
                      {new Set(items.map(i => i.location)).size} Shelves Zones
                    </span>
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-zinc-300 text-zinc-700 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 pr-2">Code</th>
                    <th className="py-2.5">Product Identification</th>
                    <th className="py-2.5">Barcode No</th>
                    <th className="py-2.5">Shelf Location</th>
                    <th className="py-2.5">Aisle Category</th>
                    <th className="py-2.5 text-right font-black">Stock In Hand</th>
                    <th className="py-2.5 pl-4 text-center">Last Update Timestamp</th>
                    <th className="py-2.5 text-right">Last Audit Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {pageItems.map((i) => (
                    <tr key={i.id} className="hover:bg-zinc-50/50">
                      <td className="py-3 font-mono font-bold text-zinc-800">#{i.articleCode}</td>
                      <td className="py-3 pr-2">
                        <p className="font-bold text-zinc-900 text-sm leading-tight">{i.name}</p>
                        {i.remark && <p className="text-[10px] text-zinc-405 italic mt-0.5">{i.remark}</p>}
                      </td>
                      <td className="py-3">
                        <BarcodeVisual value={i.barcode} />
                      </td>
                      <td className="py-3 text-zinc-600 font-mono text-[11px]">{i.location}</td>
                      <td className="py-3 text-zinc-600">{i.category}</td>
                      <td className="py-3 text-right font-mono font-black text-sm">{i.stock}</td>
                      <td className="py-3 pl-4 text-center text-zinc-500 font-mono text-[10px]">
                        {i.lastUpdatedTime 
                          ? new Date(i.lastUpdatedTime).toLocaleString() 
                          : "— (No session audit)"
                        }
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-zinc-650">
                        {i.lastUpdatedStock !== undefined ? i.lastUpdatedStock : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-12 border-t-2 border-zinc-200 pt-6 text-[10px] text-zinc-400 flex justify-between items-center">
                <p>8Twelve Stores &bull; Automated Digital Shelf Audit &copy; {new Date().getFullYear()}</p>
                <p className="font-mono">Checked and Verified by: ________________________</p>
              </div>
            </div>
          ))}
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

      {/* ON-SCREEN INTERACTIVE PRINT PREVIEW MODAL */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto no-print animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200">
            
            {/* Modal sticky top banner with tools */}
            <div className="bg-zinc-900 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <Printer className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">8Twelve Stock Print & Verification Station</h3>
                  <p className="text-[10px] text-zinc-400">Review full store stock inventory counts, history stamps, and barcodes sheet on screen.</p>
                </div>
              </div>

              {/* Functional controls row */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    handleExportInventoryCSV();
                    triggerAlert("Downloaded inventory stock CSV file.", "success");
                  }}
                  className="flex items-center gap-1 bg-zinc-805 hover:bg-zinc-700 text-zinc-100 py-1.5 px-3 rounded-lg text-xs font-semibold border border-zinc-750 transition cursor-pointer"
                  title="Download raw spreadsheet data"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                
                <button
                  onClick={() => {
                    const csvRows = [
                      ["Article Code", "Product Name", "Barcode", "Zone", "Current Stock", "Last Updated Time", "Last Stock"].join("\t"),
                      ...items.map(i => [
                        `#${i.articleCode}`,
                        i.name,
                        i.barcode,
                        i.location,
                        i.stock,
                        i.lastUpdatedTime ? new Date(i.lastUpdatedTime).toLocaleString() : "N/A",
                        i.lastUpdatedStock !== undefined ? i.lastUpdatedStock : ""
                      ].join("\t"))
                    ].join("\n");
                    navigator.clipboard.writeText(csvRows);
                    triggerAlert("Copied inventory table values to clipboard in Excel-ready format!", "success");
                  }}
                  className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-705 text-zinc-100 py-1.5 px-3 rounded-lg text-xs font-semibold border border-zinc-700 transition cursor-pointer"
                  title="Copy formatted cells"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy for Excel</span>
                </button>

                <button
                  onClick={handleExportLandscapePDF}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-4 rounded-lg text-xs font-black transition-all active:scale-95 shadow-md cursor-pointer animate-pulse"
                  title="Render and download high-quality landscape A4 PDF with layout"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download Landscape A4 PDF</span>
                </button>

                {/* Option to still use secondary print dialogue if desired */}
                <button
                  onClick={() => {
                    triggerAlert("Triggering system printer service window...", "info");
                    window.print();
                  }}
                  className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 px-3 rounded-lg text-xs font-semibold hover:text-white transition cursor-pointer"
                  title="Print current sheet"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Paper</span>
                </button>

                <button
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Close preview dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note on sandbox iframe limits */}
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-[11px] text-amber-900 font-medium">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span><strong>Developer Notice:</strong> If browser blocks the frame print pop-up, copy the Dev URL above into a new browser tab to print directly.</span>
              </span>
              <button 
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  triggerAlert("Developer App URL copied to clipboard!", "success");
                }}
                className="text-[10px] text-amber-700 underline hover:text-amber-900 font-bold ml-4 cursor-pointer"
              >
                Copy URL
              </button>
            </div>

            {/* Scrollable Printable Paper Sheet Container */}
            <div className="p-6 md:p-8 overflow-y-auto bg-zinc-100 flex-1 space-y-8 max-h-[70vh]">
              {displayPages.map((pageItems, index) => (
                <div 
                  key={index}
                  id={`printable-page-block-${index}`} 
                  className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 max-w-4xl mx-auto font-sans text-zinc-800"
                >
                  <div className="border-b-2 border-zinc-900 pb-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <h4 className="text-xl font-extrabold tracking-tight text-zinc-900 uppercase">
                          8Twelve Convenience Store &bull; Inventory Sheet
                        </h4>
                        <p className="text-xs text-zinc-405 mt-1">
                          Active Stock Balance Audit Ledger (Barcodes & Updated Time logs)
                        </p>
                      </div>
                      <div className="text-left sm:text-right font-mono text-xs">
                        <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] tracking-wide px-2 py-0.5 rounded uppercase">
                          PAGE {index + 1} OF {displayPages.length}
                        </span>
                        <p className="text-zinc-650 mt-1 font-bold">Time: {localTime}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-200">
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        <span className="text-[9px] text-zinc-400 block uppercase font-bold">Total Products Checked</span>
                        <span className="text-base font-bold font-mono text-zinc-900">{items.length} positions</span>
                      </div>
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        <span className="text-[9px] text-zinc-400 block uppercase font-bold">Total Units Counted</span>
                        <span className="text-base font-bold font-mono text-emerald-700">
                          {items.reduce((sum, item) => sum + item.stock, 0)} units
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        <span className="text-[9px] text-zinc-400 block uppercase font-bold">Store Locations Map</span>
                        <span className="text-base font-bold font-mono text-zinc-900">
                          {new Set(items.map(item => item.location)).size} Zones
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main scrollable table page */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-350 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="py-2 pr-2">Code</th>
                          <th className="py-2">Product Name</th>
                          <th className="py-2">Barcode</th>
                          <th className="py-2">Zone</th>
                          <th className="py-2 text-right">Physical Stock</th>
                          <th className="py-2 pl-4 text-center">Last Updated On</th>
                          <th className="py-2 text-right">Last Audit Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150">
                        {pageItems.map((i) => (
                          <tr key={i.id} className="hover:bg-zinc-50">
                            <td className="py-2.5 font-mono font-bold text-zinc-650">#{i.articleCode}</td>
                            <td className="py-2.5 font-semibold text-zinc-900 pr-2">{i.name}</td>
                            <td className="py-2.5">
                              <BarcodeVisual value={i.barcode} />
                            </td>
                            <td className="py-2.5 text-zinc-650 text-[11px] font-mono">{i.location}</td>
                            <td className="py-2.5 text-right font-mono font-black text-xs text-zinc-850">
                              <span className={`px-1.5 py-0.5 rounded ${i.stock <= 10 ? "bg-amber-100 text-amber-900 font-bold" : ""}`}>
                                {i.stock}
                              </span>
                            </td>
                            <td className="py-2.5 pl-4 text-center text-zinc-500 font-mono text-[10px]">
                              {i.lastUpdatedTime 
                                ? new Date(i.lastUpdatedTime).toLocaleString() 
                                : "—"
                              }
                            </td>
                            <td className="py-2.5 text-right font-mono text-zinc-450">
                              {i.lastUpdatedStock !== undefined ? i.lastUpdatedStock : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Verified block details */}
                  <div className="mt-8 pt-4 border-t border-zinc-200 text-[10px] text-zinc-400 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <p>8Twelve Stores &bull; Master Inventory Sheet &bull; Generates custom sheets automatically on audit actions.</p>
                    <p className="font-mono font-bold text-zinc-650">Verify operator: ____________________</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
