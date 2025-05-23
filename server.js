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
mongoose.connect('mongodb://mongo:ImupXwnzHrzcIOXZFONBDlQKZmiMkunZ@mongodb.railway.internal:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("✅ MongoDB bağlantısı başarılı!"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

// Şema & Model

const choiceSchema = new mongoose.Schema({
  npc: String,
  order: Number,
  choice: String,
  playerId: String,
  timestamp: Date
});

const Choice = mongoose.model('Choice', choiceSchema);

// API endpoint
app.post('/api/save-choice', async (req, res) => {
  const { npc, order, choice, playerId } = req.body;

  if (!npc || !choice || order === undefined || !playerId) {
    return res.status(400).send("Eksik veri");
  }

  try {
    const result = await Choice.create({
      npc,
      order,
      choice,
      playerId,
      timestamp: new Date()
    });
    res.status(200).send("Kaydedildi");
  } catch (err) {
    console.error("Seçim kayıt hatası:", err);
    res.status(500).send("Hata oluştu");
  }
});

app.listen(port, () => {
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
});

app.get('/api/dialog/:npc', async (req, res) => {
  const npcName = req.params.npc;
  const dialogs = await Dialog.find({ npc: npcName }).sort({ order: 1 });
  res.json(dialogs);
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

const taskSchema = new mongoose.Schema({
  key: String,
  value: Boolean
});
const Task = mongoose.model('Task', taskSchema);

app.post('/api/update-task', async (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).send("Eksik veri");
  }

  try {
    await Task.findOneAndUpdate(
      { key },
      { value },
      { upsert: true }
    );
    res.status(200).send("Görev güncellendi");
  } catch (err) {
    console.error("Görev güncelleme hatası:", err);
    res.status(500).send("Sunucu hatası");
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json({ tasks }); // ✅ Unity uyumlu JSON
  } catch (err) {
    console.error("Görevler alınamadı:", err);
    res.status(500).send("Görevler alınamadı");
  }
});

app.get('/api/dialog', async (req, res) => {
  try {
    const dialogs = await Dialog.find().sort({ order: 1 });
    res.json(dialogs);
  } catch (err) {
    console.error("Diyaloglar alınamadı:", err);
    res.status(500).send("Diyaloglar alınamadı");
  }
});

app.get('/api/delete-all-tasks', async (req, res) => {
  try {
    await Task.deleteMany({});
    res.status(200).send("Tüm görevler silindi");
  } catch (err) {
    console.error("Toplu görev silme hatası:", err);
    res.status(500).send("Sunucu hatası");
  }
});

