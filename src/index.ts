import { propagateError } from "./propagate-error";
import { tryCatch } from "./try-catch";
import type { Result } from "./types";
import { ensureError } from "./utils";

export { ensureError, propagateError, tryCatch };

export default {
  tryCatch,
  ensureError,
  propagateError,
};

export type { Result };
