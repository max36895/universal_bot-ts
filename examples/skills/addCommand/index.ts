import { BotTest } from '../../../src/test';
import { mmApp } from '../../../src/mmApp';
import skillDefaultConfig from '../../config/skillDefaultConfig';
import { StandardController } from './controller/StandardController';

const bot = new BotTest();
bot.initConfig(skillDefaultConfig());
const logic = new StandardController();
bot.initBotController(logic);

// Добавляем команду для отображения изображения
mmApp.addCommand('bigImage', ['картинка', 'изображен'], (_, botController) => {
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
mmApp.addCommand('list', ['список', 'галер'], (_, botController) => {
    if (botController) {
        botController.tts = 'Галерея из нескольких изображений';
        botController.card.title = 'Галерея';
        botController.card.addImage('565656/78878', 'Элемент с картинкой"', 'Описание изображения');
        botController.card.addImage(null, 'Элемент без изображения', 'Описание изображения');
        botController.card.button.addBtn('Текст в footer');
    }
});
// Добавляем команду для обработки сохранения
mmApp.addCommand('save', ['сохрани', 'save'], () => {
    return 'Сохранил!';
});
// Добавляем команду для повторения
mmApp.addCommand(
    'replay',
    ['*'],
    (userCommand) => {
        return userCommand;
    },
    true,
);
bot.test();
