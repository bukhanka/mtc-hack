## MTC True Tech Hackathon

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
