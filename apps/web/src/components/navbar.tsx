"use client"

import Link from "next/link"
import { Search, Plus, User, Sun, Moon, Settings, LogOut, Upload, RepeatIcon as Record } from "lucide-react"
import { Button } from "@avenire/ui/components/button"
import { Input } from "@avenire/ui/components/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@avenire/ui/components/sidebar"
import { useState } from "react"

export function Navbar() {
  const { setTheme } = useTheme()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b px-4 backdrop-blur-md bg-background/80">
      <div className="flex items-center gap-2 flex-1">
        <SidebarTrigger className="flex-shrink-0" />

        {/* Mobile/Tablet search - takes full remaining width */}
        <div className="relative w-full max-w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 z-10" />
          <Input placeholder="Search for courses..." className="pl-9 rounded-full border bg-sidebar w-full" />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-2">
        {/* User menu (both mobile and desktop) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700">
                <User className="h-4 w-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Theme</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Theme</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

