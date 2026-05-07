export type Dynamic<C, T> = T | ((ctx: C) => T | Promise<T>);



export type Middleware<C> = (ctx: C, next: () => Promise<void>) => any;

export type TextWithPayload<C> = {
    text: Dynamic<C, string>;
    payload?: Dynamic<C, string>;
};

export type MenuControlPanel<C> = {
    update(): Promise<void>;
    nav(to: string): Promise<void>;
    back(): Promise<void>;
    close(): Promise<void>;
};