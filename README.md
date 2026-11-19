# Khalid.Abuhakmeh

A small, fun, branded package from [Khalid Abuhakmeh](https://khalidabuhakmeh.com). It ships two things:

1. **`Khalid.Hello()`**: prints a [Spectre.Console](https://spectreconsole.net) calling card with an ASCII avatar, a short bio, and clickable links.
2. **A `local-khalid` agent skill**: lets your AI agent (GitHub Copilot, Claude Code, and others) find Khalid's blog posts that are relevant to the problem you are working on.

## Install

```bash
dotnet add package Khalid.Abuhakmeh
```

Targets `netstandard2.0` and `net8.0`. The only dependency is Spectre.Console.

## Usage

```csharp
using Abuhakmeh;

Khalid.Hello();
```

The namespace is `Abuhakmeh` and the class is `Khalid` on purpose, so `Khalid.Hello()` does not collide with the package namespace.

Or as a single-file app (.NET 10):

```csharp
#:package Khalid.Abuhakmeh@*

using Abuhakmeh;

Khalid.Hello();
```

```bash
dotnet run app.cs
```

For tests or custom consoles, pass an `IAnsiConsole`:

```csharp
Khalid.Hello(console, new CallingCardOptions(Color: false, Compact: true));
```

The card switches to a compact layout (no avatar) on consoles narrower than 80 columns, a monochrome ASCII avatar when color is off, and ASCII borders and labels when Unicode is not available. The panel has a solid black background so it looks the same on light and dark terminals.

### What it looks like

Monochrome output at 100 columns (the real thing is crimson, white, and pink on black):

```text
╭─ Khalid Abuhakmeh ───────────────────────────────────────────────────────────────────────────────╮
│                                                                                                  │
│                                       Khalid Abuhakmeh                                           │
│             .....::::.....            .NET developer · writer · lifelong learner                 │
│          ..::::........::::..         .NET · ASP.NET Core · C# · HTMX · the web                  │
│        ..:::.   ..      ..:::..                                                                  │
│      ..:::.   :::-==-.-=.  .:::..     I write about .NET and the web, share what I learn, and    │
│     .:::..  =#@@@@@@@@@@@*  ..:::.    keep coding. Studied Computer Science & Philosophy.        │
│    .::::. .-#@@@@@@@@@@@@@+. .::::.   Opinions are my own.                                       │
│    .::::...-#@@@@@@@@@@@@@=  .::::.                                                              │
│    :::::.  :#***#%@@%#***@=  .:::::   🌐 khalidabuhakmeh.com                                     │
│    ::::..: ++==-=*%@%+-+*#% ::.::::   🐙 github.com/khalidabuhakmeh                              │
│    .:::.+*:#%@@%@#%@@@%@@@@-@#.:::.   🐘 @khalidabuhakmeh@mastodon.social                        │
│    .:::.:#:#@@@@%%@@@%@@@@@-@-.:::.   ▶  youtube.com/@khalidabuhakmeh                            │
│     .:::.=:=%@%#+-++-+#%@@+:+.:::.                                                               │
│      ..::. .:%.=-+**+-=.%.  .::..     Tip: your AI agent can search my blog. This package ships  │
│        ..:. .:.@@*++*@@.   .:..       a `local-khalid` agent skill.                              │
│          ...   :#@##@#-   ...                                                                    │
│          .  +*-  .::...=%*  .                                                                    │
│             =###+====*@@@*                                                                       │
│                                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯
```

## The `local-khalid` agent skill

The package contains an [Agent Skill](https://agentskills.io/specification) at `skills/local-khalid/`. Ask your agent something like "is there a blog post about EF Core migrations?" and it acts as a "local Khalid": it searches a bundled index of posts, answers briefly, and links to 1-3 posts from khalidabuhakmeh.com.

It uses the bundled index (`references/posts.md`) first, and falls back to the live [https://khalidabuhakmeh.com/llms.txt](https://khalidabuhakmeh.com/llms.txt) (rebuilt with the site) when the agent has web access and the bundled index has no match. The skill is instruction-only: no scripts, no pre-approved tools, and it never invents URLs.

### Installing the skill into your agent

Agents do not discover skills from the NuGet cache automatically. After adding the package, copy the skill into your repo with one of these:

**Option 1: `dotnet-package-skills`** (see [Delivering Skills in NuGet packages](https://devblogs.microsoft.com/dotnet/delivering-skills-in-nuget-packages/)). The tool is currently prerelease:

```bash
dotnet tool install -g dotnet-package-skills --prerelease
dotnet-package-skills install
```

This copies skills from your referenced packages into `.agents/skills/`.

**Option 2: copy it by hand.**

```bash
# GitHub Copilot (.agents/skills or .github/skills)
mkdir -p .agents/skills
cp -R ~/.nuget/packages/khalid.abuhakmeh/<version>/skills/local-khalid .agents/skills/

# Claude Code
mkdir -p .claude/skills
cp -R ~/.nuget/packages/khalid.abuhakmeh/<version>/skills/local-khalid .claude/skills/
```

Review any skill before you install it. Skills are prompts, and prompts are an attack surface.

## Refreshing the post index

The index in `skills/local-khalid/references/posts.md` is generated from the blog's `content/posts/*.md` frontmatter. Drafts, `noindex`, and future-dated posts are skipped. Regenerate it before each release:

```bash
node scripts/build-posts-reference.mjs --blog /path/to/blog
```

Options: `--blog <path>` (default: current directory), `--date YYYY-MM-DD`, `--out <file>`.

## Building

Requires the .NET 10 SDK (see `global.json`).

```bash
dotnet build -c Release
dotnet test
dotnet pack src/Khalid.Abuhakmeh -c Release -o artifacts
```

The ASCII avatar is generated from `assets/avatar-neutral.png` by `tools/AvatarGen` (a dev-only tool, not shipped):

```bash
dotnet run --project tools/AvatarGen
```

Releases are published by pushing a `v*` tag; see `.github/workflows/release.yml` (NuGet trusted publishing, or a `NUGET_API_KEY` secret).

## License

[MIT](LICENSE). The avatar and bio are personal branding and are included for this package only.
