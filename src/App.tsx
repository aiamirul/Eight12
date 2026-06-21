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
import { Html5Qrcode } from "html5-qrcode";
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
  Menu,
  Eye,
  EyeOff,
  History,
  Printer,
  Copy,
  Scan,
  Camera,
  Volume2,
  VolumeX
} from "lucide-react";

// Deterministic standard EAN-13 / UPC-A Barcode Generator Component
function BarcodeVisual({ value }: { value: string }) {
  if (!value) return <span className="text-zinc-450">-</span>;

  // Normalize string value to numeric digits. Convert letters/symbols to deterministic digits
  let cleanValue = value.replace(/\s+/g, "");
  let digits = "";
  for (let i = 0; i < cleanValue.length; i++) {
    const char = cleanValue[i];
    if (/[0-9]/.test(char)) {
      digits += char;
    } else {
      digits += String(char.charCodeAt(0) % 10);
    }
  }

  // Ensure precisely 13 digits (standard EAN-13 sizing format)
  if (digits.length < 13) {
    while (digits.length < 13) {
      digits += "0";
    }
  } else if (digits.length > 13) {
    digits = digits.slice(0, 13);
  }

  // Standard EAN-13 Digit Codes
  const L_CODE = [
    "0001101", "0011001", "0010011", "0111101", "0100011",
    "0110001", "0101111", "0111011", "0110111", "0001011"
  ];
  
  const G_CODE = [
    "0100111", "0110011", "0011011", "0100001", "0011101",
    "0111001", "0000101", "0010001", "0001001", "0010111"
  ];
  
  const R_CODE = [
    "1110010", "1100110", "1101100", "1000010", "1011100",
    "1001110", "1010000", "1000100", "1001000", "1110100"
  ];

  const PARITY_TABLE = [
    ["L", "L", "L", "L", "L", "L"], // 0
    ["L", "L", "G", "L", "G", "G"], // 1
    ["L", "L", "G", "G", "L", "G"], // 2
    ["L", "L", "G", "G", "G", "L"], // 3
    ["L", "G", "L", "L", "G", "G"], // 4
    ["L", "G", "G", "L", "L", "G"], // 5
    ["L", "G", "G", "G", "L", "L"], // 6
    ["L", "G", "L", "G", "L", "G"], // 7
    ["L", "G", "L", "G", "G", "L"], // 8
    ["L", "G", "G", "L", "G", "L"]  // 9
  ];

  const firstDigit = parseInt(digits[0], 10) || 0;
  const parity = PARITY_TABLE[firstDigit];

  // Construct standard 95-module barcode sequence ("1" = black bar, "0" = white gap)
  let modules = "";

  // Start Guard Pattern: 101
  modules += "101";

  // Left-hand digits (6 digits, each 7 modules)
  for (let i = 1; i <= 6; i++) {
    const digitValue = parseInt(digits[i], 10) || 0;
    const type = parity[i - 1];
    modules += type === "L" ? L_CODE[digitValue] : G_CODE[digitValue];
  }

  // Middle Guard Pattern: 01010
  modules += "01010";

  // Right-hand digits (6 digits, each 7 modules)
  for (let i = 7; i <= 12; i++) {
    const digitValue = parseInt(digits[i], 10) || 0;
    modules += R_CODE[digitValue];
  }

  // End Guard Pattern: 101
  modules += "101";

  return (
    <div className="flex flex-col items-center justify-center select-none py-1 w-32 md:w-36 mx-auto">
      {/* 95 module layout rendered into exact same-width container */}
      <div className="flex items-stretch w-full h-[26px] bg-white border border-zinc-200 p-0.5 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)] justify-between">
        {modules.split("").map((moduleValue, idx) => {
          // Identify if it's a guard module so we can optionally style it or make it slightly longer
          const isGuard = idx < 3 || (idx >= 45 && idx < 50) || idx >= 92;
          return (
            <div
              key={idx}
              className={`flex-grow h-full ${
                moduleValue === "1" ? "bg-zinc-950" : "bg-transparent"
              } ${isGuard ? "opacity-100" : "opacity-90"}`}
              style={{
                // Explicitly use clean sub-pixel layout so elements are perfectly equivalent
                flexBasis: "0%",
              }}
            />
          );
        })}
      </div>
      {/* Human readable label centered with first digit on the far left, standard barcode aesthetic */}
      <div className="flex items-center justify-between w-full px-1 mt-1 text-[8px] font-mono font-bold text-zinc-600 print:text-[7.5px]">
        <span>{digits[0]}</span>
        <span className="tracking-[0.14em] font-black text-zinc-800">{digits.slice(1, 7)}</span>
        <span className="tracking-[0.14em] font-black text-zinc-800">{digits.slice(7, 13)}</span>
      </div>
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
  const userEmail = "docshabplt@gmail.com";

  // Drag and drop CSV upload
  const [csvDragActive, setCsvDragActive] = useState(false);

  // Mobile navigation expansion state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Threshold controls visibility state
  const [isThresholdMenuOpen, setIsThresholdMenuOpen] = useState(false);

  // Show next 5 pending audit items inline state
  const [showNext5, setShowNext5] = useState(false);

  // Show full inactive/ignored items dialog state
  const [showInactiveModal, setShowInactiveModal] = useState(false);

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
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [camerasList, setCamerasList] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [auditRemarks, setAuditRemarks] = useState("Audited Stock Adjustments");

  // Step 1 collapse level
  const [isStep1Collapsed, setIsStep1Collapsed] = useState(false);

  // Audit hours threshold window state (24-240 hrs)
  const [auditHoursWindow, setAuditHoursWindow] = useState<number>(() => {
    const saved = localStorage.getItem("8twelve_audit_hours_window");
    return saved ? Math.min(240, Math.max(24, parseInt(saved, 10))) : 48;
  });

  const handleAuditHoursChange = (val: number) => {
    const newVal = Math.min(240, Math.max(24, val));
    setAuditHoursWindow(newVal);
    localStorage.setItem("8twelve_audit_hours_window", String(newVal));
  };

  // Beep sound volume and mute settings
  const [beepVolume, setBeepVolume] = useState<number>(() => {
    const saved = localStorage.getItem("8twelve_beep_volume");
    return saved !== null ? Number(saved) : 60;
  });
  const [beepMuted, setBeepMuted] = useState<boolean>(() => {
    return localStorage.getItem("8twelve_beep_muted") === "true";
  });

  const playBeepSoundAt = (currentVolume: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      
      gainNode.gain.setValueAtTime((currentVolume / 100) * 0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio Context beep failed", e);
    }
  };

  const playBeep = () => {
    if (beepMuted || beepVolume === 0) return;
    playBeepSoundAt(beepVolume);
  };

  const selectProductForAudit = (item: InventoryItem, alertText?: string) => {
    setSelectedAuditItem(item);
    setAuditSearchQuery(item.name);
    setAuditNewStock(item.stock);
    setIsCameraScanning(false);
    setIsStep1Collapsed(true); // Auto collapse Step 1
    playBeep(); // Beep chime!
    
    if (alertText) {
      triggerAlert(alertText, "success");
    } else {
      triggerAlert(`Loaded target: "${item.name}"`, "success");
    }

    // Smooth focus on step 2 stock input
    setTimeout(() => {
      const inputEl = document.getElementById("audit-new-stock-input");
      if (inputEl) {
        inputEl.focus();
        (inputEl as HTMLInputElement).select();
      }
    }, 150);
  };

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

  // Camera scanning support for Audit Mode
  useEffect(() => {
    if (isCameraScanning) {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 0) {
          setCamerasList(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("environment") ||
            device.label.toLowerCase().includes("rear")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          triggerAlert("No camera devices found.", "info");
          setIsCameraScanning(false);
        }
      }).catch(err => {
        console.warn("Error getting cameras:", err);
        triggerAlert("Camera permission denied or camera list inaccessible.", "info");
        setIsCameraScanning(false);
      });
    } else {
      setCamerasList([]);
      setSelectedCameraId("");
    }
  }, [isCameraScanning]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isCameraScanning && selectedCameraId) {
      const container = document.getElementById("audit-camera-scanner-view");
      if (container) {
        html5QrCode = new Html5Qrcode("audit-camera-scanner-view");
        html5QrCode.start(
          selectedCameraId,
          { 
            fps: 15, 
            qrbox: (width, height) => {
              // Create a nice landscape scanning rectangle banner
              const w = Math.min(width * 0.8, 280);
              const h = Math.min(height * 0.4, 130);
              return { width: w, height: h };
            }
          },
          (decodedText) => {
            const cleanCode = decodedText.trim();
            setAuditSearchQuery(cleanCode);
            
            const cleanQuery = cleanCode.toLowerCase();
            const exactMatch = items.find(item => 
              item.barcode === cleanQuery || 
              item.articleCode.toLowerCase() === cleanQuery ||
              item.barcode.replace(/\s+/g, "") === cleanQuery.replace(/\s+/g, "")
            );

            if (exactMatch) {
              selectProductForAudit(exactMatch, `Barcode Matched: "${exactMatch.name}"`);
            } else {
              setIsCameraScanning(false);
              setPrefilledBarcode(cleanCode);
              setEditingItem(null);
              setIsModalOpen(true);
              triggerAlert(`Barcode "${cleanCode}" not in database. Opening enrollment form!`, "info");
            }
          },
          () => {
            // Quiet
          }
        ).catch(err => {
          console.error("Failed to start Html5Qrcode:", err);
        });
      }
    }

    return () => {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode?.clear();
          }).catch(err => console.error("Error stopping scanner:", err));
        }
      }
    };
  }, [isCameraScanning, selectedCameraId, items]);

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

  // Toggle inactive status (ignore item)
  const handleToggleInactive = (id: string, name: string) => {
    const updatedList = items.map(curr => {
      if (curr.id === id) {
        const nextState = !curr.inactive;
        // Trigger alert depending on high-level activity
        triggerAlert(
          nextState 
            ? `"${name}" is now ignored. It won't count toward Continuous Shelf Verification.` 
            : `"${name}" re-activated on main shelf inventory!`,
          "info"
        );
        return {
          ...curr,
          inactive: nextState
        };
      }
      return curr;
    });
    setItems(updatedList);
    localStorage.setItem("8twelve_inventory", JSON.stringify(updatedList));
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
    setIsStep1Collapsed(false);
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
      const totalPages = chunkedPages.length + 1;
      triggerAlert(`Compiling ${totalPages} Landscape A4 pages (Summary Cover + ${chunkedPages.length} item list pages)...`, "info");

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

  // Active shelf items vs inactive/ignored ones
  const activeItems = items.filter(item => !item.inactive);
  const inactiveItems = items.filter(item => !!item.inactive);

  // Filter & Sort core engine
  const filteredProducts = activeItems.filter((item) => {
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

  // Filter items updated in the configured audit window
  const auditedItemsInWindow = activeItems.filter(item => {
    if (!item.lastUpdatedTime) return false;
    const timeMs = new Date(item.lastUpdatedTime).getTime();
    const thresholdMs = Date.now() - (auditHoursWindow * 60 * 60 * 1000);
    return timeMs >= thresholdMs;
  });

  const auditCompletionPercentage = activeItems.length > 0 
    ? Math.round((auditedItemsInWindow.length / activeItems.length) * 100) 
    : 0;

  // Active items that are older than threshold or never updated
  const pendingAudits = activeItems.filter(item => {
    if (!item.lastUpdatedTime) return true;
    const timeMs = new Date(item.lastUpdatedTime).getTime();
    const thresholdMs = Date.now() - (auditHoursWindow * 60 * 60 * 1000);
    return timeMs < thresholdMs;
  });

  const next5ToAudit = [...pendingAudits]
    .sort((a, b) => {
      if (!a.lastUpdatedTime && !b.lastUpdatedTime) return 0;
      if (!a.lastUpdatedTime) return -1;
      if (!b.lastUpdatedTime) return 1;
      return new Date(a.lastUpdatedTime).getTime() - new Date(b.lastUpdatedTime).getTime();
    })
    .slice(0, 5);

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
      
      {/* 8TWELVE BRAND HEADER (Bento Theme Style - Compact with Mobile Collapsible Menu) */}
      <header id="brand-header" className="mx-4 mt-4 md:mx-8 md:mt-8 bg-white border border-zinc-200 rounded-2xl p-3 md:p-4 shadow-sm sticky top-4 z-40 no-print">
        <div className="max-w-7xl mx-auto">
          {/* Top Main Row - Compact & Single-line on mobile */}
          <div className="flex items-center justify-between">
            {/* Logo Brand Title with "8TWELVE" */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg md:text-xl shadow-xs select-none">
                8
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-black tracking-tight text-zinc-800 leading-none">
                  8TWELVE <span className="text-emerald-600 font-normal">STOCK</span>
                </h1>
                <p className="text-[9px] md:text-[10px] text-zinc-400 font-mono hidden sm:flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Live Store Database &bull; LocalSync Active
                </p>
              </div>
            </div>

            {/* Right Controls - Mobile Menu Toggle Button & Desktop-Only Items */}
            <div className="flex items-center gap-2">
              {/* Clock - Visible on Desktop or Tablet */}
              <div className="hidden md:flex items-center bg-zinc-50 border border-zinc-200/50 rounded-xl px-4 py-1.5 text-zinc-600 h-9">
                <Clock className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                <span className="text-xs font-mono font-bold tracking-widest text-zinc-800 mr-2">{localTime}</span>
                <div className="h-3 w-[1px] bg-zinc-200 mr-2" />
                <Calendar className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-500 whitespace-nowrap">
                  {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Mobile Menu Action Trigger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex items-center justify-center p-2 rounded-xl text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 border border-zinc-200 active:scale-95 transition-all cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-zinc-800" /> : <Menu className="w-5 h-5 text-zinc-800" />}
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE MENU BLOCK FOR MOBILE / DIRECT INLINE DISPLAY ON DESKTOP */}
          <div className={`${isMobileMenuOpen ? "flex mt-3 pt-3 border-t border-zinc-100" : "hidden"} md:flex md:mt-0 md:pt-0 md:border-0 flex-col md:flex-row md:items-center md:justify-between`}>
            
            {/* Subtitle/Status only visible inside expanded phone menu */}
            <div className="md:hidden flex items-center justify-between text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-150 mb-3 w-full">
              <span className="font-mono text-zinc-500 flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                LocalSync DB: Active
              </span>
              <span className="font-mono text-zinc-650 flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {localTime}
              </span>
            </div>

            {/* Header Actions Grid */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-2 shrink-0 w-full mt-1 md:mt-0">
              
              {/* Shelf Audit Mode switch */}
              <div className="flex items-center justify-between md:justify-start gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 h-9 transition-all text-xs font-bold leading-none">
                <span className={`text-[10px] font-mono tracking-tight ${isAuditMode ? "text-emerald-600 font-extrabold animate-pulse" : "text-zinc-500"}`}>
                  {isAuditMode ? "⚡ AUDIT ACTIVE" : "👁️ CATALOG VIEW"}
                </span>
                <button
                  id="header-toggle-audit-mode"
                  type="button"
                  onClick={() => {
                    const newValue = !isAuditMode;
                    setIsAuditMode(newValue);
                    localStorage.setItem("8twelve_audit_mode", String(newValue));
                    triggerAlert(newValue ? "Enabled linear Audit Mode dashboard." : "Returned to standard explorer dashboard.", "info");
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
                    isAuditMode ? "bg-emerald-600" : "bg-zinc-300"
                  }`}
                  title="Toggle Shelf Stock Audit Mode"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-250 ease-in-out ${
                      isAuditMode ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Download A4 Landscape PDF Button */}
              <button
                id="top-btn-print-all"
                type="button"
                onClick={() => {
                  setIsPrintPreviewOpen(true);
                  setIsMobileMenuOpen(false);
                  triggerAlert("Opening master A4 stock sheet download station...", "info");
                }}
                className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 h-9 px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Compile inventory lists as A4 Landscape PDF report"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>A4 Landscape PDF</span>
              </button>

              {/* Custom CSV upload button */}
              <label className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 h-9 px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200/60 transition-all active:scale-95 text-center">
                <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Import Sheet CSV</span>
                <input
                  id="bulk-csv-uploader"
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    handleCsvImport(e);
                    setIsMobileMenuOpen(false);
                  }}
                  className="hidden"
                />
              </label>

              {/* Quick register product trigger */}
              <button
                id="btn-add-new-item"
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setPrefilledBarcode("");
                  setIsModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-zinc-900 text-white h-9 px-4 rounded-xl font-medium text-xs hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add Item</span>
              </button>
            </div>
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

          {/* VISUAL SHELF AUDIT PROGRESS CARD WITH THRESHOLD SETTING */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs space-y-2 no-print">
            <div 
              className="flex flex-row items-center justify-between gap-2 cursor-pointer select-none hover:bg-zinc-50/70 p-1.5 rounded-xl transition-all"
              onClick={() => setShowNext5(!showNext5)}
              title="Click to view pending shelf items"
            >
              <div className="flex flex-wrap items-center gap-x-2 text-zinc-800">
                <span className="text-xs font-black tracking-tight font-sans inline-flex items-center gap-1">
                  Continuous Shelf Verification
                  <span className="text-[10px] text-zinc-400">
                    {showNext5 ? "▲ Hide Pending List" : "▼ Show Pending List"}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-zinc-450 bg-zinc-100 rounded px-1.5 py-0.5 border border-zinc-200/40 select-none" onClick={(e) => e.stopPropagation()}>
                  {auditHoursWindow}h Window
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="text-right flex items-center gap-1.5 cursor-pointer hover:opacity-85"
                  onClick={() => setShowNext5(!showNext5)}
                >
                  <span className="text-xs font-bold text-zinc-950">
                    {auditedItemsInWindow.length}
                  </span>
                  <span className="text-[10px] text-zinc-450">
                    /{activeItems.length} SKUs
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded ml-0.5">
                    {auditCompletionPercentage}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsThresholdMenuOpen(!isThresholdMenuOpen)}
                  className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all active:scale-95 inline-flex items-center justify-center cursor-pointer select-none ${
                    isThresholdMenuOpen
                      ? "bg-zinc-950 border-zinc-950 text-white"
                      : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-700"
                  }`}
                  title="Configure Audit Window"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Flat visual progress bar */}
            <div 
              className="relative w-full h-2 bg-zinc-100 rounded-full border border-zinc-200/60 overflow-hidden shadow-inner font-sans cursor-pointer"
              onClick={() => setShowNext5(!showNext5)}
              title="Click to view pending shelf items"
            >
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${auditCompletionPercentage}%` }}
              />
              <div className="absolute inset-y-0 left-0 right-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
            </div>

            {/* Threshold controls block */}
            {isThresholdMenuOpen && (
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl space-y-3.5 animate-fade-in text-xs font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-650 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    Configure Audit Run Window:
                  </span>
                  {/* Slider hours display with quick minus/plus buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={auditHoursWindow <= 24}
                      onClick={() => handleAuditHoursChange(auditHoursWindow - 12)}
                      className="w-10 h-7 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-bold font-mono inline-flex items-center justify-center transition-all select-none disabled:opacity-40 disabled:pointer-events-none"
                      title="Decrease by 12 hours"
                    >
                      -12h
                    </button>
                    <span className="text-xs font-mono font-black py-1 px-2.5 bg-zinc-200 text-zinc-800 rounded-lg min-w-[55px] text-center">
                      {auditHoursWindow} hrs
                    </span>
                    <button
                      type="button"
                      disabled={auditHoursWindow >= 240}
                      onClick={() => handleAuditHoursChange(auditHoursWindow + 12)}
                      className="w-10 h-7 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-xs font-bold font-mono inline-flex items-center justify-center transition-all select-none disabled:opacity-40 disabled:pointer-events-none"
                      title="Increase by 12 hours"
                    >
                      +12h
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="24"
                    max="240"
                    step="1"
                    value={auditHoursWindow}
                    onChange={(e) => handleAuditHoursChange(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-0"
                  />
                  <div className="flex justify-between text-[9px] font-mono font-bold text-zinc-405 select-none">
                    <span>Min: 24h (1d)</span>
                    <span>Standard: 48h (2d)</span>
                    <span>Max: 240h (10d)</span>
                  </div>
                </div>

                {/* Quick select presets */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase font-black tracking-wide mr-1 select-none">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleAuditHoursChange(24)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all ${
                      auditHoursWindow === 24 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-650'
                    }`}
                  >
                    24h (1d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAuditHoursChange(48)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all ${
                      auditHoursWindow === 48 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                    }`}
                  >
                    48h (2d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAuditHoursChange(120)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all ${
                      auditHoursWindow === 120 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                    }`}
                  >
                    120h (5d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAuditHoursChange(240)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md border transition-all ${
                      auditHoursWindow === 240 
                        ? 'bg-zinc-900 border-zinc-900 text-white' 
                        : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-700'
                    }`}
                  >
                    240h (10d)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* NEXT 5 PENDING ITEMS SECTION LINKED TO SHELF VERIFICATION */}
          {showNext5 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in text-xs font-sans no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-150 pb-2.5 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="uppercase text-[10px] tracking-wider text-zinc-500 font-mono font-bold">Recommended Queue</span>
                  <span className="text-zinc-700">&bull; Next 5 SKUs Needing Verification:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInactiveModal(true)}
                    className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 hover:border-amber-300 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 active:scale-95"
                    title="Open list of ignored inactive items"
                  >
                    <EyeOff className="w-3 h-3 text-amber-600" />
                    <span>Ignored List ({inactiveItems.length})</span>
                  </button>
                  <span className="text-[10px] text-zinc-400 font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                    {pendingAudits.length} pending total
                  </span>
                </div>
              </div>

              {next5ToAudit.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {next5ToAudit.map((item, idx) => {
                    const lastAuditString = item.lastUpdatedTime 
                      ? new Date(item.lastUpdatedTime).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "Never Audited";

                    return (
                      <div key={item.id} className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 first:pt-0 last:pb-0 animate-fade-in">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-zinc-100 text-zinc-650 py-0.5 px-1.5 rounded-md text-[10px] font-extrabold font-mono border border-zinc-200">
                              #{idx + 1}
                            </span>
                            <strong className="text-zinc-900 font-black text-xs">{item.name}</strong>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/50 block sm:inline-block">
                              #{item.articleCode}
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 text-[10px] py-0.5 px-2 rounded-full font-bold">
                              {item.location}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-500 mt-1.5 font-mono">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              Last Audit: <strong className="text-zinc-700">{lastAuditString}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>
                              Shelf Stock: <strong className="text-zinc-800 font-bold">{item.stock} units</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAuditItem(item);
                              if (!isAuditMode) {
                                setIsAuditMode(true);
                                localStorage.setItem("8twelve_audit_mode", "true");
                              }
                              setIsStep1Collapsed(true);
                              triggerAlert(`Loaded "${item.name}" into target scanner simulator`, "success");
                              setTimeout(() => {
                                document.getElementById("btn-expand-step1")?.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10.5px] rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center gap-1"
                            title="Open in manual scanner console below"
                          >
                            Scan/Verify
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playBeepSoundAt(beepVolume);
                              handleQuickStockUpdate(item, item.stock, "Verified Correct (Continuous Shelf Verification)");
                              triggerAlert(`Shelf quantity of "${item.name}" verified correct.`, "success");
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center gap-1"
                            title="Verify current count is accurate"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            Correct ({item.stock})
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleInactive(item.id, item.name)}
                            className="px-2 py-1.5 bg-zinc-50 hover:bg-amber-50 border border-zinc-200 hover:border-amber-300 text-zinc-500 hover:text-amber-800 font-bold text-[10.5px] rounded-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
                            title="Flag as ignored/inactive (removes from verification targets)"
                          >
                            <EyeOff className="w-3.5 h-3.5 shrink-0" />
                            Ignore
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
                  <p className="text-zinc-600 font-bold text-xs font-sans">All active products on shelves are freshly audited!</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Continuous verification target is 100% complete for the {auditHoursWindow}h window.</p>
                </div>
              )}
            </div>
          )}

          {/* INACTIVE/IGNORED ITEMS LIST MODAL OVERLAY */}
          {showInactiveModal && (
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in" onClick={() => setShowInactiveModal(false)}>
              <div 
                className="bg-white rounded-3xl border border-zinc-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-zinc-900 text-white px-5 py-4 flex items-center justify-between border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                      <EyeOff className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider font-sans">Ignored &amp; Inactive Shelf Products</h4>
                      <p className="text-[9px] text-zinc-400 font-mono font-medium">Excluded from Continuous Verification requirements</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInactiveModal(false)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Marking products as item-inactive shields them from auditing percentages and standard search/shelf catalog renders. Use this status for seasonal products, temporary stock-outs, or non-tracked sundries.
                  </p>

                  {inactiveItems.length > 0 ? (
                    <div className="divide-y divide-zinc-150 border border-zinc-200/65 rounded-2xl overflow-hidden bg-zinc-50/10">
                      {inactiveItems.map((item) => (
                        <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-zinc-50/30 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <strong className="text-zinc-800 font-bold text-xs">{item.name}</strong>
                              <span className="text-[9px] font-mono font-bold bg-zinc-100 text-zinc-500 px-1 border border-zinc-200/50 rounded">
                                #{item.articleCode}
                              </span>
                              <span className="text-[9px] bg-zinc-150 text-zinc-550 py-0.5 px-1.5 rounded uppercase font-bold tracking-wide">
                                {item.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-2 font-mono">
                              <span>Location: <strong className="text-zinc-600 font-semibold">{item.location}</strong></span>
                              <span>&bull;</span>
                              <span>Stock: <strong className="text-zinc-750 font-bold">{item.stock} qty</strong></span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleInactive(item.id, item.name)}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-mono font-bold text-[10px] rounded-lg transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto"
                            title="Restore item to active list"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            Re-activate Item
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                      <Eye className="w-8 h-8 text-zinc-350 mx-auto mb-2" />
                      <h4 className="font-bold text-zinc-750 text-xs">No Deactivated Products Found</h4>
                      <p className="text-[10px] text-zinc-400 max-w-xs mx-auto mt-0.5">
                        All currently cataloged items are tracking active shelf verification protocols.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-zinc-50 border-t border-zinc-150 flex justify-end font-sans">
                  <button
                    type="button"
                    onClick={() => setShowInactiveModal(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all font-sans cursor-pointer"
                  >
                    Close Panel
                  </button>
                </div>
              </div>
            </div>
          )}



          {isAuditMode ? (
            /* AUDIT WORKSPACE STATION WITH STEPS */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: THE LINEAR AUDIT STEPS (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
                  {selectedAuditItem && isStep1Collapsed ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/60 animate-fade-in no-print">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-mono font-bold">✓</span>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 font-sans">Step 1: Completed</span>
                        </div>
                        <h4 className="text-zinc-800 font-bold text-xs mt-1.5 truncate">
                          Selected target: <strong className="text-zinc-900 font-extrabold">{selectedAuditItem.name}</strong>
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          Code: #{selectedAuditItem.articleCode} &bull; Barcode: {selectedAuditItem.barcode}
                        </p>
                      </div>
                      <button
                        id="btn-expand-step1"
                        type="button"
                        onClick={() => {
                          setIsStep1Collapsed(false);
                        }}
                        className="px-3.5 py-1.5 bg-white hover:bg-emerald-50 border border-zinc-250 hover:border-emerald-300 rounded-xl text-xs font-bold text-emerald-850 shrink-0 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        Change / Search again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-2 font-sans">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                            Step 1: Scan or Search Product
                          </h3>
                          <p className="text-xs text-zinc-500 mt-1 font-sans">
                            Perform active shelving lookup by entering name description, ID codes, barcode, or scanning.
                          </p>
                        </div>

                        {/* Sound Settings Control UI */}
                        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newMuted = !beepMuted;
                              setBeepMuted(newMuted);
                              localStorage.setItem("8twelve_beep_muted", String(newMuted));
                              if (!newMuted) {
                                setTimeout(() => playBeepSoundAt(beepVolume), 50);
                              }
                            }}
                            className="text-zinc-650 hover:text-emerald-650 p-1 bg-white hover:bg-zinc-100 border border-zinc-200/50 rounded-lg transition"
                            title={beepMuted ? "Unmute scanner beep" : "Mute scanner beep"}
                          >
                            {beepMuted || beepVolume === 0 ? (
                              <VolumeX className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </button>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-zinc-400">Vol:</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={beepVolume}
                              onChange={(e) => {
                                const vol = Number(e.target.value);
                                setBeepVolume(vol);
                                localStorage.setItem("8twelve_beep_volume", String(vol));
                              }}
                              onMouseUp={() => playBeepSoundAt(beepVolume)}
                              onTouchEnd={() => playBeepSoundAt(beepVolume)}
                              className="w-16 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                            />
                            <span className="text-[10px] font-mono font-bold text-zinc-500 w-[24px] text-right">
                              {beepMuted ? "Off" : `${beepVolume}%`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                    {/* Lookup Input and Camera Trigger Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          id="audit-lookup-search"
                          type="text"
                          placeholder="Type article code, title, or barcode..."
                          value={auditSearchQuery}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const trimmedVal = auditSearchQuery.trim();
                              if (!trimmedVal) return;
                              const cleanQuery = trimmedVal.toLowerCase();
                              const exactMatch = items.find(item => 
                                item.barcode === cleanQuery || 
                                item.articleCode.toLowerCase() === cleanQuery ||
                                item.name.toLowerCase() === cleanQuery
                              );
                              if (exactMatch) {
                                selectProductForAudit(exactMatch, `Matched exact product: "${exactMatch.name}"`);
                              } else {
                                setPrefilledBarcode(trimmedVal);
                                setEditingItem(null);
                                setIsModalOpen(true);
                                triggerAlert(`"${trimmedVal}" not in database. Opening enrollment form!`, "info");
                              }
                            }
                          }}
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
                                selectProductForAudit(exactMatch, `Matched exact product: "${exactMatch.name}"`);
                              }
                            }
                          }}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                        />
                        {auditSearchQuery && (
                          <button
                            type="button"
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

                      <button
                        type="button"
                        onClick={() => setIsCameraScanning(!isCameraScanning)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                          isCameraScanning
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-sm"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm"
                        }`}
                        title="Scan barcode with camera"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{isCameraScanning ? "Stop Camera" : "Scan with Camera"}</span>
                      </button>
                    </div>

                    {/* Active Camera Viewfinder Overlay */}
                    {isCameraScanning && (
                      <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800 relative shadow-inner overflow-hidden text-zinc-300">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-1.5 animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Live Camera Scanner</span>
                          </div>
                          
                          {/* Camera Selection Controls */}
                          {camerasList.length > 1 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-zinc-500">Camera:</span>
                              <select
                                value={selectedCameraId}
                                onChange={(e) => setSelectedCameraId(e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                              >
                                {camerasList.map((cam, idx) => (
                                  <option key={cam.id} value={cam.id}>
                                    {cam.label || `Camera ${idx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Camera viewport container */}
                        <div className="relative bg-black rounded-xl overflow-hidden border border-zinc-900 aspect-video max-w-sm mx-auto">
                          {/* Standard HTML5 Viewfinder Viewport */}
                          <div id="audit-camera-scanner-view" className="w-full h-full object-cover"></div>

                          {/* Beautiful Scanning Overlay HUD with Laser Line */}
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                            {/* HUD brackets corners */}
                            <div className="flex justify-between">
                              <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl" />
                              <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr" />
                            </div>
                            
                            {/* Center targeting guideline rectangle / red alignment laser */}
                            <div className="relative self-center w-[90%] h-[60%] border border-dashed border-emerald-500/35 rounded-lg flex items-center justify-center">
                              <div className="absolute inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] opacity-85 scanner-laser" />
                              <span className="text-[9px] text-emerald-400 font-bold bg-black/75 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Hold Barcode Here
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl" />
                              <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br" />
                            </div>
                          </div>
                        </div>

                        <div className="text-center mt-3">
                          <p className="text-[10px] text-zinc-500">
                            Hold barcode steadily inside the highlighted frame. Will match automatically.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsCameraScanning(false)}
                            className="mt-2 text-[10px] text-zinc-400 hover:text-white underline font-medium"
                          >
                            Cancel and close camera
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Autocomplete Results */}
                    {matchedAuditItems.length > 0 && !selectedAuditItem && (
                      <div className="border border-zinc-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-zinc-100 max-h-60 overflow-y-auto">
                        {matchedAuditItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              selectProductForAudit(item, `Loaded active audit target: "${item.name}"`);
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
                                selectProductForAudit(itm, `Loaded active audit target: "${itm.name}"`);
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
                  </>
                  )}
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
                            setIsStep1Collapsed(false);
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
                                  selectProductForAudit(auditedItem, `Edit recent item "${auditedItem.name}"`);
                                  setAuditRemarks("Adjusted recent audit stock parameter");
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
                    onToggleInactive={handleToggleInactive}
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
          {/* COVER PAGE (PAGE 1): DEDICATED SUMMARY COVER SHEET */}
          <div className="printable-page-block border-b border-zinc-200 pb-8 mb-8 print:break-after-page min-h-[195mm] flex flex-col justify-between" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
            <div>
              <div className="border-b-4 border-zinc-900 pb-6 mb-8 mt-4 text-center">
                <h1 className="text-3xl font-black tracking-tight text-zinc-900 uppercase">
                  8Twelve Store - Master Inventory Stock Report
                </h1>
                <p className="text-xs text-zinc-500 mt-2 font-mono uppercase tracking-widest">
                  Automated Shelf Audit Ledger Summary
                </p>
              </div>

              <div className="my-10 space-y-6">
                <p className="text-sm text-zinc-700 leading-relaxed max-w-2xl mx-auto text-center">
                  This verification document is compiled automatically based on real-time mobile shelf-front inventory scanning and auditing workflows. Use this document as the official store ledger.
                </p>

                {/* Grid of Key Summary Statistics */}
                <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto mt-8">
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Total Product Listings</span>
                    <span className="text-3xl font-black font-mono text-zinc-900 mt-1 block">{items.length} sku types</span>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Accumulated Gross Stock Counter</span>
                    <span className="text-3xl font-black font-mono text-emerald-800 mt-1 block">
                      {items.reduce((sum, i) => sum + i.stock, 0)} units
                    </span>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Active Storage Zones</span>
                    <span className="text-3xl font-black font-mono text-zinc-900 mt-1 block">
                      {new Set(items.map(i => i.location)).size} Shelves Zones
                    </span>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                    <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Inspected SKUs Ratio</span>
                    <span className="text-3xl font-black font-mono text-orange-750 mt-1 block">
                      {items.filter(i => i.lastUpdatedTime).length} of {items.length} Checked
                    </span>
                  </div>
                </div>

                {/* Status Alert Summary */}
                <div className="max-w-3xl mx-auto bg-zinc-50 border border-zinc-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-rose-600 font-extrabold">&bull; OUT OF STOCK LIMITS: </span>
                    <span className="font-bold text-zinc-900">{items.filter(i => i.stock === 0).length} skus</span>
                  </div>
                  <div>
                    <span className="text-amber-600 font-extrabold">&bull; LOW BALANCE CRITICAL: </span>
                    <span className="font-bold text-zinc-900">{items.filter(i => i.stock > 0 && i.stock <= 10).length} skus</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {/* Operator and Signatures details */}
              <div className="mt-20 border-t border-zinc-300 pt-8 max-w-3xl mx-auto grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-3.5">
                  <p className="text-zinc-500 font-mono">
                    Report Compiled On: <strong className="text-zinc-800 font-bold">{localTime}</strong>
                  </p>
                  <p className="text-zinc-500 font-mono">
                    Principal Operator: <strong className="text-zinc-800 font-bold">{userEmail || "docshabplt@gmail.com"}</strong>
                  </p>
                </div>
                <div className="space-y-6 pt-2">
                  <p className="font-mono border-b border-zinc-400 pb-1 text-zinc-500">
                    Checked & Approved By: ___________________________
                  </p>
                  <p className="font-mono border-b border-zinc-400 pb-1 text-zinc-500">
                    Store Stamp / Verification Date: _________________
                  </p>
                </div>
              </div>

              {/* Print Cover Footer */}
              <div className="mt-24 text-[10px] text-zinc-400 text-center font-mono">
                8Twelve Convenience Store &bull; Mobile Shelf Audit Suite v2.0
              </div>
            </div>
          </div>

          {/* ITEM DETAIL PAGES (PAGE 2+) */}
          {chunkedPages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className="printable-page-block border-b border-zinc-200 pb-8 mb-8 print:break-after-page min-h-[195mm] flex flex-col justify-between" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
              <div>
                <div className="border-b-2 border-zinc-900 pb-2.5 mb-5 flex justify-between items-center text-xs">
                  <div>
                    <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight">
                      8Twelve Inventory List &bull; Stock Details
                    </h2>
                  </div>
                  <div className="text-right font-mono text-[10px]">
                    <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-bold">
                      PAGE {pageIdx + 2} OF {chunkedPages.length + 1}
                    </span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-400 text-zinc-800 font-extrabold uppercase text-[9px] tracking-wider">
                      <th className="py-2 pr-2">Code</th>
                      <th className="py-2">Product Description</th>
                      <th className="py-2">Barcode</th>
                      <th className="py-2">Shelf Code</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Stock</th>
                      <th className="py-2 pl-4 text-center">Last Updated</th>
                      <th className="py-2 text-right">Audit level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {pageItems.map((i) => (
                      <tr key={i.id} className="hover:bg-zinc-50/50">
                        <td className="py-2 font-mono font-bold text-zinc-750">#{i.articleCode}</td>
                        <td className="py-2 pr-2">
                          <p className="font-bold text-zinc-900">{i.name}</p>
                          {i.remark && <p className="text-[9px] text-zinc-400 italic font-sans leading-none mt-0.5">{i.remark}</p>}
                        </td>
                        <td className="py-2 shrink-0">
                          <BarcodeVisual value={i.barcode} />
                        </td>
                        <td className="py-2 text-zinc-600 font-mono text-[10px]">{i.location}</td>
                        <td className="py-2 text-zinc-650">{i.category}</td>
                        <td className="py-2 text-right font-mono font-black text-xs">{i.stock}</td>
                        <td className="py-2 pl-4 text-center text-zinc-500 font-mono text-[9px]">
                          {i.lastUpdatedTime 
                            ? new Date(i.lastUpdatedTime).toLocaleString() 
                            : "—"
                          }
                        </td>
                        <td className="py-2 text-right font-mono text-zinc-600">
                          {i.lastUpdatedStock !== undefined ? i.lastUpdatedStock : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 border-t border-zinc-200 pt-4 text-[9px] text-zinc-400 flex justify-between items-center no-print-child">
                <p>8Twelve Stores &bull; Master Inventory Sheet Ledger &copy; {new Date().getFullYear()}</p>
                <p className="font-mono">Checked: ________________________</p>
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
              {/* DEDICATED FIRST PAGE (PAGE 1): STOCK INVENTORY SUMMARY COVER */}
              <div 
                id="printable-page-block-0" 
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 max-w-4xl mx-auto font-sans text-zinc-800 min-h-[580px] flex flex-col justify-between"
              >
                <div>
                  <div className="border-b-4 border-zinc-900 pb-5 mb-6 text-center">
                    <h4 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">
                      8Twelve store - stock inventory & Audit report
                    </h4>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-1">
                      System Verified Ledger Cover Summary Sheet
                    </p>
                  </div>

                  <div className="py-6 space-y-6">
                    <p className="text-xs text-zinc-600 leading-relaxed max-w-xl mx-auto text-center font-sans">
                      This verification document is compiled automatically based on real-time mobile shelf-front inventory scanning and auditing workflows. Use this document as the official store ledger.
                    </p>

                    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Total Product Listings</span>
                        <span className="text-2xl font-bold font-mono text-zinc-900 block mt-0.5">{items.length} sku positions</span>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Accumulated Gross Stock Counter</span>
                        <span className="text-2xl font-bold font-mono text-emerald-800 block mt-0.5">
                          {items.reduce((sum, item) => sum + item.stock, 0)} units
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Active Storage Zones</span>
                        <span className="text-2xl font-bold font-mono text-zinc-900 block mt-0.5">
                          {new Set(items.map(item => item.location)).size} Zones
                        </span>
                      </div>
                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-center">
                        <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Inspected SKUs Ratio</span>
                        <span className="text-2xl font-bold font-mono text-indigo-700 block mt-0.5">
                          {items.filter(i => i.lastUpdatedTime).length} of {items.length} Checked
                        </span>
                      </div>
                    </div>

                    {/* Warning balance alerts container */}
                    <div className="max-w-2xl mx-auto bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-[11px] font-mono text-center">
                      <div>
                        <span className="text-rose-600 font-bold">&bull; OUT OF STOCK: </span>
                        <span className="font-extrabold text-zinc-900">{items.filter(i => i.stock === 0).length} skus</span>
                      </div>
                      <div>
                        <span className="text-amber-600 font-bold">&bull; LOW STOCK WARNING: </span>
                        <span className="font-extrabold text-zinc-900">{items.filter(i => i.stock > 0 && i.stock <= 10).length} skus</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Operator Sign-off & signature margins */}
                  <div className="mt-12 border-t border-zinc-200 pt-6 max-w-2xl mx-auto grid grid-cols-2 gap-6 text-xs text-zinc-600">
                    <div className="space-y-3">
                      <p className="font-mono">
                        Report Time: <strong className="text-zinc-800">{localTime}</strong>
                      </p>
                      <p className="font-mono">
                        Principal Operator: <strong className="text-zinc-800">{userEmail || "docshabplt@gmail.com"}</strong>
                      </p>
                    </div>
                    <div className="space-y-5">
                      <p className="font-mono border-b border-zinc-350 pb-0.5">Verified By: ___________________________</p>
                      <p className="font-mono border-b border-zinc-350 pb-0.5">Signature Date: _________________</p>
                    </div>
                  </div>

                  <div className="text-center text-[10px] text-zinc-400 pt-10 font-mono">
                    Page 1 of {chunkedPages.length + 1} &bull; 8Twelve Convenience Store &copy; {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              {/* DEDICATED SUBSEQUENT PAGES: CLEAN COHESIVE TABULAR SHEETS (PAGES 2+) */}
              {chunkedPages.map((pageItems, pageIdx) => {
                const globalIndex = pageIdx + 1; // Page 2, 3, etc.
                return (
                  <div 
                    key={pageIdx}
                    id={`printable-page-block-${globalIndex}`} 
                    className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 max-w-4xl mx-auto font-sans text-zinc-800 min-h-[580px] flex flex-col justify-between"
                  >
                    <div>
                      <div className="border-b-2 border-zinc-900 pb-2.5 mb-5 flex justify-between items-center text-xs">
                        <div>
                          <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight">
                            8Twelve Inventory Detail Listing
                          </h4>
                        </div>
                        <div className="text-right font-mono text-[10px]">
                          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-bold uppercase">
                            PAGE {globalIndex + 1} OF {chunkedPages.length + 1}
                          </span>
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
                                <td className="py-2.5 text-right font-mono font-black text-xs text-zinc-850 font-sans">
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
                    </div>

                    {/* Verified block details */}
                    <div className="mt-8 pt-4 border-t border-zinc-200 text-[10px] text-zinc-400 flex flex-col sm:flex-row justify-between items-center gap-2">
                      <p>8Twelve Stores &bull; Master Inventory Sheet &bull; Verification record checks.</p>
                      <p className="font-mono font-bold text-zinc-650">Verify operator checklist review: ____________________</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
