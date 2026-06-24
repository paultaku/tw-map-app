import type { BBox } from '@/types/location';

// 預設中心點：台北市（範例資料 smoking_areas.json 多落在此區域）
export const DEFAULT_CENTER = { lat: 25.033, lng: 121.5654 };
export const DEFAULT_ZOOM = 13;

// 全量靜態資料的 URL（靜態匯出時由 Firebase Hosting 直接提供）
export const DATA_URL = '/smoking_areas.json';

// 首屏「預設中心點區域」的初始 BBox（±0.2 度約 ±22km，足以涵蓋整個台北市）
export const DEFAULT_BBOX: BBox = {
  minLat: DEFAULT_CENTER.lat - 0.2,
  maxLat: DEFAULT_CENTER.lat + 0.2,
  minLng: DEFAULT_CENTER.lng - 0.2,
  maxLng: DEFAULT_CENTER.lng + 0.2,
};
