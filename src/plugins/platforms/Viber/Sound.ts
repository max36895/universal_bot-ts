/**
 * Заглушка: в Bot API Viber нет типа аудиосообщения (медиа — только file/video
 * по URL), поэтому звуки не поддерживаются и метод всегда возвращает `null`.
 * Синхронный процессор — `await` не требуется.
 * @returns Всегда `null`: Viber не поддерживает аудиосообщения
 */
export function soundProcessing(): null {
    return null;
}
