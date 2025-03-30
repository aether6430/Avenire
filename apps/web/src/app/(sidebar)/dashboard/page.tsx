"use client"

import { Suspense } from "react"
import { CourseCard, CourseCardSkeleton } from "../../../components/dashboard/course-card"
import { Button } from "@avenire/ui/components/button"
import { ChatHistoryItem } from "../../../components/dashboard/chat-item"
import { PlusCircle, ChevronRight } from "lucide-react"
// Sample data for courses
const courses = [
  {
    id: 1,
    title: "What is the cause for global warming",
    description: "Lorem Ipsum",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    thumbnail: "/placeholder.svg?height=200&width=400",
    lessonCount: 12,
  },
  {
    id: 2,
    title: "Understanding climate change impacts",
    description: "Lorem Ipsum",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    thumbnail: "/placeholder.svg?height=200&width=400",
    lessonCount: 8,
  },
  {
    id: 3,
    title: "Unleashing the Power of Speech Recognition",
    description: "Lorem Ipsum",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
    thumbnail: "/placeholder.svg?height=200&width=400",
    lessonCount: 15,
  },
  {
    id: 4,
    title: "Mastering the Art of Public Speaking",
    description: "Lorem Ipsum",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30), // 30 hours ago
    thumbnail: "/placeholder.svg?height=200&width=400",
    lessonCount: 6,
  },
  {
    id: 5,
    title: "Unleashing the Power of Speech Recognition: Transforming Audio to Text",
    description: "Lorem Ipsum",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36), // 36 hours ago
    thumbnail: "/placeholder.svg?height=200&width=400",
    lessonCount: 10,
  },
]

// Sample data for recent chats
const recentChats = [
  {
    id: 1,
    title: "Introduction to AI",
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    messageCount: 24,
  },
  {
    id: 2,
    title: "Web Development Fundamentals",
    createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    messageCount: 18,
  },
  {
    id: 3,
    title: "Data Science Essentials",
    createdAt: new Date(Date.now() - 1000 * 60 * 90), // 90 minutes ago
    messageCount: 32,
  },
  {
    id: 4,
    title: "UX Design Principles",
    createdAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    messageCount: 15,
  },
  {
    id: 5,
    title: "Mobile App Development",
    createdAt: new Date(Date.now() - 1000 * 60 * 150), // 2.5 hours ago
    messageCount: 28,
  },
]

export default function LibraryPage() {
  return (
    <div className="p-4 md:p-6 w-full">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">My Library</h1>
          <Button variant="outline" size="sm" className="gap-1 rounded-full self-start sm:self-auto">
            <PlusCircle className="h-4 w-4" />
            <span>Create a course</span>
          </Button>
        </div>
      </div>

      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-xl font-semibold">Recent Chats</h2>
        </div>
        <Suspense
          fallback={
            <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-xl" />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recentChats.map((chat) => (
              <ChatHistoryItem key={chat.id} chat={chat} />
            ))}
          </div>
        </Suspense>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h2 className="text-xl font-semibold">All Courses</h2>
          <Button variant="link" size="sm" className="gap-1 self-start sm:self-auto">
            <span>See all</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div>
          <Suspense
            fallback={
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <CourseCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} onQuit={(id) => console.log("Quit course:", id)} />
              ))}
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

