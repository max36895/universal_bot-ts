import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppContext } from '../../src';
import { createTestDir, removeTestDir } from '../helpers/tmpDir';

// Папка логов в tests/.tmp: фиксированный путь рядом со сьютом гонился при
// параллельных прогонах Jest и оставлял мусор в репо при падении до afterEach.
const LOG_DIR = createTestDir('appctx-logs');

afterEach(async () => {
    await removeTestDir(LOG_DIR);
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
