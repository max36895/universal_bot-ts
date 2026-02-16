import { BotController, AppContext, Text } from '../../../index';
import { VkRequest, IVkParams } from '../API';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_VK } from './constants';
import { IVkRequestContent, IVkRequestObject, IVkCard } from './interfaces/IVkPlatform';

/**
 * Адаптер для мессенджера Vk.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от VK.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new VkAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<string | IVkRequestContent> {
    platformName = T_VK;
    isVoice = false;

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

    isPlatformOnQuery(
        query: string | IVkRequestContent,
        headers?: Record<string, unknown>,
    ): boolean {
        if (headers?.['x-vk-signature']) {
            return true;
        }
        const body: IVkRequestContent = typeof query === 'string' ? JSON.parse(query) : query;
        if (!body) {
            this.appContext?.logWarn(`VkAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);

            return false;
        }
        return (
            typeof body.type !== 'undefined' &&
            typeof body.group_id !== 'undefined' &&
            (typeof body.object !== 'undefined' ||
                typeof body.secret !== 'undefined' ||
                body.type === 'confirmation')
        );
    }

    async setQueryData(
        query: string | IVkRequestContent,
        controller: BotController,
    ): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                let content: IVkRequestContent;
                if (typeof query === 'string') {
                    content = <IVkRequestContent>JSON.parse(query);
                } else {
                    content = query;
                }

                controller.requestObject = content;
                switch (content.type || null) {
                    case 'confirmation':
                        controller.platformOptions.sendInInit = this._platformOptions
                            ?.vk_confirmation_token as string;
                        return true;

                    case 'message_new':
                        if (typeof content.object !== 'undefined') {
                            const object: IVkRequestObject = content.object;
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
                        if (content.object?.payload) {
                            controller.userCommand =
                                typeof content.object.payload === 'string'
                                    ? content.object.payload
                                    : JSON.stringify(content.object.payload);
                            controller.userId = content.object.user_id as number;
                            controller.payload = content.object.payload;
                            controller.messageId = content.object.conversation_message_id || 0;
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
        if (controller.isSend) {
            const keyboard = controller.buttons.getButtonJson(buttonProcessing);
            const params: IVkParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (controller.card.images.length) {
                const attach = await controller.card.getCards(cardProcessing, controller);
                if (typeof (attach as IVkCard).type !== 'undefined') {
                    params.template = attach;
                } else {
                    params.attachments = attach as string[];
                }
            }
            if (controller.sound.sounds.length) {
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
