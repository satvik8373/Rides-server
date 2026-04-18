import axios from "axios";
import { env } from "../config/env.js";

export interface LocationSuggestion {
  id: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  lat?: number;
  lng?: number;
  source: "GOOGLE" | "OSM";
}

interface LocationBias {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  label: string;
  source: "GOOGLE" | "OSM";
}

export interface RouteGeometry {
  points: RoutePoint[];
  polyline?: string;
  distanceKm?: number;
  durationMinutes?: number;
  source: "GOOGLE" | "FALLBACK";
}

const buildSecondaryText = (fullText: string, primaryText: string): string | undefined => {
  const normalizedFull = fullText.trim();
  const normalizedPrimary = primaryText.trim();
  if (!normalizedFull || !normalizedPrimary) {
    return undefined;
  }
  if (normalizedFull === normalizedPrimary) {
    return undefined;
  }
  if (normalizedFull.startsWith(`${normalizedPrimary},`)) {
    return normalizedFull.slice(normalizedPrimary.length + 1).trim();
  }
  return normalizedFull;
};

export class LocationService {
  private readonly geocodeCache = new Map<string, GeocodedLocation | null>();
  private readonly routeCache = new Map<string, RouteGeometry | null>();
  
  // Popular cities in Gujarat for suggestions
  private readonly popularCities = [
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
    { name: "Gandhinagar", lat: 23.1815, lng: 72.6369 },
    { name: "Himatnagar", lat: 23.5877, lng: 72.9800 },
    { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
    { name: "Surat", lat: 21.1702, lng: 72.8311 },
    { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
    { name: "Jamnagar", lat: 22.4707, lng: 70.0883 },
    { name: "Bhavnagar", lat: 21.7645, lng: 72.1519 },
    { name: "Anand", lat: 22.5650, lng: 72.9289 },
    { name: "Kota", lat: 25.2138, lng: 75.8648 },
    { name: "Gota", lat: 23.2003, lng: 72.6286 }
  ];

  async autocomplete(query: string, bias?: LocationBias): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return this.getNearbyCities(bias);
    }

    try {
      const googleResults = await this.autocompleteWithGoogle(trimmed, bias);
      if (googleResults.length > 0) {
        return googleResults;
      }

      const osmResults = await this.autocompleteWithOpenStreetMap(trimmed, bias);
      if (osmResults.length > 0) {
        return osmResults;
      }

      // If no API results, check for typo matches with popular cities
      const typoCorrectedCities = this.suggestCitiesWithTypoTolerance(trimmed);
      if (typoCorrectedCities.length > 0) {
        return typoCorrectedCities;
      }

      // Fallback: return popular cities as suggestions
      return this.getNearbyCities(bias);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[LocationService] autocomplete error:", error instanceof Error ? error.message : error);
      return this.getNearbyCities(bias);
    }
  }

