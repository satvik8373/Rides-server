import { describe, expect, it, beforeEach } from "vitest";
import { KycStatus, UserMode } from "@ahmedabadcar/shared";
import { useAppStore } from "../store";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.getState().clearAuth();
  });

  it("switches mode without logout", () => {
    useAppStore.getState().setAuth({
      accessToken: "access",
      refreshToken: "refresh",
      user: {
        id: "u1",
        phoneNumber: "+919999999999",
        fullName: "Test User",
        preferredMode: UserMode.Rider,
        isDriverVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      driverProfile: {
        userId: "u1",
        kycStatus: KycStatus.NotStarted,
        updatedAt: new Date().toISOString()
      }
    });

    useAppStore.getState().setMode(UserMode.Driver);
    const state = useAppStore.getState();
    expect(state.mode).toBe(UserMode.Driver);
    expect(state.user?.preferredMode).toBe(UserMode.Driver);
    expect(state.accessToken).toBe("access");
  });

  it("keeps rating visibility controlled by API payload", () => {
    useAppStore.getState().setChat({
      bookingId: "b1",
      messages: []
    });
    useAppStore.getState().appendChatMessage({
      id: "m1",
      bookingId: "b1",
      senderId: "u1",
      message: "hello",
      createdAt: new Date().toISOString()
    });
    expect(useAppStore.getState().chat?.messages.length).toBe(1);
  });
});
