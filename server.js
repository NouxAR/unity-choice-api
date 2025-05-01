const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 🔌 MySQL bağlantısı
const connection = mysql.createConnection({
  host: 'containers-us-west-XXX.railway.app',  // ← senin HOST
  user: 'root',                                 // ← senin USER
  password: 'ŞİFRENİ_BURAYA_YAZ',               // ← senin PASSWORD
  database: 'railway',                          // ← DATABASE ADI
  port: 3306                                     // ← Railway genelde 3306 verir
});

// Veritabanına bağlan
connection.connect(err => {
  if (err) {
    console.error('❌ Veritabanına bağlanılamadı:', err);
  } else {
    console.log('✅ MySQL bağlantısı başarılı!');
  }
});

// API endpoint
app.post('/api/save', (req, res) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).send('Eksik veri');
  }

  const query = 'INSERT INTO choices (`key`, `value`) VALUES (?, ?)';
  connection.query(query, [key, value], (err, results) => {
    if (err) {
      console.error('MySQL hatası:', err);
      return res.status(500).send('Veritabanı hatası');
    }

    res.status(200).send('Veri başarıyla kaydedildi.');
  });
});
