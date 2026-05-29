/* eslint-disable @typescript-eslint/no-explicit-any */
// 유명작 50편 평론 후보 수집 — 오매칭 방지 위해 "안전 소스"만 사용.
//   허용: 왓챠피디아 /comments/ (단일 코멘트=한 영화), 언론의 명시 인용("…"라는 한줄평)
//   제외: 네이버 가나다순 한줄평 아카이브(인접 영화 오매칭 위험)
//   결과를 JSON 으로 출력 → 사람이 검토 후 import.
// 실행: node scripts/collect-50.mjs > /tmp/c50.json

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".seed-env");
if (existsSync(envPath)) for (const line of readFileSync(envPath,"utf8").split("\n")) {
  const m=line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2];
}
const BKEY=process.env.BRAVE_SEARCH_KEY, SB_URL=process.env.SUPABASE_URL, SB_KEY=process.env.SUPABASE_SERVICE_KEY;
if(!BKEY||!SB_URL||!SB_KEY){console.error("env 누락");process.exit(1);}
const CRITIC=process.env.CRITIC||"이동진";
const LIMIT=Number(process.env.LIMIT||50);
const sb={apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`,"Content-Type":"application/json"};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

async function brave(q){
  for(let i=0;i<4;i++){try{
    const res=await fetch(`https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(q)}`,
      {headers:{Accept:"application/json","X-Subscription-Token":BKEY}});
    if(res.status===429){await sleep(3000);continue;}
    if(!res.ok)return [];
    const d=await res.json();
    return (d.web?.results??[]).map(r=>({title:r.title,url:r.url,snippet:r.description??""}));
  }catch{await sleep(800);}}
  return [];
}
const host=(u)=>{try{return new URL(u).hostname.replace(/^www\./,"");}catch{return"";}};
const dec=(s)=>(s||"").replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<\/?strong>/g,"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
function rating(t){const s=(t.match(/★/g)||[]).length,h=/½|☆/.test(t);if(s>0&&s<=5)return s+(h?0.5:0);
  const f=t.match(/(\d(?:\.\d)?)\s*\/\s*(5|10)/);if(f){const v=parseFloat(f[1]),b=parseInt(f[2]);return Math.round((b===10?v/2:v)*10)/10;}
  const l=t.match(/별점\s*[:：]?\s*(\d(?:\.\d)?)/);if(l){const v=parseFloat(l[1]);return v>5?Math.round(v/2*10)/10:v;}
  if(/네 ?개 ?반|4개 ?반/.test(t))return 4.5;return null;}

// 안전 후보만: 왓챠 comments / 언론 명시 인용
function safeCandidates(results, title){
  const out=[];
  for(const r of results){
    const h=host(r.url), s=dec(r.snippet);
    // 네이버 가나다순 아카이브 패턴(다중 ★ 항목) 제외
    if((s.match(/★{1,6}\s*\S+\s*\(\d{4}\)/g)||[]).length>=1 && (s.match(/\(\d{4}\)/g)||[]).length>=2) continue;
    if(h.includes("watcha") && r.url.includes("/comments/")){
      if(s.length>=6 && s.length<=100) out.push({source:"왓챠피디아",url:r.url,rating:rating(s),quote:s.replace(/\.$/,"")+".",hay:s});
    } else if(s.includes(CRITIC)){
      const m=s.match(/[""'']([^""'']{8,90})[""''](?:\s*(?:라(?:는|고)|이라(?:는|고)))?\s*(?:한줄평|평)/)
            ||s.match(/한줄평[^""'']{0,8}[""'']([^""'']{8,90})[""'']/);
      if(m){const trusted=["chosun","hani","hankyung","joins","donga","mt.co.kr","moneys","topstarnews","newsis","yna","maxmovie","movist"].some(x=>h.includes(x));
        out.push({source:h,url:r.url,rating:rating(s),quote:m[1].trim(),trusted,hay:s});}
    }
  }
  return out;
}

async function main(){
  const movies=[];
  let from=0;
  while(movies.length<LIMIT){
    const res=await fetch(`${SB_URL}/rest/v1/movies?select=id,tmdb_id,title,vote_count&vote_count=gte.1000&order=weighted_rating.desc`,
      {headers:{...sb,Range:`${from}-${from+199}`,"Range-Unit":"items"}});
    const b=await res.json(); if(!Array.isArray(b)||!b.length)break;
    movies.push(...b); if(b.length<200)break; from+=200;
  }
  const existing=new Set((await (await fetch(`${SB_URL}/rest/v1/critic_reviews?select=movie_id&critic_name=eq.${encodeURIComponent(CRITIC)}`,{headers:sb})).json()).map(r=>r.movie_id));
  const todo=movies.filter(m=>!existing.has(m.id)).slice(0,LIMIT);

  const out=[];
  for(const mv of todo){
    const results=await brave(`${CRITIC} ${mv.title} 한줄평 별점`);
    const cands=safeCandidates(results, mv.title);
    if(cands.length) out.push({tmdb:mv.tmdb_id,id:mv.id,title:mv.title,cands:cands.slice(0,3)});
    console.error(`${mv.title}: ${cands.length}건`);
    await sleep(1100);
  }
  console.log(JSON.stringify(out,null,2));
}
main();
