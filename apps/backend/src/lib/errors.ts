export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "api_error"
  ) {
    super(message);
  }
}

export const forbidden = (message = "Forbidden") => new ApiError(403, message, "forbidden");
export const unauthorized = (message = "Unauthorized") => new ApiError(401, message, "unauthorized");
export const badRequest = (message = "Bad request") => new ApiError(400, message, "bad_request");
export const conflict = (message = "Conflict") => new ApiError(409, message, "conflict");
