export {
    BasePlatform as BasePlatformAdapter,
    type TContent,
    type IOptions as IAdapterOptions,
} from './platforms/Base/Base';

export * as pUtils from './platforms/Base/utils';

export { SmartAppAdapter } from './platforms/SmartApp/Adapter';
export * as SmartAppConstants from './platforms/SmartApp/constants';
export * from './platforms/SmartApp/interfaces/ISmartAppPlatform';
export * as SmartAppButton from './platforms/SmartApp/Button';
export * as SmartAppSound from './platforms/SmartApp/Sound';
export * as SmartAppCard from './platforms/SmartApp/Card';
export { T_SMART_APP } from './platforms/SmartApp/constants';

export { TelegramAdapter } from './platforms/Telegram/Adapter';
export * from './platforms/Telegram/interfaces/ITelegramPlatform';
export * as TelegramButton from './platforms/Telegram/Button';
export * as TelegramSound from './platforms/Telegram/Sound';
export * as TelegramCard from './platforms/Telegram/Card';
export { T_TELEGRAM } from './platforms/Telegram/constants';

export { MarusiaAdapter } from './platforms/Marusia/Adapter';
export * as MarusiaConstants from './platforms/Marusia/constants';
export * from './platforms/Marusia/interfaces/IMarusiaPlatform';
export * as MarusiaButton from './platforms/Marusia/Button';
export * as MarusiaSound from './platforms/Marusia/Sound';
export * as MarusiaCard from './platforms/Marusia/Card';
export { T_MARUSIA } from './platforms/Marusia/constants';

export { AlisaAdapter } from './platforms/Alisa/Adapter';
export * as AlisaConstants from './platforms/Alisa/constants';
export * from './platforms/Alisa/interfaces/IAlisaPlatform';
export * as AlisaButton from './platforms/Alisa/Button';
export * as AlisaSound from './platforms/Alisa/Sound';
export * as AlisaCard from './platforms/Alisa/Card';
export { T_ALISA } from './platforms/Alisa/constants';

export { ViberAdapter } from './platforms/Viber/Adapter';
export * from './platforms/Viber/interfaces/IViberPlatform';
export * as ViberButton from './platforms/Viber/Button';
export * as ViberSound from './platforms/Viber/Sound';
export * as ViberCard from './platforms/Viber/Card';
export { T_VIBER } from './platforms/Viber/constants';

export { MaxAdapter } from './platforms/Max/Adapter';
export * from './platforms/Max/interfaces/IMaxPlatform';
export * as MaxButton from './platforms/Max/Button';
export * as MaxSound from './platforms/Max/Sound';
export * as MaxCard from './platforms/Max/Card';
export { T_MAX_APP } from './platforms/Max/constants';

export { VkAdapter } from './platforms/VK/Adapter';
export * from './platforms/VK/interfaces/IVkPlatform';
export * as VkButton from './platforms/VK/Button';
export * as VkSound from './platforms/VK/Sound';
export * as VkCard from './platforms/VK/Card';
export { T_VK } from './platforms/VK/constants';

export * from './platforms/API/index';

export { voicePlatforms } from './platforms/voicePlatforms';
export { fullPlatforms } from './platforms/fullPlatforms';
export { botPlatforms } from './platforms/botPlatforms';
export { adapters } from './platforms/adapters';

export { MongoAdapter } from './db/Mongo/Adapter';
export { FileAdapter } from './db/File/Adapter';
export { Base as BaseDbAdapter } from './db/Base/Base';
