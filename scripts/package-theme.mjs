import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const manifestPath = "komari-theme.json";
const distIndexPath = "dist/index.html";

if (!existsSync(manifestPath)) {
  throw new Error("Missing komari-theme.json");
}

if (!existsSync(distIndexPath)) {
  throw new Error("Missing dist/index.html. Run npm run build first.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const version = String(manifest.version ?? "").trim();

if (!version) {
  throw new Error("komari-theme.json.version is required");
}

const archiveName = `komari-theme-${version}.zip`;
const entries = ["komari-theme.json", "dist", "preview"].filter((entry) =>
  existsSync(entry)
);

rmSync(archiveName, {
  force: true
});

const result = spawnSync(
  "zip",
  [
    "-r",
    archiveName,
    ...entries,
    "-x",
    "dist/.gitkeep",
    "dist/README.md",
    "preview/.gitkeep"
  ],
  {
    stdio: "inherit"
  }
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`zip exited with code ${result.status ?? "unknown"}`);
}

console.log(`Created ${archiveName}`);
