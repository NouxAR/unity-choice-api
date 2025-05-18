const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const db = mongoose.connection;

const app = express();
const port = process.env.PORT || 3000;

const dialogSchema = new mongoose.Schema({
  npc: String,                   // 🔁 etkileşilen NPC
  character: String,             // 🎭 konuşan karakterin ismi
  type: String,                  // "line" veya "choice"
  line: String,
  choices: [String],             // sadece "choice" tipi için geçerli
  order: Number,                 // sıralama

  isTaskGate: Boolean,           // görev gerektiriyor mu?
  requiredTaskKey: String,       // görev adı
  requiredTaskValue: Boolean     // görev durumu (true/false)
}, { collection: 'Dialogs' });

const Dialog = mongoose.model("Dialog", dialogSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  console.log("📥 Gelen istek:", req.body);  // Bu satır logda görünmeli!

  if (!key || !value) {
    console.log("❌ Eksik veri:", req.body);
    return res.status(400).send('Eksik veri');
  }

  try {
    const newChoice = new Choice({ key, value });
    await newChoice.save();
    console.log("✅ Kaydedildi:", key, value); // Loga düşmeli
    res.status(200).send('Veri MongoDB’ye kaydedildi.');
  } catch (err) {
    console.error("❌ HATA:", err);
    res.status(500).send('MongoDB kayıt hatası');
  }
});
app.listen(port, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});

app.get('/api/last3', async (req, res) => {
  try {
    const lastChoices = await Choice.find().sort({ createdAt: -1 }).limit(3);
    res.json(lastChoices);
  } catch (err) {
    console.error("Son 3 seçim çekilemedi:", err);
    res.status(500).send("MongoDB'den veri alınamadı");
  }
});

app.get('/api/dialog/:scene', async (req, res) => {
  try {
    const sceneName = req.params.scene;

    const dialogs = await Dialog.find({ scene: sceneName }).sort({ order: 1 });

    res.json(dialogs);
  } catch (err) {
    console.error("❌ Diyalog çekme hatası:", err);
    res.status(500).send("MongoDB'den diyalog alınamadı.");
  }
});
app.get('/api/delete-all-choices', async (req, res) => {
    try {
        await Choice.deleteMany({});
        res.status(200).send("✅ Tüm seçim verileri silindi.");
    } catch (err) {
        console.error("Silme hatası:", err);
        res.status(500).send("❌ Silme hatası");
    }
});

app.post('/api/input', async (req, res) => {
  try {
    const { scene, input, character, order } = req.body;

    if (!scene || !input || !character || order == null) {
      return res.status(400).json({ error: "Eksik veri var." });
    }

    const newEntry = {
      scene,
      input,
      character,
      order,
      timestamp: new Date()
    };

    await db.collection("userInputs").insertOne(newEntry);
    res.status(200).json({ message: "Yanıt kaydedildi." });
  } catch (err) {
    console.error("Input kayıt hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
