/**
 * Идентификатор платформы Telegram (ключ в appConfig.tokens).
 */
export const T_TELEGRAM = 'telegram';

/**
 * Режим форматирования HTML.
 * Включается опцией `telegram_parse_mode: T_FORMAT_HTML` в настройках адаптера.
 * Текст НЕ экранируется автоматически — для пользовательского ввода используйте escapeHtml().
 * Разработчик отвечает за валидность HTML-тегов.
 */
export const T_FORMAT_HTML = 'HTML';

/**
 * Режим форматирования MarkdownV2.
 * Текст отправляется как есть (raw). Фреймворк НЕ экранирует спецсимволы.
 * Разработчик отвечает за валидность синтаксиса MarkdownV2.
 * Для безопасной вставки пользовательского ввода используйте escapeMarkdownV2().
 */
export const T_FORMAT_MARKDOWN = 'MarkdownV2';

/**
 * Стиль кнопки — акцентный (зелёный в тёмной теме).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_PRIMARY = 'primary';

/**
 * Стиль кнопки — вторичный (серый).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_SECONDARY = 'secondary';

/**
 * Стиль кнопки — деструктивный (красный).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_DESTRUCTIVE = 'destructive';

/**
 * Максимальная длина callback_data в байтах для inline-кнопок Telegram Bot API.
 * Согласно документации: "Data associated with the callback button, 1-64 bytes".
 * Превышение этого лимита приводит к ошибке 400 Bad Request.
 */
export const TG_CALLBACK_DATA_MAX_LENGTH = 64;
