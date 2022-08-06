using System.Runtime.CompilerServices;
using System.Text;
using SkiaSharp;

namespace BadAppleCumcordServer.Services;

public class FrameService
{
	// 1.png, 2.png, 3.png, etc
	private readonly string[] _rawFrames = Directory.GetFiles("frames")
													.OrderBy(n => int.Parse(n.Split("/").Last().Split(".")[0]))
													.ToArray();

	public int FrameCount => _rawFrames.Length;

	public const string Chars = " ░▒▓█";

	public const double CharScaleF = 4.0 / (byte.MaxValue * 3.0);

	// this function is so jank lol
	[MethodImpl(MethodImplOptions.AggressiveInlining)]
	private static char GetChar(SKColor col) => Chars[(int) ((col.Red + col.Blue + col.Green) * CharScaleF)];

	public string[] GetFrame(int num, int width)
	{
		var rawBitmap = SKBitmap.Decode(_rawFrames[num]);

		var height = (int) ((double) width / rawBitmap.Width * rawBitmap.Height);

		var rsBitmap = new SKBitmap(width, height / 2);
		rawBitmap.ScalePixels(rsBitmap, SKFilterQuality.Low);

		var pixels = new StringBuilder[rsBitmap.Height];

		for (var y = 0; y < rsBitmap.Height; y++)
		{
			pixels[y] = new StringBuilder(rsBitmap.Width);
			for (var x = 0; x < rsBitmap.Width; x++)
			{
				// min because im paranoid
				var pixel = rsBitmap.GetPixel(x, y);
				var c     = GetChar(pixel);
				pixels[y].Append(c);
			}
		}

		return pixels.Select(c => c.ToString()).ToArray();
	}
}