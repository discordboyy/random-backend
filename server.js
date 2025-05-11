const express = require('express');
const cors = require('cors'); // Добавлено для разрешения CORS
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Включение CORS

const db = new sqlite3.Database(path.join(__dirname, 'data.db'));

let currentValue = 10.0;

// Создаем таблицу, если нет
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      value REAL NOT NULL,
      change REAL NOT NULL
    )
  `);
});

// Генерация изменения
function getRandomChange() {
  if (Math.random() < 0.01) {
    const change = currentValue / 2;
    return Math.random() < 0.5 ? -change : change;
  } else {
    const change = Math.random();
    return Math.random() < 0.5 ? -change : change;
  }
}

// Обновление значения каждую секунду
setInterval(() => {
  const change = getRandomChange();
  currentValue += change;

  const entry = {
    timestamp: new Date().toISOString(),
    value: parseFloat(currentValue.toFixed(4)),
    change: parseFloat(change.toFixed(4))
  };

  db.run(
    `INSERT INTO records (timestamp, value, change) VALUES (?, ?, ?)`,
    [entry.timestamp, entry.value, entry.change]
  );
}, 1000);

// Очистка старых записей (раз в час)
setInterval(() => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  db.run(`DELETE FROM records WHERE timestamp < ?`, [cutoff]);
}, 60 * 60 * 1000);

// API: получить последнее значение
app.get('/api/latest', (req, res) => {
  db.get(`SELECT * FROM records ORDER BY timestamp DESC LIMIT 1`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// API: получить всю историю
app.get('/api/data', (req, res) => {
  db.all(`SELECT * FROM records ORDER BY timestamp ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/', (req, res) => {
  res.send('API для random value работает.');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
