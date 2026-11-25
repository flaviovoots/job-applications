import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <Link to="/" className="underline">
        Back to the list
      </Link>
    </div>
  );
}
