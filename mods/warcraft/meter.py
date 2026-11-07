#!/usr/bin/env python3
"""Token totals per herdr terminal, for the Warcraft damage meter (meter.js).

Claude Code keeps ~/.claude/sessions/<pid>.json for each running session; that
process's environment names its herdr terminal (HC_TERMINAL_ID). Its transcript
(~/.claude/projects/*/<sessionId>.jsonl, plus sub-agent transcripts under
<sessionId>/) carries each API message's usage. Only new bytes are read on each
run: offsets and totals live in ~/.cache/herdr-warcraft/meter.json. A terminal keeps
the totals of earlier sessions it ran (after /clear), so its count never drops.

Prints {"t14": {"input": n, "output": n, "cache_write": n, "cache_read": n}, ...}.
"""
import glob
import json
import os

HOME = os.path.expanduser("~")
CLAUDE = os.path.join(HOME, ".claude")
STATE = os.path.join(HOME, ".cache", "herdr-warcraft", "meter.json")
KEYS = ("input", "output", "cache_write", "cache_read")


def load_state():
    try:
        with open(STATE, encoding="utf-8") as f:
            s = json.load(f)
        if isinstance(s, dict) and isinstance(s.get("files"), dict) and isinstance(s.get("terminals"), dict):
            return s
    except Exception:
        pass
    return {"files": {}, "terminals": {}}


def save_state(s):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(s, f)
    os.replace(tmp, STATE)


def terminal_of(pid):
    try:
        with open(f"/proc/{pid}/environ", "rb") as f:
            for var in f.read().split(b"\0"):
                if var.startswith(b"HC_TERMINAL_ID="):
                    return var.split(b"=", 1)[1].decode() or None
    except Exception:
        pass
    return None


def usage_of(u):
    return {
        "input": int(u.get("input_tokens") or 0),
        "output": int(u.get("output_tokens") or 0),
        "cache_write": int(u.get("cache_creation_input_tokens") or 0),
        "cache_read": int(u.get("cache_read_input_tokens") or 0),
    }


def scan(path, rec):
    """Adds the usage in path's new complete lines to rec (offset, totals, last message)."""
    try:
        size = os.path.getsize(path)
    except OSError:
        return
    if size < rec["offset"]:  # rewritten: start over
        rec.update(offset=0, totals=dict.fromkeys(KEYS, 0), last_id=None, last=None)
    if size == rec["offset"]:
        return
    with open(path, "rb") as f:
        f.seek(rec["offset"])
        data = f.read()
    end = data.rfind(b"\n")
    if end < 0:
        return  # no complete line yet
    rec["offset"] += end + 1
    t = rec["totals"]
    for line in data[: end + 1].splitlines():
        if b'"usage"' not in line:
            continue
        try:
            msg = json.loads(line).get("message") or {}
        except Exception:
            continue
        u = msg.get("usage")
        if not isinstance(u, dict):
            continue
        cur = usage_of(u)
        mid = msg.get("id")
        # One message is written once per content block, each with its usage: count it once,
        # keeping the latest numbers.
        if mid and mid == rec["last_id"] and rec["last"]:
            for k in KEYS:
                t[k] -= rec["last"][k]
        for k in KEYS:
            t[k] += cur[k]
        rec["last_id"], rec["last"] = mid, cur


def transcripts(session_id):
    base = os.path.join(CLAUDE, "projects", "*")
    paths = glob.glob(os.path.join(base, f"{glob.escape(session_id)}.jsonl"))
    paths += glob.glob(os.path.join(base, glob.escape(session_id), "**", "*.jsonl"), recursive=True)
    return paths


def main():
    state = load_state()
    files, terms = state["files"], state["terminals"]
    for meta in glob.glob(os.path.join(CLAUDE, "sessions", "*.json")):
        try:
            with open(meta, encoding="utf-8") as f:
                info = json.load(f)
            pid, sid = int(info["pid"]), str(info["sessionId"])
        except Exception:
            continue
        if not os.path.exists(f"/proc/{pid}"):
            continue
        addr = terminal_of(pid)
        if not addr:
            continue
        sessions = terms.setdefault(addr, {"pid": pid, "sessions": []})
        if sessions.get("pid") != pid:  # the address now belongs to another process
            sessions = terms[addr] = {"pid": pid, "sessions": []}
        if sid not in sessions["sessions"]:
            sessions["sessions"].append(sid)
        for sess in sessions["sessions"]:
            for path in transcripts(sess):
                rec = files.setdefault(path, {"offset": 0, "totals": dict.fromkeys(KEYS, 0), "last_id": None, "last": None})
                scan(path, rec)

    out = {}
    for addr, info in terms.items():
        tot = dict.fromkeys(KEYS, 0)
        for sess in info["sessions"]:
            for path in transcripts(sess):
                rec = files.get(path)
                if rec:
                    for k in KEYS:
                        tot[k] += rec["totals"][k]
        out[addr] = tot
    # Forget processes that are gone and files no terminal points at.
    live = {a for a, i in terms.items() if os.path.exists(f"/proc/{i['pid']}")}
    state["terminals"] = {a: i for a, i in terms.items() if a in live}
    keep = {p for i in state["terminals"].values() for s in i["sessions"] for p in transcripts(s)}
    state["files"] = {p: r for p, r in files.items() if p in keep}
    save_state(state)
    print(json.dumps({a: t for a, t in out.items() if a in live}))


if __name__ == "__main__":
    main()
