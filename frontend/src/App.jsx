// export default App;

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CreateUser from "./pages/Admin/CreateUser";
import RequestsList from "./pages/Admin/RequestsList";
import CreateRequest from "./pages/Planner/CreateRequest";
import CreatePart from "./pages/Admin/CreatePart";
import ProtectedRoute from "./components/ProtectedRoute";
import Datadashboard from "./pages/Warehouse/Datadashboard";
import Alldatadashboard from "./pages/Warehouse/Alldatadashboard";
import MappingMaterial from "./pages/Quality/Mapping";
import LocateMaterial from "./pages/Warehouse/Locatematerial";
import MaterialHistory from "./pages/Warehouse/Materialhistory";
import WithdrawalMaterial from "./pages/Warehouse/Withdrawal";
import HotlistRequest from "./pages/Buyer/Hotlist";
import MaterialScoreboard from "./pages/Quality/Materialscoreboard";
import RawMaterial from "./pages/Warehouse/Rawmaterial";
import ShimentDashboard from "./pages/Warehouse/Shipmentdashboard";
import CalendarView from "./pages/Admin/CalendarView";
import MaterialMetrics from "./pages/Quality/MaterialMetrics";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Layout />}>
        {/* Admin Routes */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <CreateUser />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/requests"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <RequestsList showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/parts"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <CreatePart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Datadashboard showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/withdrawalmaterial"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <WithdrawalMaterial showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/calendarView"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "WAREHOUSE"]}>
              <CalendarView showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/shipmentdashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ShimentDashboard showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/materialmetrics"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <MaterialMetrics showAll={true} />
            </ProtectedRoute>
          }
        />

        {/* Planner Routes */}
        <Route
          path="/planner/requests"
          element={
            <ProtectedRoute allowedRoles={["PLANNER"]}>
              <RequestsList showAll={false} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/planner/request/new"
          element={
            <ProtectedRoute allowedRoles={["PLANNER"]}>
              <CreateRequest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/planner/parts"
          element={
            <ProtectedRoute allowedRoles={["PLANNER"]}>
              <CreatePart />
            </ProtectedRoute>
          }
        />

        {/* Warehouse Routes */}
        <Route
          path="/warehouse/requests"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <RequestsList showAll={true} warehouseView={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/dashboard"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <Datadashboard showAll={true} warehouseView={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/allshipmentsdashboard"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <Alldatadashboard showAll={true} warehouseView={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/locatematerial"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <LocateMaterial showAll={true} warehouseView={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/materialhistory"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <MaterialHistory showAll={true} warehouseView={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/mapping"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <MappingMaterial showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/withdrawalmaterial"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <WithdrawalMaterial showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/scoreboardmaterial"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <MaterialScoreboard showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/warehouse/rawmaterialregister"
          element={
            <ProtectedRoute allowedRoles={["WAREHOUSE"]}>
              <RawMaterial showAll={true} />
            </ProtectedRoute>
          }
        />

        {/* Quality Routes */}
        <Route
          path="/quality/mapping"
          element={
            <ProtectedRoute allowedRoles={["QUALITY", "ADMIN"]}>
              <MappingMaterial showAll={true} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quality/scoreboardmaterial"
          element={
            <ProtectedRoute allowedRoles={["QUALITY", "ADMIN"]}>
              <MaterialScoreboard showAll={true} />
            </ProtectedRoute>
          }
        />

        {/* Buyer Routes */}
        <Route
          path="/buyer/hotlist"
          element={
            <ProtectedRoute allowedRoles={["BUYER"]}>
              <HotlistRequest showAll={true} />
            </ProtectedRoute>
          }
        />

        {/* Redirección automática según rol */}
        <Route
          index
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "PLANNER", "WAREHOUSE", "QUALITY"]}
            >
              {(() => {
                const user = JSON.parse(localStorage.getItem("user"));
                if (!user) return <Navigate to="/login" replace />;

                switch (user.role) {
                  case "ADMIN":
                    return <Navigate to="/admin/requests" replace />;
                  case "PLANNER":
                    return <Navigate to="/planner/requests" replace />;
                  case "WAREHOUSE":
                    return <Navigate to="/warehouse/requests" replace />;
                  case "QUALITY":
                    return <Navigate to="/quality/mapping" replace />;
                  default:
                    return <Navigate to="/login" replace />;
                }
              })()}
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
