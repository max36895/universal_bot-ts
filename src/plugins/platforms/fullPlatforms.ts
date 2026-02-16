import { AppContext } from '../../index';
import { adapters } from './adapters';

/**
 * Регистрирует все доступные из коробки платформы в приложение.
 * Регистрирует как голосовые платформы(Алиса, Маруся и тд), так и платформы для чат-ботов(ВК, Телеграм и тд)
 * @param appContext Контекст приложения
 */
function fullPlatforms(appContext: AppContext): void {
    adapters.forEach((adapter) => {
        const platformAdapter = new adapter.adapter();
        platformAdapter.init(appContext);
        appContext.platforms[platformAdapter.platformName] = platformAdapter;
    });
}

fullPlatforms.isPlugin = true;
export { fullPlatforms };
