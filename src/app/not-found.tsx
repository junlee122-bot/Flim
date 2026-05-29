import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="kicker">404</p>
      <h1 className="headline mt-4 text-4xl sm:text-5xl">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-4 max-w-sm text-pretty text-muted">
        존재하지 않거나 이동된 페이지입니다. 다른 영화를 찾아보시겠어요?
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn btn-primary">
          홈으로
        </Link>
        <Link href="/search" className="btn btn-ghost">
          영화 검색
        </Link>
      </div>
    </div>
  );
}
