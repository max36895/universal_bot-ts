import { Button, Buttons, AppContext } from '../../src';
import { AlisaButton, AlisaCard, TelegramButton, ViberButton, VkButton } from '../../src/plugins';

const DEFAULT_URL = 'https://test.ru';

let appContext: AppContext;
describe('Buttons test', () => {
    let defaultButtons: Buttons;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.platformParams.utm_text = '';
        defaultButtons = new Buttons(appContext);
        for (let i = 0; i < 3; i++) {
            defaultButtons.addBtn(`${i + 1}`);
            defaultButtons.addLink(`${i + 1}`, DEFAULT_URL);
        }
    });

    it('Button utm text', () => {
        const button = new Button();
        button.setAppContext(appContext);
        appContext.platformParams.utm_text = null;
        button.initBtn('btn', 'https://google.com');
        expect(button.url).toEqual(
            'https://google.com?utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );

        button.initBtn('btn', 'https://google.com?utm_source=test');
        expect(button.url).toEqual('https://google.com?utm_source=test');

        button.initBtn('btn', 'https://google.com?data=test');
        expect(button.url).toEqual(
            'https://google.com?data=test&utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );

        appContext.platformParams.utm_text = 'my_utm_text';
        button.initBtn('btn', 'https://google.com');
        expect(button.url).toEqual('https://google.com?my_utm_text');
    });

    it('Get buttons Alisa', () => {
        const alisaButtons = [
            {
                title: '1',
                hide: true,
            },
            {
                title: '1',
                hide: false,
                url: DEFAULT_URL,
            },
            {
                title: '2',
                hide: true,
            },
            {
                title: '2',
                hide: false,
                url: DEFAULT_URL,
            },
            {
                title: '3',
                hide: true,
            },
            {
                title: '3',
                hide: false,
                url: DEFAULT_URL,
            },
        ];
        expect(defaultButtons.getButtons(AlisaButton.buttonProcessing)).toEqual(alisaButtons);
    });
    it('Get buttons Alisa card', () => {
        expect(defaultButtons.getButtons(AlisaCard.alisaCardButton)).toEqual({
            text: '1',
        });
    });

    it('Get buttons Vk', () => {
        const VkButtons = {
            one_time: true,
            buttons: [
                {
                    action: {
                        type: VkButton.VK_TYPE_TEXT,
                        label: '1',
                    },
                },
                {
                    action: {
                        type: VkButton.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '1',
                    },
                },
                {
                    action: {
                        type: VkButton.VK_TYPE_TEXT,
                        label: '2',
                    },
                },
                {
                    action: {
                        type: VkButton.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '2',
                    },
                },
                {
                    action: {
                        type: VkButton.VK_TYPE_TEXT,
                        label: '3',
                    },
                },
                {
                    action: {
                        type: VkButton.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '3',
                    },
                },
            ],
        };
        expect(defaultButtons.getButtons(VkButton.buttonProcessing)).toEqual(VkButtons);

        defaultButtons.clear();
        expect(defaultButtons.getButtons(VkButton.buttonProcessing)).toEqual({
            one_time: false,
            buttons: [],
        });
    });
    it('Get buttons Vk group', () => {
        const VkButtons = {
            one_time: true,
            buttons: [
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '1',
                            payload: '{}',
                        },
                    },
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '1',
                            payload: '{}',
                        },
                    },
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '2',
                            payload: '{}',
                        },
                    },
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '2',
                            payload: '{}',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '3',
                            payload: '{}',
                        },
                    },
                ],
                {
                    action: {
                        type: VkButton.VK_TYPE_LINK,
                        link: DEFAULT_URL,
                        label: '3',
                    },
                },
            ],
        };
        defaultButtons.clear();
        defaultButtons.addBtn('1', null, {}, { [VkButton.GROUP_NAME]: 0 });
        defaultButtons.addLink('1', DEFAULT_URL, {}, { [VkButton.GROUP_NAME]: 0 });
        defaultButtons.addBtn('2', null, {}, { [VkButton.GROUP_NAME]: 0 });
        defaultButtons.addLink('2', DEFAULT_URL, {}, { [VkButton.GROUP_NAME]: 0 });

        defaultButtons.addBtn('3', null, {}, { [VkButton.GROUP_NAME]: 1 });
        defaultButtons.addLink('3', DEFAULT_URL);
        expect(defaultButtons.getButtons(VkButton.buttonProcessing)).toEqual(VkButtons);
    });

    it('Get buttons Viber', () => {
        const viberButtons = {
            DefaultHeight: true,
            BgColor: '#FFFFFF',
            Buttons: [
                {
                    Text: '1',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '1',
                },
                {
                    Text: '1',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL,
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '2',
                },
                {
                    Text: '2',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL,
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_REPLY,
                    ActionBody: '3',
                },
                {
                    Text: '3',
                    ActionType: ViberButton.T_OPEN_URL,
                    ActionBody: DEFAULT_URL,
                },
            ],
        };
        expect(defaultButtons.getButtons(ViberButton.buttonProcessing)).toEqual(viberButtons);
    });

    it('Get buttons Telegram', () => {
        const telegramButtons = {
            keyboard: ['1', '2', '3'],
        };

        expect(defaultButtons.getButtons(TelegramButton.buttonProcessing)).toEqual(telegramButtons);
        defaultButtons.clear();
        expect(defaultButtons.getButtons(TelegramButton.buttonProcessing)).toEqual({
            remove_keyboard: true,
        });
    });
});
