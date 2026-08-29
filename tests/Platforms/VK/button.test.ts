import { AppContext } from '../../../src';
import { VkButton } from '../../../src/plugins';

describe('VK Button', () => {
    let appContext: AppContext;

    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
    });

    describe('buttonProcessing', () => {
        it('создаёт текстовую кнопку с payload', () => {
            const result = VkButton.buttonProcessing(
                [{ title: 'Купить', payload: { action: 'buy' }, options: {} }],
                appContext,
            );

            expect(result).toEqual({
                one_time: true,
                buttons: [
                    [
                        {
                            action: {
                                type: 'text',
                                label: 'Купить',
                                payload: '{"action":"buy"}',
                            },
                        },
                    ],
                ],
            });
        });

        it('vkpay: hash размещается внутри action, а не на верхнем уровне кнопки', () => {
            // По документации VK API hash у vkpay-кнопки — поле action.
            // Верхнеуровневый hash — недокументированное поле, VK отклонял
            // всю клавиатуру ошибкой 100.
            const result = VkButton.buttonProcessing(
                [
                    {
                        title: 'Оплатить',
                        type: 'vkpay',
                        payload: { hash: 'action=pay-to-group&group_id=1' },
                        options: {},
                    },
                ],
                appContext,
            );

            const button = (result as { buttons: Array<Array<Record<string, unknown>>> })
                .buttons[0][0];
            expect(button.action).toEqual({
                type: 'vkpay',
                label: 'Оплатить',
                payload: '{"hash":"action=pay-to-group&group_id=1"}',
                hash: 'action=pay-to-group&group_id=1',
            });
            expect(button.hash).toBeUndefined();
        });

        it('vkpay: без hash в payload поле hash не отправляется (не было hash: null)', () => {
            const result = VkButton.buttonProcessing(
                [{ title: 'Оплатить', type: 'vkpay', options: {} }],
                appContext,
            );

            const button = (result as { buttons: Array<Array<Record<string, unknown>>> })
                .buttons[0][0];
            expect(button.hash).toBeUndefined();
            expect(JSON.stringify(button)).not.toContain('"hash"');
        });

        it('кнопка с пустым title пропускается', () => {
            const result = VkButton.buttonProcessing([{ title: '   ', options: {} }], appContext);

            expect(result).toBeNull();
        });
    });
});
