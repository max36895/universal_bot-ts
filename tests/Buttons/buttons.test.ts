import { Buttons, AppContext } from '../../src';
import {
    AlisaButton,
    AlisaCard,
    MarusiaButton,
    MaxButton,
    TelegramButton,
    ViberButton,
    VkButton,
} from '../../src/plugins';
import { getButton } from '../../src/components/button/Button';

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
        appContext.platformParams.utm_text = null;
        let button = getButton(appContext, 'btn', 'https://google.com');
        expect(button?.url).toEqual(
            'https://google.com?utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );

        button = getButton(appContext, 'btn', 'https://google.com?utm_source=test');
        expect(button?.url).toEqual('https://google.com?utm_source=test');

        button = getButton(appContext, 'btn', 'https://google.com?data=test');
        expect(button?.url).toEqual(
            'https://google.com?data=test&utm_source=umBot&utm_medium=cpc&utm_campaign=phone',
        );

        appContext.platformParams.utm_text = 'my_utm_text';
        button = getButton(appContext, 'btn', 'https://google.com');
        expect(button?.url).toEqual('https://google.com?my_utm_text');
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

    it('Get buttons Marusia', () => {
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
        expect(defaultButtons.getButtons(MarusiaButton.buttonProcessing)).toEqual(alisaButtons);
    });

    it('Get buttons Vk', () => {
        const VkButtons = {
            one_time: true,
            buttons: [
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '1',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '1',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '2',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '2',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_TEXT,
                            label: '3',
                        },
                    },
                ],
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '3',
                        },
                    },
                ],
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
                [
                    {
                        action: {
                            type: VkButton.VK_TYPE_LINK,
                            link: DEFAULT_URL,
                            label: '3',
                        },
                    },
                ],
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
            inline_keyboard: [
                [{ text: '1', url: 'https://test.ru' }],
                [{ text: '2', url: 'https://test.ru' }],
                [{ text: '3', url: 'https://test.ru' }],
            ],
        };

        expect(defaultButtons.getButtons(TelegramButton.buttonProcessing)).toEqual(telegramButtons);
        defaultButtons.clear();
        expect(defaultButtons.getButtons(TelegramButton.buttonProcessing)).toEqual({
            remove_keyboard: true,
        });
    });

    it('Get buttons Telegram with style (inline callback) — style игнорируется для inline', () => {
        defaultButtons.clear();
        defaultButtons.addBtn('Подтвердить', null, { action: 'confirm' }, { style: 'primary' });
        defaultButtons.addBtn('Удалить', null, { action: 'delete' }, { style: 'destructive' });
        defaultButtons.addBtn('Отмена', null, { action: 'cancel' }, { style: 'secondary' });

        const result = defaultButtons.getButtons(TelegramButton.buttonProcessing);
        // style не поддерживается для InlineKeyboardButton, только для ReplyKeyboardButton
        expect(result).toEqual({
            inline_keyboard: [
                [{ text: 'Подтвердить', callback_data: '{"action":"confirm"}' }],
                [{ text: 'Удалить', callback_data: '{"action":"delete"}' }],
                [{ text: 'Отмена', callback_data: '{"action":"cancel"}' }],
            ],
        });
    });

    it('Get buttons Telegram with style (reply)', () => {
        defaultButtons.clear();
        defaultButtons.addBtn('ОК');
        defaultButtons.addBtn('Удалить', null, undefined, { style: 'destructive' });

        const result = defaultButtons.getButtons(TelegramButton.buttonProcessing);
        expect(result).toEqual({
            keyboard: [[{ text: 'ОК' }], [{ text: 'Удалить' }]],
        });
    });

    it('Get buttons Telegram with invalid style is ignored', () => {
        defaultButtons.clear();
        defaultButtons.addBtn('Кнопка', null, { action: 'test' }, { style: 'invalid_value' });

        const result = defaultButtons.getButtons(TelegramButton.buttonProcessing);
        expect(result).toEqual({
            inline_keyboard: [[{ text: 'Кнопка', callback_data: '{"action":"test"}' }]],
        });
    });

    it('Get buttons Telegram style not applied to url buttons', () => {
        defaultButtons.clear();
        defaultButtons.addLink('Ссылка', 'https://example.com', undefined, { style: 'primary' });

        const result = defaultButtons.getButtons(TelegramButton.buttonProcessing);
        expect(result).toEqual({
            inline_keyboard: [[{ text: 'Ссылка', url: 'https://example.com' }]],
        });
        // style не должен применяться к кнопкам-ссылкам
        expect(result!.inline_keyboard![0][0].style).toBeUndefined();
    });

    it('Get buttons Max', () => {
        const maxButtons = {
            buttons: [
                {
                    text: '1',
                    type: 'message',
                },
                {
                    text: '1',
                    type: 'link',
                    url: 'https://test.ru',
                },
                {
                    text: '2',
                    type: 'message',
                },
                {
                    text: '2',
                    type: 'link',
                    url: 'https://test.ru',
                },
                {
                    text: '3',
                    type: 'message',
                },
                {
                    text: '3',
                    type: 'link',
                    url: 'https://test.ru',
                },
            ],
        };

        expect(defaultButtons.getButtons(MaxButton.buttonProcessing)).toEqual(maxButtons);
        defaultButtons.clear();
        expect(defaultButtons.getButtons(MaxButton.buttonProcessing)).toEqual({
            buttons: [],
        });
    });

    it('Get buttons Max with payload as callback', () => {
        defaultButtons.clear();
        defaultButtons.addBtn('Run', null, { action: 'run' });

        expect(defaultButtons.getButtons(MaxButton.buttonProcessing)).toEqual({
            buttons: [
                {
                    text: 'Run',
                    type: 'callback',
                    payload: '{"action":"run"}',
                },
            ],
        });
    });

    // === Тесты на критические сценарии ===

    it('Telegram callback_data truncation when exceeding 64 bytes', () => {
        // Создаём payload, который при JSON.stringify превысит 64 байта
        const longPayload = {
            action: 'very_long_action_name_that_exceeds_the_limit_of_sixty_four_bytes',
            data: 'additional_data_to_make_it_even_longer',
        };
        defaultButtons.clear();
        defaultButtons.addBtn('Кнопка', null, longPayload);

        const result = defaultButtons.getButtons(TelegramButton.buttonProcessing);
        expect(result).toBeDefined();
        expect(result!.inline_keyboard).toBeDefined();
        expect(result!.inline_keyboard!.length).toBe(1);

        // Проверяем, что callback_data обрезан до 64 байт
        const callbackData = result!.inline_keyboard![0][0].callback_data as string;
        const byteLength = Buffer.byteLength(callbackData, 'utf8');
        expect(byteLength).toBeLessThanOrEqual(64);
    });

    it('VK button protected keys are not overwritten by options', () => {
        defaultButtons.clear();
        // Пытаемся перезаписать action.type через options
        defaultButtons.addBtn(
            'Текст',
            null,
            { test: 'data' },
            {
                action: { type: 'open_app', label: 'Hacked' },
            },
        );

        const result = defaultButtons.getButtons(VkButton.buttonProcessing);
        expect(result).toBeDefined();
        expect(result!.buttons.length).toBe(1);

        // @ts-expect-error что-то с типизацией
        const button = result?.buttons[0][0];
        // action.type должен остаться 'text', а не стать 'open_app'
        expect(button.action.type).toBe(VkButton.VK_TYPE_TEXT);
        // action.label должен остаться 'Текст', а не стать 'Hacked'
        expect(button.action.label).toBe('Текст');
    });

    it('UTM with URL fragment and existing params', () => {
        appContext.platformParams.utm_text = null;

        // URL с фрагментом
        const button1 = getButton(appContext, 'btn', 'https://example.com#section');
        expect(button1?.url).toBe(
            'https://example.com?utm_source=umBot&utm_medium=cpc&utm_campaign=phone#section',
        );

        // URL с существующими параметрами и фрагментом
        const button2 = getButton(appContext, 'btn', 'https://example.com?foo=bar#section');
        expect(button2?.url).toBe(
            'https://example.com?foo=bar&utm_source=umBot&utm_medium=cpc&utm_campaign=phone#section',
        );

        // URL с utm_source (не должен дублировать)
        const button3 = getButton(appContext, 'btn', 'https://example.com?utm_source=custom');
        expect(button3?.url).toBe('https://example.com?utm_source=custom');
    });
});
