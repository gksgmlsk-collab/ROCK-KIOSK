import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, KeyRound, LogOut, Search, ShieldCheck, Upload, Users, Footprints as Walking } from 'lucide-react';
import { adminGetRecords, adminGetStudents, adminImportStudents, adminResetStudent } from '../api';
import type { AdminImportRow, AdminRecord, AdminStudent } from '../types';

const TEACHER_KEY_STORAGE = 'seokam_teacher_key';
const todayStr = () => new Date().toLocaleDateString('en-CA');

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseImportRows(text: string): AdminImportRow[] {
  return text.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)$/);
      if (!m) return null;
      return { grade: +m[1], classNo: +m[2], studentNo: +m[3] };
    })
    .filter((r): r is AdminImportRow => !!r);
}

export default function Admin() {
  const schoolYear = useMemo(() => new Date().getFullYear(), []);
  const [teacherKey, setTeacherKey] = useState(() => sessionStorage.getItem(TEACHER_KEY_STORAGE) || '');
  const [auth, setAuth] = useState(() => !!sessionStorage.getItem(TEACHER_KEY_STORAGE));
  const [keyInput, setKeyInput] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [tab, setTab] = useState<'dashboard' | 'students' | 'codes' | 'records'>('dashboard');
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState(0);
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());

  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [allStudents, setAllStudents] = useState<AdminStudent[]>([]);
  const [todayRecords, setTodayRecords] = useState<AdminRecord[]>([]);
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [resetBusyId, setResetBusyId] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState('');

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput || loginBusy) return;
    setLoginBusy(true); setLoginError('');
    const res = await adminGetStudents(keyInput, { schoolYear });
    setLoginBusy(false);
    if (!res.ok) {
      setLoginError(res.error.code === 'network_error' ? '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' : '키가 올바르지 않아요.');
      return;
    }
    sessionStorage.setItem(TEACHER_KEY_STORAGE, keyInput);
    setTeacherKey(keyInput);
    setAuth(true);
  };

  const logout = () => { sessionStorage.removeItem(TEACHER_KEY_STORAGE); setTeacherKey(''); setAuth(false); };

  const loadStudents = useCallback(async () => {
    if (!teacherKey) return;
    setLoading(true); setLoadError('');
    const res = await adminGetStudents(teacherKey, { schoolYear, grade: grade || undefined });
    setLoading(false);
    if (!res.ok) { setLoadError('학생 목록을 불러오지 못했어요.'); return; }
    setStudents(res.data.students);
  }, [teacherKey, schoolYear, grade]);

  const loadAllStudents = useCallback(async () => {
    if (!teacherKey) return;
    const res = await adminGetStudents(teacherKey, { schoolYear });
    if (res.ok) setAllStudents(res.data.students);
  }, [teacherKey, schoolYear]);

  const loadToday = useCallback(async () => {
    if (!teacherKey) return;
    const t = todayStr();
    const res = await adminGetRecords(teacherKey, { from: t, to: t });
    if (res.ok) setTodayRecords(res.data.records);
  }, [teacherKey]);

  const loadRecords = useCallback(async () => {
    if (!teacherKey) return;
    setLoading(true); setLoadError('');
    const res = await adminGetRecords(teacherKey, { from, to, grade: grade || undefined });
    setLoading(false);
    if (!res.ok) { setLoadError('걷기 기록을 불러오지 못했어요.'); return; }
    setRecords(res.data.records);
  }, [teacherKey, from, to, grade]);

  useEffect(() => { if (auth) { loadAllStudents(); loadToday(); } }, [auth, loadAllStudents, loadToday]);
  useEffect(() => { if (auth && (tab === 'students' || tab === 'codes' || tab === 'dashboard')) loadStudents(); }, [auth, tab, loadStudents]);
  useEffect(() => { if (auth && tab === 'records') loadRecords(); }, [auth, tab, loadRecords]);

  const list = useMemo(
    () => students.filter(s => !q || `${s.grade}-${s.classNo}-${s.studentNo}`.includes(q)),
    [students, q],
  );

  const handleReset = async (s: AdminStudent) => {
    if (resetBusyId) return;
    setResetBusyId(s.id);
    const res = await adminResetStudent(teacherKey, s.id);
    setResetBusyId(null);
    if (!res.ok) { alert('초기화에 실패했어요. 다시 시도해 주세요.'); return; }
    alert(`PIN을 초기화하고 새 등록코드(${res.data.regCode})를 발급했습니다.`);
    loadStudents(); loadAllStudents();
  };

  const handleImport = async () => {
    const rows = parseImportRows(importText);
    if (!rows.length) { setImportResult('올바른 형식의 줄이 없어요. 예: 5-2-15'); return; }
    setImportBusy(true); setImportResult('');
    const res = await adminImportStudents(teacherKey, { schoolYear, rows });
    setImportBusy(false);
    if (!res.ok) { setImportResult('가져오기에 실패했어요. 다시 시도해 주세요.'); return; }
    setImportResult(`${res.data.created}명 생성, ${res.data.skipped}명 건너뜀`);
    setImportText('');
    loadStudents(); loadAllStudents();
  };

  const exportStudents = (codes: boolean) => {
    const header = codes ? ['학년', '반', '번호', '초기코드', '상태'] : ['학년', '반', '번호', '등록상태', '보호자확인', '상태'];
    const rows: (string | number)[][] = [header, ...list.map(s => codes
      ? [s.grade, s.classNo, s.studentNo, s.codeUsed ? '사용완료' : (s.regCode ?? ''), s.codeUsed ? '사용됨' : '미사용']
      : [s.grade, s.classNo, s.studentNo, s.registered ? '등록' : '미등록', s.consent ? '확인' : '대기', s.active ? '활성' : '비활성'])];
    downloadCsv(`kiosk-${codes ? 'codes' : 'students'}-${schoolYear}.csv`, rows);
  };

  const exportRecords = () => {
    const header = ['날짜', '학년', '반', '번호', '바퀴', '기록시간'];
    const rows: (string | number)[][] = [header, ...records.map(r => [r.date, r.grade, r.classNo, r.studentNo, r.lapRange, new Date(r.createdAt).toLocaleString('ko-KR')])];
    downloadCsv(`kiosk-records-${from}_${to}.csv`, rows);
  };

  if (!auth) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
          <ShieldCheck />
          <h1>관리자 로그인</h1>
          <p>드라코니스 관리자 키(TEACHER_KEY)로 로그인해 주세요.</p>
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="관리자 키" />
          <button disabled={!keyInput || loginBusy}>{loginBusy ? '확인하는 중…' : '로그인'}</button>
          {loginError && <small style={{ color: '#b93f31' }}>{loginError}</small>}
        </form>
      </main>
    );
  }

  const gradeStats = [1, 2, 3, 4, 5, 6].map(g => {
    const gradeTotal = allStudents.filter(s => s.grade === g).length;
    const gradeDone = todayRecords.filter(r => r.grade === g).length;
    const pct = gradeTotal ? Math.round((gradeDone / gradeTotal) * 100) : 0;
    return { g, gradeDone, pct };
  });

  return (
    <main className="admin">
      <aside>
        <h1>🌲 석암키오스크</h1>
        <small>운영 관리자</small>
        {([['dashboard', '대시보드', BarChart3], ['students', '학생 관리', Users], ['codes', '초기 등록 코드', KeyRound], ['records', '걷기 기록', Walking]] as const).map(([id, label, Icon]) => (
          <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon />{label}</button>
        ))}
        <button className="logout" onClick={logout}><LogOut />로그아웃</button>
      </aside>
      <section className="admin-main">
        <header>
          <div>
            <h2>{tab === 'dashboard' ? '오늘의 아침 걷기' : tab === 'students' ? '학생 관리' : tab === 'codes' ? '초기 등록 코드' : '걷기 기록'}</h2>
            <p>{new Date().toLocaleDateString('ko-KR', { dateStyle: 'full' })}</p>
          </div>
          <a href="/">키오스크 화면으로</a>
        </header>

        {loadError && <div className="admin-card" style={{ color: '#b93f31' }}>{loadError}</div>}

        {tab === 'dashboard' ? (
          <>
            <div className="stats">
              <Stat icon="👟" value={todayRecords.length} label="오늘 인증" />
              <Stat icon="👥" value={allStudents.length} label="전체 학생" />
              <Stat icon="🌿" value={`${allStudents.length ? Math.round(todayRecords.length / allStudents.length * 100) : 0}%`} label="오늘 인증률" />
            </div>
            <div className="admin-card">
              <h3>학년별 참여 현황</h3>
              {gradeStats.map(({ g, gradeDone, pct }) => (
                <div className="bar" key={g}><b>{g}학년</b><i><span style={{ width: `${pct}%` }} /></i><strong>{gradeDone}명</strong></div>
              ))}
            </div>
          </>
        ) : tab === 'students' || tab === 'codes' ? (
          <>
            <div className="toolbar">
              <label><Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="예: 6-3-15" /></label>
              <select value={grade} onChange={e => setGrade(+e.target.value)}>
                <option value="0">전체 학년</option>
                {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
              <button onClick={() => setImportOpen(v => !v)}><Upload />CSV 불러오기</button>
              <button onClick={() => exportStudents(tab === 'codes')}><Download />내보내기</button>
            </div>
            {importOpen && (
              <div className="admin-card">
                <h3>명부 일괄 등록</h3>
                <p>줄마다 "학년-반-번호" 형식으로 붙여넣어 주세요. 예: 5-2-15</p>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  rows={6}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 15, padding: 10, borderRadius: 8, border: '1px solid #dbe0d8' }}
                  placeholder={'5-2-15\n5-2-16\n5-2-17'}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                  <button className="mini" onClick={handleImport} disabled={importBusy || !importText.trim()}>{importBusy ? '가져오는 중…' : '가져오기'}</button>
                  {importResult && <span>{importResult}</span>}
                </div>
              </div>
            )}
            <div className="admin-card">
              {loading ? <div className="empty">불러오는 중…</div> : (
                <table>
                  <thead>
                    <tr>
                      <th>학생</th>
                      {tab === 'codes' ? <><th>초기 코드</th><th>상태</th></> : <><th>등록</th><th>보호자 확인</th><th>상태</th></>}
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 200).map(s => (
                      <tr key={s.id}>
                        <td>{s.grade}학년 {s.classNo}반 {s.studentNo}번</td>
                        {tab === 'codes' ? (
                          <>
                            <td><code>{s.codeUsed ? '사용 완료' : s.regCode}</code></td>
                            <td><span className={'badge ' + (s.codeUsed ? 'gray' : 'green')}>{s.codeUsed ? '사용됨' : '미사용'}</span></td>
                          </>
                        ) : (
                          <>
                            <td>{s.registered ? '등록' : '미등록'}</td>
                            <td>{s.consent ? '확인' : '대기'}</td>
                            <td><span className={'badge ' + (s.active ? 'green' : 'gray')}>{s.locked ? '잠김' : s.active ? '활성' : '비활성'}</span></td>
                          </>
                        )}
                        <td><button className="mini" disabled={resetBusyId === s.id} onClick={() => handleReset(s)}>{resetBusyId === s.id ? '처리 중…' : 'PIN 초기화'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading && !list.length && <div className="empty">표시할 학생이 없습니다.</div>}
            </div>
          </>
        ) : (
          <>
            <div className="toolbar">
              <label>기간 <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
              <label>~ <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
              <select value={grade} onChange={e => setGrade(+e.target.value)}>
                <option value="0">전체 학년</option>
                {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>{g}학년</option>)}
              </select>
              <button onClick={exportRecords}><Download />내보내기</button>
            </div>
            <div className="admin-card">
              <h3>걷기 기록</h3>
              {loading ? <div className="empty">불러오는 중…</div> : records.length ? (
                <table>
                  <thead><tr><th>날짜</th><th>학생</th><th>바퀴</th><th>기록 시간</th></tr></thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td>{r.grade}학년 {r.classNo}반 {r.studentNo}번</td>
                        <td>{r.lapRange}</td>
                        <td>{new Date(r.createdAt).toLocaleTimeString('ko-KR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="empty">해당 기간에 기록이 없습니다.</div>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return <div className="stat"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}
