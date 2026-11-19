#!/usr/bin/env node
// Refreshes skills/local-khalid/references/posts.md from the live https://khalidabuhakmeh.com/llms.txt.
// Zero dependencies (Node 20+ built-in fetch).
//
//   node scripts/update-posts-index.mjs [--validate] [--date YYYY-MM-DD] [--out <file>] [--notes-out <file>]
//                                       [--url <llms.txt url>] [--input <local file instead of fetching>]
//                                       [--allow-large-change]
//
// The llms.txt content ends up in an AI agent's context, so it is treated as untrusted input. Every post line is
// parsed into fields, each field is validated, and the output line is RE-EMITTED from the validated fields
// (raw lines are never copied). Any violation fails the run with a non-zero exit code.
//
// Line shape:  - [Title](url): YYYY-MM-DD | tags | description
// Rules
//   url          exactly https://khalidabuhakmeh.com/posts/<lowercase-kebab-slug>/
//   date         real calendar date, not later than tomorrow (UTC), i.e. +1 day of slack for time zones
//   tags         comma separated, may be empty; each tag is lowercase [a-z0-9][a-z0-9.#+-]*, words inside one
//                tag may be separated by single spaces (the site has the tag "aspnet core")
//   title (<=200) and description (<=400), both non-empty, single line, and:
//     - no control characters, zero-width or bidi-override characters, or '|'
//     - no Markdown links: "](" and "][" are rejected (plain [Brackets] such as "[TempData] attribute" are fine)
//     - no URLs: http(s)/ftp/file/ws schemes followed by "://", "www.", "javascript:", "data:" are rejected
//       (a mention of another scheme such as "redis://" in a title is fine)
//     - no HTML: '<' and '>' are only allowed as C#-style generics (List<T>, Dictionary<string, List<T>>);
//       known HTML tag names (script, img, a, ...) in angle brackets are rejected
//     - backticks only as balanced inline-code spans whose content is a plain identifier-ish string
// Big-change guard (compared with the committed posts.md): more than 10 added posts, ANY removed post (which
// also covers a changed URL), fails unless --allow-large-change is passed (the workflow does so only on `force`).
//
// Change detection: posts.md is only rewritten when the post lines changed, so the "Generated" date in the header
// is the date of the last real change and a no-op run leaves the file byte-identical. Prints changed=true|false
// (and writes it to GITHUB_OUTPUT when set). --notes-out writes a Markdown list of added posts for release notes.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_POSTS = 100;
const MAX_ADDED = 10;
const MAX_TITLE = 200;
const MAX_DESC = 400;
const SOURCE = "https://khalidabuhakmeh.com/llms.txt";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const url = arg("--url", SOURCE);
const input = arg("--input", "");
const date = arg("--date", new Date().toISOString().slice(0, 10));
const out = resolve(arg("--out", join(root, "skills", "local-khalid", "references", "posts.md")));
const notesOut = arg("--notes-out", "");
const allowLarge = args.includes("--allow-large-change");

const fail = (msg) => {
	console.error(`::error::${msg}`);
	process.exit(1);
};

