using BadAppleCumcordServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace BadAppleCumcordServer.Controllers;

[ApiController]
public class BadAppleController : Controller
{
	private readonly FrameService _frameService;

	public BadAppleController(FrameService frameService) => _frameService = frameService;

	[Route("/{_1}/{_2}/plugin.js")]
	public IActionResult Plugin(string _1, string _2) => Ok("{onUnload(){}}");

	[Route("/{topline}/{bottomline}/plugin.json")]
	public IActionResult Manifest(string topline, string bottomline) => Json(new
	{
		name = topline,
		description = bottomline,
		author = "",
		license = "",
		hash = "balls"
	});

	[Route("/frame/{num:int}")]
	public IActionResult Frame(int num) => Json(_frameService.GetFrame(num, 40)); // TODO: figure out a sensible length

	[Route("/framerate")]
	public IActionResult Framerate() => Ok(30);

	[Route("/audio.opus")]
	public IActionResult Audio() => File(System.IO.File.OpenRead("badapple.opus"), "audio/ogg");
}