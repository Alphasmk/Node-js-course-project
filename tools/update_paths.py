#!/usr/bin/env python3

import argparse
import asyncio
import json
import os
import re
from pathlib import Path

import aiohttp

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:3001')
DEFAULT_USERNAME = os.environ.get('API_USERNAME', 'admin')
DEFAULT_PASSWORD = os.environ.get('API_PASSWORD', 'admin123')
DEFAULT_THEMES_DIR = Path(os.environ.get('THEMES_DIR', REPO_ROOT / 'themes_json'))
DEFAULT_CONCURRENCY = int(os.environ.get('IMPORT_CONCURRENCY', '6'))

def normalize_title(value: str) -> str:
    return re.sub(r'[\s_]+', ' ', str(value)).strip()

def normalize_text(value: str) -> str:
    return re.sub(r'\s+', ' ', str(value)).strip()

def load_json_file(path: Path):
    with path.open('r', encoding='utf-8') as file_handle:
        return json.load(file_handle)

async def request_json(session: aiohttp.ClientSession, method: str, url: str, **kwargs):
    async with session.request(method, url, **kwargs) as response:
        raw_text = await response.text()
        try:
            payload = json.loads(raw_text) if raw_text else {}
        except json.JSONDecodeError:
            payload = {'raw': raw_text}

        if response.status >= 400:
            message = payload.get('error') or payload.get('message') or raw_text or f'HTTP {response.status}'
            raise RuntimeError(f'{method} {url} failed: {message}')

        return payload

async def login(session: aiohttp.ClientSession, base_url: str, username: str, password: str) -> str:
    payload = await request_json(
        session,
        'POST',
        f'{base_url}/api/users/login',
        json={'username': username, 'password': password}
    )
    token = payload.get('token')
    if not token:
        raise RuntimeError('Login response does not contain a token')
    return token

async def fetch_admin_sections(session: aiohttp.ClientSession, base_url: str):
    payload = await request_json(session, 'GET', f'{base_url}/api/admin/questions/meta')
    return payload.get('sections') or []

async def fetch_section_questions(session: aiohttp.ClientSession, base_url: str, section_id: int):
    payload = await request_json(session, 'GET', f'{base_url}/api/catalog/sections/{section_id}/questions')
    return payload.get('questions') or []

def build_answers(question_item):
    answers = question_item.get('answers') or []
    cleaned_answers = []
    correct_index = None

    for answer_index, answer_item in enumerate(answers, start=1):
        answer_text = normalize_text(answer_item.get('text', ''))
        if not answer_text:
            continue

        cleaned_answers.append(answer_text)
        if answer_item.get('is_correct'):
            if correct_index is not None:
                raise ValueError('Multiple correct answers found')
            correct_index = len(cleaned_answers)

    if len(cleaned_answers) < 2 or len(cleaned_answers) > 6:
        raise ValueError('Questions must contain between 2 and 6 non-empty answers')
    if correct_index is None:
        raise ValueError('Correct answer was not marked in the source data')

    return cleaned_answers, correct_index

def resolve_image_path(question_item):
    image_value = question_item.get('image')
    if not image_value:
        return None

    image_value = str(image_value).strip()
    if not image_value:
        return None

    # Достаем только имя файла, отсекая всё, что до последнего слеша
    filename = image_value.split('/')[-1]

    # Проверяем наличие файла локально (для удобства отладки)
    local_image_path = REPO_ROOT / 'frontend' / 'public' / 'theme-images' / filename
    if not local_image_path.exists():
        print(f'  [warn] Missing local image file: {local_image_path}')

    # Возвращаем только имя файла: "Приложение2ч_3_q002_63b46446.gif"
    return filename

