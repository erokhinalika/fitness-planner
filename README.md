# Фитнес-планер Анжелики

## Как запустить локально

```bash
npm install
npm run dev
```

## Как задеплоить на Vercel

1. Создай новый репозиторий на GitHub.
2. Залей туда файлы из этой папки.
3. В Vercel нажми Add New Project.
4. Выбери репозиторий.
5. Framework Preset: Vite.
6. Build command: `npm run build`.
7. Output directory: `dist`.
8. Deploy.

## Важно

GIF внутри сайта сделаны как кликабельные ссылки на страницы техники. Это надёжнее, чем встраивать GIF в PDF.
Если какая-то ссылка не откроется, её можно заменить прямо в `src/App.jsx` в объекте `techniqueLinks`.
