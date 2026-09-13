/**
 * Тесты разбора .env-файла (src/utils/EnvConfig.ts).
 *
 * Критичный кейс — значения, содержащие `#`: инлайн-комментарий должен
 * отсекаться только когда `#` начинается с пробела (конвенция dotenv),
 * иначе пароль вида `pass#word` молча обрезался до `pass`.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadEnvFile } from '../../src/utils/EnvConfig';

describe('EnvConfig: loadEnvFile', () => {
    let dir: string;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'umbot-env-'));
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    function writeEnv(content: string): string {
        const file = join(dir, '.env');
        writeFileSync(file, content, 'utf8');
        return file;
    }

    it('читает простые пары KEY=VALUE', () => {
        const res = loadEnvFile(writeEnv('TELEGRAM_TOKEN=abc\nDB_HOST=localhost'));
        expect(res.status).toBe(true);
        expect(res.data?.TELEGRAM_TOKEN).toBe('abc');
        expect(res.data?.DB_HOST).toBe('localhost');
    });

    it('сохраняет # внутри значения без пробела перед ним', () => {
        const res = loadEnvFile(writeEnv('DB_PASSWORD=pass#word'));
        expect(res.status).toBe(true);
        expect(res.data?.DB_PASSWORD).toBe('pass#word');
    });

    it('отсекает инлайн-комментарий после пробела', () => {
        const res = loadEnvFile(writeEnv('DB_HOST=localhost # сервер БД\nTOKEN=abc #comment'));
        expect(res.status).toBe(true);
        expect(res.data?.DB_HOST).toBe('localhost');
        expect(res.data?.TOKEN).toBe('abc');
    });

    it('сохраняет # внутри кавычек', () => {
        const res = loadEnvFile(writeEnv('DB_PASSWORD="pass # word #2"'));
        expect(res.status).toBe(true);
        expect(res.data?.DB_PASSWORD).toBe('pass # word #2');
    });

    it('поддерживает значение с несколькими знаками равенства', () => {
        const res = loadEnvFile(writeEnv('CONNECTION=Server=a;Port=5432;Mode=x'));
        expect(res.status).toBe(true);
        expect(res.data?.CONNECTION).toBe('Server=a;Port=5432;Mode=x');
    });

    it('игнорирует пустые строки и полнострочные комментарии', () => {
        const res = loadEnvFile(writeEnv('\n# комментарий\n\nKEY=value\n'));
        expect(res.status).toBe(true);
        expect(res.data?.KEY).toBe('value');
        expect(Object.keys(res.data ?? {}).length).toBe(1);
    });

    it('возвращает ошибку для несуществующего файла', () => {
        const res = loadEnvFile(join(dir, 'missing.env'));
        expect(res.status).toBe(false);
    });
});
