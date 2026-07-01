// 地圖點位的「正規化」型別，與原始 JSON 欄位解耦
export interface Location {
  id: number | string;
  name: string;
  lat: number;
  lng: number;
  category?: string;
}

// 視角邊界（Bounding Box）
export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// 一個 H3 網格 cell，對應 Firestore 的 Bucket Pattern 文件（doc id = h3 index）
export interface GridCell {
  h3: string;
  res: number;
  count: number;
  center: { lat: number; lng: number };
  categories?: Record<string, number>;
  // 原始點位資料；僅在高解析度（res 9）detail 網格才會有
  points?: Array<Record<string, unknown>>;
}
