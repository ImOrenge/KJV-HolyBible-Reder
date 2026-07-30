import type { CommunityProfileDetailV2 } from "@kjv/shared/community";
import { MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";

import { CommunityAvatar } from "./community-avatar";
import { CommunityPageHeader } from "./community-page-header";
import { CommunityProfileActions } from "./community-profile-actions";
import { CommunityProfileEditDialog } from "./community-profile-edit-dialog";

export function CommunityProfileHeader({ profile, signedIn }: { profile: CommunityProfileDetailV2; signedIn: boolean }) {
  return (
    <>
      <CommunityPageHeader
        actions={(
          <>
            <Link aria-label="커뮤니티 검색" className="community-icon-button" href="/community/search"><Search aria-hidden="true" size={20} /></Link>
            <details className="community-profile-overflow community-page-header-menu">
              <summary aria-label="프로필 메뉴" className="community-icon-button"><MoreHorizontal aria-hidden="true" size={20} /></summary>
              <div className="community-profile-overflow-menu">
                {profile.isCurrentUser ? <Link className="community-button" href="/community/settings">프로필 설정</Link> : <a className="community-button" href="#community-profile-actions">프로필 작업</a>}
                <Link className="community-button" href="/community">QT 홈으로</Link>
              </div>
            </details>
          </>
        )}
        title={`@${profile.handle}`}
      />
      <section className="community-profile-hero">
        <div className="community-profile-heading">
          <div className="community-profile-identity">
            <h2>{profile.displayName}{profile.honorific ? ` ${profile.honorific}` : ""}</h2>
            <p className="community-profile-handle">@{profile.handle}</p>
            {profile.bio ? <p className="community-profile-bio">{profile.bio}</p> : null}
          </div>
          <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={84} />
        </div>
        <div aria-label="프로필 활동" className="community-profile-counts">
          <span><strong>{profile.followerCount}</strong> 팔로워</span>
          <span><strong>{profile.followingCount}</strong> 팔로잉</span>
          <span><strong>{profile.postCount}</strong> QT 나눔</span>
        </div>
        <div id="community-profile-actions">
          {profile.isCurrentUser
            ? <CommunityProfileEditDialog className="community-profile-primary-action" initialProfile={profile} />
            : <CommunityProfileActions profile={profile} signedIn={signedIn} />}
        </div>
      </section>
    </>
  );
}
