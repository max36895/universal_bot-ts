/**
 * Зачистка тестовых артефактов tests/.tmp/ (FileAdapter-таблицы, логи,
 * файлы утилит). Запуск: npm run clean:tmp.
 *
 * Обычно сьюты удаляют свои папки сами (removeTestDir в afterEach/afterAll);
 * здесь остаются артефакты падённых прогонов (до afterEach), запусков
 * с UMBOT_TEST_KEEP и отменённых Jest'ом сьютов.
 */
const { rmSync, existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const tmpRoot = join(__dirname, '..', 'tests', '.tmp');

if (!existsSync(tmpRoot)) {
    console.log('tests/.tmp не существует — чистить нечего.');
} else {
    const entries = readdirSync(tmpRoot);
    for (const entry of entries) {
        rmSync(join(tmpRoot, entry), { recursive: true, force: true });
    }
    console.log(`tests/.tmp очищен: удалено ${entries.length} папок.`);
}
