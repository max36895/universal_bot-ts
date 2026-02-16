import {
    //Bot,
    WELCOME_INTENT_NAME,
    HELP_INTENT_NAME,
    FALLBACK_COMMAND,
    BotController,
    rand,
    IUserData,
} from 'umbot'; // Подключаем основной класс для работы приложения
import { BotTest as Bot } from 'umbot/test';
import { fullPlatforms, FileAdapter } from 'umbot/plugins'; // Подключаем все необходимые адаптеры

interface IGameControllerExample extends IUserData {
    example: string;
    result: number;
}

function getExample(): IGameControllerExample {
    const value1 = rand(0, 20);
    const value2 = rand(0, 20);
    if (rand(0, 1)) {
        return {
            example: `${value1} + ${value2} = ?`,
            result: value1 + value2,
        };
    } else {
        if (value1 < value2) {
            return {
                example: `${value2} - ${value1} = ?`,
                result: value2 - value1,
            };
        } else {
            return {
                example: `${value1} - ${value2} = ?`,
                result: value1 - value2,
            };
        }
    }
}

function game(botController: BotController<IGameControllerExample>): void {
    if (botController.userData.example) {
        // @ts-ignore
        if (botController.userData.result == botController.userCommand) {
            botController.text = 'Молодец! Это правильный ответ! Сколько будет: \n';
            botController.userData = getExample();
        } else {
            botController.text = 'Не совсем... Давай ещё раз!\n';
        }
    } else {
        botController.text = 'Сколько будет: \n';
        botController.userData = getExample();
    }
    botController.userData['isGame'] = true;
    botController.text += botController.userData['example'];
}

const bot = new Bot(); // Создаем класс с приложением
bot.setAppConfig({
    isLocalStorage: true, // Говорим что используем локальное хранилище платформы
});
bot.use(fullPlatforms); // Подключаем все доступные платформы
bot.use(new FileAdapter()); // Подключаем файловую базу данных
bot.addCommand(WELCOME_INTENT_NAME, ['привет'], (_, botController) => {
    botController.text = 'Привет! Давай поиграем в математику! Чтобы начать игру скажи играть.';
    botController.buttons.addBtn('Играть');
});
bot.addCommand(HELP_INTENT_NAME, ['помощ', 'помог'], (_, botController) => {
    botController.text = 'Это простая игра в математику!';
});
bot.addCommand('replay', ['повтор', 'еще раз'], (_, botController) => {
    if (botController.userData['example']) {
        botController.text = `Повторяю твой пример:\n${botController.userData.example}`;
    } else {
        botController.text = 'Начни игру!';

        botController.buttons.addBtn('Начать игру');
    }
});
bot.addCommand('game', ['игра', 'начать игру'], (_, botController) => {
    game(botController as BotController<IGameControllerExample>);
});
bot.addCommand('by', ['пока'], (_, botController) => {
    botController.text = 'Пока пока!';
    botController.isEnd = true;
});
bot.addCommand(FALLBACK_COMMAND, [], (_, botController) => {
    if (!botController.userData['isGame']) {
        botController.text = 'Извини, я тебя не понимаю...' + 'Если хочешь поиграть, скажи играть';
        botController.buttons.addBtn('Играть');
    } else {
        game(botController as BotController<IGameControllerExample>);
    }
});
// Для запуска приложения в консоли
const params = {
    isShowResult: true,
    isShowStorage: true,
    isShowTime: true,
};
bot.test(params);
//bot.start('localhost', 3000); // Запускам приложения
