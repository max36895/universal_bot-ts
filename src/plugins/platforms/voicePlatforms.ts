import { AppContext } from '../../index';
import { adapters } from './adapters';

/**
 * Регистрирует все доступные из коробки платформы в приложение.
 * Регистрирует только голосовые платформы(Алиса, Маруся и тд)
 * @param appContext Контекст приложения
 */
function voicePlatforms(appContext: AppContext): void {
    adapters.forEach((adapter) => {
        if (adapter.adapter.isVoice()) {
            const platformAdapter = new adapter.adapter();
            appContext.platforms[platformAdapter.platformName] = platformAdapter;
        }
    });
}

voicePlatforms.isPlugin = true;
export { voicePlatforms };
