import { removePlugin, importPlugin } from "@cumcord/plugins";
import { error } from "@cumcord/utils/logger";
import { injectCSS } from "@cumcord/patcher";
import { sleep } from "@cumcord/utils"

let isRunning = false;
let cancelRunning = false;
let currentPlugins: string[] = [];
let framerate = 0;
let audio: HTMLAudioElement;
let removeStyleFix: () => void;

declare global {
  function BadApple(server: string): Promise<void>;
  function StopBadApple(): void;
  const _: any;
}

const getUrl = (server: string) => (url: string) => new URL(url, server).href;

window.StopBadApple = () => {
  removeStyleFix?.();
  cancelRunning = true;
  audio?.pause();
  setTimeout(() => {
    currentPlugins.forEach(removePlugin);
    currentPlugins = [];
  }, 2000);
};

// noinspection JSUnusedGlobalSymbols
export const onLoad = () => BadApple("http://localhost:5051");

// noinspection JSUnusedGlobalSymbols
export function onUnload() {
  StopBadApple();
  delete window.StopBadApple;
  delete window.BadApple;
}

// here lies the fun stuff

const waitForNextFrame = () => sleep(1000 / framerate);

const zwnj = "‌";

async function playFrame(
  grouped: [string, string][],
  getRoute: (r: string) => string
) {
  currentPlugins.forEach(removePlugin);
  currentPlugins = [];

  // zwnjs deduplicate plugin urls
  const plugins = grouped.map((g, i) =>
    getRoute(`/${zwnj.repeat(i)}${g[0]}/${g[1]}/`)
  );

  for (const pluginUrl of plugins) {
    // pre-cache and stuff
    fetch(pluginUrl);
    currentPlugins.push(pluginUrl);
  }

  for (const pluginUrl of plugins) await importPlugin(pluginUrl);
}

async function testFps(getRoute: (r: string) => string) {
  const perfs = [];

  // get first frame mostly because we want it to be the same size
  const f1: [string, string][] = _.chunk(
    await fetch(getRoute("/frame/0")).then((r) => r.json()),
    2
  );

  for (let i = 0; i < 30; i++) {
    const f = f1.map((s, j): [string, string] => [i + s[0] + j, s[1] ?? zwnj]);
    const start = performance.now();
    await playFrame(f, getRoute);
    perfs.push(performance.now() - start);
  }

  currentPlugins.forEach(removePlugin);
  currentPlugins = [];

  return 1000 / (perfs.reduce((a, b) => a + b, 0) / perfs.length);
}

window.BadApple = async (server) => {
  if (isRunning) error("already bad appling");
  isRunning = true;
  cancelRunning = false;

  removeStyleFix = injectCSS(".cumcord-card-description { font-size: 14px; }");

  const getRoute = getUrl(server);

  const framerate = await testFps(getRoute);

  const realFramerate = parseInt(
    await fetch(getRoute("/framerate")).then((r) => r.text())
  );
  const frameCount = parseInt(
    await fetch(getRoute("/framecount")).then((r) => r.text())
  );

  const frameSkip = Math.ceil(realFramerate / framerate);

  audio = new Audio(getRoute("audio.opus"));
  await audio.play();

  for (
    let frameN = 0;
    frameN < frameCount && !cancelRunning;
    frameN += frameSkip
  ) {
    // run first for timing & promise scheduling reasons
    const nfWait = waitForNextFrame();

    const frame: string[] = await fetch(getRoute("/frame/" + frameN)).then(
      (r) => r.json()
    );
    const grouped: [string, string][] = [];
    for (let i = 0; i < frame.length / 2; i++)
      grouped[i] = [frame[i * 2], frame[i * 2 + 1] ?? zwnj];

    await playFrame(grouped, getRoute);
    //console.log(frame.join("\n"))

    await nfWait;
  }

  await sleep(3000);
  currentPlugins.forEach(removePlugin);
  currentPlugins = [];

  isRunning = false;
  cancelRunning = false;
};
