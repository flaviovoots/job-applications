// "n / limit" under a long-text field, red once n is over the limit. The
// server's 400 stays the final check.
export default function CharCounter({
  n,
  limit,
}: {
  n: number;
  limit: number;
}) {
  const over = n > limit;
  return (
    <p
      className={`text-right text-sm ${over ? "text-red-700" : "text-gray-600"}`}
    >
      {n.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}
    </p>
  );
}
