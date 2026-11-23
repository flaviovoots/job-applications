// The parts of Google Identity Services that this app calls. Names follow
// https://developers.google.com/identity/gsi/web/reference/js-reference

export interface CredentialResponse {
  // The ID token (a JWT) that POST /auth/google verifies.
  credential: string;
}

export interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  ux_mode?: "popup" | "redirect";
}

export interface GsiButtonConfiguration {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}

declare global {
  interface Window {
    // Missing until the async script in index.html has loaded.
    google?: {
      accounts: {
        id: {
          initialize(config: IdConfiguration): void;
          renderButton(
            parent: HTMLElement,
            options: GsiButtonConfiguration,
          ): void;
        };
      };
    };
    // The script calls this once it has loaded, if the page has set it.
    onGoogleLibraryLoad?: () => void;
  }
}
