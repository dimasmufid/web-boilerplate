"use client"

import * as React from "react"
import { useSelectedLayoutSegment } from "next/navigation"
import { IconUserOff } from "@tabler/icons-react"

import { authClient, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const TITLE_BY_SEGMENT: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
}

export function SiteHeader() {
  const segment = useSelectedLayoutSegment()
  const { data: session, isPending } = useSession()
  const [isStoppingImpersonation, setIsStoppingImpersonation] =
    React.useState(false)
  const isImpersonating = Boolean(session?.session?.impersonatedBy)
  const title = segment ? (TITLE_BY_SEGMENT[segment] ?? "Documents") : "Documents"

  const handleExitImpersonation = async () => {
    if (isStoppingImpersonation) return
    setIsStoppingImpersonation(true)
    try {
      const { error } = await authClient.admin.stopImpersonating({})
      if (error) throw error
      window.location.reload()
    } catch (error) {
      console.error(error)
      setIsStoppingImpersonation(false)
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        {isImpersonating ? (
          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed border-primary/60 text-primary hover:text-primary"
              disabled={isPending || isStoppingImpersonation}
              onClick={handleExitImpersonation}
            >
              <IconUserOff className="size-4" />
              {isStoppingImpersonation
                ? "Exiting impersonation..."
                : "Exit impersonate user"}
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
