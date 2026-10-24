import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { Admin } from "@db/schema";
import { getAdminFromRequest } from "./auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  admin?: Admin;
};

export async function createContext(opts: FetchCreateContextFnOptions): Promise<TrpcContext> {
  const admin = await getAdminFromRequest(opts.req);
  return { req: opts.req, resHeaders: opts.resHeaders, admin };
}
