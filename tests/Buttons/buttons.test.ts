import {assert} from 'chai';
import {Button} from "../../src/components/button/Button";
import {Buttons} from "../../src/components/button/Buttons";
import {IAlisaButton} from "../../src/core/interfaces/IAlisa";
import {ITelegramKeyboard} from "../../src/components/button/types/TelegramButton";
import {IViberButtonObject} from "../../src/components/button/interfaces/IViberButton";
import {ViberButton} from "../../src/components/button/types/ViberButton";
import {IVkButtonObject} from "../../src/components/button/interfaces/IVkButton";
import {VkButton} from "../../src/components/button/types/VkButton";
import {mmApp} from "../../src/core/mmApp";

describe('Buttons test', () => {
    let defaultButtons: Buttons;

    beforeEach(() => {
        mmApp.params.utm_text = '';
        defaultButtons = new Buttons();
        for (let i = 0; i < 3; i++) {
            defaultButtons.addBtn(`${i + 1}`);
            defaultButtons.addLink(`${i + 1}`, 'https://test.ru');
        }

    });

    it('Button init', () => {
        const button = new Button();
        mmApp.params.utm_text = null;
        button.initBtn('btn', 'https://google.com');
        assert.equal(button.url, 'https://google.com?utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone');

        button.initBtn('btn', 'https://google.com?utm_source=test');
        assert.equal(button.url, 'https://google.com?utm_source=test');

        button.initBtn('btn', 'https://google.com?data=test');
        assert.equal(button.url, 'https://google.com?data=test&utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone');

        mmApp.params.utm_text = 'my_utm_text';
        button.initBtn('btn', 'https://google.com');
        assert.equal(button.url, 'https://google.com?my_utm_text');
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
                url: 'https://test.ru'
            },
            {
                title: '2',
                hide: true
            },
            {
                title: '2',
                hide: false,
                url: 'https://test.ru'
            },
            {
                title: '3',
                hide: true
            },
            {
                title: '3',
                hide: false,
                url: 'https://test.ru'
            }
        ];
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_ALISA_BUTTONS), alisaButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];

        alisaButtons.push({
            title: 'btn',
            url: 'https://test.ru',
            payload: 'test',
            hide: true
        });
        alisaButtons.push({
            title: 'link',
            url: 'https://test.ru',
            payload: 'test',
            hide: false
        });
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_ALISA_BUTTONS), alisaButtons);
    });
    it('Get buttons Alisa card', () => {
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_ALISA_CARD_BUTTON), {
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
                        link: 'https://test.ru',
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
                        link: 'https://test.ru',
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
                        link: 'https://test.ru',
                        label: '3'
                    }
                }
            ]
        };
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VK_BUTTONS), vkButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: 'https://test.ru',
                label: 'btn',
                payload: 'test'
            }
        });
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: 'https://test.ru',
                label: 'link',
                payload: 'test'
            }
        });
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VK_BUTTONS), vkButtons);

        defaultButtons.clear();
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VK_BUTTONS), {one_time: false, buttons: []});

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
                            link: 'https://test.ru',
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
                            link: 'https://test.ru',
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
                        link: 'https://test.ru',
                        label: '3'
                    }
                }
            ]
        };
        defaultButtons.clear();
        defaultButtons.addBtn('1', null, {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addLink('1', 'https://test.ru', {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addBtn('2', null, {[VkButton.GROUP_NAME]: 0});
        defaultButtons.addLink('2', 'https://test.ru', {[VkButton.GROUP_NAME]: 0});

        defaultButtons.addBtn('3', null, {[VkButton.GROUP_NAME]: 1});
        defaultButtons.addLink('3', 'https://test.ru');
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VK_BUTTONS), vkButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: 'https://test.ru',
                payload: {
                    [VkButton.GROUP_NAME]: 1
                }
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];

        vkButtons.buttons[1].push(
            {
                action: {
                    type: Button.VK_TYPE_LINK,
                    link: 'https://test.ru',
                    label: 'btn',
                    payload: '{}'
                }
            }
        );
        vkButtons.buttons.push({
            action: {
                type: Button.VK_TYPE_LINK,
                link: 'https://test.ru',
                label: 'link',
                payload: 'test'
            }
        });
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VK_BUTTONS), vkButtons);
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
                    ActionBody: 'https://test.ru'
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '2'
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: 'https://test.ru'
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '3'
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: 'https://test.ru'
                },
            ]
        };
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VIBER_BUTTONS), viberButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        viberButtons.Buttons.push({
            Text: 'btn',
            ActionType: ViberButton.T_OPEN_URL,
            ActionBody: 'https://test.ru'
        },);
        viberButtons.Buttons.push({
            Text: 'link',
            ActionType: ViberButton.T_OPEN_URL,
            ActionBody: 'https://test.ru'
        },);
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_VIBER_BUTTONS), viberButtons);
    });

    it('Get buttons Telegram', () => {
        const telegramButtons: ITelegramKeyboard = {
            keyboard: [
                '1', '2', '3'
            ]
        };

        assert.deepEqual(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS), telegramButtons);

        defaultButtons.btns = [
            {
                title: 'btn',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];
        defaultButtons.links = [
            {
                title: 'link',
                url: 'https://test.ru',
                payload: 'test'
            }
        ];

        telegramButtons.inline_keyboard = [];
        telegramButtons.inline_keyboard.push({
            text: 'btn',
            url: 'https://test.ru',
            callback_data: 'test'
        });
        telegramButtons.inline_keyboard.push({
            text: 'link',
            url: 'https://test.ru',
            callback_data: 'test'
        });

        assert.deepEqual(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS), telegramButtons);

        defaultButtons.clear();
        assert.deepEqual(defaultButtons.getButtons(Buttons.T_TELEGRAM_BUTTONS), {remove_keyboard: true});
    });
});
