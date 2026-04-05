const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 创建上传目录
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|ico/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('只支持图片文件'));
  }
});

// 初始化数据库
const db = new Database('nav.db');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    category TEXT,
    description TEXT,
    clicks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// API 路由

// 获取所有链接
app.get('/api/links', (req, res) => {
  try {
    const links = db.prepare('SELECT * FROM links ORDER BY created_at DESC').all();
    res.json({ success: true, data: links });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加链接
app.post('/api/links', upload.single('icon'), (req, res) => {
  try {
    const { title, url, category, description } = req.body;
    const id = uuidv4();
    const icon = req.file ? `/uploads/${req.file.filename}` : null;

    const stmt = db.prepare('INSERT INTO links (id, title, url, icon, category, description) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, title, url, icon, category, description);

    res.json({ success: true, data: { id, title, url, icon, category, description } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新链接
app.put('/api/links/:id', upload.single('icon'), (req, res) => {
  try {
    const { id } = req.params;
    const { title, url, category, description } = req.body;
    let icon = req.file ? `/uploads/${req.file.filename}` : req.body.existingIcon;

    const stmt = db.prepare('UPDATE links SET title=?, url=?, icon=?, category=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
    stmt.run(title, url, icon, category, description, id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除链接
app.delete('/api/links/:id', (req, res) => {
  try {
    const { id } = req.params;
    const link = db.prepare('SELECT icon FROM links WHERE id=?').get(id);

    if (link && link.icon) {
      const iconPath = path.join(__dirname, link.icon);
      if (fs.existsSync(iconPath)) {
        fs.unlinkSync(iconPath);
      }
    }

    db.prepare('DELETE FROM links WHERE id=?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 记录点击
app.post('/api/links/:id/click', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE links SET clicks = clicks + 1 WHERE id=?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有分类
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加分类
app.post('/api/categories', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    const id = uuidv4();

    const stmt = db.prepare('INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, icon, sort_order || 0);

    res.json({ success: true, data: { id, name, icon, sort_order } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除分类
app.delete('/api/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id=?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取设置
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新设置
app.post('/api/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 统计数据
app.get('/api/stats', (req, res) => {
  try {
    const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;
    const totalClicks = db.prepare('SELECT SUM(clicks) as total FROM links').get().total || 0;
    const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const topLinks = db.prepare('SELECT * FROM links ORDER BY clicks DESC LIMIT 5').all();

    res.json({
      success: true,
      data: {
        totalLinks,
        totalClicks,
        totalCategories,
        topLinks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
