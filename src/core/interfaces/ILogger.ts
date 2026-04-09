/**
 * Тип метода для логирования
 */
export type TLoggerCb = (message: string, meta?: Record<string, unknown>) => void;

/**
 * Интерфейс для своей реализации логики логирования
 */
export interface ILogger {
    /**
     * Метод для логирования информации
     */
    log?: (...args: unknown[]) => void;
    /**
     * Метод для логирования ошибок
     * @param message
     * @param meta
     */
    error?: TLoggerCb;

    /**
     * Метод для логирования предупреждений
     * @param message
     * @param meta
     */
    warn?: TLoggerCb;

    /**
     * Метод для логирования метрик
     * @param name - имя метрики
     * @param value - значение метрики
     * @param labels - Дополнительная информация
     */
    metric?: (name: string, value: unknown, labels?: Record<string, unknown>) => void;

    /**
     * Включает или отключает автоматическую маскировку секретов (паролей, токенов,
     * ключей API и т.д.) во всех сообщениях лога.
     *
     * @default true (маскировка включена)
     *
     * @example
     * // Отключить маскировку (только для отладки!)
     * setLogger(customLogger, { maskSecrets: false });
     *
     * @remarks Устанавливайте `false` ТОЛЬКО в безопасных окружениях (локальная отладка,
     *          изолированный тестовый стенд). В production отключение маскировки
     *          может привести к утечке конфиденциальных данных в логи.
     */
    maskSecrets?: boolean;
}
