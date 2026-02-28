import { AppContext, BotController } from '../../../index';
import { ViberRequest, IViberParams } from '../API';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_VIBER } from './constants';
import { IViberButtonObject, IViberContent } from './interfaces/IViberPlatform';

/**
 * Адаптер для мессенджера Viber.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от Viber.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new ViberAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<IViberContent | string> {
    platformName = T_VIBER;
    isVoice = false;
    limit = 30;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
        if (this._platformOptions?.viber_api_version) {
            appContext.appConfig.tokens[this.platformName].api_version = this._platformOptions
                .viber_api_version as string;
        }
        if (this._platformOptions?.viber_sender) {
            appContext.appConfig.tokens[this.platformName].sender = this._platformOptions
                .viber_sender as string;
        }
    }

    isPlatformOnQuery(query: IViberContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-viber-content-signature']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`ViberAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        return (
            query.event !== undefined &&
            query.timestamp !== undefined &&
            query.message_token !== undefined
        );
    }

    async setQueryData(query: IViberContent, controller: BotController): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                controller.requestObject = query;

                if (query.message) {
                    switch (query.event) {
                        case 'conversation_started':
                            if (query.user) {
                                controller.userId = query.user.id;

                                controller.userCommand = '';
                                controller.messageId = 0;

                                this.appContext.appConfig.tokens[this.platformName].api_version =
                                    (query.user.api_version || 2) as unknown as string;
                                this.setNlu(controller, query.sender.name || '');
                            }
                            return true;

                        case 'message':
                            controller.userId = query.sender.id;
                            controller.userCommand = query.message.text.toLowerCase().trim();
                            controller.originalUserCommand = query.message.text;
                            controller.messageId = query.message_token;

                            this.appContext.appConfig.tokens[this.platformName].api_version = (query
                                .sender.api_version || 2) as unknown as string;

                            this.setNlu(controller, query.sender.name || '');
                            return true;
                    }
                }
            } else {
                controller.platformOptions.error = `ViberAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`ViberAdapter.setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    async getContent(controller: BotController): Promise<string> {
        if (controller.isSend) {
            const viberApi = new ViberRequest(controller.appContext);
            const params: IViberParams = {};
            const keyboard = controller.isButtonsInit()
                ? controller.buttons.getButtons<IViberButtonObject>(buttonProcessing)
                : null;
            if (keyboard) {
                params.keyboard = keyboard;
                params.keyboard.Type = 'keyboard';
            }

            await viberApi.sendMessage(
                <string>controller.userId,
                controller.appContext.appConfig.tokens[this.platformName].sender,
                controller.text,
                params,
            );

            if (controller.isCardInit() && controller.card.images.length) {
                const res = controller.card.getCards(cardProcessing, controller);
                if (Array.isArray(res) && res.length) {
                    await viberApi.richMedia(<string>controller.userId, res);
                }
            }

            if (controller.isSoundInit() && controller.sound.sounds.length) {
                await controller.sound.getSounds(controller.tts, soundProcessing, controller);
            }
        }
        return 'ok';
    }

    /**
     * Заполняет данные о пользователе в NLU.
     * Разбивает полное имя на компоненты (username, first_name, last_name)
     * @param controller Контроллер приложения
     * @param userName Полное имя пользователя
     * @protected
     */
    protected setNlu(controller: BotController, userName: string): void {
        const name = userName.split(' ');
        const thisUser = {
            username: name[0] || null,
            first_name: name[1] || null,
            last_name: name[2] || null,
        };
        controller.nlu.setNlu({ thisUser });
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string): Record<string, unknown> {
        return {
            event: 'message',
            message: {
                text: query,
                type: 'text',
            },
            message_token: Date.now(),
            sender: {
                id: userId,
                name: 'local_name',
                api_version: 8,
            },
        };
    }
}
