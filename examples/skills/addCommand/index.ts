import { BotTest } from '../../../src/test';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
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
// Добавляем команду для повторения
bot.addCommand(
    'replay',
    ['*'],
    (userCommand) => {
        return userCommand;
    },
    true,
);
bot.test();
