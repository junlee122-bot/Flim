"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getRatings,
  getWatched,
  setRating as lsSetRating,
  removeRating as lsRemoveRating,
  setWatched as lsSetWatched,
  type RatedMovie,
} from "@/lib/userdata";

type MovieMeta = { title: string; posterUrl: string | null; year: number | null };

type Ctx = {
  ready: boolean;
  ratings: Record<string, RatedMovie>;
  watched: number[];
  rate: (tmdbId: number, rating: number, meta: MovieMeta) => void;
  unrate: (tmdbId: number) => void;
  toggleWatched: (tmdbId: number, meta?: MovieMeta) => void;
};

const UserDataCtx = createContext<Ctx | null>(null);
export const useUserData = () => {
  const c = useContext(UserDataCtx);
  if (!c) throw new Error("useUserData must be used within UserDataProvider");
  return c;
};

// 별점/봤어요는 브라우저 localStorage 에만 저장한다. (서버·로그인 없음)
export default function UserDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [ratings, setRatings] = useState<Record<string, RatedMovie>>({});
  const [watched, setWatchedState] = useState<number[]>([]);

  // 로컬 상태 로드
  useEffect(() => {
    setRatings(getRatings());
    setWatchedState(getWatched());
    setReady(true);
  }, []);

  function rate(tmdbId: number, rating: number, meta: MovieMeta) {
    const rec: RatedMovie = { tmdbId, rating, at: Date.now(), ...meta };
    lsSetRating(rec);
    setRatings((p) => ({ ...p, [tmdbId]: rec }));
  }

  function unrate(tmdbId: number) {
    lsRemoveRating(tmdbId);
    setRatings((p) => {
      const n = { ...p };
      delete n[tmdbId];
      return n;
    });
  }

  function toggleWatched(tmdbId: number) {
    const has = watched.includes(tmdbId);
    const next = has ? watched.filter((x) => x !== tmdbId) : [...watched, tmdbId];
    lsSetWatched(next);
    setWatchedState(next);
  }

  return (
    <UserDataCtx.Provider
      value={{ ready, ratings, watched, rate, unrate, toggleWatched }}
    >
      {children}
    </UserDataCtx.Provider>
  );
}
