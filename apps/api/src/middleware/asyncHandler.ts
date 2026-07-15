import { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

/**
 * Express 4 does not forward rejected promises from async handlers to
 * error middleware — an unhandled rejection crashes the process. Wrap
 * every async route handler with this so failures reach errorHandler.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: AsyncRouteHandler<Req>,
): (req: Req, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
