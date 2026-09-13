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
    IVkCard,
} from '../../src/plugins';
import { IViberCard } from '../../src/plugins/platforms/Viber/interfaces/IViberPlatform';

const botController = new BaseBotController();
botController.appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });

const URL = 'https://test.ru';

let appContext: AppContext;
describe('Card test', () => {
    let defaultCard: Card;
    beforeEach(() => {
        appContext = new AppContext();
        appContext.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
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
        // clear() сбрасывает и title/desc/template — заголовок выставляем
        // заново после очистки.
        defaultCard.title = 'title';
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

    it('не придумывает заголовки карточек Алисы и Маруси', async () => {
        defaultCard.clear();
        defaultCard.title = null;
        defaultCard.desc = null;
        defaultCard.addImage('123456', '', '');

        await expect(
            defaultCard.getCards(AlisaCard.cardProcessing, botController),
        ).resolves.toEqual({
            type: AlisaConstants.ALISA_CARD_ITEMS_LIST,
            items: [{ image_id: '123456', title: '', description: '' }],
        });
        await expect(
            defaultCard.getCards(MarusiaCard.cardProcessing, botController),
        ).resolves.toEqual({
            type: MarusiaConstants.MARUSIA_CARD_ITEMS_LIST,
            items: [{ image_id: 123456 }],
        });
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
        defaultCard.addImage('123456', '9');
        defaultCard.addImage('123456', '10');
        defaultCard.addImage('123456', '11');

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
            {
                title: '8',
                image_id: '123456',
            },
            {
                title: '9',
                image_id: '123456',
            },
            {
                title: '10',
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

    it('не отбрасывает BigImage Алисы без необязательного заголовка', async () => {
        defaultCard = new Card(appContext);
        defaultCard.addOneImage('123456');
        botController.appType = T_ALISA;

        await expect(
            defaultCard.getCards(AlisaCard.cardProcessing, botController),
        ).resolves.toEqual({
            type: AlisaConstants.ALISA_CARD_BIG_IMAGE,
            image_id: '123456',
            title: '',
            description: '',
        });
    });

    it('сохраняет документированный лимит описания BigImage Алисы в 1024 символа', async () => {
        defaultCard = new Card(appContext);
        defaultCard.addOneImage('123456', 'Изображение', 'x'.repeat(2_000));
        botController.appType = T_ALISA;

        const result = (await defaultCard.getCards(
            AlisaCard.cardProcessing,
            botController,
        )) as IAlisaBigImage;

        expect(result.description).toHaveLength(1024);
    });

    it('Get Marusia card', async () => {
        // Протокол скиллов Маруси: ItemsList — {type, items: [{image_id}]},
        // BigImage — {type, image_id}; image_id — integer. Заголовков, описаний,
        // header/footer и кнопок в карточках Маруси нет.
        const marusiaCard: IMarusiaItemsList = {
            type: MarusiaConstants.MARUSIA_CARD_ITEMS_LIST,
            items: [{ image_id: 123456 }, { image_id: 123456 }, { image_id: 123456 }],
        };
        botController.appType = T_ALISA;
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCard,
        );

        // Кнопка карточки в протоколе Маруси не поддерживается — карточка не меняется.
        defaultCard.button.addBtn('1', URL);
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCard,
        );

        defaultCard.isOne = true;
        const marusiaCardOne: IMarusiaBigImage = {
            type: MarusiaConstants.MARUSIA_CARD_BIG_IMAGE,
            image_id: 123456,
        };
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual(
            marusiaCardOne,
        );

        // Лимит ItemsList — 5 элементов; галерея (нет в протоколе) уходит ItemsList до 7.
        defaultCard.clear();
        for (let i = 0; i < 8; i++) {
            defaultCard.addImage('123456', `Запись ${i}`, `Описание ${i}`, 'Кнопка');
        }
        const list = (await defaultCard.getCards(
            MarusiaCard.cardProcessing,
            botController,
        )) as IMarusiaItemsList;
        expect(list.type).toBe(MarusiaConstants.MARUSIA_CARD_ITEMS_LIST);
        expect(list.items).toHaveLength(5);
        defaultCard.isUsedGallery = true;
        const gallery = (await defaultCard.getCards(
            MarusiaCard.cardProcessing,
            botController,
        )) as IMarusiaItemsList;
        expect(gallery.type).toBe(MarusiaConstants.MARUSIA_CARD_ITEMS_LIST);
        expect(gallery.items).toHaveLength(7);
    });

    it('Marusia: изображение без числового image_id пропускается', async () => {
        defaultCard.clear();
        defaultCard.addImage('photo-not-a-number', 'A', 'a');
        defaultCard.addImage('777', 'B', 'b');
        expect(await defaultCard.getCards(MarusiaCard.cardProcessing, botController)).toEqual({
            type: MarusiaConstants.MARUSIA_CARD_ITEMS_LIST,
            items: [{ image_id: 777 }],
        });
    });

    it('Get Viber card', async () => {
        // Columns — это доля сетки ButtonsGroupColumns = 6, которую занимает карточка,
        // а не количество карточек: три карточки встают по 2 колонки в один ряд,
        // одиночная растягивается на все 6.
        // Text заполняется даже без кнопки — иначе title/description молча теряются.
        // <br> разделяет заголовок и описание (3.1.0) — без него тексты склеивались.
        const viberCard: IViberCard[] = [
            {
                Columns: 2,
                Rows: 3,
                Image: '123456',
                ActionType: 'none',
                Text: '<font color=#000><b>1</b></font><br><font color=#000>запись: 1</font>',
            },
            {
                Columns: 2,
                Rows: 3,
                Image: '123456',
                ActionType: 'none',
                Text: '<font color=#000><b>2</b></font><br><font color=#000>запись: 2</font>',
            },
            {
                Columns: 2,
                Rows: 3,
                Image: '123456',
                ActionType: 'none',
                Text: '<font color=#000><b>3</b></font><br><font color=#000>запись: 3</font>',
            },
        ];
        botController.appType = T_VIBER;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard,
        );

        defaultCard.isOne = true;
        viberCard[0].Columns = 6;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard[0],
        );

        viberCard[0].ActionType = ViberButton.T_REPLY;
        viberCard[0].ActionBody = '1';
        const buttons = new Buttons(appContext);
        buttons.addBtn('1');
        defaultCard.images[0].button = buttons;
        expect(await defaultCard.getCards(ViberCard.cardProcessing, botController)).toEqual(
            viberCard[0],
        );

        defaultCard.isOne = false;
        viberCard[0].Columns = 2;
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

    it('ограничивает заголовок и описание VK-карусели 80 символами', async () => {
        botController.appType = T_VK;
        // С 3.1.0 VK требует минимум одну валидную кнопку на элемент галереи:
        // элемент без кнопки уходил в template без action/buttons, и VK
        // отклонял всю карусель. Кнопка не влияет на проверяемые лимиты текста.
        const vkButtons = new Buttons(appContext);
        vkButtons.addBtn('Открыть');
        defaultCard.images = [
            {
                imageToken: 'photo1_1',
                title: 't'.repeat(81),
                desc: 'd'.repeat(81),
                button: vkButtons,
                params: {},
            },
            {
                imageToken: 'photo1_2',
                title: 'Вторая',
                desc: 'Описание',
                button: vkButtons,
                params: {},
            },
        ];
        defaultCard.isUsedGallery = true;

        const result = (await defaultCard.getCards(
            VkCard.cardProcessing,
            botController,
        )) as IVkCard;

        expect(result.elements[0].title).toHaveLength(80);
        expect(result.elements[0].description).toHaveLength(80);
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
        expect(await defaultCard.getCards(MaxCard.cardProcessing, botController)).toEqual([
            { type: 'image', payload: { token: '123456' } },
            { type: 'image', payload: { token: '123456' } },
            { type: 'image', payload: { token: '123456' } },
        ]);
        defaultCard.clear();
        expect(await defaultCard.getCards(MaxCard.cardProcessing, botController)).toEqual(null);
    });

    it('clear() сбрасывает заголовок, описание и template — ничего не протекает в следующий запрос', async () => {
        // Регрессия 3.1.0: при переиспользовании контроллера (BotTest,
        // _setBotController) clear() ранее сбрасывал только изображения —
        // title/desc/template протекали из прошлого запроса в новый ответ.
        botController.appType = T_ALISA;
        defaultCard.template = {
            type: AlisaConstants.ALISA_CARD_ITEMS_LIST,
            items: [{ title: 'из прошлого запроса' }],
        };

        defaultCard.clear();
        expect(defaultCard.title).toBeNull();
        expect(defaultCard.desc).toBeNull();
        expect(defaultCard.template).toBeNull();
        expect(defaultCard.isOne).toBe(false);
        expect(defaultCard.isUsedGallery).toBe(false);

        // После clear() карточка без title не синтезирует заголовок ItemsList
        // (description включается всегда — вплоть до пустой строки, как и
        // у addOneImage без описания).
        defaultCard.addImage('123456', 'Свежая запись');
        await expect(
            defaultCard.getCards(AlisaCard.cardProcessing, botController),
        ).resolves.toEqual({
            type: AlisaConstants.ALISA_CARD_ITEMS_LIST,
            items: [{ title: 'Свежая запись', description: '', image_id: '123456' }],
        });
    });

    it('VK-галерея пропускает элементы без валидной кнопки — VK требует кнопку на элемент', async () => {
        // Регрессия 3.1.0: gallery-элемент без кнопок уходил в template без
        // action/buttons — VK отклонял всю карусель целиком. Теперь элемент
        // пропускается с warn (задокументировано в CHANGELOG 3.1.0).
        // Warn идёт через controller.appContext — шпионим на нём, а не на
        // локальном appContext из beforeEach.
        const warnSpy = jest
            .spyOn(botController.appContext, 'logWarn')
            .mockImplementation(() => {});
        botController.appType = T_VK;
        const vkButtons = new Buttons(appContext);
        vkButtons.addBtn('Открыть');
        defaultCard.images = [
            {
                imageToken: 'photo1_1',
                title: 'С кнопкой',
                desc: 'Описаниe 1',
                button: vkButtons,
                params: {},
            },
            {
                imageToken: 'photo1_2',
                title: 'Без кнопки',
                desc: 'Описание 2',
                button: new Buttons(appContext),
                params: {},
            },
        ];
        defaultCard.isUsedGallery = true;

        const result = (await defaultCard.getCards(
            VkCard.cardProcessing,
            botController,
        )) as IVkCard;

        // Элемент без кнопки не попал в карусель, валидный — остался.
        expect(result.type).toBe('carousel');
        expect(result.elements).toHaveLength(1);
        expect(result.elements[0].title).toBe('С кнопкой');
        // Пропуск сопровождается warn — разработчик видит причину.
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('без валидной кнопки — пропущен'),
        );
        warnSpy.mockRestore();
    });

    it('VK: выравнивает число кнопок у элементов карусели (одинаковая структура)', async () => {
        // VK отклоняет карусель целиком, если элементы различаются структурой
        // (первый элемент задаёт структуру остальных).
        const warnSpy = jest
            .spyOn(botController.appContext, 'logWarn')
            .mockImplementation(() => {});
        botController.appType = T_VK;
        const twoButtons = new Buttons(appContext);
        twoButtons.addBtn('Купить');
        twoButtons.addBtn('Подробнее');
        const oneButton = new Buttons(appContext);
        oneButton.addBtn('Подробнее');
        defaultCard.images = [
            { imageToken: 'photo1_1', title: 'A', desc: 'a', button: twoButtons, params: {} },
            { imageToken: 'photo1_2', title: 'B', desc: 'b', button: oneButton, params: {} },
        ];
        defaultCard.isUsedGallery = true;

        const result = (await defaultCard.getCards(
            VkCard.cardProcessing,
            botController,
        )) as IVkCard;

        expect(result.elements).toHaveLength(2);
        expect(result.elements.map((e) => e.buttons?.length)).toEqual([1, 1]);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('разное число кнопок'));
        warnSpy.mockRestore();
    });
});
