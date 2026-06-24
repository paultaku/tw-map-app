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
