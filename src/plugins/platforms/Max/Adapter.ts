import { AppContext, BotController, Text } from '../../../index';
import { IMaxParams, MaxRequest } from '../API';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_MAX_APP } from './constants';
import { IMaxButtonObject, IMaxRequestContent } from './interfaces/IMaxPlatform';

/**
 * Адаптер для мессенджера MAX.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от MAX.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new MaxAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<string | IMaxRequestContent> {
    platformName = T_MAX_APP;
    isVoice = false;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(query: IMaxRequestContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['X-Max-Signature']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`MaxAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        return !!(query.update_type && query.message.body);
    }

    async setQueryData(query: IMaxRequestContent, controller: BotController): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                controller.requestObject = query;
                if (query.update_type === 'message_created') {
                    if (query.message !== undefined) {
                        const object: IMaxRequestContent['message'] = query.message;
                        controller.userId = object.sender.user_id;
                        controller.userCommand = object.body.text.toLowerCase().trim();
                        controller.originalUserCommand = object.body.text.trim();
                        controller.messageId = object.body.seq;
                        controller.payload = object.body.attachments || null;
                        const thisUser = {
                            username: object.sender.username,
                            first_name: object.sender.first_name || null,
                            last_name: object.sender.last_name || null,
                        };
                        controller.nlu.setNlu({ thisUser });
                        return true;
                    }
                    return false;
                } else {
                    controller.platformOptions.error =
                        'MaxAdapter:setQueryData(): Некорректный тип данных!';
                }
            } else {
                controller.platformOptions.error = `MaxAdapter:setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`MaxAdapter:setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    async getContent(controller: BotController): Promise<string> {
        if (controller.isSend) {
            const keyboard = controller.isButtonsInit()
                ? controller.buttons.getButtons<IMaxButtonObject>(buttonProcessing)
                : null;
            const params: IMaxParams = {};
            if (keyboard) {
                params.keyboard = keyboard;
            }
            if (controller.isCardInit() && controller.card.images.length) {
                params.attachments = await controller.card.getCards(cardProcessing, controller);
            }
            if (controller.isSoundInit() && controller.sound.sounds.length) {
                const attach = await controller.sound.getSounds(
                    controller.tts,
                    soundProcessing,
                    controller,
                );
                params.attachments = [...(attach || []), ...(params.attachments || [])];
            }
            const maxApi = new MaxRequest(controller.appContext);
            await maxApi.messagesSend(
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
            update_type: 'message_created',
            message: {
                sender: {
                    user_id: +userId,
                },
                body: {
                    text: query,
                    seq: count,
                    mid: '',
                },
            },
        };
    }
}
