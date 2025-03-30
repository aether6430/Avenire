import { tavily } from "@tavily/core";
import { LinkupClient } from 'linkup-sdk';

const extractClient = tavily({ apiKey: process.env.TAVILY_API_KEY })
const searchClient = new LinkupClient({
  apiKey: process.env.LINKUP_API_KEY,
});

export const search = async (query: string) => {
  return await searchClient.search({
    query,
    depth: "standard",
    outputType: "searchResults",
  })
};

export const extract = async (url: string[]) => {
  return await extractClient.extract(url, {
    extractDepth: "basic"
  })
}