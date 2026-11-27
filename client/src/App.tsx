import { useMutation } from "@tanstack/react-query";
import { Link, Route, Routes } from "react-router";
import SignedOutBanner from "./components/SignedOutBanner";
import ApplicationFormPage from "./pages/ApplicationFormPage";
import DetailPage from "./pages/DetailPage";
import ListPage from "./pages/ListPage";
import NotFoundPage from "./pages/NotFoundPage";
import SignInPage from "./pages/SignInPage";
import { signOut, useSession } from "./session";

function Header({ email }: { email: string }) {
  // signOut throws when the POST fails; the mutation catches it, and the
  // header says so while the page stays signed in.
  const signOutMutation = useMutation({ mutationFn: signOut });

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-x-4 gap-y-2 p-4">
        <Link to="/" className="mr-auto font-semibold">
          Job Applications Tracker
        </Link>
        <Link to="/applications/new" className="text-sm underline">
          New
        </Link>
        <span className="text-sm text-gray-700">{email}</span>
        <button
          type="button"
          onClick={() => signOutMutation.mutate()}
          disabled={signOutMutation.isPending}
          className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
        >
          Sign out
        </button>
        {signOutMutation.isError && (
          <p role="alert" className="w-full text-right text-sm text-red-700">
            Couldn't sign out. Try again.
          </p>
        )}
      </div>
    </header>
  );
}

function Unreachable({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 p-4">
      <h1 className="text-2xl font-semibold">Job Applications Tracker</h1>
      <p role="alert">Couldn't reach the server.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
      >
        Try again
      </button>
    </main>
  );
}

export default function App() {
  const { data: session, error, refetch, isFetching } = useSession();

  // Data first: once ['me'] holds a session, a failed refetch keeps the page,
  // so a half-filled form is never swapped out.
  if (session === undefined) {
    if (error) {
      return (
        <Unreachable onRetry={() => void refetch()} retrying={isFetching} />
      );
    }
    return null;
  }

  if (session === null) return <SignInPage />;

  return (
    <>
      {session.signedOut && <SignedOutBanner />}
      <Header email={session.email} />
      <main className="mx-auto max-w-3xl p-4">
        <Routes>
          <Route path="/" element={<ListPage />} />
          <Route path="/applications/new" element={<ApplicationFormPage />} />
          <Route path="/applications/:id" element={<DetailPage />} />
          <Route
            path="/applications/:id/edit"
            element={<ApplicationFormPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
