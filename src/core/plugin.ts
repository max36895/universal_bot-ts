/**
 * Хелпер для создания плагина-функции.
 *
 * Фреймворк отличает плагин-функцию от обычной middleware по флагу `isPlugin = true`.
 * Если разработчик забудет выставить флаг вручную, функция молча станет middleware,
 * что приводит к трудноуловимым ошибкам. Этот хелпер выставляет флаг автоматически,
 * поэтому забыть его невозможно.
 *
 * Все импорты здесь — только типы (`import type`), поэтому модуль не создаёт
 * циклических зависимостей на этапе выполнения.
 */
import type { AppContext } from './AppContext';
import type { Bot } from './Bot';
import type { IPluginFn, TPluginFnResult } from './interfaces/IBot';

/**
 * Оборачивает функцию в плагин, автоматически выставляя маркер `isPlugin = true`.
 *
 * Используйте вместо ручного присваивания `myPlugin.isPlugin = true`.
 *
 * @param fn Функция плагина. Получает `AppContext` и `Bot` при подключении через
 * `bot.use()`. Может вернуть функцию очистки, которая будет вызвана при уничтожении.
 * @returns Та же функция, но с выставленным флагом `isPlugin` и типом `IPluginFn`.
 *
 * @example
 * ```ts
 * import { Bot, createPlugin } from 'umbot';
 *
 * const myPlugin = createPlugin((appContext, bot) => {
 *     // Логика инициализации плагина
 *     return () => {
 *         // Логика очистки при уничтожении
 *     };
 * });
 *
 * const bot = new Bot();
 * bot.use(myPlugin); // подключится именно как плагин, а не middleware
 * ```
 */
export function createPlugin(fn: (appContext: AppContext, bot: Bot) => TPluginFnResult): IPluginFn {
    const plugin = fn as IPluginFn;
    plugin.isPlugin = true;
    return plugin;
}