async def update_question(session: aiohttp.ClientSession, base_url: str, db_question_id: int, section_id: int, question_item, image_url: str, semaphore: asyncio.Semaphore):
    async with semaphore:
        answers, correct_index = build_answers(question_item)
        payload = aiohttp.FormData()

        # Бэкенд валидирует все эти поля при обновлении, поэтому отправляем их заново
        payload.add_field('sectionId', str(section_id), content_type='text/plain; charset=utf-8')
        payload.add_field('text', normalize_text(question_item.get('question', '')), content_type='text/plain; charset=utf-8')
        payload.add_field('answers', json.dumps(answers, ensure_ascii=False), content_type='text/plain; charset=utf-8')
        payload.add_field('correctAnswer', str(correct_index), content_type='text/plain; charset=utf-8')

        if question_item.get('url'):
            payload.add_field('url', normalize_text(question_item.get('url')), content_type='text/plain; charset=utf-8')
        if question_item.get('rule'):
            payload.add_field('ruleReference', normalize_text(question_item.get('rule')), content_type='text/plain; charset=utf-8')
        if question_item.get('explanation'):
            payload.add_field('explanation', normalize_text(question_item.get('explanation')), content_type='text/plain; charset=utf-8')
        
        # Самое главное - добавляем картинку
        payload.add_field('imageUrl', image_url, content_type='text/plain; charset=utf-8')

        # Делаем PUT запрос на обновление вопроса
        return await request_json(
            session,
            'PUT',
            f'{base_url}/api/admin/questions/{db_question_id}',
            data=payload
        )

async def process_theme_file(session: aiohttp.ClientSession, base_url: str, theme_file: Path, section_map: dict[str, dict], semaphore: asyncio.Semaphore):
    raw_items = load_json_file(theme_file)
    section_title = normalize_title(theme_file.stem)
    section = section_map.get(section_title)

    if not section:
        print(f'[skip] Section {section_title} not found in DB. Run import script first.')
        return 0, 0

    print(f'[section] scanning {section_title} (id={section["id"]})')

    existing_questions = await fetch_section_questions(session, base_url, section['id'])
    # Создаем словарь существующих вопросов: { "нормализованный текст": "ID в базе" }
    db_questions_map = {
        normalize_text(q.get('text', '')): q.get('id')
        for q in existing_questions
        if q.get('text') and q.get('id')
    }

    updated_count = 0
    skipped_count = 0

    for index, question_item in enumerate(raw_items, start=1):
        question_text = normalize_text(question_item.get('question', ''))
        
        if not question_text:
            continue

        image_url = resolve_image_path(question_item)
        if not image_url:
            # В JSON нет картинки, пропускаем
            skipped_count += 1
            continue

        db_question_id = db_questions_map.get(question_text)
        if not db_question_id:
            print(f'  [warn] #{index}: "{question_text[:50]}..." not found in DB, skipping')
            skipped_count += 1
            continue

        try:
            await update_question(session, base_url, db_question_id, section['id'], question_item, image_url, semaphore)
            updated_count += 1
            print(f'  [ok] #{index}: Added image to "{question_text[:60]}..."')
        except Exception as error:
            print(f'  [fail] #{index}: {question_text[:60]} -> {error}')

    return updated_count, skipped_count


async def main_async() -> int:
    parser = argparse.ArgumentParser(description='Update existing questions with image paths')
    parser.add_argument('--base-url', default=DEFAULT_BASE_URL, help='API base URL')
    parser.add_argument('--username', default=DEFAULT_USERNAME, help='Admin username')
    parser.add_argument('--password', default=DEFAULT_PASSWORD, help='Admin password')
    parser.add_argument('--themes-dir', default=str(DEFAULT_THEMES_DIR), help='Directory with theme JSON files')
    parser.add_argument('--concurrency', type=int, default=DEFAULT_CONCURRENCY, help='Concurrent requests')
    args = parser.parse_args()

    base_url = args.base_url.rstrip('/')
    themes_dir = Path(args.themes_dir)

    theme_files = sorted(themes_dir.glob('*.json'))
    semaphore = asyncio.Semaphore(max(1, args.concurrency))

    async with aiohttp.ClientSession() as session:
        token = await login(session, base_url, args.username, args.password)
        session.headers.update({'Authorization': f'Bearer {token}'})

        sections = await fetch_admin_sections(session, base_url)
        section_map = {
            normalize_title(section.get('title', '')): section
            for section in sections if section.get('title')
        }

        total_updated = 0
        total_skipped = 0

        for theme_file in theme_files:
            updated, skipped = await process_theme_file(session, base_url, theme_file, section_map, semaphore)
            total_updated += updated
            total_skipped += skipped

        print(f'\n--- Done! ---')
        print(f'Successfully updated: {total_updated} images')
        print(f'Skipped (no image in JSON or not in DB): {total_skipped}')
        return 0

def main() -> None:
    raise SystemExit(asyncio.run(main_async()))

if __name__ == '__main__':
    main()