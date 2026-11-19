import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold">ไม่พบหน้านี้</h1>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-accent-fg">กลับหน้าแรก</Link>
    </div>
  );
}
