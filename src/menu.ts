import type { Context, MiddlewareFn, MiddlewareObj } from "@maxhub/max-bot-api";
import { Keyboard } from "@maxhub/max-bot-api";
import { resolve } from "./utils.js";
import type { MenuControlPanel, Middleware } from "./types.js";

declare module "@maxhub/max-bot-api"
{
    interface Context {
        menu: MenuControlPanel<this>;
        reply(text: string, options?: { attachments?: (Menu<any> | any)[] }): Promise<any>;
    }
}

type MaybePromise<T> = T | Promise<T>;
type Dynamic<C, T> = T | ((ctx: C) => MaybePromise<T>);
type MenuKeyboard = ReturnType<typeof Keyboard.inlineKeyboard>;
type RawButton = Parameters<typeof Keyboard.inlineKeyboard>[0][number][number];
type DynamicObject<C, T> = { [K in keyof T]: T[K] | ((ctx: C) => MaybePromise<T[K]>) };

const menuRegistry = new Map<string, Menu<any>>();

/**
 * Определяет скрытое свойство объекта, которое не видно при перечислении
 * @param obj - объект, к которому добавляется свойство
 * @param key - имя свойства
 * @param value - значение свойства
 * @example
 * defineHidden(ctx, '__menu', menuInstance);
 */
function defineHidden(obj: any, key: string, value: any) {
    Object.defineProperty(obj, key,
        {
            value,
            enumerable: false,
            configurable: true,
            writable: true,
        });
}

/**
 * Нормализует вложения, преобразуя экземпляры Menu в отрендеренные клавиатуры
 * @param ctx - контекст бота
 * @param attachments - массив вложений для нормализации
 * @returns нормализованный массив вложений
 */
async function normalizeAttachments(ctx: any, attachments?: any[]) {
    if (!attachments) return attachments;

    return Promise.all(
        attachments.map(async (a) => {
            if (a instanceof Menu) {
                return await a.render(ctx);
            }
            return a;
        })
    );
}

/**
 * Создаёт кнопку меню с поддержкой динамических значений
 * @template C - тип контекста
 * @template T - тип кнопки
 * @param button - объект кнопки с потенциально динамическими значениями
 * @returns объект MenuButton с методом render
 * @example
 * const btn = createButton({ text: "Нажми", type: "callback", payload: "action:1" });
 */
function createButton<C extends Context, T extends RawButton>(button: DynamicObject<C, T>): MenuButton<C> {
    return {
        async render(ctx: C): Promise<RawButton> {
            const rendered: any = {};

            for (const [key, value] of Object.entries(button)) {
                rendered[key] = await resolve(value as any, ctx);
            }
            return rendered;
        }
    };
}


interface MenuButton<C extends Context> {
    render(ctx: C): Promise<RawButton>;
}

export class MenuRange<C extends Context> {
    protected rows: MenuButton<C>[][] = [[]];
    protected menu?: Menu<C>;

    constructor(menu?: Menu<C>) { this.menu = menu }

    /**
     * Добавляет кнопку в текущую строку меню
     * @param btn - кнопка для добавления
     */
    protected add(btn: MenuButton<C>) { this.rows[this.rows.length - 1].push(btn) }

    /**
     * Создаёт новую строку в меню
     * @returns текущий объект MenuRange для цепочки вызовов
     * @example
     * menu.text("Кнопка 1").row().text("Кнопка 2");
     * // Результат: две кнопки на разных строках
     */
    row() {
        this.rows.push([]);
        return this;
    }

    /**
     * Добавляет текстовую кнопку обратного вызова
     * @param text - текст кнопки (может быть динамическим)
     * @param middleware - middleware функции для обработки клика
     * @returns текущий объект MenuRange для цепочки вызовов
     * @throws {Error} если MenuRange не имеет родительского Menu
     * @example
     * menu.text("Нажми меня", async (ctx, next) => {
     *   await ctx.reply("Ты нажал кнопку!");
     * });
     * // С динамическим текстом:
     * menu.text((ctx) => `Привет, ${ctx.from?.first_name}!`, handler);
     */
    text(text: Dynamic<C, string>, ...middleware: Middleware<C>[]) {
        if (!this.menu) { throw new Error("MenuRange requires parent Menu") }

        const action = this.menu.createAction();
        const payload = `${this.menu.id}:${action}`;

        this.menu.registerHandler(action, middleware);

        this.add(createButton({ text, type: "callback", payload, intent: "positive" }));

        return this;
    }

    /**
     * Добавляет кнопку ссылки
     * @param text - текст кнопки (может быть динамическим)
     * @param url - URL адрес (может быть динамическим)
     * @returns текущий объект MenuRange для цепочки вызовов
     * @example
     * menu.url("Сайт", "https://example.com");
     */
    url(text: Dynamic<C, string>, url: Dynamic<C, string>): this {
        this.add(createButton({ type: "link", text, url }));
        return this;
    }

