import { TemplateCardTypes } from './TemplateCardTypes';
import { ImageTokens } from '../../../models/ImageTokens';
import { Text } from '../../../utils/standard/Text';

/**
 * @interface IMaxCard
 * Интерфейс для карточки Max.
 */
export interface IMaxCard {
    /**
     * Тип карточки.
     */
    type: 'image';

    /**
     * Массив элементов карточки.
     * Каждый элемент представляет собой отдельную карточку в карусели.
     */
    payload: {
        /**
         * Ссылка на изображение.
         */
        url?: string;
        /**
         * Токен изображения.
         */
        token?: string;
        /**
         * Массив токенов изображений.
         */
        photos?: string[];
    };
}

/**
 * @class MaxAppCard
 * Класс для создания и отображения карточек в Max.
 * Наследуется от TemplateCardTypes и реализует специфичную для ВКонтакте логику.
 */
export class MaxAppCard extends TemplateCardTypes {
    /**
     * Получает данные карточки для отправки в Max.
     * @param value
     * @protected
     */
    protected getPayload(value: string): Record<string, unknown> {
        if (Text.isUrl(value)) {
            return {
                url: value,
            };
        }
        return { token: value };
    }

    /**
     * Получает карточку для отображения в Max.
     */
    public async getCard(isOne: boolean): Promise<IMaxCard | string[]> {
        const object: string[] = [];
        const countImage = this.images.length;
        if (countImage === 1 || isOne) {
            if (!this.images[0].imageToken) {
                if (this.images[0].imageDir) {
                    const mImage = new ImageTokens(this._appContext);
                    mImage.type = ImageTokens.T_MAXAPP;
                    mImage.path = this.images[0].imageDir;
                    this.images[0].imageToken = await mImage.getToken();
                }
            }
            if (this.images[0].imageToken) {
                return {
                    type: 'image',
                    payload: this.getPayload(this.images[0].imageToken),
                };
            }
        } else {
            const elements = [];
            for (let i = 0; i < this.images.length; i++) {
                const image = this.images[i];
                if (!image.imageToken) {
                    if (image.imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.type = ImageTokens.T_MAXAPP;
                        mImage.path = image.imageDir;
                        image.imageToken = await mImage.getToken();
                    }
                }
                if (image.imageToken) {
                    elements.push(image.imageToken);
                }
            }
            if (elements.length) {
                return {
                    type: 'image',
                    payload: {
                        photos: elements,
                    },
                };
            }
        }
        return object;
    }
}
