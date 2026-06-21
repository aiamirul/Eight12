/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface InventoryItem {
  id: string;
  articleCode: string;
  name: string;
  aliases: string[];
  remark: string;
  location: string;
  barcode: string;
  category: string;
  stock: number;
  imageUrl?: string;
  lastUpdatedTime?: string; // ISO or human string of last update
  lastUpdatedStock?: number; // Stock number before or at last update
  inactive?: boolean; // Set true if item is ignored/inactive
  zebraStock?: number; // Zebra dynamic stock level
  zebraLastUpdated?: string; // Zebra last audit timestamp
}

export interface StockChangeLog {
  id: string;
  articleCode: string;
  articleName: string;
  timestamp: string; // ISO string
  prevStock: number;
  newStock: number;
  remarks: string;
  operator: string;
}
