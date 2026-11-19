using System.Text;
using System.Text.RegularExpressions;

static partial class Html
{
    /// <summary>Wraps Spectre's recorded HTML in a terminal-looking page. Half blocks become CSS gradients so they
    /// are pixel-perfect regardless of the font's glyph metrics.</summary>
    public static string Terminal(string spectreHtml, string title)
    {
        var inner = PreRegex().Match(spectreHtml).Groups[1].Value;
        inner = Half().Replace(inner, m =>
        {
            var n = m.Groups[3].Value.Length;
            return $"<span style=\"display:inline-block;vertical-align:top;height:19px;width:{n}ch;background:linear-gradient(to bottom,{m.Groups[1].Value} 50%,{m.Groups[2].Value} 50%)\">&#8203;</span>";
        });
        inner = Box().Replace(inner, m => $"<span style=\"display:inline-block;width:1ch;overflow:visible;text-align:center\">{m.Value}</span>");
        inner = Emoji().Replace(inner, m => $"<span style=\"display:inline-block;vertical-align:top;width:2ch;overflow:hidden;white-space:nowrap\">{m.Value}</span>");
        return $$"""
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{{title}}</title>
<style>
  html,body{margin:0;background:#000}
  body{padding:28px 32px;display:inline-block}
  pre.card{margin:0;font:400 16px/19px 'JetBrains Mono','Cascadia Mono',Menlo,'DejaVu Sans Mono',monospace;color:#FBEAEA;font-variant-ligatures:none}
  pre.card span{white-space:pre;display:inline-block;height:19px;vertical-align:top}
</style></head><body><pre class="card">{{inner}}</pre></body></html>
""";
    }

    [GeneratedRegex(@"[\u2600-\u27BF]\uFE0F?|[\uD83C-\uD83E][\uDC00-\uDFFF]")]
    private static partial Regex Emoji();

    [GeneratedRegex(@"[\u2554-\u256C\u250C-\u253C]")]
    private static partial Regex Box();

    [GeneratedRegex(@"<pre[^>]*>(.*)</pre>", RegexOptions.Singleline)]
    private static partial Regex PreRegex();

    [GeneratedRegex(@"<span style=""color: (#[0-9A-Fa-f]{6});background-color: (#[0-9A-Fa-f]{6})"">(\u2580+)</span>")]
    private static partial Regex Half();
}
