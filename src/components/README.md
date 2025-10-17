# Компоненты umbot

## Обзор

Компоненты umbot разделяются на две основные категории:

1. **Системные компоненты**
    - Отвечают за корректное отображение UI элементов
    - Управляют взаимодействием с пользователем
    - Доступны через `BotController`

2. **Дополнительные компоненты**
    - Упрощают разработку
    - Предоставляют дополнительный функционал
    - Могут использоваться напрямую

## Системные компоненты

### Основные элементы

| Компонент | Описание                               | Доступ через   |
| --------- | -------------------------------------- | -------------- |
| Кнопки    | Интерактивные элементы управления      | `this.buttons` |
| Карточки  | Структурированное отображение контента | `this.card`    |
| NLU       | Обработка естественного языка          | `this.nlu`     |
| Звуки     | Управление аудио контентом             | `this.sound`   |

⚠️ **Важно**: Рекомендуется использовать системные компоненты только через `BotController`, а не напрямую.

## Дополнительные компоненты

### Navigation

Компонент для удобной навигации по элементам меню и спискам.

#### Основные возможности

- Постраничная навигация по элементам
- Отслеживание выбранных элементов
- Поддержка команд "Дальше" и "Назад"
- Работа с различными типами данных

#### Примеры использования

##### Базовая навигация

```typescript
import { Navigation } from 'umbot';

const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const maxVisibleElements = 5;
const nav = new Navigation(maxVisibleElements);

// Получение элементов текущей страницы
const showElements = nav.getPageElements(elements);
console.log(showElements); // -> [1,2,3,4,5]
```

##### Навигация с командами

```typescript
import { Navigation } from 'umbot';

const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const maxVisibleElements = 5;
const nav = new Navigation(maxVisibleElements);

// Первая страница
let showElements = nav.getPageElements(elements, 'Спасибо');
console.log(showElements); // -> [1,2,3,4,5]

// Переход на следующую страницу
showElements = nav.getPageElements(elements, 'Дальше');
console.log(showElements); // -> [6,7,8,9,0]

// Возврат на предыдущую страницу
showElements = nav.getPageElements(elements, 'Назад');
console.log(showElements); // -> [1,2,3,4,5]
```

##### Работа с текущей страницей

```typescript
import { Navigation } from 'umbot';

const elements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const maxVisibleElements = 5;
const nav = new Navigation(maxVisibleElements);

// Установка текущей страницы
nav.thisPage = 1;

// Попытка перейти дальше последней страницы
let showElements = nav.getPageElements(elements, 'Дальше');
console.log(nav.thisPage); // -> 1 (остаемся на последней странице)

// Возврат на первую страницу
showElements = nav.getPageElements(elements, 'Назад');
console.log(nav.thisPage); // -> 0
```

##### Работа со сложными объектами

```typescript
import { Navigation } from 'umbot';

interface MenuItem {
    title: string;
    desc: string;
}

const elements: MenuItem[] = [
    {
        title: 'title 1',
        desc: 'desc 1',
    },
    {
        title: 'title 2',
        desc: 'desc 2',
    },
    {
        title: 'title 3',
        desc: 'desc 3',
    },
    {
        title: 'title 4',
        desc: 'desc 4',
    },
];

const maxVisibleElements = 2;
const nav = new Navigation(maxVisibleElements);

// Поиск элемента по значению поля
let selectedElement = nav.selectedElement(elements, 'title 1', 'title');
console.log(selectedElement); // -> {title: 'title 1', desc: 'desc 1'}

// Поиск на другой странице
nav.thisPage = 1;
selectedElement = nav.selectedElement(elements, 'title 4', 'title');
console.log(selectedElement); // -> {title: 'title 4', desc: 'desc 4'}
```

### Методы Navigation

| Метод             | Описание                             | Параметры                                                                                      |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `getPageElements` | Получение элементов текущей страницы | `elements`: массив элементов<br>`command?`: команда навигации                                  |
| `selectedElement` | Поиск выбранного элемента            | `elements`: массив элементов<br>`value`: искомое значение<br>`key?`: ключ для поиска в объекте |
| `setPage`         | Установка текущей страницы           | `page`: номер страницы                                                                         |

## Лучшие практики

1. **Системные компоненты**:
    - Всегда используйте через `BotController`
    - Не модифицируйте напрямую
    - Следите за актуальностью состояния

2. **Navigation**:
    - Инициализируйте с оптимальным размером страницы
    - Проверяйте границы при навигации
    - Используйте типизацию для сложных объектов

3. **Общие рекомендации**:
    - Документируйте кастомные компоненты
    - Следите за обработкой ошибок
    - Используйте TypeScript для лучшей поддержки
