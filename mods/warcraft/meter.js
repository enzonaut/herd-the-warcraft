// Damage meter: tokens spent per agent, like a raid's damage meter. Each agent is a
// bar in its class color, longest first, with its total, its rate over the last
// minute (the "DPS") and its share of the party's total. Updates every 2 seconds.
//
// Totals come from meter.py, which reads Claude Code's transcripts (agents that
// report no transcript, e.g. other programs, show as 0).
//   Click the title: switch between all tokens and output tokens only.
//   Click a bar: focus that agent.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, appHome, exec, run } from "herdr";
import { C, FONT, art, frame, hash, tabIcon, stop } from "./kit.js";

const POLL = 2000;
const WINDOW = 60_000; // the rate is over the last minute

// Class colors, one per agent, picked by its address.
const CLASS = ["#c69b6d", "#f48cba", "#aad372", "#fff468", "#0070dd", "#3fc7eb", "#8788ee", "#ff7c0a", "#c41e3a", "#00ff98", "#33937f", "#a330c9"];

const MODES = [
  { title: "Tokens Spent", of: (t) => t.input + t.output + t.cache_write + t.cache_read },
  { title: "Output Tokens", of: (t) => t.output },
];

function short(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

export default class Meter {
  init(_props, cx) {
    this.totals = {}; // address → {input, output, cache_write, cache_read}
    this.samples = {}; // address → [[ms, total for each mode]]
    this.mode = 0;
    this.busy = false;
    cx.timer.every(POLL, (cx) => this.refresh(cx));
    this.refresh(cx);
  }

  refresh(cx) {
    if (this.busy || agents().length === 0) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const r = await exec("python3", ["-I", `${appHome()}/mods/warcraft/meter.py`]);
        if (r.code === 0 || r.code === undefined) {
          this.totals = JSON.parse(r.stdout || "{}");
          const now = Date.now();
          for (const [addr, t] of Object.entries(this.totals)) {
            const s = (this.samples[addr] ??= []);
            s.push([now, MODES.map((m) => m.of(t))]);
            while (s.length > 2 && now - s[0][0] > WINDOW) s.shift();
          }
          for (const addr of Object.keys(this.samples)) if (!this.totals[addr]) delete this.samples[addr];
        }
      } catch (_) {
        // python3 missing or a bad read: keep the last numbers
      } finally {
        this.busy = false;
      }
      cx.notify();
    });
  }

  rate(addr) {
    const s = this.samples[addr];
    if (!s || s.length < 2) return 0;
    const [t0, v0] = s[0], [t1, v1] = s[s.length - 1];
    return t1 > t0 ? Math.max(0, (v1[this.mode] - v0[this.mode]) / ((t1 - t0) / 1000)) : 0;
  }

  render() {
    const mode = MODES[this.mode];
    const rows = agents().map((a) => {
      const t = this.totals[a.address];
      const name = a.tab_name && !/^\d+$/.test(a.tab_name) ? a.tab_name : a.program?.name ?? a.title;
      return { a, name, value: t ? mode.of(t) : 0, rate: this.rate(a.address) };
    }).sort((x, y) => y.value - x.value || x.a.address.localeCompare(y.a.address));
    const top = rows[0]?.value || 0;
    const sum = rows.reduce((n, r) => n + r.value, 0);

    const row = (r, i) => {
      const color = CLASS[hash(r.a.address) % CLASS.length];
      const pct = top ? Math.max(0, Math.min(100, (r.value / top) * 100)) : 0;
      const share = sum ? Math.round((r.value / sum) * 100) : 0;
      return div().id(`dm-${r.a.address}`).relative().h(19).flex_none().bg("#00000066").overflow_hidden()
        .on_mouse_down("left", stop)
        .on_click(() => run("agent.focus", { terminal: r.a.address }))
        .hover((el) => el.bg("#ffffff1a"))
        // the bar: class color, a lighter top half for the sheen, sliding when it grows
        .child(div().absolute().top(0).left(0).h_full().w(`${pct}%`).transition("width", 600)
          .bg(color).opacity(r.value ? 0.78 : 0)
          .child(div().absolute().top(0).left(0).w_full().h(8).bg("#ffffff2e"))
          .child(div().absolute().bottom(0).left(0).w_full().h(5).bg("#00000038")))
        .child(h_flex().absolute().top(0).left(0).size_full().px(3).gap(4).items_center()
          .child(art(tabIcon(r.a.tab)).w(15).h(15).flex_none())
          .child(div().flex_1().min_w(0).truncate().font_family(FONT).text_size(11.5)
            .text_color(C.white).child(`${i + 1}. ${r.name}`))
          .child(div().flex_none().font_family(FONT).text_size(11).text_color(r.value ? C.white : C.gray)
            .child(r.value ? `${short(r.value)} (${short(r.rate)}, ${share}%)` : "0")));
    };

    const header = h_flex().id("dm-title").h(20).flex_none().px(6).gap(6).items_center()
      .bg("#000000aa").border_b(1).border_color("#ffffff26")
      .on_mouse_down("left", stop)
      .on_click((_e, cx) => { this.mode = (this.mode + 1) % MODES.length; cx.notify(); })
      .hover((el) => el.bg("#1a1a1acc"))
      .child(div().flex_1().truncate().font_family(FONT).text_size(11.5).text_color(C.gold).child(mode.title))
      .child(div().flex_none().font_family(FONT).text_size(10.5).text_color(C.cream).child(`${short(sum)} · ${short(rows.reduce((n, r) => n + r.rate, 0))}/s`));

    const body = v_flex().size_full().p(7).gap(3)
      .child(header)
      .child(v_flex().id("dm-list").flex_1().min_h(0).overflow_y_scrollbar().gap(1)
        .children(rows.length ? rows.map(row)
          : [div().pt(6).px(4).font_family(FONT).text_size(11).text_color(C.gray).child("No combat data. Start an agent.")]));
    return div().id("meter").relative().size_full()
      .child(frame("meter-frame", body, { edge: "tip", size: 12, bg: "bg-dark", alpha: 0.82 }));
  }
}
