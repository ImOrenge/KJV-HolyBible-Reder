"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signInWithGoogle, type AuthActionState } from "@/app/auth/actions";

type AuthMode = "login" | "sign-up" | "reset-password" | "update-password";

type EmailAuthFormProps = {
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  mode: AuthMode;
  next?: string;
  oauthError?: string;
};

const initialAuthActionState: AuthActionState = {
  message: "",
  status: "idle",
};

const modeContent: Record<
  AuthMode,
  {
    description: string;
    submitLabel: string;
    title: string;
  }
> = {
  login: {
    description: "Supabase 계정으로 학습 데이터를 분리해 저장합니다.",
    submitLabel: "로그인",
    title: "로그인",
  },
  "sign-up": {
    description: "Google 또는 이메일 계정으로 읽기 진행도와 인용 목록을 이어갑니다.",
    submitLabel: "가입",
    title: "계정 만들기",
  },
  "reset-password": {
    description: "가입한 이메일로 비밀번호 재설정 링크를 보냅니다.",
    submitLabel: "재설정 메일 보내기",
    title: "비밀번호 재설정",
  },
  "update-password": {
    description: "메일 링크로 열린 세션에서 새 비밀번호를 저장합니다.",
    submitLabel: "비밀번호 변경",
    title: "새 비밀번호",
  },
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="primary-button auth-submit" disabled={pending} type="submit">
      {pending ? <Loader2 aria-hidden="true" size={16} /> : <ArrowRight aria-hidden="true" size={16} />}
      {pending ? "처리 중" : label}
    </button>
  );
}

function GoogleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="google-auth-button" disabled={pending} type="submit">
      {pending ? <Loader2 aria-hidden="true" size={18} /> : <span className="google-auth-mark" aria-hidden="true">G</span>}
      {pending ? "Google 연결 중" : "Google로 계속하기"}
    </button>
  );
}

export function EmailAuthForm({ action, mode, next, oauthError }: EmailAuthFormProps) {
  const [state, formAction] = useActionState(action, initialAuthActionState);
  const content = modeContent[mode];
  const needsEmail = mode !== "update-password";
  const needsPassword = mode !== "reset-password";
  const needsConfirmation = mode === "sign-up" || mode === "update-password";

  return (
    <div className="login-shell">
      <section className="login-panel auth-panel" aria-labelledby="auth-title">
        <div className="brand-mark">KJV</div>
        <div className="auth-heading">
          <p className="eyebrow">Secure account</p>
          <h1 id="auth-title">{content.title}</h1>
          <p>{content.description}</p>
        </div>

        {mode === "login" || mode === "sign-up" ? (
          <>
            <form action={signInWithGoogle} className="oauth-form">
              <input name="mode" type="hidden" value={mode} />
              <input name="next" type="hidden" value={next ?? "/app"} />
              <GoogleSubmitButton />
            </form>
            <div className="auth-divider" role="separator">
              <span>또는 이메일</span>
            </div>
          </>
        ) : null}

        <form action={formAction} className="auth-form">
          {next ? <input name="next" type="hidden" value={next} /> : null}

          {needsEmail ? (
            <label>
              이메일
              <input autoComplete="email" name="email" required type="email" />
            </label>
          ) : null}

          {needsPassword ? (
            <label>
              비밀번호
              <input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} name="password" required type="password" />
            </label>
          ) : null}

          {needsConfirmation ? (
            <label>
              비밀번호 확인
              <input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" />
            </label>
          ) : null}

          {oauthError ? <p className="form-status error" role="alert">{oauthError}</p> : null}
          {state.message ? <p className={`form-status ${state.status}`}>{state.message}</p> : null}
          <SubmitButton label={content.submitLabel} />
        </form>

        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link href="/auth/sign-up">계정 만들기</Link>
              <Link href="/auth/reset-password">비밀번호 재설정</Link>
            </>
          ) : (
            <Link href="/auth/login">로그인으로 돌아가기</Link>
          )}
        </div>
      </section>
    </div>
  );
}
