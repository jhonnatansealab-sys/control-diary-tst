import {
  Anchor,
  ClipboardList,
  FilePenLine,
  Gauge,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { AuthUser } from "../types";
import { isDemoMode } from "../lib/supabase";

interface LayoutProps {
  children: ReactNode;
  user: AuthUser;
  onLogout: () => void;
}

const baseNav = [
  { to: "/", label: "Visao geral", icon: Gauge },
  { to: "/novo", label: "Nova diaria", icon: PlusCircle },
  { to: "/registros", label: "Registros", icon: ClipboardList },
  { to: "/solicitacoes", label: "Solicitacoes", icon: FilePenLine },
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function Layout({ children, user, onLogout }: LayoutProps) {
  const [open, setOpen] = useState(false);
  const navItems =
    user.role === "admin"
      ? [...baseNav, { to: "/administracao", label: "Administracao", icon: Settings }]
      : baseNav;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Anchor size={24} strokeWidth={2.4} />
          </div>
          <div>
            <strong>Diarias TST</strong>
            <span>Controle operacional</span>
          </div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isDemoMode && <span className="demo-pill">Ambiente demonstracao</span>}
          <button className="user-card" onClick={onLogout}>
            <span className="avatar">{initials(user.name)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            <ShieldCheck size={20} />
            <span>Registro seguro de jornadas</span>
          </div>
          <div className="session-label">
            <span>{user.role}</span>
            <strong>{user.name}</strong>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
