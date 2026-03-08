import { AppContext, BotController, INluThisUser, Text } from '../../../index';
import { BasePlatform, EMPTY_CONTEXT_ERROR, EMPTY_QUERY_ERROR } from '../Base/Base';
import { buttonProcessing } from './Button';
import { cardProcessing } from './Card';
import { soundProcessing } from './Sound';
import { T_TELEGRAM } from './constants';
import { ITelegramContent, ITelegramParams, ITelegramMedia } from './interfaces/ITelegramPlatform';
import { TelegramRequest } from '../API';

/**
 * Адаптер для создания ботов для мессенджера Telegram на TypeScript.
 *
 * Этот адаптер автоматически обрабатывает входящие webhook`и от мессенджера Telegram,
 * преобразует их в унифицированный формат фреймворка и формирует ответ,
 * совместимый с требованиями платформы. Подключается одной строкой и
 * не мешает работе других адаптеров (например, для Алисы или Маруси).
 *
 * Поддерживает:
 * - голосовые и текстовые запросы;
 * - карточки, кнопки;
 *
 * Подключается как любой другой адаптер: `bot.use(new TelegramAdapter(token))`.
 * Несколько адаптеров могут работать одновременно — система сама выберет подходящий
 * на основе заголовков и структуры входящего запроса.
 * @example
 * // Простейший навык, который отвечает на приветствие
 * import { Bot } from 'umbot';
 * import { TelegramAdapter } from 'umbot/plugins';
 *
 * const bot = new Bot()
 *     .use(new TelegramAdapter())
 *     .addCommand('start', ['привет'], (ctx) => {
 *         ctx.text = 'Привет! Я твой первый навык для Telegram';
 *     });
 *
 * bot.start();
 *
 * @see Bot
 * @see BotController
 * @see BasePlatform
 */
export class TelegramAdapter extends BasePlatform<string | ITelegramContent> {
    platformName = T_TELEGRAM;
    isVoice = false;
    limit = 30;

    init(appContext: AppContext): void {
        super.init(appContext);
        if (this._token) {
            appContext.appConfig.tokens[this.platformName].token = this._token;
        }
    }

    isPlatformOnQuery(query: ITelegramContent, headers?: Record<string, unknown>): boolean {
        if (headers?.['x-telegram-bot-api-secret-token']) {
            return true;
        }
        if (!query) {
            this.appContext?.logWarn(`TelegramAdapter.isPlatformOnQuery(): ${EMPTY_QUERY_ERROR}`);
            return false;
        }
        return !!(
            query.update_id !== undefined &&
            (query.message ||
                query.callback_query ||
                query.inline_query ||
                query.chosen_inline_result ||
                query.channel_post ||
                query.edited_message)
        );
    }

    async setQueryData(query: ITelegramContent, controller: BotController): Promise<boolean> {
        if (this.appContext) {
            if (query) {
                controller.requestObject = query;

                if (query.message !== undefined) {
                    controller.userId = query.message.chat.id;
                    controller.userCommand = query.message.text.toLowerCase().trim();
                    controller.originalUserCommand = query.message.text;
                    controller.messageId = query.message.message_id;

                    const thisUser: INluThisUser = {
                        username: query.message.chat.username || null,
                        first_name: query.message.chat.first_name || null,
                        last_name: query.message.chat.last_name || null,
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
