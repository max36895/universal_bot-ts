import { AlisaAdapter } from './Alisa/Adapter';
import { MarusiaAdapter } from './Marusia/Adapter';
import { VkAdapter } from './VK/Adapter';
import { MaxAdapter } from './Max/Adapter';
import { TelegramAdapter } from './Telegram/Adapter';
import { SmartAppAdapter } from './SmartApp/Adapter';
import { ViberAdapter } from './Viber/Adapter';

/**
 * Список всех доступных платформ из коробки.
 * Сам список со временем может дополняться другими платформами.
 *
 * Используется функциями fullPlatforms, botPlatforms, voicePlatforms для автоматической регистрации.
 *
 * @example
 * ```ts
 * import { adapters } from 'umbot/plugins';
 *
 * // Все 7 платформ: AlisaAdapter, MarusiaAdapter, SmartAppAdapter,
 * // VkAdapter, MaxAdapter, TelegramAdapter, ViberAdapter
 * console.log(adapters.length); // 7
 * ```
 */
export const adapters = [
    {
        adapter: AlisaAdapter,
    },
    {
        adapter: MarusiaAdapter,
    },
    {
        adapter: SmartAppAdapter,
    },
    {
        adapter: VkAdapter,
    },
    {
        adapter: MaxAdapter,
    },
    {
        adapter: TelegramAdapter,
    },
    {
        adapter: ViberAdapter,
    },
];
