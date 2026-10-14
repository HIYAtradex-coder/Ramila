import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { PosPage } from "./pages/PosPage";
import { DailyReportsPage } from "./pages/DailyReportsPage";
import { LotteryPage } from "./pages/LotteryPage";
import { SalesTaxPage } from "./pages/SalesTaxPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { CamerasPage } from "./pages/CamerasPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { MultiStorePage } from "./pages/MultiStorePage";
import { VendorsPage } from "./pages/VendorsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PricingPage } from "./pages/PricingPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/reports" element={<DailyReportsPage />} />
          <Route path="/lottery" element={<LotteryPage />} />
          <Route path="/sales-tax" element={<SalesTaxPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/stores" element={<MultiStorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
