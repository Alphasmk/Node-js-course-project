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


async def create_section(session: aiohttp.ClientSession, base_url: str, title: str):
    payload = await request_json(
        session,
        'POST',
        f'{base_url}/api/admin/questions/sections',
        json={'title': title}
    )
    return payload['section']


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

    if not image_value.startswith('/theme-images/'):
        return image_value

    local_image_path = REPO_ROOT / 'frontend' / 'public' / image_value.lstrip('/')
    if not local_image_path.exists():
        print(f'  [warn] Missing local image file: {local_image_path}')

    return image_value


async def create_question(session: aiohttp.ClientSession, base_url: str, section_id: int, question_item, semaphore: asyncio.Semaphore):
    async with semaphore:
        answers, correct_index = build_answers(question_item)
        image_url = resolve_image_path(question_item)
        payload = aiohttp.FormData()

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

        if image_url:
            payload.add_field('imageUrl', image_url, content_type='text/plain; charset=utf-8')

        return await request_json(
            session,
            'POST',
            f'{base_url}/api/admin/questions',
            data=payload
        )


async def import_theme_file(session: aiohttp.ClientSession, base_url: str, theme_file: Path, section_map: dict[str, dict], semaphore: asyncio.Semaphore):
    raw_items = load_json_file(theme_file)
    if not isinstance(raw_items, list):
        raise ValueError(f'{theme_file.name} does not contain a question list')

    section_title = normalize_title(theme_file.stem)
    section = section_map.get(section_title)

    if section is None:
        print(f'[section] creating {section_title}')
        section = await create_section(session, base_url, section_title)
        section_map[section_title] = section
    else:
        print(f'[section] using {section_title} (id={section["id"]})')

    existing_questions = await fetch_section_questions(session, base_url, section['id'])
    existing_titles = {
        normalize_text(question.get('text', ''))
        for question in existing_questions
        if question.get('text')
    }

    created_count = 0
    skipped_count = 0

    for index, question_item in enumerate(raw_items, start=1):
        question_text = normalize_text(question_item.get('question', ''))
        if not question_text:
            print(f'  [skip] #{index}: empty question text')
            skipped_count += 1
            continue

        if question_text in existing_titles:
            print(f'  [skip] #{index}: already exists')
            skipped_count += 1
            continue

        try:
            await create_question(session, base_url, section['id'], question_item, semaphore)
            existing_titles.add(question_text)
            created_count += 1
            print(f'  [ok] #{index}: {question_text[:80]}')
        except Exception as error:
            print(f'  [fail] #{index}: {question_text[:80]} -> {error}')

    return created_count, skipped_count


async def main_async() -> int:
    parser = argparse.ArgumentParser(description='Import questions from themes_json into the running API')
    parser.add_argument('--base-url', default=DEFAULT_BASE_URL, help='API base URL')
    parser.add_argument('--username', default=DEFAULT_USERNAME, help='Admin username')
    parser.add_argument('--password', default=DEFAULT_PASSWORD, help='Admin password')
    parser.add_argument('--themes-dir', default=str(DEFAULT_THEMES_DIR), help='Directory with theme JSON files')
    parser.add_argument('--concurrency', type=int, default=DEFAULT_CONCURRENCY, help='Concurrent question requests')
    args = parser.parse_args()

    base_url = args.base_url.rstrip('/')
    themes_dir = Path(args.themes_dir)

    if not themes_dir.exists():
        raise FileNotFoundError(f'Themes directory not found: {themes_dir}')

    theme_files = sorted(themes_dir.glob('*.json'))
    if not theme_files:
        raise FileNotFoundError(f'No JSON files found in {themes_dir}')

    semaphore = asyncio.Semaphore(max(1, args.concurrency))

    async with aiohttp.ClientSession() as session:
        token = await login(session, base_url, args.username, args.password)
        session.headers.update({'Authorization': f'Bearer {token}'})

        sections = await fetch_admin_sections(session, base_url)
        section_map = {
            normalize_title(section.get('title', '')): section
            for section in sections
            if section.get('title')
        }

        total_created = 0
        total_skipped = 0

        for theme_file in theme_files:
            print(f'Processing {theme_file.name}')
            created_count, skipped_count = await import_theme_file(
                session,
                base_url,
                theme_file,
                section_map,
                semaphore
            )
            total_created += created_count
            total_skipped += skipped_count

        print(f'Done. Created: {total_created}, skipped: {total_skipped}')
        return 0


def main() -> None:
    raise SystemExit(asyncio.run(main_async()))


if __name__ == '__main__':
    main()