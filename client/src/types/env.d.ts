// Merges with ImportMetaEnv from vite/client, so this file must stay a script
// (no import or export). envPrefix in vite.config.ts exposes the variable.
interface ImportMetaEnv {
  readonly GOOGLE_CLIENT_ID: string;
}
