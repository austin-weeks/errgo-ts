import defer from "./defer.js";
import { propagateError } from "./propagate-error.js";
import { tryCatch } from "./try-catch.js";
import type { Result } from "./types.js";
import { ensureError } from "./utils.js";

export { defer, ensureError, propagateError, tryCatch };

export default {
  tryCatch,
  ensureError,
  propagateError,
  defer,
};

export type { Result };
