const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB bağlantısı
mongoose.connect('mongodb://mongo:NtZAjdaGTkOGLqVvsutdiAEHIRnxhFie@mongodb.railway.internal:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB bağlantısı başarılı!"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

// Şema & Model
const choiceSchema = new mongoose.Schema({
  key: String,
  value: String,
  createdAt: { type: Date, default: Date.now }
});

const Choice = mongoose.model('Choice', choiceSchema);

// API endpoint
app.post('/api/save', async (req, res) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).send('Eksik veri');
  }

  try {
    const newChoice = new Choice({ key, value });
    await newChoice.save();
    res.status(200).send('Veri MongoDB’ye kaydedildi.');
  } catch (err) {
    console.error(err);
    res.status(500).send('MongoDB kayıt hatası');
  }
});
