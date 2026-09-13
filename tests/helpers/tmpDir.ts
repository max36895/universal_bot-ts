/**
 * Управление тестовыми папками для артефактов (FileAdapter-таблицы, логи,
 * файлы утилит) — единая точка для всех сьютов.
 *
 * Почему не os.tmpdir(): в недрах AppData/Local/Temp артефакты упавшего
 * прогона не найти. Все папки живут в tests/.tmp/<suite>-<suffix>/ —
 * внутри репозитория, с известным путём, и замьюканы в .gitignore.
 *
 * Почему не фиксированный путь на сьют (tests/.tmp/<suite>/): два параллельных
 * процесса Jest (watch в IDE + терминал, CI-матрица) роняли друг другу папки
 * через rmSync в beforeEach/afterEach — см. гонку isDirSync в util.test.ts.
 * Случайный суффикс даёт изоляцию per-запуск; префикс — имя суита, чтобы
 * после падения было понятно, чьи артефакты лежат в tests/.tmp.
 *
 * Отладка упавшего прогона: `UMBOT_TEST_KEEP=1` оставляет артефакты всех
 * сьютов, `UMBOT_TEST_KEEP=bot` — только сьютов с префиксом `bot-`
 * (см. basename в removeTestDir). Полная зачистка — npm run clean:tmp.
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/** Корень всех тестовых артефактов. */
const TMP_ROOT = join(__dirname, '..', '.tmp');

/**
 * Grace-период между двумя rmSync: хвост in-flight записи (tmp+rename в
 * saveData) завершается в ближайших микротасках после close() — за это время
 * он успевает пересоздать папку, и повторный rmSync её дочищает.
 */
const RECREATE_GRACE_MS = 50;

// mkdtempSync требует существующий родительский каталог — корень создаём сами
// при первом обращении (recursive: без него повторный вызов падал бы EEXIST).
mkdirSync(TMP_ROOT, { recursive: true });

/** Значение UMBOT_TEST_KEEP: '' — удалять; '1' — оставить всё; иначе — имя суита. */
const KEEP_RAW = process.env.UMBOT_TEST_KEEP ?? '';

/** Общий keep-режим: `UMBOT_TEST_KEEP=1` оставляет артефакты всех сьютов. */
const KEEP_ALL = KEEP_RAW === '1';

/**
 * Выборочный keep-режим: `UMBOT_TEST_KEEP=bot` оставляет артефакты только
 * сьютов с этим префиксом (папки `bot-*`), остальные удаляются как обычно.
 */
const KEEP_SUITE = KEEP_RAW !== '' && !KEEP_ALL ? KEEP_RAW : null;

/**
 * Создаёт уникальную папку для тестового артефакта.
 *
 * @param suite Имя суита для префикса папки (например, 'bot', 'filedb')
 * @returns Абсолютный путь созданной папки
 * @example
 * ```ts
 * import { createTestDir, removeTestDir } from '../helpers/tmpDir';
 *
 * const dir = createTestDir('bot');
 * bot.setAppConfig({ json: dir });
 * // ...
 * await removeTestDir(dir); // после await close() — иначе удалит недофлашенное
 * ```
 */
export function createTestDir(suite: string): string {
    return mkdtempSync(join(TMP_ROOT, `${suite}-`));
}

/**
 * Удаляет тестовую папку, если не включён keep-режим.
 *
 * Вызывать строго после await close()/destroy() инстансов, писавших в папку
 * (Bot, FileAdapter) — они снимают debounce-таймеры и дожидаются in-flight
 * записей. Но даже после корректного close остаётся узкое окно: последний
 * tmp+rename в saveData может завершиться чуть позже возврата из close
 * (Macrotask-очередь), и папка пересоздастся уже после удаления. Поэтому
 * после основного удаления проверяем папку ещё раз через короткий grace
 * и зачищаем пересозданную. Это не костыль против «живого» таймера — те
 * закрываются close/destroy; grace закрывает именно хвост in-flight записи.
 *
 * @param dir Папка, созданная createTestDir
 */
export async function removeTestDir(dir: string): Promise<void> {
    if (KEEP_ALL) {
        return;
    }
    if (KEEP_SUITE && basename(dir).startsWith(`${KEEP_SUITE}-`)) {
        return;
    }
    rmSync(dir, RM_OPTIONS);
    await sleep(RECREATE_GRACE_MS);
    // Папка пересоздана хвостом tmp+rename — зачищаем повторно.
    rmSync(dir, RM_OPTIONS);
}

/**
 * Опции удаления с повторами: на Windows только что записанный файл ещё
 * короткое время удерживается системой (индексатор, антивирус), и rmSync
 * может упасть с EPERM/EBUSY. Node повторяет удаление сам (maxRetries).
 */
const RM_OPTIONS = { recursive: true, force: true, maxRetries: 10, retryDelay: 50 } as const;
