import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
// import Dashboard from "./features/dashboard/Dashboard.jsx";
// import Reports from "./features/dashboard/Reports.jsx";
// import FamilyList from "./features/families/FamilyList.jsx";
// import StudentList from "./features/students/StudentList.jsx";
// import ClassList from "./features/classes/ClassList.jsx";
// import FeeSetup from "./features/fees/FeeSetup.jsx";

// import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
// import FamilyDetails from "./features/families/FamilyDetails.jsx";
// import StudentDetails from "./features/students/StudentDetails.jsx";
// import MasterLayout from "./Layout/MasterLayout.jsx";
// import ClassDetails from "./features/classes/ClassDetails.jsx";
// import SettingsPage from "./features/settings/Setting.jsx";
// import MigrateTerms from "./features/settings/MigrateTerms.jsx";
// import PaymentHistory from "./features/fees/PaymentHistory.jsx";
// import PreviousBalances from "./features/previous_balance/Previousbalances.jsx";
// import Discounts from "./features/discount/Discounts.jsx";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path='/' element={<Login />} />
        <Route path='/register' element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}
