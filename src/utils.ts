/**
 * Разрешает динамическое значение или возвращает статическое значение
 * @template T - тип возвращаемого значения
 * @template C - тип контекста
 * @param value - статическое значение или функция для получения значения
 * @param ctx - контекст для передачи в функцию
 * @param fallback - резервное значение, если результат undefined
 * @returns обещание, которое разрешается в значение типа T
 * @example
 * // Статическое значение
 * const text = await resolve("Привет", ctx);
 * 
 * // Динамическое значение
 * const greeting = await resolve(
 *   (ctx) => `Привет, ${ctx.from?.first_name}!`,
 *   ctx
 * );
 * 
 * // С резервным значением
 * const value = await resolve(nullable, ctx, "Default");
 */
export async function resolve<T, C>(
    value: T | ((ctx: C) => T | Promise<T>),
    ctx: C,
    fallback?: T
): Promise<T> {
    const result =
        typeof value === "function"
            ? await (value as any)(ctx)
            : value;

    return result ?? fallback;
}