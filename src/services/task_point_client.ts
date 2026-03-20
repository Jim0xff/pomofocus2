import { env } from '../config/env';
import { HttpError } from '../errors/http-error';

function objectToQueryParams(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }
    params.append(key, String(value));
  }

  return params.toString();
}

export async function taskPointGet(
  uri: string,
  params: Record<string, unknown>,
  headers: Record<string, string> | null,
  needAuth: boolean,
  context: { requestId: string; authorizationHeader?: string },
): Promise<unknown> {
  if (!env.taskPointUrl) {
    throw new HttpError(500, 'AUTH_INTEGRATION_MISCONFIGURED', 'TASK_POINT_URL is not configured.', {
      requestId: context.requestId,
    });
  }

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-server-call': 'true',
    traceId: context.requestId,
    ...(headers ?? {}),
  };

  if (needAuth && context.authorizationHeader) {
    mergedHeaders.Authorization = context.authorizationHeader;
  }

  const query = objectToQueryParams(params);
  const wholeUri = `${uri}${query ? `?${query}` : ''}`;

  const response = await fetch(`${env.taskPointUrl}${wholeUri}`, {
    method: 'GET',
    headers: mergedHeaders,
  });

  let payload: any = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (typeof payload?.code === 'number') {
    if (payload.code === 200) {
      return payload.data;
    }
    if (payload.code === 401) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token', {
        requestId: context.requestId,
      });
    }
    throw new HttpError(502, 'UPSTREAM_AUTH_ERROR', 'Upstream auth request failed.', {
      details: {
        upstreamCode: payload.code,
        upstreamMessage: payload.message,
        upstreamStatus: response.status,
      },
      requestId: context.requestId,
    });
  }

  if (response.status === 401) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Invalid token', {
      requestId: context.requestId,
    });
  }

  if (!response.ok) {
    throw new HttpError(502, 'UPSTREAM_AUTH_ERROR', 'Upstream auth request failed.', {
      details: {
        upstreamStatus: response.status,
      },
      requestId: context.requestId,
    });
  }

  return payload;
}
