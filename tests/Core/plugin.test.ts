/**
 * Тесты хелпера createPlugin.
 *
 * Хелпер автоматически выставляет маркер `isPlugin = true`, чтобы функцию-плагин
 * нельзя было случайно зарегистрировать как middleware (забыв флаг вручную).
 */
import { Bot, createPlugin, AppContext } from '../../src';

describe('createPlugin', () => {
    it('выставляет флаг isPlugin = true', () => {
        const plugin = createPlugin(() => {});
        expect(plugin.isPlugin).toBe(true);
    });

    it('возвращает ту же функцию (не обёртку)', () => {
        const fn = (_ctx: AppContext, _bot: Bot): void => {};
        const plugin = createPlugin(fn);
        expect(plugin).toBe(fn);
    });

    it('bot.use() вызывает плагин сразу с (appContext, bot)', () => {
        const bot = new Bot();
        bot.setLogger({ error: () => {}, warn: () => {} });

        let calledWith: { ctx: AppContext; bot: Bot } | null = null;
        const plugin = createPlugin((appContext, botInstance) => {
            calledWith = { ctx: appContext, bot: botInstance };
        });

        bot.use(plugin);
        expect(calledWith).not.toBeNull();
        expect(calledWith?.ctx).toBe(bot.getAppContext());
        expect(calledWith?.bot).toBe(bot);
    });

    it('функция без createPlugin не вызывается при use() (становится middleware)', () => {
        const bot = new Bot();
        bot.setLogger({ error: () => {}, warn: () => {} });

        let called = false;
        // Обычная функция без флага isPlugin — трактуется как middleware
        // и НЕ вызывается на этапе bot.use(), а ждёт входящего запроса.
        bot.use(() => {
            called = true;
        });
        expect(called).toBe(false);
    });

    it('возвращаемая функция очистки сохраняется как плагин', () => {
        const bot = new Bot();
        bot.setLogger({ error: () => {}, warn: () => {} });

        let destroyed = false;
        const plugin = createPlugin(() => {
            return (): void => {
                destroyed = true;
            };
        });
        bot.use(plugin);
        // clearUse вызывает destroy у зарегистрированных плагинов-функций
        bot.clearUse();
        expect(destroyed).toBe(true);
    });
});
