import { TemplateCardTypes } from './TemplateCardTypes';
import { TelegramRequest } from '../../../api/TelegramRequest';
import { ImageTokens } from '../../../models/ImageTokens';
import { TTelegramChatId } from '../../../api';

/**
 * @interface ITelegramCard
 * Интерфейс для карточки в Телеграме.
 * Представляет собой опрос с вариантами ответов.
 *
 * Особенности:
 * - Поддерживает один вопрос и множество вариантов ответов
 * - Варианты ответов отображаются как кнопки
 * - Результаты опроса доступны в статистике
 * - Поддерживает анонимные и публичные опросы
 *
 * @example
 * ```typescript
 * // Создание простого опроса
 * const card: ITelegramCard = {
 *     question: 'Выберите категорию товара',
 *     options: ['Электроника', 'Одежда', 'Книги']
 * };
 *
 * // Создание опроса с эмодзи
 * const cardWithEmoji: ITelegramCard = {
 *     question: 'Какой товар вас интересует? 🛍️',
 *     options: ['📱 Смартфоны', '👕 Одежда', '📚 Книги']
 * };
 * ```
 */
export interface ITelegramCard {
    /**
     * Текст вопроса для опроса.
     * Отображается как заголовок опроса.
     *
     * Особенности:
     * - Поддерживает эмодзи и форматирование
     * - Рекомендуемая длина: до 300 символов
     * - Отображается жирным шрифтом
     *
     * @type {string}
     * @example
     * ```typescript
     * // Простой вопрос
     * question: 'Какой товар вас интересует?'
     *
     * // Вопрос с эмодзи
     * question: 'Выберите категорию товара 🛍️'
     *
     * // Вопрос с форматированием
     * question: 'Какой товар вас интересует?\nВыберите из списка ниже:'
     * ```
     */
    question: string;

    /**
     * Массив вариантов ответов для опроса.
     * Каждый элемент массива представляет собой один вариант ответа.
     *
     * Особенности:
     * - Минимум 2 варианта ответа
     * - Максимум 10 вариантов ответа
     * - Каждый вариант до 100 символов
     * - Поддерживает эмодзи
     *
     * @type {string[]}
     * @example
     * ```typescript
     * // Простые варианты
     * options: ['Да', 'Нет', 'Не знаю']
     *
     * // Варианты с эмодзи
     * options: ['✅ Да', '❌ Нет', '❓ Не знаю']
     *
     * // Варианты с описанием
     * options: [
     *     'Электроника (смартфоны, ноутбуки)',
     *     'Одежда (мужская, женская)',
     *     'Книги (художественные, учебные)'
     * ]
     * ```
     */
    options: string[];
}

/**
 * @class TelegramCard
 * Класс для создания и отображения карточек в Телеграме.
 * Наследуется от TemplateCardTypes и реализует специфичную для Телеграма логику.
 *
 * Основные возможности:
 * - Создание опросов с вариантами ответов
 * - Отправка изображений с подписями
 * - Обработка ошибок при работе с изображениями
 * - Автоматическое создание токенов для изображений
 * - Поддержка форматированного текста
 * - Логирование ошибок при обработке изображений
 *
 * @example
 * ```typescript
 * // Создание опроса с изображениями
 * const card = new TelegramCard();
 * card.title = 'Выберите категорию';
 * card.images = [
 *     new Image('electronics.jpg', 'Электроника', 'Описание электроники'),
 *     new Image('clothes.jpg', 'Одежда', 'Описание одежды')
 * ];
 * const result = await card.getCard(false);
 *
 * // Создание опроса с эмодзи
 * const cardWithEmoji = new TelegramCard();
 * cardWithEmoji.title = 'Выберите товар 🛍️';
 * cardWithEmoji.images = [
 *     new Image('phone.jpg', '📱 Смартфоны', 'Новейшие модели'),
 *     new Image('laptop.jpg', '💻 Ноутбуки', 'Мощные устройства')
 * ];
 * const resultWithEmoji = await cardWithEmoji.getCard(false);
 * ```
 */
export class TelegramCard extends TemplateCardTypes {
    /**
     * Получает карточку для отображения в Телеграме.
     * Преобразует изображения и их описания в формат опроса.
     *
     * Процесс работы:
     * 1. Обрабатывает каждое изображение:
     *    - Проверяет наличие токена
     *    - Если токена нет, создает его
     *    - Отправляет изображение в чат
     * 2. Собирает варианты ответов:
     *    - Использует заголовки изображений как варианты
     *    - Проверяет количество вариантов (минимум 2)
     * 3. Создает объект опроса:
     *    - Использует title как вопрос
     *    - Добавляет собранные варианты
     * 4. Обрабатывает ошибки:
     *    - Логирует ошибки в файл
     *    - Продолжает работу с остальными изображениями
     *
     * @param {boolean} _ - Флаг отображения одного элемента (не используется)
     * @returns {Promise<ITelegramCard | null>} Объект карточки или null, если нет вариантов
     * @throws {Error} При ошибках обработки изображений
     *
     * @example
     * ```typescript
     * const card = new TelegramCard();
     * card.title = 'Выберите товар';
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     *
     * // Получить опрос
     * const result = await card.getCard(false);
     * // result = {
     * //     question: 'Выберите товар',
     * //     options: ['Товар 1', 'Товар 2']
     * // }
     *
     * // Обработка ошибок
     * try {
     *     const result = await card.getCard(false);
     *     if (result) {
     *         // Обработка успешного результата
     *     } else {
     *         // Обработка случая, когда нет вариантов
     *     }
     * } catch (error) {
     *     // Обработка ошибок
     *     console.error('Ошибка при создании опроса:', error);
     * }
     * ```
     */
    public async getCard(_: boolean): Promise<ITelegramCard | null> {
        let object: ITelegramCard | null = null;
        const options: string[] = [];
        for (let i = 0; i < this.images.length; i++) {
            const image = this.images[i];
            try {
                if (!image.imageToken) {
                    if (image.imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.type = ImageTokens.T_TELEGRAM;
                        mImage.caption = image.desc;
                        mImage.path = image.imageDir;
                        image.imageToken = await mImage.getToken();
                    }
                } else {
                    await new TelegramRequest(this._appContext).sendPhoto(
                        this._appContext.platformParams.user_id as TTelegramChatId,
                        image.imageToken,
                        image.desc,
                    );
                }
                options.push(image.title);
            } catch (e) {
                // Логируем ошибку, но не прерываем цикл
                const error = `\n${Date} Ошибка при обработке изображения для Telegram: ${e}`;
                this._appContext.saveLog('TelegramCard.log', error);
            }
        }
        if (options.length > 1) {
            object = {
                question: this.title || '',
                options: options,
            };
        }
        return object;
    }
}
