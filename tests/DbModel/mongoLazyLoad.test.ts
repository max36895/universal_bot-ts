/**
 * Тест ленивой загрузки mongodb в MongoAdapter.
 *
 * `mongodb` — опциональная peer-зависимость: модуль подгружается динамически
 * только при вызове connect(). Если пакет не установлен, connect() должен
 * вернуть false и записать в лог понятную инструкцию по установке, а не
 * уронить процесс с MODULE_NOT_FOUND.
 *
 * jest.mock с кидающей фабрикой имитирует отсутствие пакета.
 */
jest.mock('mongodb', () => {
    throw new Error("Cannot find package 'mongodb'");
});

import { AppContext } from '../../src';
import { MongoAdapter } from '../../src/plugins';

describe('MongoAdapter без установленного mongodb', () => {
    it('connect() возвращает false и логирует инструкцию по установке', async () => {
        const appContext = new AppContext();
        appContext.setAppConfig({
            db: { host: 'mongodb://127.0.0.1:27017/', database: 'test' },
            tokens: {},
        });
        let loggedError: unknown = null;
        appContext.setLogger({
            error: (_msg: string, meta?: Record<string, unknown>) => {
                loggedError = meta?.error ?? null;
            },
            warn: () => {},
        });

        const adapter = new MongoAdapter();
        adapter.init(appContext);

        const result = await adapter.connect();
        expect(result).toBe(false);
        // meta.error может прийти как Error или как объект (зависит от среды),
        // поэтому проверяем текст сообщения, а не тип.
        const errMsg =
            loggedError instanceof Error
                ? loggedError.message
                : String((loggedError as { message?: string })?.message ?? loggedError);
        expect(errMsg).toContain('npm install mongodb');
    });

    it('импорт umbot/plugins не требует установленного mongodb', () => {
        // Если бы в шапке MongoAdapter был статический import mongodb,
        // сам факт успешного импорта в шапке этого файла был бы невозможен
        // при кидающей фабрике jest.mock. Проверяем, что класс доступен.
        expect(typeof MongoAdapter).toBe('function');
    });
});
