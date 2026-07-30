import Image from "next/image";

type CommunityAvatarProps = {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
};

export function CommunityAvatar({ avatarUrl, displayName, size = 44 }: CommunityAvatarProps) {
  if (avatarUrl) {
    return <Image alt={`${displayName} 프로필 사진`} className="community-avatar" height={size} src={avatarUrl} width={size} />;
  }
  return <span aria-hidden="true" className="community-avatar">{displayName.slice(0, 1)}</span>;
}
