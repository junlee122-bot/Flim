import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="group inline-flex items-baseline gap-2">
              <span className="headline text-xl">
                FLIM<span className="text-accent">.</span>
              </span>
              <span className="text-xs text-faint">씨네필의 영화 서재</span>
            </Link>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted">
              한 작품의 정보·평점·수상·평론을 한 화면에. 취향으로 고르고
              평론으로 음미하는 영화 아카이브.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="kicker mb-3 text-faint">둘러보기</p>
            <Link href="/pick" className="block w-fit text-muted link-underline">
              오늘 뭐 볼까
            </Link>
            <Link href="/browse" className="block w-fit text-muted link-underline">
              전체 카탈로그
            </Link>
            <Link href="/curations" className="block w-fit text-muted link-underline">
              큐레이션
            </Link>
            <Link href="/search" className="block w-fit text-muted link-underline">
              검색
            </Link>
            <Link href="/my" className="block w-fit text-muted link-underline">
              마이 페이지
            </Link>
          </div>

          <div className="space-y-2.5 text-sm">
            <p className="kicker mb-3 text-faint">데이터</p>
            <span className="block text-muted">TMDb · 메타데이터</span>
            <span className="block text-muted">OMDb · 외부 평점</span>
            <span className="block text-muted">KOFIC · 한국영화</span>
            <span className="block text-muted">씨네21 · 평론가 별점</span>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-bone/10 pt-6 text-xs leading-relaxed text-faint sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-pretty">
            평론은 저작권·이용약관 준수를 위해 짧은 인용·요약과 원문 링크만
            제공하며, 전문은 수집하지 않습니다.
          </p>
          <p className="shrink-0">© {year} FLIM</p>
        </div>
      </div>
    </footer>
  );
}