    /**
     * Добавляет кнопку открытия приложения
     * @param text - текст кнопки (может быть динамическим)
     * @param app - идентификатор приложения (может быть динамическим)
     * @returns текущий объект MenuRange для цепочки вызовов
     */
    openApp(text: Dynamic<C, string>, app: Dynamic<C, string>): this {
        this.add(createButton({ type: "open_app", text, webApp: app }));
        return this;
    }

    /**
     * Добавляет кнопку для запроса контактов
     * @param text - текст кнопки (может быть динамическим)
     * @returns текущий объект MenuRange для цепочки вызовов
     */
    contact(text: Dynamic<C, string>): this {
        this.add(createButton({ type: "request_contact", text }));
        return this;
    }

    /**
     * Добавляет кнопку сообщения
     * @param text - текст кнопки (может быть динамическим)
     * @returns текущий объект MenuRange для цепочки вызовов
     */
    message(text: Dynamic<C, string>): this {
        this.add(createButton({ type: "message", text }));
        return this;
    }

    /**
     * Добавляет кнопку для запроса геолокации
     * @param text - текст кнопки (может быть динамическим)
     * @param quick - флаг быстрого запроса геолокации
     * @returns текущий объект MenuRange для цепочки вызовов
     */
    geoLocation(text: Dynamic<C, string>, quick?: boolean): this {
        this.add(createButton({ type: "request_geo_location", text, quick }));
        return this;
    }

    /**
     * Возвращает построенную структуру меню (строки с кнопками)
     * @returns двумерный массив кнопок меню
     */
    build() { return this.rows }
}
/**
 * Основной класс для создания и управления меню бота
 * @param id - идентификатор меню 
 * @example
 * const mainMenu = new Menu("main");
 * 
 *  mainMenu.text((ctx) => `Привет, ${ctx.user?.name}!`, async (ctx) => ctx.reply("Привет!"))
 *  mainMenu.text("Привет", async (ctx) => ctx.reply("Привет!"))
 * .url("Сайт", "https://example.com").row()
 * .contact("Поделиться контактом")
 * .geoLocation("Поделиться геолокацией");
 * 
 * bot.use(mainMenu);
 * bot.api.setMyCommands([{name: 'menu', description: 'Меню бота'}]);
 * bot.command('start', async (ctx) => return ctx.reply(`Главное меню`, {attachments: [mainMenu]} ));
 * 
 */
export class Menu<C extends Context> extends MenuRange<C> implements MiddlewareObj<C> {
    id: string;
    parent?: string;

    private handlers = new Map<string, Middleware<C>[]>();

    constructor(id: string) {
        super();
        this.id = id;
        this.menu = this;
        menuRegistry.set(id, this);
    }

    /**
     * Устанавливает активное меню в контексте
     * @param ctx - контекст бота
     * @param menu - меню для установки как активное
     * @example
     * this.setActiveMenu(ctx, settingsMenu);
     */
    private setActiveMenu(ctx: C, menu: Menu<C>) { defineHidden(ctx, "__menu", menu) }

    /**
     * Создаёт уникальный идентификатор действия для обработчика
     * @returns строка идентификатора действия
     * @example
     * const action = menu.createAction(); // "main_0", "main_1", ...
     */
    createAction() { return `${this.id}_${this.handlers.size}` }

    /**
     * Регистрирует обработчик для действия
     * @param action - идентификатор действия
     * @param middleware - массив middleware функций для обработки
     * @example
     * menu.registerHandler("main_0", [async (ctx, next) => {
     *   await ctx.reply("Обработан!");
     *   await next();
     * }]);
     */
    registerHandler(action: string, middleware: Middleware<C>[]) { this.handlers.set(action, middleware) }

    /**
     * Регистрирует подменю в текущем меню
     * @param menu - меню для регистрации
     * @param parent - идентификатор родительского меню (если не указан, используется текущее меню)
     * @returns текущий объект Menu для цепочки вызовов
     * @example
     * const mainMenu = new Menu("main");
     * const helpMenu = new Menu("help");
     * mainMenu.register(helpMenu); // helpMenu.parent = "main"
     */
    register(menu: Menu<C>, parent?: string) {
        menu.parent = parent ?? this.id;
        menuRegistry.set(menu.id, menu);
        return this;
    }

    /**
     * Добавляет динамическую кнопку с функцией-конструктором
     * @param builder - функция, которая динамически генерирует кнопки на основе контекста
     * @returns текущий объект Menu для цепочки вызовов
     * @example
     * menu.dynamic((ctx, range) => {
     *   if (ctx.from?.is_admin) {
     *     range.text("🔧 Админ панель");
     *   }
     *   range.text("📊 Статус");
     * });
     */
    dynamic(builder: (ctx: C, range: MenuRange<C>) => MaybePromise<any>) {
        const row = this.rows.length - 1;
        const dynamicButton: MenuButton<C> =
        {
            async render(ctx: C): Promise<any> { return null }
        };

        defineHidden(dynamicButton, "__dynamic", builder);

        this.rows[row].push(dynamicButton);

        return this;
    }

