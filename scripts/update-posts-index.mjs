#!/usr/bin/env node
// Refreshes skills/local-khalid/references/posts.md from the live https://khalidabuhakmeh.com/llms.txt.
// Zero dependencies (Node 20+ built-in fetch).
//
//   node scripts/update-posts-index.mjs [--validate] [--date YYYY-MM-DD] [--out <file>] [--notes-out <file>] [--url <llms.txt url>]
//
// Change detection: posts.md is only rewritten when the list of post lines changed, so the
// "Generated" date in the header is the date of the last real change (and a no-op run leaves the file
// byte-identical). The script prints `changed=true|false` and, when GITHUB_OUTPUT is set, writes it there.
// --notes-out writes a Markdown list of posts added since the previous index (for release notes).
// Exit code is non-zero if the fetch fails, the status is not 200, or fewer than MIN_POSTS valid lines parse.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_POSTS = 100;
const SOURCE = "https://khalidabuhakmeh.com/llms.txt";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const url = arg("--url", SOURCE);
const date = arg("--date", new Date().toISOString().slice(0, 10));
const out = resolve(arg("--out", join(root, "skills", "local-khalid", "references", "posts.md")));
const notesOut = arg("--notes-out", "");

const pattern = /^- \[.+\]\(https:\/\/khalidabuhakmeh\.com\/posts\/[^)\s]+\): \d{4}-\d{2}-\d{2} \| [^|]*\| .*$/;

const fail = (msg) => {
	console.error(`error: ${msg}`);
	process.exit(1);
};

// --validate: offline check of the committed posts.md (used by CI); no network, no writes.
if (args.includes("--validate")) {
	const file = existsSync(out) ? readFileSync(out, "utf8").split(/\r?\n/) : fail(`${out} does not exist`);
	const entries = file.filter((l) => l.startsWith("- "));
	const bad = entries.find((l) => !pattern.test(l));
	if (bad) fail(`malformed post line: ${bad.slice(0, 160)}`);
	if (entries.length < MIN_POSTS) fail(`only ${entries.length} posts in ${out}`);
	console.log(`${out}: ${entries.length} posts, format OK`);
	process.exit(0);
}

let res;
try {
	res = await fetch(url, { headers: { "user-agent": "Khalid.Abuhakmeh-index-updater" } });
} catch (e) {
	fail(`fetching ${url} failed: ${e.message}`);
}
if (res.status !== 200) fail(`${url} returned HTTP ${res.status}`);
const text = await res.text();

// Extract only the "## Posts" section.
const lines = text.split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === "## Posts");
if (start < 0) fail("no '## Posts' section found in llms.txt");
let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
if (end < 0) end = lines.length;

const posts = [];
for (const line of lines.slice(start + 1, end)) {
	if (!line.startsWith("- ")) continue;
	if (!pattern.test(line)) fail(`post line does not match the expected format: ${line.slice(0, 160)}`);
	posts.push(line.trimEnd());
}
if (posts.length < MIN_POSTS) fail(`only ${posts.length} posts parsed (expected at least ${MIN_POSTS}); refusing to write a broken index`);

const existing = existsSync(out) ? readFileSync(out, "utf8") : "";
const oldPosts = existing.split(/\r?\n/).filter((l) => l.startsWith("- ["));
const unchanged = oldPosts.length === posts.length && oldPosts.every((l, i) => l === posts[i]);

const emit = (k, v) => {
	console.log(`${k}=${v}`);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
};

if (unchanged) {
	console.log(`No post changes (${posts.length} posts). ${out} left untouched.`);
	emit("changed", "false");
	emit("count", posts.length);
	process.exit(0);
}

const header = [
	"# Khalid's posts (bundled index)",
	"",
	`Generated ${date} from ${SOURCE}. ${posts.length} live posts, newest first.`,
	"One post per line: `- [Title](url): date | tags | description` (same format as https://khalidabuhakmeh.com/llms.txt). Search this file with grep or by reading it; do not invent URLs that are not listed here.",
	"",
];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, [...header, ...posts, ""].join("\n"));

// Release notes: posts whose URL was not in the previous index.
const urlOf = (l) => l.match(/\((https:\/\/khalidabuhakmeh\.com\/posts\/[^)\s]+)\): \d{4}-/)[1];
const oldUrls = new Set(oldPosts.map(urlOf));
const added = posts.filter((l) => !oldUrls.has(urlOf(l)));
if (notesOut) {
	const body = added.length
		? ["New posts in the bundled index:", "", ...added.map((l) => l.replace(/: (\d{4}-\d{2}-\d{2}) \| [^|]*\| .*$/, " ($1)")), ""]
		: ["The bundled post index was refreshed (existing posts were updated or removed).", ""];
	writeFileSync(notesOut, body.join("\n"));
}
console.log(`Wrote ${posts.length} posts (${added.length} new) -> ${out}`);
emit("changed", "true");
emit("count", posts.length);
emit("added", added.length);
