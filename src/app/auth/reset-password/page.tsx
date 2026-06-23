import { requestPasswordReset } from "@/app/auth/actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

export default function ResetPasswordPage() {
  return <EmailAuthForm action={requestPasswordReset} mode="reset-password" />;
}
