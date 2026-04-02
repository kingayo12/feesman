import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";

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
import LetterTemplates from "./pages/letters/LetterTemplatesNew.jsx";

import SettingsPage from "./pages/settings/Setting.jsx";
import MigrateTerms from "./pages/settings/MigrateTerms.jsx";

import PreviousBalances from "./pages/previous_balance/Previousbalances.jsx";
import Discounts from "./pages/discount/Discounts.jsx";
import RoleManagement from "./pages/roles/RoleManagement.jsx";

import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import RoleGuard from "./components/common/RoleGuard.jsx";
import MasterLayout from "./Layout/MasterLayout.jsx";

import { PERMISSIONS } from "./config/permissions.js";

// Combines auth check + role check in one wrapper
function Guard({ permission, children }) {
  return (
    <ProtectedRoute>
      <RoleGuard permission={permission}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no auth required */}
        <Route path='/' element={<Navigate to='/login' replace />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />

        {/* All app pages inside MasterLayout */}
        <Route
          path='/*'
          element={
            <MasterLayout>
              <Routes>
                {/* Dashboard — every logged-in user can see this,
                    but Dashboard.jsx itself branches on role (user vs full) */}
                <Route
                  path='/dashboard'
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Families */}
                <Route
                  path='/families'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_FAMILIES}>
                      <FamilyList />
                    </Guard>
                  }
                />
                <Route
                  path='/families/:id'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_FAMILIES}>
                      <FamilyDetails />
                    </Guard>
                  }
                />

                {/* Students */}
                <Route
                  path='/students'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_STUDENTS}>
                      <StudentList />
                    </Guard>
                  }
                />
                <Route
                  path='/students/:id'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_STUDENTS}>
                      <StudentDetails />
                    </Guard>
                  }
                />

                {/* Classes */}
                <Route
                  path='/classes'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_CLASSES}>
                      <ClassList />
                    </Guard>
                  }
                />
                <Route
                  path='/classes/:id'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_CLASSES}>
                      <ClassDetails />
                    </Guard>
                  }
                />

                {/* Fees */}
                <Route
                  path='/fees'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_FEES}>
                      <FeeSetup />
                    </Guard>
                  }
                />
                <Route
                  path='/payment-history'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_PAYMENTS}>
                      <PaymentHistory />
                    </Guard>
                  }
                />

                {/* Reports */}
                <Route
                  path='/reports'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_REPORTS}>
                      <Reports />
                    </Guard>
                  }
                />

                <Route
                  path='/letters'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_LETTERS}>
                      <LetterTemplates />
                    </Guard>
                  }
                />

                {/* Finance tools */}
                <Route
                  path='/balance'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_BALANCES}>
                      <PreviousBalances />
                    </Guard>
                  }
                />
                <Route
                  path='/discount'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_DISCOUNTS}>
                      <Discounts />
                    </Guard>
                  }
                />

                {/* Role management */}
                <Route
                  path='/roles'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_ROLES}>
                      <RoleManagement />
                    </Guard>
                  }
                />

                {/* Settings */}
                <Route
                  path='/settings'
                  element={
                    <Guard permission={PERMISSIONS.VIEW_SETTINGS}>
                      <SettingsPage />
                    </Guard>
                  }
                />
                <Route
                  path='/migrate'
                  element={
                    <Guard permission={PERMISSIONS.DANGER_ZONE}>
                      <MigrateTerms />
                    </Guard>
                  }
                />

                {/* Catch-all → dashboard */}
                <Route path='*' element={<Navigate to='/dashboard' replace />} />
              </Routes>
            </MasterLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
