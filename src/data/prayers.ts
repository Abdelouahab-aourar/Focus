import rawData from "./data.json";

export type RawCommuneData = {
  id: number;
  wilaya: string;
  commune: string;
  latitude: number;
  longitude: number;
};

export type Commune = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type Wilaya = {
  id: number;
  name: string;
  communes: Commune[];
};

export type PrayerTimes = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

const flatData = rawData as RawCommuneData[];

// Group communes under their respective wilayas dynamically
export const WILAYAS: Wilaya[] = Array.from(
  new Set(flatData.map((item) => item.wilaya))
).map((wilayaName) => {
  const matchingItems = flatData.filter((item) => item.wilaya === wilayaName);
  return {
    id: matchingItems[0]?.id ?? 1,
    name: wilayaName,
    communes: matchingItems.map((item, idx) => ({
      id: `${item.id}-${idx}`,
      name: item.commune,
      latitude: item.latitude,
      longitude: item.longitude,
    })),
  };
});