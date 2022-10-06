import {TemplateButtonTypes} from '../../../../../src';

export class UserButton extends TemplateButtonTypes {
    /**
     * Получение массив с кнопками для ответа пользователю
     *
     * @return array
     */
    public getButtons(): object {
        const objects = {};
        this.buttons.forEach((button) => {
            /*
             * Заполняем массив object нужными данными
             */
        });
        return objects;
    }
}
