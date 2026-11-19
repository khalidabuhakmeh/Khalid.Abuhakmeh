namespace Abuhakmeh;

/// <summary>Options for <see cref="Khalid.Hello(Spectre.Console.IAnsiConsole, CallingCardOptions?)"/>.</summary>
/// <param name="Color">Use the colored avatar and palette. When false, a monochrome ASCII avatar is used.</param>
/// <param name="Compact">Render the no-avatar variant. Selected automatically on narrow consoles.</param>
public sealed record CallingCardOptions(bool Color = true, bool Compact = false);
