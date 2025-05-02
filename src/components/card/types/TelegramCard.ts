import { TemplateCardTypes } from './TemplateCardTypes';
import { TelegramRequest } from '../../../api/TelegramRequest';
import { mmApp } from '../../../mmApp';
import { ImageTokens } from '../../../models/ImageTokens';
import { TTelegramChatId } from '../../../api';

/**
 * Интерфейс для карточки в Телеграме.
 */
export interface ITelegramCard {
    /**
     * Опрос
     */
    question: string;
    /**
     * Варианты ответа
     */
    options: string[];
}

/**
 * Класс отвечающий за отображение карточки в Телеграме.
 * @class TelegramCard
 */
export class TelegramCard extends TemplateCardTypes {
    /**
     * Получение карточки для отображения пользователю.
     *
     * todo подумать над корректным отображением.
     * @param {boolean} _ True, если нужно отобразить только 1 элемент. Не используется.
     * @return {Promise<ITelegramCard>}
     */
    public async getCard(_: boolean): Promise<ITelegramCard | null> {
        let object: ITelegramCard | null = null;
        const options: string[] = [];
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            try {
                if (!image.imageToken) {
                    if (image.imageDir) {
                        const mImage = new ImageTokens();
                        mImage.type = ImageTokens.T_TELEGRAM;
                        mImage.caption = image.desc;
                        mImage.path = image.imageDir;
                        image.imageToken = await mImage.getToken();
                    }
                } else {
                    await new TelegramRequest().sendPhoto(
                        mmApp.params.user_id as TTelegramChatId,
                        image.imageToken,
                        image.desc,
                    );
                }
                options.push(image.title);
            } catch (e) {
                // Логируем ошибку, но не прерываем цикл
                const error = `\n${Date} Ошибка при обработке изображения для Telegram: ${e}`;
                mmApp.saveLog('TelegramCard.log', error);
            }
        }
        if (options.length > 1) {
            object = {
                question: this.title || '',
                options: options,
            };
        }
        return object;
    }
}
