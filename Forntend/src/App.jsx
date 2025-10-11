import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import VideoCall from './pages/VideoCall'
import ClaimForm from './pages/ClaimForm'
import PDFPreview from './pages/PDFPreview'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route path="/meeting/:roomId" element={<VideoCall />} />
      <Route 
        path="/claim-form" 
        element={
          <ProtectedRoute>
            <ClaimForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pdf-preview" 
        element={
          <ProtectedRoute>
            <PDFPreview />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
