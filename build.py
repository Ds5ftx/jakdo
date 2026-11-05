#!/usr/bin/env python3
"""src/ 의 모듈을 하나로 묶어 index.html(완결된 단일 페이지)을 만듭니다.
사용법:  python3 build.py
"""
from pathlib import Path
ROOT = Path(__file__).parent
ORDER = ["core.js", "render.js", "graph.js", "ui.js", "menus.js", "iter.js", "tools.js", "display.js", "pages.js", "examples.js"]

def main():
    js = "\n".join((ROOT / "src" / f).read_text(encoding="utf-8") for f in ORDER)
    shell = (ROOT / "src" / "shell.html").read_text(encoding="utf-8")
    cut = shell.index("</style>") + len("</style>")
    head, body = shell[:cut], shell[cut:].replace("/*JS*/", js)
    html = ("<!doctype html>\n<html lang=\"ko\">\n<head>\n<meta charset=\"utf-8\">\n"
            "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n"
            "<meta name=\"description\" content=\"웹 브라우저에서 쓰는 동적 기하 작도 앱\">\n"
            + head + "\n</head>\n<body>\n" + body.strip() + "\n</body>\n</html>\n")
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    print("index.html 생성:", len(html) // 1024, "KB")

if __name__ == "__main__":
    main()
