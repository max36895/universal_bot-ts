import { AppContext, Card } from '../../../src';
import { SmartAppCard } from '../../../src/plugins';

describe('SmartApp Card', () => {
    it('формирует actions массивом и не отправляет пустые обязательные тексты', async () => {
        const context = new AppContext();
        context.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        const card = new Card(context);
        card.addImage('https://example.com/image.jpg', '', '', {
            title: 'Открыть',
            payload: 'open',
        });

        const result = await card.getCards(SmartAppCard.cardProcessing);
        const item = result?.card?.cells?.[0];

        expect(item?.left?.texts?.title.text).toBe('Открыть');
        expect(item?.left).not.toHaveProperty('label');
        expect(item?.left).not.toHaveProperty('icon_and_value');
        expect(item?.actions).toEqual([expect.objectContaining({ text: 'Открыть' })]);
    });

    it('не отправляет локальный путь как URL и использует подпись deep-link разработчика', async () => {
        const context = new AppContext();
        context.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        const card = new Card(context);
        card.isOne = true;
        card.addImage('C:\\private\\image.jpg', '', '', {
            title: 'Сайт',
            url: 'https://example.com',
        });

        const result = await card.getCards(SmartAppCard.cardProcessing);
        const cells = result?.card?.cells ?? [];

        expect(cells).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ type: 'image_cell_view' })]),
        );
        expect(cells[0]?.content).toEqual(
            expect.objectContaining({ text: 'Сайт', actions: [expect.any(Object)] }),
        );
    });
});
