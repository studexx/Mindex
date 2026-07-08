from __future__ import annotations

import re
import sys
from pathlib import Path


APP_DIR = Path(__file__).resolve().parents[1]
APP_JS = APP_DIR / "app.js"
STYLES_CSS = APP_DIR / "styles.css"

MAX_APP_JS_LINES = 20_000
MAX_STYLES_LINES = 6_500
MAX_FUNCTION_LINES = 450
MAX_FUNCTION_COUNT = 1_120
MAX_GLOBAL_COUPLING_MARKERS = 2_050

WATCHED_FUNCTION_LIMITS = {
    "handleDetailClick": 440,
    "bindStaticEvents": 310,
    "presenterElementSlideFromMemo": 200,
    "initPresenterOutput": 190,
    "buildPresenterSlidesForServiceItem": 150,
    "saveSongVersions": 140,
    "renderServiceDetail": 145,
}

GLOBAL_COUPLING_PATTERN = re.compile(
    r"\b(?:state|refs|client)\.|localStorage|BroadcastChannel|supabase|Supabase"
)
FUNCTION_PATTERN = re.compile(r"^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(")


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def find_functions(lines: list[str]) -> list[dict[str, int | str]]:
    functions: list[dict[str, int | str]] = []
    for index, line in enumerate(lines):
        match = FUNCTION_PATTERN.match(line)
        if not match:
            continue
        depth = 0
        started = False
        end = index
        for cursor in range(index, len(lines)):
            for char in lines[cursor]:
                if char == "{":
                    depth += 1
                    started = True
                elif char == "}":
                    depth -= 1
            if started and depth <= 0:
                end = cursor
                break
        functions.append(
            {
                "name": match.group(1),
                "start": index + 1,
                "end": end + 1,
                "size": end - index + 1,
            }
        )
    return functions


def count_matches(pattern: re.Pattern[str], lines: list[str]) -> int:
    return sum(len(pattern.findall(line)) for line in lines)


def main() -> int:
    failures: list[str] = []
    app_lines = read_lines(APP_JS)
    style_lines = read_lines(STYLES_CSS)
    functions = find_functions(app_lines)
    by_name = {str(function["name"]): function for function in functions}
    largest = sorted(functions, key=lambda function: int(function["size"]), reverse=True)[:12]
    global_coupling = count_matches(GLOBAL_COUPLING_PATTERN, app_lines)

    if len(app_lines) > MAX_APP_JS_LINES:
        failures.append(f"app.js lines {len(app_lines)} > {MAX_APP_JS_LINES}")
    if len(style_lines) > MAX_STYLES_LINES:
        failures.append(f"styles.css lines {len(style_lines)} > {MAX_STYLES_LINES}")
    if len(functions) > MAX_FUNCTION_COUNT:
        failures.append(f"function count {len(functions)} > {MAX_FUNCTION_COUNT}")
    if global_coupling > MAX_GLOBAL_COUPLING_MARKERS:
        failures.append(f"global coupling markers {global_coupling} > {MAX_GLOBAL_COUPLING_MARKERS}")

    for function in largest:
        if int(function["size"]) > MAX_FUNCTION_LINES:
            failures.append(
                f"{function['name']} length {function['size']} > {MAX_FUNCTION_LINES} "
                f"({function['start']}-{function['end']})"
            )

    for name, limit in WATCHED_FUNCTION_LIMITS.items():
        function = by_name.get(name)
        if not function:
            failures.append(f"watched function missing: {name}")
            continue
        if int(function["size"]) > limit:
            failures.append(
                f"{name} length {function['size']} > watched limit {limit} "
                f"({function['start']}-{function['end']})"
            )

    print("SOLID audit summary")
    print(f"- app.js lines: {len(app_lines)} / {MAX_APP_JS_LINES}")
    print(f"- styles.css lines: {len(style_lines)} / {MAX_STYLES_LINES}")
    print(f"- function count: {len(functions)} / {MAX_FUNCTION_COUNT}")
    print(f"- global coupling markers: {global_coupling} / {MAX_GLOBAL_COUPLING_MARKERS}")
    print("- largest functions:")
    for function in largest:
        print(
            f"  {function['size']:>4} lines  {function['name']} "
            f"({function['start']}-{function['end']})"
        )

    if failures:
        print("FAIL solid-audit")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("PASS solid-audit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
