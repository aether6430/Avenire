"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Search,
  ExternalLink,
  Clock,
  FileText,
  LinkIcon,
  ThumbsUp,
  Brain,
  Lightbulb,
  Target,
  ArrowRight,
} from "lucide-react"
import { ScrollArea } from "@avenire/ui/components/scroll-area"
import { cn } from "@avenire/ui/utils"
import { Button } from "@avenire/ui/components/button"
import { Tabs, TabsContent } from "@avenire/ui/components/tabs"
import { Badge } from "@avenire/ui/components/badge"
import { Markdown } from "./markdown"
import { v4 as uuid } from "uuid"

interface ResearchProcessProps {
  data: any[]
  className?: string
}

// Type definitions for processed data
interface ProcessedData {
  topic: string
  maxDepth: number
  currentDepth: number
  completedSteps: number
  totalSteps: number
  activities: Activity[]
  sources: Source[]
  synthesis: string
  thoughts: Thought[]
}

interface Activity {
  type: string
  status: string
  message: string
  timestamp: string
  depth: number
  completedSteps: number
  totalSteps: number
  animationDelay: number
}

interface Source {
  url: string
  title: string
  description: string
  animationDelay: number
}

interface Thought {
  type: string
  status: string
  message: string
  timestamp: string
  depth: number
  connections?: string[]
  animationDelay: number
}

// Memoized activity item component
const ActivityItem = React.memo(({ activity }: { activity: Activity }) => {
  return (
    <div
      className="flex gap-4 animate-in slide-in-from-bottom-2"
      style={{
        animationDelay: `${activity.animationDelay}s`,
        animationFillMode: "backwards",
      }}
    >
      <div className="relative flex-shrink-0 flex flex-col items-center sm:flex">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            activity.status === "complete" ? "bg-primary/10" : "bg-muted/30",
          )}
        >
          {activity.type === "search" && <Search className="h-4 w-4 text-primary" />}
          {activity.type === "extract" && <FileText className="h-4 w-4 text-primary" />}
          {activity.type === "thought" && <Clock className="h-4 w-4 text-primary" />}
          {activity.type === "synthesis" && <ThumbsUp className="h-4 w-4 text-primary" />}
        </div>
        <div className="w-0.5 bg-border h-full mt-2 absolute top-8 left-1/2 transform -translate-x-1/2" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-background/30 p-4 rounded-lg border border-border/50">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
            <h4 className="font-medium capitalize text-foreground">{activity.type}</h4>
            <Badge variant={activity.status === "complete" ? "default" : "outline"}>{activity.status}</Badge>
          </div>
          <p className="text-sm text-foreground break-words">{activity.message}</p>
          <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Depth: {activity.depth}</span>
            <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
})
ActivityItem.displayName = "ActivityItem"

