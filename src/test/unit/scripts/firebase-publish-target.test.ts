import { describe, expect, it } from "vitest";
import { resolve } from "path";
import { pathToFileURL } from "url";

const scriptUrl = pathToFileURL(resolve("scripts/lib/firebase-publish-target.mjs")).href;
const { FIREBASE_STORAGE_BUCKETS, resolveFirebasePublishTarget } = await import(scriptUrl) as {
  FIREBASE_STORAGE_BUCKETS: Record<"dev" | "prod", string>;
  resolveFirebasePublishTarget: (options?: { target?: string; bucket?: string }) => {
    target: string;
    bucketName: string;
  };
};

describe("resolveFirebasePublishTarget", () => {
  it("devとprodを既知のバケットへ解決する", () => {
    expect(resolveFirebasePublishTarget({ target: "dev" })).toEqual({
      target: "dev",
      bucketName: FIREBASE_STORAGE_BUCKETS.dev,
    });
    expect(resolveFirebasePublishTarget({ target: "prod" })).toEqual({
      target: "prod",
      bucketName: FIREBASE_STORAGE_BUCKETS.prod,
    });
  });

  it("明示されていない公開先を拒否する", () => {
    expect(() => resolveFirebasePublishTarget()).toThrow(/公開先/);
  });

  it("targetとbucketの不一致を拒否する", () => {
    expect(() => resolveFirebasePublishTarget({
      target: "dev",
      bucket: FIREBASE_STORAGE_BUCKETS.prod,
    })).toThrow(/一致しません/);
  });

  it("カスタムバケットは明示指定した場合だけ許可する", () => {
    expect(resolveFirebasePublishTarget({ bucket: "gs://local-emulator-bucket" })).toEqual({
      target: "custom",
      bucketName: "local-emulator-bucket",
    });
  });
});
