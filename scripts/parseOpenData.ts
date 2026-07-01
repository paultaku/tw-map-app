import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { latLngToCell, cellToLatLng, cellToParent } from 'h3-js';

// Define types
interface OpenDataItem {
  "資料集id": string;
  "資料集編號": string;
  "資料集名稱": string;
  "主要欄位說明": string;
  "資料存取網址": string;
  "檔案格式": string;
  "編碼格式": string;
  "資料最後更新時間"?: string;
  [key: string]: any;
}

// Standardized place object (mirrors src/services/dataProvider Place)
interface Place {
  id: number;
  title: string;
  category: string;
  location: string;
  coords: [number, number]; // [lat, lng] WGS84
  address: string;
  layoutType: string;
  hours: string;
  description: string;
  image: string;
  management: string;
  phone: string;
  notes: string;
}

// H3 grid bucket (Bucket Pattern): one document per H3 cell, keyed by the H3 index.
interface GridBucket {
  h3: string;
  res: number;
  count: number;                       // pre-computed point count for the cell
  center: { lat: number; lng: number }; // cell centroid, for rendering the aggregated marker
  categories: Record<string, number>;  // per-category counts within the cell
  points?: Place[];                    // included only for the high-resolution detail grid
}

// H3 resolutions: 7 ≈ 5 km edge (aggregation / zoomed-out), 9 ≈ 0.17 km edge (detail / zoomed-in)
const RES_AGGREGATE = 7;
const RES_DETAIL = 9;

// Firestore collection names — document ID is the H3 index
const COLLECTION_AGGREGATE = 'grids_r7';
const COLLECTION_DETAIL = 'grids_r9';

// Support __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pure TypeScript CSV parser
function parseCSV(csvText: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else if (char === '\r' && !inQuotes) {
      // Ignore carriage return
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = (values[index] || '').trim();
    });
    result.push(row);
  }

  return result;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

// Converts TWD97 (TM2 projection) coordinates to WGS84 lat/lng
function twd97ToWgs84(x: number, y: number): [number, number] {
  const a = 6378137.0;
  const b = 6356752.314245;
  const lon0 = 121 * Math.PI / 180;
  const k0 = 0.9999;
  const dx = 250000;
  const dy = 0;
  const e = Math.sqrt(1 - Math.pow(b, 2) / Math.pow(a, 2));

  const x_proj = x - dx;
  const y_proj = y - dy;
  const M = y_proj / k0;

  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));
  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));

  const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu);
  const J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu);
  const J3 = (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu);
  const J4 = (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

  const fp = mu + J1 + J2 + J3 + J4;

  const e2 = Math.pow(e, 2) / (1 - Math.pow(e, 2));
  const C1 = e2 * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2) * Math.sin(fp) * Math.sin(fp), 1.5);
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.sin(fp) * Math.sin(fp));
  const D = x_proj / (N1 * k0);

  const Q2 = (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e2) * Math.pow(D, 3) / 6;
  const Q3 = (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 3 * Math.pow(C1, 2) - 252 * e2) * Math.pow(D, 5) / 120;
  const lat = fp - (N1 * Math.tan(fp) / R1) * (Math.pow(D, 2) / 2 - Q2 + Q3);

  const Q4 = D;
  const Q5 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
  const Q6 = (5 + 28 * T1 + 24 * Math.pow(T1, 2) + 6 * C1 + 8 * e2) * Math.pow(D, 5) / 120;
  const lon = lon0 + (Q4 - Q5 + Q6) / Math.cos(fp);

  return [lat * 180 / Math.PI, lon * 180 / Math.PI];
}

