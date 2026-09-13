/**
 * Диспетчер API-фасада платформы для `controller.api`.
 *
 * Собирает фасад по `controller.appType`, выбирая фабрику нужной платформы.
 * Сами фабрики живут в папках своих платформ (`Telegram/apiFacade.ts` и т.д.) —
 * сюда вынесен только выбор по типу приложения для ручного использования
 * (`import { makePlatformApi } from 'umbot/plugins'`).
 *
 * Ядро (`Bot.run`) фасад не собирает этим диспетчером: оно вызывает метод
 * адаптера `createApi(controller)` — контракт `IPlatformAdapter`. Каждая
 * платформа знает свой фасад сама, ядро остаётся платформо-независимым, и
 * кастомный адаптер подключает свой фасад простым переопределением метода.
 */

import type { BotController } from '../../../controller';
import type { IControllerApi, TApiMethod as TControllerApiMethod } from '../../../controller';
import { makeTelegramApi } from '../Telegram/apiFacade';
import { makeVkApi } from '../VK/apiFacade';
import { makeMaxApi } from '../Max/apiFacade';
import { makeViberApi } from '../Viber/apiFacade';

/**
 * Тип API-фасада: алиас канонического `IControllerApi` из controller.
 *
 * Контракт объявлен в одном месте (`src/controller/BotController.ts`) —
 * plugins импортирует его оттуда (направление зависимостей разрешает),
 * а переэкспорт из `umbot/plugins` сохраняет прежнее имя для потребителей.
 */
export type TApiFacade = IControllerApi;

/**
 * Методы, которые можно проверять через `api.can(...)`: алиас канонического
 * `TApiMethod` из controller (см. {@link TApiFacade}).
 */
export type TApiMethod = TControllerApiMethod;

/**
 * Собирает API-фасад для активной платформы контроллера.
 *
 * Для голосовых платформ (Алиса, Маруся, SmartApp) возвращает `null`: их
 * ответ формируется телом webhook, и исходящие API-вызовы там не применимы —
 * медиа отправляются через `controller.card` / `controller.sound`.
 *
 * @param controller Контроллер текущего запроса
 * @returns Фасад либо null на голосовых платформах/неизвестном типе
 */
export function makePlatformApi(controller: BotController): TApiFacade | null {
    switch (controller.appType) {
        case 'telegram':
            return makeTelegramApi(controller);
        case 'vk':
            return makeVkApi(controller);
        case 'max_app':
            return makeMaxApi(controller);
        case 'viber':
            return makeViberApi(controller);
        default:
            return null;
    }
}
