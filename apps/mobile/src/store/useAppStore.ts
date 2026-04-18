import type {
  ActiveTripResponse,
  BookingChatResponse,
  BookingWithDetails,
  ChatMessage,
  DriverProfile,
  RideWithDriver,
  UserProfile,
  UserMode,
  WalletResponse
} from "@ahmedabadcar/shared";
import { UserMode as UserModeEnum } from "@ahmedabadcar/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const REFRESH_TOKEN_KEY = "ahmedabadcar.refresh_token";

interface AppStore {
  hydrated: boolean;
  secureTokenLoaded: boolean;
  modeInitialized: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: UserProfile;
  driverProfile?: DriverProfile;
  mode: UserMode;
  locationPermission: "unknown" | "granted" | "denied";
  currentLocation?: {
    lat: number;
    lng: number;
  };
  currentLocationLabel?: string;
  loading: boolean;
  searchResults: RideWithDriver[];
  selectedRide?: RideWithDriver;
  activeBooking?: BookingWithDetails;
  activeTrip?: ActiveTripResponse;
  chat?: BookingChatResponse;
  wallet?: WalletResponse;
  setHydrated: (value: boolean) => void;
  setSecureTokenLoaded: (value: boolean) => void;
  setAuth: (payload: { accessToken: string; refreshToken: string; user: UserProfile; driverProfile: DriverProfile }) => void;
  clearAuth: () => void;
  setMode: (mode: UserMode) => void;
  completeModeSelection: () => void;
  setLoading: (loading: boolean) => void;
  setSearchResults: (rides: RideWithDriver[]) => void;
  setSelectedRide: (ride?: RideWithDriver) => void;
  setActiveBooking: (booking?: BookingWithDetails) => void;
  setActiveTrip: (trip?: ActiveTripResponse) => void;
  setLocationPermission: (permission: "unknown" | "granted" | "denied") => void;
  setCurrentLocation: (payload?: { lat: number; lng: number; label?: string }) => void;
  clearCurrentLocation: () => void;
  setWallet: (wallet: WalletResponse) => void;
  setChat: (chat: BookingChatResponse) => void;
  appendChatMessage: (message: ChatMessage) => void;
  patchUser: (patch: Partial<UserProfile>) => void;
  patchDriverProfile: (patch: Partial<DriverProfile>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hydrated: false,
      secureTokenLoaded: false,
      modeInitialized: false,
      mode: UserModeEnum.Rider,
      locationPermission: "unknown",
      loading: false,
      searchResults: [],
      setHydrated: (value) => set({ hydrated: value }),
      setSecureTokenLoaded: (value) => set({ secureTokenLoaded: value }),
      setAuth: ({ accessToken, refreshToken, user, driverProfile }) =>
        set(() => {
          void SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
          return {
          accessToken,
          refreshToken,
          user,
          driverProfile,
          mode: user.preferredMode,
          modeInitialized: Boolean(user.fullName?.trim())
          };
        }),
      clearAuth: () =>
        set(() => {
          void SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          return {
          accessToken: undefined,
          refreshToken: undefined,
          user: undefined,
          driverProfile: undefined,
          selectedRide: undefined,
          searchResults: [],
          activeBooking: undefined,
          activeTrip: undefined,
          wallet: undefined,
          chat: undefined,
          modeInitialized: false
          };
        }),
      setMode: (mode) =>
        set((state) => ({
          mode,
          user: state.user ? { ...state.user, preferredMode: mode } : state.user
        })),
      completeModeSelection: () => set({ modeInitialized: true }),
      setLoading: (loading) => set({ loading }),
      setSearchResults: (rides) => set({ searchResults: rides }),
      setSelectedRide: (ride) => set({ selectedRide: ride }),
      setActiveBooking: (booking) => set({ activeBooking: booking }),
      setActiveTrip: (trip) => set({ activeTrip: trip }),
      setLocationPermission: (permission) => set({ locationPermission: permission }),
      setCurrentLocation: (payload) =>
        set({
          currentLocation: payload ? { lat: payload.lat, lng: payload.lng } : undefined,
          currentLocationLabel: payload?.label
        }),
      clearCurrentLocation: () =>
        set({
          currentLocation: undefined,
          currentLocationLabel: undefined
        }),
      setWallet: (wallet) => set({ wallet }),
      setChat: (chat) => set({ chat }),
      appendChatMessage: (message) =>
        set((state) => ({
          chat: state.chat
            ? {
                ...state.chat,
                messages: [...state.chat.messages, message]
              }
            : {
                bookingId: message.bookingId,
                messages: [message]
              }
        })),
      patchUser: (patch) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...patch } : state.user
        })),
      patchDriverProfile: (patch) =>
        set((state) => ({
          driverProfile: state.driverProfile ? { ...state.driverProfile, ...patch } : state.driverProfile
        }))
    }),
    {
      name: "ahmedabadcar-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        driverProfile: state.driverProfile,
        mode: state.mode,
        modeInitialized: state.modeInitialized,
        locationPermission: state.locationPermission,
        currentLocation: state.currentLocation,
        currentLocationLabel: state.currentLocationLabel
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY).then((refreshToken) => {
          if (refreshToken) {
            useAppStore.setState({ refreshToken });
          }
          useAppStore.setState({ secureTokenLoaded: true });
        });
      }
    }
  )
);
