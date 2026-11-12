import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

// Interviewer / survey zone
import { LoginPage } from '@/features/auth/LoginPage'
import { SurveyShell } from '@/features/survey/SurveyShell'

// Admin zone
import { AdminLogin } from '@/features/auth/AdminLogin'
import { AdminGuard } from '@/features/auth/AdminGuard'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { QuizListPage } from '@/features/admin/quizzes/QuizListPage'
import { QuizEditorPage } from '@/features/admin/quizzes/QuizEditorPage'
import { ResultsPage } from '@/features/admin/results/ResultsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Interviewer zone ── */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/survey/*" element={<SurveyShell />} />

        {/* ── Admin zone ── */}
        <Route path="/admin">
          {/* Login: /admin exact */}
          <Route index element={<AdminLogin />} />

          {/* Beveiligde pagina's: /admin/... */}
          <Route
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route path="quizzes" element={<QuizListPage />} />
            <Route path="quizzes/new" element={<QuizEditorPage />} />
            <Route path="quizzes/:id" element={<QuizEditorPage />} />
            <Route path="results/:quizId" element={<ResultsPage />} />

            <Route index element={<Navigate to="quizzes" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
