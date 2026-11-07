// Party: each agent is a party member's unit frame.
//   working  health full and still; only the mana bar moves (surges)
//   ready    idle or done (at its prompt, waiting for the next task): both bars
//            full and still, with a steady green glow around the bars and portrait
//   blocked  health red and flashing, no mana: it needs you
//   other    gray bars (an agent reporting nothing Herdr knows)
// target    the agent you're on: gold box around its frame, gold portrait ring, ▶ name
// Click: focus the agent. Right-click: pin or unpin it to the top.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, focused, run, setAgentOrder } from "herdr";
import { C, FONT, art, frame, plate, tabIcon, portrait, stop } from "./kit.js";

const K = 1.5; // party frame scale: texture px → layout px

const READY = { health: "green", mana: "blue", glow: true, color: C.green, word: "Ready" };
const LOOK = {
  working: { health: "green", mana: "blue", surge: true, color: C.yellow, word: "In progress" },
  blocked: { health: "red", mana: null, flash: true, color: C.red, word: "Needs you" },
  done: READY,
  idle: READY,
};
const OFFLINE = { health: "gray", mana: "gray", color: C.gray, word: "Offline" };
const GLOW = "#1eff00";

function bar(id, color, top, opts = {}) {
  const x = 46 * K, w = 70 * K, h = 7 * K;
  const fill = color ? art(`sb-${color}`).h(h).w(w) : div();
  return div().id(id).absolute().left(x).top(top).w(w).h(h).overflow_hidden().bg("#000000")
    .child(color
      ? (opts.surge ? div().h(h).w(w).overflow_hidden().loop("width", { from: w * 0.25, to: w, period: 1400 }).child(fill)
        : opts.flash ? fill.loop("opacity", { from: 0.35, to: 1, period: 700 }) : fill)
      : div());
}

export default class Party {
  render() {
    const list = [...agents()].sort((a, b) => (b.pinned - a.pinned));
    setAgentOrder(list.map((a) => a.address));
    const f = focused();
    const isTarget = (a) => a.focused || f?.terminal === a.address || f?.agent === a.address;
    const member = (a) => {
      const target = isTarget(a);
      const st = LOOK[a.status] ?? OFFLINE;
      const name = a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name ?? a.title;
      return div().id(`m-${a.address}`).relative().w(128 * K).h(56 * K).flex_none()
        .on_mouse_down("left", stop)
        .on_click(() => run("agent.focus", { terminal: a.address }))
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); run("terminal.pin", { terminal: a.address, pinned: !a.pinned }); })
        .hover((el) => el.opacity(0.92))
        // target (the agent you're on): a gold selection box behind the whole frame,
        // a gold ring on the portrait and a ▶ marker, like a targeted unit frame
        .when(target, (el) => el.child(div().absolute().left(-2).top(2).w(128 * K + 4).h(56 * K + 2)
          .rounded(4).bg(C.gold + "22").border(2).border_color(C.gold + "cc")))
        // ready: a soft green halo behind the portrait ring
        .when(Boolean(st.glow), (el) => el.child(div().absolute().left(1 * K).top(1 * K + 6).w(46 * K).h(46 * K)
          .rounded_full().bg(GLOW + "30").border(2).border_color(GLOW + "70")))
        // portrait under the ring; the ring's middle is transparent
        .child(div().absolute().left(6 * K).top(6 * K + 6).w(36 * K).h(36 * K).rounded_full().overflow_hidden()
          .child(art(portrait(a.address)).size_full()))
        .child(art("partyframe").absolute().left(0).top(6).w(128 * K).h(64 * K))
        .when(target, (el) => el.child(div().absolute().left(5 * K).top(5 * K + 6).w(38 * K).h(38 * K)
          .rounded_full().border(2).border_color(C.gold)))
        // ready: the same glow around both bars (drawn over the frame, under the bars)
        .when(Boolean(st.glow), (el) => el.child(div().absolute().left(44 * K).top(6.5 * K + 6).w(74 * K).h(19 * K)
          .rounded(3).bg(GLOW + "26").border(1).border_color(GLOW + "aa")))
        // the program as a small buff icon at the ring's foot
        .child(art(tabIcon(a.tab)).absolute().left(30 * K).top(34 * K + 6).w(14).h(14))
        .child(div().absolute().left(46 * K).top(0).w(80 * K).truncate().font_family(FONT).text_size(11.5)
          .text_color(target ? C.white : C.gold).child((target ? "▶ " : "") + (a.pinned ? "★ " : "") + name))
        .child(bar(`hp-${a.address}`, st.health, 8 * K + 6, { flash: st.flash }))
        .child(bar(`mp-${a.address}`, st.mana, 17 * K + 6, { surge: st.surge }))
        .child(div().absolute().left(46 * K).top(26 * K + 6).w(80 * K).truncate().font_family(FONT).text_size(9.5)
          .text_color(st.color).child(`${st.word} · ${a.space_name}`));
    };
    const body = v_flex().size_full().pt(26).pb(10).px(12)
      .child(v_flex().id("party-list").flex_1().min_h(0).overflow_y_scrollbar().gap(2)
        .children(list.length ? list.map(member)
          : [div().pt(8).font_family(FONT).text_size(11).text_color(C.gray).child("No party members. Start an agent from the action bar.")]));
    return div().id("party").relative().size_full().pt(14)
      .child(frame("party-frame", body, { edge: "dlg", size: 18, alpha: 0.85 }))
      .child(h_flex().absolute().top(0).left(0).right(0).justify_center().child(plate(`Party (${list.length})`)));
  }
}
