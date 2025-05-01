const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Geçici kayıt alanı (veritabanı yerine)
let memoryStore = [];

app.post('/api/save', (req, res) => {
    const { key, value } = req.body;

    if (!key || !value) {
        return res.status(400).send('Eksik veri');
    }

    memoryStore.push({ key, value, time: new Date() });
    console.log('Yeni seçim alındı:', key, value);
    res.status(200).send('Kayıt başarıyla alındı!');
});

app.get('/api/all', (req, res) => {
    res.json(memoryStore);
});

app.listen(port, () => {
    console.log(`Sunucu çalışıyor: http://localhost:${port}`);
});
