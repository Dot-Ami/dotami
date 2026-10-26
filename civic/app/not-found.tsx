import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded border border-open bg-open-bg p-4">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-1">There is no page here. Nothing has been guessed to fill it.</p>
      <p className="mt-2">
        <Link href="/">Find an issue</Link>
      </p>
    </div>
  );
}
