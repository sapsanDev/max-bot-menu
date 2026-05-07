# max-bot-menu

Система меню для MAX Bot API, вдохновленная grammY. Позволяет легко создавать интерактивные встроенные клавиатуры с поддержкой обработчиков событий, подменю и сессий.

## 🚀 Возможности

- ✨ Простой и интуитивный API для создания меню
- 🔗 Поддержка иерархии меню (подменю, навигация, возврат)
- 🎯 Динамические кнопки на основе контекста
- 📝 Множество типов кнопок (текст, ссылка, контакт, геолокация, приложение)
- ⚡ Middleware интеграция с MAX Bot API
- 💾 Встроенная система сессий для сохранения данных пользователя
- 📚 Полная документация JSDoc всех методов

## 📦 Установка

```bash
npm install max-bot-menu
```

## 🎯 Быстрый старт

### Создание простого меню

```typescript
import { Menu } from 'max-bot-menu';

const menu = new Menu('main');

menu.text('👋 Привет', async (ctx) => {
  await ctx.reply('Привет, я бот!');
});

menu.text('ℹ️ Информация', async (ctx) => {
  await ctx.reply('Это информационное меню');
});

menu.text('⚙️ Настройки', async (ctx) => {
  await ctx.menu.nav('settings');
});

```

### Использование подменю

```typescript
const mainMenu = new Menu('main');
const settingsMenu = new Menu('settings');

// Добавляем кнопку для перехода в меню настроек
mainMenu.submenu('⚙️ Настройки', 'settings');

// Добавляем кнопку для возврата в главное меню
settingsMenu.text('🔊 Звук', async (ctx) => {
  await ctx.reply('Звук включен');
});

settingsMenu.back('👈 Назад');

// Регистрируем подменю
mainMenu.register(settingsMenu);

bot.use(mainMenu);
bot.api.setMyCommands([{name: 'menu', description: 'Меню бота'}]);
bot.command('start', async (ctx) => return ctx.reply(`Главное меню`, {attachments: [menu]} ));
```

### Динамические кнопки

```typescript
const menu = new Menu('main');

// Кнопки на основе контекста
menu.text((ctx) => `Привет, ${ctx.from?.first_name}!`, async (ctx) => {
  await ctx.reply('Нажал на привет!');
});

// Условные кнопки
menu.dynamic((ctx, range) => {
  if (ctx.session?.isAdmin) {
    range.text('🔐 Админ-панель', async (ctx) => {
      await ctx.reply('Добро пожаловать в админ-панель!');
    });
  }
  
  range.text('📊 Статистика', async (ctx) => {
    await ctx.reply('Ваша статистика...');
  });
});

bot.use(menu.middleware());
```

### Различные типы кнопок

```typescript
const menu = new Menu('main');

// Текстовая кнопка с обработчиком
menu.text('📝 Текст', handler);

// Кнопка-ссылка
menu.url('🌐 Веб-сайт', 'https://example.com');

// Кнопка открытия веб-приложения
menu.openApp('🎮 Приложение', 'app_id');

// Кнопка запроса контакта
menu.contact('📱 Отправить контакт');

// Кнопка запроса геолокации
menu.geoLocation('📍 Отправить локацию');

// Кнопка сообщения
menu.message('💬 Отправить сообщение');

bot.use(menu.middleware());
```

### Управление меню

```typescript
menu.text('Обновить', async (ctx) => {
  // Обновить текущее меню
  await ctx.menu.update();
});

menu.text('Перейти', async (ctx) => {
  // Перейти на другое меню
  await ctx.menu.nav('other-menu');
});

menu.text('Назад', async (ctx) => {
  // Вернуться на родительское меню
  await ctx.menu.back();
});

menu.text('Закрыть', async (ctx) => {
  // Закрыть меню (убрать клавиатуру)
  await ctx.menu.close();
});
```

### Системе сессий

```typescript
import { createSession } from 'max-bot-menu';

// Определяем структуру сессии
interface UserSession {
  count: number;
  name: string;
  settings: {
    notifications: boolean;
  };
}

// Создаем middleware для сессий
const session = createSession<UserSession>({
  count: 0,
  name: '',
  settings: {
    notifications: true,
  },
});

bot.use(session);

// Теперь можно использовать ctx.session
bot.on('message', async (ctx) => {
  ctx.session.count++;
  await ctx.reply(`Сообщений: ${ctx.session.count}`);
});
```

