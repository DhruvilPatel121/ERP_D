import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import IntersectObserver from "@/components/common/IntersectObserver";
import { useAuth } from "@/contexts/ERPAuthContext";
import { AppLayout } from "@/components/layouts/AppLayout";

// Pages
import LoginPage from "@/pages/LoginPage";
import SetupWizardPage from "@/pages/SetupWizardPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomersPage from "@/pages/CustomersPage";
import StonesPage from "@/pages/StonesPage";
import PatternsPage from "@/pages/PatternsPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import KarigarsPage from "@/pages/KarigarsPage";
import ProductionPage from "@/pages/ProductionPage";
import ReportsPage from "@/pages/ReportsPage";
import ExportPage from "@/pages/ExportPage";
import BackupPage from "@/pages/BackupPage";
import ActivityPage from "@/pages/ActivityPage";
import SettingsPage from "@/pages/SettingsPage";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { auth, setupComplete } = useAuth();
  if (!setupComplete) return <Navigate to="/setup" replace />;
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App: React.FC = () => {
  const { auth, setupComplete } = useAuth();

  return (
    <>
      <IntersectObserver />
      <Routes>
        <Route
          path="/setup"
          element={
            !setupComplete ? (
              <SetupWizardPage />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !setupComplete ? (
              <Navigate to="/setup" replace />
            ) : auth.isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <DashboardPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedLayout>
              <CustomersPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedLayout>
              <CustomersPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/stones"
          element={
            <ProtectedLayout>
              <StonesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/stones/micro"
          element={
            <ProtectedLayout>
              <StonesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/stones/ad"
          element={
            <ProtectedLayout>
              <StonesPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/patterns"
          element={
            <ProtectedLayout>
              <PatternsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/patterns/:id"
          element={
            <ProtectedLayout>
              <PatternsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedLayout>
              <OrdersPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedLayout>
              <OrderDetailPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/karigars"
          element={
            <ProtectedLayout>
              <KarigarsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/production"
          element={
            <ProtectedLayout>
              <ProductionPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedLayout>
              <ReportsPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/export"
          element={
            <ProtectedLayout>
              <ExportPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/backup"
          element={
            <ProtectedLayout>
              <BackupPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedLayout>
              <ActivityPage />
            </ProtectedLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <SettingsPage />
            </ProtectedLayout>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            !setupComplete ? (
              <Navigate to="/setup" replace />
            ) : auth.isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
