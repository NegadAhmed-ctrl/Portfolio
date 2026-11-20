import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { can, type Action } from "./domain/permissions";
import { useApp } from "./state/app";
import { Shell } from "./ui/Shell";
import { Spinner } from "./ui/kit";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { Inventory } from "./pages/Inventory";
import { Users } from "./pages/Users";
import { NotAllowed, NotFound } from "./pages/NotAllowed";

/** Signed-out visitors go to /login and come back to the page they asked for. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, booting } = useApp();
  const loc = useLocation();
  if (booting)
    return (
      <div className="grid min-h-dvh place-items-center text-ink-2" role="status">
        <Spinner />
      </div>
    );
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children}</>;
}

/** Role-based route: the page is not rendered at all without the permission. */
function RequirePermission({ action, children }: { action: Action; children: ReactNode }) {
  const role = useApp().session?.user.role;
  return can(role, action) ? <>{children}</> : <NotAllowed />;
}

export function App() {
  return (
    // HashRouter: GitHub Pages has no server rewrites, so deep links must not 404.
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Shell />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="users" element={<RequirePermission action="users.view"><Users /></RequirePermission>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
