import { TemplateCardTypes } from './TemplateCardTypes';
import { TelegramRequest } from '../../../api/TelegramRequest';
import { ImageTokens } from '../../../models/ImageTokens';
import { ITelegramMedia, TTelegramChatId } from '../../../api';
import { Text } from '../../../utils';

/**
 * @class TelegramCard
 * Класс для создания и отображения карточек в Телеграме.
 * Наследуется от TemplateCardTypes и реализует специфичную для Телеграма логику.
 *
 * Основные возможности:
 * - Создание галереи изображений
 * - Отправка изображений с подписями
 * - Обработка ошибок при работе с изображениями
 * - Автоматическое создание токенов для изображений
 * - Поддержка форматированного текста
 * - Логирование ошибок при обработке изображений
 *
 * @example
 * ```typescript
 * // Создание галереи с изображениями
 * const card = new TelegramCard();
 * card.title = 'Выберите категорию';
 * card.images = [
 *     new Image('electronics.jpg', 'Электроника', 'Описание электроники'),
 *     new Image('clothes.jpg', 'Одежда', 'Описание одежды')
 * ];
 * const result = await card.getCard(false);
 *
 * ```
 */
export class TelegramCard extends TemplateCardTypes {
    /**
     * Получает карточку для отображения в Телеграме.
     * Преобразует изображения и их описания в формат галереи .
     *
     * @param {boolean} isOne - Флаг отображения одного элемента
     * @returns {Promise<ITelegramMedia | null>} Объект карточки или null, если нет вариантов
     * @throws {Error} При ошибках обработки изображений
     *
     * @example
     * ```typescript
     * const card = new TelegramCard();
     * card.title = 'Посмотрите товары';
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     * ```
     */
    public async getCard(isOne: boolean): Promise<ITelegramMedia[] | null> {
        let object: ITelegramMedia[] | null = null;
        if (isOne || this.images.length === 1) {
            const image = this.images[0];
            try {
                if (!image.imageToken) {
                    if (image.imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.type = ImageTokens.T_TELEGRAM;
                        mImage.caption = image.desc;
                        mImage.path = image.imageDir;
                        image.imageToken = await mImage.getToken();
                    }
                } else {
                    await new TelegramRequest(this._appContext).sendPhoto(
                        this._appContext.platformParams.user_id as TTelegramChatId,
                        image.imageToken,
                        image.desc,
                    );
                }
            } catch (e) {
                // Логируем ошибку, но не прерываем цикл
                const error = `\n${Date} Ошибка при обработке изображения для Telegram: ${e}`;
                this._appContext.saveLog('TelegramCard.log', error);
            }
            return object;
        } else {
            object = [];
            for (let i = 0; i < this.images.length; i++) {
                const image = this.images[i];
                try {
                    let field: string | null = null;
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            field = `attach://${image.imageDir}`;
                        }
                    } else {
                        field = image.imageToken;
                    }
                    if (field) {
                        object.push({
                            type: 'photo',
                            media: field,
                            caption: Text.resize(image.desc, 1024),
                        });
                    }
                } catch (e) {
                    // Логируем ошибку, но не прерываем цикл
                    const error = `\n${Date} Ошибка при обработке изображения для Telegram: ${e}`;
                    this._appContext.saveLog('TelegramCard.log', error);
                }
            }
        }

        return object;
    }
}
