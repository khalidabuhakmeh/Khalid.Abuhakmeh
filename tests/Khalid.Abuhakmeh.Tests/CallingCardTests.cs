using Abuhakmeh;
using Spectre.Console;
using Spectre.Console.Testing;

namespace Abuhakmeh.Tests;

public class CallingCardTests
{
    public static TheoryData<int, bool, bool> Matrix()
    {
        var data = new TheoryData<int, bool, bool>();
        foreach (var width in new[] { 100, 60 })
            foreach (var color in new[] { true, false })
                foreach (var unicode in new[] { true, false })
                    data.Add(width, color, unicode);
        return data;
    }

    private static TestConsole Render(int width, bool color, bool unicode, bool ansi = false)
    {
        var console = new TestConsole().Width(width).Colors(color ? ColorSystem.TrueColor : ColorSystem.NoColors);
        console.Profile.Capabilities.Unicode = unicode;
        console.Profile.Capabilities.Ansi = ansi;
        if (ansi) console.EmitAnsiSequences();
        Khalid.Hello(console, new CallingCardOptions(Color: color));
        return console;
    }

    [Theory]
    [MemberData(nameof(Matrix))]
    public Task Snapshot(int width, bool color, bool unicode)
    {
        var output = Render(width, color, unicode).Output;
        return Verify(output)
            .UseParameters(width, color, unicode)
            .UseDirectory("Snapshots");
    }

    [Theory]
    [MemberData(nameof(Matrix))]
    public void Contains_website_and_fits_width(int width, bool color, bool unicode)
    {
        var output = Render(width, color, unicode).Output;

        Assert.Contains(Khalid.Website.Replace("https://", ""), output);
        foreach (var line in output.Split('\n'))
            Assert.True(Cell(line.TrimEnd('\r')) <= width, $"Line is {Cell(line)} cells wide (> {width}): {line}");
    }

    [Fact]
    public void Narrow_console_uses_compact_layout_without_avatar()
    {
        var narrow = Render(60, true, true).Output;
        var wide = Render(100, true, true).Output;
        Assert.DoesNotContain("\u2580", narrow);
        Assert.Contains("\u2580", wide);
    }

    [Fact]
    public void Ascii_fallback_has_no_unicode_characters()
    {
        var output = Render(100, false, false).Output;
        Assert.All(output, c => Assert.True(c < 128, $"Non-ASCII char U+{(int)c:X4}"));
    }

    [Fact]
    public void Color_output_uses_crimson_border()
    {
        var output = Render(100, true, true, ansi: true).Output;
        Assert.Contains("139;0;0", output);
    }

    private const string BannerRow1 = "╦╔═┬ ┬┌─┐┬  ┬┌┬┐  ╔═╗┌┐ ┬ ┬┬ ┬┌─┐┬┌─┌┬┐┌─┐┬ ┬";
    private const string BannerRow2 = "╠╩╗├─┤├─┤│  │ ││  ╠═╣├┴┐│ │├─┤├─┤├┴┐│││├┤ ├─┤";
    private const string BannerRow3 = "╩ ╩┴ ┴┴ ┴┴─┘┴─┴┘  ╩ ╩└─┘└─┘┴ ┴┴ ┴┴ ┴┴ ┴└─┘┴ ┴";

    [Theory]
    [InlineData(100, true)]
    [InlineData(100, false)]
    [InlineData(60, true)]   // compact layout still has room for the banner
    public void Banner_is_shown_when_unicode_and_width_allow(int width, bool color)
    {
        var output = Render(width, color, true).Output;
        Assert.Contains(BannerRow1, output);
        Assert.Contains(BannerRow2, output);
        Assert.Contains(BannerRow3, output);
    }

    [Theory]
    [InlineData(100, false)] // no unicode: plain name
    [InlineData(80, true)]   // avatar layout leaves a 35 column right column: too narrow for the banner
    [InlineData(40, true)]   // compact, but narrower than the banner
    public void Plain_name_when_banner_does_not_fit_or_no_unicode(int width, bool unicode)
    {
        var output = Render(width, true, unicode).Output;
        Assert.DoesNotContain("╦╔═", output);
        Assert.Contains("Khalid Abuhakmeh", output);
    }

    [Fact]
    public void Banner_K_and_A_use_crimson_and_the_rest_uses_skin()
    {
        var output = Render(100, true, true, ansi: true).Output;
        // K (3 cols) and A (3 cols) in crimson 139;0;0, the letters between in skin 251;234;234
        Assert.Contains("139;0;0;48;2;10;10;10m╦╔═", output);
        Assert.Contains("139;0;0;48;2;10;10;10m╔═╗", output);
        Assert.Contains("251;234;234;48;2;10;10;10m┬ ┬┌─┐┬  ┬┌┬┐  ", output);
    }

    [Fact]
    public void Header_is_the_website()
        => Assert.Contains("khalidabuhakmeh.com ─", Render(100, false, true).Output);

    [Fact]
    public void Hello_requires_console()
        => Assert.Throws<ArgumentNullException>(() => Khalid.Hello(null!));

    // Good enough for this card: astral-plane emoji are two cells wide, everything else one.
    private static int Cell(string s)
        => s.EnumerateRunes().Sum(r => r.Value >= 0x1F000 ? 2 : 1);
}
