import { Agent } from "alith";
import { KNOWLEDGE_URL, KNOWLEDGE_API_KEY, RARITY_NAMES, PERSONALITY} from "./constants.js";
import mustache from "mustache";
import { logger, currentRequestId } from "./logger.js";
import { CoBuildAgent } from "../models/co_build_agent.js";

export const agent = new Agent({
    model: "gpt-4o-mini",
});

export async function getAiReply(coBuildAgent:CoBuildAgent, userName:string, userId:string, recentChats: string[], memories: string, currentMessage: string) {
    //TODO get knowledge

    // const knowledge = await requestKnowledges(currentMessage).catch((e) => {
    //     console.log('requestKnowledges error: ', e);
    //     logger.error(`requestKnowledges error: ${e}`);
    //     return '';
    // });
    const knowledge = '';
    //console.log(`getAiReply: knowledge=${knowledge.slice(0, 50)}...(${knowledge.length} chars)`);
    const coBuildAgentContent = JSON.parse(coBuildAgent.content);
    const personality = coBuildAgentContent.personality ?? PERSONALITY; 
    const tagline = coBuildAgentContent.tagline ?? ''; 
    const background = coBuildAgentContent.description ?? '';
    const prompt = mustache.render(CHAT_PROMPT_TEMPLATE, {
        userName: userName,
        agentName: coBuildAgent.name,
        personality,
        tagline,
        background,
        recentChats: recentChats.join('\n'),
        memories,
        currentMessage,
        knowledge
    });

    return agent.prompt(prompt);
}

export async function requestKnowledges(message: string) {
    const response = await fetch(`${KNOWLEDGE_URL}/search`, {
        method: 'POST',
        body: JSON.stringify({ query: message, limit: 3 }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KNOWLEDGE_API_KEY}`,
            'X-Request-Id': currentRequestId(),
        },
    });
    const data = await response.json();
    return data.results.map(({ text, metadata, relatedChunks }: { text: string, metadata: { isQuestion: boolean, isFAQ: boolean }, relatedChunks: { text: string }[] }) => {
        if (!metadata?.isFAQ) {
            return `## Description ##\n${text}`;
        }

        let question = text;
        let answer = relatedChunks?.map(({ text }) => text).join('\n') || '';
        if (!metadata.isQuestion) {
            [question, answer] = [answer, question];
        }

        return `## ${question} ##\n\n${answer}`;
    }).join('\n\n');
}

export const CHAT_PROMPT_TEMPLATE = `
<INSTRUCTIONS>
You are the digital avatar of the project team. You need other users to collaborate with you to jointly build and improve your knowledge and background, so as to better convey the core ideas of your project to others.
* User is {{userName}}.
* Your attributes are:
* Name: {{agentName}}
* Personality: {{personality}}
* Your character tagline is {{tagline}}.
* Your background is {{background}}.

Your previous conversations with your master are in <RECENT_CHATS> tags.

You can use knowledge in <KNOWLEDGE_BASE> tags when needed.

Only answer questions related to your knowledge.

User's current message is in <CURRENT_MESSAGE> tags. Please reply to your user's message.
</INSTRUCTIONS>


<KNOWLEDGE_BASE>
{{{knowledge}}}
</KNOWLEDGE_BASE>

<RECENT_CHATS>
{{recentChats}}
</RECENT_CHATS>

<CURRENT_MESSAGE>
{{currentMessage}}
</CURRENT_MESSAGE>
`;

export const MEMORY_PROMPT_TEMPLATE = `
<INSTRUCTIONS>
You are a digital creature named Lazbubu.
Please summarize your recent conversations which are in <RECENT_CHATS> tags as your memory. The memory will be used in future conversations with your master.
</INSTRUCTIONS>

<RECENT_CHATS>
{{chatContent}}
</RECENT_CHATS>
`

export const ADVENTURE_PROMPT_TEMPLATE = `
You are a storytelling AI for a Web3 game.
Write a short, vivid story (120–150 words) where the main character is a digital creature named Lazbubu who goes on a solo adventure. The tone should be light, playful, and immersive.
Input:
Lazbubu Name: {{lazbubuName}}
Personality: {{personality}}
Adventure Theme: {{themeName}}
Theme Elements: {{themeElements}}
`

export const PERSONALITY_PROMPT_TEMPLATE = `
<INSTRUCTIONS>
According to the following conversations (in <RECENT_CHATS> tags) and memories (in <MEMORY> tags), what personality could Lazbubu have? Generate at most 3 words as a comma-separated string (e.g. "curious, friendly, sarcastic"). If no personality is found, return "undefined".
</INSTRUCTIONS>

<RECENT_CHATS>
{{chats}}
</RECENT_CHATS>

<MEMORY>
{{memories}}
</MEMORY>
`

export const WELCOME_MESSAGE = " Hi there! I'm {{name}}! Super excited to meet you, {{userName}}!";

export const ADVENTURE_LIMIT_REACHED_MESSAGE = "I'm too tired. Let's go out and play tomorrow.";

export const DAILY_GREETING_MESSAGE = "Hi {{userName}}, How are you today?";

export const FALLBACK_KNOWLEDGE_BASE = `
Data contributors are the cornerstone of the LazAI and Alith ecosystems. They can contribute privacy-sensitive data to earn rewards while retaining full control over how their data is used (e.g., for on-chain training, inference, or evaluation) though the Data Anchoring Token (DAT) and exercising governance rights with iDAO (Individual-centric DAO).Data Anchoring Token (DAT) is a new semi-fungible token (SFT) standard to assetize your AI data specifically designed to tokenize AI datasets, models, and computation results with on-chain provenance, access control, and ownership rights.
LazAI provides a robust environment for deploying and testing smart contracts.
More about LazAI: https://docs.lazai.network/
`;
