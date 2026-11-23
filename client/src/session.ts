import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiError, apiFetch } from "./api";
import { queryClient } from "./queryClient";

// ['me'] holds one of four states: undefined while loading; null when never
// signed in (SignInPage shows); { email } when signed in; and
// { email, signedOut: true } when the session ended mid-use (the banner shows
// above the page).
export type Session = { email: string; signedOut?: true } | null;

export const meKey = ["me"] as const;

// "refused": a 403, the account isn't on the allowlist. "failed": anything
// else, such as a bad token or an unreachable server.
export type SignInError = "refused" | "failed";

export const signInErrorKey = ["signInError"] as const;

async function fetchMe(): Promise<Session> {
  try {
    return await apiFetch<{ email: string }>("/api/me");
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    // apiFetch has already called markSignedOut(), so an email that was
    // signed in stays, marked signed out. With no email, there is no session.
    return queryClient.getQueryData<Session>(meKey) ?? null;
  }
}

export function useSession() {
  return useQuery({ queryKey: meKey, queryFn: fetchMe });
}

// apiFetch calls this on a 401 from /api/*. It changes ['me'] only while it
// holds an email (an updater that returns undefined leaves the cache alone).
export function markSignedOut(): void {
  queryClient.setQueryData<Session>(meKey, (current) =>
    current ? { email: current.email, signedOut: true } : current,
  );
}

// Google's button calls this with the ID token. It never throws: a failure is
// stored under ['signInError'], which SignInPage and SignedOutBanner read.
export async function signInWithCredential(credential: string): Promise<void> {
  queryClient.setQueryData<SignInError | null>(signInErrorKey, null);

  let email: string;
  try {
    ({ email } = await apiFetch<{ email: string }>("/auth/google", {
      method: "POST",
      body: { credential },
    }));
  } catch (err) {
    const refused = err instanceof ApiError && err.status === 403;
    queryClient.setQueryData<SignInError | null>(
      signInErrorKey,
      refused ? "refused" : "failed",
    );
    return;
  }

  // Typed first: TypeScript 7 rejects an object literal here, because
  // Session includes null.
  const signedIn: Session = { email };
  queryClient.setQueryData<Session>(meKey, signedIn);
  // Active queries load again now (say, a list that got a 401 while signed
  // out); inactive ones are marked stale and load when next used.
  await queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] !== meKey[0],
  });
}

export function useSignInError(): SignInError | null {
  // Never fetched (skipToken): only signInWithCredential writes it.
  const { data } = useQuery<SignInError | null>({
    queryKey: signInErrorKey,
    queryFn: skipToken,
  });
  return data ?? null;
}

// The header's Sign out button calls this. A failed POST throws and leaves the
// cache alone: the session cookie may still be valid, so the page mustn't
// look signed out.
export async function signOut(): Promise<void> {
  await apiFetch<void>("/auth/logout", { method: "POST" });
  queryClient.setQueryData<Session>(meKey, null);
  // Clears the cache except ['me']: clear() would remove ['me'] too, and the
  // hooks still reading it would keep showing the email.
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== meKey[0],
  });
}
