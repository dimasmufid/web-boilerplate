"use client"

import * as React from "react"
import {
  IconDashboard,
  IconInnerShadowTop,
  IconUsers,
  IconSettings,
} from "@tabler/icons-react"

import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { useSession } from "@/lib/auth-client"
import { NavSecondary } from "@/components/nav-secondary"

const baseNav = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const roles =
    session?.user?.role && Array.isArray(session.user.role)
      ? session.user.role
      : typeof session?.user?.role === "string"
        ? session.user.role.split(",").map((role) => role.trim())
        : []
  const isAdmin = roles.includes("admin")
  const navMain = baseNav

  const navSecondary = [
    ...(isAdmin
      ? [
          {
            title: "Admin",
            url: "/admin",
            icon: IconUsers,
          },
        ]
      : []),
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ]

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
