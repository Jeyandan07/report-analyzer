"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Menu,
  BrainCircuit,
  Users,
  Briefcase
} from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      color: "text-sky-500",
    },
    {
      label: "My Reports",
      icon: FileText,
      href: "/reports",
      color: "text-violet-500",
    },
    {
      label: "Team Sentiment",
      icon: Users,
      href: "/sentiment",
      color: "text-pink-700",
    },
    {
      label: "Project Health",
      icon: Briefcase,
      href: "/projects",
      color: "text-orange-700",
    },
    {
      label: "AI Insights",
      icon: BrainCircuit,
      href: "/insights",
      color: "text-emerald-500",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ]

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-bold tracking-tight text-indigo-600">
            Project<span className="text-slate-900">Analyzer</span>
          </h2>
          <div className="space-y-1">
            {routes.map((route) => (
              <Button
                key={route.href}
                variant={pathname === route.href ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link href={route.href}>
                  <route.icon className={cn("mr-2 h-4 w-4", route.color)} />
                  {route.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  )
}
