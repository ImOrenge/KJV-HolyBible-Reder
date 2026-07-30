"use client";

import {
  completeUserOnboarding,
  uploadUserAvatar,
  USER_HONORIFICS,
  validateOnboardingInput,
  type UserHonorific,
  type UserOnboardingProfile,
} from "@kjv/shared/onboarding";
import { Camera, Loader2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

type OnboardingFormProps = {
  email: string;
  initialProfile?: UserOnboardingProfile | null;
  nextPath: string;
};

const maxAvatarBytes = 2 * 1024 * 1024;

export function OnboardingForm({ email, initialProfile = null, nextPath }: OnboardingFormProps) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile?.avatarUrl ?? null);
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? "");
  const [honorific, setHonorific] = useState<UserHonorific>(initialProfile?.honorific ?? "성도님");
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState(initialProfile?.nickname ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(initialProfile?.avatarUrl ?? null);
      return;
    }
    const previewUrl = URL.createObjectURL(avatar);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatar, initialProfile?.avatarUrl]);

  const selectAvatar = (file: File | null) => {
    setMessage("");
    if (!file) return setAvatar(null);
    if (file.size > maxAvatarBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("2MB 이하의 JPG, PNG, WebP 이미지를 선택하세요.");
      return;
    }
    setAvatar(file);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateOnboardingInput({ fullName, honorific, nickname });
    if (!validation.valid) return setMessage(validation.message);

    setSubmitting(true);
    setMessage("");
    try {
      let avatarPath = initialProfile?.avatarPath ?? null;
      if (avatar) {
        const formData = new FormData();
        formData.append("avatar", avatar);
        avatarPath = (await uploadUserAvatar(formData)).avatarPath;
      }
      await completeUserOnboarding({ ...validation.input, avatarPath });
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <main className="f-onboarding">
      <section className="f-onboarding__panel" aria-labelledby="onboarding-title">
        <header className="f-onboarding__heading">
          <p className="eyebrow">{initialProfile ? "계정 프로필" : "첫 로그인"}</p>
          <h1 id="onboarding-title">프로필 설정</h1>
          <p>{email}</p>
        </header>

        <form className="f-onboarding__form" onSubmit={submit}>
          <div className="f-onboarding__avatar-field">
            <div className="f-onboarding__avatar-preview" aria-label="프로필 사진 미리보기">
              {avatarPreview ? <Image alt="선택한 프로필 사진" height={76} src={avatarPreview} unoptimized width={76} /> : <UserRound aria-hidden="true" size={38} />}
            </div>
            <div>
              <label className="secondary-button f-onboarding__avatar-button">
                <Camera aria-hidden="true" size={17} />
                사진 선택
                <input
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectAvatar(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
              <small>선택 사항 · 최대 2MB</small>
            </div>
          </div>

          <label>
            닉네임
            <input autoComplete="nickname" maxLength={24} minLength={2} onChange={(event) => setNickname(event.target.value)} required value={nickname} />
          </label>

          <label>
            이름
            <input autoComplete="name" maxLength={50} minLength={2} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
            <small>이름은 다른 사용자에게 공개되지 않습니다.</small>
          </label>

          <label>
            호칭
            <select onChange={(event) => setHonorific(event.target.value as UserHonorific)} value={honorific}>
              {USER_HONORIFICS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          {message ? <p className="form-status error" role="alert">{message}</p> : null}

          <button className="primary-button f-onboarding__submit" disabled={submitting} type="submit">
            {submitting ? <Loader2 aria-hidden="true" size={17} /> : null}
            {submitting ? "저장 중" : initialProfile ? "프로필 저장" : "시작하기"}
          </button>
        </form>

        <Link className="f-onboarding__privacy-link" href="/privacy">개인정보 처리방침</Link>
      </section>
    </main>
  );
}
