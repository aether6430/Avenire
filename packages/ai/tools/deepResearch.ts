import { DataStreamWriter, generateText, LanguageModel, tool } from "ai";
import { z } from "zod";
import { extract, search } from "./search";

export const deepResearch = ({ dataStream, model }: { dataStream: DataStreamWriter, model: LanguageModel }) => tool({
  description: "Perform deep research on a topic using an AI agent that coordinates search, extract, and analysis tools with reasoning steps.",
  parameters: z.object({
    topic: z.string().describe('The topic or question to research'),
    maxDepth: z.number().describe('The maximum depth to which the research can to go through. Defaults to 7.').optional(),
  }),
  execute: async ({ topic, maxDepth = 3 }) => {
    const startTime = Date.now();
    const timeLimit = 4.5 * 80 * 1000;
    const researchState = {
      findings: [] as Array<{ content: string; source: string }>,
      sources: [] as Array<{ url: string, title: string, description: string }>,
      summaries: [] as Array<string>,
      nextSearchTopic: '',
      urlToSearch: '',
      currentDepth: 0,
      failedAttempts: 0,
      maxFailedAttempts: 1,
      completedSteps: 0,
      totalExpectedSteps: maxDepth * 5
    }
    dataStream.writeData({
      type: "progress-init",
      content: {
        type: "thought",
        message: `Starting a research on the topic: ${topic}`,
        timeStamp: new Date().toISOString(),
        maxDepth,
      }
    })

    const addSource = (source: {
      url: string;
      title: string;
      description: string;
    }) => {
      researchState.sources.push(source)
      dataStream.writeData({
        type: 'source-delta',
        content: source,
      });
    };

    const addActivity = (activity: {
      type:
      | 'search'
      | 'extract'
      | 'reasoning'
      | 'synthesis'
      | 'thought';
      status: 'pending' | 'complete' | 'error';
      message: string;
      timestamp: string;
      depth: number;
    }) => {
      if (activity.status === 'complete') {
        researchState.completedSteps++;
      }
      dataStream.writeData({
        type: 'activity-delta',
        content: {
          ...activity,
          depth: researchState.currentDepth,
          completedSteps: researchState.completedSteps,
          totalSteps: researchState.totalExpectedSteps,
        },
      });
    };

    const analyzeAndPlan = async (findings: Array<{ content: string, source: string }>) => {
      try {
        const timeElapsed = Date.now() - startTime;
        const timeRemaining = timeLimit - timeElapsed;
        const timeRemainingMinutes =
          Math.round((timeRemaining / 1000 / 60) * 10) / 10;

        // Reasoning model
        const result = await generateText({
          model,
          prompt: `You are a research agent analyzing findings about: ${topic}
                            You have ${timeRemainingMinutes} minutes remaining to complete the research but you don't need to use all of it.
                            Current findings: ${findings
              .map((f) => `[From ${f.source}]: ${f.content}`)
              .join('\n')}
                            What has been learned? What gaps remain? What specific aspects should be investigated next if any?
                            If you need to search for more information, include a nextSearchTopic.
                            If you need to search for more information in a specific URL, include a urlToSearch.
                            Important: If less than 1 minute remains, set shouldContinue to false to allow time for final synthesis.
                            If I have enough information, set shouldContinue to false.
                            
                            Respond in this exact JSON format:
                            {
                              "analysis": {
                                "summary": "summary of findings",
                                "gaps": ["gap1", "gap2"],
                                "nextSteps": ["step1", "step2"],
                                "shouldContinue": true/false,
                                "nextSearchTopic": "optional topic",
                                "urlToSearch": "optional url"
                              }
                            }`,
        });

        try {
          try {
            const parsed = JSON.parse(result.text)
            return parsed.analysis
          } catch {
            const json = result.text.match(/```json\s*([\s\S]*?)\s*```/)
            if (!json || !json[1]) {
              console.info(json)
              throw new Error("The object passed was weird")
            }
            const parsed = JSON.parse(json[1].trim());
            return parsed.analysis;
          }
        } catch (error) {
          console.error('Failed to parse JSON response:', error);
          return null;
        }
      } catch (error) {
        console.error('Analysis error:', error);
        return null;
      }
    }

    const extractFromUrls = async (urls: string[]) => {
      const extractPromises = urls.map(async (url) => {
        try {
          addActivity({
            type: 'extract',
            status: 'pending',
            message: `Analyzing ${new URL(url).hostname}`,
            timestamp: new Date().toISOString(),
            depth: researchState.currentDepth,
          });

          const result = await extract([url]);

          if (result.results.length) {
            addActivity({
              type: 'extract',
              status: 'complete',
              message: `Extracted from ${new URL(url).hostname}`,
              timestamp: new Date().toISOString(),
              depth: researchState.currentDepth,
            });

            if (Array.isArray(result.results)) {
              return result.results.map((item) => ({
                content: item.rawContent,
                source: url,
              }));
            }
          }
          return [];
        } catch {
          return [];
        }
      });
      const results = await Promise.all(extractPromises);
      return results.flat();
    };

    try {
      while (researchState.currentDepth < maxDepth) {
        const timeElapsed = Date.now() - startTime;
        if (timeElapsed >= timeLimit) {
          break;
        }

        researchState.currentDepth++;

        dataStream.writeData({
          type: 'depth-delta',
          content: {
            current: researchState.currentDepth,
            max: maxDepth,
            completedSteps: researchState.completedSteps,
            totalSteps: researchState.totalExpectedSteps,
          },
        });

        // Search phase
        addActivity({
          type: 'search',
          status: 'pending',
          message: `Searching for "${topic}"`,
          timestamp: new Date().toISOString(),
          depth: researchState.currentDepth,
        });

        const searchTopic = researchState.nextSearchTopic || topic;
        const searchResult = await search(searchTopic);

        if (!searchResult.results.filter((a: any) => a.content).length) {
          addActivity({
            type: 'search',
            status: 'error',
            message: `Search failed for "${searchTopic}"`,
            timestamp: new Date().toISOString(),
            depth: researchState.currentDepth,
          });

          researchState.failedAttempts++;
          if (
            researchState.failedAttempts >=
            researchState.maxFailedAttempts
          ) {
            break;
          }
          continue;
        }

        addActivity({
          type: 'search',
          status: 'complete',
          message: `Found ${searchResult.results.length} relevant results`,
          timestamp: new Date().toISOString(),
          depth: researchState.currentDepth,
        });

        // Add sources from search results
        searchResult.results.forEach((result: any) => {
          addSource({
            url: result.url,
            title: result.name,
            description: result.content,
          });
        });

        // Extract phase
        const topUrls = searchResult.results
          .slice(0, 3)
          .map((result) => result.url);

        const newFindings = await extractFromUrls([
          researchState.urlToSearch,
          ...topUrls,
        ]);
        researchState.findings.push(...newFindings);

        // Analysis phase
        addActivity({
          type: 'thought',
          status: 'pending',
          message: 'Analyzing findings',
          timestamp: new Date().toISOString(),
          depth: researchState.currentDepth,
        });

        const analysis = await analyzeAndPlan(researchState.findings);
        researchState.nextSearchTopic =
          analysis?.nextSearchTopic || '';
        researchState.urlToSearch = analysis?.urlToSearch || '';
        researchState.summaries.push(analysis?.summary || '');

        if (!analysis) {
          addActivity({
            type: 'thought',
            status: 'error',
            message: 'Failed to analyze findings',
            timestamp: new Date().toISOString(),
            depth: researchState.currentDepth,
          });

          researchState.failedAttempts++;
          if (
            researchState.failedAttempts >=
            researchState.maxFailedAttempts
          ) {
            break;
          }
          continue;
        }

        addActivity({
          type: 'thought',
          status: 'complete',
          message: analysis.summary,
          timestamp: new Date().toISOString(),
          depth: researchState.currentDepth,
        });

        if (!analysis.shouldContinue || analysis.gaps.length === 0) {
          break;
        }

        topic = analysis.gaps.shift() || topic;
      }

      // Final synthesis
      addActivity({
        type: 'synthesis',
        status: 'pending',
        message: 'Preparing final analysis',
        timestamp: new Date().toISOString(),
        depth: researchState.currentDepth,
      });

      const finalAnalysis = await generateText({
        model,
        maxTokens: 16000,
        prompt: `Create a comprehensive long analysis of ${topic} based on these findings:
                          ${researchState.findings
            .map((f) => `[From ${f.source}]: ${f.content}`)
            .join('\n')}
                          ${researchState.summaries
            .map((s) => `[Summary]: ${s}`)
            .join('\n')}
                          Provide all the thoughts processes including findings details,key insights, conclusions, and any remaining uncertainties. Include citations to sources where appropriate. This analysis should be very comprehensive and full of details. It is expected to be very long, detailed and comprehensive.`,
      });

      addActivity({
        type: 'synthesis',
        status: 'complete',
        message: 'Research completed',
        timestamp: new Date().toISOString(),
        depth: researchState.currentDepth,
      });

      dataStream.writeData({
        type: 'finish',
        content: finalAnalysis.text,
      });

      return {
        success: true,
        data: {
          findings: researchState.sources,
          analysis: finalAnalysis.text,
          completedSteps: researchState.completedSteps,
          totalSteps: researchState.totalExpectedSteps,
        },
      };
    } catch (error: any) {
      console.error('Deep research error:', error);
      addActivity({
        type: 'thought',
        status: 'error',
        message: `Research failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        depth: researchState.currentDepth,
      });

      return {
        success: false,
        error: error.message,
        data: {
          findings: researchState.findings,
          completedSteps: researchState.completedSteps,
          totalSteps: researchState.totalExpectedSteps,
        },
      };
    }
  },
})