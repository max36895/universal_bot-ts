import { AppContext } from '../../index';
import { adapters } from './adapters';

/**
 * Регистрирует все доступные из коробки платформы в приложение.
 * Регистрирует только платформы для чат-ботов(ВК, Телеграм и тд)
 * @param appContext Контекст приложения
 */
function botPlatforms(appContext: AppContext): void {
    adapters.forEach((adapter) => {
        if (!adapter.adapter.isVoice()) {
            const platformAdapter = new adapter.adapter();
            appContext.platforms[platformAdapter.platformName] = platformAdapter;
        }
    });
}

botPlatforms.isPlugin = true;
export { botPlatforms };
