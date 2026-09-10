/**
 * Формирует сообщение об ошибке запроса к API платформы.
 * @param error Текст ошибки или объект Error (Request возвращает оба варианта)
 * @param path Имя класса/метода, из которого логируется ошибка
 * @param url URL запроса
 * @returns Готовое сообщение об ошибке с именем источника, URL и текстом ошибки
 */
export function getErrorMsg(error: Error | string, path: string, url: string | null): string {
    return `[${path}]: Произошла ошибка при отправке запроса "${url}"\nОшибка: ${error}`;
}

/**
 * Формирует сообщение об ошибке при отсутствии токена платформы.
 * @param platform Идентификатор платформы (например, константа T_VK)
 * @param methodName Имя метода, который попытался выполнить запрос без токена
 * @returns Сообщение об ошибке с подсказкой проверить конфигурацию приложения
 */
export function getErrorToken(platform: string, methodName: string): string {
    return `[${methodName}]: Не указан токен для платформы "${platform}". Убедитесь что приложение настроено корректно, и указаны все необходимые для работы токены.`;
}
