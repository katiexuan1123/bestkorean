import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("production build is a Vite static build for Vercel", () => {
  assert.equal(packageJson.scripts.build, "vite build");
});

test("Vercel has a serverless API catch-all for frontend /api calls", () => {
  assert.equal(existsSync(new URL("../api/[...path].ts", import.meta.url)), true);
});

test("Vercel rewrites SPA routes to the static index", () => {
  const vercelConfig = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercelConfig.rewrites, [
    {
      source: "/((?!api/.*).*)",
      destination: "/index.html",
    },
  ]);
});
