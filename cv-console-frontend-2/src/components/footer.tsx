import { Link } from "@tanstack/react-router";
import { Github, Twitter, Linkedin, Youtube } from "lucide-react";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-background/60">
      <div className="h-0.5 w-full rainbow-stroke opacity-70" />
      <div className="mx-auto max-w-400 px-6 py-10 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="logo" width={32} height={32} loading="lazy" />
            <span className="font-bold tracking-tight rainbow-text">PRISM-VISION</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Multi-feed computer vision console for monitoring environments in real time.
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono">Site</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-foreground text-muted-foreground">Camera Views</Link></li>
            <li><Link to="/about" className="hover:text-foreground text-muted-foreground">About</Link></li>
            <li><a href="#" className="hover:text-foreground text-muted-foreground">Documentation</a></li>
            <li><a href="#" className="hover:text-foreground text-muted-foreground">Status</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-foreground text-muted-foreground">Terms & Conditions</a></li>
            <li><a href="#" className="hover:text-foreground text-muted-foreground">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-foreground text-muted-foreground">Cookie Policy</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3 font-mono">Socials</h4>
          <div className="flex items-center gap-2">
            {[
              { Icon: Github, color: "text-black dark:text-white" },
              { Icon: Twitter, color: "text-black dark:text-white" },
              { Icon: Linkedin, style: { color: "#0A66C2" } },
              { Icon: Youtube, style: { color: "#FF0000" } },
            ].map(({ Icon, color, style }, i) => (
              <a
                key={i}
                href="#"
                aria-label="social"
                className={
                  "h-9 w-9 grid place-items-center rounded-md border border-border hover:bg-accent transition-colors " +
                  (color || "")
                }
                style={style}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-400 px-6 py-4 text-xs text-muted-foreground font-mono flex justify-between flex-wrap gap-2">
          <span>© {new Date().getFullYear()} PRISM-VISION SYSTEMS. All rights reserved.</span>
          <span>Built for operators · v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
