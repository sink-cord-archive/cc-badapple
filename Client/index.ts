import {removePlugin, importPlugin} from "@cumcord/plugins";
import {error} from "@cumcord/utils/logger";

let isRunning = false;
let cancelRunning = false;
let currentPlugins: string[] = [];
let framerate = 0;
let audio: HTMLAudioElement;

declare global {
	// noinspection JSUnusedGlobalSymbols
	function BadApple(server: string): Promise<void>;
	function StopBadApple(): void;
}

const getUrl = (server: string) => (url: string) => new URL(url, server).href;

window.StopBadApple = () => {
	cancelRunning = true;
	audio?.pause();
	currentPlugins.forEach(removePlugin);
};

// noinspection JSUnusedGlobalSymbols
export function onUnload() {
	StopBadApple();
	delete window.StopBadApple;
	delete window.BadApple;
}

// here lies the fun stuff

const waitForNextFrame = () => new Promise<void>(res => setTimeout(res, 1000 / framerate));

const zwnj = "‌"

async function playFrame(grouped: [string, string][], getRoute: (r: string) => string) {
	currentPlugins.forEach(removePlugin);
	currentPlugins = [];

	let i = 0;
	for (const g of grouped) {
		const zwnjs = zwnj.repeat(++i);
		// zwnjs deduplicate plugin urls
		const pluginUrl = getRoute(`/${zwnjs}${g[0]}/${g[1]}/`);
		currentPlugins.push(pluginUrl);
		await importPlugin(pluginUrl);
	}
}

// stops html trimming whitespace
const zwnjRow = (f: string) => {
	let res = "";
	for (const c of f)
		res += c + zwnj;

	return zwnj + res;
}

window.BadApple = async (server) => {
	if (isRunning) error("already bad appling");
	isRunning = true;
	cancelRunning = false;

	const getRoute = getUrl(server);

	framerate = parseInt(await fetch(getRoute("/framerate")).then(r => r.text()));
	const frameCount = parseInt(await fetch(getRoute("/framecount")).then(r => r.text()));

	audio = new Audio(getRoute("audio.opus"));
	await audio.play();

	let frameN = 0;

	while (!cancelRunning && frameN < frameCount) {
		// run first for timing & promise scheduling reasons
		const nfWait = waitForNextFrame();

		const frame: string[] = await fetch(getRoute("/frame/" + frameN++)).then(r => r.json());
		const grouped: [string, string][] = [];
		for (let i = 0; i < (frame.length / 2); i++)
			grouped[i] = [zwnjRow(frame[i * 2]), zwnjRow(frame[(i * 2) + 1] ?? "")];

		await playFrame(grouped, getRoute);
		//console.log(frame.join("\n"))

		await nfWait;
	}

	isRunning = false;
	cancelRunning = false;
};