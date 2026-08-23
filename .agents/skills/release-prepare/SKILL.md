---
name: umbot-release-prepare
description: 'Подготовка umbot к релизу (3.0.15 -> 3.0.16 и т.д.)'
---

# Release Prepare: скилл для подготовки umbot к релизу

## Назначение

Выполнить все необходимые проверки перед выпуском новой версии. Закрывает gap между "код готов" и "npm publish".

## Триггер

- "готовлю релиз"
- "выпускаем версию"
- "bump version"

## Workflow (строго по шагам)

### Шаг 0: Спроси целевую версию

- `patch` (3.0.15 → 3.0.16) — только баг-фиксы
- `minor` (3.0.15 → 3.1.0) — новые фичи, BC сохранена
- `major` (3.0.15 → 4.0.0) — breaking changes

### Шаг 1: Sanity checks

```bash
# 0. Убедиться, что рабочая директория чистая (кроме той фичи, которую релизим)
git status

# 1. Убедиться, что мы на правильной ветке
git rev-parse --abbrev-ref HEAD

# 2. Чистая сборка
npm run build

# 3. Тесты
npm run test

# 4. Формат
npm run prettier

# 5. Линтер (0 ошибок)
npm run lint
```

Если хоть один шаг падает — **остановись**. Релизить нельзя с красным CI.

### Шаг 2: Version bump

Обнови версию в 3 местах:

```bash
# package.json
npm version patch  # или minor / major
```

Проверь, что:

- `package.json` version = новая
- `package-lock.json` изменился автоматически
- `cli/index.ts` (или константа версии в cli) — синхронизирована

Если в `cli/index.ts` или `cli/umbot.js` версия хранится отдельно — сделай её `require('../package.json').version`, чтобы не забылось.

### Шаг 3: CHANGELOG audit

Прочитай `CHANGELOG.md`. Убедись что:

1. Раздел `[Unreleased]` пуст ИЛИ имеет новую секцию с версией (например `[3.0.16] - 2026-08-08`).
2. Все исправленные баги зафиксированы в `Fixed`.
3. Все новые фичи в `Added`.
4. Все breaking changes в `Changed` с явной пометкой **[Breaking]**.
5. Ссылки на опции/методы корректны (если изменили).

Если секции с версией нет — создай её:

```markdown
## [3.0.16] - 2026-08-08

### Добавлено

- ...

### Исправлено

- ...
```

### Шаг 4: Diff review

```bash
# Что реально изменилось за релиз
git diff $(git describe --tags --abbrev=0)..HEAD --stat
```

Пройди по изменениям — ничего лишнего не уехало?

- Нет ли случайных `console.log` в src/
- Нет ли TODO которые нужно закрыть
- Нет ли временных debug-комментариев

### Шаг 5: Smoke test

Прогони примеры из README.md / getting-started.md:

1. Минимальный пример с Alisa запускается
2. Пример с Telegram запускается
3. CLI: `npx umbot create test-bot && cd test-bot && npm install && npm run build` работает

Если чинил платформу — обязательно smoke-test для неё:

- Реальный webhook обрабатывается
- Ответы валидны (проверь в эталонном curl ответе, или сверяй JSON-schema)

### Шаг 6: Git tag + push

```bash
git add -A
git commit -m "release: v3.0.16"
git tag -a "v3.0.16" -m "Release v3.0.16"
git push origin HEAD --tags
```

### Шаг 7: npm publish

```bash
# Локальная проверка что publish соберёт то, что надо
npm pack
tar tzf umbot-3.0.16.tgz | head -20  # проверь, что там исходники + dist + docs

# И потом:
npm publish
```

### Шаг 8: Post-release

- Обнови `README.md` (если версия там упоминается).
- Запиши release notes в GitHub `gh release create v3.0.16`.
- Обнови docs-сайт, если он отдельный.

## Anti-patterns

❌ **НЕ** выпускай без прогона `npm run test` в чистом окружении.
❌ **НЕ** выпускай с uncommitted изменениями.
❌ **НЕ** делай major bump "потому что так захотелось" — только если есть breaking change.
❌ **НЕ** забудь про CHANGELOG.
❌ **НЕ** ставь версию вручную если есть `npm version` — она делает правильный git commit.

## Sanity checklist (финалный перед `npm publish`)

- [ ] `npm run build` — clean
- [ ] `npm run test` — все пройдены
- [ ] `npm run prettier` — no diff
- [ ] `npm run lint` — 0 errors
- [ ] `git status` — чистая рабочая директория
- [ ] `CHANGELOG.md` обновлён и соответствует git log
- [ ] `package.json` версия корректная
- [ ] `cli/index.ts` или версия в CLI синхронизирована
- [ ] `npm pack` показывает ожидаемый состав (dist, README, LICENSE, package.json)
- [ ] git tag создан и запушен
- [ ] GitHub release notes написаны
