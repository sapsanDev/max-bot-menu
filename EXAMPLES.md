# Примеры использования max-bot-menu

## Содержание

1. [Простое меню](#простое-меню)
2. [Иерархия меню](#иерархия-меню)
3. [Динамические кнопки](#динамические-кнопки)
4. [Системы сессий](#системы-сессий)
5. [Полный пример бота](#полный-пример-бота)

## Простое меню

```typescript
import { Menu } from 'max-bot-menu';

const menu = new Menu('main');

menu.text('Привет', async (ctx) => {
  await ctx.reply('👋 Привет!');
});

menu.text('Помощь', async (ctx) => {
  await ctx.reply('ℹ️ Как я могу вам помочь?');
});

// Использование в боте
bot.use(menu);

bot.command('start', async (ctx) => {
  await ctx.reply('Выберите действие:', {
    attachments: [menu],
  });
});
```

## Иерархия меню

```typescript
import { Menu } from 'max-bot-menu';

// Главное меню
const mainMenu = new Menu('main');
mainMenu.text('📚 Категории', async (ctx) => {
  await ctx.menu.nav('categories');
});
mainMenu.text('⚙️ Настройки', async (ctx) => {
  await ctx.menu.nav('settings');
});

// Меню категорий
const categoriesMenu = new Menu('categories');
categoriesMenu.text('📖 Статьи', async (ctx) => {
  await ctx.reply('Статьи появятся здесь');
});
categoriesMenu.text('🎥 Видео', async (ctx) => {
  await ctx.reply('Видео появятся здесь');
});
categoriesMenu.back('👈 Назад');

// Меню настроек
const settingsMenu = new Menu('settings');
settingsMenu.text('🔔 Уведомления', async (ctx) => {
  ctx.session.notifications = !ctx.session.notifications;
  const status = ctx.session.notifications ? 'включены' : 'отключены';
  await ctx.reply(`Уведомления ${status}`);
  await ctx.menu.update();
});
settingsMenu.text('🌙 Темная тема', async (ctx) => {
  ctx.session.darkMode = !ctx.session.darkMode;
  const status = ctx.session.darkMode ? 'включена' : 'отключена';
  await ctx.reply(`Темная тема ${status}`);
  await ctx.menu.update();
});
settingsMenu.back('👈 Назад');

// Регистрируем все меню
mainMenu.register(categoriesMenu);
mainMenu.register(settingsMenu);

bot.use(mainMenu);
```

## Динамические кнопки

```typescript
import { Menu } from 'max-bot-menu';

const menu = new Menu('main');

// 1. Динамический текст кнопки
menu.text(
  (ctx) => `Привет, ${ctx.from?.first_name || 'Друже'}!`,
  async (ctx) => {
    await ctx.reply('Спасибо за клик!');
  }
);

// 2. Условные кнопки
menu.dynamic((ctx, range) => {
  if (ctx.session?.isAdmin) {
    range.text('🔐 Админ-панель', async (ctx) => {
      await ctx.reply('Админ-панель');
    });
  }
  
  if (ctx.session?.isPremium) {
    range.text('⭐ Премиум функции', async (ctx) => {
      await ctx.reply('Премиум контент');
    });
  }
  
  // Всегда видна
  range.text('📊 Профиль', async (ctx) => {
    await ctx.reply('Ваш профиль');
  });
});

// 3. Динамическая ссылка
menu.url(
  'Посетить сайт',
  (ctx) => `https://example.com/user/${ctx.from?.id}`
);

bot.use(menu);
```

## Системы сессий

```typescript
import { createSession } from 'max-bot-menu';

// Определяем структуру сессии
interface UserData {
  points: number;
  level: number;
  inventory: string[];
  settings: {
    notifications: boolean;
    language: string;
  };
}

// Создаем middleware для сессий
const session = createSession<UserData>({
  points: 0,
  level: 1,
  inventory: [],
  settings: {
    notifications: true,
    language: 'ru',
  },
});

bot.use(session);

// Теперь ctx.session доступен везде
const gameMenu = new Menu('game');

gameMenu.text('🎮 Играть', async (ctx) => {
  ctx.session.points += 10;
  await ctx.reply(`Игра завершена! +10 очков\nВсего: ${ctx.session.points}`);
  await ctx.menu.update();
});

gameMenu.text('📦 Инвентарь', async (ctx) => {
  const inventory = ctx.session.inventory.join(', ') || 'Пусто';
  await ctx.reply(`Ваш инвентарь: ${inventory}`);
});

gameMenu.dynamic((ctx, range) => {
  if (ctx.session.points >= 100) {
    range.text('🎁 Получить награду', async (ctx) => {
      ctx.session.points -= 100;
      ctx.session.inventory.push('Медаль');
      await ctx.reply('Вы получили медаль!');
      await ctx.menu.update();
    });
  }
});

bot.use(gameMenu);
```

## Полный пример бота

```typescript
import { Bot } from '@maxhub/max-bot-api';
import { Menu, createSession } from 'max-bot-menu';

interface UserSession {
  firstName: string;
  subscribed: boolean;
  purchases: number;
}

const bot = new Bot('YOUR_TOKEN_HERE');

// Инициализируем сессию
const session = createSession<UserSession>({
  firstName: '',
  subscribed: false,
  purchases: 0,
});

bot.use(session);

// =====================
// === ГЛАВНОЕ МЕНЮ ===
// =====================

const mainMenu = new Menu('main');

mainMenu.text('📰 Новости', async (ctx) => {
  await ctx.reply('Последние новости:\n\n📌 Новая версия вышла!');
});

mainMenu.text('🛒 Магазин', async (ctx) => {
  await ctx.menu.nav('shop');
});

mainMenu.text('⚙️ Настройки', async (ctx) => {
  await ctx.menu.nav('settings');
});

mainMenu.text('ℹ️ О боте', async (ctx) => {
  await ctx.reply('max-bot-menu - система меню для MAX Bot API');
});

// =====================
// === МЕНЮ МАГАЗИНА ===
// =====================

const shopMenu = new Menu('shop');

shopMenu.text('💎 Премиум ($4.99)', async (ctx) => {
  ctx.session.subscribed = true;
  ctx.session.purchases++;
  await ctx.reply('✅ Спасибо за покупку!');
  await ctx.menu.update();
});

shopMenu.dynamic((ctx, range) => {
  if (ctx.session.subscribed) {
    range.text('✨ Ваш статус: Премиум', async (ctx) => {
      await ctx.reply('Вы имеете доступ ко всем функциям!');
    });
  }
});

shopMenu.back('👈 Назад');

// =====================
// === МЕНЮ НАСТРОЕК ===
// =====================

const settingsMenu = new Menu('settings');

settingsMenu.text('🔔 Уведомления', async (ctx) => {
  // Обработка уведомлений
  await ctx.reply('Параметры уведомлений...');
});

settingsMenu.text('🌐 Язык', async (ctx) => {
  await ctx.menu.nav('language');
});

settingsMenu.text('📊 Статистика', async (ctx) => {
  await ctx.reply(
    `Статистика:\n\n` +
    `👤 Имя: ${ctx.session.firstName}\n` +
    `💳 Покупок: ${ctx.session.purchases}\n` +
    `⭐ Статус: ${ctx.session.subscribed ? 'Премиум' : 'Бесплатный'}`
  );
});

settingsMenu.back('👈 Назад');

// =====================
// === МЕНЮ ЯЗЫКОВ ===
// =====================

const languageMenu = new Menu('language');

['Русский', 'English', 'Español', 'Français'].forEach((lang) => {
  languageMenu.text(lang, async (ctx) => {
    await ctx.reply(`Язык изменен на: ${lang}`);
    await ctx.menu.nav('settings');
  });
});

languageMenu.back('👈 Назад');

// =====================
// === РЕГИСТРАЦИЯ ===
// =====================

mainMenu.register(shopMenu);
mainMenu.register(settingsMenu);
settingsMenu.register(languageMenu);

bot.use(mainMenu);

// =====================
// === ОБРАБОТЧИКИ ===
// =====================

bot.command('start', async (ctx) => {
  ctx.session.firstName = ctx.from?.first_name || 'Друже';
  
  await ctx.reply(
    `👋 Привет, ${ctx.session.firstName}!\n\n` +
    `Добро пожаловать в наш бот.`,
    {
      attachments: [await mainMenu.render(ctx)],
    }
  );
});

bot.command('menu', async (ctx) => {
  await ctx.reply('Меню:', {
    attachments: [await mainMenu.render(ctx)],
  });
});

bot.on('message', async (ctx) => {
  await ctx.reply('Пожалуйста, используйте меню для навигации.');
});

// =====================
// === ЗАПУСК БОТА ===
// =====================

bot.start();
console.log('🤖 Бот запущен!');
```

## Советы и трюки

### 1. Обновление меню после изменения данных

```typescript
menu.text('Включить уведомления', async (ctx) => {
  ctx.session.notificationsEnabled = true;
  await ctx.reply('✅ Уведомления включены');
  
  // Обновляем меню, чтобы показать новое состояние
  await ctx.menu.update();
});
```

### 2. Цепочка middleware

```typescript
menu.text(
  'Проверить права',
  // Middleware 1: Проверка прав
  async (ctx, next) => {
    if (ctx.from?.id === ADMIN_ID) {
      await next();
    } else {
      await ctx.reply('❌ Недостаточно прав');
    }
  },
  // Middleware 2: Основной обработчик
  async (ctx) => {
    await ctx.reply('✅ Действие выполнено');
  }
);
```

### 3. Форматирование текста в кнопках

```typescript
menu.text(
  (ctx) => `${ctx.session.notifications ? '🔔' : '🔕'} Уведомления`,
  async (ctx) => {
    ctx.session.notifications = !ctx.session.notifications;
    await ctx.menu.update();
  }
);
```

---

Для более подробной информации смотрите [README.md](./README.md)
