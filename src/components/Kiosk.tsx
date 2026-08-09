import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Footprints, IdCard, Loader2, LockKeyhole, Radio, Trees } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Header from './Header';
import NumberPad from './NumberPad';
import { kioskLookup, kioskRegister, kioskSubmit } from '../api';
import type { Identity, LapRange } from '../types';

type Step =
  | 'home' | 'class' | 'number' | 'code' | 'privacy'
  | 'pinSetup' | 'pinConfirm' | 'pin' | 'walk' | 'success' | 'already'
  | 'notfound' | 'network';

const laps: { v: LapRange; label: string; icon: string; sub: string }[] = [
  { v: '1_2', label: '1~2바퀴', icon: '🐾', sub: '가볍게 시작!' },
  { v: '3_5', label: '3~5바퀴', icon: '🌿', sub: '힘차게 걸었어요' },
  { v: '6_9', label: '6~9바퀴', icon: '⭐', sub: '정말 대단해요' },
  { v: '10_PLUS', label: '10바퀴 이상', icon: '🏆', sub: '오늘의 걷기왕' },
];

const ANNOUNCEMENTS = [
  '8월 아침 걷기 프로그램이 시작되었습니다.',
  '비가 오는 날은 실내 걷기 안내를 따라 주세요.',
];

export default function Kiosk() {
  const schoolYear = useMemo(() => new Date().getFullYear(), []);
  const [step, setStep] = useState<Step>('home');
  const [grade, setGrade] = useState(0);
  const [klass, setKlass] = useState(0);
  const [num, setNum] = useState(0);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [regCode, setRegCode] = useState('');
  const [lap, setLap] = useState<LapRange>();
  const [doneLapRange, setDoneLapRange] = useState<LapRange>();
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  const identity = (): Identity => ({ schoolYear, grade, classNo: klass, studentNo: num });

  const reset = () => {
    setStep('home'); setGrade(0); setKlass(0); setNum(0);
    setPin(''); setFirstPin(''); setRegCode('');
    setLap(undefined); setDoneLapRange(undefined); setMsg(''); setLastAction(null);
  };

  // 30초 무입력 자동 초기화 (성공/네트워크 대기 화면은 제외)
  useEffect(() => {
    if (step === 'home' || step === 'success') return;
    let left = 30;
    const id = setInterval(() => { if (--left <= 0) { clearInterval(id); reset(); } }, 1000);
    return () => clearInterval(id);
  }, [step, grade, klass, num, pin, regCode, lap]);

  useEffect(() => {
    if (step === 'success') { const id = setTimeout(reset, 3000); return () => clearTimeout(id); }
  }, [step]);

  const chooseStudent = async (n: number) => {
    setNum(n); setMsg(''); setBusy(true);
    const res = await kioskLookup({ schoolYear, grade, classNo: klass, studentNo: n });
    setBusy(false);
    if (!res.ok) { setLastAction(() => () => chooseStudent(n)); setStep('network'); return; }
    if (!res.data.found) { setStep('notfound'); return; }
    if (res.data.locked) setMsg('여러 번 잘못 입력해서 잠겨 있어요. 5분 후 다시 시도해 주세요.');
    setStep(res.data.registered ? 'pin' : 'code');
  };

  const proceedToWalk = () => { setMsg(''); setStep('walk'); };

  const saveFirstPin = () => { if (pin.length === 4) { setFirstPin(pin); setPin(''); setStep('pinConfirm'); } };

  const confirmPin = async () => {
    if (pin !== firstPin) {
      setPin(''); setFirstPin('');
      setMsg('인증번호가 달라요. 처음부터 다시 입력해 주세요.');
      setStep('pinSetup');
      return;
    }
    if (busy) return;
    setBusy(true);
    const res = await kioskRegister({ ...identity(), regCode, pin, consent: true });
    setBusy(false);
    if (!res.ok) {
      const code = res.error.code;
      if (code === 'invalid_code') {
        setRegCode(''); setPin(''); setFirstPin('');
        setMsg('등록코드가 올바르지 않아요. 다시 확인해 주세요.');
        setStep('code');
        return;
      }
      if (code === 'already_registered') {
        setPin(''); setFirstPin('');
        setMsg('이미 등록된 학생이에요. 인증번호를 입력해 주세요.');
        await chooseStudent(num);
        return;
      }
      if (code === 'not_found') { setStep('notfound'); return; }
      setLastAction(() => () => confirmPin());
      setStep('network');
      return;
    }
    setMsg('');
    setStep('walk');
  };

  const submit = async () => {
    if (!lap || busy) return;
    setBusy(true);
    const res = await kioskSubmit({ ...identity(), pin, lapRange: lap });
    setBusy(false);
    if (!res.ok) {
      const code = res.error.code;
      if (code === 'bad_pin') {
        setPin('');
        setMsg(`인증번호가 올바르지 않아요. ${res.error.remaining ?? 0}번 더 틀리면 잠겨요.`);
        setStep('pin');
        return;
      }
      if (code === 'locked') {
        setPin('');
        setMsg('여러 번 잘못 입력해서 잠겼어요. 5분 후 다시 시도해 주세요.');
        setStep('pin');
        return;
      }
      if (code === 'not_registered' || code === 'not_found') { setStep('notfound'); return; }
      setLastAction(() => () => submit());
      setStep('network');
      return;
    }
    setDoneLapRange(res.data.lapRange);
    setStep(res.data.alreadyDone ? 'already' : 'success');
  };

  return (
    <main className="kiosk">
      <Header onNotice={() => setNotice(true)} />
      <section className="stage">
        <div className="panel primary">
          {step === 'home' ? (
            <>
              <div className="seal"><IdCard /></div>
              <h2>학생 인증하기</h2>
              <p>학년, 반, 번호와 인증번호로 안전하게 인증해요.</p>
              <div className="welcome"><Trees /><div><b>아침 걷기 준비됐나요?</b><span>10초면 인증이 끝나요!</span></div></div>
              <button className="hero-btn" onClick={() => setStep('class')}><Footprints /> 걷기 인증 시작 <ChevronRight /></button>
            </>
          ) : (
            <Flow
              step={step} grade={grade} klass={klass} num={num}
              pin={pin} setPin={setPin} regCode={regCode} setRegCode={setRegCode}
              lap={lap} setLap={setLap} msg={msg} setMsg={setMsg} busy={busy}
              doneLapRange={doneLapRange}
              onPickGrade={n => { setGrade(n); setStep('number'); }}
              onPickKlass={setKlass}
              onPickNum={chooseStudent}
              onCodeConfirm={() => setStep('privacy')}
              onPrivacyConfirm={() => setStep('pinSetup')}
              onSaveFirstPin={saveFirstPin}
              onConfirmPin={confirmPin}
              onProceedToWalk={proceedToWalk}
              onSubmit={submit}
              onRetry={() => lastAction?.()}
              onReset={reset}
            />
          )}
        </div>
        <aside className="panel side">
          <div className="seal"><BookOpen /></div>
          <h2>드라코니스 앱</h2>
          <p>앱이 있는 친구는 QR 코드를 스캔해 보세요!</p>
          <div className="qr"><QRCodeSVG value={import.meta.env.VITE_DRACONIS_QR_URL || 'https://example.com/draconis'} size={170} /></div>
          <button className="outline"><BookOpen /> 드라코니스 앱 안내 <ChevronRight /></button>
          <div className="radio"><Radio /><div><b>석암 라디오 신청도 여기에서!</b><span>신청곡과 사연을 보내 보세요.</span></div></div>
        </aside>
      </section>
      {notice && (
        <div className="modal">
          <div>
            <button className="close" onClick={() => setNotice(false)}>×</button>
            <h2>📣 공지사항</h2>
            {ANNOUNCEMENTS.map((x, i) => <p key={i}>{x}</p>)}
            <button className="hero-btn" onClick={() => setNotice(false)}>확인했어요</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Flow(props: {
  step: Step; grade: number; klass: number; num: number;
  pin: string; setPin: (v: string) => void;
  regCode: string; setRegCode: (v: string) => void;
  lap: LapRange | undefined; setLap: (v: LapRange) => void;
  msg: string; setMsg: (v: string) => void; busy: boolean;
  doneLapRange: LapRange | undefined;
  onPickGrade: (n: number) => void;
  onPickKlass: (n: number) => void;
  onPickNum: (n: number) => void;
  onCodeConfirm: () => void;
  onPrivacyConfirm: () => void;
  onSaveFirstPin: () => void;
  onConfirmPin: () => void;
  onProceedToWalk: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onReset: () => void;
}) {
  const { step, grade, klass, num, pin, setPin, regCode, setRegCode, lap, setLap, msg, setMsg, busy, doneLapRange } = props;

  if (step === 'class') {
    return <Choice title="나는 몇 학년인가요?" sub="학년을 선택해 주세요." items={[1, 2, 3, 4, 5, 6]} suffix="학년" onPick={props.onPickGrade} onReset={props.onReset} />;
  }
  if (step === 'number' && !klass) {
    return <Choice title={`${grade}학년, 몇 반인가요?`} sub="반을 선택해 주세요." items={[1, 2, 3, 4, 5, 6]} suffix="반" onPick={props.onPickKlass} onReset={props.onReset} />;
  }
  if (step === 'number') {
    return <Choice title={`${grade}학년 ${klass}반, 몇 번인가요?`} sub="번호를 선택해 주세요." items={Array.from({ length: 30 }, (_, i) => i + 1)} suffix="번" onPick={props.onPickNum} onReset={props.onReset} disabled={busy} />;
  }
  if (step === 'code') {
    return (
      <PinEntry title="처음 사용하는 학생이에요" sub="선생님께 받은 초기 등록코드를 입력해 주세요."
        value={regCode} onChange={v => { setRegCode(v); setMsg(''); }} action={props.onCodeConfirm}
        error={msg} onForgot={setMsg} busy={false} forgotMsg="선생님께 등록코드를 다시 요청해 주세요." />
    );
  }
  if (step === 'privacy') {
    return (
      <div className="flow">
        <BookOpen className="big-icon" />
        <h2>석암키오스크 이용 안내</h2>
        <p className="notice-copy">아침 걷기 기록 저장을 위해 학년, 반, 번호와 걷기 기록을 사용합니다. 구체적인 안내 문구는 학교 관리자가 운영 기준에 맞게 변경할 수 있습니다.</p>
        <button className="hero-btn" onClick={props.onPrivacyConfirm}>확인했어요</button>
      </div>
    );
  }
  if (step === 'pinSetup') {
    return (
      <PinEntry title="나만의 인증번호를 만들어요" sub="기억하기 쉬운 숫자 4자리를 입력해 주세요."
        value={pin} onChange={v => { setPin(v); setMsg(''); }} action={props.onSaveFirstPin}
        error={msg} onForgot={setMsg} busy={false} />
    );
  }
  if (step === 'pinConfirm') {
    return (
      <PinEntry title="한 번 더 입력해 주세요" sub="같은 인증번호를 다시 눌러 주세요."
        value={pin} onChange={v => { setPin(v); setMsg(''); }} action={props.onConfirmPin}
        error={msg} onForgot={setMsg} busy={busy} />
    );
  }
  if (step === 'pin') {
    return (
      <PinEntry title="인증번호를 입력해 주세요" sub={`${grade}학년 ${klass}반 ${num}번`}
        value={pin} onChange={v => { setPin(v); setMsg(''); }} action={props.onProceedToWalk}
        error={msg} onForgot={setMsg} busy={false} />
    );
  }
  if (step === 'walk') {
    return (
      <div className="flow">
        <Footprints className="big-icon" />
        <h2>오늘 운동장을 얼마나 걸었나요?</h2>
        <p>걸은 바퀴 수를 선택해 주세요.</p>
        <div className="laps">
          {laps.map(x => (
            <button className={lap === x.v ? 'selected' : ''} onClick={() => setLap(x.v)} key={x.v}>
              <span>{x.icon}</span><b>{x.label}</b><small>{x.sub}</small>
            </button>
          ))}
        </div>
        <p className="error">{msg}</p>
        <button disabled={!lap || busy} className="hero-btn" onClick={props.onSubmit}>
          {busy ? <><Loader2 className="spin" size={20} /> 기록하고 있어요…</> : '걷기 인증하기'}
        </button>
      </div>
    );
  }
  if (step === 'already') {
    return (
      <div className="flow success">
        <span className="trophy">🌿</span>
        <h2>오늘 걷기 인증은 이미 완료했어요!</h2>
        <p>오늘 기록: <b>{laps.find(x => x.v === doneLapRange)?.label}</b></p>
        <button className="hero-btn" onClick={props.onReset}>처음으로</button>
      </div>
    );
  }
  if (step === 'notfound') {
    return (
      <div className="flow success">
        <span className="trophy">❗</span>
        <h2>등록된 학생 정보를 찾지 못했어요</h2>
        <p>선생님께 등록을 요청해 주세요.</p>
        <button className="hero-btn" onClick={props.onReset}>처음으로</button>
      </div>
    );
  }
  if (step === 'network') {
    return (
      <div className="flow success">
        <span className="trophy">📡</span>
        <h2>서버와 연결하지 못했어요</h2>
        <p>{msg || '네트워크 상태를 확인하고 다시 시도해 주세요.'}</p>
        <button className="hero-btn" onClick={props.onRetry} disabled={busy}>
          {busy ? <><Loader2 className="spin" size={20} /> 다시 시도하는 중…</> : '다시 시도'}
        </button>
        <button className="text-btn" onClick={props.onReset}>처음으로 돌아가기</button>
      </div>
    );
  }
  return (
    <div className="flow success">
      <span className="trophy">🏆</span>
      <h2>인증 완료!</h2>
      <p>오늘의 걷기 기록이 저장되었습니다.<br /><b>생명의 숲이 더 건강해졌어요!</b></p>
      <small>3초 후 처음 화면으로 돌아가요.</small>
    </div>
  );
}

function Choice({ title, sub, items, suffix, onPick, onReset, disabled }: {
  title: string; sub: string; items: number[]; suffix: string;
  onPick: (n: number) => void; onReset: () => void; disabled?: boolean;
}) {
  return (
    <div className="flow">
      <h2>{title}</h2>
      <p>{sub}</p>
      <div className="choices">
        {items.map(n => <button disabled={disabled} key={n} onClick={() => onPick(n)}><b>{n}</b>{suffix}</button>)}
      </div>
      <button className="back" onClick={onReset}>처음으로 돌아가기</button>
    </div>
  );
}

function PinEntry({ title, sub, value, onChange, action, error, onForgot, busy, forgotMsg }: {
  title: string; sub: string; value: string; onChange: (v: string) => void;
  action: () => void; error: string; onForgot: (msg: string) => void; busy: boolean; forgotMsg?: string;
}) {
  return (
    <div className="flow">
      <LockKeyhole className="big-icon" />
      <h2>{title}</h2>
      <p>{sub}</p>
      <div className="dots">{[0, 1, 2, 3].map(i => <i className={value.length > i ? 'on' : ''} key={i} />)}</div>
      <NumberPad value={value} onChange={onChange} />
      <p className="error">{error}</p>
      <button disabled={value.length !== 4 || busy} className="hero-btn" onClick={action}>
        {busy ? <><Loader2 className="spin" size={20} /> 확인 중…</> : '확인'}
      </button>
      <button className="text-btn" onClick={() => onForgot(forgotMsg ?? '선생님께 인증번호 초기화를 요청해 주세요.')}>인증번호를 잊었어요</button>
    </div>
  );
}
