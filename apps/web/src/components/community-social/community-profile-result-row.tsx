import type { CommunityPublicProfileSummary } from "@kjv/shared/community";
import Link from "next/link";

import { CommunityAvatar } from "./community-avatar";
import { CommunityFollowButton } from "./community-follow-button";

type CommunityProfileResultRowProps = {
  profile: CommunityPublicProfileSummary;
  returnHref: string;
  signedIn: boolean;
};

export function CommunityProfileResultRow({ profile, returnHref, signedIn }: CommunityProfileResultRowProps) {
  return (
    <article className="community-search-profile-row">
      <Link aria-label={`${profile.displayName} 프로필`} className="community-search-profile-link" href={`/community/u/${profile.handle}`}>
        <CommunityAvatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={46} />
        <span className="community-search-profile-copy">
          <strong>{profile.displayName}{profile.honorific ? ` ${profile.honorific}` : ""}</strong>
          <span className="community-meta">@{profile.handle}</span>
          {profile.bio ? <span className="community-search-profile-bio">{profile.bio}</span> : null}
          <span className="community-meta">팔로워 {profile.followerCount ?? 0}명</span>
        </span>
      </Link>
      {!profile.isCurrentUser ? <CommunityFollowButton handle={profile.handle} initialFollowing={profile.viewerFollowing} returnHref={returnHref} signedIn={signedIn} /> : null}
    </article>
  );
}
