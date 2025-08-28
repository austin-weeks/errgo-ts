import { describe, expect, it } from "vitest";
import errgo, {
  defer,
  ensureError,
  propagateError,
  Result,
  tryCatch,
} from "./index";

describe("errgo-ts exports", () => {
  describe("default exports", () => {
    it("should export propagateError", () => {
      expect(errgo.propagateError).toBeDefined();
    });

    it("should export ensureError", () => {
      expect(errgo.ensureError).toBeDefined();
    });

    it("should export tryCatch", () => {
      expect(errgo.tryCatch).toBeDefined();
    });

    it("should export defer.safe", () => {
      expect(errgo.defer.safe).toBeDefined();
    });

    it("should export defer.throwing", () => {
      expect(errgo.defer.throwing).toBeDefined();
    });

    it("should export defer.handled", () => {
      expect(errgo.defer.handled).toBeDefined();
    });
  });

  it("should export propagateError", () => {
    expect(propagateError).toBeDefined();
  });

  it("should export ensureError", () => {
    expect(ensureError).toBeDefined();
  });

  it("should export tryCatch", () => {
    expect(tryCatch).toBeDefined();
  });

  it("should export Result type", () => {
    const _ = {} as Result<null>;
  });

  it("should export defer.safe", () => {
    expect(defer.safe).toBeDefined();
  });

  it("should export defer.throwing", () => {
    expect(defer.throwing).toBeDefined();
  });

  it("should export defer.handled", () => {
    expect(defer.handled).toBeDefined();
  });
});
