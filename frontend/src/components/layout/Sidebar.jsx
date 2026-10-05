import { NAV_ITEMS } from "@/lib/nav"
import { cn } from "@/lib/utils"

export default function Sidebar({ route }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-5">
        <div
          className="size-8 shrink-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, #a5e887, #2f7d32)",
          }}
        />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">MintRT OS</div>
          <div className="text-xs text-muted-foreground">Real-Time System</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#/${id}`}
            aria-current={route === id ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              route === id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </a>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 font-mono text-xs text-muted-foreground">
        EDF · Linux Mint
      </div>
    </aside>
  )
}