import {assert} from 'chai'
import {Buttons} from "../../bot/components/button/Buttons";
import {Card} from "../../bot/components/card/Card";
import {IAlisaBigImage, IAlisaItemsList} from "../../bot/core/interfaces/IAlisa";
import {AlisaCard} from "../../bot/components/card/types/AlisaCard";
import {mmApp, T_ALISA, T_VIBER, T_VK} from "../../bot/core/mmApp";
import {IVkCard} from "../../bot/components/card/types/VkCard";
import {IViberCard} from "../../bot/components/card/types/ViberCard";
import {Button} from "../../bot/components/button/Button";
import {ViberButton} from "../../bot/components/button/types/ViberButton";

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

    it('Get Alisa card', () => {
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
        assert.deepEqual(defaultCard.getCards(), alisaCard);

        defaultCard.button.addBtn('1', 'https://test.ru');
        alisaCard.footer = {
            text: '1',
            button: {
                text: '1',
                url: 'https://test.ru'
            }
        }
        assert.deepEqual(defaultCard.getCards(), alisaCard);

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
        }
        assert.deepEqual(defaultCard.getCards(), alisaCardOne);

        defaultCard.button = new Buttons();
        delete alisaCardOne.button;
        assert.deepEqual(defaultCard.getCards(), alisaCardOne);
    });

    it('Get Viber card', () => {
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
        assert.deepEqual(defaultCard.getCards(), viberCard);

        defaultCard.isOne = true;
        viberCard[0].Columns = 1;
        assert.deepEqual(defaultCard.getCards(), viberCard[0]);

        viberCard[0].Text = '<font color=#000><b>1</b></font><font color=#000>запись: 1</font>'
        viberCard[0].ActionType = ViberButton.T_REPLY;
        viberCard[0].ActionBody = '1';
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        assert.deepEqual(defaultCard.getCards(), viberCard[0]);

        defaultCard.isOne = false;
        viberCard[0].Columns = 3;
        assert.deepEqual(defaultCard.getCards(), viberCard);
    })

    it('Get Vk card', () => {
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
        assert.deepEqual(defaultCard.getCards(), []);

        defaultCard.isOne = true;
        assert.deepEqual(defaultCard.getCards(), ['36895']);

        defaultCard.isOne = false;
        const buttons = new Buttons();
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        assert.deepEqual(defaultCard.getCards(), vkCard);
    })
})