  private getNearbyCities(bias?: LocationBias): LocationSuggestion[] {
    if (!bias) {
      return this.popularCities.map((city) => ({
        id: city.name.toLowerCase(),
        primaryText: city.name,
        fullText: city.name,
        lat: city.lat,
        lng: city.lng,
        source: "OSM"
      }));
    }

    // Sort by distance from bias location
    const withDistance = this.popularCities.map((city) => ({
      ...city,
      distance: this.distanceKm({ lat: city.lat, lng: city.lng }, bias)
    }));

    return withDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8)
      .map((city) => ({
        id: city.name.toLowerCase(),
        primaryText: city.name,
        fullText: city.name,
        lat: city.lat,
        lng: city.lng,
        source: "OSM"
      }));
  }

  private suggestCitiesWithTypoTolerance(query: string): LocationSuggestion[] {
    const normalized = query.toLowerCase().trim();
    
    // Levenshtein distance for typo tolerance
    const getLevenshteinDistance = (a: string, b: string): number => {
      const aLen = a.length;
      const bLen = b.length;
      const matrix: number[][] = Array(bLen + 1)
        .fill(null)
        .map(() => Array(aLen + 1).fill(0));

      for (let i = 0; i <= aLen; i++) matrix[0][i] = i;
      for (let j = 0; j <= bLen; j++) matrix[j][0] = j;

      for (let j = 1; j <= bLen; j++) {
        for (let i = 1; i <= aLen; i++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1,
            matrix[j - 1][i - 1] + cost
          );
        }
      }

      return matrix[bLen][aLen];
    };

    const matches = this.popularCities
      .map((city) => {
        const distance = getLevenshteinDistance(normalized, city.name.toLowerCase());
        return { city, distance };
      })
      .filter(({ distance }) => distance <= 2) // Allow up to 2 character differences
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    return matches.map(({ city }) => ({
      id: city.name.toLowerCase(),
      primaryText: city.name,
      fullText: city.name,
      lat: city.lat,
      lng: city.lng,
      source: "OSM"
    }));
  }

  private distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const earthRadiusKm = 6371;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
    const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return earthRadiusKm * arc;
  }

  async geocode(query: string): Promise<GeocodedLocation | undefined> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey) ?? undefined;
    }

    const googleResult = await this.geocodeWithGoogle(trimmed);
    if (googleResult) {
      this.geocodeCache.set(cacheKey, googleResult);
      return googleResult;
    }

    const osmResult = await this.geocodeWithOpenStreetMap(trimmed);
    this.geocodeCache.set(cacheKey, osmResult ?? null);
    return osmResult;
  }

  async getRouteGeometry(from: string, to: string, existingPolyline?: string): Promise<RouteGeometry | undefined> {
    const fromText = from.trim();
    const toText = to.trim();
    if (!fromText || !toText) {
      return undefined;
    }

    if (existingPolyline?.trim()) {
      const decoded = this.decodePolyline(existingPolyline.trim());
      if (decoded.length >= 2) {
        return {
          points: decoded,
          polyline: existingPolyline.trim(),
          source: "GOOGLE"
        };
      }
    }

    const cacheKey = `${fromText.toLowerCase()}::${toText.toLowerCase()}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey) ?? undefined;
    }

    const googleRoute = await this.getRouteGeometryFromGoogle(fromText, toText);
    if (googleRoute) {
      this.routeCache.set(cacheKey, googleRoute);
      return googleRoute;
    }

    // Fallback to OpenRouteService
    const orsRoute = await this.getRouteGeometryFromOpenRouteService(fromText, toText);
    if (orsRoute) {
      this.routeCache.set(cacheKey, orsRoute);
      return orsRoute;
    }

    const [fromGeo, toGeo] = await Promise.all([this.geocode(fromText), this.geocode(toText)]);
    if (fromGeo && toGeo) {
      const fallbackRoute: RouteGeometry = {
        points: [
          { lat: fromGeo.lat, lng: fromGeo.lng },
          { lat: toGeo.lat, lng: toGeo.lng }
        ],
        source: "FALLBACK"
      };
      this.routeCache.set(cacheKey, fallbackRoute);
      return fallbackRoute;
    }

    this.routeCache.set(cacheKey, null);
    return undefined;
  }

  private async autocompleteWithGoogle(query: string, bias?: LocationBias): Promise<LocationSuggestion[]> {
    if (!env.GOOGLE_MAPS_API_KEY) {
      return [];
    }

    try {
      const response = await axios.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
        params: {
          input: query,
          key: env.GOOGLE_MAPS_API_KEY,
          components: "country:in",
          language: "en",
          ...(bias
            ? {
                location: `${bias.lat},${bias.lng}`,
                radius: 50_000
              }
            : {})
        },
        timeout: 10_000
      });

      const predictions = response.data?.predictions as
        | Array<{
            place_id?: string;
            description?: string;
            structured_formatting?: {
              main_text?: string;
              secondary_text?: string;
            };
          }>
        | undefined;

      if (!predictions?.length) {
        return [];
      }

      return predictions.slice(0, 8).map((item) => {
        const fullText = item.description?.trim() || "";
        const primaryText = item.structured_formatting?.main_text?.trim() || fullText;
        return {
          id: item.place_id || fullText,
          primaryText,
          secondaryText: item.structured_formatting?.secondary_text?.trim() || buildSecondaryText(fullText, primaryText),
          fullText,
          source: "GOOGLE" as const
        };
      });
    } catch {
      return [];
    }
  }

  private async autocompleteWithOpenStreetMap(query: string, bias?: LocationBias): Promise<LocationSuggestion[]> {
    try {
      const degreeDelta = 0.9;
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query,
          format: "jsonv2",
          addressdetails: 1,
          limit: 8,
          countrycodes: "in",
          ...(bias
            ? {
                viewbox: `${bias.lng - degreeDelta},${bias.lat + degreeDelta},${bias.lng + degreeDelta},${bias.lat - degreeDelta}`
              }
            : {})
        },
        headers: {
          "User-Agent": "AhmedabadCar/1.0"
        },
        timeout: 10_000
      });

      const rows = response.data as Array<{
        place_id?: number | string;
        display_name?: string;
        name?: string;
        lat?: string;
        lon?: string;
      }>;

      if (!Array.isArray(rows) || rows.length === 0) {
        return [];
      }

      return rows.map((item) => {
        const fullText = item.display_name?.trim() || "";
        const primaryText = item.name?.trim() || fullText.split(",")[0]?.trim() || fullText;
        return {
          id: String(item.place_id ?? fullText),
          primaryText,
          secondaryText: buildSecondaryText(fullText, primaryText),
          fullText,
          lat: item.lat ? Number(item.lat) : undefined,
          lng: item.lon ? Number(item.lon) : undefined,
          source: "OSM" as const
        };
      });
    } catch {
      return [];
    }
  }

  private async geocodeWithGoogle(query: string): Promise<GeocodedLocation | undefined> {
    if (!env.GOOGLE_MAPS_API_KEY) {
      return undefined;
    }

    try {
      const response = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address: query,
          key: env.GOOGLE_MAPS_API_KEY,
          components: "country:IN"
        },
        timeout: 8_000
      });

      const firstResult = response.data?.results?.[0] as
        | {
            formatted_address?: string;
            geometry?: { location?: { lat?: number; lng?: number } };
          }
        | undefined;

      const lat = firstResult?.geometry?.location?.lat;
      const lng = firstResult?.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return undefined;
      }

      return {
        lat,
        lng,
        label: firstResult?.formatted_address?.trim() || query,
        source: "GOOGLE"
      };
    } catch {
      return undefined;
    }
  }

  private async geocodeWithOpenStreetMap(query: string): Promise<GeocodedLocation | undefined> {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          q: query,
          format: "jsonv2",
          addressdetails: 1,
          limit: 1,
          countrycodes: "in"
        },
        headers: {
          "User-Agent": "AhmedabadCar/1.0"
        },
        timeout: 8_000
      });

      const firstResult = response.data?.[0] as
        | {
            display_name?: string;
            lat?: string;
            lon?: string;
          }
        | undefined;
      const lat = firstResult?.lat ? Number(firstResult.lat) : undefined;
      const lng = firstResult?.lon ? Number(firstResult.lon) : undefined;
      if (typeof lat !== "number" || Number.isNaN(lat) || typeof lng !== "number" || Number.isNaN(lng)) {
        return undefined;
      }

      return {
        lat,
        lng,
        label: firstResult?.display_name?.trim() || query,
        source: "OSM"
      };
    } catch {
      return undefined;
    }
  }

  private async getRouteGeometryFromGoogle(from: string, to: string): Promise<RouteGeometry | undefined> {
    if (!env.GOOGLE_MAPS_API_KEY) {
      return undefined;
    }

    try {
      const response = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: {
          origin: from,
          destination: to,
          key: env.GOOGLE_MAPS_API_KEY,
          mode: "driving",
          alternatives: false,
          region: "in"
        },
        timeout: 10_000
      });

      const firstRoute = response.data?.routes?.[0] as
        | {
            overview_polyline?: { points?: string };
            legs?: Array<{
              distance?: { value?: number };
              duration?: { value?: number };
            }>;
          }
        | undefined;
      const encoded = firstRoute?.overview_polyline?.points?.trim();
      if (!encoded) {
        return undefined;
      }

      const points = this.decodePolyline(encoded);
      if (points.length < 2) {
        return undefined;
      }

      const leg = firstRoute?.legs?.[0];
      return {
        points,
        polyline: encoded,
        distanceKm: typeof leg?.distance?.value === "number" ? leg.distance.value / 1000 : undefined,
        durationMinutes: typeof leg?.duration?.value === "number" ? leg.duration.value / 60 : undefined,
        source: "GOOGLE"
      };
    } catch {
      return undefined;
    }
  }

  private async getRouteGeometryFromOpenRouteService(from: string, to: string): Promise<RouteGeometry | undefined> {
    const orsApiKey = env.ORS_API_KEY;

    if (!orsApiKey) {
      return undefined;
    }

    try {
      // First geocode both locations
      const [fromGeo, toGeo] = await Promise.all([this.geocode(from), this.geocode(to)]);

      if (!fromGeo || !toGeo) {
        return undefined;
      }

      const response = await axios.post(
        "https://api.openrouteservice.org/v2/directions/driving-car",
        {
          coordinates: [[fromGeo.lng, fromGeo.lat], [toGeo.lng, toGeo.lat]]
        },
        {
          headers: {
            Authorization: orsApiKey,
            "Content-Type": "application/json"
          },
          timeout: 10_000
        }
      );

      const firstRoute = response.data?.routes?.[0];
      if (!firstRoute?.geometry?.coordinates) {
        return undefined;
      }

      const coordinates = firstRoute.geometry.coordinates as Array<[number, number]>;
      const points = coordinates.map(([lng, lat]) => ({
        lat,
        lng
      }));

      if (points.length < 2) {
        return undefined;
      }

      const summary = firstRoute.summary;
      return {
        points,
        distanceKm: typeof summary?.distance === "number" ? summary.distance / 1000 : undefined,
        durationMinutes: typeof summary?.duration === "number" ? summary.duration / 60 : undefined,
        source: "GOOGLE"
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[LocationService] OpenRouteService error:", error instanceof Error ? error.message : error);
      return undefined;
    }
  }

  private decodePolyline(encoded: string): RoutePoint[] {
    const points: RoutePoint[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return points;
  }
}

export const locationService = new LocationService();
