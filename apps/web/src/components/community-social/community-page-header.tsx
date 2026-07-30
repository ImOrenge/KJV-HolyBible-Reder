import type { ReactNode } from "react";

type CommunityPageHeaderProps = {
  actions?: ReactNode;
  leading?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function CommunityPageHeader({ actions, leading, subtitle, title }: CommunityPageHeaderProps) {
  return (
    <header className="community-page-header">
      <div className="community-page-header-leading">{leading}</div>
      <div className="community-page-header-copy">
        <h1>{title}</h1>
        {subtitle ? <div className="community-page-header-subtitle">{subtitle}</div> : null}
      </div>
      <div className="community-page-header-actions">{actions}</div>
    </header>
  );
}
