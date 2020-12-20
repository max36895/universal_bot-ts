import {TemplateCardTypes} from "../../../../../src/MM/bot/components/card/types/TemplateCardTypes";
import {UserButton} from "./UserButton";
import {Buttons} from "../../../../../src/MM/bot/components/button/Buttons";

export class UserCard extends TemplateCardTypes {
    /**
     * Получение массива для отображения карточки/изображения
     *
     * @param isOne True, если отобразить только 1 картинку.
     * @return array
     */
    public getCard(isOne: boolean): object[] {
        let object = [];
        let countImage = this.images.length;
        if (countImage > 7) {
            countImage = 7;
        }
        const userButton = new UserButton();
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        this.images[0].imageToken = this.images[0].imageDir;
                    }
                }
                if (this.images[0].imageToken) {
                    /*
                     * Заполняем object необходимыми данными
                     */
                    // Получаем возможные кнопки у карточки
                    const btn = this.images[0].button.getButtons(Buttons.T_USER_APP_BUTTONS, userButton);
                    if (btn) {
                        // Добавляем кнопки к карточке
                        object = Object.assign({}, object, btn[0]);
                    }
                }
            } else {
                this.images.forEach((image) => {
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            image.imageToken = image.imageDir;
                        }
                    }
                    const element = {};
                    /*
                     * Заполняем element необходимыми данными
                     */
                    // Получаем возможные кнопки у карточки
                    const btn = image.button.getButtons(Buttons.T_USER_APP_BUTTONS, userButton);
                    if (btn) {
                        // Добавляем кнопки к карточке
                        object = Object.assign({}, object, btn[0]);
                    }
                    object.push(element);
                })
            }
        }
        return object;
    }
}
