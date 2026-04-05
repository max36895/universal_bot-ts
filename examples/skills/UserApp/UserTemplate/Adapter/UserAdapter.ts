import { BotController, AppContext, IDatabaseInfo } from 'umbot';
import { BasePlatformAdapter, TContent } from 'umbot/plugins';
import { buttonProcessing } from '../Components/UserButton';
import { cardProcessing } from '../Components/UserCard';

/**
 * Тело запроса
 */
interface IUserResponse {
    /**
     * Идентификатор пользователя
     */
    userId: string;
    /**
     * Информация о запросе пользователя
     */
    data: {
        /**
         * Сообщение пользователя
         */
        text: string;
        /**
         * Порядковый номер сообщения
         */
        messageCount: number;
    };
    /**
     * Локальное хранилище
     */
    store?: Record<string, unknown>;
}

/**
 * Пользовательский адаптер для платформы
 */
export class UserAdapter extends BasePlatformAdapter<IUserResponse> {
    /**
     * Имя платформы
     */
    platformName: string = 'my_platform';
    isVoice = false;

    /**
     * Инициализация адаптера.
     * Определять не обязательно. Стоит указывать в случаях, когда нужно выполнить доп логику, например указать токены или писать какую-то статистику по использованию.
     * @param appContext
     */
    init(appContext: AppContext<IDatabaseInfo>): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    /**
     * Возвращает демо результат запроса, который будет приходить от платформы
     * @param query Запрос пользователя
     * @param userId Идентификатор пользователя
     * @param count Порядковый номер запроса
     * @param state Данные из локального хранилища
     */
    getQueryExample(
        query: string,
        userId: string,
        count: number,
        state: Record<string, unknown> | string,
    ): Record<string, unknown> {
        return {
            userId,
            data: {
                text: query.toLowerCase(),
                messageCount: count,
            },
            store: state,
        };
    }

    /**
     * Возвращает признак того, соответствует ли запрос текущей платформе или нет
     * @param query
     * @param headers
     */
    isPlatformOnQuery(query: IUserResponse, headers?: Record<string, unknown>): boolean {
        console.log(query);
        return query.data?.messageCount !== undefined;
    }

    /**
     * Обработка полученного запроса. В данном методе необходимо настроить botController, необходимыми данными
     * @param query Запрос от платформы
     * @param controller Контроллер приложения
     */
    setQueryData(
        query: IUserResponse | string,
        controller: BotController,
    ): boolean | Promise<boolean> {
        if (this.appContext) {
            if (query) {
                let content: IUserResponse;
                if (typeof query === 'string') {
                    content = <IUserResponse>JSON.parse(query);
                } else {
                    content = query;
                }

                controller.requestObject = content;
                controller.userId = content.userId;
                controller.userCommand = content.data.text;
                controller.originalUserCommand = content.data.text;
                controller.messageId = content.data.messageCount;

                if (content.store) {
                    controller.state = content.store;
                }

                controller.isScreen = false;

                // Проверка на то, что пришел служебный запрос
                if (content.data.text === 'ping' && content.data.messageCount === -1) {
                    // Если отправлено служебное сообщение, то отправляем подготовленный шаблон
                    controller.platformOptions.sendInInit = {
                        text: 'pong',
                    };
                }

                return true;
            } else {
                controller.platformOptions.error = 'MyAdapter:init(): Отправлен пустой запрос!';
            }
        } else {
            console.error('Не указан контекст приложения!');
        }
        return false;
    }

    /**
     * Возвращает результат, который будет отправлен платформе.
     * @param controller
     */
    getContent(controller: BotController): TContent {
        return {
            text: controller.text,
            tts: controller.tts,
            buttons: controller.buttons.getButtons(buttonProcessing),
            card: controller.card.getCards(cardProcessing, controller),
            store: controller.userData,
        };
    }

    /**
     * Возвращает признак того, что платформа является чат ботом
     * @returns
     */
    static isVoice(): boolean {
        return false;
    }
}
