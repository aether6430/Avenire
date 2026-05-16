import { describe, expect, it } from "vitest";
import { getRemotePreferencesState } from "./settings-preferences-model";

describe("settings preferences model", () => {
  it("keeps remote preference loading, failure, and ready states distinct", () => {
    expect(
      getRemotePreferencesState({
        loadFailed: false,
        loading: true,
      })
    ).toEqual({
      message: "Loading preferences...",
      ready: false,
    });

    expect(
      getRemotePreferencesState({
        loadFailed: true,
        loading: false,
      })
    ).toEqual({
      message: "Unable to load preferences.",
      ready: false,
    });

    expect(
      getRemotePreferencesState({
        loadFailed: false,
        loading: false,
      })
    ).toEqual({
      message: null,
      ready: true,
    });
  });
});
