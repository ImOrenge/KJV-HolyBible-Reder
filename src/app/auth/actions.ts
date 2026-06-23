"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  message: string;
  status: "idle" | "success" | "error";
};

async function getSiteOrigin() {
  const headerStore = await headers();

  return headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

function readPassword(formData: FormData) {
  return String(formData.get("password") ?? "");
}

function validatePassword(password: string) {
  return password.length >= 8;
}

export async function signInWithEmail(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readEmail(formData);
  const password = readPassword(formData);

  if (!email || !password) {
    return {
      message: "이메일과 비밀번호를 입력하세요.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message: "로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요.",
      status: "error",
    };
  }

  redirect("/app");
}

export async function signUpWithEmail(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readEmail(formData);
  const password = readPassword(formData);
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !password) {
    return {
      message: "이메일과 비밀번호를 입력하세요.",
      status: "error",
    };
  }

  if (password !== confirmPassword) {
    return {
      message: "비밀번호가 일치하지 않습니다.",
      status: "error",
    };
  }

  if (!validatePassword(password)) {
    return {
      message: "비밀번호는 8자 이상이어야 합니다.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/app`,
    },
    password,
  });

  if (error) {
    return {
      message: "가입 요청을 처리하지 못했습니다. 입력값을 확인하세요.",
      status: "error",
    };
  }

  if (data.session) {
    redirect("/app");
  }

  return {
    message: "확인 메일을 보냈습니다. 메일의 링크로 가입을 완료하세요.",
    status: "success",
  };
}

export async function requestPasswordReset(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = readEmail(formData);

  if (!email) {
    return {
      message: "이메일을 입력하세요.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return {
      message: "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.",
      status: "error",
    };
  }

  return {
    message: "비밀번호 재설정 메일을 보냈습니다.",
    status: "success",
  };
}

export async function updatePasswordWithEmail(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = readPassword(formData);
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password) {
    return {
      message: "새 비밀번호를 입력하세요.",
      status: "error",
    };
  }

  if (password !== confirmPassword) {
    return {
      message: "비밀번호가 일치하지 않습니다.",
      status: "error",
    };
  }

  if (!validatePassword(password)) {
    return {
      message: "비밀번호는 8자 이상이어야 합니다.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      message: "세션이 만료되었습니다. 재설정 링크를 다시 요청하세요.",
      status: "error",
    };
  }

  redirect("/app");
}
