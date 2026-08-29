/**
 * Формирует сообщение об ошибке запроса к API платформы.
 * @param error Текст ошибки или объект Error (Request возвращает оба варианта)
 * @param path Имя класса/метода, из которого логируется ошибка
 * @param url URL запроса
 */
export function getErrorMsg(error: Error | string, path: string, url: string | null): string {
    return `[${path}]: Произошла ошибка при отправке запроса "${url}"\nОшибка: ${error}`;
}

export function getErrorToken(platform: string, methodName: string): string {
    return `[${methodName}]: Не указан токен для платформы "${platform}". Убедитесь что приложение настроено корректно, и указаны все необходимые для работы токены.`;
}
