import { REDPACKET_AGENT_URL } from "../infra/constants.js";
import { currentRequestId, logger } from "../infra/logger.js";

type CreateAgentResponse = {
    data?: {
      createAgent: {
        to: string;
        id: string;
        deadline: string;
        signature: string;
      };
    };
    errors?: any[];
  };

  type Agent = {
    id: string | number;
    name: string;
    description: string;
    owner: string;
    imageUrl: string;
  };
  
  type AgentQueryResponse = {
    data?: {
      agent: Agent | null;
    };
    errors?: any[];
  };

  type Challenge = {
    id: string | number;
    agentId: number | string;
    redPackAddress: string;
    challengerAddress: string;
    attempts: number;
    status: string;
    question: {
      stem: string;
      options: string[]; 
    };
  };
  
  type ChallengeQueryResponse = {
    data?: {
      challenge: Challenge | null;
    };
    errors?: any[];
  };
  
  type SolveResult = {
    id: string | number;
    status: string;
    attempts: number;
    question: {
      stem: string;
      options: string[];
    };
  };

  type SolveMutationResponse = {
    data?: {
      solve: SolveResult;
    };
    errors?: any[];
  };

  export async function queryAgent(id: number) {
    const res = await fetch(REDPACKET_AGENT_URL, {
      method: "POST",
      headers: {
        "x-user-address":"0xd4f8bbf9c0b8aff6d76d2c5fa4971a36fc9e4003",
        "Content-Type": "application/json",
        "Authorization": "Bearer mf7pmvRYWu8DTkC8a3we",
      },
      body: JSON.stringify({
        query: `
          query GetAgent($id: Int!) {
            agent(id: $id) {
              id
              name
              description
              owner
              imageUrl
            }
          }
        `,
        variables: {
          id,
        },
      }),
    });
  
    const json = (await res.json()) as AgentQueryResponse;
    logger.info("query agent result:" + JSON.stringify(json));

    if (json.errors?.length) {
      throw new Error(`queryAgent error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data || !json.data.agent) {
      return null;
    }
  
    return json.data.agent;
  }

  export async function solveChallenge(params: {
    agentId: number;
    redpacketAddress: string;
    answer: string;
    user: {
      id: string;
      address: string;
    };
  }) {
    const res = await fetch(REDPACKET_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-address": params.user.address.toLowerCase(),
        Authorization: "Bearer mf7pmvRYWu8DTkC8a3we",
      },
      body: JSON.stringify({
        query: `
          mutation Solve($agentId: Int!, $redPackAddress: String!, $answer: String!) {
            solve(agentId: $agentId, redPackAddress: $redPackAddress, answer: $answer) {
              id
              status
              attempts
              question {
                stem
                options
              }
            }
          }
        `,
        variables: {
          agentId: params.agentId,
          redPackAddress: params.redpacketAddress,
          answer: params.answer,
        },
      }),
    });
  
    const json = (await res.json()) as SolveMutationResponse;
  
    // 日志（避免 [object Object]）
    logger.info("solve challenge result: " + JSON.stringify(json));
  
    if (json.errors?.length) {
      if(json.errors[0].message == 'Challenge is not in progress. Current status: success'){
         return { status:'success'};
      }
      throw new Error(`solveChallenge error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data?.solve) {
      throw new Error("solve returned empty result");
    }
  
    return json.data.solve;
  }

  export async function queryChallenge(params: {
    agentId: number;
    redpacketAddress: string;
    user: { id: string; address: string };
  }) {
    const res = await fetch(REDPACKET_AGENT_URL, {
      method: "POST",
      headers: {
        "x-user-address": params.user.address.toLowerCase(),
        "Content-Type": "application/json",
        Authorization: "Bearer mf7pmvRYWu8DTkC8a3we",
      },
      body: JSON.stringify({
        query: `
          query GetChallenge($agentId: Int!, $redPackAddress: String!) {
            challenge(agentId: $agentId, redPackAddress: $redPackAddress) {
              id
              agentId
              redPackAddress
              challengerAddress
              attempts
              status
              question {
                stem
                options
              }
            }
          }
        `,
        variables: {
          agentId: params.agentId,
          redPackAddress: params.redpacketAddress,
        },
      }),
    });
  
    const json = (await res.json()) as ChallengeQueryResponse;
    logger.info("query challenge result: " + JSON.stringify(json));
  
    if (json.errors?.length) {
      throw new Error(`queryChallenge error: ${JSON.stringify(json.errors)}`);
    }
    return json.data?.challenge ?? null;
  }
  
  export async function createAgent(params:{
     agentName: string,
     description: string,
     imageId: string,
     user:{
        id:string,
        address:string,
     }
  }) {
    const res = await fetch(REDPACKET_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-address":params.user.address,
        "Authorization": "Bearer mf7pmvRYWu8DTkC8a3we",
      },
      body: JSON.stringify({
        query: `
          mutation CreateAgent($agent: AgentInput!) {
            createAgent(agent: $agent) {
              to
              id
              deadline
              signature
            }
          }
        `,
        variables: {
          agent: {
            name: params.agentName,
            description: params.description,
            imageId: params.imageId,
          },
        },
      }),
    });
  
    const json = (await res.json()) as CreateAgentResponse;
    logger.info("create agent result:" + JSON.stringify(json));
    if (json.errors && json.errors.length > 0) {
      throw new Error(`create agent error: ${JSON.stringify(json.errors)}`);
    }
  
    if (!json.data) {
      throw new Error("No data returned from createAgent");
    }
  
    return json.data.createAgent;
  }