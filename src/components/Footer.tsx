import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-800 py-6 text-center text-sm text-gray-500">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/terms" className="hover:text-gray-300 transition-colors">
          Terms of Service
        </Link>
        <span aria-hidden className="text-gray-700">
          ·
        </span>
        <Link href="/privacy" className="hover:text-gray-300 transition-colors">
          Privacy Policy
        </Link>
      </nav>
      <p className="mt-2 text-gray-600">
        Prophet, operated by Cassandra Laboratories Foundation, Inc.
      </p>
    </footer>
  );
}
