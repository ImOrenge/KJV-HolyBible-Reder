import { Camera, FilePlus2, UserRoundPlus } from "lucide-react";
import Link from "next/link";

type CompletionItem = { detail: string; href: string; key: "bio" | "follow" | "photo" | "post"; label: string };

const icons = {
  bio: FilePlus2,
  follow: UserRoundPlus,
  photo: Camera,
  post: FilePlus2,
};

export function CommunityProfileCompletion({ items }: { items: CompletionItem[] }) {
  if (!items.length) return null;
  return (
    <section className="community-profile-completion" aria-labelledby="profile-completion-title">
      <div className="community-profile-completion-heading">
        <h2 id="profile-completion-title">프로필 완성하기</h2>
        <span>{items.length}개 남음</span>
      </div>
      <div className="community-profile-completion-list">
        {items.map((item) => {
          const Icon = icons[item.key];
          return <Link href={item.href} key={item.key}><Icon aria-hidden="true" size={24} /><strong>{item.label}</strong><span>{item.detail}</span></Link>;
        })}
      </div>
    </section>
  );
}
