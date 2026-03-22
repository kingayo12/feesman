import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Reports from "./pages/dashboard/Reports.jsx";

import FamilyList from "./pages/families/FamilyList.jsx";
import FamilyDetails from "./pages/families/FamilyDetails.jsx";

import StudentList from "./pages/students/StudentList.jsx";
import StudentDetails from "./pages/students/StudentDetails.jsx";

import ClassList from "./pages/classes/ClassList.jsx";
import ClassDetails from "./pages/classes/ClassDetails.jsx";

import FeeSetup from "./pages/fees/FeeSetup.jsx";
import PaymentHistory from "./pages/fees/PaymentHistory.jsx";

import SettingsPage from "./pages/settings/Setting.jsx";
import MigrateTerms from "./pages/settings/MigrateTerms.jsx";

import PreviousBalances from "./pages/previous_balance/Previousbalances.jsx";
import Discounts from "./pages/discount/Discounts.jsx";

import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import MasterLayout from "./Layout/MasterLayout.jsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — bare root goes to login */}
        <Route path='/' element={<Navigate to='/login' replace />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />

        {/* All protected pages live inside MasterLayout */}
        <Route
          path='/*'
          element={
            <MasterLayout>
              <Routes>
                <Route
                  path='/dashboard'
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/families'
                  element={
                    <ProtectedRoute>
                      <FamilyList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/families/:id'
                  element={
                    <ProtectedRoute>
                      <FamilyDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/students'
                  element={
                    <ProtectedRoute>
                      <StudentList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/students/:id'
                  element={
                    <ProtectedRoute>
                      <StudentDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/classes'
                  element={
                    <ProtectedRoute>
                      <ClassList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/classes/:id'
                  element={
                    <ProtectedRoute>
                      <ClassDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/fees'
                  element={
                    <ProtectedRoute>
                      <FeeSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/payment-history'
                  element={
                    <ProtectedRoute>
                      <PaymentHistory />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/reports'
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/balance'
                  element={
                    <ProtectedRoute>
                      <PreviousBalances />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/discount'
                  element={
                    <ProtectedRoute>
                      <Discounts />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/settings'
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/migrate'
                  element={
                    <ProtectedRoute>
                      <MigrateTerms />
                    </ProtectedRoute>
                  }
                />

                {/* Anything unknown → dashboard */}
                <Route path='*' element={<Navigate to='/dashboard' replace />} />
              </Routes>
            </MasterLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
