using Abuhakmeh;
using Spectre.Console;

// Renders the real calling card (true color, 100 columns) to a terminal-styled HTML page: CardShot <out.html>
var console = AnsiConsole.Create(new AnsiConsoleSettings
{
    Ansi = AnsiSupport.Yes,
    ColorSystem = ColorSystemSupport.TrueColor,
    Out = new AnsiConsoleOutput(new StringWriter()),
    Interactive = InteractionSupport.No,
});
console.Profile.Width = 100;
console.Profile.Capabilities.Unicode = true;
var recorder = new Recorder(console);
Khalid.Hello(recorder);
File.WriteAllText(args[0], Html.Terminal(recorder.ExportHtml(), "Khalid.Hello()"));
