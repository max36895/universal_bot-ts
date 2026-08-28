import { IAppConfig } from 'umbot';
import { join } from 'node:path';

/**
 * Конфигурация демо-приложения.
 *
 * Демонстрирует:
 * - куда `FileAdapter` сохраняет данные пользователей (папка `data/`);
 * - куда пишутся логи ошибок (папка `logs/`).
 *
 * `userData` хранится в файловой БД одинаково для всех платформ — так демо
 * ведёт себя предсказуемо и в консоли, и в Telegram, и в Алисе.
 */
export default function appConfig(): IAppConfig {
    return {
        // Скрипты запускаются из dist/, поэтому от __dirname (dist/config)
        // поднимаемся к корню демо-проекта.
        json: join(__dirname, '..', '..', 'data'),
        error_log: join(__dirname, '..', '..', 'logs'),
        // isLocalStorage: true заставляет голосовые платформы (Алиса, Маруся,
        // SmartApp) хранить userData в их локальном хранилище, но тогда
        // чат-платформы перестают читать userData из БД. Для демо-кофейни,
        // которая одинаково работает всюду, оставляем файловую БД.
        // Вариант с локальным хранилищем показан в examples/skills/localStorage.
        isLocalStorage: false,
    };
}
