// Runs scripts/deploy.sh against stub commands: checks the order of steps, never touches a real server or database.
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run() {
  dir = mkdtempSync(join(tmpdir(), "deploy-"));
  const log = join(dir, "calls.log");
  mkdirSync(join(dir, "scripts"));
  mkdirSync(join(dir, "bin"));
  copyFileSync("scripts/deploy.sh", join(dir, "scripts/deploy.sh"));
  writeFileSync(join(dir, "scripts/backup-db.sh"), `echo "backup-db.sh $*" >> "${log}"\n`);
  for (const cmd of ["git", "npm", "npx", "sudo"]) {
    const f = join(dir, "bin", cmd);
    writeFileSync(f, `#!/bin/sh\necho "${cmd} $*" >> "${log}"\n[ "$1 $2" = "rev-parse --short" ] && echo abc1234\nexit 0\n`);
    chmodSync(f, 0o755);
  }
  execFileSync("sh", [join(dir, "scripts/deploy.sh")], {
    env: { PATH: `${join(dir, "bin")}:/usr/bin:/bin`, NODE_ENV: "test" },
    stdio: "pipe",
  });
  return readFileSync(log, "utf8").trim().split("\n");
}

describe("scripts/deploy.sh", () => {
  it("backs the database up before migrating, so a rollback has a pre-migration dump", () => {
    const calls = run();
    const backup = calls.findIndex((c) => c.startsWith("backup-db.sh"));
    const migrate = calls.findIndex((c) => c === "npx prisma migrate deploy");
    expect(backup, calls.join("\n")).toBeGreaterThanOrEqual(0);
    expect(calls[backup]).toBe("backup-db.sh pre-deploy");
    expect(backup).toBeLessThan(migrate);
    expect(calls.indexOf("sudo systemctl restart dolanin")).toBeGreaterThan(migrate);
  });
});
