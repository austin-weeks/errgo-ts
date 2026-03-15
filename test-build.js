import { coerceError, propagateError, safeTry, scope } from "errgo-ts";

if (
  coerceError === undefined ||
  propagateError === undefined ||
  safeTry === undefined ||
  scope === undefined ||
  scope.safe === undefined ||
  scope.throwing === undefined ||
  scope.handled === undefined
) {
  throw new Error("errgo-ts package exports not found");
} else {
  console.log("All errgo-ts package exports found.");
}
