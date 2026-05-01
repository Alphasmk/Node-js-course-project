from __future__ import annotations

import json
import mimetypes
import re
import sys
import hashlib
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT_DIR = Path(__file__).resolve().parents[2]
THEMES_DIR = ROOT_DIR / 'themes_json'
PUBLIC_DIR = ROOT_DIR / 'frontend' / 'public'
OUTPUT_DIR = PUBLIC_DIR / 'theme-images'


def normalize_questions(payload: object) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    if isinstance(payload, dict):
        questions = payload.get('questions')
        if isinstance(questions, list):
            return [item for item in questions if isinstance(item, dict)]

    return []


def guess_extension(image_url: str, content_type: str | None = None) -> str:
    parsed_path = urlparse(image_url).path
    suffix = Path(parsed_path).suffix.lower()
    if suffix:
        return suffix

    if content_type:
        mime_type = content_type.split(';', 1)[0].strip().lower()
        guessed = mimetypes.guess_extension(mime_type)
        if guessed:
            return guessed

    return '.img'


def safe_slug(value: str, max_length: int = 80) -> str:
    slug = re.sub(r'[^0-9A-Za-zА-Яа-я_\-]+', '_', value.strip(), flags=re.UNICODE)
    slug = re.sub(r'_+', '_', slug).strip('_')
    if not slug:
        return 'image'
    return slug[:max_length]


def download_image(image_url: str, target_path: Path) -> Path:
    request = Request(
        image_url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python image downloader'
        }
    )

    with urlopen(request, timeout=30) as response:
        content_type = response.headers.get('Content-Type')
        data = response.read()

    if target_path.suffix == '.img':
        target_path = target_path.with_suffix(guess_extension(image_url, content_type))

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(data)
    return target_path


def local_image_url(local_path: Path) -> str:
    return '/' + local_path.relative_to(PUBLIC_DIR).as_posix()


def main() -> int:
    if not THEMES_DIR.exists():
        print(f'Не найдена директория с темами: {THEMES_DIR}', file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    downloaded = 0
    skipped = 0
    failed = 0
    json_files_updated = 0
    seen_urls: dict[str, Path] = {}

    for json_file in sorted(THEMES_DIR.glob('*.json')):
        theme_name = json_file.stem

        try:
            payload = json.loads(json_file.read_text(encoding='utf-8'))
        except Exception as error:
            print(f'[{json_file.name}] Не удалось прочитать JSON: {error}', file=sys.stderr)
            failed += 1
            continue

        questions = normalize_questions(payload)
        file_changed = False

        for question_index, question in enumerate(questions, start=1):
            image_value = question.get('image')
            if not isinstance(image_value, str) or not image_value.strip():
                continue

            image_value = image_value.strip()

            if image_value.startswith('/theme-images/'):
                continue

            theme_slug = safe_slug(theme_name, max_length=32)
            image_ext = Path(urlparse(image_value).path).suffix.lower() or guess_extension(image_value)
            short_hash = hashlib.sha1(image_value.encode('utf-8')).hexdigest()[:8]
            file_name = f'{theme_slug}_q{question_index:03d}_{short_hash}{image_ext}'

            if image_value in seen_urls:
                local_path = seen_urls[image_value]
                question['image'] = local_image_url(local_path)
                file_changed = True
                skipped += 1
                continue

            target_path = OUTPUT_DIR / file_name
            if target_path.exists():
                seen_urls[image_value] = target_path
                question['image'] = local_image_url(target_path)
                file_changed = True
                skipped += 1
                continue

            try:
                actual_path = download_image(image_value, target_path)
                seen_urls[image_value] = actual_path
                question['image'] = local_image_url(actual_path)
                file_changed = True
                downloaded += 1
                print(f'OK  {image_value} -> {actual_path.relative_to(ROOT_DIR)}')
            except Exception as error:
                failed += 1
                print(f'ERR {image_value}: {error}', file=sys.stderr)

        if file_changed:
            json_file.write_text(
                json.dumps(payload, ensure_ascii=False, indent=4),
                encoding='utf-8'
            )
            json_files_updated += 1

    print(
        f'Готово. Скачано: {downloaded}, пропущено: {skipped}, ошибок: {failed}. '
        f'Обновлено JSON-файлов: {json_files_updated}. '
        f'Картинки лежат в: {OUTPUT_DIR.relative_to(ROOT_DIR)}'
    )
    return 0 if failed == 0 else 2


if __name__ == '__main__':
    raise SystemExit(main())