// Scans columns for coordinates and parses or converts them
function getWgs84Coords(row: Record<string, string>): [number, number] | null {
  const keys = Object.keys(row);
  
  // WGS84 check first
  const latKey = keys.find(k => k.includes('緯度') || k.includes('緯') || k.toLowerCase() === 'lat' || k.toLowerCase() === 'latitude');
  const lngKey = keys.find(k => k.includes('經度') || k.includes('經') || k.toLowerCase() === 'lng' || k.toLowerCase() === 'lon' || k.toLowerCase() === 'longitude');
  
  if (latKey && lngKey) {
    const lat = parseFloat(row[latKey]);
    const lng = parseFloat(row[lngKey]);
    if (lat > 21 && lat < 26 && lng > 118 && lng < 123) {
      return [lat, lng];
    }
  }

  // TWD97 check
  const xKey = keys.find(k => k.includes('TWD97') && (k.includes('X') || k.includes('東') || k.includes('E')) || k.toLowerCase() === 'x' || k.toLowerCase() === 'easting');
  const yKey = keys.find(k => k.includes('TWD97') && (k.includes('Y') || k.includes('北') || k.includes('N')) || k.toLowerCase() === 'y' || k.toLowerCase() === 'northing');

  if (xKey && yKey) {
    const x = parseFloat(row[xKey]);
    const y = parseFloat(row[yKey]);
    if (!isNaN(x) && !isNaN(y)) {
      const easting = x < y ? x : y;
      const northing = x < y ? y : x;
      if (easting > 100000 && easting < 500000 && northing > 2000000 && northing < 3000000) {
        const wgs = twd97ToWgs84(easting, northing);
        if (wgs[0] > 21 && wgs[0] < 26 && wgs[1] > 118 && wgs[1] < 123) {
          return wgs;
        }
      }
    }
  }

  // Fallback: search all columns for values matching WGS84 or TWD97
  let candidateLat = NaN;
  let candidateLng = NaN;
  let candidateX = NaN;
  let candidateY = NaN;

  for (const key of keys) {
    const val = parseFloat(row[key]);
    if (isNaN(val)) continue;

    if (val > 21 && val < 26) candidateLat = val;
    if (val > 118 && val < 123) candidateLng = val;
    if (val > 100000 && val < 500000) candidateX = val;
    if (val > 2000000 && val < 3000000) candidateY = val;
  }

  if (!isNaN(candidateLat) && !isNaN(candidateLng)) {
    return [candidateLat, candidateLng];
  }

  if (!isNaN(candidateX) && !isNaN(candidateY)) {
    const wgs = twd97ToWgs84(candidateX, candidateY);
    if (wgs[0] > 21 && wgs[0] < 26 && wgs[1] > 118 && wgs[1] < 123) {
      return wgs;
    }
  }

  return null;
}

// Maps a raw Chinese CSV row into a standardized English Place object
function mapRowToPlace(row: Record<string, string>, datasetName: string, id: number): Place | null {
  // 1. Determine category dynamically
  let category = 'other';
  if (datasetName.includes('吸菸') || datasetName.includes('菸')) {
    category = 'smoking';
  } else if (
    datasetName.includes('公園') || 
    datasetName.includes('綠') || 
    datasetName.includes('樹') || 
    datasetName.includes('生態') ||
    datasetName.includes('山') ||
    datasetName.includes('河濱') ||
    datasetName.includes('蝴蝶') ||
    datasetName.includes('蜻蜓') ||
    datasetName.includes('爬蟲') ||
    datasetName.includes('兩棲') ||
    datasetName.includes('底棲') ||
    datasetName.includes('鳥類')
  ) {
    category = 'nature';
  } else if (
    datasetName.includes('古蹟') || 
    datasetName.includes('文化') || 
    datasetName.includes('文獻') || 
    datasetName.includes('歷史') || 
    datasetName.includes('消防') ||
    datasetName.includes('防禦') ||
    datasetName.includes('防洪') ||
    datasetName.includes('機關') ||
    datasetName.includes('場館') ||
    datasetName.includes('公所') ||
    datasetName.includes('學校') ||
    datasetName.includes('活動中心') ||
    datasetName.includes('救生員') ||
    datasetName.includes('游泳池')
  ) {
    category = 'culture';
  } else if (
    datasetName.includes('夜市') || 
    datasetName.includes('市場') || 
    datasetName.includes('商圈') || 
    datasetName.includes('垃圾') ||
    datasetName.includes('代售點') ||
    datasetName.includes('廢棄物') ||
    datasetName.includes('計程車') ||
    datasetName.includes('招呼站') ||
    datasetName.includes('轉運站')
  ) {
    category = 'nightmarket';
  }

  // Helper to find value matching a list of column regexes
  const findValue = (regexList: RegExp[]): string => {
    for (const regex of regexList) {
      const matchKey = Object.keys(row).find(k => regex.test(k));
      if (matchKey) return row[matchKey] || '';
    }
    return '';
  };

  // Find coords
  const coords = getWgs84Coords(row);
  if (!coords) {
    return null;
  }

  // Title
  const title = findValue([
    /場所名稱/, /店名/, /名稱/, /分隊/, /站名/, /場館名稱/, /學校名稱/, /機構名稱/, /景點名稱/, /標題/, /里別/, /路名/, /位置/, /title/i, /name/i, /Name_C/i
  ]) || datasetName;

  // Address
  const address = findValue([
    /地址/, /門牌/, /路段/, /地點/, /address/i, /location/i
  ]);

  // Layout type
  const layoutType = findValue([
    /吸菸區樣態/, /樣態/, /型式/, /類型/, /種類/, /layout/i, /type/i
  ]);

  // Hours
  const hours = findValue([
    /開放時間/, /營業時間/, /時間/, /時段/, /hours/i, /time/i
  ]) || '詳見官方網站';

  // Management
  const management = findValue([
    /管理單位/, /管理機關/, /維護單位/, /主辦單位/, /管理機構/, /主管機關/, /單位/, /management/i, /org/i
  ]);

  // Phone
  const phone = findValue([
    /聯絡電話/, /電話/, /行動電話/, /電話號碼/, /手機/, /phone/i, /tel/i
  ]);

  // Notes
  const notes = findValue([
    /備註說明/, /備註/, /說明/, /描述/, /notes/i, /note/i, /remark/i, /description/i, /desc/i
  ]) || '本位置資訊僅供參考，實際情形以現場公告及標示為準';

  // Location (District)
  let locationVal = findValue([
    /行政區/, /地區/, /鄉鎮市區/, /district/i, /location/i, /Region/i
  ]);
  if (locationVal) {
    if (locationVal.endsWith('區') && !locationVal.startsWith('臺北')) {
      locationVal = '臺北市' + locationVal;
    }
  } else {
    locationVal = '臺北市';
  }

  return {
    id,
    title,
    category,
    location: locationVal,
    coords,
    address,
    layoutType,
    hours,
    description: notes,
    image: '',
    management,
    phone,
    notes
  };
}

