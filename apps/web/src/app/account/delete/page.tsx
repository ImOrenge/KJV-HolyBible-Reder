import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "계정 삭제 | KJV 리더노트",
  description: "KJV 리더노트 계정과 앱이 관리하는 사용자 데이터를 삭제하는 방법을 안내합니다.",
  alternates: {
    canonical: "/account/delete",
  },
};

type AccountDeletePageProps = {
  searchParams?: Promise<{
    deleted?: string;
    error?: string;
  }>;
};

async function deleteAccountAction(formData: FormData) {
  "use server";

  const confirmText = String(formData.get("confirmText") ?? "").trim();

  if (confirmText !== "회원탈퇴") {
    redirect("/account/delete?error=confirm");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?next=/account/delete");
  }

  try {
    const serviceClient = createServiceRoleClient();
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id, false);

    if (deleteError) {
      redirect("/account/delete?error=delete");
    }
  } catch {
    redirect("/account/delete?error=delete");
  }

  await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
  redirect("/account/delete?deleted=1");
}

function getErrorMessage(error: string | undefined) {
  if (error === "confirm") {
    return "확인 문구를 정확히 입력해야 계정 삭제를 요청할 수 있습니다.";
  }

  if (error === "delete") {
    return "계정 삭제를 처리하지 못했습니다. 잠시 후 다시 시도하세요.";
  }

  return "";
}

export default async function AccountDeletePage({ searchParams }: AccountDeletePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isDeleted = params?.deleted === "1";
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="privacy-page">
      <article className="privacy-document" aria-labelledby="account-delete-title">
        <Link className="privacy-back-link" href="/">
          KJV 리더노트로 돌아가기
        </Link>
        <header className="privacy-header">
          <p className="eyebrow">Account deletion</p>
          <h1 id="account-delete-title">계정 삭제</h1>
          <p>
            KJV 리더노트 계정과 앱이 관리하는 사용자 데이터를 삭제하려면 앱 또는 이 웹 페이지에서 로그인한 뒤
            회원탈퇴를 요청할 수 있습니다.
          </p>
          <span>Play Console 계정 삭제 URL로 사용할 수 있는 공개 페이지입니다.</span>
        </header>

        {isDeleted ? <p className="form-status success">계정 삭제가 완료되었습니다.</p> : null}
        {errorMessage ? <p className="form-status error">{errorMessage}</p> : null}

        <div className="privacy-section-list">
          <section className="privacy-section">
            <h2>앱에서 삭제하기</h2>
            <p>모바일 앱에서 로그인한 뒤 설정, 계정 설정, 회원탈퇴를 차례로 선택합니다.</p>
            <p>확인 창에서 회원탈퇴 문구를 입력하면 Supabase 인증 계정과 서버에 저장된 리더노트 데이터가 삭제됩니다.</p>
          </section>

          <section className="privacy-section">
            <h2>웹에서 삭제 요청하기</h2>
            {user ? (
              <form action={deleteAccountAction} className="auth-form">
                <p>현재 로그인 계정: {user.email ?? "로그인 상태"}</p>
                <label>
                  확인 문구
                  <input autoComplete="off" name="confirmText" placeholder="회원탈퇴" required type="text" />
                </label>
                <button className="secondary-button danger" type="submit">
                  계정 삭제 요청
                </button>
              </form>
            ) : (
              <>
                <p>웹에서 삭제하려면 먼저 삭제할 계정으로 로그인하세요.</p>
                <div className="auth-links">
                  <Link href="/auth/login?next=/account/delete">로그인 후 계정 삭제</Link>
                </div>
              </>
            )}
          </section>

          <section className="privacy-section">
            <h2>삭제되는 데이터</h2>
            <p>
              이메일 로그인 계정, 인증 식별자, 읽기 위치, 완료 장, 하이라이트, 즐겨찾기 구절과 목록, 태그, 학습 노트,
              읽기 계획, 앱 설정 등 KJV 리더노트가 계정에 연결해 관리하는 사용자 데이터가 삭제됩니다.
            </p>
            <p>
              공개 성경 본문, 성경 출처 정보, 법령 준수와 보안 목적의 제한적 로그 또는 백업 데이터는 계정 삭제와 별도로
              필요한 기간 동안 보관될 수 있습니다. 비회원 로컬 데이터는 사용 중인 기기에서 별도로 초기화해야 합니다.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
