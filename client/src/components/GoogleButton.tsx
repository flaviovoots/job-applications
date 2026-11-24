import { useEffect, useRef } from "react";
import { signInWithCredential } from "../session";
import type { GsiButtonConfiguration } from "../types/gsi";

const BUTTON: GsiButtonConfiguration = {
  type: "standard",
  theme: "outline",
  size: "large",
  text: "signin_with",
};

// Module state, so it lasts for the page load: initialize() sets Google's
// library up for the whole page, so it runs once, however many buttons mount.
// window.google is read on each call, not kept, so each test's fresh stub is
// the one that renders.
let ready: Promise<void> | undefined;

function whenLibraryReady(): Promise<void> {
  ready ??= new Promise<void>((resolve) => {
    // index.html loads the script with async, so it may arrive before React
    // mounts or after.
    if (window.google) resolve();
    else window.onGoogleLibraryLoad = () => resolve();
  }).then(() => {
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.GOOGLE_CLIENT_ID,
      callback: ({ credential }) => void signInWithCredential(credential),
      ux_mode: "popup",
    });
  });
  return ready;
}

export default function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = ref.current;
    // An unmounted button isn't rendered when the library arrives. This also
    // keeps StrictMode's extra effect run from rendering a second button.
    let mounted = true;
    void whenLibraryReady().then(() => {
      if (mounted && parent) {
        window.google?.accounts.id.renderButton(parent, BUTTON);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Before its iframe arrives, Google draws a placeholder button here whose
  // logo is sized by a <style> tag the CSP blocks. Unsized, the SVG fills the
  // width, so this sets the size the placeholder would have.
  return <div ref={ref} className="[&_svg]:size-[18px]" />;
}
