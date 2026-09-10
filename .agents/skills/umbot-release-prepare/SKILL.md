---
name: umbot-release-prepare
description: Подготовка релиза umbot — sanity checks (build/test/prettier/lint), version bump, аудит CHANGELOG, npm pack, git tag. Используй при "готовлю релиз", "выпускаем версию", "bump version", "публикуем пакет" — до любых действий с версией.
---

# Release Prepare: скилл для подготовки umbot к релизу

## Назначение

Выполнить все необходимые проверки перед выпуском новой версии. Закрывает разрыв между "код готов" и "npm publish".

## Триггер

- "готовлю релиз"
- "выпускаем версию"
- "bump version"

## Воркфлоу (строго по шагам)

### Шаг 0: Спроси целевую версию

- `patch` — только баг-фиксы
- `minor` — новые фичи, BC сохранена
- `major` — breaking changes

(числа подставь из актуального `package.json`, не хардкодь)

### Шаг 1: Предрелизные проверки (sanity checks)

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

```bash
# package.json (+ package-lock.json автоматически)
npm version patch  # или minor / major
```

Проверь, что синхронизированы все места, где версия хранится отдельно (полный список, актуальность проверяй grep'ом — числа подставь из `package.json`):

- `cli/controllers/ConsoleController.js` — константа `VERSION` (её выводит `npx umbot -v`)
- `cli/umbot.js` — `@version` в JSDoc-шапке
- `cli/flowGenerator.js` — пин версии `umbot` в `dependencies` генерируемых from-flow проектов (функция `generatePackageJson`)
- `cli/template/package.json.text` — пин версии `umbot` в генерируемых проектах
- `src/` — погрепай `grep -rn "X\.Y\.Z" src/ cli/` на остальные хардкоды (в `src/` версии встречаются только в markdown-доках)

⚠️ Рассинхрон пинов в `cli/flowGenerator.js` / `cli/template/package.json.text` — самый продуктово-опасный: сгенерированные проекты падают на `npm install` с E404, если версия ещё не опубликована в npm.

Лучше в долгую — перевести `VERSION` на `require('../package.json').version`, чтобы не забылось (сейчас она строковая константа). Пути: для `cli/umbot.js` — `require('../package.json')`, для `cli/controllers/ConsoleController.js` — `require('../../package.json')` (своего `package.json` в `cli/` нет, корневой включается в pack).

### Шаг 3: Аудит CHANGELOG

Прочитай `CHANGELOG.md`. Убедись что:

1. Раздел `[Unreleased]` пуст ИЛИ имеет новую секцию с версией (например `[3.1.1] - 2026-09-10`).
2. Все исправленные баги зафиксированы в `Исправлено`.
3. Все новые фичи в `Добавлено`.
4. Все breaking changes: отдельная секция `### Миграция с X.Y.z` и ссылка «(См. «Миграция с X.Y.z»)» у соответствующих пунктов `Изменено` — это конвенция проекта; допустимо дополнительно помечать сами пункты `**[Breaking]**` для читаемости (Keep a Changelog требует, чтобы breaking было «painfully clear»).
5. Ссылки на опции/методы корректны (если изменили).
6. Дата секции — сегодняшняя (не будущая и не прошедшая).
7. Внизу файла добавлена compare-ссылка новой версии: `[3.1.1]: https://github.com/max36895/universal_bot-ts/compare/v3.1.0...v3.1.1` (формат ссылок — с `v`-префиксом; проверь, что теги из ссылки реально существуют в репо, иначе ссылка битая).

Секции в CHANGELOG этого проекта — русские (`Добавлено`/`Изменено`/`Исправлено`/`Безопасность`/`Обновлено`/`Миграция`/`Документация`), не Keep-a-Changelog-английские.

Если секции с версией нет — создай её:

```markdown
## [3.1.1] - 2026-09-10

### Добавлено

- ...

### Исправлено

- ...
```

### Шаг 4: Ревью диффа

```bash
# Что реально изменилось за релиз
git diff $(git describe --tags --abbrev=0)..HEAD --stat
```

⚠️ Нюанс: теги ставились не на все релизы — `git describe --tags --abbrev=0` вернёт последний существующий тег, и дифф может захватить больше одного релиза. Проверь `git tag` и при необходимости диффуй от последнего релизного коммита вручную.

Пройди по изменениям — ничего лишнего не уехало?

- Нет ли случайных `console.log` в src/
- Нет ли TODO которые нужно закрыть
- Нет ли временных debug-комментариев

### Шаг 5: Смоук-тест

Порядок важен: часть проверок возможна только ПОСЛЕ `npm publish` (сгенерированные проекты пинят конкретную версию umbot, и `npm install` в них падает с E404, пока версия не в реестре).

До publish:

1. Минимальный пример с Alisa из README/getting-started запускается локально
2. Пример с Telegram запускается локально
3. Проверь предыдущую версию в реестре: `npm view umbot version` — нет ли пропусков (например, публикуем 3.1.1, а 3.1.0 не публиковался — тогда нужно либо публиковать пропущенные версии, либо осознанно перепрыгнуть и зафиксировать это)

После publish (или из локального tarball: `npm i ../umbot-X.Y.Z.tgz`):

4. CLI: `npx umbot create test-bot && cd test-bot && npm install && npm run build` работает

Если чинил платформу — обязательно smoke-test для неё:

- Реальный webhook обрабатывается
- Ответы валидны (проверь в эталонном curl ответе, или сверяй JSON-schema)

### Шаг 6: Git tag + push

Тег должен совпадать с именем релизной ветки: ветка `v-3.1.1` → тег `v-3.1.1` (конвенция проекта; теги без `v-` из ранней истории и `vX.Y.Z` без дефиса не использовать).

```bash
git add -A
git commit -m "release: vX-Y-Z"
git tag -a "v-X.Y.Z" -m "Release v-X.Y.Z"
git push origin HEAD --tags
```

### Шаг 7: npm publish

```bash
# Локальная проверка что publish соберёт то, что надо
npm pack
tar tzf umbot-X.Y.Z.tgz | head -20  # состав пакета по files из package.json: dist + cli + package.json + README + LICENSE (src/ и docs/ в пакет НЕ входят)

# И потом:
npm publish
```

### Шаг 8: После релиза

- Обнови `README.md` (если версия там упоминается).
- Запиши release notes в GitHub `gh release create vX.Y.Z`.
- Обнови docs-сайт, если он отдельный.

## Анти-паттерны

❌ **НЕ** выпускай без прогона `npm run test` в чистом окружении.
❌ **НЕ** выпускай с uncommitted изменениями.
❌ **НЕ** делай major bump "потому что так захотелось" — только если есть breaking change.
❌ **НЕ** забудь про CHANGELOG.
❌ **НЕ** ставь версию вручную если есть `npm version` — она делает правильный git commit.

## Чек-лист (финальный перед `npm publish`)

- [ ] `npm run build` — clean
- [ ] `npm run test` — все пройдены
- [ ] `npm run prettier` — no diff
- [ ] `npm run lint` — 0 errors
- [ ] `git status` — чистая рабочая директория
- [ ] `CHANGELOG.md` обновлён, соответствует git log, дата секции — сегодняшняя, compare-ссылка добавлена
- [ ] `package.json` версия корректная
- [ ] Все хардкоды версии синхронизированы: `cli/controllers/ConsoleController.js` (`VERSION`), JSDoc-шапка `cli/umbot.js`, пины в `cli/flowGenerator.js` и `cli/template/package.json.text`
- [ ] `npm pack` показывает ожидаемый состав (dist, cli, README, LICENSE, package.json — по `files`)
- [ ] Предыдущая версия опубликована в npm, пропусков нет (`npm view umbot version`)
- [ ] git tag создан (формат — как имя релизной ветки: `v-X.Y.Z`) и запушен
- [ ] GitHub release notes написаны
