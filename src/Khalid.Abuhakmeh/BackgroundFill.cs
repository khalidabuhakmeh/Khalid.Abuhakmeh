using System.Collections.Generic;
using System.Linq;
using Spectre.Console;
using Spectre.Console.Rendering;

namespace Abuhakmeh;

/// <summary>
/// Spectre's Panel has no background style, so this wrapper paints a solid background on every
/// segment (including padding and borders). The card then reads the same on light and dark terminals.
/// </summary>
internal sealed class BackgroundFill(IRenderable inner, Color background) : IRenderable
{
    public Measurement Measure(RenderOptions options, int maxWidth) => inner.Measure(options, maxWidth);

    public IEnumerable<Segment> Render(RenderOptions options, int maxWidth) =>
        inner.Render(options, maxWidth).Select(s =>
        {
            if (s.IsLineBreak || s.IsControlCode) return s;
            return new Segment(s.Text, new Style(background: background).Combine(s.Style));
        });
}
