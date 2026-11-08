import { useAuthStore } from "../auth/stores/auth";
export class WorkflowError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/workflow/${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${useAuthStore().token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new WorkflowError(data.code);
    return data;
  } catch (e) {
    if (e instanceof WorkflowError) throw e;
    throw new WorkflowError("network");
  } finally {
    clearTimeout(timer);
  }
}
