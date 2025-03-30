import { Message, smoothStream, streamText, fermion, graphTool, ATLAS_PROMPT, createDataStreamResponse, deepResearch, LanguageModel, appendResponseMessages, DEEP_RESEARCH_PROMPT } from "@avenire/ai"
import { getTrailingMessageId, sanitizeResponseMessages } from "@avenire/ai/utils"
import { auth } from "@avenire/auth/server";
import { deleteChatById, getChatById, getChatsByUserId, getMessagesByChatId, saveChat, saveMessages } from "@avenire/database/queries"
import { generateTitleFromUserMessage } from "../../../../actions/actions"
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      selectedModel,
      selectedReasoningModel,
      currentPlots,
      thinkingEnabled,
      deepResearchEnabled
    }: {
      messages: Message[];
      chatId: string;
      selectedModel: "fermion-sprint" | "fermion-core" | "fermion-apex";
      selectedReasoningModel: "fermion-reasoning" | "fermion-reasoning-lite";
      currentPlots: Array<{
        id: string;
        latex: string;
      }> | undefined;
      thinkingEnabled: false;
      deepResearchEnabled: false;
    } = await req.json()
    const session = await auth.api.getSession({
      headers: req.headers
    })

    if (!session || !session.user || !session.user.id) {
      return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
    }

    const userMessage = messages.filter((message) => message.role === 'user').at(-1);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id: chatId, userId: session.user.id, title });
    } else if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await saveMessages({
      messages: [
        {
          chatId,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });
    let model: LanguageModel
    let reasoningModel: LanguageModel

    try {
      model = fermion.languageModel(selectedModel);
      reasoningModel = fermion.languageModel(selectedReasoningModel);
    } catch (error) {
      model = fermion.languageModel("fermion-core")
      reasoningModel = fermion.languageModel("fermion-reasoning")
    }
    const activeTools: Array<"graphTool" | "deepResearch"> = deepResearchEnabled ? ["deepResearch"] : ["graphTool"]

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: thinkingEnabled ? reasoningModel : model,
          system: deepResearchEnabled ? DEEP_RESEARCH_PROMPT(session.user.name) : ATLAS_PROMPT(session.user.name, currentPlots),
          messages,
          maxSteps: 5,
          experimental_activeTools: selectedModel === 'fermion-sprint' || thinkingEnabled ? [] : activeTools,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: uuid,
          tools: {
            graphTool,
            deepResearch: deepResearch({
              dataStream,
              model: reasoningModel
            }),
          },
          // toolChoice: deepResearchEnabled ? "required" : "auto",
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });
                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });

              } catch (error) {
                console.error('Failed to save chat');
              }
            }
          }
        })

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error(error)
	return 'Oops, an error occured!';
      },
    })

  } catch (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

}


export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth.api.getSession({
    headers: req.headers
  })

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });
    if (!chat) {
      return new Response("There is no chat with given id", { status: 400 })
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
