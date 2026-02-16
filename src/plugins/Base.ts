import { AppContext, IPlugin } from '../index';

/**
 * Базовый класс для реализации плагинов.
 * Все подключаемые плагины должны быть реализованы с его использованием, иначе в дальнейшем можно получить ошибки при работе.
 */
export abstract class BasePlugin implements IPlugin {
    /**
     * Метод инициализации плагина.
     * Вызывается один раз при подключении через `bot.use()`.
     * @param appContext Контекст приложения
     */
    abstract init(appContext: AppContext<unknown>): void;
}
