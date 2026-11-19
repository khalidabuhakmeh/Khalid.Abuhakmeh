#!/usr/bin/env node
// Generates skills/local-khalid/references/posts.md from content/posts/*.md.
// Run from the package repo with --blog <path-to-blog-repo> (default: cwd), e.g.
//   node scripts/build-posts-reference.mjs --blog ../blog
// Original note: run from the blog repo root at pack time so the bundled list only contains live posts:
//   node content/_research/nuget-khalid-abuhakmeh/tools/build-posts-reference.mjs [--date YYYY-MM-DD] [--out path]
// Self-contained: reads markdown frontmatter only. No site changes, no network.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const cutoff = arg("--date", new Date().toISOString().slice(0, 10));
const out = arg("--out", join(here, "..", "skills", "local-khalid", "references", "posts.md"));
const blog = resolve(arg("--blog", process.cwd()));
const postsDir = join(blog, "content", "posts");
const site = "https://khalidabuhakmeh.com";

const unquote = (s) => s.trim().replace(/^["']|["']$/g, "").replace(/\\"/g, '"');
const oneLine = (s) => s.replace(/\s+/g, " ").replace(/\|/g, "/").trim();

function parse(file) {
	const raw = readFileSync(file, "utf8");
	const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!m) return null;
	const fm = {};
	let listKey = null;
	for (const line of m[1].split(/\r?\n/)) {
		const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
		if (top) {
			listKey = null;
			const [, key, value] = top;
			if (value === "") {
				listKey = key;
				fm[key] = [];
			} else fm[key] = unquote(value);
			continue;
		}
		const item = line.match(/^\s+-\s*(.+)$/);
		if (listKey && item && Array.isArray(fm[listKey]) && !item[1].includes(":")) {
			fm[listKey].push(unquote(item[1]));
		}
	}
	return fm;
}

const posts = [];
for (const name of readdirSync(postsDir)) {
	if (!name.endsWith(".md")) continue;
	const fm = parse(join(postsDir, name));
	if (!fm || !fm.title || !fm.publishDate) continue;
	if (fm.draft === "true" || fm.noindex === "true") continue;
	const date = String(fm.publishDate).slice(0, 10);
	if (date > cutoff) continue; // never bundle future-dated posts (they 404 until launch)
	posts.push({
		slug: basename(name, ".md"),
		title: oneLine(fm.title),
		description: oneLine(fm.description ?? ""),
		date,
		updated: fm.updatedDate ? String(fm.updatedDate).slice(0, 10) : "",
		tags: Array.isArray(fm.tags) ? fm.tags.map((t) => t.toLowerCase()) : [],
	});
}
posts.sort((a, b) => (a.date < b.date ? 1 : -1));

const lines = [
	"# Khalid's posts (bundled index)",
	"",
	`Generated ${cutoff} from khalidabuhakmeh.com. ${posts.length} live posts, newest first.`,
	"One post per line: `- [Title](url): date | tags | description` (same format as https://khalidabuhakmeh.com/llms.txt). Search this file with grep or by reading it; do not invent URLs that are not listed here.",
	"",
	...posts.map(
		(p) =>
			`- [${p.title}](${site}/posts/${p.slug}/): ${p.updated || p.date} | ${p.tags.join(", ")} | ${p.description}`,
	),
	"",
];
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${posts.length} posts (cutoff ${cutoff}) -> ${out}`);
