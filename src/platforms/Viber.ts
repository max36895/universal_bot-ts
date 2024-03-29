import {TemplateTypeModel} from './TemplateTypeModel';
import {BotController} from '../controller';
import {IViberContent} from './interfaces';
import {mmApp} from '../mmApp';
import {ViberRequest} from '../api/ViberRequest';
import {IViberParams} from '../api/interfaces';
import {Buttons, IViberButtonObject} from '../components/button';

/**
 * Класс, отвечающий за корректную инициализацию и отправку ответа для Viber.
 * @class Viber
 * @see TemplateTypeModel Смотри тут
 */
export class Viber extends TemplateTypeModel {
    /**
     * Инициализация основных параметров. В случае успешной инициализации, вернет true, иначе false.
     *
     * @param {IViberContent|string} query Запрос пользователя.
     * @param {BotController} controller Ссылка на класс с логикой навык/бота.
     * @return Promise<boolean>
     * @see TemplateTypeModel.init() Смотри тут
     * @api
     */
    public async init(query: string | IViberContent, controller: BotController): Promise<boolean> {
        if (query) {
            /**
             * array content
             * @see (https://developers.viber.com/docs/api/rest-bot-api/#receive-message-from-user) Смотри тут
             *  - string event: Callback type - какое событие вызвало обратный вызов
             *  - int timestamp: Время события, которое вызвало обратный вызов
             *  - int message_token: Уникальный идентификатор сообщения
             *  - array sender|user: Информация о пользователе. Для event='message' придет sender, иначе user
             *      - string id: Уникальный идентификатор пользователя Viber отправителя сообщения
             *      - string name: Имя отправителя Viber
             *      - string avatar: URL-адрес Аватара отправителя
             *      - string country:    Код страны из 2 букв отправителя
             *      - string language: Язык телефона отправителя. Будет возвращен в соответствии с языком устройства
             *      - int api_version: Максимальная версия Viber, которая поддерживается всеми устройствами пользователя
             *  - array message: Информация о сообщении
             *      - string type: Тип сообщения
             *      - string text: Текст сообщения
             *      - string media: URL носителя сообщения-может быть image,video, file и url. URL-адреса изображений/видео/файлов будут иметь TTL в течение 1 часа
             *      - array location: Координаты местоположения
             *          - float lat: Координата lat
             *          - float lon: Координата lon
             *      - array contact: name - имя пользователя контакта, phone_number - номер телефона контакта и avatar в качестве URL Аватара
             *          - string name
             *          - string phone_number
             *          - string avatar
             *      - string tracking_data: Отслеживание данных, отправленных вместе с последним сообщением пользователю
             *      - array file_name: Имя файла. Актуально для type='file'
             *      - array file_size: Размер файла в байтах. Актуально для type='file'
             *      - array duration: Длина видео в секундах. Актуально для type='video'
             *      - array sticker_id: Viber наклейка id. Актуально для type='sticker'
             */
            let content: IViberContent;
            if (typeof query === 'string') {
                content = <IViberContent>JSON.parse(query);
            } else {
                content = {...query};
            }
            if (!this.controller) {
                this.controller = controller;
            }
            this.controller.requestObject = content;

            if (content.message) {
                switch (content.event) {
                    case 'conversation_started':
                        if (content.user) {
                            this.controller.userId = content.user.id;

                            this.controller.userCommand = '';
                            this.controller.messageId = 0;

                            mmApp.params.viber_api_version = content.user.api_version || 2;
                            this.setNlu(content.sender.name || '');
                        }
                        return true;

                    case 'message':
                        this.controller.userId = content.sender.id;
                        mmApp.params.user_id = this.controller.userId;
                        this.controller.userCommand = content.message.text.toLowerCase().trim();
                        this.controller.originalUserCommand = content.message.text || '';
                        this.controller.messageId = content.message_token;

                        mmApp.params.viber_api_version = content.sender.api_version || 2;

                        this.setNlu(content.sender.name || '');
                        return true;
                }
            }
        } else {
            this.error = 'Viber:init(): Отправлен пустой запрос!';
        }
        return false;
    }

    /**
     * Заполнение nlu.
     *
     * @param {string} userName Имя пользователя.
     */
    protected setNlu(userName: string): void {
        const name = userName.split(' ');
        const thisUser = {
            username: name[0] || null,
            first_name: name[1] || null,
            last_name: name[2] || null,
        };
        this.controller.nlu.setNlu({thisUser});
    }

    /**
     * Получение ответа, который отправится пользователю. В случае с Алисой, Марусей и Сбер, возвращается json. С остальными типами, ответ отправляется непосредственно на сервер.
     *
     * @return {Promise<string>}
     * @see TemplateTypeModel.getContext() Смотри тут
     * @api
     */
    public async getContext(): Promise<string> {
        if (this.controller.isSend) {
            const viberApi = new ViberRequest();
            const params: IViberParams = {};
            const keyboard = this.controller.buttons.getButtons<IViberButtonObject>(Buttons.T_VIBER_BUTTONS);
            if (keyboard) {
                params.keyboard = keyboard;
                params.keyboard.Type = 'keyboard';
            }

            await viberApi.sendMessage(<string>this.controller.userId, mmApp.params.viber_sender as string, this.controller.text, params);

            if (this.controller.card.images.length) {
                const res = await this.controller.card.getCards();
                if (res.length) {
                    await viberApi.richMedia(<string>this.controller.userId, res);
                }
            }

            if (this.controller.sound.sounds.length) {
                await this.controller.sound.getSounds(this.controller.tts);
            }
        }
        return 'ok';
    }
}
