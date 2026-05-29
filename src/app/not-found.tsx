import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="kicker">404</p>
      <h1 className="headline mt-2 text-3xl">페이지를 찾을 수 없습니다</h1>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-accent hover:underline"
      >
        ← 홈으로
      </Link>
    </div>
  );
}
