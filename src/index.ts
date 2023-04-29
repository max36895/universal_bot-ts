/**
 * Универсальное приложение по созданию голосовых приложений и ботов.
 * @version 1.1.8
 * @author Maxim-M maximco36895@yandex.ru
 */

// ===== Ядро приложения =====
export * from './core';
export * from './mmApp';

// ===== Взаимодействие с web api =====
export * from './api';

// ===== Второстепенные компоненты =====
export * from './components';

// ===== Поддерживаемы платформы =====
export * from './platforms';

// ===== Базовый контроллер для написания логики приложения =====
export * from './controller';

// ===== Модели для взаимодействия с бд =====
export * from './models';

// ===== Дополнительные утилиты =====
export * from './utils';
