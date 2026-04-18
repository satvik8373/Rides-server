import axios from "axios";
import { env } from "../config/env.js";

export class FareService {
  async getSuggestedPrice(from: string, to: string, seats: number): Promise<number> {
    // Fallback estimate for offline mode.
    const fallback = Math.max(120, 180 + seats * 40);
    if (!env.GOOGLE_MAPS_API_KEY) {
      return fallback;
    }

    try {
      const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
        params: {
          origins: from,
          destinations: to,
          key: env.GOOGLE_MAPS_API_KEY
        },
        timeout: 10_000
      });

      const meters = response.data?.rows?.[0]?.elements?.[0]?.distance?.value as number | undefined;
      if (!meters) {
        return fallback;
      }
      const kilometers = meters / 1000;
      const suggested = Math.round((kilometers * 7.5 + 70) / Math.max(seats, 1));
      return Math.max(80, suggested);
    } catch {
      return fallback;
    }
  }
}

export const fareService = new FareService();

