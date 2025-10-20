import errgo, {
  coerceError,
  propagateError,
  scope,
  tryCatch,
} from "./dist/index.js";

if (
  errgo === undefined ||
  coerceError === undefined ||
  propagateError === undefined ||
  tryCatch === undefined ||
  scope === undefined ||
  scope.safe === undefined ||
  scope.throwing === undefined ||
  scope.handled === undefined
) {
  throw new Error("errgo-ts package exports not found");
} else {
  console.log("All errgo-ts package exports found.");
}
