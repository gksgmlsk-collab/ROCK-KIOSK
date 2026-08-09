
import Kiosk from './components/Kiosk';import Admin from './components/Admin';
export default function App(){return location.pathname.startsWith('/admin')?<Admin/>:<Kiosk/>}
