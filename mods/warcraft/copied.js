// "Copied to Clipboard": a WoW tooltip that pops up in the middle of the window for a
// moment when you highlight (or Ctrl+Shift+C) text in a terminal. The zone bar
// watches the clipboard and opens this as a window overlay (it never takes
// the keyboard), props { role: "copied", text }.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { props } from "herdr";
import { C, FONT, art, frame } from "./kit.js";

export const SIZE = { width: 320, height: 74 };

export default class Copied {
  render() {
    const text = String(props()?.text ?? "");
    const flat = text.replace(/\s+/g, " ").trim();
    const snippet = flat.length > 52 ? flat.slice(0, 52) + "…" : flat;
    const lines = text.split("\n").length;
    const body = h_flex().size_full().px(12).gap(10).items_center()
      .child(div().relative().w(34).h(34).flex_none()
        .child(art("icons/inv_misc_note_01").size_full())
        .child(div().absolute().top(0).left(0).size_full().border(1).border_color("#00000099")))
      .child(v_flex().flex_1().min_w(0).gap(1)
        .child(div().font_family(FONT).text_size(13).text_color(C.green).child("Copied to Clipboard"))
        .child(div().truncate().font_family(FONT).text_size(11).text_color(C.cream).child(`"${snippet}"`))
        .child(div().font_family(FONT).text_size(10).text_color(C.gold)
          .child(`${text.length} character${text.length === 1 ? "" : "s"}${lines > 1 ? ` · ${lines} lines` : ""}`)));
    return div().id("copied").relative().w(SIZE.width).h(SIZE.height).rounded(5).bg("#06060fee")
      .child(frame("copied-frame", body, { edge: "tip", size: 14, bg: "bg-dark" }));
  }
}
