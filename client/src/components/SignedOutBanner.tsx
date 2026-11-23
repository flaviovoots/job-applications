import { SignInError } from "../pages/SignInPage";
import GoogleButton from "./GoogleButton";

// App shows this above the current page while ['me'] is signed out, so it
// stays open after a failed re-sign-in (['me'] doesn't change) and closes
// after a successful one.
export default function SignedOutBanner() {
  return (
    <div role="status" className="border-b border-amber-300 bg-amber-50">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-2 p-4">
        <p className="font-medium">Signed out: sign in again</p>
        <GoogleButton />
        <SignInError />
      </div>
    </div>
  );
}
