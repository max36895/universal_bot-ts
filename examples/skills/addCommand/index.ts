import { BotTest } from 'umbot/test';
import { fullPlatforms, FileAdapter } from 'umbot/plugins';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.use(fullPlatforms); // Подключаем обработку для всех доступных платформ
bot.use(new FileAdapter()); // Подключаем файловую базу данных
bot.setAppConfig(skillDefaultConfig());
bot.initBotController(StandardController);

// Добавляем команду для отображения изображения
bot.addCommand('bigImage', ['картинка', 'изображен'], (_, botController) => {
    if (botController) {
        botController.text = '';
        botController.tts = 'Большая картинка';
        botController.card.addImage(
            '565656/78878',
            'Заголовок изображения',
            'Описание изображения',
        );
    }
});
// Добавляем команду для отображения списка изображений
bot.addCommand('list', ['список', 'галер'], (_, botController) => {
    if (botController) {
        botController.tts = 'Галерея из нескольких изображений';
        botController.card.title = 'Галерея';
        botController.card.addImage('565656/78878', 'Элемент с картинкой"', 'Описание изображения');
        botController.card.addImage(null, 'Элемент без изображения', 'Описание изображения');
        botController.card.button.addBtn('Текст в footer');
    }
});
// Добавляем команду для обработки сохранения
bot.addCommand('save', ['сохрани', 'save'], () => {
    return 'Сохранил!';
});

bot.addCommand('reg', [/^\d+$/], (userCommand, bController) => {
    bController.text = `Вы ввели число "${userCommand}"`;
});

// Добавляем команду для выхода
bot.addCommand('exit', ['пока'], (_, bController) => {
    bController.isEnd = true;
    bController.text = 'Пока, пока!';
});

// Добавляем команду для повторения
bot.addCommand(
    '*',
    [],
    (userCommand) => {
        return userCommand;
    },
    true,
);

bot.test();
