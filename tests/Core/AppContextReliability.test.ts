import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppContext } from '../../src';

const LOG_DIR = path.join(__dirname, '__app_context_logs__');

afterEach(() => {
    fs.rmSync(LOG_DIR, { recursive: true, force: true });
});

describe('AppContext: надёжность сохранения', () => {
    it('возвращает rejected promise для циклических данных', async () => {
        const appContext = new AppContext();
        const cyclic: Record<string, unknown> = {};
        cyclic.self = cyclic;

        await expect(appContext.saveFileData('cyclic.json', cyclic)).rejects.toThrow();
    });

    it('close дожидается записи буферизованного warning', async () => {
        const appContext = new AppContext();
        appContext.appMode = 'prod';
        appContext.appConfig.error_log = LOG_DIR;
        appContext.logWarn('сообщение перед закрытием');

        await appContext.close();

        expect(fs.readFileSync(path.join(LOG_DIR, 'warn.log'), 'utf8')).toContain(
            'сообщение перед закрытием',
        );
    });
});
