import {useEffect,useState} from 'react';
import {BookOpen,ChevronDown,Footprints,IdCard,KeyRound,LockKeyhole,Radio,UserPlus} from 'lucide-react';
import Header from './Header';
import {store} from '../data/store';
import type {LapRange,Student} from '../types';

type Step='home'|'register'|'privacy'|'setup'|'confirm'|'login'|'walk'|'success'|'already';
const draconisUrl=import.meta.env.VITE_DRACONIS_QR_URL||'https://draconis.up.railway.app/#/login';
const lapOptions:{value:LapRange;label:string;icon:string}[]=[
  {value:'1_2',label:'1~2바퀴',icon:'🐾'},{value:'3_5',label:'3~5바퀴',icon:'🌿'},
  {value:'6_9',label:'6~9바퀴',icon:'⭐'},{value:'10_PLUS',label:'10바퀴 이상',icon:'🏆'},
];

export default function Kiosk(){
  const [step,setStep]=useState<Step>('home');
  const [grade,setGrade]=useState(1),[classNo,setClassNo]=useState(1),[studentNo,setStudentNo]=useState('');
  const [pin,setPin]=useState(''),[firstPin,setFirstPin]=useState('');
  const [student,setStudent]=useState<Student>(),[lap,setLap]=useState<LapRange>('1_2');
  const [consent,setConsent]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(false);
  const reset=()=>{setStep('home');setGrade(1);setClassNo(1);setStudentNo('');setPin('');setFirstPin('');setStudent(undefined);setLap('1_2');setConsent(false);setMessage('');setBusy(false)};
  useEffect(()=>{if(step==='success'){const timer=setTimeout(reset,3000);return()=>clearTimeout(timer)}},[step]);
  useEffect(()=>{if(step==='home'||step==='success')return;const timer=setTimeout(reset,30000);return()=>clearTimeout(timer)},[step,grade,classNo,studentNo,pin,lap]);

  const findStudent=()=>{const no=Number(studentNo);if(!no){setMessage('학생 번호를 입력해 주세요.');return}const found=store.find(grade,classNo,no);if(!found){setMessage('등록된 학생을 찾지 못했어요. 선생님께 문의해 주세요.');return}return found};
  const startRegistration=()=>{const found=findStudent();if(!found)return;if(found.pin){setMessage('이미 인증번호가 있어요. 기존 이용 버튼을 눌러 주세요.');return}setStudent(found);setMessage('');setStep('privacy')};
  const login=()=>{const found=findStudent();if(!found)return;if(!found.pin){setMessage('아직 인증번호가 없어요. 처음 이용 버튼을 눌러 주세요.');return}if(found.lockedUntil&&found.lockedUntil>Date.now()){setMessage('여러 번 잘못 입력했어요. 잠시 후 다시 시도해 주세요.');return}if(pin!==found.pin){found.failedAttempts++;if(found.failedAttempts>=5){found.lockedUntil=Date.now()+300000;found.failedAttempts=0}setPin('');setMessage('인증번호를 다시 확인해 주세요.');return}found.failedAttempts=0;setStudent(found);setPin('');if(store.record(found.id)){setStep('already')}else setStep('walk')};
  const savePin=()=>{if(!/^\d{4}$/.test(pin)){setMessage('숫자 4자리로 만들어 주세요.');return}setFirstPin(pin);setPin('');setMessage('');setStep('confirm')};
  const confirmPin=()=>{if(pin!==firstPin){setPin('');setFirstPin('');setMessage('인증번호가 달라요. 다시 만들어 주세요.');setStep('setup');return}if(!student)return;student.pin=pin;student.codeUsed=true;setPin('');setStep('walk')};
  const submitWalk=()=>{if(!student||busy)return;setBusy(true);setTimeout(()=>{try{store.submit(student.id,lap);setStep('success')}catch{setStep('already')}finally{setBusy(false)}},450)};

  return <main className="kiosk compact-kiosk">
    <Header onNotice={()=>setNotice(true)}/>
    <section className="stage compact-stage">
      <div className="panel primary compact-panel">
        <div className="seal"><IdCard/></div>
        {step==='home'&&<Home/>}
        {step==='register'&&<FirstStudentForm/>}
        {step==='login'&&<StudentForm title="인증번호가 있어요" subtitle="학생 정보와 내가 만든 인증번호를 입력해 주세요." secretLabel="인증번호" secret={pin} setSecret={setPin} action="확인" onSubmit={login}/>}
        {step==='privacy'&&<div className="single-flow"><BookOpen className="flow-icon"/><h2>석암키오스크 이용 안내</h2><div className="privacy-box"><b>걷기 기록을 안전하게 저장해요</b><p>아침 걷기 기록을 저장하기 위해 학년, 반, 번호와 걷기 기록을 사용합니다. 다른 학생에게 내 인증번호를 알려주지 마세요.</p></div><label className="consent-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>안내 내용을 확인했고 이용에 동의해요.</span></label><button className="hero-btn" disabled={!consent} onClick={()=>setStep('setup')}>동의하고 계속</button><Back/></div>}
        {step==='setup'&&<PinMaker title="나만의 인증번호를 만들어요" subtitle="기억하기 쉬운 숫자 4자리를 입력해 주세요." button="한 번 더 입력" action={savePin}/>}
        {step==='confirm'&&<PinMaker title="인증번호를 한 번 더 입력해요" subtitle="방금 만든 번호와 똑같이 입력해 주세요." button="인증번호 만들기" action={confirmPin}/>}
        {step==='walk'&&<div className="single-flow"><Footprints className="flow-icon"/><h2>오늘 몇 바퀴 걸었나요?</h2><p>{grade}학년 {classNo}반 {studentNo}번</p><div className="walk-grid">{lapOptions.map(item=><button key={item.value} className={lap===item.value?'selected':''} onClick={()=>setLap(item.value)}><span>{item.icon}</span><b>{item.label}</b></button>)}</div><button className="hero-btn" disabled={busy} onClick={submitWalk}>{busy?'기록하고 있어요…':'걷기 인증하기'}</button><Back/></div>}
        {step==='success'&&<Result icon="🏆" title="인증 완료!" text="오늘의 걷기 기록이 저장되었습니다."/>}
        {step==='already'&&<Result icon="🌿" title="오늘 인증은 이미 완료했어요!" text="하루에 한 번만 기록할 수 있어요." button/>}
      </div>
      <aside className="panel side compact-side">
        <div className="seal"><BookOpen/></div><h2>드라코니스</h2><p>핸드폰 카메라로 QR 코드를 찍고<br/><b>드라코니스에 들어가 보세요!</b></p>
        <a className="qr active-qr" href={draconisUrl} target="_blank" rel="noreferrer" aria-label="드라코니스 로그인 QR 코드"><img src="/assets/draconis-qr.png" alt="드라코니스 로그인 QR 코드"/></a>
        <a className="outline" href={draconisUrl} target="_blank" rel="noreferrer"><BookOpen/> 드라코니스 바로가기</a>
        <div className="radio"><Radio/><div><b>석암 라디오 신청도 여기에서!</b><span>신청곡과 사연을 보내 보세요.</span></div></div>
      </aside>
    </section>
    <a className="teacher-entry" href="/?view=admin"><LockKeyhole/> 교사 관리</a>
    {notice&&<div className="modal"><div><button className="close" onClick={()=>setNotice(false)}>×</button><h2>📣 공지사항</h2>{store.announcements.map((item,index)=><p key={index}>{item}</p>)}<button className="hero-btn" onClick={()=>setNotice(false)}>확인했어요</button></div></div>}
  </main>;

  function Home(){return <div className="home-choice"><h2>걷기 인증을 시작해요</h2><p>나에게 맞는 버튼을 눌러 주세요.</p><button className="entry-card new" onClick={()=>{setMessage('');setStep('register')}}><UserPlus/><span><b>처음 이용해요</b><small>개인정보 확인 후 인증번호 만들기</small></span></button><button className="entry-card returning" onClick={()=>{setMessage('');setStep('login')}}><KeyRound/><span><b>인증번호가 있어요</b><small>내 인증번호로 바로 시작하기</small></span></button><div className="privacy-note"><LockKeyhole/> 인증이 끝나면 입력한 정보는 화면에서 바로 지워져요.</div></div>}
  function FirstStudentForm(){return <div className="single-flow"><h2>처음 이용하는 학생</h2><p>학년, 반, 번호를 입력해 주세요.</p><div className="quick-form"><SelectRow label="🎓 학년" value={grade} setValue={setGrade} suffix="학년"/><SelectRow label="🛡️ 반" value={classNo} setValue={setClassNo} suffix="반"/><label><span>⭐ 번호</span><input inputMode="numeric" maxLength={2} value={studentNo} onChange={e=>{setStudentNo(e.target.value.replace(/\D/g,''));setMessage('')}} placeholder="예: 25"/></label></div><p className="form-message">{message}</p><button className="hero-btn" onClick={startRegistration}>개인정보 안내 확인</button><Back/></div>}
  function StudentForm({title,subtitle,secretLabel,secret,setSecret,action,onSubmit}:{title:string;subtitle:string;secretLabel:string;secret:string;setSecret:(v:string)=>void;action:string;onSubmit:()=>void}){return <div className="single-flow"><h2>{title}</h2><p>{subtitle}</p><div className="quick-form"><SelectRow label="🎓 학년" value={grade} setValue={setGrade} suffix="학년"/><SelectRow label="🛡️ 반" value={classNo} setValue={setClassNo} suffix="반"/><label><span>⭐ 번호</span><input inputMode="numeric" maxLength={2} value={studentNo} onChange={e=>{setStudentNo(e.target.value.replace(/\D/g,''));setMessage('')}} placeholder="예: 15"/></label><label><span><LockKeyhole/> {secretLabel}</span><input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={secret} onChange={e=>{setSecret(e.target.value.replace(/\D/g,''));setMessage('')}} placeholder="숫자 4자리"/></label></div><p className="form-message">{message}</p><button className="hero-btn" onClick={onSubmit}>{action}</button><Back/></div>}
  function SelectRow({label,value,setValue,suffix}:{label:string;value:number;setValue:(v:number)=>void;suffix:string}){return <label><span>{label}</span><div className="select-wrap"><select value={value} onChange={e=>setValue(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}{suffix}</option>)}</select><ChevronDown/></div></label>}
  function PinMaker({title,subtitle,button,action}:{title:string;subtitle:string;button:string;action:()=>void}){return <div className="single-flow"><LockKeyhole className="flow-icon"/><h2>{title}</h2><p>{subtitle}</p><input className="pin-box" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={e=>{setPin(e.target.value.replace(/\D/g,''));setMessage('')}} placeholder="●  ●  ●  ●"/><p className="form-message">{message}</p><button className="hero-btn" disabled={pin.length!==4} onClick={action}>{button}</button><Back/></div>}
  function Back(){return <button className="back" onClick={reset}>처음 화면으로 돌아가기</button>}
  function Result({icon,title,text,button}:{icon:string;title:string;text:string;button?:boolean}){return <div className="result-screen"><span>{icon}</span><h2>{title}</h2><p>{text}</p>{button?<button className="hero-btn" onClick={reset}>처음으로</button>:<small>3초 후 자동으로 초기화됩니다.</small>}</div>}
}
