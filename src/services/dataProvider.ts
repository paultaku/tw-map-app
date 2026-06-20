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
    name: 'All Taiwan',
    chineseName: '全國',
    center: [23.6978, 120.9605],
    zoom: 8,
    description: 'Explore national attractions across Taiwan.'
  },
  {
    id: 'taipei',
    name: 'Taipei City',
    chineseName: '台北市',
    center: [25.032969, 121.565426],
    zoom: 12,
    description: 'Capital city of Taiwan, a vibrant metropolis of innovation and culture.'
  },
  {
    id: 'new_taipei',
    name: 'New Taipei City',
    chineseName: '新北市',
    center: [25.016988, 121.462799],
    zoom: 11,
    description: 'The most populous city wrapping around Taipei, full of scenic spots.'
  },
  {
    id: 'taichung',
    name: 'Taichung City',
    chineseName: '台中市',
    center: [24.147736, 120.673648],
    zoom: 11,
    description: 'Cultural and economic hub of central Taiwan.'
  },
  {
    id: 'tainan',
    name: 'Tainan City',
    chineseName: '台南市',
    center: [22.999728, 120.227028],
    zoom: 11,
    description: 'Taiwan\'s oldest city and cultural capital, famous for food and heritage.'
  },
  {
    id: 'kaohsiung',
    name: 'Kaohsiung City',
    chineseName: '高雄市',
    center: [22.627278, 120.301435],
    zoom: 11,
    description: 'Major harbor city of southern Taiwan, known for its art and maritime vibes.'
  },
  {
    id: 'hualien',
    name: 'Hualien County',
    chineseName: '花蓮縣',
    center: [23.9772, 121.6044],
    zoom: 10,
    description: 'East coast gateway featuring breathtaking gorges and ocean views.'
  },
  {
    id: 'nantou',
    name: 'Nantou County',
    chineseName: '南投縣',
    center: [23.9037, 120.6860],
    zoom: 10,
    description: 'The only landlocked county in Taiwan, home to Sun Moon Lake.'
  },
  {
    id: 'pingtung',
    name: 'Pingtung County',
    chineseName: '屏東縣',
    center: [22.6723, 120.4883],
    zoom: 10,
    description: 'Southernmost county featuring tropical resorts and Kenting National Park.'
  }
];

export const INITIAL_PLACES: Place[] = [
  {
    id: 1,
    title: "Taipei 101",
    category: "culture",
    location: "Taipei City",
    coords: [25.0339, 121.5644],
    image: "https://images.unsplash.com/photo-1504618223053-559bdef9dd5a?auto=format&fit=crop&w=600&q=80",
    description: "Once the world's tallest building, Taipei 101 is an engineering marvel shaped like a giant bamboo stalk. It represents a fusion of traditional Asian aesthetics and modern sustainability."
  },
  {
    id: 2,
    title: "Taroko Gorge",
    category: "nature",
    location: "Hualien County",
    coords: [24.1593, 121.6212],
    image: "https://images.unsplash.com/photo-1596401057633-53103241f7e7?auto=format&fit=crop&w=600&q=80",
    description: "Taroko Gorge is a spectacular 19-km-long canyon carved by the Liwu River. Renowned for its sheer marble cliffs, rushing rapids, and deep tunnels winding through towering peaks."
  },
  {
    id: 3,
    title: "Sun Moon Lake",
    category: "nature",
    location: "Nantou County",
    coords: [23.8566, 120.9150],
    image: "https://images.unsplash.com/photo-1587303357597-8c3dc52e1858?auto=format&fit=crop&w=600&q=80",
    description: "Located in the heart of Taiwan, Sun Moon Lake is famous for its calm turquoise waters and surrounding emerald mountains. The east side resembles the sun, while the west side looks like a crescent moon."
  },
  {
    id: 4,
    title: "Jiufen Old Street",
    category: "culture",
    location: "New Taipei City",
    coords: [25.1099, 121.8452],
    image: "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=600&q=80",
    description: "A historic gold-mining town perched high on a coastal hillside. Its winding alleyways, traditional teahouses, and glowing red lanterns inspired classic visual aesthetics."
  },
  {
    id: 5,
    title: "Shilin Night Market",
    category: "nightmarket",
    location: "Taipei City",
    coords: [25.0879, 121.5241],
    image: "https://images.unsplash.com/photo-1570155308259-7104a37b38cb?auto=format&fit=crop&w=600&q=80",
    description: "One of the largest and most famous night markets in Taiwan. It is a labyrinth of food stalls serving signature street eats like giant fried chicken cutlets, bubble tea, and stinky tofu."
  },
  {
    id: 6,
    title: "Liuhe Night Market",
    category: "nightmarket",
    location: "Kaohsiung City",
    coords: [22.6314, 120.3021],
    image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=600&q=80",
    description: "Kaohsiung's oldest and most iconic night market. Famous for fresh seafood, salt-and-pepper crabs, papaya milk, and a highly accessible pedestrian-friendly street layout."
  },
  {
    id: 7,
    title: "Kenting National Park",
    category: "nature",
    location: "Pingtung County",
    coords: [21.9483, 120.7798],
    image: "https://images.unsplash.com/photo-1598285513685-64c9d961bdcf?auto=format&fit=crop&w=600&q=80",
    description: "Occupying the southern tip of Taiwan, Kenting is a tropical paradise known for its gorgeous white-sand beaches, coral reefs, dramatic sea cliffs, and vibrant beach resort nightlife."
  },
  {
    id: 8,
    title: "Chihkan Tower",
    category: "culture",
    location: "Tainan City",
    coords: [22.9976, 120.2027],
    image: "https://images.unsplash.com/photo-1627894179375-926be55b4c95?auto=format&fit=crop&w=600&q=80",
    description: "Also known as Fort Provintia, this outpost was originally built by the Dutch in 1653. It stands as a vital historical landmark showcasing Dutch, Ming, and Qing dynasty influences."
  },
  {
    id: 9,
    title: "Fengjia Night Market",
    category: "nightmarket",
    location: "Taichung City",
    coords: [24.1786, 120.6450],
    image: "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=600&q=80",
    description: "Adjacent to Feng Chia University, this bustling market is famous for being the birthplace of many creative Taiwanese street foods, trendy fashion stalls, and intense energetic crowds."
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
