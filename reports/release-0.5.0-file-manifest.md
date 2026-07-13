# Release 0.5.0 File Manifest

작성일: 2026-07-13

## 포함 후보

- `apps/mobile/App.tsx`
- `apps/mobile/metro.config.js`
- `apps/mobile/package.json`
- `apps/mobile/src/components/personal-note-rich-text-editor.tsx`
- `apps/web/package.json`
- `apps/web/src/app/api/bible/reference-suggestions/route.ts`
- `apps/web/src/app/api/me/note-templates/**`
- `apps/web/src/app/api/me/notes/**`
- `apps/web/src/app/api/me/verse-notes/**`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/kjv-mvp-app.tsx`
- `apps/web/src/components/personal-note-rich-text-editor.tsx`
- `apps/web/src/lib/personal-note-server.ts`
- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/personal-note-document.ts`
- `packages/shared/src/supabase-user-data-repository.ts`
- `packages/shared/src/types.ts`
- `packages/shared/src/user-data-repository.ts`
- `packages/shared/src/verse-reference-autocomplete.ts`
- `scripts/smoke-remote-personal-note-workspace.mjs`
- `scripts/smoke-remote-personal-note-workspace.sql`
- `supabase/migrations/20260712124409_personal_note_rich_text_workspace.sql`
- `supabase/migrations/20260712131954_personal_note_workspace_hardening.sql`
- 개인노트·UI/UX 아키텍처 및 phase 문서
- `package.json`, `package-lock.json`

## 원격 이력 정합성을 위해 추가 필요

아래 파일은 QT 작업 트리에서 가져오되, QT UI 전체를 제외하는 릴리즈라면 마이그레이션 이력만 포함한다.

- `supabase/migrations/20260712141001_qt_community_ranking.sql`
- `supabase/migrations/20260712141247_qt_community_ranking_indexes.sql`
- `supabase/migrations/20260712141720_qt_community_authenticated_api.sql`
- `supabase/migrations/20260712142431_tighten_community_reaction_visibility.sql`
- `supabase/migrations/20260712143730_align_community_profile_visibility.sql`
- `supabase/migrations/20260712144549_validate_community_reading_evidence.sql`

## 제외 권장

- `data/translations/ko/books/001-gen-genesis.jsonl`
- `data/translations/ko/books/026-ezk-ezekiel.jsonl`
- `reports/genesis-39-translation-report.md`
- `reports/genesis-40-translation-report.md`
- `reports/ot-translation-local-validation.json`
- `reports/ot-translation-verification-progress.md`
- `scripts/validate-ko-ot-local.mjs`
- `docs/mvp-phases/bible-discussion-community-implementation-plan.md`
- `docs/mvp-phases/mobile-view-optimization-prd.md`의 QT 병렬 변경
- `docs/mvp-phases/qt-community-engagement-ranking-architecture.md`
- `docs/mvp-phases/qt-community-engagement-ranking-phase-tasks.md`

## 별도 결정

아래 자산은 코드 릴리즈에 필수는 아니다. Play Store 등록 정보 갱신을 이번 릴리즈에 포함할 때만 선택한다.

- `artifacts/kjv-reader-app-icon-512.png`
- `artifacts/kjv-reader-note-feature-graphic-*.png`
- `kjv-expo-run-web-check.png`

## 생성 산출물

- `apps/web/next-env.d.ts`는 최종 production build 상태이며 별도 기능 변경으로 취급하지 않는다.
- `.tmp/release-0.5.0-mobile-web`은 검증용 Expo export이며 Git에 포함하지 않는다.
- 스태시의 `0.4.0` AAB와 스크린샷은 복원하거나 새 릴리즈에 포함하지 않는다.
