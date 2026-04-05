import { Buttons, Card, AppContext, BaseBotController } from '../../src';
import {
    T_ALISA,
    T_MAX_APP,
    T_VIBER,
    T_VK,
    AlisaCard,
    AlisaConstants,
    MarusiaCard,
    MarusiaConstants,
    ViberCard,
    ViberButton,
    VkCard,
    VkButton,
    MaxCard,
    IAlisaItemsList,
    IAlisaBigImage,
    IMaxCard,
    IMarusiaItemsList,
    IMarusiaBigImage,
} from '../../src/plugins';
import { IViberCard } from '../../src/plugins/platforms/Viber/interfaces/IViberPlatform';

const botController = new BaseBotController();

const URL = 'https://test.ru';

let appContext: AppContext;
describe('Card test', () => {
    let defaultCard: Card;
    beforeEach(() => {
        appContext = new AppContext();
        appContext.platformParams.utm_text = '';
        defaultCard = new Card(appContext);
        defaultCard.title = 'title';
        defaultCard.desc = 'desc';
        for (let i = 0; i < 3; i++) {
            defaultCard.addImage('123456', `${i + 1}`, `запись: ${i + 1}`);
        }
    });

    it('Get Alisa card', async () => {
        const alisaCard: IAlisaItemsList = {
            type: AlisaConstants.ALISA_CARD_ITEMS_LIST,
            header: {
                text: 'title',
            },
            items: [
                {
                    title: '1',
                    description: 'запись: 1',
                    image_id: '123456',
                },
                {
                    title: '2',
                    description: 'запись: 2',
                    image_id: '123456',
                },
                {
                    title: '3',
                    description: 'запись: 3',
                    image_id: '123456',
                },
            ],
        };
        botController.appType = T_ALISA;
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );

        defaultCard.button.addBtn('1', URL);
        alisaCard.footer = {
            text: '1',
            button: {
                text: '1',
                url: URL,
            },
        };
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );

        defaultCard.isOne = true;

        const alisaCardOne: IAlisaBigImage = {
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            image_id: '123456',
            title: '1',
            description: 'запись: 1',
            button: {
                text: '1',
                url: URL,
            },
        };
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCardOne,
        );

        defaultCard.button = new Buttons(appContext);
        delete alisaCardOne.button;
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCardOne,
        );

        defaultCard.clear();
        defaultCard.isOne = false;
        defaultCard.addImage('123456', 'Запись 1', 'Описание 1', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 2', 'Описание 2', { title: 'Кнопка', url: URL });
        defaultCard.addImage('123456', 'Запись 3', 'Описание 3', {
            title: 'Кнопка',
            payload: { text: 'text' },
        });
        const alisaCardButton = {
            type: AlisaConstants.ALISA_CARD_ITEMS_LIST,
            header: {
                text: 'title',
            },
            items: [
                {
                    title: 'Запись 1',
                    description: 'Описание 1',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                    },
                },
                {
                    title: 'Запись 2',
                    description: 'Описание 2',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                        url: URL,
                    },
                },
                {
                    title: 'Запись 3',
                    description: 'Описание 3',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                        payload: {
                            text: 'text',
                        },
                    },
                },
            ],
        };
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCardButton,
        );

        defaultCard.addImage('123456', 'Запись 4', 'Описание 4', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 5', 'Описание 5', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 6', 'Описание 6', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 7', 'Описание 7', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 7', 'Описание 7', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 8', 'Описание 8', 'Кнопка');

        alisaCardButton.items.push({
            title: 'Запись 4',
            description: 'Описание 4',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        });
        alisaCardButton.items.push({
            title: 'Запись 5',
            description: 'Описание 5',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        });
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCardButton,
        );

        defaultCard.isOne = true;
        const alisaCardOneNew = {
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            title: 'Запись 1',
            description: 'Описание 1',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        };
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCardOneNew,
        );
    });
    it('Get Alisa card for addOneImage', async () => {
        const alisaCard = {
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            title: 'Запись 0',
            description: 'Описание 0',
            image_id: '123456',
        };
        botController.appType = T_ALISA;
        defaultCard.addOneImage('123456', 'Запись 0', 'Описание 0');
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );
        defaultCard.addImage('1', '2', '3');
        defaultCard.addImage('4', '5', '6');
        defaultCard.addOneImage('123456', 'Запись 0', 'Описание 0');
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );
    });

    it('Get Alisa card set title', async () => {
        const alisaCard = {
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            title: 'Запись 0',
            description: 'Описание 0',
            image_id: '123456',
        };
        botController.appType = T_ALISA;
        defaultCard.addOneImage('123456', '', 'Описание 0');
        defaultCard.setTitle('Запись 0');
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );
    });
    it('Get Alisa card set description', async () => {
        const alisaCard = {
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            title: 'Запись 0',
            description: 'Описание 0',
            image_id: '123456',
        };
        botController.appType = T_ALISA;
        defaultCard.addOneImage('123456', 'Запись 0', '');
        defaultCard.setDescription('Описание 0');
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaCard,
        );
    });

    it('Get Alisa gallery', async () => {
        defaultCard.isUsedGallery = true;
        botController.appType = T_ALISA;
        const alisaGallery = {
            type: 'ImageGallery',
            items: [
                {
                    title: '1',
                    image_id: '123456',
                },
                {
                    title: '2',
                    image_id: '123456',
                },
                {
                    title: '3',
                    image_id: '123456',
                },
            ],
        };
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaGallery,
        );

        defaultCard.addImage('123456', '4');
        defaultCard.addImage('123456', '5');
        defaultCard.addImage('123456', '6');
        defaultCard.addImage('123456', '7');
        defaultCard.addImage('123456', '8');

        alisaGallery.items.push(
            {
                title: '4',
                image_id: '123456',
            },
            {
                title: '5',
                image_id: '123456',
            },
            {
                title: '6',
                image_id: '123456',
            },
            {
                title: '7',
                image_id: '123456',
            },
        );
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual(
            alisaGallery,
        );
        defaultCard.isUsedGallery = false;
        defaultCard.isOne = true;
        expect(await defaultCard.getCards(AlisaCard.cardProcessing, botController)).toEqual({
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            title: '1',
            description: 'запись: 1',
            image_id: '123456',
        });
    });

    it('Get Marusia card', async () => {
        const marusiaCard: IMarusiaItemsList = {
            type: MarusiaConstants.MARUSIA_CARD_ITEMS_LIST,
            header: {
                text: 'title',
            },
            items: [
                {
                    title: '1',
                    description: 'запись: 1',
                    image_id: '123456',
                },
                {
                    title: '2',
                    description: 'запись: 2',
                    image_id: '123456',
                },
                {
                    title: '3',
                    description: 'запись: 3',
                    image_id: '123456',
                },
            ],
        };
        botController.appType = T_ALISA;
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCard,
        );

        defaultCard.button.addBtn('1', URL);
        marusiaCard.footer = {
            text: '1',
            button: {
                text: '1',
                url: URL,
            },
        };
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCard,
        );

        defaultCard.isOne = true;

        const marusiaCardOne: IMarusiaBigImage = {
            type: MarusiaConstants.MARUSIA_CARD_BIG_IMAGE,
            image_id: '123456',
            title: '1',
            description: 'запись: 1',
            button: {
                text: '1',
                url: URL,
            },
        };
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardOne,
        );

        defaultCard.button = new Buttons(appContext);
        delete marusiaCardOne.button;
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardOne,
        );

        defaultCard.clear();
        defaultCard.isOne = false;
        defaultCard.addImage('123456', 'Запись 1', 'Описание 1', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 2', 'Описание 2', { title: 'Кнопка', url: URL });
        defaultCard.addImage('123456', 'Запись 3', 'Описание 3', {
            title: 'Кнопка',
            payload: { text: 'text' },
        });
        const marusiaCardButton = {
            type: MarusiaConstants.MARUSIA_CARD_ITEMS_LIST,
            header: {
                text: 'title',
            },
            items: [
                {
                    title: 'Запись 1',
                    description: 'Описание 1',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                    },
                },
                {
                    title: 'Запись 2',
                    description: 'Описание 2',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                        url: URL,
                    },
                },
                {
                    title: 'Запись 3',
                    description: 'Описание 3',
                    image_id: '123456',
                    button: {
                        text: 'Кнопка',
                        payload: {
                            text: 'text',
                        },
                    },
                },
            ],
        };
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardButton,
        );

        defaultCard.addImage('123456', 'Запись 4', 'Описание 4', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 5', 'Описание 5', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 6', 'Описание 6', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 7', 'Описание 7', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 7', 'Описание 7', 'Кнопка');
        defaultCard.addImage('123456', 'Запись 8', 'Описание 8', 'Кнопка');

        marusiaCardButton.items.push({
            title: 'Запись 4',
            description: 'Описание 4',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        });
        marusiaCardButton.items.push({
            title: 'Запись 5',
            description: 'Описание 5',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        });
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardButton,
        );

        defaultCard.isOne = true;
        const marusiaCardOneNew = {
            type: MarusiaConstants.MARUSIA_CARD_BIG_IMAGE,
            title: 'Запись 1',
            description: 'Описание 1',
            image_id: '123456',
            button: {
                text: 'Кнопка',
            },
        };
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardOneNew,
        );
    });

    it('Get Viber card', async () => {
        const viberCard: IViberCard[] = [
            {
                Columns: 3,
                Rows: 6,
                Image: '123456',
            },
            {
                Columns: 3,
                Rows: 6,
                Image: '123456',
            },
            {
                Columns: 3,
                Rows: 6,
                Image: '123456',
            },
        ];
        botController.appType = T_VIBER;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard,
        );

        defaultCard.isOne = true;
        viberCard[0].Columns = 1;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard[0],
        );

        viberCard[0].Text = '<font color=#000><b>1</b></font><font color=#000>запись: 1</font>';
        viberCard[0].ActionType = ViberButton.T_REPLY;
        viberCard[0].ActionBody = '1';
        const buttons = new Buttons(appContext);
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard[0],
        );

        defaultCard.isOne = false;
        viberCard[0].Columns = 3;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard,
        );
    });

    it('Get Vk card', async () => {
        const vkCard = {
            type: 'carousel',
            elements: [
                {
                    title: '1',
                    description: 'запись: 1',
                    photo_id: '123456',
                    buttons: [
                        {
                            action: {
                                type: VkButton.VK_TYPE_TEXT,
                                label: '1',
                            },
                        },
                    ],
                    action: {
                        type: 'open_photo',
                    },
                },
            ],
        };
        botController.appType = T_VK;
        expect(await defaultCard.getCards(VkCard.cardProcessing, botController)).toEqual([]);

        defaultCard.isOne = true;
        expect(await defaultCard.getCards(VkCard.cardProcessing, botController)).toEqual([
            '123456',
        ]);

        defaultCard.isOne = false;
        const buttons = new Buttons(appContext);
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        expect(await defaultCard.getCards(VkCard.cardProcessing, botController)).toEqual(vkCard);
    });

    it('Get MAX card', async () => {
        const maxCard: IMaxCard = {
            type: 'image',
            payload: {
                token: '123456',
            },
        };
        botController.appType = T_MAX_APP;
        defaultCard.isOne = true;
        expect(await defaultCard.getCards(MaxCard.cardProcessing, botController)).toEqual([
            maxCard,
        ]);

        defaultCard.isOne = false;
        delete maxCard.payload.token;
        maxCard.payload.photos = ['123456', '123456', '123456'];
        expect(await defaultCard.getCards(MaxCard.cardProcessing, botController)).toEqual([
            maxCard,
        ]);
        defaultCard.clear();
        expect(await defaultCard.getCards(MaxCard.cardProcessing, botController)).toEqual(null);
    });
});
