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

        console.Write(Build(color, unicode, compact));
    }

    private static IRenderable Build(bool color, bool unicode, bool compact)
    {
        string C(string c, string text) => color ? $"[{c}]{text}[/]" : text;
        string Bold(string c, string text) => color ? $"[bold {c}]{text}[/]" : $"[bold]{text}[/]";
        string Link(string url, string label) => color
            ? $"[link={url}][{Skin} underline]{Markup.Escape(label)}[/][/]"
            : $"[link={url}]{Markup.Escape(label)}[/]";

        var dot = unicode ? " \u00B7 " : " / ";
        var rows = new List<IRenderable>
        {
            new Markup(Bold(Skin, Markup.Escape("Khalid Abuhakmeh"))),
            new Markup(C(Pink, Markup.Escape("Senior Customer Success Engineer @ Duende Software"))),
            new Markup(C(Pink, Markup.Escape(string.Join(dot, ".NET", "ASP.NET Core", "C#", "HTMX", "IdentityServer")))),
            new Text(""),
            new Markup(C(Skin, Markup.Escape(
                "Over a decade of .NET and the web. Former .NET developer advocate at JetBrains. I keep coding."))),
            new Text(""),
            LinkRow("\U0001F310", "web:", Link(Website, "khalidabuhakmeh.com")),
            LinkRow("\U0001F419", "gh:", Link("https://github.com/khalidabuhakmeh", "github.com/khalidabuhakmeh")),
            LinkRow("\U0001F418", "mastodon:", Link("https://mastodon.social/@khalidabuhakmeh", "@khalidabuhakmeh@mastodon.social")),
            LinkRow("\u25B6 ", "yt:", Link("https://www.youtube.com/@khalidabuhakmeh", "youtube.com/@khalidabuhakmeh")),
            new Text(""),
            new Markup(C(Pink, "Tip: your AI agent can search my blog. This package ships a "
                + Markup.Escape("`local-khalid`") + " agent skill.")),
        };

        IRenderable LinkRow(string emoji, string label, string link) =>
            new Markup((unicode ? emoji + " " : label + " ") + link);

        var details = new Rows(rows);
        IRenderable body;
        if (compact)
        {
            var figlet = new FigletText("Khalid");
            if (color) figlet.Color(Color.FromHex(Crimson));
            body = new Rows(figlet, details);
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
            .Header(new PanelHeader(Bold(Skin, " Khalid Abuhakmeh ")))
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
