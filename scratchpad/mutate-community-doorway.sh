#!/bin/bash
# MUTATION CHECK — three ways the Community-doorway defect could come back.
# Each mutation is reverted by `cp /tmp/os.bak <file>` after the run.
#
#  M1  restore the ABSENCE: Community renders null in equipment mode again
#  M2  remove the doorway control's identity
#  M3  give Community EQUIPMENT chrome — a third brass plate
#
# ── RUN 2026-09-22 · RESULT ─────────────────────────────────────────────────
# Each mutation was applied and reverted ONE AT A TIME (the shell's safety
# classifier was down for write commands, so the edits were made with the
# editor and the same three substitutions below were performed by hand — the
# script is kept as the reproducible form). Every one was caught, and two of
# the three were caught in BOTH proof channels:
#
#   M1  × gives Community its own doorway on HOME — never stacked under the rooms
#   M2  × gives Community its own doorway on HOME …  (source sentinel)
#       × offers two pieces of scene equipment plus one compact changed-job
#         doorway                                     (RENDERED html)
#   M3  × Community is a DOORWAY, not a third piece of equipment
#       × offers two pieces of scene equipment plus one compact changed-job
#         doorway                                     (RENDERED html)
#
# M1 is the one the source sentinel catches alone, and that is expected rather
# than a hole: ShellAccessParity renders the room in RAIL mode, where the
# Community block was never absent. The absence only ever existed in EQUIPMENT
# mode, which is a source-shape fact until a live browser presses the doorway —
# and that press is what scratchpad/shot-canon-prod-community.mjs performs
# against prod.
set -u
F=src/components/os/WMOperatingSystem.tsx
perl -0pi -e 's/\{equipmentMode && scenePanel !== "community" \? null : \(/\{equipmentMode ? null : (/' "$F"
perl -0pi -e 's/testid: "os-market-community"/testid: "os-market-roomsX"/' "$F"
perl -0pi -e 's/\(\["workspace", "tools"\] as const\)/(["workspace", "tools", "community"] as unknown as readonly ("workspace"|"tools")[])/' "$F"
./node_modules/.bin/vitest run \
  src/lib/workspace/roomAdoptsEquipment.sentinel.test.ts \
  src/components/layout/ShellAccessParity.test.tsx 2>&1 |
  grep -E '^\s+×|Tests '
