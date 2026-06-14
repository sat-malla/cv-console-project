import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import logo from "@/assets/logo.png";
import { useTheme } from "./theme-provider";

export function NavBar() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-border backdrop-blur-xl bg-background/70">
      <div className="mx-auto max-w-400 flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="logo" width={36} height={36} />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] tracking-[0.3em] text-muted-foreground font-mono">CV CONSOLE</span>
              <span className="text-base font-bold tracking-tight rainbow-text">PRISM-VISION</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/", label: "Camera Views" },
              { to: "/about", label: "About" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: true }}
                className="px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors data-[status=active]:text-foreground data-[status=active]:bg-accent"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full grid place-items-center text-xs font-bold text-white brand-gradient">
              VX
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs text-muted-foreground font-mono">operator</span>
              <span className="text-sm font-medium">@vextrix</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-0.5 w-full rainbow-stroke opacity-80" />
    </header>
  );
}
