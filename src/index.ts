import { propagateError } from "./propagate-error.js";
import { tryCatch } from "./try-catch.js";
import type { Result } from "./types.js";
import { ensureError } from "./utils.js";

export { ensureError, propagateError, tryCatch };

export default {
  tryCatch,
  ensureError,
  propagateError,
};

export type { Result };
