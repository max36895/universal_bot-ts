import {
    Button,
    Buttons,
    IAlisaButton,
    ITelegramKeyboard,
    IViberButtonObject,
    ViberButton,
    IVkButtonObject,
    VkButton,
    mmApp
} from '../../src';

const DEFAULT_URL = 'https://test.ru';

describe('Buttons test', () => {
    let defaultButtons: Buttons;

    beforeEach(() => {
        mmApp.params.utm_text = '';
        defaultButtons = new Buttons();
        for (let i = 0; i < 3; i++) {
            defaultButtons.addBtn(`${i + 1}`);
            defaultButtons.addLink(`${i + 1}`, DEFAULT_URL);
        }
    });

    it('Button utm text', () => {
        const button = new Button();
        mmApp.params.utm_text = null;
        button.initBtn('btn', 'https://google.com');
        expect(button.url).toEqual('https://google.com?utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone');

        button.initBtn('btn', 'https://google.com?utm_source=test');
        expect(button.url).toEqual('https://google.com?utm_source=test');

        button.initBtn('btn', 'https://google.com?data=test');
        expect(button.url).toEqual('https://google.com?data=test&utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone');

        mmApp.params.utm_text = 'my_utm_text';
        button.initBtn('btn', 'https://google.com');
        expect(button.url).toEqual('https://google.com?my_utm_text');
    });

    it('Get buttons Alisa', () => {
        const alisaButtons: IAlisaButton[] = [
            {
                title: '1',
                hide: true
            },
            {
                title: '1',
                hide: false,
                url: DEFAULT_URL
            },
            {
                title: '2',
                hide: true
            },
            {
                title: '2',
                hide: false,
                url: DEFAULT_URL
            },
            {
                title: '3',
                hide: true
            },
            {
                title: '3',
                hide: false,
                url: DEFAULT_URL
            }
        ];
        expect(defaultButtons.getButtons(Buttons.T_ALISA_BUTTONS)).toEqual(alisaButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];

        alisaButtons.push({
            title: 'btn',
            url: DEFAULT_URL,
            payload: 'test',
            hide: true
        });
        alisaButtons.push({
            title: 'link',
            url: DEFAULT_URL,
            payload: 'test',
            hide: false
        });
        expect(defaultButtons.getButtons(Buttons.T_ALISA_BUTTONS)).toEqual(alisaButtons);
    });
    it('Get buttons Alisa card', () => {
        expect(defaultButtons.getButtons(Buttons.T_ALISA_CARD_BUTTON)).toEqual({
            text: '1'
        });
    });

    it('Get buttons Vk', () => {
        const vkButtons: IVkButtonObject = {
            one_time: true,
            buttons: [
                {
                    action: {
                        type: Button.VK_TYPE_TEXT,
                        label: '1'
                    }
                },
                {
                    action: {
                        type: Button.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '1'
                    }
                },
                {
                    action: {
                        type: Button.VK_TYPE_TEXT,
                        label: '2'
                    }
                },
                {
                    action: {
                        type: Button.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '2'
                    }
                },
                {
                    action: {
                        type: Button.VK_TYPE_TEXT,
                        label: '3'
                    }
                },
                {
                    action: {
                        type: Button.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '3'
                    }
                }
            ]
        };
        expect(defaultButtons.getButtons(Buttons.T_VK_BUTTONS)).toEqual(vkButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: DEFAULT_URL,
                label: 'btn',
                payload: 'test'
            }
        });
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: DEFAULT_URL,
                label: 'link',
                payload: 'test'
            }
        });
        expect(defaultButtons.getButtons(Buttons.T_VK_BUTTONS)).toEqual(vkButtons);

        defaultButtons.clear();
        expect(defaultButtons.getButtons(Buttons.T_VK_BUTTONS)).toEqual({one_time: false, buttons: []});

    });
    it('Get buttons Vk group', () => {
        const vkButtons: IVkButtonObject = {
            one_time: true,
            buttons: [
                [
                    {
                        action: {
                            type: Button.VK_TYPE_TEXT,
                            label: '1',
                            payload: '{}'
                        }
                    },
                    {
                        action: {
                            type: Button.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '1',
                            payload: '{}'
                        }
                    },
                    {
                        action: {
                            type: Button.VK_TYPE_TEXT,
                            label: '2',
                            payload: '{}'
                        }
                    },
                    {
                        action: {
                            type: Button.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '2',
                            payload: '{}'
                        }
                    },
                ],
                [
                    {
                        action: {
                            type: Button.VK_TYPE_TEXT,
                            label: '3',
                            payload: '{}'
                        }
                    },
                ],
                {
                    action: {
                        type: Button.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '3'
                    }
                }
            ]
        };
        defaultButtons.clear();
        defaultButtons.addBtn('1', null, {}, {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addLink('1', DEFAULT_URL, {}, {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addBtn('2', null, {}, {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addLink('2', DEFAULT_URL, {}, {[VkButton.GROUP_NAME]: 0});

        defaultButtons.addBtn('3', null, {}, {[VkButton.GROUP_NAME]: 1});
        defaultButtons.addLink('3', DEFAULT_URL);
        expect(defaultButtons.getButtons(Buttons.T_VK_BUTTONS)).toEqual(vkButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: DEFAULT_URL,
                payload: {},
                options: {
                    [VkButton.GROUP_NAME]: 1
                }
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];

        vkButtons.buttons[1].push(
            {
                action: {
                    type: Button.VK_TYPE_LINK,
                    link: DEFAULT_URL,
                    label: 'btn',
                    payload: '{}'
                }
            }
        );
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: DEFAULT_URL,
                label: 'link',
                payload: 'test'
            }
        });
        expect(defaultButtons.getButtons(Buttons.T_VK_BUTTONS)).toEqual(vkButtons);
    });

    it('Get buttons Viber', () => {
        const viberButtons: IViberButtonObject = {
            DefaultHeight: true,
            BgColor: '#FFFFFF',
            Buttons: [
                {
                    Text: '1',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '1'
                },
                {
                    Text: '1',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '2'
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '3'
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL
                },
            ]
        };
        expect(defaultButtons.getButtons(Buttons.T_VIBER_BUTTONS)).toEqual(viberButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        viberButtons.Buttons.push({
            Text: 'btn',
            ActionType: ViberButton.T_OPEN_URL,
            ActionBody: DEFAULT_URL
        },);
        viberButtons.Buttons.push({
            Text: 'link',
            ActionType: ViberButton.T_OPEN_URL,
            ActionBody: DEFAULT_URL
        },);
        expect(defaultButtons.getButtons(Buttons.T_VIBER_BUTTONS)).toEqual(viberButtons);
    });

    it('Get buttons Telegram', () => {
        const telegramButtons: ITelegramKeyboard = {
            keyboard: [
                '1', '2', '3'
            ]
        };

        expect(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS)).toEqual(telegramButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: DEFAULT_URL,
                payload: 'test'
            }
        ];

        telegramButtons.inline_keyboard = [];
        telegramButtons.inline_keyboard.push({
            text: 'btn',
            url: DEFAULT_URL,
            callback_data: 'test'
        });
        telegramButtons.inline_keyboard.push({
            text: 'link',
            url: DEFAULT_URL,
            callback_data: 'test'
        });

        expect(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS)).toEqual(telegramButtons);

        defaultButtons.clear();
        expect(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS)).toEqual({remove_keyboard: true});
    });
});
