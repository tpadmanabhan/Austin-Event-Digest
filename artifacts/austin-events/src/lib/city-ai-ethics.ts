import cityAiEthicsData from "../../../../shared/city-ai-ethics.json";

export type CityAiEthicsReading = {
  title: string;
  source: string;
  href: string;
  note: string;
};

export type CityAiEthicsContent = {
  city: string;
  eyebrow: string;
  intro: string;
  readings: CityAiEthicsReading[];
  translations?: {
    ja?: {
      eyebrow: string;
      intro: string;
      readings: CityAiEthicsReading[];
    };
  };
};

export const CITY_AI_ETHICS = cityAiEthicsData as Record<string, CityAiEthicsContent>;
