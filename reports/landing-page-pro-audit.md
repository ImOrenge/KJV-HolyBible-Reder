# Landing Page Pro Audit

## Agentic Run Packet

- Run type: landing audit, browser verification, copywriting check, rights/copyright risk check
- Target: `/` public landing page at `http://127.0.0.1:3000/`
- Skill: `landing-page-pro`
- Date: 2026-06-23
- Verdict: conditional pass. The landing structure and copy direction are usable, but reveal animation currently creates React hydration errors and should be fixed before production promotion.

## Evidence Sources

- Code: `src/components/landing-page.tsx`, `src/components/landing-reveal-controller.tsx`, `src/components/app-preview-panels.tsx`, `src/app/layout.tsx`, `src/lib/brand.ts`
- Browser: in-app browser at `http://127.0.0.1:3000/`
- Static checks: `npm run lint`, `npm run build`
- Rights reference: UK National Archives, `centenary-crown-copyright-timeline.pdf`

## Verification Results

### Passed

- Landing page loads at `/` after starting the local dev server.
- Primary unauthenticated CTA points to `/auth/login?next=/app`.
- Secondary unauthenticated CTA points to `/auth/sign-up`.
- Nav contains `문제`, `앱 화면`, `공부 흐름`; removed `계정 저장` style navigation is not present.
- Forbidden/removed landing copy was not found in rendered DOM or source search:
  - `계정 저장`
  - `이메일 로그인`
  - `세션 확인`
  - `Row Level Security`
  - `RLS`
  - `외부 OAuth`
  - `모든 기기 동기화`
- Risky overclaim terms were not found in the landing body:
  - `완벽`
  - `자동 동기화`
  - `모든 기기`
  - `보장`
  - `SSO`
  - `OAuth`
- Desktop 1280x720 check showed no horizontal overflow.
- Mobile 390x844 check showed no horizontal overflow.
- `npm run lint` passed.
- `npm run build` passed.

### Browser Measurements

- Desktop viewport: 1280x720
  - Hero bottom: 684px
  - Next section top: 704px
  - Result: first viewport includes the hero and a visible hint of the next section.
- Mobile viewport: 390x844
  - Hero bottom: 1042px
  - Next section top: 1062px
  - Result: no overflow or overlap found, but the first viewport is effectively hero-only.
- Reveal elements:
  - Total `[data-reveal]`: 17
  - Initial `.is-visible`: 3
  - After scroll in this in-app browser check: still 3
- Screenshot capture:
  - In-app `Page.captureScreenshot` timed out for both desktop and mobile.
  - Existing report images remain at `reports/landing-desktop.png` and `reports/landing-mobile.png`, but this audit did not regenerate them.

## Findings

### P1 - Reveal bootstrap causes React hydration mismatch

Evidence:

- Console reported React hydration mismatch errors on the landing page.
- The diff showed server-rendered elements containing `is-visible` while React expected only `landing-reveal`.
- The inline script in `src/components/landing-page.tsx` mutates `[data-reveal]` classes before hydration:
  - `src/components/landing-page.tsx:345`
  - `src/components/landing-page.tsx:349`
  - `src/components/landing-page.tsx:356`
- The client controller also owns reveal behavior:
  - `src/components/landing-reveal-controller.tsx:5`
  - `src/components/landing-reveal-controller.tsx:21`
  - `src/components/landing-reveal-controller.tsx:41`

Impact:

- The page renders, but React warns that server/client markup differs.
- This can make reveal behavior nondeterministic and makes browser verification harder.
- It violates the "console error/warning 없음" acceptance gate.

Recommended fix:

- Remove the inline `dangerouslySetInnerHTML` reveal bootstrap from `LandingPage`.
- Keep one reveal owner: `LandingRevealController`.
- If first-paint blankness is a concern, solve it with CSS fallback or a post-hydration class, not by mutating server-rendered nodes before React hydrates.

### P2 - Reveal scroll behavior was not proven in the current in-app check

Evidence:

- `[data-reveal]` count was 17.
- `.is-visible` count remained 3 after the scroll check in the current in-app browser session.
- The hydration mismatch above makes this result less trustworthy.

Impact:

- The requested scroll fade-in interaction cannot be considered fully verified in this audit.

Recommended fix:

- Fix the hydration mismatch first.
- Re-run browser verification and confirm that `.is-visible` increases as sections enter the viewport.

### P2 - Rights/copyright note is missing from visible landing copy

Evidence:

- Metadata says `CrossWire KJV 기반 성경 통독·공부 노트`.
- Visible landing body uses KJV product positioning and KJV verse preview snippets, but does not expose a source/rights note.
- UK National Archives states that the King James Bible has special perpetual UK protection under Royal prerogative while being out of copyright elsewhere.

Impact:

- For US-only development and short preview snippets, practical risk is low.
- For public or commercial distribution that includes UK access, this should be treated as a release risk until source attribution and permission posture are documented.

Recommended copy:

> KJV 본문은 CrossWire KJV 모듈 기반으로 제공합니다. 지역별 배포 및 인용 권리는 출시 범위에 맞춰 확인합니다.

### P3 - SEO/social metadata is thin for a public landing page

Evidence:

- `src/app/layout.tsx:16` defines only `title`, `description`, and icons.
- No Open Graph or Twitter metadata was found.
- Current description is factual but not very conversion-oriented: `CrossWire KJV 기반 성경 통독·공부 노트`.

Recommended fix:

- Add `openGraph` and `twitter` metadata.
- Consider a more outcome-specific description, for example:

> KJV 성경을 읽던 위치, 통독률, 하이라이트와 인용 구절을 한 흐름으로 이어주는 개인 성경 공부 리더입니다.

### P3 - Mobile first viewport does not show the next-section hint

Evidence:

- At 390x844, hero bottom was 1042px and the next section started at 1062px.

Impact:

- Not a functional bug. No overflow or text overlap was found.
- If the design acceptance gate requires a next-section hint on every viewport, mobile hero spacing or preview height should be tightened.

## Copywriting Review

### What Works

- Product identity is immediate: `KJV 리더노트`.
- Hero message is concrete and product-led:
  - "읽던 자리로 돌아오고, 붙잡은 구절은 남겨두세요."
- Feature language maps to actual app surfaces:
  - 이어 읽기
  - 통독률
  - 하이라이트
  - 인용 보관함
  - TTS
- CTA copy is clear:
  - `내 리더노트 시작하기`
  - `계정 만들기`
  - authenticated state: `내 리더노트 열기`
- The old account-storage explanation has been removed cleanly.

### What Needs Tightening

- Add one visible source/rights note near the footer or final CTA.
- Replace metadata description with more user-outcome copy.
- Consider adding one compact proof line that says this is the actual app flow, not a concept preview.

## Acceptance Gate Status

- Public landing `/`: pass
- CTA routes: pass
- Removed account-storage copy: pass
- No SSO/OAuth/all-device overclaim: pass
- Desktop overflow: pass
- Mobile overflow: pass
- Fade-in animation: blocked by hydration mismatch and inconclusive scroll reveal count
- Console clean: fail
- Static lint/build: pass
- Copyright/rights posture: needs visible attribution/release note

## Next Patch Scope

1. Remove inline reveal bootstrap script from `src/components/landing-page.tsx`.
2. Keep reveal animation in `LandingRevealController` only.
3. Re-test desktop/mobile scroll and console.
4. Add visible KJV/CrossWire source note and improve metadata.
5. Optionally tighten mobile hero height if every viewport must reveal the next section.
