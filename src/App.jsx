import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PinGate from './components/PinGate'
import Home from './pages/Home'
import Todos from './pages/Todos'
import Notes from './pages/Notes'
import Projects from './pages/Projects'
import Checklist from './pages/Checklist'
import Meetings from './pages/Meetings'
import Notifications from './pages/Notifications'
import StaffTodos from './pages/StaffTodos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/todos" element={<PinGate><Todos /></PinGate>} />
        <Route path="/notes" element={<PinGate><Notes /></PinGate>} />
        <Route path="/projects" element={<PinGate><Projects /></PinGate>} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route path="/notifications" element={<PinGate><Notifications /></PinGate>} />
        <Route path="/staff-todos" element={<StaffTodos />} />
      </Routes>
    </BrowserRouter>
  )
}
