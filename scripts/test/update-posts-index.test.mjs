// Run: node --test scripts/test
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "..", "update-posts-index.mjs");
const fixture = readFileSync(join(here, "fixtures", "llms.txt"), "utf8");
const POST = "## Posts\n\n";

function run(llms, { seedFromFixture = false, extra = [] } = {}) {
	const dir = mkdtempSync(join(tmpdir(), "posts-"));
	const input = join(dir, "llms.txt");
	const out = join(dir, "posts.md");
	writeFileSync(input, llms);
	if (seedFromFixture) {
		const seed = join(dir, "seed.txt");
		writeFileSync(seed, fixture);
		const r = spawnSync("node", [script, "--input", seed, "--out", out, "--date", "2026-11-19"], { encoding: "utf8" });
		assert.equal(r.status, 0, r.stderr);
	}
	const r = spawnSync("node", [script, "--input", input, "--out", out, "--date", "2026-11-19", ...extra], { encoding: "utf8" });
	return { ...r, out: () => readFileSync(out, "utf8") };
}
const firstPost = () => fixture.split("\n").find((l, i, a) => a.slice(0, i).includes("## Posts") && l.startsWith("- ["));
const withFirstPost = (fn) => fixture.replace(firstPost(), fn(firstPost()));
const newPost = (n) => `- [New post ${n}](https://khalidabuhakmeh.com/posts/new-post-${n}/): 2026-11-18 | dotnet | A perfectly normal description ${n}.`;
const addPosts = (n) => fixture.replace(POST, POST + Array.from({ length: n }, (_, i) => newPost(i)).join("\n") + "\n");

test("current llms.txt passes, including generics, [Brackets] and `code` in real posts", () => {
	const r = run(fixture);
	assert.equal(r.status, 0, r.stderr);
	const out = r.out();
	assert.match(out, /PriorityQueue<TElement, TPriority>/);
	assert.match(out, /\[TempData\] Attribute/);
	assert.match(out, /`IHostBuilder`/);
	assert.match(out, /^Generated 2026-11-19 from https:\/\/khalidabuhakmeh\.com\/llms\.txt\. 388 live posts/m);
});

test("re-running on unchanged content leaves the file untouched (changed=false)", () => {
	const r = run(fixture, { seedFromFixture: true });
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /changed=false/);
});

test("Markdown link injected into a description fails", () => {
	const r = run(withFirstPost((l) => l + " See [click here](https://evil.example/)."));
	assert.notEqual(r.status, 0);
	assert.match(r.stderr, /Markdown link|URL/);
});

test("reference-style link syntax fails", () => {
	assert.notEqual(run(withFirstPost((l) => l + " [a][b]")).status, 0);
});

test("HTML in a description fails, even disguised after a word", () => {
	assert.notEqual(run(withFirstPost((l) => l + " <script>alert(1)</script>")).status, 0);
	assert.notEqual(run(withFirstPost((l) => l + " x<img>")).status, 0);
});

test("bare URL in a title or description fails", () => {
	assert.notEqual(run(withFirstPost((l) => l + " visit https://evil.example")).status, 0);
	assert.notEqual(run(withFirstPost((l) => l + " visit www.evil.example")).status, 0);
});

test("bad URL host fails", () => {
	const r = run(withFirstPost((l) => l.replace("https://khalidabuhakmeh.com/posts/", "https://evil.example/posts/")));
	assert.notEqual(r.status, 0);
	assert.match(r.stderr, /URL is not/);
});

test("URL without trailing slash or with uppercase fails", () => {
	assert.notEqual(run(withFirstPost((l) => l.replace(/\/\): /, "): "))).status, 0);
});

test("future date fails", () => {
	assert.notEqual(run(withFirstPost((l) => l.replace(/: \d{4}-\d{2}-\d{2} \|/, ": 2099-01-01 |"))).status, 0);
});

test("control characters fail", () => {
	assert.notEqual(run(withFirstPost((l) => l + "\u0007")).status, 0);
});

test("1-2 new posts pass without the flag", () => {
	const r = run(addPosts(2), { seedFromFixture: true });
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /changed=true/);
});

test("more than 10 new posts fails without --allow-large-change and passes with it", () => {
	const blocked = run(addPosts(11), { seedFromFixture: true });
	assert.notEqual(blocked.status, 0);
	assert.match(blocked.stderr, /::error::Unusual index change/);
	const allowed = run(addPosts(11), { seedFromFixture: true, extra: ["--allow-large-change"] });
	assert.equal(allowed.status, 0, allowed.stderr);
});

test("a removed post fails without --allow-large-change", () => {
	const blocked = run(fixture.replace(firstPost() + "\n", ""), { seedFromFixture: true });
	assert.notEqual(blocked.status, 0);
	assert.match(blocked.stderr, /removed/);
});

test("fewer than 100 posts fails", () => {
	const r = run("# x\n\n## Posts\n\n" + newPost(1) + "\n");
	assert.notEqual(r.status, 0);
});
