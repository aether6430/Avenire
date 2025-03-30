"use server";

import { fermion, generateText, Message } from "@avenire/ai";

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