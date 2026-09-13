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
 * Стиль кнопки — основной (синий).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_PRIMARY = 'primary';

/**
 * Стиль кнопки — успешное действие (зелёный).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_SUCCESS = 'success';

/**
 * Стиль кнопки — опасное действие (красный).
 * Доступен для inline-кнопок и reply-кнопок в Telegram Bot API 9.4+.
 * Задаётся через `options.style` при добавлении кнопки (`addBtn`/`addLink`)
 * либо вручную при сборке клавиатуры через TelegramRequest.
 */
export const TG_STYLE_DANGER = 'danger';

/**
 * Допустимые значения `style` кнопок по Bot API: «danger», «success», «primary».
 * Любое другое значение Telegram отклоняет вместе со всем сообщением, поэтому
 * адаптер пропускает неизвестный стиль с предупреждением.
 */
export const TG_BUTTON_STYLES: readonly string[] = [
    TG_STYLE_PRIMARY,
    TG_STYLE_SUCCESS,
    TG_STYLE_DANGER,
];

/**
 * Максимальная длина callback_data в байтах для inline-кнопок Telegram Bot API.
 * Согласно документации: "Data associated with the callback button, 1-64 bytes".
 * Превышение этого лимита приводит к ошибке 400 Bad Request.
 */
export const TG_CALLBACK_DATA_MAX_LENGTH = 64;
