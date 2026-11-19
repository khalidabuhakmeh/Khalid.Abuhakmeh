#!/usr/bin/env node
// Computes the date-based release version.
//   node scripts/compute-version.mjs [--date YYYY-MM-DD] [--from-tag v2026.01.03]
//
// package version = UTC date as yyyy.M.d (NuGet normalizes leading zeros, so 2026.01.03 == 2026.1.3)
// git tag         = v + zero-padded date, e.g. v2026.01.03
// If that tag or that package version already exists, a 4th segment is appended: .1, .2, ...
// Existing tags come from `git tag`; existing packages from the nuget.org flat container (404 = none yet).
// Prints version=... and tag=... (and writes them to GITHUB_OUTPUT when set).
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const pad = (n) => String(n).padStart(2, "0");
const emit = (k, v) => { console.log(`${k}=${v}`); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

// "2026.01.03.01" -> "2026.1.3.1"
const normalize = (v) => v.split(".").map((p) => String(parseInt(p, 10))).join(".");

const fromTag = arg("--from-tag", "");
if (fromTag) {
	const raw = fromTag.replace(/^v/, "");
	if (!/^\d{4}\.\d{1,2}\.\d{1,2}(\.\d+)?$/.test(raw)) {
		console.error(`error: tag '${fromTag}' is not a date version (vYYYY.MM.DD[.n])`);
		process.exit(1);
	}
	emit("version", normalize(raw));
	emit("tag", fromTag);
	process.exit(0);
}

const d = arg("--date", new Date().toISOString().slice(0, 10));
const [y, m, day] = d.split("-").map(Number);
const baseVersion = `${y}.${m}.${day}`;
const baseTag = `v${y}.${pad(m)}.${pad(day)}`;

// Compare tags in normalized form so v2026.1.3 and v2026.01.03 collide.
const existingTags = new Set(
	execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean)
		.map((t) => normalize(t.slice(1)))
);

let published = new Set();
try {
	const res = await fetch("https://api.nuget.org/v3-flatcontainer/khalid.abuhakmeh/index.json");
	if (res.status === 200) published = new Set((await res.json()).versions.map((v) => normalize(v.toLowerCase())));
	else if (res.status !== 404) throw new Error(`HTTP ${res.status}`);
} catch (e) {
	console.error(`error: could not query nuget.org: ${e.message}`);
	process.exit(1);
}

let n = 0;
const ver = () => (n === 0 ? baseVersion : `${baseVersion}.${n}`);
while (existingTags.has(ver()) || published.has(ver())) n++;
emit("version", ver());
emit("tag", n === 0 ? baseTag : `${baseTag}.${n}`);
