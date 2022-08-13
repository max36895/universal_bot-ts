/**
 * Универсальное приложение по созданию голосовых приложений и ботов.
 * @version 1.1.5
 * @author Maxim-M maximco36895@yandex.ru
 */

// ===== Ядро приложения =====
export * from './core';

// ===== Взаимодействие с web api =====
export * from './api';

// ===== Второстепенные компоненты =====
export * from './components';

// ===== Базовый контроллер для написания логики приложения =====
export * from './controller/BotController';

// ===== Модели для взаимодействия с бд =====
export * from './models';

// ===== Дополнительные утилиты =====
export * from './utils';