### Множество кнопок в строке

```typescript
const menu = new Menu('main');

menu.text('Кнопка 1', handler1);
menu.text('Кнопка 2', handler2);
menu.row(); // Переход на новую строку
menu.text('Кнопка 3', handler3);
menu.text('Кнопка 4', handler4);

bot.use(menu.middleware());
```

### Middleware цепочка

```typescript
const menu = new Menu('main');

menu.text(
  'Действие',
  // Middleware 1
  async (ctx, next) => {
    console.log('Шаг 1');
    await next();
  },
  // Middleware 2
  async (ctx, next) => {
    console.log('Шаг 2');
    await ctx.reply('Выполнено!');
  }
);

bot.use(menu);
```

## 📖 API Справка

### Menu

#### Конструктор
```typescript
new Menu(id: string)
```

#### Методы добавления кнопок

- `text(text, ...middleware)` - Текстовая кнопка с обработчиком
- `url(text, url)` - Кнопка-ссылка
- `openApp(text, app)` - Кнопка открытия приложения
- `contact(text)` - Кнопка запроса контакта
- `message(text)` - Кнопка сообщения
- `geoLocation(text, quick?)` - Кнопка геолокации
- `submenu(text, to, ...middleware)` - Кнопка подменю
- `back(text)` - Кнопка возврата
- `dynamic(builder)` - Динамические кнопки
- `row()` - Новая строка в меню

#### Методы управления

- `register(menu, parent?)` - Регистрирует подменю
- `render(ctx)` - Отрендеривает меню
- `handle(ctx, action)` - Обрабатывает действие
- `middleware()` - Возвращает middleware функцию

### MenuControlPanel

Доступные методы через `ctx.menu`:

- `update()` - Обновить текущее меню
- `nav(to)` - Перейти на другое меню
- `back()` - Вернуться на предыдущее меню
- `close()` - Закрыть меню

## 🔧 Типы

### Dynamic<C, T>
```typescript
type Dynamic<C, T> = T | ((ctx: C) => T | Promise<T>);
```

Позволяет передавать как статическое значение, так и функцию для динамического получения значения.

### Middleware<C>
```typescript
type Middleware<C> = (ctx: C, next: () => Promise<void>) => any;
```

### MenuControlPanel<C>
```typescript
type MenuControlPanel<C> = {
  update(): Promise<void>;
  nav(to: string): Promise<void>;
  back(): Promise<void>;
  close(): Promise<void>;
};
```

## 📝 Примеры

### Полный пример

```typescript
import { Bot } from '@maxhub/max-bot-api';
import { Menu, createSession } from 'max-bot-menu';

const bot = new Bot('TOKEN');

// Создаем сессию
const session = createSession({ points: 0 });
bot.use(session);

// Главное меню
const mainMenu = new Menu('main');
mainMenu.text('🎮 Играть', async (ctx) => {
  ctx.session.points += 10;
  await ctx.reply(`Получено 10 очков! Всего: ${ctx.session.points}`);
});
mainMenu.submenu('⚙️ Настройки', 'settings');

// Меню настроек
const settingsMenu = new Menu('settings');
settingsMenu.text('🔊 Звук', async (ctx) => {
  await ctx.reply('Звук включен ✅');
});
settingsMenu.text('📊 Статистика', async (ctx) => {
  await ctx.reply(`Ваши очки: ${ctx.session.points}`);
});
settingsMenu.back('👈 Назад');

// Регистрируем подменю
mainMenu.register(settingsMenu);

// Регистрируем middleware
bot.use(mainMenu.middleware());

// Обработка команды /start
bot.command('start', async (ctx) => {
  await ctx.reply('Добро пожаловать!', {
    attachments: [await mainMenu.render(ctx)],
  });
});

bot.start();
```

## 📄 Лицензия

MIT

## 🤝 Вклад

Приветствуются pull requests и issues!

## 📞 Поддержка

Для вопросов и проблем откройте issue в репозитории.
