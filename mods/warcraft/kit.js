// Warcraft's drawing kit: textures extracted from the person's own WoW install
// (art/), its fonts (fonts/), colors, frames and status words.
//
// GPUI images stretch, they don't tile, so tiles and border strips are
// pre-tiled long images that a parent crops (overflow_hidden).

import { div, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { run, spaces } from "herdr";
import { SPELLS } from "./spells.js";

export const ART = "mods/warcraft/art";
export const FONT = "Friz Quadrata TT";
export const TITLE = "Morpheus";

export const C = {
  gold: "#ffd100",
  white: "#ffffff",
  cream: "#f0e6d2",
  gray: "#9d9d9d",
  dim: "#6f6658",
  red: "#ff2020",
  green: "#1eff00",
  quest: "#40c040",
  yellow: "#ffff00",
  blue: "#3fa7ff",
  black: "#000000",
};

// Agent status as the game would say it: quest-log color, word, health and mana bars.
export const STATUS = {
  blocked: { color: C.red, word: "Needs you", health: "red", mana: null },
  working: { color: C.yellow, word: "In progress", health: "green", mana: "blue" },
  done: { color: C.quest, word: "Complete", health: "green", mana: "gold" },
  idle: { color: C.gray, word: "Idle", health: "gray", mana: "gray" },
};

export const art = (name) => image(`${ART}/${name}.png`);

// Backgrounds (art/loading/*.jpg): each space gets one at random, kept.
// Classic, The Burning Crusade and Wrath of the Lich King only: nothing from
// Cataclysm on. Loading screens from retail, each checked by the logo on it.
export const LOADING = [
  "ahnqiraj20man", "ahnqiraj40man", "arathibasin", "argentdungeon", "argentraid", "auchindoun",
  "azjolnerub76", "azjoluppercity", "blackfathomdeeps", "blackrockdepths", "blackrockspire", "blacktemple",
  "blackwinglair", "bladesedgearena", "cave", "cavernstime", "chamberblack", "championshall", "coilfang",
  "dalaranprison", "dalaransewersarena", "deadmines", "deathknight", "deepruntram", "diremaul",
  "draktharon", "dungeon", "easternkingdom", "enviroment", "gnomeregan", "gruulslair", "gundrak",
  "halloflegends", "hallsofreflection", "hellfirecitadel", "hellfirecitadel5man", "hellfirecitadelraid",
  "hyjal", "icecrown5man", "icecrowncitadel", "isleofconquest", "kalimdor", "karazhan", "malygos",
  "maraudon", "moltencore", "monastery", "nagrandarenabattlegrounds", "naxxramas", "netherbattlegrounds",
  "nexus70", "nexus80", "northrend", "northrend2", "oldstrathome", "orgrimmararena", "outland",
  "outland2", "pitofsaron", "pvpbattleground", "ragefirechasm", "raid", "razorfendowns", "razorfenkraul",
  "rubysanctum", "ruinedcity", "ruinsoflordaeronbattlegrounds", "scholomance", "shadowfangkeep",
  "stormwindstockade", "strathome", "sunkentemple", "sunwell", "sunwell5man", "tempestkeep", "uldaman",
  "ulduar77", "ulduar80", "ulduarraid", "utgarde", "utgardepinnecle", "wailingcaverns", "warsonggulch",
  "wintergrasp", "zulaman", "zulfarrak", "zulgurub",
];

/** A stable pseudo-random number for a string (FNV-1a). */
export function hash(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** A tab's spell icon (art/spells/): random per tab, the same every time and on every
 *  machine, and never shared with another tab in its space. The action bar slot, the
 *  pane nameplate and the party frame all show it, so they match. */
export function tabIcon(tabId) {
  const space = spaces().find((s) => s.tabs.some((t) => t.id === tabId));
  const taken = new Set();
  for (const t of space?.tabs ?? []) {
    let i = hash(t.id) % SPELLS.length;
    while (taken.has(i)) i = (i + 1) % SPELLS.length;
    taken.add(i);
    if (t.id === tabId) return `spells/${SPELLS[i]}`;
  }
  return `spells/${SPELLS[hash(tabId) % SPELLS.length]}`;
}

// Race portraits (art/portraits/<sex>-<race>.png): each agent gets one, picked by its address.
const RACES = [
  "human", "dwarf", "nightelf", "gnome", "draenei", "worgen", "pandaren", "orc", "scourge", "tauren",
  "troll", "bloodelf", "goblin", "voidelf", "lightforgeddraenei", "darkirondwarf", "kultiran", "mechagnome",
  "nightborne", "highmountaintauren", "magharorc", "zandalaritroll", "vulpera", "dracthyr",
];
export function portrait(seed) {
  const h = hash(seed);
  return `portraits/${h & 1 ? "female" : "male"}-${RACES[(h >>> 1) % RACES.length]}`;
}

/** A texture filling its (relative) parent, cropped instead of stretched.
 *  Repeated sideways so it covers any width (8192 px and up: 5K screens, zoom). */
export const tiled = (name, w, h) =>
  div().absolute().top(0).left(0).size_full().overflow_hidden()
    .child(h_flex().flex_none().children(Array.from({ length: Math.ceil(8192 / w) }, () => art(name).w(w).h(h).flex_none())));

/** WoW's backdrop: a tiled background inside a border made of 8 pieces.
 *  edge: "dlg" (stone), "gold", or "tip" (tooltip); size: the border's px. */
export function frame(id, content, { edge = "dlg", size = 16, bg = "bg-marble", inset, alpha = 1 } = {}) {
  const s = size, L = 2048 * (s / (edge === "tip" ? 16 : 32)), i = inset ?? Math.round(s / 3);
  const strip = (n) => art(`${edge}-${n}`);
  // alpha < 1 lets the layout's background (the loading screen) show through the fill;
  // the border stays solid.
  return div().id(id).relative().size_full()
    .child(div().absolute().top(i).left(i).right(i).bottom(i).opacity(alpha).child(tiled(bg, 1024, 2048)))
    .child(div().absolute().top(0).left(s).right(s).h(s).overflow_hidden().child(strip("t").w(L).h(s)))
    .child(div().absolute().bottom(0).left(s).right(s).h(s).overflow_hidden().child(strip("b").w(L).h(s)))
    .child(div().absolute().left(0).top(s).bottom(s).w(s).overflow_hidden().child(strip("l").w(s).h(L)))
    .child(div().absolute().right(0).top(s).bottom(s).w(s).overflow_hidden().child(strip("r").w(s).h(L)))
    .child(strip("tl").absolute().top(0).left(0).w(s).h(s))
    .child(strip("tr").absolute().top(0).right(0).w(s).h(s))
    .child(strip("bl").absolute().bottom(0).left(0).w(s).h(s))
    .child(strip("br").absolute().bottom(0).right(0).w(s).h(s))
    .child(div().absolute().top(0).left(0).size_full().child(content));
}

/** The stone title plate that sits on a frame's top edge. */
export function plate(text, w = 170, h = 40) {
  return div().relative().w(w).h(h).flex_none()
    .child(art("header").absolute().top(0).left(0).w(w).h(h))
    .child(div().absolute().top(0).left(0).size_full().flex().items_center().justify_center()
      .font_family(FONT).text_size(13).text_color(C.gold).child(text));
}

/** The red panel button ("Accept", "Abandon"). */
export function button(id, label, onClick, w = 104) {
  // The texture's button is its top-left 0.625 × 0.6875; the rest is padding.
  return div().id(id).relative().w(w).h(24).flex_none().overflow_hidden()
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click((_e, cx) => { cx.stop_propagation(); onClick(); })
    .child(art("button").absolute().top(0).left(0).w(w / 0.625).h(24 / 0.6875))
    .hover((s) => s.opacity(0.85))
    .child(div().absolute().top(0).left(0).size_full().flex().items_center().justify_center()
      .font_family(FONT).text_size(11.5).text_color(C.gold).child(label));
}

export const stop = (_e, cx) => cx.stop_propagation();

/** Small stone buttons for the window (Linux and Windows draw their own). */
export function windowButtons(w) {
  if (!w?.buttons) return null;
  const b = (id, label, cmd) => div().id(id).w(22).h(20).flex().items_center().justify_center()
    .rounded(3).border(1).border_color("#5a4a2a").bg("#1a140c").text_color(C.gold).text_size(12)
    .hover((s) => s.bg("#33281a")).on_mouse_down("left", stop).on_click(() => run(cmd)).child(label);
  return h_flex().gap(4).items_center()
    .child(b("w-min", "–", "window.minimize"))
    .child(b("w-max", w.maximized ? "❐" : "□", "window.maximize"))
    .child(div().id("w-close").w(22).h(22).on_mouse_down("left", stop).on_click(() => run("window.close"))
      .hover((s) => s.opacity(0.8)).child(art("close").w(22).h(22)));
}
