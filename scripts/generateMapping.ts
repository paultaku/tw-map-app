import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface OpenDataItem {
  "資料集id": string;
  "資料集編號": string;
  "資料集名稱": string;
  "主要欄位說明": string;
  [key: string]: any;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main() {
  const sourcePath = path.resolve(__dirname, '../src/source/taipei/Open Data.json');
  const outputPath = path.resolve(__dirname, '../public/data-set-mapping.json');

  console.log(`Reading Open Data from: ${sourcePath}`);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found at ${sourcePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(sourcePath, 'utf-8');
  const datasets: OpenDataItem[] = JSON.parse(fileContent);

  // Filter datasets that have both "經度" and "緯度" in "主要欄位說明"
  const filtered = datasets.filter(item => {
    const fieldsDesc = item["主要欄位說明"] || "";
    return fieldsDesc.includes("經度") && fieldsDesc.includes("緯度");
  });

  console.log(`Filtered ${filtered.length} datasets with coordinates.`);

  // Map to options structure
  const options = filtered.map(item => {
    return {
      value: item["資料集編號"] || item["資料集id"],
      label: item["資料集名稱"]
    };
  });

  const outputJson = {
    options: options
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf-8');
  console.log(`Saved mapping file to: ${outputPath}`);
}

main();
