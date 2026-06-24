export interface Place {
  id: number;
  title: string;
  category: string;
  location: string;
  coords: [number, number];
  image: string;
  description: string;
  address?: string;
  layoutType?: string;
  hours?: string;
  management?: string;
  phone?: string;
  notes?: string;
}

export interface County {
  id: string;
  name: string;
  chineseName: string;
  center: [number, number];
  zoom: number;
  description: string;
}

export const COUNTIES: County[] = [
  {
    id: 'all',
    name: '全台灣',
    chineseName: '全國',
    center: [23.6978, 120.9605],
    zoom: 8,
    description: '探索全台灣各地的熱門景點。'
  },
  {
    id: 'taipei',
    name: '台北市',
    chineseName: '台北市',
    center: [25.032969, 121.565426],
    zoom: 12,
    description: '台灣首都，融合創新與文化的活力都會。'
  },
  {
    id: 'new_taipei',
    name: '新北市',
    chineseName: '新北市',
    center: [25.016988, 121.462799],
    zoom: 11,
    description: '環繞台北、人口最多的城市，處處皆是風景名勝。'
  },
  {
    id: 'taichung',
    name: '台中市',
    chineseName: '台中市',
    center: [24.147736, 120.673648],
    zoom: 11,
    description: '中台灣的文化與經濟重鎮。'
  },
  {
    id: 'tainan',
    name: '台南市',
    chineseName: '台南市',
    center: [22.999728, 120.227028],
    zoom: 11,
    description: '台灣最古老的城市與文化古都，以美食與歷史聞名。'
  },
  {
    id: 'kaohsiung',
    name: '高雄市',
    chineseName: '高雄市',
    center: [22.627278, 120.301435],
    zoom: 11,
    description: '南台灣的重要港都，以藝術與海洋風情著稱。'
  },
  {
    id: 'hualien',
    name: '花蓮縣',
    chineseName: '花蓮縣',
    center: [23.9772, 121.6044],
    zoom: 10,
    description: '東海岸門戶，擁有壯麗峽谷與遼闊海景。'
  },
  {
    id: 'nantou',
    name: '南投縣',
    chineseName: '南投縣',
    center: [23.9037, 120.6860],
    zoom: 10,
    description: '台灣唯一不靠海的縣市，日月潭所在地。'
  },
  {
    id: 'pingtung',
    name: '屏東縣',
    chineseName: '屏東縣',
    center: [22.6723, 120.4883],
    zoom: 10,
    description: '最南端的縣市，擁有熱帶度假勝地與墾丁國家公園。'
  }
];

