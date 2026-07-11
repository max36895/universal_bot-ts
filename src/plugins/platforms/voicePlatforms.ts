import { AppContext } from '../../index';
import { adapters } from './adapters';

/**
 * Регистрирует все доступные из коробки платформы в приложение.
 * Регистрирует только голосовые платформы(Алиса, Маруся и тд)
 *
 * @param appContext Контекст приложения
 *
 * @example
 * ```ts
 * import { Bot } from 'umbot';
 * import { voicePlatforms } from 'umbot/plugins';
 *
 * const bot = new Bot();
 * bot.use(voicePlatforms); // подключает Алису, Марусю, SmartApp
 * ```
 */
function voicePlatforms(appContext: AppContext): void {
    adapters.forEach((adapter) => {
        if (adapter.adapter.isVoice()) {
            const platformAdapter = new adapter.adapter();
            platformAdapter.init(appContext);
            appContext.platforms[platformAdapter.platformName] =
                platformAdapter as AppContext['platforms']['pl'];
        }
    });
}

voicePlatforms.isPlugin = true;
export { voicePlatforms };
