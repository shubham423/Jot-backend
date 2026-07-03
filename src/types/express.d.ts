/**
 * LAYER RESPONSIBILITY: Augment Express's built-in `Request` type so that
 * `req.userId` is known to TypeScript everywhere in the app, with no `any`.
 *
 * WHY can't we just do `(req as any).userId = "123"` in the auth
 * middleware and read it the same way in controllers?
 * Because `any` disables type-checking entirely for that value - we'd
 * lose autocomplete, and a typo like `req.userid` (wrong case) would
 * silently compile and fail at runtime instead of being caught by the
 * compiler. TypeScript supports "declaration merging": if we declare an
 * interface with the same name in the same module that Express declares
 * `Request` in, TypeScript merges our extra fields into it. This file
 * does exactly that, so `req.userId` is a real, typed property (a
 * `string`, since Mongo ObjectIds are sent over HTTP/JWT as strings)
 * everywhere `Request` is used in the project.
 */

// `declare global` is required because this file has no top-level
// import/export of its own runtime value - it's a "global augmentation"
// module. Without `declare global`, TypeScript would treat this as an
// isolated module and the merge wouldn't apply to other files.
declare global {
  namespace Express {
    interface Request {
      // Set by auth.middleware.ts after verifying the JWT. Optional
      // because on routes that don't use the auth middleware, it won't
      // be set - controllers behind auth middleware can rely on it being
      // present because the middleware runs first and throws/returns 401
      // if it's missing.
      userId?: string;
    }
  }
}

// A "module" file needs at least one import/export statement to be
// treated as a module by TypeScript (otherwise `declare global` has
// nothing to attach to). This empty export is the conventional way to
// satisfy that requirement.
export {};
