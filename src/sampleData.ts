/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem } from "./types";

export const SAMPLE_CSV = `Article Code,Article Name,Remark,Location,Barcode
022788,7E Grilled Mushroom & C. Sausage 80g,,Peti Beku (Freezer),2095500227888
210135,Grilled Cheese Chicken,,Peti Beku (Freezer),2000000868899
208395,Fuji Frozen Wholemeal Croissant,,Peti Beku (Freezer),2000000782195
208069,CP FS Crispy Chicken Finger 10pkx1kg,,Peti Beku (Freezer),9557753115662
208390,McCain Sure crisp 5/16 Skin On 1kg,,Peti Beku (Freezer),2000000782157
208391,McCain Redstone 8-Cut Wedges 1kg,,Peti Beku (Freezer),2000000782171
208417,Popcorn Chicken 1 kg,,Peti Beku (Freezer),2000000782492
215868,GB CALAMARI RINGS 500g,LTO,Peti Beku (Freezer),2000001056769
216472,Mini Chicken Chop 10pcs,,Peti Beku (Freezer),9557612123685
215852,"PFT Black Pepper Cocktail Sausage (2.5"")",,Peti Beku (Freezer),2000001055892
208194,Salted Egg Chicken Pizza 1s,,Peti Beku (Freezer),9556781715653
208195,Haiwaiian Chicken Pizza 1s,,Peti Beku (Freezer),9556751715652
208408,Chocolate Danish 1s,,Peti Beku (Freezer),2000000782317
208409,Hogen Original Bagel 1s,,Peti Beku (Freezer),2000000782331
208410,Hogen Cinnamon Raisin Bagel 1s,,Peti Beku (Freezer),2000000782355
208411,Butterscoth Muffin 1s,,Peti Beku (Freezer),2000000782379
208412,Banana Muffin 1s,,Peti Beku (Freezer),2000000782393
208413,Pumpkin Danish 1s,,Peti Beku (Freezer),2000000782416
208414,Chicken Peperoni Danish 1s,,Peti Beku (Freezer),2000000782430
208415,Custard Danish 1s,,Peti Beku (Freezer),2000000782454
208416,Cheesy Cocktail Sausage Danish 1s,,Peti Beku (Freezer),2000000782478
208070,Primabaguz Coney Sauce 1kgx5pkt,,Peti Beku (Freezer),9556501110065
210822,Charcoal Bun,,Peti Beku (Freezer),2000000890463
208117,Black Sesame Pau,,Peti Beku (Freezer),9555700700336
208119,Thai Basil Chicken Pau,,Peti Beku (Freezer),9555700700312
208120,Green Curry Chicken Pau,,Peti Beku (Freezer),9555700700329
208160,BBQ Chicken Pau,,Peti Beku (Freezer),9555700700084
216602,MMK Pau Lipat,,Peti Beku (Freezer),9555700701418
216911,Pau Lipat (XXL),LTO,Peti Beku (Freezer),2000001119303
217612,CB Empress Dumpling (Yellow) 220g,LTO,Peti Beku (Freezer),9555525100021
217613,CB Juicy Bun 240g,LTO,Peti Beku (Freezer),9555525106764
217611,CB Unbreaded Crab Claw 450g,LTO,Peti Beku (Freezer),9555525104326
217622,Hogan Parmesan Cheese Bagel 1s,,Peti Beku (Freezer),2000001156179
217623,Cranberry Bagel 1s,,Peti Beku (Freezer),2000001156186
217851,Hash Brown,,Peti Beku (Freezer),2000001214367
218474,Curry Puff Original,,Peti Beku (Freezer),2000001211854
217850,Curry Puff Tom Yum,,Peti Beku (Freezer),2000001214282
220622,Samosa Lamb Masala,New,Peti Beku (Freezer),2000001342169
220623,Samosa Potato Lentil,New,Peti Beku (Freezer),2000001342220
221020,PF Spring Roll,New,Peti Beku (Freezer),2000001355756
218831,PF Curry Puff Original (Speed Oven),,Peti Beku (Freezer),2000001237892
218832,PF Curry Puff Tomyam (Speed Oven),,Peti Beku (Freezer),2000001237939
215877,SOY MILK,,Peti Sejuk (Chiller),2000001056820
208392,EMB PORTION BUT SALTED 200X8G-103592,,Peti Sejuk (Chiller),2000000782928
208393,EMB CHEESE TRIANGLES 36X140G-113561,,Peti Sejuk (Chiller),5704025014862
208394,EMB SPRAY WHIPPED CREAM 9X500ML-110567,,Peti Sejuk (Chiller),5704025030039
215878,CLASSIC PUDDING,,Peti Sejuk (Chiller),2000001056837
215879,CHOCOLATE PUDDING,,Peti Sejuk (Chiller),2000001056844
215880,STRAWBERRY PUDDING,,Peti Sejuk (Chiller),2000001056851
215881,CENDOL PUDDING,,Peti Sejuk (Chiller),2000001056868
215775,FF MASHED POTATO W BROWN SAUCE,,Peti Sejuk (Chiller),2000001052860
011138,Chacho's Cheesy Cheese 70g,,Suhu Bilik,9556072070027
011831,Kellogg's Corn Flakes 150g,,Suhu Bilik,8852756303056
020928,Kit Kat Original 2 Finger 17g,,Suhu Bilik,2000000731513
201722,FANTA FRUIT PUNCH FCB 10LTR,,Suhu Bilik,9555589211572
216739,FANTA LEMON LIME FCB 10LTR,,Suhu Bilik,9555589214504
215680,Fanta Pineapple Grape FCB 10ltr,LTO,Suhu Bilik,9555589214498
203577,7E Signature Arabica Bean 1000g,,Suhu Bilik,2000000427324
218879,7E Signature Arabica Coffee Beans 500g,,Suhu Bilik,9556402100059
203579,Scrippo Premium Chocolate 1000g,,Suhu Bilik,2000000427591
218880,Scrippo Chocolate Powder 500g,,Suhu Bilik,9556402308332
204046,MF Fresh Milk 1ltr,,Suhu Bilik,9415522285001
208103,SX Red Thai Tea Soft Serve Premix 836g,,Suhu Bilik,2000000773186
900402,Aladdin Sugar Cone - 300s,,Suhu Bilik,2000000587578
215778,SX Lingham Chili Chocolate 806g,LTO,Suhu Bilik,2000001053362
216054,SX Yuzu Premix 704g,LTO,Suhu Bilik,2000001076460
216213,SX NN Matcha Premix 910g,LTO,Suhu Bilik,2000001077047
216875,SX OATLY CHOC NUETRAL PLANT BASE 2430G,LTO,Suhu Bilik,2000001116562
217294,SX HOMESOY Honey Melon Plant Base 2530g,LTO,Suhu Bilik,2000001157565
206470,Pink Lemonade Mix 200g,,Suhu Bilik,4800361416146
208381,Nestle Coffee Mate Non Dairy Creamer450g,,Suhu Bilik,8850124007889
208400,Cha Tra Mue Thai Milk Tea Powder 400G,,Suhu Bilik,8850370721119
208401,Na Arun Thai Milk Tea Premix 500G,,Suhu Bilik,8856582001834
204406,Monin Pure Cane Sugar 1ltr,,Suhu Bilik,3052910001315
206070,Monin Banana Fruit Mix 1L,,Suhu Bilik,3052911217852
208404,Hales Boy Sala Syrup 710ML,,Suhu Bilik,8850423000093
208405,Hales Boy Cream Soda 710ML,,Suhu Bilik,2000000784403
210817,MONIN BLUE LAGOON -700ML,,Suhu Bilik,3052910056353
215253,Singlong Gula Melaka Syrup 360g,,Suhu Bilik,8888260006923
215762,MONIN Salted Caramel Syrup 700ML,,Suhu Bilik,3052910510046
215876,Ayam Brand Coconut Milk Super Light,,Suhu Bilik,2000001056813
210818,MONIN PASSIONFRUIT FRUITMIX 1L,LTO,Suhu Bilik,3052910600136
215763,MONIN Tangerine Syrup 700ML,LTO,Suhu Bilik,3052910010225
215808,HERCO SPECULOOS TOPPING 500ML,LTO,Suhu Bilik,2000001053409
216468,Pineapple Fruit Mix,LTO,Suhu Bilik,2000001091968
216477,MONIN Butterscotch Latte 700ML,LTO,Suhu Bilik,3052910041069
208378,Spicy Mango Sauce 1kg,,Suhu Bilik,2000000782003
208379,Hickory Smoke BBQ Sauce 1kg,,Suhu Bilik,2000000782027
208380,Honey Mustard Sauce 1kg,,Suhu Bilik,2000000782041
208382,MONIN DARK CHOC SAUCE 6X500ML,,Suhu Bilik,3052910044220
208383,SWISS BEAR NACHO CHEESE SAUCE 1KG,,Suhu Bilik,2000000782072
208384,SWISS BEAR SPICY KOREAN BBQ SAUCE 1KG,,Suhu Bilik,2000000782096
208385,SWISS BEAR MAYONNAISE 3L,,Suhu Bilik,2000000782119
208387,SWISS BEAR TOMATO KETCHUP 1KG,,Suhu Bilik,2000000782133
208388,Monin Strawberry Fruit Mix 1L,,Suhu Bilik,3052910600068
208418,7CAFE THAI CHILLI SAUCE 350GM,,Suhu Bilik,2000000782515
216603,ITP Thai Lime Sauce 1kg,,Suhu Bilik,9551007050563
216604,ITP Kam Heong Sauce 1kg,,Suhu Bilik,9551007050570
216605,ITP Spicy Tteobokki Sauce 1kg,,Suhu Bilik,9551007050594
216616,ITP Buttermilk Sauce 1kg,,Suhu Bilik,9551007050587
204702,Oreo Mini Box Vanilla 40.8g,,Suhu Bilik,7622210541956
205344,Oreo Crumbs 454g,,Suhu Bilik,4893049150142
208386,Nestum Cereal Sprinkles 1kg,,Suhu Bilik,9556001280138
208396,Chocolate Rice 1kg,,Suhu Bilik,2000000782218
208397,Mini Marshmallow (Colourful) 1kg,,Suhu Bilik,2000000782232
208398,Colourful Rice 1kg,,Suhu Bilik,2000000782256
208399,Toasted Coconut Flakes 1kg,,Suhu Bilik,2000000782270
208402,Golden Choice Pearl ( Konjac Jelly) 2KG,,Suhu Bilik,8850423000086
208403,Popping Lychee Pearl 3.2KG,,Suhu Bilik,4710007520048
216469,Ho Song Pineapple Chunks,LTO,Suhu Bilik,2000001091982
208421,HEXA TOMATO SEASONING 1KG,,Suhu Bilik,2000000782577
208422,HEXA TOM YUM SEASONING 1KG,,Suhu Bilik,2000000782591
208423,HEXA CHEESE SEASONING (ORANGE) 1KG,,Suhu Bilik,2000000782614
209561,SANITARIUM SO GOOD BARISTA SOY MILK 1 L,#1138 only,Suhu Bilik,9300652808827
209562,SANITARIUM SO GOOD BARISTA OAT MILK 1 L,#1138 only,Suhu Bilik,9300652809770
210442,PACIFIC SOY BARISTA ORIGINAL 1L,#2880 only,,052603042925
210443,Oatside Barista Blend 1L,#2880 only,,8997240600041
210442,PACIFIC SOY BARISTA ORIGINAL 1L,#2880 only,,052603042925
210443,Oatside Barista Blend 1L,#2880 only,,8997240600041
210444,NN KIKU MATCHA POWDER 200G,#2880 only,,9551003060252
210445,NN AJISAI MATCHA POWDER 500G,#2880 only,,9551003060207
210776,NN TSUBAKI HOUJICAH POWDER 500G,#2880 only,,9551003060054
210777,NN MOKUREN GENMAICHA POWDER 500G,#2880 only,,9551003060078
210778,NN SUISEN GENMAI POWDER 500G,#2880 only,,9551003060092
210779,MONIN GRAPE FRUIT-700ML,#2880 only,,3052910041106
210780,MONIN HABANERO LIME - 700ML,#2880 only,,3052911327056
210781,MONIN MANGO FRUITMIX1 LITER,#2880 only,,3052911214219`;

