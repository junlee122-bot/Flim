import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-bone/10">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="headline text-xl">
              FLIM<span className="text-accent">.</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              씨네필을 위한 영화 큐레이션·비평 아카이브. 한 작품의 정보·평점·수상·평론을
              한 화면에 정리합니다.
            </p>
          </div>

          <div className="flex gap-12 text-sm">
            <div className="space-y-2">
              <p className="kicker mb-3">둘러보기</p>
              <Link href="/search" className="block text-muted link-underline">
                검색
              </Link>
              <Link href="/#curations" className="block text-muted link-underline">
                큐레이션
              </Link>
              <Link href="/admin" className="block text-muted link-underline">
                관리자
              </Link>
            </div>
            <div className="space-y-2">
              <p className="kicker mb-3">데이터</p>
              <span className="block text-muted">TMDb · 메타데이터</span>
              <span className="block text-muted">OMDb · 외부 평점</span>
              <span className="block text-muted">KOFIC · 한국영화</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-bone/10 pt-6 text-xs leading-relaxed text-faint">
          <p>
            평론은 저작권·이용약관 준수를 위해 짧은 인용/요약과 원문 링크만
            제공합니다. 평론 전문은 수집하지 않습니다.
          </p>
          <p className="mt-1">© {new Date().getFullYear()} FLIM. Built for cinephiles.</p>
        </div>
      </div>
    </footer>
  );
}
