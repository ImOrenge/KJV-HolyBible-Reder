import { readFile } from "node:fs/promises";
import process from "node:process";

const groups = [
  {
    name: "native-auth-entry",
    labels: ["KJV 리더노트", "by CrossWire KJV 3.1", "로그인", "회원가입", "비회원 리더 로그인", "처음으로", "이메일", "비밀번호"],
  },
  {
    name: "mobile-bottom-nav",
    labels: ["오늘", "성경", "공부", "보관함", "설정", "명령 검색"],
  },
  {
    name: "home-tabs",
    labels: ["오늘", "통독", "활동", "공부"],
  },
  {
    name: "home-activity-study-panels",
    labels: ["최근 활동", "아직 활동 기록이 없습니다.", "최근 강조", "최근 인용 구절", "노트와 태그", "강조한 구절이 없습니다.", "저장한 인용 구절이 없습니다.", "저장한 노트가 없습니다."],
  },
  {
    name: "quick-move",
    labels: ["명령", "빠른 이동", "이동하거나 실행할 항목 검색", "이어 읽기", "홈 · 오늘", "오늘 통독 분량 열기", "통독 진척도", "강조 구절", "검색", "명령이 없습니다."],
  },
  {
    name: "mobile-study-navigation",
    labels: ["hardwareBackPress", "이전 화면", "/(tabs)/today", "/search"],
  },
  {
    name: "personal-note-stack-screens",
    labels: ["노트 목록 화면", "노트 편집 화면", "노트 편집기 이전 화면", "새 노트", "노트 기본 서식 도구", "노트 서식 더보기", "노트 고급 서식 도구", "노트 고급 서식 닫기"],
  },
    {
      name: "reader-actions",
      labels: ["읽음 완료", "EN", "KR", "읽기", "다중 선택", "장 노트", "강조", "인용 저장", "선택 구절 읽기", "구절 노트", "의견 보내기"],
    },
    {
      name: "reader-main-verse-list-toolbar",
      labels: ["현재 위치 자동 추적 대기", "읽음 완료", "EN", "KR", "읽기", "다중 선택", "장 노트"],
    },
    {
      name: "selected-verse-detail-panel",
      labels: ["구절 복사", "선택 구절 읽기", "구절 노트", "번역 의견", "인용 구절 저장", "강조 해제"],
      absentLabels: ["강조 메모"],
    },
    {
      name: "reader-v2-native-components",
      labels: ["동시", "이전 장", "다음 장", "장 선택 열기", "선택 구절 작업 접기", "선택 구절 작업 펼치기", "선택 구절 작업 닫기"],
    },
    {
      name: "reader-selection-action-sheet",
      labels: ["다음 절을 누르면 범위가 선택됩니다.", "첫 절을 선택하세요.", "복사", "인용 저장", "읽기", "선택 해제", "선택 모드 종료"],
    },
    {
      name: "reader-chapter-picker-sheet",
      labels: ["성경 이동", "성경 권", "장 선택 닫기"],
    },
    {
      name: "search-controls",
      labels: ["키워드", "언어", "한국어", "KJV 영어", "정렬", "성경 순서", "관련도", "범위", "전체", "구약", "신약", "전체 성경", "2글자 이상 입력", "검색 중입니다.", "검색 결과가 없습니다."],
    },
  {
    name: "highlight-library",
    labels: ["강조 구절", "강조한 구절이 없습니다.", "전체 색상", "중요", "묵상", "약속", "경고", "예언", "성경 권", "전체 성경", "열기", "복사", "해제"],
  },
  {
    name: "saved-items",
    labels: ["인용 구절 보관함", "목록", "기본 목록", "최근 저장순", "성경 순서", "자주 사용순", "목록 전체 복사", "목록 삭제", "열기", "삭제", "해제"],
  },
  {
    name: "favorite-modal",
    labels: ["인용 제목", "인용 메모", "저장할 목록", "새 목록 이름", "목록 생성", "목록 삭제 확인"],
  },
  {
    name: "reader-note-feedback-modals",
    labels: ["성경 노트", "묵상, 관찰, 적용점을 기록", "번역 의견", "어떤 문제가 있나요?", "문제가 되는 표현", "예: 특정 단어 또는 짧은 표현", "더 적절한 번역 제안", "가능하면 더 나은 표현을 적어주세요.", "설명", "왜 그렇게 생각하는지 선택적으로 남겨주세요.", "의견 보내기"],
  },
  {
    name: "progress-plan-dashboard",
    labels: ["오늘 통독 플랜", "오늘 분량 열기", "오늘 완료", "다시 시작", "제거", "통독 진척도", "전체", "구약", "신약", "오늘"],
  },
  {
    name: "settings-sections",
    labels: ["계정 설정", "서버 동기화", "이 기기 데이터 가져오기", "회원탈퇴", "TTS", "텍스트", "보기 모드", "TTS 설정", "음성", "기기 기본", "일시정지", "정지", "상태", "텍스트 설정", "읽기 모드", "일반 보기", "절 번호 강조", "집중 읽기", "라이트 모드", "다크 모드"],
  },
  {
    name: "reader-tts-playback-controls",
    labels: ["오늘 분량", "오늘 읽기", "TTS", "이전 구절", "재생", "일시정지 또는 재개", "정지", "다음 구절"],
  },
];

function hasLabel(source, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`["'\`]${escaped}["'\`]`).test(source) || source.includes(`>${label}<`);
}

async function main() {
  const sources = await Promise.all([
    "apps/mobile/App.tsx",
    "apps/mobile/src/components/reader/reader-header.tsx",
    "apps/mobile/src/components/reader/reader-verse-row.tsx",
    "apps/mobile/src/components/reader/reader-verse-actions-sheet.tsx",
    "apps/mobile/src/hooks/use-mobile-study-navigation.ts",
    "apps/mobile/src/components/notes/personal-note-list-screen.tsx",
    "apps/mobile/src/components/notes/personal-note-editor-screen.tsx",
    "apps/mobile/src/components/personal-note-rich-text-editor.tsx",
    "packages/shared/src/mobile-study-navigation.ts",
  ].map((file) => readFile(file, "utf8")));
  const source = sources.join("\n");
  const missing = [];

  for (const group of groups) {
    for (const label of group.labels) {
      if (!hasLabel(source, label)) {
        missing.push({ group: group.name, label });
      }
    }
    for (const label of group.absentLabels ?? []) {
      if (hasLabel(source, label)) {
        missing.push({ group: group.name, label, expected: "absent" });
      }
    }
  }

  const report = {
    checkedGroups: groups.map((group) => group.name),
    missing,
    passed: missing.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));
  if (missing.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
