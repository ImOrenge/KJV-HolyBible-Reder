import { updatePasswordWithEmail } from "@/app/auth/actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

export default function UpdatePasswordPage() {
  return <EmailAuthForm action={updatePasswordWithEmail} mode="update-password" />;
}
