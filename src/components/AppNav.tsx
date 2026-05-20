import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ScanLine, BookOpen, Settings, Info, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/bibliotheque", label: "Bibliothèque", icon: BookOpen },
  { to: "/gestion", label: "Gestion", icon: Settings },
  { to: "/a-propos", label: "À propos", icon: Info },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground p-6 sticky top-0 h-screen">
      <div className="flex items-center gap-3 mb-10">
        <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <BookMarked className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-lg font-bold leading-none">BIBLIA-TECH</div>
          <div className="text-xs text-sidebar-foreground/60 mt-1">BiblioScan</div>
        </div>
      </div>
      <ul className="space-y-1 flex-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="text-xs text-sidebar-foreground/40 pt-4 border-t border-sidebar-border">
        © 2026 — Projet IA
      </div>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border px-4 h-14 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
        <BookMarked className="h-4 w-4 text-primary-foreground" />
      </div>
      <div>
        <div className="font-display font-bold leading-none">BIBLIA-TECH</div>
        <div className="text-[10px] text-muted-foreground">BiblioScan</div>
      </div>
    </header>
  );
}
