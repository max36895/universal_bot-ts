/**
 * Тесты сохранности данных FileAdapter при завершении работы (close/destroy).
 *
 * Раньше close() форсил запись только при живых таймерах: если debounce-таймер
 * уже отработал, а асинхронная запись (tmp+rename) ещё была в полёте, graceful
 * shutdown убивал процесс до её завершения — последние изменения терялись.
 * Также повторный close() после сброса кэша мог перезаписать файл пустым объектом.
 */
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { AppContext } from '../../src';
import { FileAdapter } from '../../src/plugins';
import { createTestDir, removeTestDir } from '../helpers/tmpDir';

function readTable(dir: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(dir, 'UsersData.json'), 'utf8')) as Record<string, unknown>;
}

describe('FileAdapter: сохранность данных при close/destroy', () => {
    let dir: string;
    let appContext: AppContext;
    let adapter: FileAdapter;

    beforeEach(() => {
        dir = createTestDir('filedb-shutdown');
        writeFileSync(join(dir, 'UsersData.json'), JSON.stringify({}), 'utf8');
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.json = dir;
        adapter = new FileAdapter();
        adapter.init(appContext);
    });

    afterEach(async () => {
        // Тесты закрывают только UsersData, а init() предзагружает ещё
        // SoundTokens/ImageTokens: их debounce-таймеры переживают removeTestDir
        // и пересоздают папку с пустыми таблицами. destroy() чистит все.
        await adapter.destroy();
        await removeTestDir(dir);
    });

    it('close() сохраняет данные таблицы без живых таймеров', async () => {
        // Запись через _insert создаёт debounce-таймер 500 мс; close() обязан
        // форсить запись, а не проверять «есть ли таймер».
        adapter._insert({
            tableName: 'UsersData',
            primaryKeyName: 'userId',
            data: { userId: '42', score: 1 },
        });

        await adapter.close('UsersData');

        expect(readTable(dir)).toEqual({ '42': { userId: '42', score: 1 } });
    });

    it('destroy() сохраняет данные всех таблиц и дожидается in-flight записи', async () => {
        adapter._insert({
            tableName: 'UsersData',
            primaryKeyName: 'userId',
            data: { userId: '42', score: 1 },
        });
        // Убираем таймеры (эмулируем, что debounce сработал): осталась только
        // in-flight асинхронная запись. Раньше destroy() при отсутствии таймеров
        // не форсил сохранение. Важно: перед занулением снимаем таймеры через
        // clearTimeout — иначе они продолжают жить в очереди Node и стреляют
        // после removeTestDir, пересоздавая папку с пустой таблицей (fwrite
        // делает mkdir recursive) — в полном прогоне воркер Jest живёт и
        // после сьюта, и папка оставалась в tests/.tmp.
        const fileData = (
            adapter as unknown as {
                getCachedFileData: (t: string) => Record<string, unknown>;
            }
        ).getCachedFileData('UsersData');
        clearTimeout(fileData.timeOutId as ReturnType<typeof setTimeout> | null);
        clearTimeout(fileData.forceTimeOutId as ReturnType<typeof setTimeout> | null);
        fileData.timeOutId = null;
        fileData.forceTimeOutId = null;

        await adapter.destroy();

        expect(readTable(dir)).toEqual({ '42': { userId: '42', score: 1 } });
    });

    it('повторный close() не перезаписывает файл пустым объектом', async () => {
        adapter._insert({
            tableName: 'UsersData',
            primaryKeyName: 'userId',
            data: { userId: '42', score: 1 },
        });
        await adapter.close('UsersData');

        // Второй close: кэш сброшен, данных в памяти нет — запись «пустышки»
        // затёрла бы файл.
        await adapter.close('UsersData');

        expect(readTable(dir)).toEqual({ '42': { userId: '42', score: 1 } });
    });

    it('запись, начатая до close(), дожидается в destroy()', async () => {
        // _insert → #update(force=false) ставит lazy-таймер 500 мс.
        // destroy() чистит таймеры и пишет синхронно- awaited — данные должны
        // оказаться на диске.
        adapter._insert({
            tableName: 'UsersData',
            primaryKeyName: 'userId',
            data: { userId: '7', visits: 3 },
        });

        await adapter.destroy();

        expect(readTable(dir)).toEqual({ '7': { userId: '7', visits: 3 } });
    });

    it('финальная запись close() стартует только после завершения in-flight записи', async () => {
        // Две параллельные записи одного файла могут завершиться в обратном
        // порядке: старый снимок перезаписал бы итоговый при graceful shutdown.
        const events: string[] = [];
        let releaseFirst = (): void => {};
        let calls = 0;
        const realSave = appContext.saveFileData.bind(appContext);
        appContext.saveFileData = jest.fn((fileName: string, data: unknown) => {
            if (fileName !== 'UsersData.json') {
                return realSave(fileName, data);
            }
            const n = ++calls;
            events.push(`start-${n}`);
            if (n === 1) {
                return new Promise<boolean>((resolve) => {
                    releaseFirst = (): void => {
                        events.push('end-1');
                        resolve(true);
                    };
                });
            }
            events.push(`end-${n}`);
            return Promise.resolve(true);
        });

        jest.useFakeTimers();
        try {
            adapter._insert({
                tableName: 'UsersData',
                primaryKeyName: 'userId',
                data: { userId: '42', score: 1 },
            });
            // debounce-таймер срабатывает — запись уходит «в полёт».
            jest.advanceTimersByTime(1000);
        } finally {
            jest.useRealTimers();
        }
        expect(events).toEqual(['start-1']);

        const closing = adapter.close('UsersData');
        await new Promise((resolve) => setImmediate(resolve));
        // Пока первая запись не завершилась, финальная не начинается.
        expect(events).toEqual(['start-1']);

        releaseFirst();
        await closing;
        expect(events).toEqual(['start-1', 'end-1', 'start-2', 'end-2']);
    });
});

