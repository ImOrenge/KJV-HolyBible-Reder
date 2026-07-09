import { FeedbackDetailPanel } from "@/components/admin/feedback-detail-panel";
import { getEffectiveUserRoles } from "@/lib/auth/server-rbac";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    feedbackId: string;
  }>;
};

export default async function TranslationFeedbackDetailPage({ params }: PageProps) {
  const { feedbackId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const roles = await getEffectiveUserRoles(supabase, user);

  return <FeedbackDetailPanel feedbackId={feedbackId} roles={roles} />;
}
