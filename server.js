const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const db = mongoose.connection;

const app = express();
const port = process.env.PORT || 5000;

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  reportPdfLink: { type: String, default: null }
}, { strict: false });

const User = mongoose.model("User", userSchema);

const singleChoiceSchema = new mongoose.Schema({
  npc: String,
  order: Number,
  choice: String
});

const batchChoiceSchema = new mongoose.Schema({
  username: String,
  timestamp: String,
  choices: [singleChoiceSchema]
});

const BatchChoice = mongoose.model('BatchChoice', batchChoiceSchema);

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
  username: String,
  timestamp: Date
});

const Choice = mongoose.model('Choice', choiceSchema);

// API endpoint
app.post('/api/save-choice', async (req, res) => {
  const { npc, order, choice, username } = req.body;

  if (!npc || !choice || order === undefined || !username) {
    return res.status(400).send("Eksik veri");
  }

  try {
    const result = await Choice.create({
      npc,
      order,
      choice,
      username,
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

app.get('/api/choices/:username', async (req, res) => {
  const username = req.params.username;

  if (!username) {
    return res.status(400).send("Eksik username");
  }

  try {
    const choices = await Choice.find({ username }).sort({ order: 1 });
    res.status(200).json({ choices });
  } catch (err) {
    console.error("Seçim verisi alınamadı:", err);
    res.status(500).send("Sunucu hatası");
  }
});

app.post('/api/upload-choices', async (req, res) => {
  const { username, timestamp, choices } = req.body;

  if (!username || !timestamp || !choices || !Array.isArray(choices)) {
    return res.status(400).send("❌ Eksik veya hatalı veri");
  }

  try {
    await BatchChoice.create({ username, timestamp, choices });
    res.status(200).send("✅ Tüm seçimler tek belge olarak yüklendi.");
  } catch (err) {
    console.error("Mongo yükleme hatası:", err);
    res.status(500).send("❌ MongoDB kayıt hatası");
  }
});

app.get('/api/delete-batchchoices', async (req, res) => {
  try {
    await BatchChoice.deleteMany({});
    res.status(200).send("✅ Tüm batchChoices kayıtları silindi.");
  } catch (err) {
    console.error("Batch silme hatası:", err);
    res.status(500).send("❌ Silme hatası");
  }
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Kullanıcı adı ve şifre gerekli");
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).send("❌ Bu kullanıcı adı zaten alınmış.");
    }

    const newUser = new User({ username, password }); // ⚠ Şifreyi hashlemen önerilir
    await newUser.save();
    res.status(200).send("✅ Kayıt başarılı");
  } catch (err) {
    console.error("Kayıt hatası:", err);
    res.status(500).send("Sunucu hatası");
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Kullanıcı adı ve şifre gerekli");
  }

  try {
    const user = await User.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).send("❌ Kullanıcı adı veya şifre hatalı");
    }

      return res.status(200).json({
    message: "Giriş başarılı",
    username: user.username,
    reportPdfLink: user.reportPdfLink // null veya mevcut link
  });
  } catch (err) {
    console.error("Giriş hatası:", err);
    res.status(500).send("Sunucu hatası");
  }
});

app.post('/api/update-report', async (req, res) => {
  const { username, reportPdfLink } = req.body;

  if (!username || !reportPdfLink) {
    return res.status(400).send("❌ username ve reportPdfLink gerekli");
  }

  try {
    const updated = await User.findOneAndUpdate(
      { username },
      { 
        $set: { 
          reportPdfLink, 
          reportGeneratedAt: new Date() // opsiyonel yeni tarih alanı
        } 
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).send("❌ Kullanıcı bulunamadı");
    }

    res.status(200).json({
      message: "✅ Rapor linki güncellendi",
      user: updated
    });
  } catch (err) {
    console.error("Update hatası:", err);
    res.status(500).send("❌ Sunucu hatası");
  }
});

app.post('/api/insert-user', async (req, res) => {
  const { name, surname, email, username, password, reportPdfLink } = req.body;

  if (!username || !password) {
    return res.status(400).send("❌ Kullanıcı adı ve şifre gerekli");
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).send("❌ Bu kullanıcı adı zaten var");
    }

    const newUser = new User({
      name: name || null,
      surname: surname || null,
      email: email || null,
      username,
      password, // ⚠ hashlemeyi unutma
      reportPdfLink: reportPdfLink || null
    });

    await newUser.save();
    res.status(200).json({ message: "✅ Kullanıcı eklendi", user: newUser });

  } catch (err) {
    console.error("Insert hatası:", err);
    res.status(500).send("❌ Sunucu hatası");
  }
});
// server.js
app.get('/api/user-report/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user || !user.reportPdfLink) {
      return res.status(404).json({ error: "Rapor bulunamadı" });
    }
    res.json({ reportLink: user.reportPdfLink });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get('/api/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Public klasörünü dışarı aç
app.use("/reports", express.static("public/reports"));

app.post(
  "/api/upload-report-raw",
  express.raw({ type: "application/pdf", limit: "10mb" }),
  async (req, res) => {
    try {
      const fs = require("fs");
      const path = require("path");

      const reportsDir = path.join(__dirname, "public/reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `${req.query.username}-${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);

      fs.writeFileSync(filePath, req.body);

      const fileUrl = `https://unity-choice-api-production-8a70.up.railway.app/reports/${fileName}`;

      await User.findOneAndUpdate(
        { username: req.query.username },
        { $set: { reportPdfLink: fileUrl, reportGeneratedAt: new Date() } }
      );

      res.json({ success: true, url: fileUrl });
    } catch (err) {
      console.error("🚨 PDF kaydetme hatası:", err);
      res.status(500).send("❌ Sunucu hatası");
    }
  }
);




















