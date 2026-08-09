// 드라코니스 서버 API 클라이언트.
// 스펙: KIOSK-INTEGRATION-SPEC.md — 서버는 다른 에이전트가 동일 계약으로 구현 중.

import type {
  AdminImportBody,
  AdminImportResponse,
  AdminRecordsResponse,
  AdminResetResponse,
  AdminStudentsResponse,
  ApiError,
  ApiResult,
  Identity,
  KioskStatusResponse,
  LookupResponse,
  RegisterBody,
  RegisterResponse,
  SubmitBody,
  SubmitResponse,
} from './types';

export const BASE = import.meta.env.VITE_API_BASE ?? 'https://draconis.up.railway.app';

/**
 * 관리자/담임 API 인증 헤더명.
 * 스펙: "서버 기존 코드가 쓰는 헤더명을 따를 것" — 드라코니스 기존 관리자 호출 방식과
 * 동일하게 X-Teacher-Key를 기본값으로 둔다. 서버 구현이 다른 헤더명을 쓰면 이 상수만
 * 바꾸면 된다.
 */
export const TEACHER_KEY_HEADER = 'X-Teacher-Key';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
    });
  } catch {
    return { ok: false, error: { code: 'network_error' } };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // 본문이 비어있거나 JSON이 아닌 경우 무시
  }

  if (!res.ok) {
    const code = (body as { error?: string } | null)?.error;
    const remaining = (body as { remaining?: number } | null)?.remaining;
    const win = (body as { window?: ApiError['window'] } | null)?.window;
    const error: ApiError = {
      code: (code as ApiError['code']) ?? 'unknown',
      remaining,
      window: win,
      status: res.status,
    };
    return { ok: false, error };
  }

  return { ok: true, data: body as T };
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '' && v !== 0) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// ---------- 키오스크 공개 API ----------

/** GET /api/kiosk/status — 운영시간 게이트 상태 조회 (항상 공개, 인증 없음) */
export function kioskStatus() {
  return request<KioskStatusResponse>('/api/kiosk/status');
}

export function kioskLookup(identity: Identity) {
  return request<LookupResponse>('/api/kiosk/lookup', {
    method: 'POST',
    body: JSON.stringify(identity),
  });
}

export function kioskRegister(body: RegisterBody) {
  return request<RegisterResponse>('/api/kiosk/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function kioskSubmit(body: SubmitBody) {
  return request<SubmitResponse>('/api/kiosk/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------- 관리자 API (X-Teacher-Key 인증) ----------

function teacherHeaders(teacherKey: string): Record<string, string> {
  return { [TEACHER_KEY_HEADER]: teacherKey };
}

export function adminGetStudents(
  teacherKey: string,
  params: { schoolYear: number; grade?: number; classNo?: number },
) {
  const qs = toQuery({ schoolYear: params.schoolYear, grade: params.grade, classNo: params.classNo });
  return request<AdminStudentsResponse>(`/api/admin/kiosk/students${qs}`, {
    headers: teacherHeaders(teacherKey),
  });
}

export function adminImportStudents(teacherKey: string, body: AdminImportBody) {
  return request<AdminImportResponse>('/api/admin/kiosk/students/import', {
    method: 'POST',
    headers: teacherHeaders(teacherKey),
    body: JSON.stringify(body),
  });
}

export function adminResetStudent(teacherKey: string, id: string) {
  return request<AdminResetResponse>('/api/admin/kiosk/students/reset', {
    method: 'POST',
    headers: teacherHeaders(teacherKey),
    body: JSON.stringify({ id }),
  });
}

export function adminGetRecords(
  teacherKey: string,
  params: { from: string; to: string; grade?: number; classNo?: number },
) {
  const qs = toQuery({ from: params.from, to: params.to, grade: params.grade, classNo: params.classNo });
  return request<AdminRecordsResponse>(`/api/admin/kiosk/records${qs}`, {
    headers: teacherHeaders(teacherKey),
  });
}