// Memoized source item component
const SourceItem = React.memo(({ source }: { source: Source }) => {
  return (
    <div
      className="border border-border/50 rounded-lg p-4 bg-background/30 animate-in slide-in-from-bottom-2"
      style={{
        animationDelay: `${source.animationDelay}s`,
        animationFillMode: "backwards",
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <h4 className="font-medium text-foreground break-words flex-1">{source.title}</h4>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md flex-shrink-0" asChild>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Open link</span>
          </a>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 mb-3 break-all">
        <LinkIcon className="h-3 w-3 flex-shrink-0" />
        <span>{source.url}</span>
      </div>
      <p className="text-sm text-foreground break-words">{source.description}</p>
    </div>
  )
})
SourceItem.displayName = "SourceItem"

// Memoized thought item component
const ThoughtItem = React.memo(({ thought }: { thought: Thought }) => {
  return (
    <div
      className="bg-background/30 rounded-lg p-4 border border-border/50 animate-in slide-in-from-bottom-2"
      style={{
        animationDelay: `${thought.animationDelay}s`,
        animationFillMode: "backwards",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 hidden sm:block flex-shrink-0">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-muted/30">
              Thought Process
            </Badge>
            <span className="text-xs text-muted-foreground">{new Date(thought.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground break-words">{thought.message}</p>
          {thought.connections && thought.connections.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-primary">Connections:</p>
              {thought.connections.map((connection: string, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 p-2 rounded-md"
                >
                  <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">{connection}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
ThoughtItem.displayName = "ThoughtItem"

// Main component with React.memo for optimization
const ResearchProcess = React.memo(({ data, className }: ResearchProcessProps) => {
  const [activeTab, setActiveTab] = useState<string>("thinking")
  const [processedData, setProcessedData] = useState<ProcessedData>({
    topic: "",
    maxDepth: 0,
    currentDepth: 0,
    completedSteps: 0,
    totalSteps: 0,
    activities: [],
    sources: [],
    synthesis: "",
    thoughts: [],
  })

  // Process data with useMemo to prevent unnecessary recalculations
  useEffect(() => {
    if (data && data.length > 0) {
      const processData = () => {
        const topic = data.find((item) => item.type === "progress-init")?.content?.message || ""
        const maxDepth = data.find((item) => item.type === "progress-init")?.content?.maxDepth || 0
        const depthData = data.find((item) => item.type === "depth-delta")?.content || {
          current: 0,
          max: 0,
          completedSteps: 0,
          totalSteps: 0,
        }

        const activities = data
          .filter((item) => item.type === "activity-delta")
          .map((item, index) => ({ ...item.content, animationDelay: index * 0.1 }))

        const sources = data
          .filter((item) => item.type === "source-delta")
          .map((item, index) => ({ ...item.content, animationDelay: index * 0.05 }))

        const thoughts = data
          .filter((item) => item.type === "activity-delta" && item.content.type === "thought")
          .map((item, index) => ({ ...item.content, animationDelay: index * 0.1 }))

        const synthesis = data.find((item) => item.type === "finish")?.content || ""

        return {
          topic: topic.replace("Starting a research on the topic: ", ""),
          maxDepth,
          currentDepth: depthData.current,
          completedSteps: depthData.completedSteps,
          totalSteps: depthData.totalSteps,
          activities,
          sources,
          synthesis,
          thoughts,
        }
      }

      setProcessedData(processData())
    }
  }, [data])

  // Memoized navigation items
  const navItems = useMemo(
    () => [
      { id: "thinking", icon: Lightbulb, label: "Thinking" },
      { id: "researching", icon: Target, label: "Research Progress" },
      { id: "sources", icon: LinkIcon, label: "Sources" },
      { id: "synthesis", icon: FileText, label: "Synthesis" },
    ],
    [],
  )

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row rounded-xl border border-border bg-background/50 backdrop-blur-sm h-[550px]",
        className,
      )}
    >
      {/* Left sidebar */}
      <div className="w-full md:w-[300px] flex flex-col border-b md:border-b-0 md:border-r border-border/50 bg-muted/20">
        <div className="flex-shrink-0 p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">DeepSearch</h2>
              <p className="text-sm text-muted-foreground">{processedData.sources.length} Sources</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {navItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                    activeTab === item.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="h-8 w-8 rounded-md bg-background/50 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-background/30 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsContent value="thinking" className="flex-1 data-[state=active]:flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Thinking Process</h2>
                </div>

                <div className="space-y-4">
                  {processedData.thoughts.map((thought, index) => (
                    <ThoughtItem key={index} thought={thought} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="researching" className="flex-1 data-[state=active]:flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Research Progress</h2>
                </div>

                <div className="space-y-4">
                  {processedData.activities.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sources" className="flex-1 data-[state=active]:flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LinkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Sources ({processedData.sources.length})</h2>
                </div>

                <div className="grid gap-4">
                  {processedData.sources.map((source, index) => (
                    <SourceItem key={index} source={source} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="synthesis" className="flex-1 data-[state=active]:flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 h-full w-full whitespace-nowrap rounded-md border">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Research Synthesis</h2>
                </div>
                <div className="animate-in fade-in-50">
                  <Markdown content={processedData.synthesis} id={uuid()} />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
})
ResearchProcess.displayName = "ResearchProcess"

export default ResearchProcess

