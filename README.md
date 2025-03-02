# MTC True Tech Hackathon

Это решение разработано командой AGI in 2024 для участия в хакатоне MTC True Tech Hackathon.

## Запуск демо

### Запуск агента
1. Перейдите в директорию `server`: `cd server`
2. Создайте виртуальное окружение: `python -m venv .venv`
3. Активируйте виртуальное окружение: `source .venv/bin/activate`
4. Установите зависимости: `pip install -r requirements.txt`
5. Скопируйте файл `.env.example` в `.env`: `cp .env.example .env`
6. Заполните значения для ключей в файле `.env`
7. Запустите сервер в режиме разработки: `python main.py dev`

### Запуск клиента
1. Перейдите в директорию `client/web`: `cd client/web`
2. Установите зависимости: `pnpm i`
3. Скопируйте файл `.env.example` в `.env.local`: `cp .env.example .env.local`
4. Заполните значения для ключей в файле `.env.local`
5. Запустите клиент: `pnpm dev`
6. Откройте браузер и перейдите по адресу `http://localhost:3000`


# Система синхронного перевода субтитров для МТС Линк

Решение для синхронного преобразования речи в текст, которое повышает доступность и удобство онлайн-встреч в сервисе МТС Линк.

## Обзор решения

Данный проект предоставляет возможности синхронной транскрипции и перевода речи для видеоконференций, делая онлайн-встречи более доступными и инклюзивными для международных участников и людей с особыми потребностями.

### Ключевые возможности

- 🎙️ Преобразование речи в текст в реальном времени
- 🌍 Автоматический перевод на несколько языков (русский, английский, испанский, французский, немецкий, японский)
- 🔊 Синтез речи для переведенного контента
- 🎯 Отображение субтитров в реальном времени с настраиваемыми параметрами
- ♿ Интерфейс с учетом требований доступности

## Техническая архитектура

### Компоненты

1. **Серверная часть (Python)**
   - Построена на фреймворке LiveKit Agents
   - Обработка аудио и транскрипция в реальном времени
   - Поддержка многоязычного перевода
   - Интеграция WebRTC для real-time коммуникации

2. **Клиентская часть (NextJS)**
   - Отображение субтитров в реальном времени
   - Интерфейс выбора языка
   - Элементы управления доступностью
   - Коммуникация на базе WebRTC

### Используемые технологии

- **Распознавание речи**: Deepgram API
- **Перевод**: OpenAI GPT-4o-mini
- **Синтез речи**: ElevenLabs (подготовлено к реализации)
- **Real-time коммуникация**: Инфраструктура LiveKit WebRTC
- **Определение голосовой активности**: Silero VAD

## Детали технической реализации

### Процесс распознавания речи
1. Захват аудио через WebRTC
2. Определение голосовой активности с помощью Silero VAD
3. Транскрипция в реальном времени через Deepgram
4. Мгновенное отображение распознанного текста

### Система перевода
1. Перевод в реальном времени с использованием OpenAI GPT-4o-mini
2. Поддержка 6 языков с возможностью расширения
3. Контекстно-зависимый перевод с настраиваемыми промптами
4. Эффективная трансляция сообщений всем участникам

### Real-time коммуникация
- Потоковая передача аудио/видео на базе WebRTC
- Эффективное управление участниками
- Динамическое переключение языков
- Синхронизация субтитров в реальном времени



