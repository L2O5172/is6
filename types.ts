
export interface Profile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface Liff {
  init(config: { liffId: string; }): Promise<void>;
  isLoggedIn(): boolean;
  login(loginConfig?: { redirectUri?: string; }): void;
  getProfile(): Promise<Profile>;
  closeWindow(): void;
}

declare global {
  interface Window {
    liff: Liff;
  }
}
