/**
 * Модуль, в котором хранятся адаптеры для работы с базой данных.
 * Включает в себя адаптеры:
 *  - Файловая база данных
 *  - MongoDB
 *  А также базовый адаптер, от которого необходимо отнаследоваться для реализации своего адаптера для работы с базой данных
 */
export { Adapter as FileAdapter } from './File/Adapter';
export { Adapter as MongoAdapter } from './Mongo/Adapter';
export { Base as TemplateAdapter } from './Base/Base';
