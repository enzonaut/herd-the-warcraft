// Warcraft: a World of Warcraft–style layout, drawn with textures and fonts
// extracted from the person's own WoW install (art/, fonts/). Personal use:
// don't publish this folder; Blizzard's art and Friz Quadrata aren't ours to share.
//
// One mod in roles; the layout gives each copy props { role }:
//   zone    top bar: the space as zone text, the tab as subzone, window buttons
//   quests  Quest Log: spaces as quests, the shown space's tabs as objectives
//   party   Party: agents as unit frames (health = status, mana = working)
//   bar     action bar with gryphons: tabs as action slots, micro menu, spaces as bags
//   pane    a pane's nameplate (the layout's pane header; also gets { pane, terminal })
//   copied  the "Copied to Clipboard" tooltip (a window overlay the zone bar opens)
//   meter   damage meter: tokens spent per agent, biggest spender on top (meter.py reads them)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Zone from "./zone.js";
import Quests from "./quests.js";
import Party from "./party.js";
import Bar from "./bar.js";
import Plate from "./plate.js";
import Copied from "./copied.js";
import Meter from "./meter.js";

const ROLES = { zone: Zone, quests: Quests, party: Party, bar: Bar, pane: Plate, copied: Copied, meter: Meter };

export default class Warcraft extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`warcraft: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
