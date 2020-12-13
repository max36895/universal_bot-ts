/**
 * Класс отвечает за обработку и корректное воспроизведение звуков, в зависимости от типа приложения.
 * Class Sound
 * @package bot\components\sound
 */
import {TemplateSoundTypes} from "./types/TemplateSoundTypes";
import {mmApp, T_ALISA, T_MARUSIA, T_SMARTAPP, T_TELEGRAM, T_USER_APP, T_VIBER, T_VK} from "../../core/mmApp";
import {AlisaSound} from "./types/AlisaSound";
import {TelegramSound} from "./types/TelegramSound";
import {VkSound} from "./types/VkSound";
import {ViberSound} from "./types/ViberSound";
import {ISound} from "./interfaces/sound";

export class Sound {
    /**
     * Массив звуков.
     * @var sounds Массив звуков.
     */
    public sounds: ISound[];
    /**
     * True, если использовать стандартные звуки. Актуально для Алисы. По умолчанию true.
     * @var isUsedStandardSound True, если использовать стандартные звуки. Актуально для Алисы. По умолчанию true.
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
     * Получить корректно поставленные звуки в текст.
     *
     * @param text Исходный текст.
     * @param userSound Пользовательский класс для обработки звуков.
     * @return any
     * @api
     */
    public getSounds(text: string, userSound: TemplateSoundTypes = null): any {
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
            return sound.getSounds(this.sounds, text);
        }
        return text;
    }
}
