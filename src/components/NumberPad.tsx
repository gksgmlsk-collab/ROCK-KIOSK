
import {Delete} from 'lucide-react';
export default function NumberPad({value,onChange,max=4}:{value:string;onChange:(v:string)=>void;max?:number}){return <div className="pad">{[1,2,3,4,5,6,7,8,9].map(n=><button key={n} onClick={()=>value.length<max&&onChange(value+n)}>{n}</button>)}<button className="muted" onClick={()=>onChange('')}>지움</button><button onClick={()=>value.length<max&&onChange(value+'0')}>0</button><button aria-label="한 글자 지우기" onClick={()=>onChange(value.slice(0,-1))}><Delete/></button></div>}
