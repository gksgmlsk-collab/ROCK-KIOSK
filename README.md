# 석암키오스크

초등학교 공용 기기용 아침 걷기 인증 웹앱입니다. 학생 단계형 인증, 최초 등록코드/PIN 설정, PIN 잠금, 하루 한 번 기록, 자동 초기화, 관리자 대시보드를 포함합니다.

## 아키텍처

이 저장소(ROCK-KIOSK)는 **프론트엔드 전용**이며 자체 DB를 갖지 않습니다. 모든 학생/기록 데이터는
**드라코니스(Draconis) 서버**(Hono, Supabase Postgres 기반)가 소유하며, 키오스크는 REST API로만 통신합니다.

```
브라우저(키오스크/관리자) → fetch → 드라코니스 서버(VITE_API_BASE) → Supabase Postgres
```

- `src/api.ts`: 드라코니스 서버 API 클라이언트. `VITE_API_BASE`(기본값 `https://draconis.up.railway.app`)로 호출합니다.
- `src/types.ts`: 서버 API 요청/응답 계약 타입.
- `src/components/Kiosk.tsx`: 학생용 인증 화면 (`/`).
  - 학년/반/번호 선택 → `lookup` → 등록된 학생이면 PIN 입력, 처음이면 등록코드 → 개인정보 안내 → PIN 설정/확인 → `register`
  - 걷기 바퀴 선택 → `submit` (PIN 검증 + 오늘자 기록 저장이 이 호출에서 함께 일어납니다)
- `src/components/Admin.tsx`: 운영 관리자 화면 (`/admin`).
  - 로그인 = 드라코니스 관리자 키(`TEACHER_KEY`) 입력, `sessionStorage`에 보관
  - 이후 모든 데이터(대시보드/학생 관리/등록 코드/걷기 기록)는 관리자 API로 조회
  - 관리자 API 인증 헤더명은 `src/api.ts`의 `TEACHER_KEY_HEADER` 상수 하나로 관리(현재 `X-Teacher-Key`)

더 이상 브라우저 메모리/데모 저장소(`src/data/store.ts`, `supabase/schema.sql`)를 사용하지 않습니다.
`supabase/schema.sql`은 이전 프로토타입(Supabase 직접 연동안)의 유산으로, 현재는 서버(math_mon `server/src/db.ts`)가 소유한
`kiosk_students` / `kiosk_walk_records` 테이블 정의로 대체되었습니다.

## 실행 (로컬 개발)

```bash
npm install
npm run dev
```

- `.env` 파일에 `VITE_API_BASE`(개발 중인 드라코니스 서버 주소)를 설정하세요. 미설정 시 운영 서버(`https://draconis.up.railway.app`)로 요청합니다.
- 키오스크: `/`
- 관리자: `/admin` (드라코니스 관리자 키로 로그인)

## 배포 (Railway)

`railway.json`으로 Nixpacks 빌드를 사용합니다.

- 빌드: `npm run build` (`tsc -b && vite build`)
- 시작: `npm run start` → `serve -s dist -l ${PORT:-3000}` (Railway가 주입하는 `PORT`로 정적 파일을 서빙)
- 환경변수: `VITE_API_BASE`(필요 시), `VITE_DRACONIS_QR_URL`(선택)은 **빌드 타임**에 주입되어야 합니다(Vite 정적 빌드이므로 런타임 변경 불가).

```bash
npm install
npm run build
npm run start
```

## 오류 처리 (키오스크)

- `bad_pin`: 남은 시도 횟수를 한국어로 안내하고 PIN을 다시 입력하도록 함
- `locked`: 5분 후 재시도 안내
- `not_found` / `not_registered`: "선생님께 등록을 요청해 주세요" 안내
- 네트워크 오류: 재시도 버튼 제공, 처음으로 돌아가기 가능
