/**
 * Тесты защиты файлового адаптера от зарезервированных ключей (__proto__ и др.).
 *
 * Запись и удаление уже были защищены #isForbiddenKey; чтение по первичному
 * ключу `__proto__` возвращало унаследованное Object.prototype как «найденную
 * запись», из-за чего пользователь с таким platform-id ошибочно считался
 * существующим, а его данные потом молча не сохранялись.
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppContext } from '../../src';
import { FileAdapter } from '../../src/plugins';
import { createTestDir, removeTestDir } from '../helpers/tmpDir';

describe('FileAdapter: защита от зарезервированных ключей в select', () => {
    let dir: string;
    let adapter: FileAdapter;

    beforeEach(() => {
        dir = createTestDir('filedb');
        writeFileSync(
            join(dir, 'UsersData.json'),
            JSON.stringify({ '123': { userId: '123', data: '{"score":1}' } }),
            'utf8',
        );
        const appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        appContext.appConfig.json = dir;
        adapter = new FileAdapter();
        adapter.init(appContext);
    });

    afterEach(async () => {
        // _insert ставит debounce-таймеры записи: без close они стреляют после
        // removeTestDir и пересоздают папку с пустой таблицей в tests/.tmp.
        await adapter.destroy();
        await removeTestDir(dir);
    });

    it('обычная выборка по первичному ключу работает', () => {
        const res = adapter._select(
            { tableName: 'UsersData', primaryKeyName: 'userId' },
            { userId: '123' },
            true,
        );
        expect(res.status).toBe(true);
        expect(res.data).toEqual({ userId: '123', data: '{"score":1}' });
    });

    it('выборка по ключу __proto__ не возвращает Object.prototype', () => {
        const res = adapter._select(
            { tableName: 'UsersData', primaryKeyName: 'userId' },
            { userId: '__proto__' },
            true,
        );
        // Раньше: content['__proto__'] === Object.prototype → status true
        expect(res.status).toBe(false);
    });

    it('выборка по ключу constructor не возвращает функцию-конструктор', () => {
        const res = adapter._select(
            { tableName: 'UsersData', primaryKeyName: 'userId' },
            { userId: 'constructor' },
            true,
        );
        expect(res.status).toBe(false);
    });

    it('зарезервированный ключ в не-первичном поле условия тоже отклоняется', () => {
        // JSON.parse создаёт собственное свойство __proto__ — реалистичный вектор,
        // т.к. payload платформы приходит именно через JSON.parse
        const where = JSON.parse('{"platform":"telegram","__proto__":{"polluted":true}}') as Record<
            string,
            unknown
        >;
        const res = adapter._select(
            { tableName: 'UsersData', primaryKeyName: 'userId' },
            where,
            false,
        );
        expect(res.status).toBe(false);
    });

    it('insert зарезервированного ключа по-прежнему блокируется', () => {
        const inserted = adapter._insert({
            tableName: 'UsersData',
            primaryKeyName: 'userId',
            data: { userId: '__proto__', data: '{}' },
        });
        expect(inserted).toBe(false);
    });
});
