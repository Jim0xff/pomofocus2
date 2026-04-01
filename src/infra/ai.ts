import { Agent } from 'alith';
import { KNOWLEDGE_URL, KNOWLEDGE_API_KEY, PERSONALITY } from './constants.js';
import mustache from 'mustache';
import { currentRequestId } from './logger.js';

export type CoBuildAgentLite = {
  name: string;
  content: string;
};

export const agent = new Agent({ model: 'gpt-4o-mini' });

export async function getAiReply(
  coBuildAgent: CoBuildAgentLite,
  userName: string,
  _userId: string,
  recentChats: string[],
  memories: string,
  currentMessage: string,
) {
  const knowledge = '';
  const coBuildAgentContent = JSON.parse(coBuildAgent.content || '{}');
  const personality = coBuildAgentContent.personality ?? PERSONALITY;
  const tagline = coBuildAgentContent.tagline ?? '';
  const background = coBuildAgentContent.description ?? '';
  const prompt = mustache.render(CHAT_PROMPT_TEMPLATE, {
    userName,
    agentName: coBuildAgent.name,
    personality,
    tagline,
    background,
    recentChats: recentChats.join('\n'),
    memories,
    currentMessage,
    knowledge,
  });

  return agent.prompt(prompt);
}

export async function requestKnowledges(message: string) {
  const response = await fetch(`${KNOWLEDGE_URL}/search`, {
    method: 'POST',
    body: JSON.stringify({ query: message, limit: 3 }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KNOWLEDGE_API_KEY}`,
      'X-Request-Id': currentRequestId(),
    },
  });
  const data: any = await response.json();
  return (data.results || [])
    .map(({ text, metadata, relatedChunks }: any) => {
      if (!metadata?.isFAQ) return `## Description ##\n${text}`;
      let question = text;
      let answer = relatedChunks?.map(({ text }: any) => text).join('\n') || '';
      if (!metadata.isQuestion) [question, answer] = [answer, question];
      return `## ${question} ##\n\n${answer}`;
    })
    .join('\n\n');
}

export const CHAT_PROMPT_TEMPLATE = `...`;
export const MEMORY_PROMPT_TEMPLATE = `...`;
export const ADVENTURE_PROMPT_TEMPLATE = `...`;
export const PERSONALITY_PROMPT_TEMPLATE = `...`;
export const WELCOME_MESSAGE = " Hi there! I'm {{name}}! Super excited to meet you, {{userName}}!";
export const ADVENTURE_LIMIT_REACHED_MESSAGE = "I'm too tired. Let's go out and play tomorrow.";
export const DAILY_GREETING_MESSAGE = 'Hi {{userName}}, How are you today?';
export const FALLBACK_KNOWLEDGE_BASE = `LazAI docs: https://docs.lazai.network/`;
