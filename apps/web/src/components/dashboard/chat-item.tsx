import { MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader } from "@avenire/ui/components/card"
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

interface ChatHistoryItemProps {
  chat: {
    id: number
    title: string
    messageCount: number
    createdAt: Date
  }
}

export function ChatHistoryItem({ chat }: ChatHistoryItemProps) {
  return (
    <Card className="border hover:bg-foreground/10 transition-colors cursor-pointer w-full">
      <CardHeader className="flex flex-row items-center gap-2 p-3 pb-0 space-y-0">
        <MessageSquare className="h-4 w-4 flex-shrink-0" />
        <div className="font-medium line-clamp-1 min-w-0">{chat.title}</div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2">{formatDate(chat.createdAt)}</p>
      </CardContent>
    </Card>
  )
}

