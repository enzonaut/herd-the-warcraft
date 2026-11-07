// A pane's nameplate (the layout's pane header; props { pane, terminal }):
// the tab's spell icon (shared with its action bar slot), its name in gold, the folder, the status in its
// quest color, and on hover split / zoom / close.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { C, FONT, STATUS, art, tiled, tabIcon } from "./kit.js";

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Plate {
  init() { this.hovered = false; }

  render() {
    const p = panes().find((x) => x.pane === props()?.pane);
    if (!p) return div();
    const pane = p.pane, st = STATUS[p.status];
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const btn = (id, icon, cmd, args) => div().id(id).p(3).rounded(3).text_color(C.gray)
      .hover((s) => s.bg("#ffffff1a").text_color(C.gold))
      .on_click((_e, cx) => { cx.stop_propagation(); run(cmd, args); })
      .child(svg(`mods/pane/${icon}.svg`).size(13));
    return div().id(`plate-${pane}`).relative().size_full()
      .on_hover((h, cx) => { this.hovered = h; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .child(tiled("bg-marble", 1024, 2048))
      .child(div().absolute().bottom(0).left(0).right(0).h(1).bg(p.focused ? C.gold : "#5a4a2a"))
      .child(h_flex().absolute().top(0).left(0).size_full().px(8).gap(8).items_center()
        .child(art(tabIcon(p.tab)).w(18).h(18).flex_none())
        .child(div().flex_none().max_w(260).truncate().font_family(FONT).text_size(12.5).text_color(p.focused ? C.gold : C.cream).child(name))
        .child(div().flex_1().truncate().font_family(FONT).text_size(10.5).text_color(C.gray).child(folder(p.cwd)))
        .when(Boolean(st) && p.status !== "idle", (el) => el.child(
          div().flex_none().font_family(FONT).text_size(10.5).text_color(st.color)
            .when(p.status === "blocked", (d) => d.loop("opacity", { from: 0.4, to: 1, period: 700 }))
            .child(st.word)))
        .when(this.hovered, (el) => el
          .child(btn(`pr-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
          .child(btn(`pd-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
          .child(btn(`pz-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
          .child(btn(`px-${pane}`, "close", "pane.close", { pane }))));
  }
}