const LINE = /^- \[(.+)\]\((https:\/\/[^)\s]*)\): (\d{4}-\d{2}-\d{2}) \| ([^|]*) \| (.*)$/;
const URL_OK = /^https:\/\/khalidabuhakmeh\.com\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
const TAG_OK = /^[a-z0-9][a-z0-9.#+-]*(?: [a-z0-9][a-z0-9.#+-]*)*$/;
const HTML_TAGS = /^(script|style|iframe|img|a|b|i|u|p|br|hr|div|span|svg|html|head|body|link|meta|object|embed|form|input|button|table|tr|td|th|ul|ol|li|h[1-6]|video|audio|source|base|frame|frameset|math|template|title|textarea|noscript)$/i;
const GENERIC = /([A-Za-z_]\w*)<([A-Za-z_]\w*(?:, ?[A-Za-z_]\w*)*)>/;

function checkText(label, text, max, where) {
	const bad = (why) => fail(`${where}: ${label} ${why}: ${text.slice(0, 120)}`);
	if (text.length === 0) bad("is empty");
	if (text.length > max) bad(`is longer than ${max} characters`);
	if (/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/.test(text)) bad("contains control or invisible characters");
	if (text.includes("|")) bad("contains '|'");
	if (/\]\(|\]\[/.test(text)) bad("contains Markdown link syntax");
	if (/\b(?:https?|ftps?|sftp|file|wss?):\/\/|\bwww\./i.test(text) || /\b(javascript|data|vbscript):/i.test(text)) bad("contains a URL");
	// Balanced inline-code spans with plain content are fine; they are removed before the remaining checks.
	let rest = text;
	if ((rest.match(/`/g) || []).length % 2 !== 0) bad("has an unbalanced backtick");
	rest = rest.replace(/`([A-Za-z0-9_.:#<>,() -]+)`/g, "");
	if (rest.includes("`")) bad("contains a backtick that is not a plain inline-code span");
	// Generics: collapse innermost List<T> shapes repeatedly; anything left with < or > is HTML-ish.
	for (;;) {
		const m = GENERIC.exec(rest);
		if (!m) break;
		if (m[2].split(/, ?/).some((a) => HTML_TAGS.test(a))) bad("contains an HTML-like tag");
		rest = rest.slice(0, m.index) + m[1] + "G" + rest.slice(m.index + m[0].length);
	}
	if (/[<>]/.test(rest)) bad("contains HTML");
}

function parsePost(raw) {
	const where = `post line '${raw.slice(0, 60)}…'`;
	const m = LINE.exec(raw);
	if (!m) fail(`${where} does not match '- [Title](url): YYYY-MM-DD | tags | description'`);
	const [, title, link, day, tagField, desc] = m;
	if (!URL_OK.test(link)) fail(`${where}: URL is not https://khalidabuhakmeh.com/posts/<slug>/ : ${link.slice(0, 120)}`);
	const d = new Date(`${day}T00:00:00Z`);
	if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) fail(`${where}: ${day} is not a valid date`);
	if (d.getTime() > Date.now() + 2 * 86400000) fail(`${where}: date ${day} is in the future`);
	const tags = tagField.split(",").map((t) => t.trim()).filter(Boolean);
	for (const t of tags) if (!TAG_OK.test(t)) fail(`${where}: invalid tag '${t.slice(0, 60)}'`);
	checkText("title", title, MAX_TITLE, where);
	checkText("description", desc, MAX_DESC, where);
	return { title, link, day, tags, desc };
}
const emitLine = (p) => `- [${p.title}](${p.link}): ${p.day} | ${p.tags.join(", ")} | ${p.desc}`;
const urlOf = (l) => (/\((https:\/\/khalidabuhakmeh\.com\/posts\/[^)\s]+)\): \d{4}-/.exec(l) || [])[1];

const emit = (k, v) => {
	console.log(`${k}=${v}`);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
};

// --validate: offline check of the committed posts.md (used by CI); no network, no writes.
if (args.includes("--validate")) {
	const file = existsSync(out) ? readFileSync(out, "utf8").split(/\r?\n/) : fail(`${out} does not exist`);
	const entries = file.filter((l) => l.startsWith("- "));
	entries.forEach(parsePost);
	if (entries.length < MIN_POSTS) fail(`only ${entries.length} posts in ${out}`);
	console.log(`${out}: ${entries.length} posts, format OK`);
	process.exit(0);
}

let text;
if (input) {
	text = readFileSync(input, "utf8");
} else {
	let res;
	try {
		res = await fetch(url, { headers: { "user-agent": "Khalid.Abuhakmeh-index-updater" } });
	} catch (e) {
		fail(`fetching ${url} failed: ${e.message}`);
	}
	if (res.status !== 200) fail(`${url} returned HTTP ${res.status}`);
	text = await res.text();
}

// Extract only the "## Posts" section.
const lines = text.split(/\r?\n/);
const start = lines.findIndex((l) => l.trim() === "## Posts");
if (start < 0) fail("no '## Posts' section found in llms.txt");
let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
if (end < 0) end = lines.length;

const posts = [];
for (const line of lines.slice(start + 1, end)) {
	if (!line.startsWith("- ")) continue;
	posts.push(emitLine(parsePost(line.trimEnd())));
}
if (posts.length < MIN_POSTS) fail(`only ${posts.length} posts parsed (expected at least ${MIN_POSTS}); refusing to write a broken index`);
const urls = posts.map(urlOf);
if (new Set(urls).size !== urls.length) fail("duplicate post URLs in llms.txt");

const existing = existsSync(out) ? readFileSync(out, "utf8") : "";
const oldPosts = existing.split(/\r?\n/).filter((l) => l.startsWith("- ["));
const unchanged = oldPosts.length === posts.length && oldPosts.every((l, i) => l === posts[i]);

// Big-change guard.
const oldUrls = new Set(oldPosts.map(urlOf));
const newUrls = new Set(urls);
const added = posts.filter((l) => !oldUrls.has(urlOf(l)));
const removed = [...oldUrls].filter((u) => !newUrls.has(u));
if (oldPosts.length > 0 && !allowLarge && (added.length > MAX_ADDED || removed.length > 0)) {
	fail(`Unusual index change (${added.length} added, ${removed.length} removed/changed URLs). A maintainer must review llms.txt and re-run the release workflow with 'force' (--allow-large-change).`);
}

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

if (notesOut) {
	const body = added.length
		? ["New posts in the bundled index:", "", ...added.map((l) => l.replace(/: (\d{4}-\d{2}-\d{2}) \| [^|]*\| .*$/, " ($1)")), ""]
		: ["The bundled post index was refreshed (existing posts were updated).", ""];
	writeFileSync(notesOut, body.join("\n"));
}
console.log(`Wrote ${posts.length} posts (${added.length} new) -> ${out}`);
emit("changed", "true");
emit("count", posts.length);
emit("added", added.length);
