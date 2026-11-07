// Top bar: the shown space as zone text, its tab as the subzone, a clock and
// window buttons. It also swaps the background per space and shows the
// "Copied to Clipboard" tooltip. The layout block is window_drag, so the bar moves the window.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, window, layout, run, exec, openOverlay, closeOverlay } from "herdr";
import { ART, C, FONT, TITLE, LOADING, tiled, windowButtons } from "./kit.js";
import { SIZE as COPIED } from "./copied.js";

// Reads the clipboard's text: pbpaste on macOS; wl-paste on Wayland, else xclip on X11.
const readClipboard = () => window()?.platform === "macos"
  ? exec("pbpaste", [])
  : exec("sh", ["-c", "wl-paste --no-newline --type text 2>/dev/null || xclip -o -selection clipboard 2>/dev/null"]);

export default class Zone {
  init(_p, cx) {
    this.width = 1200;
    // The clock shows minutes: redraw once a minute, not more.
    cx.timer.every(30000, (cx) => cx.notify());
    try { this.screens = JSON.parse(localStorage.getItem("screens") ?? "{}"); } catch { this.screens = {}; }
    this.watchClipboard(cx);
  }

  // Herdr copies highlighted terminal text, but mods get no event for it, so the
  // clipboard is read twice a second while Herdr is the active window. A change
  // shows the "Copied" tooltip. Copies made in other apps only reset the baseline
  // (the first read after Herdr becomes active again is silent).
  watchClipboard(cx) {
    this.clip = null; this.wasActive = false; this.reading = false;
    cx.timer.every(500, (cx) => {
      const active = Boolean(window()?.active);
      if (!active) { this.wasActive = false; return; }
      if (this.reading) return;
      this.reading = true;
      const silent = !this.wasActive || this.clip === null;
      this.wasActive = true;
      cx.spawn(async (cx) => {
        try {
          const r = await readClipboard();
          const text = r.stdout;
          if (text !== this.clip) {
            const before = this.clip;
            this.clip = text;
            if (!silent && before !== null && text.trim()) this.showCopied(text, cx);
          }
        } catch { /* no clipboard reader on this machine: stay quiet */ }
        this.reading = false;
      });
    });
  }

  showCopied(text, cx) {
    this.copiedTimer?.cancel();
    const id = openOverlay({
      mod: "warcraft", props: { role: "copied", text: text.slice(0, 4000) },
      kind: "window", frame: "none", key: "wow-copied", width: COPIED.width, height: COPIED.height,
    });
    this.copiedTimer = cx.timer.after(1800, () => closeOverlay(id));
  }

  // Each space keeps a loading screen, picked at random the first time it shows
  // (one no other space has, while there are some left). The layout's root
  // background is swapped to it with layout.set whenever the shown space changes.
  syncScreen(list, space) {
    if (!space) return;
    let changed = false;
    for (const id of Object.keys(this.screens)) if (!list.some((s) => s.id === id)) { delete this.screens[id]; changed = true; }
    let pick = this.screens[space.id];
    if (!LOADING.includes(pick)) {
      const used = new Set(Object.values(this.screens));
      const free = LOADING.filter((n) => !used.has(n));
      const pool = free.length ? free : LOADING;
      pick = this.screens[space.id] = pool[Math.floor(Math.random() * pool.length)];
      changed = true;
    }
    if (changed) localStorage.setItem("screens", JSON.stringify(this.screens));
    const img = `${ART}/loading/${pick}.jpg`, tree = layout();
    if (tree && tree.background?.image !== img) run("layout.set", { layout: { ...tree, background: { image: img, fit: "cover" } } });
  }

  render() {
    const list = spaces();
    const space = list.find((s) => s.active);
    this.syncScreen(list, space);
    const tab = space?.tabs.find((t) => t.active);
    const program = panes().find((p) => p.tab === tab?.id && p.focused)?.program;
    const sub = tab ? (tab.named ? tab.name : program?.name ?? `Tab ${tab.index}`) : "";
    const now = new Date();
    const clock = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`;
    return div().id("zone").relative().size_full()
      .on_size_change((size) => { this.width = size.width; })
      .child(tiled("bg-rock", 2048, 1024))
      .child(div().absolute().bottom(0).left(0).right(0).h(2).bg("#000000aa"))
      .child(h_flex().absolute().top(0).left(0).size_full().px(14).items_center().justify_between()
        // macOS draws its traffic lights over the bar's left end (root traffic_lights): leave room.
        .child(div().w(140).when(window()?.platform === "macos" && !window()?.fullscreen, (el) => el.pl(66))
          .font_family(FONT).text_size(11).text_color(C.gray).child(clock))
        .child(v_flex().items_center().gap(0)
          .child(div().font_family(TITLE).text_size(21).text_color(C.gold).child(space?.name ?? "Herdr"))
          .when(Boolean(sub), (el) => el.child(div().font_family(FONT).text_size(10.5).text_color(C.cream).mt(-3).child(sub))))
        .child(h_flex().w(140).justify_end().child(windowButtons(window()) ?? div())));
  }
}
