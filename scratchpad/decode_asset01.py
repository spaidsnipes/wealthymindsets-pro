import base64
import json

SRC = (
    "/Users/dspaidnoosleep/.claude/projects/-Users-dspaidnoosleep/"
    "90a67066-f323-4b3d-b1af-40141c120288/tool-results/"
    "mcp-1eb995fc-ac5b-4f03-8f3d-242496e16329-download_file_content-1789760433726.txt"
)
DEST = "/tmp/asset01.jpeg"

with open(SRC) as fh:
    doc = json.load(fh)

with open(DEST, "wb") as fh:
    fh.write(base64.b64decode(doc["content"]))

print(doc["title"], "->", DEST)
