/**
 * Консольный скрипт
 * =================
 *
 * Назначение
 * ----------
 * Скрипт предназначен для быстрого создания приложения.
 * Он способен создать шаблон приложения.
 *
 * Использование
 * -------------
 * Чтобы воспользоваться скриптом, запустите файл umbot.js, и передайте необходимые параметры.
 * ```bash
 * npm umbot
 * ```
 *
 * Команды
 * --------
 * На данный момент поддерживаются 1 команда:
 * - create - Создать проект
 *
 * При создании проекта, в качестве 2 параметра нужно передать либо название проекта на английском языке, либо json файл с конфигурацией.
 * При передаче json файла, можно создать шаблон приложения определенного типа. Сейчас поддерживается `quiz` - викторина, и пустой проект.
 *
 * Пример json файла
 * -----------------
 * ```json
 * {
 *  "name": "Название проекта (*)",
 *  "type": "Тип проекта. default, quiz",
 *  "config": ["Конфигурация для подключения к бд. Структуру смотри в mmApp.config"],
 *  "params": ["Параметры приложения. Структуру смотри в mmApp.params"],
 *  "path": "Директория, в которой будет создан проект. По умолчанию, проект создается в папке и именем проекта, в директории запуска скрипта."
 * }
 * ```
 * '*' - обозначены обязательные поля.
 *
 * Пример использования
 * --------------------
 * Создание пустого проекта:
 * ```bash
 * npm umbot create project
 * ```
 * Создание проекта, используя в качестве параметра json
 * ```json
 * {
 *  "name": "project",
 *  "type": "quiz"
 * }
 * ```
 * ```bash
 * npm umbot create project.json
 * ```
 * @module
 */
export * from './umbot'
export * from './utils'
export * from './controllers/ConsoleController';
export * from './controllers/CreateController';
