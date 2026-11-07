#!/bin/sh
# Copies the Warcraft layout, theme and mod into herdr-app's folder
# ($HERDR_APP_HOME, else ~/.config/herdr-app). Run it again after a pull.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
home=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
mkdir -p "$home/layouts" "$home/themes" "$home/mods"
cp "$here/layouts/warcraft.json" "$here/layouts/warcraft.png" "$home/layouts/"
cp "$here/themes/warcraft.json" "$home/themes/"
rm -rf "$home/mods/warcraft.new"
cp -R "$here/mods/warcraft" "$home/mods/warcraft.new"
rm -rf "$home/mods/warcraft"
mv "$home/mods/warcraft.new" "$home/mods/warcraft"
echo "Installed into $home"
echo "Restart Herdr once (loads the fonts), then pick Warcraft with Ctrl+Shift+L or in Settings."
