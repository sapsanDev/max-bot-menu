/**
 * Создаёт функцию middleware для управления сессиями пользователей
 * @template T - тип объекта сессии
 * @param initial - начальное состояние сессии для каждого пользователя
 * @returns middleware функция для регистрации в боте * @example
 * const sessionData = { count: 0, userName: "" };
 * bot.use(createSession(sessionData));
 * 
 * bot.on('message', (ctx) => {
 *   ctx.session.count++;
 *   ctx.reply(`Сообщений: ${ctx.session.count}`);
 * }); */
export function createSession<T>(initial: T) {
    const store = new Map<string, T>();

    return (ctx: any) => {
        const id = String(ctx.from?.id || ctx.chat?.id);

        if (!store.has(id)) {
            store.set(id, structuredClone(initial));
        }

        ctx.session = store.get(id);
    };
}
