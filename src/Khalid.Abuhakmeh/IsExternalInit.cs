#if !NET5_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    // Enables records/init on netstandard2.0.
    internal static class IsExternalInit { }
}
#endif
