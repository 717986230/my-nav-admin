const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 内存存储（简化版，不使用数据库）
let links = [
  { id: '1', title: 'GitHub', url: 'https://github.com', icon: '🐙', category: '开发工具', clicks: 0 },
  { id: '2', title: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', category: '开发工具', clicks: 0 },
  { id: '3', title: 'Google', url: 'https://google.com', icon: '🌐', category: '搜索引擎', clicks: 0 },
  { id: '4', title: 'Twitter', url: 'https://twitter.com', icon: '🐦', category: '社交媒体', clicks: 0 }
];

let categories = [
  { id: '1', name: '开发工具', icon: '🔧' },
  { id: '2', name: '搜索引擎', icon: '🔍' },
  { id: '3', name: '社交媒体', icon: '📱' }
];

// API 路由

// 获取所有链接
app.get('/api/links', (req, res) => {
  res.json({ success: true, data: links });
});

// 添加链接
app.post('/api/links', (req, res) => {
  const { title, url, icon, category } = req.body;
  const id = Date.now().toString();
  const newLink = { id, title, url, icon: icon || '🔗', category, clicks: 0 };
  links.push(newLink);
  res.json({ success: true, data: newLink });
});

// 删除链接
app.delete('/api/links/:id', (req, res) => {
  const { id } = req.params;
  links = links.filter(l => l.id !== id);
  res.json({ success: true });
});

// 记录点击
app.post('/api/links/:id/click', (req, res) => {
  const { id } = req.params;
  const link = links.find(l => l.id === id);
  if (link) {
    link.clicks++;
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Link not found' });
  }
});

// 获取所有分类
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: categories });
});

// 统计数据
app.get('/api/stats', (req, res) => {
  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const topLinks = [...links].sort((a, b) => b.clicks - a.clicks).slice(0, 5);

  res.json({
    success: true,
    data: {
      totalLinks: links.length,
      totalClicks,
      totalCategories: categories.length,
      topLinks
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
