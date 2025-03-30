"use client"

import Image from "next/image"
import { Card, CardContent } from "@avenire/ui/components/card"
import { Button } from "@avenire/ui/components/button"
import { LogOut, Clock } from "lucide-react"
import { useState } from "react"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"

function formatDate(date: Date) {
  const inputDate = new Date(date)

  if (isToday(inputDate)) {
    return `Today at ${format(inputDate, "h:mm a")}`
  }
  if (isYesterday(inputDate)) {
    return `Yesterday at ${format(inputDate, "h:mm a")}`
  }

  const daysAgo = formatDistanceToNow(inputDate, { addSuffix: false })

  if (daysAgo.includes("days") && Number.parseInt(daysAgo) < 7) {
    return `Last ${format(inputDate, "EEEE")} at ${format(inputDate, "h:mm a")}`
  }

  return format(inputDate, "do MMMM yyyy")
}

interface CourseCardProps {
  course: {
    id: number
    title: string
    description: string
    createdAt: Date
    thumbnail: string
    lessonCount: number
  }
  onQuit?: (id: number) => void
}

// Update the CourseCard component to be more responsive
export function CourseCard({ course, onQuit }: CourseCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleQuit = async () => {
    setIsLoading(true)
    try {
      await onQuit?.(course.id)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div key={course.id} className="group relative space-y-3 w-full">
      <div className="aspect-video overflow-hidden rounded-xl bg-muted/20 backdrop-blur-sm">
        <Image
          src={course.thumbnail || "/placeholder.svg"}
          alt={course.title}
          width={600}
          height={400}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <Card className="border-none bg-background/50 shadow-none backdrop-blur-sm w-full">
        <CardContent className="px-2 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium leading-none tracking-tight truncate">{course.title}</h3>
            <p className="mt-1 max-w-full truncate text-sm text-muted-foreground">
              {course.description}
            </p>
            <span className="text-xs text-muted-foreground">
              {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{formatDate(course.createdAt)}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 opacity-70 sm:opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
              onClick={handleQuit}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Quit course</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CourseCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-neutral-900">
      <div className="relative aspect-video w-full animate-pulse bg-neutral-800" />
      <div className="p-4">
        <div className="h-5 w-3/4 animate-pulse rounded-md bg-neutral-800" />
        <div className="mt-2 flex gap-2">
          <div className="h-4 w-20 animate-pulse rounded-md bg-neutral-800" />
          <div className="h-4 w-4 animate-pulse rounded-md bg-neutral-800" />
          <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-800" />
        </div>
      </div>
    </Card>
  )
}

