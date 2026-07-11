import { AppContext } from '../../index';
import { adapters } from './adapters';

/**
 * Регистрирует все доступные из коробки платформы в приложение.
 * Регистрирует как голосовые платформы для создания навыков(Алиса, Маруся и тд), так и платформы для чат-ботов(ВК, Телеграм и тд)
 *
 * @param appContext Контекст приложения
 *
 * @example
 * ```ts
 * import { Bot } from 'umbot';
 * import { fullPlatforms } from 'umbot/plugins';
 *
 * const bot = new Bot();
 * bot.use(fullPlatforms); // подключает все 7 платформ
 * ```
 */
function fullPlatforms(appContext: AppContext): void {
    adapters.forEach((adapter) => {
        const platformAdapter = new adapter.adapter();
        platformAdapter.init(appContext);
        appContext.platforms[platformAdapter.platformName] =
            platformAdapter as AppContext['platforms']['pl'];
    });
}

fullPlatforms.isPlugin = true;
export { fullPlatforms };
