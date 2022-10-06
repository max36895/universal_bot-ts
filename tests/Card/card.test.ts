import {
    AlisaCard,
    Button,
    Buttons,
    Card,
    IAlisaBigImage,
    IAlisaItemsList,
    IViberCard,
    IVkCard,
    mmApp,
    T_ALISA,
    T_VIBER,
    T_VK,
    ViberButton
} from '../../src';
import {IAlisaImageGallery} from '../../src/platforms/interfaces/IAlisa';

const URL = 'https://test.ru';

describe('Card test', () => {
    let defaultCard: Card;
    beforeEach(() => {
        mmApp.params.utm_text = '';
        defaultCard = new Card();
        defaultCard.title = 'title';
        defaultCard.desc = 'desc';
        for (let i = 0; i < 3; i++) {
            defaultCard.add('36895', `${i + 1}`, `запись: ${i + 1}`);
        }
    });

    it('Get Alisa card', async () => {
        const alisaCard: IAlisaItemsList = {
            type: AlisaCard.ALISA_CARD_ITEMS_LIST,
            header: {
                text: 'title'
            },
            items: [
                {
                    title: '1',
                    description: 'запись: 1',
                    image_id: '36895'
                },
                {
                    title: '2',
                    description: 'запись: 2',
                    image_id: '36895'
                },
                {
                    title: '3',
                    description: 'запись: 3',
                    image_id: '36895'
                },
            ]
        };
        mmApp.appType = T_ALISA;
        expect(await defaultCard.getCards()).toEqual(alisaCard);

        defaultCard.button.addBtn('1', URL);
        alisaCard.footer = {
            text: '1',
            button: {
                text: '1',
                url: URL
            }
        };
        expect(await defaultCard.getCards()).toEqual(alisaCard);

        defaultCard.isOne = true;

        const alisaCardOne: IAlisaBigImage = {
            type: AlisaCard.ALISA_CARD_BIG_IMAGE,
            image_id: '36895',
            title: '1',
            description: 'запись: 1',
            button: {
                text: '1',
                url: URL
            }
        };
        expect(await defaultCard.getCards()).toEqual(alisaCardOne);

        defaultCard.button = new Buttons();
        delete alisaCardOne.button;
        expect(await defaultCard.getCards()).toEqual(alisaCardOne);

        defaultCard.clear();
        defaultCard.isOne = false;
        defaultCard.add('36895', 'Запись 1', 'Описание 1', 'Кнопка');
        defaultCard.add('36895', 'Запись 2', 'Описание 2', {title: 'Кнопка', url: URL});
        defaultCard.add('36895', 'Запись 3', 'Описание 3', {title: 'Кнопка', payload: {text: 'text'}});
        const alisaCardButton: IAlisaItemsList = {
            type: AlisaCard.ALISA_CARD_ITEMS_LIST,
            header: {
                text: 'title'
            },
            items: [
                {
                    title: 'Запись 1',
                    description: 'Описание 1',
                    image_id: '36895',
                    button: {
                        text: 'Кнопка'
                    }
                },
                {
                    title: 'Запись 2',
                    description: 'Описание 2',
                    image_id: '36895',
                    button: {
                        text: 'Кнопка',
                        url: URL
                    }
                },
                {
                    title: 'Запись 3',
                    description: 'Описание 3',
                    image_id: '36895',
                    button: {
                        text: 'Кнопка',
                        payload: {
                            text: 'text'
                        }
                    }
                },
            ]
        };
        expect(await defaultCard.getCards()).toEqual(alisaCardButton);
    });

    it('Get Alisa gallery', async () => {
        defaultCard.isUsedGallery = true;
        const alisaGallery: IAlisaImageGallery = {
            type: 'ImageGallery',
            items: [
                {
                    title: '1',
                    image_id: '36895'
                },
                {
                    title: '2',
                    image_id: '36895'
                },
                {
                    title: '3',
                    image_id: '36895'
                }
            ]
        };
        expect(await defaultCard.getCards()).toEqual(alisaGallery);
        defaultCard.isUsedGallery = false;
    });

    it('Get Viber card', async () => {
        const viberCard: IViberCard[] = [
            {
                Columns: 3,
                Rows: 6,
                Image: '36895'
            },
            {
                Columns: 3,
                Rows: 6,
                Image: '36895'
            },
            {
                Columns: 3,
                Rows: 6,
                Image: '36895'
            }
        ];
        mmApp.appType = T_VIBER;
        expect(await defaultCard.getCards()).toEqual(viberCard);

        defaultCard.isOne = true;
        viberCard[0].Columns = 1;
        expect(await defaultCard.getCards()).toEqual(viberCard[0]);

        viberCard[0].Text = '<font color=#000><b>1</b></font><font color=#000>запись: 1</font>';
        viberCard[0].ActionType = ViberButton.T_REPLY;
        viberCard[0].ActionBody = '1';
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        expect(await defaultCard.getCards()).toEqual(viberCard[0]);

        defaultCard.isOne = false;
        viberCard[0].Columns = 3;
        expect(await defaultCard.getCards()).toEqual(viberCard);
    });

    it('Get Vk card', async () => {
        const vkCard: IVkCard = {
            type: 'carousel',
            elements: [
                {
                    title: '1',
                    description: 'запись: 1',
                    photo_id: '36895',
                    buttons: [
                        {
                            action: {
                                type: Button.VK_TYPE_TEXT,
                                label: '1'
                            }
                        }
                    ],
                    action: {
                        type: 'open_photo'
                    }
                }
            ]
        };
        mmApp.appType = T_VK;
        expect(await defaultCard.getCards()).toEqual([]);

        defaultCard.isOne = true;
        expect(await defaultCard.getCards()).toEqual(['36895']);

        defaultCard.isOne = false;
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        expect(await defaultCard.getCards()).toEqual(vkCard);
    })
});