export const INITIAL_PLACES: Place[] = [
  {
    id: 1,
    title: "台北101",
    category: "culture",
    location: "台北市",
    coords: [25.0339, 121.5644],
    image: "https://images.unsplash.com/photo-1504618223053-559bdef9dd5a?auto=format&fit=crop&w=600&q=80",
    description: "曾是世界第一高樓，台北101外型有如一節節向上拔升的竹子，是融合傳統亞洲美學與現代永續工法的工程傑作。"
  },
  {
    id: 2,
    title: "太魯閣峽谷",
    category: "nature",
    location: "花蓮縣",
    coords: [24.1593, 121.6212],
    image: "https://images.unsplash.com/photo-1596401057633-53103241f7e7?auto=format&fit=crop&w=600&q=80",
    description: "太魯閣峽谷是由立霧溪切割而成、長達 19 公里的壯麗峽谷，以陡峭的大理石崖壁、湍急溪流與穿越群峰的深邃隧道聞名。"
  },
  {
    id: 3,
    title: "日月潭",
    category: "nature",
    location: "南投縣",
    coords: [23.8566, 120.9150],
    image: "https://images.unsplash.com/photo-1587303357597-8c3dc52e1858?auto=format&fit=crop&w=600&q=80",
    description: "位於台灣心臟地帶的日月潭，以平靜的湛藍湖水與環抱四周的翠綠群山聞名。東側形似太陽，西側狀如彎月，因而得名。"
  },
  {
    id: 4,
    title: "九份老街",
    category: "culture",
    location: "新北市",
    coords: [25.1099, 121.8452],
    image: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=600&q=80",
    description: "高踞海岸山坡上的歷史採金小鎮，蜿蜒的巷弄、傳統茶樓與盞盞紅燈籠，孕育出令人難忘的經典視覺風情。"
  },
  {
    id: 5,
    title: "士林夜市",
    category: "nightmarket",
    location: "台北市",
    coords: [25.0879, 121.5241],
    image: "https://images.unsplash.com/photo-1570155308259-7104a37b38cb?auto=format&fit=crop&w=600&q=80",
    description: "台灣規模最大、最知名的夜市之一，宛如美食迷宮，匯集大雞排、珍珠奶茶、臭豆腐等招牌街頭小吃。"
  },
  {
    id: 6,
    title: "六合夜市",
    category: "nightmarket",
    location: "高雄市",
    coords: [22.6314, 120.3021],
    image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80",
    description: "高雄歷史最悠久、最具代表性的夜市，以新鮮海產、椒鹽螃蟹、木瓜牛奶與便利好逛的徒步街道規劃著稱。"
  },
  {
    id: 7,
    title: "墾丁國家公園",
    category: "nature",
    location: "屏東縣",
    coords: [21.9483, 120.7798],
    image: "https://images.unsplash.com/photo-1598285513685-64c9d961bdcf?auto=format&fit=crop&w=600&q=80",
    description: "位於台灣最南端的墾丁是熱帶天堂，以絕美白沙灘、珊瑚礁、壯觀海崖與熱鬧的海濱度假夜生活聞名。"
  },
  {
    id: 8,
    title: "赤崁樓",
    category: "culture",
    location: "台南市",
    coords: [22.9976, 120.2027],
    image: "https://images.unsplash.com/photo-1627894179375-926be55b4c95?auto=format&fit=crop&w=600&q=80",
    description: "又稱普羅民遮城，最初由荷蘭人於 1653 年興建，是融合荷蘭、明、清各代風格的重要歷史地標。"
  },
  {
    id: 9,
    title: "逢甲夜市",
    category: "nightmarket",
    location: "台中市",
    coords: [24.1786, 120.6450],
    image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=600&q=80",
    description: "緊鄰逢甲大學，是孕育眾多創意台灣街頭小吃的發源地，以新潮服飾攤位與洶湧人潮聞名。"
  }
];

export async function getPlacesByCounty(countyId: string): Promise<Place[]> {
  // If 'all', load all INITIAL_PLACES + Taipei smoking areas
  if (countyId === 'all') {
    try {
      const res = await fetch('/smoking_areas.json');
      if (!res.ok) {
        throw new Error('Failed to fetch Taipei smoking areas');
      }
      const smokingPlaces: Place[] = await res.json();
      return [...INITIAL_PLACES, ...smokingPlaces];
    } catch (error) {
      console.error('Error loading all places:', error);
      return INITIAL_PLACES;
    }
  }

  // Find the county configuration
  const countyObj = COUNTIES.find(c => c.id === countyId);
  if (!countyObj) return [];

  // Filter static attractions for this county
  const basePlaces = INITIAL_PLACES.filter(p => p.location === countyObj.name);

  // If Taipei, also fetch Taipei smoking areas
  if (countyId === 'taipei') {
    try {
      const res = await fetch('/smoking_areas.json');
      if (!res.ok) {
        throw new Error('Failed to fetch Taipei smoking areas');
      }
      const smokingPlaces: Place[] = await res.json();
      return [...basePlaces, ...smokingPlaces];
    } catch (error) {
      console.error('Error loading Taipei specific data:', error);
      return basePlaces;
    }
  }

  // Other counties return their static attractions
  return basePlaces;
}