    /**
     * Добавляет кнопку подменю, переходящую на другое меню
     * @param text - текст кнопки (может быть динамическим)
     * @param to - идентификатор целевого меню
     * @param middleware - middleware функции для обработки перед переходом
     * @returns текущий объект Menu для цепочки вызовов
     * @example
     * const mainMenu = new Menu("main");
     * const settingsMenu = new Menu("settings");
     * mainMenu.submenu("⚙️ Настройки", "settings");
     * mainMenu.register(settingsMenu);
     * bot.use(mainMenu);
     * 
     */
    submenu(text: Dynamic<C, string>, to: string, ...middleware: Middleware<C>[]) {
        return this.text(text, async (ctx, next) => {
            for (const fn of middleware) {
                await fn(ctx, next);
            }

            await ctx.menu.nav(to);
        });
    }

    /**
     * Добавляет кнопку для возврата к родительскому меню
     * @param text - текст кнопки (может быть динамическим)
     * @returns текущий объект Menu для цепочки вызовов
     * @example
     * menu.back("🔙 Назад");
     */
    back(text: Dynamic<C, string>) {
        return this.text(text, async (ctx) => await ctx.menu.back());
    }

    /**
     * Отрендеривает меню в объект клавиатуры
     * @param ctx - контекст бота
     * @returns отрендеренная клавиатура для отправки
     * @example
     * const keyboard = await menu.render(ctx);
     * await ctx.reply("Выберите действие:", { attachments: [keyboard] });
     */
    async render(ctx: C): Promise<MenuKeyboard> {
        const rows: RawButton[][] = [];

        for (const row of this.rows) {
            const renderedRow: RawButton[] = [];

            for (const btn of row) {
                const dynamic = (btn as any).__dynamic;

                if (dynamic) {
                    const range = new MenuRange<C>(this);

                    await dynamic(ctx, range);

                    const built = range.build();

                    for (const sub of built) {
                        const rr = await Promise.all(sub.map(x => x.render(ctx)));
                        rows.push(rr);
                    }

                    continue;
                }

                renderedRow.push(await btn.render(ctx));
            }

            if (renderedRow.length) rows.push(renderedRow);
        }

        return Keyboard.inlineKeyboard(rows);
    }

    /**
     * Обрабатывает действие кнопки меню
     * @param ctx - контекст бота
     * @param action - идентификатор действия для обработки
     * @example
     * // Вызывается автоматически при нажатии на кнопку
     * await menu.handle(ctx, "main_0");
     */
    async handle(ctx: C, action: string) {
        const handlers = this.handlers.get(action);

        if (!handlers?.length) return;

        let i = 0;
        const next = async () => {
            const fn = handlers[i++];
            if (fn) await fn(ctx, next);
        };

        await next();
    }

    /**
     * Возвращает middleware функцию для интеграции меню в бота
     * @returns middleware функция для регистрации в боте
     * @example
     * const menu = new Menu("main");
     * menu.text("Привет", async (ctx) => ctx.reply("Привет!"));
     * bot.use(menu.middleware());
     */
    middleware(): MiddlewareFn<C> {
        return async (ctx, next) => {
            const originalReply = ctx.reply.bind(ctx);

            ctx.reply = async (text: string, options: any = {}) => {
                if (options.attachments) {
                    options.attachments = await normalizeAttachments(ctx, options.attachments);
                }
                return originalReply(text, options);
            };

            defineHidden(ctx, "menu", this.createControl(ctx));

            if (ctx.updateType === "message_callback") {
                const payload = ctx.callback?.payload;

                if (payload) {
                    const [menuId, action] = payload.split(":");
                    const menu = menuRegistry.get(menuId);

                    if (menu) {
                        this.setActiveMenu(ctx, menu);
                        await menu.handle(ctx, action);
                        ctx.menu.update().catch(console.error);
                        ctx.answerOnCallback({ notification: "Callback handled" });
                        return;
                    }
                }
            }

            await next();
        };
    }

    /**
     * Создаёт панель управления меню для контекста
     * @param ctx - контекст бота
     * @returns объект с методами управления меню (update, nav, back, close)
     * @example
     * await ctx.menu.nav("settings"); // Перейти на меню settings
     * await ctx.menu.back();  // Вернуться на предыдущее меню
     * await ctx.menu.update(); // Обновить текущее меню
     * await ctx.menu.close(); // Закрыть меню
     */
    private createControl(ctx: C): MenuControlPanel<C> {

        const renderMenu = async (menu: Menu<C>) => ({ text: ctx.message?.body?.text ?? "", attachments: [await menu.render(ctx)] });

        return {
            update: async () => {
                const active = (ctx as any).__menu || this;
                await ctx.editMessage(await renderMenu(active));
            },

            nav: async (to: string) => {
                const menu = menuRegistry.get(to);
                if (!menu) return;

                this.setActiveMenu(ctx, menu);

                await ctx.editMessage(await renderMenu(menu));
            },

            back: async () => {
                const active = (ctx as any).__menu || this;

                if (!active.parent) return;

                const parent = menuRegistry.get(active.parent);
                if (!parent) return;

                this.setActiveMenu(ctx, parent);

                await ctx.editMessage(await renderMenu(parent));
            },

            close: async () => {
                await ctx.editMessage({ text: ctx.message?.body?.text ?? "", attachments: [] });
            },
        };
    }
}

