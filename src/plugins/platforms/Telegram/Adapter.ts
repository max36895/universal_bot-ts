import { AppContext, BotController, INluThisUser, Text } from '../../../index';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_TELEGRAM } from './constants';
import { ITelegramContent, ITelegramParams, ITelegramMedia } from './interfaces/ITelegramPlatform';
import { TelegramRequest } from '../API';

/**
 * Адаптер для мессенджера Telegram.
 *
 * Автоматически обрабатывает только те запросы, которые прошли проверку
 * через {@link isPlatformOnQuery} — т.е. действительно пришли от Telegram.
 * Не влияет на обработку запросов от других платформ.
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new TelegramAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 */
export class Adapter extends BasePlatform<string | ITelegramContent> {
    platformName = T_TELEGRAM;
    isVoice = false;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(
        query: string | ITelegramContent,
        headers?: Record<string, unknown>,
    ): boolean {
        if (headers?.['x-telegram-bot-api-secret-token']) {
            return true;
        }
        const body: ITelegramContent = typeof query === 'string' ? JSON.parse(query) : query;
        if (!body) {
            this.appContext?.logWarn(`TelegramAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        return !!(
            typeof body.update_id !== 'undefined' &&
            (body.message ||
                body.callback_query ||
                body.inline_query ||
                body.chosen_inline_result ||
                body.channel_post ||
                body.edited_message)
        );
    }

    async setQueryData(
        query: string | ITelegramContent,
        controller: BotController,
    ): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                let content: ITelegramContent;
                if (typeof query === 'string') {
                    content = <ITelegramContent>JSON.parse(query);
                } else {
                    content = query;
                }
                controller.requestObject = content;

                if (typeof content.message !== 'undefined') {
                    controller.userId = content.message.chat.id;
                    controller.userCommand = content.message.text.toLowerCase().trim();
                    controller.originalUserCommand = content.message.text;
                    controller.messageId = content.message.message_id;

                    const thisUser: INluThisUser = {
                        username: content.message.chat.username || null,
                        first_name: content.message.chat.first_name || null,
                        last_name: content.message.chat.last_name || null,
                    };
                    controller.nlu.setNlu({ thisUser });
                    return true;
                }
            } else {
                controller.platformOptions.error = `TelegramAdapter.setQueryData(): ${EMPTY_QUERY_ERROR}`;
            }
        } else {
            console.error(`TelegramAdapter.setQueryData(): ${EMPTY_CONTEXT_ERROR}`);
        }
        return false;
    }

    async getContent(controller: BotController): Promise<string> {
        if (controller.isSend) {
            const telegramApi = new TelegramRequest(controller.appContext);
            const params: ITelegramParams = {};
            const keyboard = controller.buttons.getButtonJson(buttonProcessing);
            if (keyboard) {
                params.reply_markup = keyboard;
            }
            params.parse_mode = 'markdown';

            await telegramApi.sendMessage(
                controller.userId as string,
                Text.resize(controller.text, 4096),
                params,
            );

            if (controller.card.images.length) {
                const res: ITelegramMedia[] | null = await controller.card.getCards(
                    cardProcessing,
                    controller,
                );
                if (res) {
                    await telegramApi.sendMediaGroup(controller.userId as string, res);
                }
            }

            if (controller.sound.sounds.length) {
                await controller.sound.getSounds(controller.tts, soundProcessing, controller);
            }
        }
        return 'ok';
    }

    static isVoice(): boolean {
        return false;
    }

    getQueryExample(query: string, userId: string, count: number): Record<string, unknown> {
        return {
            message: {
                chat: {
                    id: +userId,
                },
                text: query,
                message_id: count,
            },
        };
    }
}
