using System;
using System.Collections.Generic;
using Spectre.Console;
using Spectre.Console.Rendering;

namespace Abuhakmeh;

/// <summary>Khalid Abuhakmeh's calling card.</summary>
public static class Khalid
{
    public const string Website = "https://khalidabuhakmeh.com";

    private const string Crimson = "#8B0000";
    private const string Skin = "#FBEAEA";
    private const string Pink = "#E8A0A0";
    private const string Black = "#0A0A0A";
    private const int CompactBelowWidth = 80;

    /// <summary>Prints the calling card to the current console.</summary>
    public static void Hello() => Hello(AnsiConsole.Console);

    /// <summary>Prints the calling card to <paramref name="console"/>. Pass a TestConsole in tests.</summary>
    public static void Hello(IAnsiConsole console, CallingCardOptions? options = null)
    {
        if (console is null) throw new ArgumentNullException(nameof(console));
        options ??= new CallingCardOptions();

        var caps = console.Profile.Capabilities;
        var color = options.Color && caps.ColorSystem != ColorSystem.NoColors;
        var unicode = caps.Unicode;
        var compact = options.Compact || console.Profile.Width < CompactBelowWidth;

        console.Write(Build(color, unicode, compact, console.Profile.Width));
    }

    // Pre-rendered "Calvin S" banner (no FIGlet font is shipped). K = columns 0-2, A = columns 18-20.
    private static readonly string[] Banner =
    {
        "\u2566\u2554\u2550\u252C \u252C\u250C\u2500\u2510\u252C  \u252C\u250C\u252C\u2510  \u2554\u2550\u2557\u250C\u2510 \u252C \u252C\u252C \u252C\u250C\u2500\u2510\u252C\u250C\u2500\u250C\u252C\u2510\u250C\u2500\u2510\u252C \u252C",
        "\u2560\u2569\u2557\u251C\u2500\u2524\u251C\u2500\u2524\u2502  \u2502 \u2502\u2502  \u2560\u2550\u2563\u251C\u2534\u2510\u2502 \u2502\u251C\u2500\u2524\u251C\u2500\u2524\u251C\u2534\u2510\u2502\u2502\u2502\u251C\u2524 \u251C\u2500\u2524",
        "\u2569 \u2569\u2534 \u2534\u2534 \u2534\u2534\u2500\u2518\u2534\u2500\u2534\u2518  \u2569 \u2569\u2514\u2500\u2518\u2514\u2500\u2518\u2534 \u2534\u2534 \u2534\u2534 \u2534\u2534 \u2534\u2514\u2500\u2518\u2534 \u2534",
    };
    private const int BannerWidth = 45;

    private static IRenderable Build(bool color, bool unicode, bool compact, int width)
    {
        // inner width = console width - border (2) - horizontal padding (4); avatar column = avatar + 3 spacing
        var rightWidth = width - 6 - (compact ? 0 : Avatar.Columns + 3);
        var useBanner = unicode && rightWidth >= BannerWidth;

        string C(string c, string text) => color ? $"[{c}]{text}[/]" : text;
        string Bold(string c, string text) => color ? $"[bold {c}]{text}[/]" : $"[bold]{text}[/]";
        string Link(string url, string label) => color
            ? $"[link={url}][{Skin} underline]{Markup.Escape(label)}[/][/]"
            : $"[link={url}]{Markup.Escape(label)}[/]";

        var dot = unicode ? " \u00B7 " : " / ";
        var rows = new List<IRenderable>();
        if (useBanner)
        {
            foreach (var line in Banner)
            {
                string Part(string part, string c) => color ? $"[{c}]{Markup.Escape(part)}[/]" : Markup.Escape(part);
                rows.Add(new Markup(Part(line.Substring(0, 3), Crimson) + Part(line.Substring(3, 15), Skin)
                    + Part(line.Substring(18, 3), Crimson) + Part(line.Substring(21), Skin)));
            }
        }
        else rows.Add(new Markup(Bold(Skin, Markup.Escape("Khalid Abuhakmeh"))));
        rows.AddRange(new IRenderable[]
        {
            new Markup(C(Pink, Markup.Escape(string.Join(dot, ".NET developer", "writer", "lifelong learner")))),
            new Markup(C(Pink, Markup.Escape(string.Join(dot, ".NET", "ASP.NET Core", "C#", "HTMX", "the web")))),
            new Text(""),
            new Markup(C(Skin, Markup.Escape(
                "I write about .NET and the web, share what I learn, and keep coding. Studied Computer Science & Philosophy. Opinions are my own."))),
            new Text(""),
            LinkRow("\U0001F310", "web:", Link(Website, "khalidabuhakmeh.com")),
            LinkRow("\U0001F419", "gh:", Link("https://github.com/khalidabuhakmeh", "github.com/khalidabuhakmeh")),
            LinkRow("\U0001F418", "mastodon:", Link("https://mastodon.social/@khalidabuhakmeh", "@khalidabuhakmeh@mastodon.social")),
            LinkRow("\u25B6 ", "yt:", Link("https://www.youtube.com/@khalidabuhakmeh", "youtube.com/@khalidabuhakmeh")),
            new Text(""),
            new Markup(C(Pink, "Tip: your AI agent can search my blog. This package ships a "
                + Markup.Escape("`local-khalid`") + " agent skill.")),
        });

        IRenderable LinkRow(string emoji, string label, string link) =>
            new Markup((unicode ? emoji + " " : label + " ") + link);

        var details = new Rows(rows);
        IRenderable body;
        if (compact)
        {
            body = details;
        }
        else
        {
            IRenderable avatar = unicode && color
                ? new Markup(Avatar.Color)
                : new Text(Avatar.Mono, color ? new Style(Color.FromHex(Crimson)) : Style.Plain);
            var grid = new Grid().AddColumn(new GridColumn().NoWrap().PadRight(3)).AddColumn();
            grid.AddRow(avatar, details);
            body = grid;
        }

        var panel = new Panel(body)
            .Header(new PanelHeader(Bold(Skin, " khalidabuhakmeh.com ")))
            .Padding(2, 1)
            .RoundedBorder();

        if (!unicode) panel.Border = BoxBorder.Ascii;
        if (color)
        {
            panel.BorderColor(Color.FromHex(Crimson));
            return new BackgroundFill(panel, Color.FromHex(Black));
        }
        return panel;
    }
}
