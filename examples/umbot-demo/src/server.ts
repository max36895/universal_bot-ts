import { Bot } from 'umbot';
import { createCoffeeBot } from './index';
import { ICoffeeUserData } from './types/ICoffeeUserData';

/**
 * Webhook-режим для подключения реальных платформ.
 *
 * Дженерик `Bot<ICoffeeUserData>` делает userData типобезопасным
 * во всём приложении. Токены платформ читаются из переменных окружения:
 * TELEGRAM_TOKEN, ALISA_TOKEN, VK_TOKEN, VIBER_TOKEN, MAX_TOKEN и др.
 *
 * Запуск: `npm start` (порт можно переопределить переменной PORT).
 */
const bot = createCoffeeBot(new Bot<ICoffeeUserData>());

const port = Number(process.env.PORT) || 3000;
bot.start('localhost', port);
