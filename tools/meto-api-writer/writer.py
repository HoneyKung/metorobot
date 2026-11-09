from __future__ import annotations

import argparse
import asyncio
import csv
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any


DEFAULT_MODEL = "claude-opus-5-5"
DEFAULT_EFFORT = "high"
DEFAULT_BUDGET = 3.0
CHEAPER_MODEL = "claude-sonnet-5-5"
OPENSCAD = Path(r"C:\Program Files\OpenSCAD\openscad.com")
USAGE_LOG = Path(__file__).resolve().parent / "usage-log.csv"
WRITE_TOOLS = ("Write", "Edit")
SHELL_METACHARS = (";", "&", "|", "`", "$(", ">", "<", "\n", "\r")


SYSTEM_PROMPT = r"""คุณเป็นผู้เขียนงานออกแบบ 3D ของหุ่น METO (ธีสิส Media Technology มจธ.) ทำตามใบสั่งงานที่ได้รับเท่านั้น
- เขียนไฟล์ได้เฉพาะในโฟลเดอร์ผลที่ระบุ ห้ามแก้ไฟล์อ้างอิงหรือไฟล์อื่น
- ใช้ OpenSCAD 2021.01 ตัวแปรขนาดทั้งหมดอยู่บนสุดของไฟล์ พร้อม comment ที่มา (เอกสาร/datasheet/STL เดิม) ค่าที่ตั้งเองเขียนว่า "ค่าเลือก"
- ห้ามแต่งตัวเลขที่ไม่มีที่มา ถ้าหาไม่ได้ให้ตั้งเป็นตัวแปรชัดเจนและระบุในรายงานว่าต้องวัด
- ชิ้นพิมพ์ PETG หัว 0.4 ชั้น 0.2 ต้องพิมพ์ได้โดยไม่ใช้ซัพพอร์ต (ผิวหันลง ≥45° หรือสะพานสั้น) และทุกส่วนต้องซ้อนทับกัน ห้ามแตะแค่ผิว
- ยึดอุปกรณ์ด้วยครีบบีบ/ขอเกี่ยว ไม่ใช้สกรู ยกเว้นใบสั่งระบุ
- ถ้าอนุญาตให้รัน OpenSCAD ให้ export STL ลงโฟลเดอร์ผลเท่านั้น ด้วยคำสั่งเดียวไม่ต่อท่อ
- เขียนรายงานภาษาไทยในโฟลเดอร์ผล: ตัวแปร ที่มา วิธีวางพิมพ์ จุดที่ต้องดูตอนลองใส่ และสิ่งที่ยังไม่แน่ใจ
"""


def _canonical_path(path: str | os.PathLike[str]) -> str:
    return os.path.normcase(os.path.realpath(os.path.abspath(os.fspath(path))))


def _inside(path: str | os.PathLike[str], folder: str | os.PathLike[str]) -> bool:
    child = _canonical_path(path)
    parent = _canonical_path(folder)
    return child == parent or child.startswith(parent.rstrip("\\/") + os.sep)


def _decision(input_data: dict[str, Any], allow: bool, reason: str) -> dict[str, Any]:
    return {
        "hookSpecificOutput": {
            "hookEventName": input_data.get("hook_event_name", "PreToolUse"),
            "permissionDecision": "allow" if allow else "deny",
            "permissionDecisionReason": reason,
        }
    }


def _openscad_command_ok(command: str, out_dir: str | os.PathLike[str]) -> bool:
    """Allow one OpenSCAD export whose -o target sits inside the output folder."""
    if any(mark in command for mark in SHELL_METACHARS):
        return False
    stripped = command.strip()
    exe_forms = (
        f'"{OPENSCAD}"',
        f'"{OPENSCAD.as_posix()}"',
        '"/c/Program Files/OpenSCAD/openscad.com"',
    )
    if not stripped.startswith(exe_forms):
        return False
    parts = stripped.split('"')
    # Quoted tokens alternate with unquoted text; find the token after -o.
    for index, chunk in enumerate(parts):
        if chunk.rstrip().endswith("-o") and index + 1 < len(parts):
            return _inside(parts[index + 1], out_dir)
    return False


