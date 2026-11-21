import helmet from "helmet";

const googleSignIn = "https://accounts.google.com/gsi/";

export function securityHeaders(): ReturnType<typeof helmet> {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", googleSignIn],
        frameSrc: ["'self'", googleSignIn],
        connectSrc: ["'self'", googleSignIn],
        styleSrc: ["'self'", googleSignIn],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Google's button checks the page's origin, which no-referrer hides.
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });
}
