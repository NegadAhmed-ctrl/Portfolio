import { NavLink, Outlet } from "react-router-dom";
import { STORE } from "../data/seed";
import { can, ROLE_LABEL } from "../domain/permissions";
import { useApp } from "../state/app";
import { Icon, type IconName } from "./Icon";
import { DemoStrip } from "./DemoStrip";

const NAV: { to: string; label: string; icon: IconName; need?: Parameters<typeof can>[1] }[] = [
  { to: "/", label: "اليوم في المخزن", icon: "pulse" },
  { to: "/inventory", label: "الأصناف", icon: "shelves" },
  { to: "/users", label: "فريق العمل", icon: "people", need: "users.view" },
];

export function Shell() {
  const { session, signOut } = useApp();
  const user = session!.user;
  const items = NAV.filter((n) => !n.need || can(user.role, n.need));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-ink text-paper-card md:flex">
        <div className="px-5 pb-6 pt-6">
          <p className="font-display text-[21px] leading-tight">{STORE.name}</p>
          <p className="mt-1 text-[12.5px] text-paper-card/60">{STORE.branch}</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3" aria-label="الأقسام">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-box px-3 py-2.5 text-[14.5px] transition ${isActive ? "bg-white/10 text-white before:absolute before:inset-y-2 before:right-0 before:w-[3px] before:rounded before:bg-tape" : "text-paper-card/70 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <p className="text-[14px]">{user.name}</p>
          <p className="text-[12.5px] text-paper-card/60">{ROLE_LABEL[user.role]}</p>
          <button onClick={signOut} className="mt-3 inline-flex items-center gap-2 text-[13px] text-paper-card/70 hover:text-white">
            <Icon name="exit" size={16} /> خروج
          </button>
        </div>
        <p className="px-5 pb-4 text-[11px] text-paper-card/40">Negad Builds</p>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* top bar (phone) */}
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-paper-card md:hidden">
          <div>
            <p className="font-display text-[17px] leading-tight">{STORE.name}</p>
            <p className="text-[12px] text-paper-card/60">
              {user.name} ({ROLE_LABEL[user.role]})
            </p>
          </div>
          <button onClick={signOut} className="rounded-box p-2 text-paper-card/80" aria-label="خروج">
            <Icon name="exit" />
          </button>
        </header>
        <DemoStrip />
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* bottom nav (phone) */}
      <nav aria-label="الأقسام" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-ink-line bg-paper-card md:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[12px] ${isActive ? "text-ink" : "text-ink-3"}`}>
            {({ isActive }) => (
              <>
                <span className={`h-[3px] w-8 rounded-b ${isActive ? "bg-tape" : "bg-transparent"}`} />
                <Icon name={n.icon} />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
