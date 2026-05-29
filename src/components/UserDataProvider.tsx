"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
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
  user: User | null;
  ready: boolean;
  ratings: Record<string, RatedMovie>;
  watched: number[];
  rate: (tmdbId: number, rating: number, meta: MovieMeta) => void;
  unrate: (tmdbId: number) => void;
  toggleWatched: (tmdbId: number, meta?: MovieMeta) => void;
  signIn: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
};

const UserDataCtx = createContext<Ctx | null>(null);
export const useUserData = () => {
  const c = useContext(UserDataCtx);
  if (!c) throw new Error("useUserData must be used within UserDataProvider");
  return c;
};

export default function UserDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = getSupabaseBrowser();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [ratings, setRatings] = useState<Record<string, RatedMovie>>({});
  const [watched, setWatchedState] = useState<number[]>([]);
  const mergedFor = useRef<string | null>(null);

  // 로컬 상태 로드
  useEffect(() => {
    setRatings(getRatings());
    setWatchedState(getWatched());
  }, []);

  // 세션 추적 + 로그인 시 서버 동기화
  useEffect(() => {
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  // 로그인되면: 로컬 데이터를 서버로 병합 → 서버 전체를 다시 읽어 상태로
  useEffect(() => {
    if (!sb || !user) return;
    if (mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    (async () => {
      const localRatings = Object.values(getRatings());
      const localWatched = getWatched();
      // upsert 로컬 → 서버
      const rows = new Map<number, any>();
      for (const r of localRatings)
        rows.set(r.tmdbId, {
          user_id: user.id,
          tmdb_id: r.tmdbId,
          title: r.title,
          poster_url: r.posterUrl,
          year: r.year,
          rating: r.rating,
          watched: localWatched.includes(r.tmdbId),
        });
      for (const id of localWatched) {
        if (!rows.has(id))
          rows.set(id, { user_id: user.id, tmdb_id: id, watched: true });
        else rows.get(id).watched = true;
      }
      if (rows.size > 0)
        await sb.from("user_movies").upsert([...rows.values()], {
          onConflict: "user_id,tmdb_id",
        });
      // 서버 전체 로드
      const { data } = await sb
        .from("user_movies")
        .select("*")
        .eq("user_id", user.id);
      const nextRatings: Record<string, RatedMovie> = {};
      const nextWatched: number[] = [];
      for (const row of data ?? []) {
        if (row.rating != null)
          nextRatings[row.tmdb_id] = {
            tmdbId: row.tmdb_id,
            title: row.title ?? "",
            posterUrl: row.poster_url ?? null,
            year: row.year ?? null,
            rating: Number(row.rating),
            at: new Date(row.updated_at ?? Date.now()).getTime(),
          };
        if (row.watched) nextWatched.push(row.tmdb_id);
      }
      setRatings(nextRatings);
      setWatchedState(nextWatched);
      // 로컬도 서버 기준으로 갱신(미러)
      localStorage.setItem("flim_ratings", JSON.stringify(nextRatings));
      lsSetWatched(nextWatched);
    })();
  }, [sb, user]);

  function rate(tmdbId: number, rating: number, meta: MovieMeta) {
    const rec: RatedMovie = { tmdbId, rating, at: Date.now(), ...meta };
    lsSetRating(rec);
    setRatings((p) => ({ ...p, [tmdbId]: rec }));
    if (sb && user)
      sb.from("user_movies")
        .upsert(
          {
            user_id: user.id,
            tmdb_id: tmdbId,
            title: meta.title,
            poster_url: meta.posterUrl,
            year: meta.year,
            rating,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,tmdb_id" },
        )
        .then(() => {});
  }

  function unrate(tmdbId: number) {
    lsRemoveRating(tmdbId);
    setRatings((p) => {
      const n = { ...p };
      delete n[tmdbId];
      return n;
    });
    if (sb && user)
      sb.from("user_movies")
        .update({ rating: null })
        .eq("user_id", user.id)
        .eq("tmdb_id", tmdbId)
        .then(() => {});
  }

  function toggleWatched(tmdbId: number, meta?: MovieMeta) {
    const has = watched.includes(tmdbId);
    const next = has ? watched.filter((x) => x !== tmdbId) : [...watched, tmdbId];
    lsSetWatched(next);
    setWatchedState(next);
    if (sb && user)
      sb.from("user_movies")
        .upsert(
          {
            user_id: user.id,
            tmdb_id: tmdbId,
            title: meta?.title,
            poster_url: meta?.posterUrl,
            year: meta?.year,
            watched: !has,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,tmdb_id" },
        )
        .then(() => {});
  }

  async function signIn(email: string): Promise<string> {
    if (!sb) return "로그인이 설정되지 않았습니다.";
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/my` },
    });
    return error ? error.message : "ok";
  }

  async function signOut() {
    if (sb) await sb.auth.signOut();
    mergedFor.current = null;
    setUser(null);
  }

  return (
    <UserDataCtx.Provider
      value={{ user, ready, ratings, watched, rate, unrate, toggleWatched, signIn, signOut }}
    >
      {children}
    </UserDataCtx.Provider>
  );
}
