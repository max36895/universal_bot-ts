import {assert} from 'chai'
import {
    Buttons,
    Card,
    IAlisaBigImage,
    IAlisaItemsList,
    AlisaCard,
    mmApp,
    T_ALISA, T_VIBER, T_VK,
    IVkCard,
    IViberCard,
    Button,
    ViberButton
} from "../../src";

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

    it('Get Alisa card', async() => {
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
        assert.deepStrictEqual(await defaultCard.getCards(), alisaCard);

        defaultCard.button.addBtn('1', 'https://test.ru');
        alisaCard.footer = {
            text: '1',
            button: {
                text: '1',
                url: 'https://test.ru'
            }
        };
        assert.deepStrictEqual(await defaultCard.getCards(), alisaCard);

        defaultCard.isOne = true;

        const alisaCardOne: IAlisaBigImage = {
            type: AlisaCard.ALISA_CARD_BIG_IMAGE,
            image_id: '36895',
            title: '1',
            description: 'запись: 1',
            button: {
                text: '1',
                url: 'https://test.ru'
            }
        };
        assert.deepStrictEqual(await defaultCard.getCards(), alisaCardOne);

        defaultCard.button = new Buttons();
        delete alisaCardOne.button;
        assert.deepStrictEqual(await defaultCard.getCards(), alisaCardOne);
    });

    it('Get Viber card', async() => {
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
        assert.deepStrictEqual(await defaultCard.getCards(), viberCard);

        defaultCard.isOne = true;
        viberCard[0].Columns = 1;
        assert.deepStrictEqual(await defaultCard.getCards(), viberCard[0]);

        viberCard[0].Text = '<font color=#000><b>1</b></font><font color=#000>запись: 1</font>';
        viberCard[0].ActionType = ViberButton.T_REPLY;
        viberCard[0].ActionBody = '1';
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        assert.deepStrictEqual(await defaultCard.getCards(), viberCard[0]);

        defaultCard.isOne = false;
        viberCard[0].Columns = 3;
        assert.deepStrictEqual(await defaultCard.getCards(), viberCard);
    });

    it('Get Vk card', async() => {
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
        assert.deepStrictEqual(await defaultCard.getCards(), []);

        defaultCard.isOne = true;
        assert.deepStrictEqual(await defaultCard.getCards(), ['36895']);

        defaultCard.isOne = false;
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        assert.deepStrictEqual(await defaultCard.getCards(), vkCard);
    })
});
