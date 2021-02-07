import {TemplateSoundTypes} from "./types/TemplateSoundTypes";
import {mmApp, T_ALISA, T_MARUSIA, T_SMARTAPP, T_TELEGRAM, T_USER_APP, T_VIBER, T_VK} from "../../core/mmApp";
import {AlisaSound} from "./types/AlisaSound";
import {TelegramSound} from "./types/TelegramSound";
import {VkSound} from "./types/VkSound";
import {ViberSound} from "./types/ViberSound";
import {ISound} from "./interfaces/sound";

/**
 * Класс отвечающий за обработку и корректное воспроизведение звуков, в зависимости от типа приложения.
 * @class Sound
 */
export class Sound {
    /**
     * Массив звуков.
     */
    public sounds: ISound[];
    /**
     * Использование стандартных звуков.
     * Если true - используются стандартные звуки. Актуально для Алисы. По умолчанию true.
     */
    public isUsedStandardSound: boolean;

    /**
     * Sound constructor.
     */
    public constructor() {
        this.sounds = [];
        this.isUsedStandardSound = true;
    }

    /**
     * Получение корректно поставленных звуков в текст.
     *
     * @param {string} text Исходный текст.
     * @param {TemplateSoundTypes} userSound Пользовательский класс для обработки звуков.
     * @return {Promise<any>}
     * @api
     */
    public async getSounds(text: string, userSound: TemplateSoundTypes = null): Promise<any> {
        let sound: any = null;
        switch (mmApp.appType) {
            case T_ALISA:
                sound = new AlisaSound();
                sound.isUsedStandardSound = this.isUsedStandardSound;
                break;

            case T_VK:
                sound = new VkSound();
                break;

            case T_TELEGRAM:
                sound = new TelegramSound();
                break;

            case T_VIBER:
                sound = new ViberSound();
                break;

            case T_MARUSIA:
                sound = null;
                break;

            case T_SMARTAPP:
                sound = null;
                break;

            case T_USER_APP:
                sound = userSound;
                break;
        }
        if (sound) {
            return await sound.getSounds(this.sounds, text);
        }
        return text;
    }
}
