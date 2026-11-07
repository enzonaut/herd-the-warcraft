// Quest Log: each space is a quest, colored like quest difficulty by its most
// urgent agent (red: needs you, yellow: in progress, green: complete, gray: idle).
// The shown space's tabs are its objectives. Click selects; right-click is the space menu.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, run, openOverlay } from "herdr";
import { C, FONT, STATUS, frame, plate, button, stop } from "./kit.js";

export default class Quests {
  render() {
    const list = spaces();
    const quest = (s) => {
      const st = STATUS[s.status] ?? null;
      const color = s.active ? C.white : st?.color ?? C.gold;
      const row = h_flex().id(`q-${s.id}`).relative().h(20).px(6).gap(6).items_center().flex_none()
        .on_mouse_down("left", stop)
        .on_click(() => run("space.select", { id: s.id }))
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: s.id } } }); })
        .hover((el) => el.bg("#ffffff14"))
        .when(s.active, (el) => el.bg("#ffd10026").border_l(2).border_color(C.gold))
        .child(div().text_size(10).text_color(C.gray).font_family(FONT).child(`[${s.index}]`))
        .child(div().flex_1().truncate().font_family(FONT).text_size(12.5).text_color(color).child(s.name + (s.machine ? ` (${s.machine})` : "")))
        .when(Boolean(st) && s.status !== "idle", (el) => el.child(div().font_family(FONT).text_size(10).text_color(st.color).child(`(${st.word})`)));
      if (!s.active) return [row];
      const objectives = s.tabs.map((t) => {
        const program = panes().find((p) => p.tab === t.id && p.program?.agent)?.program ?? panes().find((p) => p.tab === t.id)?.program;
        const name = t.named ? t.name : program?.name ?? `Tab ${t.index}`;
        const ts = STATUS[t.status];
        return h_flex().id(`o-${t.id}`).h(17).pl(26).pr(6).gap(6).items_center().flex_none()
          .on_mouse_down("left", stop).on_click(() => run("tab.select", { id: t.id }))
          .hover((el) => el.bg("#ffffff10"))
          .child(div().flex_1().truncate().font_family(FONT).text_size(11).text_color(t.active ? C.white : C.cream).child(`- ${name}`))
          .child(div().font_family(FONT).text_size(10).text_color(ts?.color ?? C.gray).child(ts ? ts.word : `${t.panes}/${t.panes}`));
      });
      return [row, ...objectives];
    };
    const body = v_flex().size_full().pt(26).pb(12).px(12).gap(6)
      .child(v_flex().id("quest-list").flex_1().min_h(0).overflow_y_scrollbar().gap(1).children(list.flatMap(quest)))
      .child(h_flex().justify_between().items_center().flex_none()
        .child(div().font_family(FONT).text_size(10.5).text_color(C.gray).child(`${list.length}/25 Quests`))
        .child(button("q-new", "New Quest", () => run("space.new"))));
    return div().id("quests").relative().size_full().pt(14)
      .child(frame("quests-frame", body, { edge: "dlg", size: 18, alpha: 0.85 }))
      .child(h_flex().absolute().top(0).left(0).right(0).justify_center().child(plate("Quest Log")));
  }
}
