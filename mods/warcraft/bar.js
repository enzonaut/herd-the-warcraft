// The main action bar between two gryphons. Positions are in texture px
// (the bar is 1024 × 55, each gryphon 128 × 76) times the scale k, which fits
// the bar to the window's width.
//   slots 1–12: the shown space's tabs (hotkey = ctrl+N); click selects,
//     double-click renames, right-click is the tab menu. Working tabs pulse
//     like a cooldown, a tab that needs you flashes red, a finished one glows.
//     An empty slot opens the new-tab menu (a "+" shows on hover).
//   micro menu: new tab, split right, split down, palette, settings, help
//   bags: spaces 1–5; an empty bag makes a new space

import { div } from "gpui-kit";
import { spaces, panes, run, openOverlay } from "herdr";
import { C, FONT, art, tabIcon, stop } from "./kit.js";

const CAP = 128, CAP_H = 76, OVERLAP = 28, BAR = 1024, BAR_H = 55;
const SLOT = { x: 8, step: 42, y: 15, size: 36 };
const MICRO = { x: 556, step: 34, y: 18, size: 28 };
const BAGS = { x: 862, step: 34, y: 20, size: 26 };

export default class Bar {
  init() { this.width = 1400; this.height = 96; }

  render() {
    const total = BAR + 2 * (CAP - OVERLAP);
    const k = Math.max(0.5, Math.min(1.3, (this.width - 16) / total, this.height / CAP_H));
    const u = (n) => n * k;
    const space = spaces().find((s) => s.active);
    const tabs = space?.tabs ?? [];
    const left = (this.width - u(total)) / 2;
    const barX = left + u(CAP - OVERLAP), barY = this.height - u(BAR_H);

    const at = (el, x, y, w, h) => el.absolute().left(barX + u(x)).top(barY + u(y)).w(u(w)).h(u(h));

    const slot = (t, i) => {
      const program = panes().find((p) => p.tab === t.id && p.program?.agent)?.program ?? panes().find((p) => p.tab === t.id)?.program;
      const name = t.named ? t.name : program?.name ?? `Tab ${t.index}`;
      const s = u(SLOT.size), pad = u(2);
      return at(div().id(`slot-${t.id}`), SLOT.x + SLOT.step * i, SLOT.y, SLOT.size, SLOT.size)
        .tooltip(`${name}${t.status ? ` (${t.status})` : ""}`)
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); if (e.click_count === 2) run("tab.rename", { id: t.id }); })
        .on_click(() => run("tab.select", { id: t.id }))
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: t.id, space: space.id } } }); })
        .child(art(tabIcon(t.id)).absolute().left(pad).top(pad).w(s - 2 * pad).h(s - 2 * pad))
        .when(t.status === "working", (el) => el.child(div().absolute().left(pad).top(pad).w(s - 2 * pad).h(s - 2 * pad).bg("#000000").loop("opacity", { from: 0.1, to: 0.6, period: 1200 })))
        .when(t.status === "blocked", (el) => el.child(div().absolute().left(0).top(0).size_full().border(2).border_color(C.red).loop("opacity", { from: 0.2, to: 1, period: 600 })))
        .when(t.status === "done", (el) => el.child(div().absolute().left(0).top(0).size_full().border(2).border_color(C.green)))
        .when(t.active, (el) => el.child(art("slot-active").absolute().left(-u(2)).top(-u(2)).w(s + u(4)).h(s + u(4))))
        .hover((el) => el.opacity(0.88))
        .when(i < 9, (el) => el.child(div().absolute().right(u(3)).top(u(1)).font_family(FONT).text_size(Math.max(9, u(10))).text_color(C.gray).child(String(i + 1))))
        .child(div().absolute().left(u(3)).bottom(u(1)).max_w(s - u(6)).truncate().font_family(FONT).text_size(Math.max(8, u(8.5))).text_color(C.white).child(t.zoomed ? "Z" : ""));
    };

    // Empty slots and bags: hover lights them, a click makes a new tab (the same
    // menu as the micro button: a shell or any agent) or a new space.
    const newTab = () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });
    const emptySlot = (i) => {
      const s = u(SLOT.size);
      return at(div().id(`slot-empty-${i}`), SLOT.x + SLOT.step * i, SLOT.y, SLOT.size, SLOT.size)
        .tooltip("New tab").on_mouse_down("left", stop).on_click(newTab)
        .hover((el) => el.bg("#ffd10014"))
        .when(i < 9, (el) => el.child(div().absolute().right(u(3)).top(u(1)).font_family(FONT).text_size(Math.max(9, u(10))).text_color(C.dim).child(String(i + 1))))
        .child(div().absolute().top(0).left(0).w(s).h(s).flex().items_center().justify_center()
          .font_family(FONT).text_size(u(18)).text_color("#ffd10000").hover((el) => el.text_color("#ffd100cc")).child("+"));
    };
    const emptyBag = (i) =>
      at(div().id(`bag-empty-${i}`), BAGS.x + BAGS.step * i, BAGS.y, BAGS.size, BAGS.size)
        .tooltip("New space").on_mouse_down("left", stop).on_click(() => run("space.new"))
        .hover((el) => el.bg("#ffd10014"))
        .child(div().size_full().flex().items_center().justify_center()
          .font_family(FONT).text_size(u(14)).text_color("#ffd10000").hover((el) => el.text_color("#ffd100cc")).child("+"));

    const micro = (i, icon, tip, action) =>
      at(div().id(`micro-${i}`), MICRO.x + MICRO.step * i, MICRO.y, MICRO.size, MICRO.size)
        .tooltip(tip).on_mouse_down("left", stop).on_click(action).hover((el) => el.opacity(0.8))
        .child(art(`icons/${icon}`).size_full());

    const bag = (s, i) =>
      at(div().id(`bag-${s.id}`), BAGS.x + BAGS.step * i, BAGS.y, BAGS.size, BAGS.size)
        .tooltip(s.name).on_mouse_down("left", stop).on_click(() => run("space.select", { id: s.id }))
        .child(art("icons/inv_misc_bag_08").size_full().opacity(s.active ? 1 : 0.55))
        .when(s.active, (el) => el.child(art("slot-active").absolute().left(-u(2)).top(-u(2)).w(u(BAGS.size + 4)).h(u(BAGS.size + 4))))
        .when(s.status === "blocked", (el) => el.child(div().absolute().left(0).top(0).size_full().border(2).border_color(C.red).loop("opacity", { from: 0.2, to: 1, period: 600 })));

    return div().id("root").relative().size_full()
      .on_size_change((size, cx) => { this.width = size.width; this.height = size.height; cx.notify(); })
      .on_scroll_wheel((e) => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .children([1, 2, 3, 4].map((n) => art(`bar-${n}`).absolute().left(barX + u(256 * (n - 1))).top(barY).w(u(256)).h(u(BAR_H))))
      .children(tabs.slice(0, 12).map(slot))
      .children(Array.from({ length: Math.max(0, 12 - tabs.length) }, (_, j) => emptySlot(tabs.length + j)))
      .child(micro(0, "inv_misc_book_09", "New tab", newTab))
      .child(micro(1, "ability_warrior_shieldwall", "Split right", () => run("pane.split", { direction: "right" })))
      .child(micro(2, "ability_hunter_snipershot", "Split down", () => run("pane.split", { direction: "down" })))
      .child(micro(3, "inv_misc_note_01", "Commands", () => run("app.palette")))
      .child(micro(4, "inv_misc_gear_01", "Settings", () => run("app.settings")))
      .child(micro(5, "inv_misc_questionmark", "Help", () => run("app.help")))
      .children(spaces().slice(0, 5).map(bag))
      .children(Array.from({ length: Math.max(0, 5 - spaces().length) }, (_, j) => emptyBag(spaces().length + j)))
      .child(art("endcap-l").absolute().left(left).top(this.height - u(CAP_H)).w(u(CAP)).h(u(CAP_H)))
      .child(art("endcap-r").absolute().left(left + u(total - CAP)).top(this.height - u(CAP_H)).w(u(CAP)).h(u(CAP_H)));
  }
}
