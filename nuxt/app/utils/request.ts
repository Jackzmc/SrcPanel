export class ResponseError extends Error {
  status?: number;
  code?: string;

  constructor({ message, status, code, cause }: {
    message: string;
    status?: number;
    code?: string;
    cause?: Error;
  }) {
    super(message);
    this.name = "ResponseError";
    this.status = status;
    this.code = code;
    this.cause = cause;
  }

  static async fromResponse(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await response.json();
      const errCode = body.code || body.error;
      let msg = `[${response.status} ${response.statusText}]`;
      if (errCode) msg += ` ${errCode}`;
      if (body.message) msg += (errCode ? `: ${body.message}` : body.message);

      return new ResponseError({
        message: msg,
        status: response.status,
        code: body.code,
        cause: body.error,
      });
    }
    return new ResponseError({
      message: await response.text() || `${response.status} ${response.statusText}`,
      status: response.status,
    });
  }

  static async throwIfError(response: Response) {
    if (!response.ok) {
      throw await this.fromResponse(response);
    }
  }
}

export type RequestResult<T> = { body: T } | { error: ResponseError };
/**
 * Performs a API request, throwing ResponseError if any errors (network error, OR non 200/204 status)
 * @param url
 * @param options
 * @throws ResponseError
 * @returns valid json
 */
// eslint-disable @typescript-eslint/no-explicit-any
export async function request<T extends Record<string, any> | null>(url: string, options?: RequestInit): Promise<RequestResult<T | null>> {
  try {
    const res = await fetch(url, options);

    await ResponseError.throwIfError(res);

    return res.status === 204 ? { body: null } : { body: await res.json() as T };
  } catch (err) {
    if (err instanceof Error) {
      return { error: new ResponseError({ message: err.message, cause: err }) };
    } else {
      return { error: new ResponseError({ message: String(err) }) };
    }
  }
}
