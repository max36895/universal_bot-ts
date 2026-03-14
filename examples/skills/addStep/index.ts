import { BotTest } from '../../../src/test';
import { Text } from '../../../src/utils';
import { fullPlatforms } from '../../../src/plugins';
import skillDefaultConfig from '../../config/skillStorageConfig';

const bot = new BotTest();
bot.use(fullPlatforms); // Подключаем обработку для всех доступных платформ
// bot.use(new FileAdapter()); // Подключаем файловую базу данных
bot.setAppConfig(skillDefaultConfig());

// Добавляем команду для запуска первого шага
bot.addCommand('start_step', ['начать'], (_, botController) => {
    botController.text = 'Отлично, продолжаем?';
    botController.buttons.addBtn('Да').addBtn('Нет');
    botController.thisIntentName = 'step_1';
});

// Обрабатываем начальный шаг
bot.addStep('step_1', (botController) => {
    if (Text.isSayTrue(botController.userCommand || '')) {
        botController.text = 'Назови себя';
        botController.thisIntentName = 'step_2';
    } else {
        botController.text = 'Выходим из игры?';
        botController.buttons.addBtn('Да').addBtn('Нет');
        botController.thisIntentName = 'step_exit';
    }
});
// Обрабатываем шаг для выхода
bot.addStep('step_exit', (botController) => {
    if (Text.isSayTrue(botController.userCommand || '')) {
        botController.text = 'Пока, пока!!!';
        botController.isEnd = true;
    } else {
        botController.text = 'Отлично, продолжаем?';
        botController.buttons.addBtn('Да').addBtn('Нет');
        botController.thisIntentName = 'step_1';
    }
});
// Обрабатываем 2 шаг
bot.addStep('step_2', (botController) => {
    botController.text = `Приятно с тобой познакомиться, ${botController.userCommand}`;
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

bot.test({
    isShowResult: true,
    isShowTime: true,
    isShowStorage: true,
});
