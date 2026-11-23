import GoogleButton from "../components/GoogleButton";
import {
  type SignInError as SignInErrorCode,
  useSignInError,
} from "../session";

const MESSAGES: Record<SignInErrorCode, string> = {
  refused: "This Google account is not allowed to use this app.",
  failed: "Sign-in failed. Try again.",
};

// Exported so SignedOutBanner shows the same text after a failed re-sign-in.
export function SignInError() {
  const error = useSignInError();
  if (!error) return null;
  return (
    <p role="alert" className="text-red-700">
      {MESSAGES[error]}
    </p>
  );
}

export default function SignInPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 p-4">
      <h1 className="text-2xl font-semibold">Job Applications Tracker</h1>
      <GoogleButton />
      <SignInError />
    </main>
  );
}