describe('FileAdapter: детекция многопроцессного доступа', () => {
    let dir: string;
    let appContext: AppContext;
    let adapter: FileAdapter;

    beforeEach(() => {
        dir = createTestDir('filedb-multiproc');
        writeFileSync(join(dir, 'UsersData.json'), JSON.stringify({}), 'utf8');
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.json = dir;
        adapter = new FileAdapter();
    });

    afterEach(async () => {
        // init() в теле теста ставит debounce-таймеры записи; без close они
        // стреляют уже после removeTestDir и пересоздают папку с пустой
        // таблицей (fwrite делает mkdir recursive). В изолированном прогоне
        // воркер Jest умирает раньше таймера, в полном — живёт, пока соседние
        // сьюты дорабатывают, и осиротевшая папка остаётся в tests/.tmp.
        await adapter.destroy();
        await removeTestDir(dir);
    });

    it('warn при файле, изменённом после запуска адаптера', () => {
        const logWarn = jest.fn();
        appContext.logWarn = logWarn;

        adapter.init(appContext);
        // Файл меняет «второй воркер»: mtime на 10 с новее старта адаптера —
        // за пределами grace-порога (5 с), который отсекает гранулярность ФС
        // и собственную запись таблиц при инициализации.
        const future = Date.now() + 10000;
        const filePath = join(dir, 'UsersData.json');
        writeFileSync(filePath, JSON.stringify({ evil: { userId: 'evil' } }));
        // Подменяем mtime на будущее — надёжнее реального ожидания
        const { utimesSync } = require('fs') as {
            utimesSync: (p: string, a: Date, m: Date) => void;
        };
        utimesSync(filePath, new Date(future), new Date(future));

        adapter.getFileData('UsersData');

        expect(logWarn).toHaveBeenCalledWith(
            expect.stringContaining('изменён после запуска FileAdapter'),
            expect.anything(),
        );
    });

    it('не warn для файла, созданного в момент инициализации (grace-порог)', () => {
        const logWarn = jest.fn();
        appContext.logWarn = logWarn;

        // Файл записан тестом ДО init(), но mtime в пределах grace-порога —
        // это нормальный сценарий старта приложения, а не второй воркер.
        adapter.init(appContext);

        adapter.getFileData('UsersData');

        expect(logWarn).not.toHaveBeenCalled();
    });
});