// High-fidelity custom safe parser for CSV lines
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentToken = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Check for double quotes within quotes
      if (inQuotes && line[i + 1] === '"') {
        currentToken += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentToken.trim());
      currentToken = "";
    } else {
      currentToken += char;
    }
  }
  result.push(currentToken.trim());
  return result;
}

export function loadDefaultInventory(): InventoryItem[] {
  const lines = SAMPLE_CSV.trim().split("\n");
  // First line is header: Article Code,Article Name,Remark,Location,Barcode
  const items: InventoryItem[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;
    
    const [articleCode, name, remark, rawLocation, barcode] = parts;
    if (!articleCode || !name) continue;

    // Detect Category & Aisle based on raw fields
    let category = "General Inventory";
    let location = rawLocation || "Room Temp Depots";

    if (location.toLowerCase().includes("peti beku") || location.toLowerCase().includes("freezer")) {
      category = "Frozen Foods";
      location = "Freezer Cabinet";
    } else if (location.toLowerCase().includes("peti sejuk") || location.toLowerCase().includes("chiller")) {
      category = "Chor Chilled Drinks";
      location = "Chiller Aisle";
    } else if (location.toLowerCase().includes("suhu bilik") || location.toLowerCase().includes("room temp")) {
      if (name.toLowerCase().includes("sauce") || name.toLowerCase().includes("syrup") || name.toLowerCase().includes("monin")) {
        category = "Sauces & Syrups";
        location = "Aisle A1 - Flavouring";
      } else if (name.toLowerCase().includes("milk") || name.toLowerCase().includes("cream") || name.toLowerCase().includes("soy")) {
        category = "Dairy & Alternatives";
        location = "Aisle B2 - Beverages";
      } else if (name.toLowerCase().includes("powder") || name.toLowerCase().includes("tea") || name.toLowerCase().includes("matcha")) {
        category = "Beverage Powders";
        location = "Aisle C1 - Tea & Coffee";
      } else if (name.toLowerCase().includes("chips") || name.toLowerCase().includes("oreo") || name.toLowerCase().includes("cereal") || name.toLowerCase().includes("rice") || name.toLowerCase().includes("sprinkles")) {
        category = "Topping & Desserts";
        location = "Aisle D4 - Dry Snacks";
      } else if (name.toLowerCase().includes("cone") || name.toLowerCase().includes("pau") || name.toLowerCase().includes("bagel") || name.toLowerCase().includes("bun")) {
        category = "Bakery & Cones";
        location = "Aisle E2 - Bakery Supplies";
      } else {
        category = "Room Temp Produce";
        location = "Aisle F1 - General Shelf";
      }
    } else {
      category = "Special Collections";
      if (!location) {
        location = "Promo Stands";
      }
    }

    // Set interactive alias lists
    const aliases: string[] = [];
    const lowerName = name.toLowerCase();
    
    // Auto-generate helper aliases for faster search
    if (lowerName.includes("sausage")) aliases.push("sosej");
    if (lowerName.includes("croissant")) aliases.push("pastry", "roti");
    if (lowerName.includes("calamari")) aliases.push("sotong", "seafood");
    if (lowerName.includes("pizza")) aliases.push("fastfood");
    if (lowerName.includes("bagel")) aliases.push("roti", "donut");
    if (lowerName.includes("muffin")) aliases.push("kek", "cake");
    if (lowerName.includes("syrup")) aliases.push("manis", "cordial");
    if (lowerName.includes("soy")) aliases.push("kacang", "soya");
    if (lowerName.includes("matcha")) aliases.push("green tea", "teh");
    if (lowerName.includes("pau")) aliases.push("steamed bun");

    // Add Article Code and Barcode as alias search helper too!
    
    // Pre-calculate randomized, natural starting stocks (between 4 and 48)
    const seed = parseInt(articleCode, 10) || 5;
    const stock = 5 + (seed % 42); 

    items.push({
      id: articleCode,
      articleCode,
      name,
      aliases,
      remark: remark || "",
      location,
      barcode,
      category,
      stock,
    });
  }

  // Filter out any potential duplicate codes to keep id unique
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.articleCode)) {
      return false;
    }
    seen.add(item.articleCode);
    return true;
  });
}
