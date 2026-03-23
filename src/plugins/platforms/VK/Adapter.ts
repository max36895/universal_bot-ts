import { BotController, AppContext, Text } from '../../../index';
import { VkRequest, IVkParams } from '../API';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_VK } from './constants';
import { IVkRequestContent, IVkRequestObject, IVkCard } from './interfaces/IVkPlatform';

/**
 * Адаптер для создания ботов для мессенджера VK на TypeScript.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от мессенджера VK,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Алисы или Маруси).
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new VkAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * // Простейший навык, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { VkAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new VkAdapter('YOUR_VK_TOKEN', { vk_confirmation_token: 'YOUR_CONFIRMATION_TOKEN' }))
 *     .addCommand('start', ['привет'], (_text, ctx) => {
 *         ctx.text = 'Привет! Я твой первый бот для ВК';
 *     });
 *
 * bot.start('localhost', 3000);
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class VkAdapter extends BasePlatform<string | IVkRequestContent> {
    platformName = T_VK;
    isVoice = false;
    limit = 30;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
        if (this._platformOptions?.vk_confirmation_token) {
            appContext.appConfig.tokens[this.platformName].confirmation_token = this
                ._platformOptions.vk_confirmation_token as string;
        }
        if (this._platformOptions?.vk_api_version) {
            appContext.appConfig.tokens[this.platformName].api_version = this._platformOptions
                .vk_api_version as string;
        }
    }

    isPlatformOnQuery(query: IVkRequestContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-vk-signature']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`VkAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);

            return false;
        }
        return (
            query.type !== undefined &&
            query.group_id !== undefined &&
            (query.object !== undefined ||
                query.secret !== undefined ||
                query.type === 'confirmation')
        );
    }

    async setQueryData(query: IVkRequestContent, controller: BotController): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                controller.requestObject = query;
                switch (query.type) {
                    case 'confirmation':
                        controller.platformOptions.sendInInit = this._platformOptions
                            ?.vk_confirmation_token as string;
                        return true;

                    case 'message_new':
                        if (query.object !== undefined) {
                            const object: IVkRequestObject = query.object;
                            controller.userId = object.message.from_id;
                            controller.userCommand = object.message.text.toLowerCase().trim();
                            controller.originalUserCommand = object.message.text.trim();
                            controller.messageId = object.message.id;
                            controller.payload = object.message.payload || null;
                            const user = await new VkRequest(
                                this.appContext as AppContext,
                            ).usersGet(controller.userId);
                            if (user) {
                                const thisUser = {
                                    username: null,
                                    first_name: user.first_name || null,
                                    last_name: user.last_name || null,
                                };
                                controller.nlu.setNlu({ thisUser });
                            }
                            return true;
                        }
                        return false;

                    case 'message_event':
                        if (query.object?.payload) {
                            controller.userCommand =
                                typeof query.object.payload === 'string'
                                    ? query.object.payload
                                    : JSON.stringify(query.object.payload);
                            controller.userId = query.object.user_id as number;
                            controller.payload = query.object.payload;
                            controller.messageId = query.object.conversation_message_id || 0;
                            return true;
                        }
                        return false;

                    default:
                        controller.platformOptions.error =
                            'VkAdapter:setQueryData(): Некорректный тип данных!';
                        break;
                }
            } else {
                controller.platformOptions.error = `VkAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`VkAdapter.setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    async getContent(controller: BotController): Promise<string> {
        if (!controller.skipAutoReply) {
            const keyboard = controller.isButtonsInit()
                ? controller.buttons.getButtonJson(buttonProcessing)
                : null;
            const params: IVkParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (controller.isCardInit() && controller.card.images.length) {
                const attach = await controller.card.getCards(cardProcessing, controller);
                if ((attach as IVkCard).type === undefined) {
                    params.attachments = attach as string[];
                } else {
                    params.template = attach;
                }
            }
            if (controller.isSoundInit() && controller.sound.sounds.length) {
                const attach = await controller.sound.getSounds(
                    controller.tts,
                    soundProcessing,
                    controller,
                );
                params.attachments = { ...attach, ...params.attachments };
            }
            const vkApi = new VkRequest(this.appContext as AppContext);
            await vkApi.messagesSend(
                controller.userId as string,
                Text.resize(controller.text, 4096),
                params,
            );
        }
        return 'ok';
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            type: 'message_new',
            object: {
                message: {
                    from_id: +userId,
                    text: query,
                    id: count,
                },
            },
        };
    }
}
