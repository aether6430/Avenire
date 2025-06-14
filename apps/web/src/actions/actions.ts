"use server";

import { fermion, generateText, Message } from "@avenire/ai";
import { getTopChatsByUserId, getMessageById, deleteMessagesByChatIdAfterTimestamp, getFlashcardsByChatId, getQuizzesByChatId, getChatById } from "@avenire/database/queries";

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  const { text: title } = await generateText({
    model: fermion.languageModel('fermion-sprint'),
    prompt: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons
    ${JSON.stringify(message)}`,
  });

  return title;
}

import { UTApi } from "uploadthing/server";

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN, // Ensure your token is stored securely
});

export async function deleteFile(url: string) {
  try {
    const newUrl = url.substring(url.lastIndexOf("/") + 1);
    await utapi.deleteFiles(newUrl);
    return { success: true, error: null }
  } catch (error) {
    console.error(error)
    return { success: false, error }
  }

}

export async function getRecentChats(userId: string) {
  try {
    const chats = await getTopChatsByUserId({ id: userId });
    return { chats, error: null };
  } catch (error) {
    console.error('Failed to get recent chats:', error);
    return { chats: [], error };
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    const [message] = await getMessageById({ id });
    if (!message) {
      throw new Error('Message not found');
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('Failed to delete trailing messages:', error);
    return { success: false, error };
  }
}

export async function getFlashcardsForChat({ chatId }: { chatId: string }) {
  try {
    const flashcards = await getFlashcardsByChatId({ id: chatId });
    return { flashcards, error: null };
  } catch (error) {
    console.error('Failed to get flashcards for chat:', error);
    return { flashcards: [], error };
  }
}

export async function getQuizzesForChat({ chatId }: { chatId: string }) {
  try {
    const quizzes = await getQuizzesByChatId({ id: chatId });
    return { quizzes, error: null };
  } catch (error) {
    console.error('Failed to get quizzes for chat:', error);
    return { quizzes: [], error };
  }
}

export async function getChatTitle({ chatId }: { chatId: string }) {
  try {
    const chat = await getChatById({ id: chatId });
    return { title: chat?.title || 'Untitled Chat', error: null };
  } catch (error) {
    console.error('Failed to get chat title:', error);
    return { title: 'Untitled Chat', error };
  }
}