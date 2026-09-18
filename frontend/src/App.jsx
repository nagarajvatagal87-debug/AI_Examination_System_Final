import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

import Landing from './pages/Landing.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import CollegeInfo from './pages/public/CollegeInfo.jsx'

import StudentDashboard from './pages/student/StudentDashboard.jsx'
import HodDashboard from './pages/hod/HodDashboard.jsx'
import PrincipalDashboard from './pages/principal/PrincipalDashboard.jsx'

import FacultyLayout from './pages/faculty/FacultyLayout.jsx'
import DashboardHome from './pages/faculty/DashboardHome.jsx'
import MySubjects from './pages/faculty/MySubjects.jsx'
import Examinations from './pages/faculty/Examinations.jsx'
import CreateExamination from './pages/faculty/CreateExamination.jsx'
import Evaluation from './pages/faculty/Evaluation.jsx'
import EvaluationDetail from './pages/faculty/EvaluationDetail.jsx'
import Results from './pages/faculty/Results.jsx'
import Analytics from './pages/faculty/Analytics.jsx'
import ExamPreview from './pages/faculty/ExamPreview.jsx'
import FacultyComplaints from './pages/faculty/FacultyComplaints.jsx'
import HODMessages from './pages/faculty/HODMessages.jsx'
import Notifications from './pages/faculty/Notifications.jsx'

import ExamDeptLayout from './pages/examdept/ExamDeptLayout.jsx'
import ExamDeptDashboard from './pages/examdept/ExamDeptDashboard.jsx'
import ExamDeptExaminations from './pages/examdept/ExamDeptExaminations.jsx'
import ExamDeptEvaluation from './pages/examdept/ExamDeptEvaluation.jsx'
import ExamDeptEvaluationDetail from './pages/examdept/ExamDeptEvaluationDetail.jsx'
import ExamDeptResults from './pages/examdept/ExamDeptResults.jsx'

// ExamPreview.jsx expects an examId PROP, but this route gives us a URL param —
// this wrapper bridges the two so ExamPreview itself doesn't need to change.
function ExamPreviewWrapper() {
  const { examId } = useParams()
  return <ExamPreview examId={examId} />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes — no login required */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/college-info" element={<CollegeInfo />} />

          {/* Authenticated, role-restricted routes */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/faculty"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="examinations" element={<Examinations />} />
            <Route path="examinations/create" element={<CreateExamination />} />
            <Route path="examinations/:examId/preview" element={<ExamPreviewWrapper />} />
            <Route path="evaluation" element={<Evaluation />} />
            <Route path="evaluation/:examId/:studentId" element={<EvaluationDetail />} />
            <Route path="results" element={<Results />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="complaints" element={<FacultyComplaints />} />
            <Route path="messages" element={<HODMessages />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route
            path="/examdept"
            element={
              <ProtectedRoute allowedRoles={['examdept']}>
                <ExamDeptLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ExamDeptDashboard />} />
            <Route path="examinations" element={<ExamDeptExaminations />} />
            <Route path="evaluation" element={<ExamDeptEvaluation />} />
            <Route path="evaluation/:examId/:studentId" element={<ExamDeptEvaluationDetail />} />
            <Route path="results" element={<ExamDeptResults />} />
          </Route>

          {/* HOD keeps its existing section-switching dashboard (Sidebar.jsx + internal sections) */}
          <Route
            path="/hod/*"
            element={
              <ProtectedRoute allowedRoles={['hod']}>
                <HodDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/principal/*"
            element={
              <ProtectedRoute allowedRoles={['principal']}>
                <PrincipalDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default: unknown paths go to the landing page, where every role can pick where to go */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}