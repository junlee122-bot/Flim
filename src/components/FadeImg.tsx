"use client";

import { useRef, useState } from "react";

// 로드 완료 시 페이드인되는 이미지. 배경(ink-800)이 placeholder 역할.
export default function FadeImg({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      onLoad={() => setLoaded(true)}
      // 캐시된 이미지가 onLoad 전에 complete 인 경우 대비
      onError={() => setLoaded(true)}
      data-loaded={loaded || ref.current?.complete ? "true" : "false"}
      className={`img-fade ${className}`}
    />
  );
}
