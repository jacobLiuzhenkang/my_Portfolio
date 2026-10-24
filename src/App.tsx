import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import Home from "./pages/Home";
import Growth from "./pages/Growth";
import PublicLayout from "./components/PublicLayout";

const Admin = lazy(() => import("./pages/Admin"));

export default function App() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/admin") document.title = "内容管理 — 刘振康";
  }, [location.pathname]);
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <Suspense
            fallback={<main className="pf-loading">正在打开内容管理…</main>}
          >
            <Admin />
          </Suspense>
        }
      />
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
