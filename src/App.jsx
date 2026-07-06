import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import PinGate from './components/PinGate'
import SitePinGate from './components/SitePinGate'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import Home from './pages/Home'
import Todos from './pages/Todos'
import Notes from './pages/Notes'
import Projects from './pages/Projects'
import Checklist from './pages/Checklist'
import Meetings from './pages/Meetings'
import Notifications from './pages/Notifications'
import StaffTodos from './pages/StaffTodos'
import Accounting from './pages/Accounting'
import Staffing from './pages/Staffing'
import Weekly from './pages/Weekly'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SitePinGate>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/todos" element={<PinGate><Todos /></PinGate>} />
          <Route path="/notes" element={<PinGate><Notes /></PinGate>} />
          <Route path="/projects" element={<PinGate><Projects /></PinGate>} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/notifications" element={<PinGate><Notifications /></PinGate>} />
          <Route path="/staff-todos" element={<StaffTodos />} />
          <Route path="/accounting" element={<PinGate><Accounting /></PinGate>} />
          <Route path="/staffing" element={<Staffing />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SitePinGate>
    </BrowserRouter>
  )
}
