import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <h2 className="text-center text-2xl font-bold">
        Sorry! Looks like we couldn&apos;t find what you were looking for.{" "}
        <Link href="/pos" className="text-brand">
          Go Back
        </Link>
      </h2>
    </div>
  );
}
