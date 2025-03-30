"use client"

import * as React from "react"
import { useState } from "react"
import { ExternalLink, LinkIcon, Brain, ChevronDown, ChevronUp, Search } from "lucide-react"
import { ScrollArea } from "@avenire/ui/components/scroll-area"
import { cn } from "@avenire/ui/utils"
import { Button } from "@avenire/ui/components/button"
import { Tabs, TabsContent } from "@avenire/ui/components/tabs"
import { Card, CardContent } from "@avenire/ui/components/card"
import { Markdown } from "./markdown"
import { v4 as uuid } from "uuid"

interface ResearchDisplayProps {
  data: ResearchData
  className?: string
}

// Type definitions for research data
interface ResearchData {
  success: boolean
  data: {
    findings: Finding[]
    analysis: string
    completedSteps: number
    totalSteps: number
  }
}

interface Finding {
  description: string
  title: string
  url: string
}

// Memoized source item component
const SourceItem = React.memo(({ finding, index }: { finding: Finding; index: number }) => {
  const [expanded, setExpanded] = useState(false)

  // Extract a title from the content (first line or first 60 chars)
  const title = finding.title

  // Create a preview of the content (first 200 chars)
  const preview = finding.description.substring(0, 200).trim() + (finding.description.length > 200 ? "..." : "")

  return (
    <div
      className="border border-border/50 rounded-lg p-4 bg-background/30 animate-in slide-in-from-bottom-2 mb-4"
      style={{
        animationDelay: `${index * 0.05}s`,
        animationFillMode: "backwards",
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <h4 className="font-medium text-foreground break-words flex-1">{title}</h4>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md flex-shrink-0" asChild>
          <a href={finding.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Open link</span>
          </a>
        </Button>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 mb-3 break-all">
        <LinkIcon className="h-3 w-3 flex-shrink-0" />
        <span>{title}</span>
      </div>

      <div className="text-sm text-foreground break-words">
        {expanded ? <div className="whitespace-pre-line">{finding.description}</div> : <div>{preview}</div>}
      </div>

      {finding.description.length > 200 && (
        <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show More
            </>
          )}
        </Button>
      )}
    </div>
  )
})
SourceItem.displayName = "SourceItem"

// Main component with React.memo for optimization
const ResearchDisplay = React.memo(({ data, className }: ResearchDisplayProps) => {
  const [activeTab, setActiveTab] = useState<string>("analysis")

  const navItems = React.useMemo(
    () => [
      { id: "analysis", icon: Brain, label: "Analysis" },
      { id: "sources", icon: LinkIcon, label: "Sources" },
    ],
    [],
  )

  if (!data || !data.data) {
    return (
      <div className="flex items-center justify-center h-[550px] border rounded-lg bg-background/50 backdrop-blur-sm">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading research data...</p>
        </div>
      </div>
    )
  }

  const researchData = data.data
  const findings: Finding[] = researchData.findings || []
  const analysis = researchData.analysis || ""

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row rounded-xl border border-border bg-background/50 backdrop-blur-sm h-[800px]",
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
              <p className="text-sm text-muted-foreground">{findings.length} Sources</p>
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
          <TabsContent value="analysis" className="flex-1 data-[state=active]:flex flex-col overflow-hidden m-0 p-0">
            <ScrollArea className="flex-1 h-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">Research Analysis</h2>
                </div>

                <Card className="bg-background/30">
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-line animate-in fade-in-50 text-foreground break-words">
                        <Markdown content={analysis} id={uuid()} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                  <h2 className="text-2xl font-semibold text-foreground">Sources ({findings.length})</h2>
                </div>

                <div className="grid gap-4">
                  {findings.map((finding, index) => (
                    <SourceItem key={index} finding={finding} index={index} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
})
ResearchDisplay.displayName = "ResearchDisplay"

export default ResearchDisplay

