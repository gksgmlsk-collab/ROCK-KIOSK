
import Kiosk from './components/Kiosk';import Admin from './components/Admin';
export default function App(){return new URLSearchParams(location.search).get('view')==='admin'?<Admin/>:<Kiosk/>}
