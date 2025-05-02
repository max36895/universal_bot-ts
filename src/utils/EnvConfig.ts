import * as fs from 'fs';
import * as path from 'path';

/**
 * Интерфейс для конфигурации окружения
 */
export interface IEnvConfig {
    /**
     * Токен для Telegram
     */
    TELEGRAM_TOKEN?: string;
    /**
     * Токен для VK
     */
    VK_TOKEN?: string;
    /**
     * Токен подтверждения для VK
     */
    VK_CONFIRMATION_TOKEN?: string;
    /**
     * Токен для Viber
     */
    VIBER_TOKEN?: string;
    /**
     * Токен для Alisa
     */
    YANDEX_TOKEN?: string;
    /**
     * Токен для Marusia
     */
    MARUSIA_TOKEN?: string;
    /**
     * Токен для SmartApp
     */
    SMARTAPP_TOKEN?: string;

    /**
     * Адрес сервера базы данных
     * @remarks Например: localhost или IP-адрес
     */
    DB_HOST?: string;
    /**
     * Имя пользователя для подключения
     */
    DB_USER?: string;
    /**
     * Пароль для подключения
     */
    DB_PASSWORD?: string;
    /**
     * Название базы данных
     */
    DB_NAME?: string;
}

/**
 * Загрузка переменных окружения из файла .env
 * @param envPath - путь к файлу .env
 * @returns Возвращает объект с переменными окружения
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
