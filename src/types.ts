// 드라코니스 서버(server/src/index.ts) API 계약과 맞춘 타입 정의.
// 서버 스펙: KIOSK-INTEGRATION-SPEC.md 참고.

export type LapRange = '1_2' | '3_5' | '6_9' | '10_PLUS';

/** 키오스크 공개 API의 공통 신원 식별 body */
export type Identity = {
  schoolYear: number;
  grade: number;
  classNo: number;
  studentNo: number;
};

/** POST /api/kiosk/lookup 응답 */
export type LookupResponse =
  | { found: true; registered: boolean; consent: boolean; locked: boolean }
  | { found: false };

/** POST /api/kiosk/register body/응답 */
export type RegisterBody = Identity & { regCode: string; pin: string; consent: true };
export type RegisterResponse = { ok: true };

/** POST /api/kiosk/submit body/응답 */
export type SubmitBody = Identity & { pin: string; lapRange: LapRange };
export type SubmitResponse = { ok: true; alreadyDone: boolean; lapRange: LapRange };

/** 서버가 내려주는 오류 코드 (JSON { error: code } 형태) */
export type ApiErrorCode =
  | 'invalid_input'
  | 'invalid_code'
  | 'already_registered'
  | 'not_found'
  | 'bad_pin'
  | 'locked'
  | 'not_registered'
  | 'network_error'
  | 'unknown';

export type ApiError = {
  code: ApiErrorCode;
  /** bad_pin 응답에 포함되는 남은 시도 횟수 */
  remaining?: number;
  status?: number;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** GET /api/admin/kiosk/students 학생 행 */
export type AdminStudent = {
  id: string;
  grade: number;
  classNo: number;
  studentNo: number;
  registered: boolean;
  consent: boolean;
  codeUsed: boolean;
  /** 미사용 코드일 때만 서버가 내려줌 */
  regCode?: string;
  active: boolean;
  locked: boolean;
};

export type AdminStudentsResponse = { students: AdminStudent[] };

/** POST /api/admin/kiosk/students/import */
export type AdminImportRow = { grade: number; classNo: number; studentNo: number };
export type AdminImportBody = { schoolYear: number; rows: AdminImportRow[] };
export type AdminImportResponse = { created: number; skipped: number };

/** POST /api/admin/kiosk/students/reset */
export type AdminResetBody = { id: string };
export type AdminResetResponse = { ok: true; regCode: string };

/** GET /api/admin/kiosk/records 기록 행 */
export type AdminRecord = {
  date: string;
  grade: number;
  classNo: number;
  studentNo: number;
  lapRange: LapRange;
  lapsEst: number;
  createdAt: string;
};

export type AdminRecordsResponse = { records: AdminRecord[] };
