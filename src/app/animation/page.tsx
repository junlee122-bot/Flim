import { redirect } from "next/navigation";

// 애니메이션 허브는 통합 /genre/animation 으로 이전됨.
export default function AnimationRedirect() {
  redirect("/genre/animation");
}