async function main() {
  // Push H3 buckets to Firestore only when explicitly requested (needs GOOGLE_APPLICATION_CREDENTIALS).
  const shouldUpload = process.argv.includes('--upload');

  const sourcePath = path.resolve(__dirname, '../src/source/taipei/Open Data.json');
  const outputDir = path.resolve(__dirname, '../public/taipei/data');

  console.log(`Reading Open Data file from: ${sourcePath}`);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: Source file not found at ${sourcePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(sourcePath, 'utf-8');
  const datasets: OpenDataItem[] = JSON.parse(fileContent);

  console.log(`Total datasets found in Open Data: ${datasets.length}`);

  // 1. Filter out datasets that contain both "經度" and "緯度" in "主要欄位說明"
  const filtered = datasets.filter(item => {
    const fieldsDesc = item["主要欄位說明"] || "";
    return fieldsDesc.includes("經度") && fieldsDesc.includes("緯度");
  });

  console.log(`Filtered datasets containing both '經度' and '緯度': ${filtered.length}`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  // Accumulates every valid place across all datasets, for H3 grid aggregation below
  const allPlaces: Place[] = [];

  // Process each filtered dataset
  for (let idx = 0; idx < filtered.length; idx++) {
    const item = filtered[idx];
    const datasetId = item["資料集編號"] || item["資料集id"];
    const datasetName = item["資料集名稱"];
    const urls = (item["資料存取網址"] || "").split(',');
    const formats = (item["檔案格式"] || "").split(',');
    const encoding = (item["編碼格式"] || "utf-8").trim();

    console.log(`\n[${idx + 1}/${filtered.length}] Processing Dataset: ${datasetId} - ${datasetName}`);
    
    const allData: Place[] = [];
    let success = false;
    let localId = (idx + 1) * 100000; // Generate globally unique IDs to prevent Leaflet key collisions

    for (let uIdx = 0; uIdx < urls.length; uIdx++) {
      const relativeUrl = urls[uIdx].trim();
      const format = (formats[uIdx] || formats[0] || "").trim().toUpperCase();

      if (!relativeUrl) continue;
      if (format !== 'CSV') {
        console.log(`  Skipping non-CSV resource (Format: ${format}): ${relativeUrl}`);
        continue;
      }

      const fullUrl = relativeUrl.startsWith('http') ? relativeUrl : `https://data.taipei${relativeUrl}`;
      console.log(`  Fetching CSV from: ${fullUrl}`);

      try {
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder(encoding.toLowerCase().includes('big5') ? 'big5' : 'utf-8');
        const csvText = decoder.decode(buffer);

        const rows = parseCSV(csvText);
        console.log(`  Parsed ${rows.length} raw CSV rows.`);
        
        // Map keys to standard English schema and filter out invalid rows
        const mappedRows = rows
          .map(row => mapRowToPlace(row, datasetName, localId++))
          .filter((row): row is Place => row !== null);

        console.log(`  Successfully mapped ${mappedRows.length} valid Place objects.`);
        allData.push(...mappedRows);
        success = true;
      } catch (err: any) {
        console.error(`  Error fetching/parsing ${fullUrl}: ${err.message}`);
      }
    }

    if (success) {
      const outputFilename = `${datasetId}.json`;
      const outputPath = path.join(outputDir, outputFilename);
      const outputJson = {
        data: allData,
        updateAt: new Date().toISOString()
      };

      fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf-8');
      console.log(`  Saved to: ${outputPath}`);

      allPlaces.push(...allData);
    } else {
      console.log(`  Skipped saving dataset ${datasetId} because no CSV resources were successfully loaded.`);
    }
  }

  // ----- H3 grid aggregation (Bucket Pattern) -----
  console.log(`\nBuilding H3 grids from ${allPlaces.length} places...`);

  const detailBuckets = buildBuckets(allPlaces, RES_DETAIL, true);        // res 9 — keeps full points
  const aggregateBuckets = buildBuckets(allPlaces, RES_AGGREGATE, false); // res 7 — counts only

  console.log(`  Resolution ${RES_DETAIL} (detail):    ${detailBuckets.length} cells`);
  console.log(`  Resolution ${RES_AGGREGATE} (aggregate): ${aggregateBuckets.length} cells`);

  // Local JSON snapshots for the dev data source (production reads Firestore instead).
  const h3Dir = path.resolve(__dirname, '../public/h3');
  const ts = new Date().toISOString();

  // Aggregate grid (res 7): one small file, loaded whole on the client.
  writeJson(path.join(h3Dir, `${COLLECTION_AGGREGATE}.json`), { cells: aggregateBuckets, updatedAt: ts });

  // Detail grid (res 9): sharded by parent r7 cell so the client only fetches the viewport's
  // shards (the static analog of the Firestore `in` query — avoids one giant multi-MB file).
  const r9Dir = path.join(h3Dir, 'r9');
  fs.rmSync(r9Dir, { recursive: true, force: true });
  const shards = new Map<string, GridBucket[]>();
  for (const bucket of detailBuckets) {
    const parent = cellToParent(bucket.h3, RES_AGGREGATE);
    let arr = shards.get(parent);
    if (!arr) { arr = []; shards.set(parent, arr); }
    arr.push(bucket);
  }
  for (const [parent, cells] of shards) {
    writeJson(path.join(r9Dir, `${parent}.json`), { cells, updatedAt: ts });
  }
  console.log(`  Wrote r7 grid (${aggregateBuckets.length} cells) + ${shards.size} r9 shards to: ${h3Dir}`);

  // Firestore upload (opt-in: requires --upload and GOOGLE_APPLICATION_CREDENTIALS)
  if (shouldUpload) {
    console.log('\nUploading H3 grids to Firestore (Bucket Pattern, doc ID = H3 index)...');
    await uploadBucketsToFirestore(COLLECTION_DETAIL, detailBuckets);
    await uploadBucketsToFirestore(COLLECTION_AGGREGATE, aggregateBuckets);
    console.log('  Firestore upload complete.');
  } else {
    console.log('\nSkipped Firestore upload. Re-run with --upload (and GOOGLE_APPLICATION_CREDENTIALS set) to push.');
  }

  console.log('\nAll processing completed!');
}

// Groups places into H3 cells (Bucket Pattern). `includePoints` keeps the raw points
// for the high-resolution detail grid; the low-resolution grid stores aggregates only.
function buildBuckets(places: Place[], res: number, includePoints: boolean): GridBucket[] {
  const byCell = new Map<string, GridBucket>();

  for (const place of places) {
    const [lat, lng] = place.coords;
    const h3 = latLngToCell(lat, lng, res);

    let bucket = byCell.get(h3);
    if (!bucket) {
      const [centerLat, centerLng] = cellToLatLng(h3);
      bucket = {
        h3,
        res,
        count: 0,
        center: { lat: centerLat, lng: centerLng },
        categories: {},
      };
      if (includePoints) bucket.points = [];
      byCell.set(h3, bucket);
    }

    bucket.count += 1;
    bucket.categories[place.category] = (bucket.categories[place.category] || 0) + 1;
    bucket.points?.push(place); // no-op when points is undefined (aggregate grid)
  }

  return [...byCell.values()];
}

// Writes JSON to disk, creating parent directories as needed.
function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Writes one document per H3 cell (doc ID = H3 index) using batched commits.
// firebase-admin is imported lazily so the default run needs no credentials.
async function uploadBucketsToFirestore(collectionName: string, buckets: GridBucket[]): Promise<void> {
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(), // reads GOOGLE_APPLICATION_CREDENTIALS
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  const db = getFirestore();

  const BATCH_LIMIT = 450; // Firestore allows max 500 writes per batch
  for (let i = 0; i < buckets.length; i += BATCH_LIMIT) {
    const slice = buckets.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const bucket of slice) {
      batch.set(db.collection(collectionName).doc(bucket.h3), bucket);
    }
    await batch.commit();
    console.log(`  ${collectionName}: wrote ${Math.min(i + BATCH_LIMIT, buckets.length)}/${buckets.length} cells`);
  }
}

main().catch(err => {
  console.error('Fatal error in script:', err);
});
