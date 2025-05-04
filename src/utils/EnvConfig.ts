/**
 * Модуль для работы с конфигурацией окружения
 *
 * Предоставляет функционал для:
 * - Загрузки переменных окружения из файла .env
 * - Типизации конфигурационных параметров
 * - Управления токенами для различных платформ
 * - Настройки подключения к базе данных
 *
 * @module utils/EnvConfig
 */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Интерфейс конфигурации окружения
 * Определяет структуру переменных окружения для приложения
 *
 * @remarks
 * Все поля являются опциональными и могут быть определены в файле .env
 *
 * @example
 * ```typescript
 * // Пример файла .env
 * TELEGRAM_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
 * VK_TOKEN=vk1.a.1234567890abcdef
 * DB_HOST=localhost
 * DB_USER=root
 * DB_PASSWORD=secret
 * DB_NAME=myapp
 * ```
 */
export interface IEnvConfig {
    /**
     * Токен для Telegram Bot API
     * Используется для авторизации бота в Telegram
     *
     * @example
     * ```typescript
     * TELEGRAM_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
     * ```
     */
    TELEGRAM_TOKEN?: string;

    /**
     * Токен для VK API
     * Используется для авторизации в VK API
     *
     * @example
     * ```typescript
     * VK_TOKEN=vk1.a.1234567890abcdef
     * ```
     */
    VK_TOKEN?: string;

    /**
     * Токен подтверждения для VK Callback API
     * Используется для верификации запросов от VK
     *
     * @example
     * ```typescript
     * VK_CONFIRMATION_TOKEN=abcdef123456
     * ```
     */
    VK_CONFIRMATION_TOKEN?: string;

    /**
     * Токен для Viber API
     * Используется для авторизации в Viber API
     *
     * @example
     * ```typescript
     * VIBER_TOKEN=1234567890abcdef
     * ```
     */
    VIBER_TOKEN?: string;

    /**
     * Токен для Яндекс.Диалоги (Алиса)
     * Используется для авторизации в API Яндекс.Диалогов
     *
     * @example
     * ```typescript
     * YANDEX_TOKEN=1234567890abcdef
     * ```
     */
    YANDEX_TOKEN?: string;

    /**
     * Токен для Маруси
     * Используется для авторизации в API Маруси
     *
     * @example
     * ```typescript
     * MARUSIA_TOKEN=1234567890abcdef
     * ```
     */
    MARUSIA_TOKEN?: string;

    /**
     * Токен для Сбер SmartApp
     * Используется для авторизации в API Сбер SmartApp
     *
     * @example
     * ```typescript
     * SMARTAPP_TOKEN=1234567890abcdef
     * ```
     */
    SMARTAPP_TOKEN?: string;

    /**
     * Адрес сервера базы данных
     *
     * @remarks
     * Может быть указан как:
     * - localhost
     * - IP-адрес
     * - доменное имя
     *
     * @example
     * ```typescript
     * DB_HOST=localhost
     * DB_HOST=127.0.0.1
     * DB_HOST=db.example.com
     * ```
     */
    DB_HOST?: string;

    /**
     * Имя пользователя для подключения к базе данных
     *
     * @example
     * ```typescript
     * DB_USER=root
     * ```
     */
    DB_USER?: string;

    /**
     * Пароль для подключения к базе данных
     *
     * @remarks
     * Рекомендуется использовать сложные пароли
     * и хранить их в безопасном месте
     *
     * @example
     * ```typescript
     * DB_PASSWORD=my_secure_password
     * ```
     */
    DB_PASSWORD?: string;

    /**
     * Название базы данных
     *
     * @example
     * ```typescript
     * DB_NAME=myapp
     * ```
     */
    DB_NAME?: string;
}

/**
 * Загружает переменные окружения из файла .env
 *
 * @param {string} envPath - Путь к файлу .env
 * @returns {IEnvConfig} Объект с переменными окружения
 *
 * @remarks
 * Функция:
 * - Читает файл .env
 * - Парсит строки формата KEY=VALUE
 * - Игнорирует пустые строки и комментарии
 * - Удаляет кавычки из значений
 *
 * @example
 * ```typescript
 * // Загрузка конфигурации
 * const config = loadEnvFile('.env');
 *
 * // Использование значений
 * const telegramToken = config.TELEGRAM_TOKEN;
 * const dbHost = config.DB_HOST;
 * ```
 *
 * @throws {Error} Если файл не найден или не может быть прочитан
 */
export function loadEnvFile(envPath: string): IEnvConfig {
    try {
        const envContent = fs.readFileSync(path.resolve(envPath), 'utf-8');
        const envVars: IEnvConfig = {};

        envContent.split('\n').forEach((line) => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim();
                if (key && value) {
                    envVars[key.trim() as keyof IEnvConfig] = value.replace(/^["']|["']$/g, '');
                }
            }
        });

        return envVars;
    } catch (error) {
        console.error(`Error loading .env file: ${(error as Error)?.message || 'Unknown error'}`);
        return {};
    }
}