def writer_hook(out_dir: str | os.PathLike[str], allow_openscad: bool):
    """Create an SDK PreToolUse callback limiting writes (and optional OpenSCAD runs) to out_dir."""

    async def guard(input_data: dict[str, Any], tool_use_id: str | None, context: Any) -> dict[str, Any]:
        del tool_use_id, context
        tool_name = input_data.get("tool_name")
        tool_input = input_data.get("tool_input") or {}
        if tool_name in WRITE_TOOLS:
            requested = tool_input.get("file_path")
            if requested and _inside(requested, out_dir):
                return _decision(input_data, True, "Path is inside the output folder.")
            return _decision(input_data, False, "Writes are restricted to the output folder.")
        if tool_name == "Bash":
            if allow_openscad and _openscad_command_ok(tool_input.get("command", ""), out_dir):
                return _decision(input_data, True, "Single OpenSCAD export into the output folder.")
            return _decision(input_data, False, "Only a single OpenSCAD export into the output folder is permitted.")
        return _decision(input_data, False, "Tool not permitted for the writer.")

    return guard


def _hook_allowed(result: dict[str, Any]) -> bool:
    return result.get("hookSpecificOutput", {}).get("permissionDecision") == "allow"


async def run_hook_self_test() -> bool:
    """Exercise the guard without importing or invoking the SDK."""
    here = Path(__file__).resolve().parent
    out_dir = here / "_hook-test-out"
    guard = writer_hook(out_dir, allow_openscad=True)

    async def check(tool: str, tool_input: dict[str, Any]) -> bool:
        return _hook_allowed(await guard(
            {"hook_event_name": "PreToolUse", "tool_name": tool, "tool_input": tool_input}, None, None))

    exe = f'"{OPENSCAD}"'
    cases = [
        (True, "Write", {"file_path": str(out_dir / "a.scad")}),
        (True, "Edit", {"file_path": str(out_dir / "sub" / "b.md")}),
        (False, "Write", {"file_path": str(here / "writer.py")}),
        (False, "Write", {"file_path": str(here / "_hook-test-out-evil" / "x.scad")}),
        (False, "NotebookEdit", {"file_path": str(out_dir / "c.ipynb")}),
        (True, "Bash", {"command": f'{exe} -o "{out_dir / "a.stl"}" "{out_dir / "a.scad"}"'}),
        (False, "Bash", {"command": f'{exe} -o "{here / "a.stl"}" "{out_dir / "a.scad"}"'}),
        (False, "Bash", {"command": f'{exe} -o "{out_dir / "a.stl"}" "{out_dir / "a.scad"}" && del x'}),
        (False, "Bash", {"command": 'rm -rf "' + str(out_dir) + '"'}),
    ]
    ok = True
    for expected, tool, tool_input in cases:
        if await check(tool, tool_input) != expected:
            ok = False
            print(f"  FAIL: {tool} {tool_input} expected {'allow' if expected else 'deny'}")
    no_scad = writer_hook(out_dir, allow_openscad=False)
    if _hook_allowed(await no_scad({"tool_name": "Bash", "tool_input": cases[5][2]}, None, None)):
        ok = False
        print("  FAIL: Bash allowed without --allow-openscad")
    return ok


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="เรียก Opus/Sonnet ผ่าน API เป็นผู้เขียนงานออกแบบ METO โดยเขียนได้เฉพาะโฟลเดอร์ผล",
    )
    parser.add_argument("--brief", type=Path, help="ใบสั่งงาน Markdown")
    parser.add_argument("--out-dir", type=Path, help="โฟลเดอร์ผล (ที่เดียวที่ SDK เขียนได้)")
    parser.add_argument("--cwd", type=Path, help="โฟลเดอร์งาน (ค่าเริ่ม = โฟลเดอร์ของใบสั่งงาน)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"โมเดล (ค่าเริ่ม {DEFAULT_MODEL}; ตัวเลือกประหยัด {CHEAPER_MODEL})")
    parser.add_argument("--effort", default=DEFAULT_EFFORT, choices=("low", "medium", "high", "xhigh", "max"), help=f"ระดับ effort (ค่าเริ่ม {DEFAULT_EFFORT})")
    parser.add_argument("--max-budget-usd", type=float, default=DEFAULT_BUDGET, help=f"งบสูงสุด USD ฝั่ง SDK (ค่าเริ่ม {DEFAULT_BUDGET})")
    parser.add_argument("--allow-openscad", action="store_true", help="อนุญาตให้รัน OpenSCAD export ลงโฟลเดอร์ผลได้")
    parser.add_argument("--fire", action="store_true", help="ยืนยันว่าเจ้าของพิมพ์ \"ยิง\" แล้ว (ไม่ใส่ = ไม่เรียก API)")
    parser.add_argument("--self-test-hooks", action="store_true", help="ทดสอบ hook แบบออฟไลน์ ไม่เรียก API")
    return parser


def _tokens(usage: dict[str, Any] | None, key: str) -> int:
    if not usage:
        return 0
    value = usage.get(key, 0)
    return int(value) if isinstance(value, (int, float)) else 0


def _append_usage(brief: Path, model: str, cost: float | None, input_tokens: int, output_tokens: int) -> None:
    exists = USAGE_LOG.exists() and USAGE_LOG.stat().st_size > 0
    with USAGE_LOG.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        if not exists:
            writer.writerow(["date", "brief", "model", "cost_usd", "input_tokens", "output_tokens"])
        writer.writerow([
            datetime.now().astimezone().isoformat(timespec="seconds"),
            str(brief),
            model,
            "" if cost is None else f"{cost:.8f}",
            input_tokens,
            output_tokens,
        ])


async def _run_writer(args: argparse.Namespace) -> int:
    if args.brief is None or args.out_dir is None:
        print("ต้องระบุ --brief และ --out-dir ครับ", file=sys.stderr)
        return 2
    brief_path = args.brief.expanduser().resolve()
    out_dir = args.out_dir.expanduser().resolve()
    cwd_path = (args.cwd or brief_path.parent).expanduser().resolve()
    if not brief_path.is_file():
        print(f"ไม่พบใบสั่งงาน: {brief_path}", file=sys.stderr)
        return 2
    if not cwd_path.is_dir():
        print(f"ไม่พบโฟลเดอร์งาน: {cwd_path}", file=sys.stderr)
        return 2
    if _inside(brief_path, out_dir):
        print("ใบสั่งงานต้องไม่อยู่ในโฟลเดอร์ผลครับ", file=sys.stderr)
        return 2
    if args.max_budget_usd <= 0:
        print("--max-budget-usd ต้องมากกว่า 0 ครับ", file=sys.stderr)
        return 2
    if not args.fire:
        print("ยังไม่ได้ใส่ --fire จึงไม่เรียก API ครับ (งานใช้เครดิตต้องรอเจ้าของพิมพ์ \"ยิง\" ก่อน)")
        return 0
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY จึงยังไม่เรียก API ครับ")
        print('ให้เจ้าของตั้ง key เองใน PowerShell: setx ANTHROPIC_API_KEY "ใส่คีย์ของคุณเอง"')
        return 0

    try:
        from claude_agent_sdk import ClaudeAgentOptions, HookMatcher, ResultMessage, query
    except ImportError:
        print("ไม่พบ claude-agent-sdk ใน Python ที่ใช้อยู่ครับ (ดู README.md)")
        return 2

    out_dir.mkdir(parents=True, exist_ok=True)
    brief_text = brief_path.read_text(encoding="utf-8-sig")
    tools = ["Read", "Grep", "Glob", "Write", "Edit"] + (["Bash"] if args.allow_openscad else [])
    prompt = (
        f"ทำงานตามใบสั่งต่อไปนี้ อ่านไฟล์อ้างอิงได้จาก {cwd_path} "
        f"เขียนไฟล์ผลทั้งหมดลงโฟลเดอร์นี้เท่านั้น: {out_dir}\n"
        + (f"รัน OpenSCAD ได้ด้วยคำสั่งเดียวรูปแบบ: \"{OPENSCAD}\" -o \"<ไฟล์ .stl ใน {out_dir}>\" -D ... \"<ไฟล์ .scad>\"\n"
           if args.allow_openscad else "ไม่มีสิทธิ์รันคำสั่งใด ๆ หัวงานจะ export STL เอง\n")
        + "\nใบสั่งงาน:\n" + brief_text
    )
    options = ClaudeAgentOptions(
        tools=tools,
        allowed_tools=["Read", "Grep", "Glob"],
        disallowed_tools=["NotebookEdit", "WebFetch", "WebSearch", "Task", "AskUserQuestion"]
        + ([] if args.allow_openscad else ["Bash"]),
        permission_mode="dontAsk",
        hooks={"PreToolUse": [HookMatcher(matcher="Write|Edit|NotebookEdit|Bash",
                                          hooks=[writer_hook(out_dir, args.allow_openscad)])]},
        system_prompt=SYSTEM_PROMPT,
        cwd=str(cwd_path),
        max_budget_usd=args.max_budget_usd,
        model=args.model,
        effort=args.effort,
        setting_sources=[],
        strict_mcp_config=True,
        mcp_servers={},
    )

    started = time.perf_counter()
    result_message = None
    try:
        async for message in query(prompt=prompt, options=options):
            if isinstance(message, ResultMessage):
                result_message = message
    except Exception as exc:
        print(f"เรียก Agent SDK ไม่สำเร็จ ({type(exc).__name__}); ไม่แสดงรายละเอียดข้อผิดพลาดเพื่อป้องกันข้อมูลลับ", file=sys.stderr)

    elapsed = time.perf_counter() - started
    if result_message is None:
        print(f"เวลา: {elapsed:.2f} วินาที; SDK ไม่ส่งข้อความสรุปผล จึงไม่มีข้อมูล cost/token ที่ยืนยันได้")
        return 1

    usage = result_message.usage or {}
    input_tokens = _tokens(usage, "input_tokens")
    output_tokens = _tokens(usage, "output_tokens")
    cost = result_message.total_cost_usd
    if (result_message.result or "").strip():
        (out_dir / "_คำตอบสุดท้าย.md").write_text(result_message.result.rstrip() + "\n", encoding="utf-8")

    _append_usage(brief_path, args.model, cost, input_tokens, output_tokens)
    print(f"ค่าใช้จ่ายโดยประมาณ: {'ไม่ระบุ' if cost is None else f'${cost:.6f} USD'}")
    print(f"Token เข้า/ออก: {input_tokens:,} / {output_tokens:,}")
    print(f"เวลา: {elapsed:.2f} วินาที (SDK duration {result_message.duration_ms} ms)")
    print(f"โฟลเดอร์ผล: {out_dir}")
    print(f"สถานะ SDK: {result_message.subtype}")
    return 0 if not result_message.is_error else 1


def main() -> int:
    args = build_parser().parse_args()
    if args.self_test_hooks:
        passed = asyncio.run(run_hook_self_test())
        print("HOOK SELF-TEST: PASS" if passed else "HOOK SELF-TEST: FAIL")
        return 0 if passed else 1
    return asyncio.run(_run_writer(args))


if __name__ == "__main__":
    raise SystemExit(main())
