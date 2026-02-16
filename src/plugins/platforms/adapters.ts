import { Adapter as AlisaAdapter } from './Alisa/Adapter';
import { Adapter as MarusiaAdapter } from './Marusia/Adapter';
import { Adapter as VkAdapter } from './VK/Adapter';
import { Adapter as MaxAdapter } from './Max/Adapter';
import { Adapter as TelegramAdapter } from './Telegram/Adapter';
import { Adapter as SmartAppAdapter } from './SmartApp/Adapter';
import { Adapter as ViberAdapter } from './Viber/Adapter';

/**
 * Список всех доступных платформ из коробки.
 * Сам список со временем может дополняться другими платформами
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
