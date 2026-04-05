const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 导航数据
const navData = require('./nav-data.json');

// API 路由
app.get('/api/links', (req, res) => {
  res.json({ success: true, data: navData.links });
});

app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: navData.categories });
});

app.post('/api/links/:id/click', (req, res) => {
  const link = navData.links.find(l => l.id === req.params.id);
  if (link) link.clicks++;
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const totalClicks = navData.links.reduce((sum, l) => sum + l.clicks, 0);
  const topLinks = [...navData.links].sort((a, b) => b.clicks - a.clicks).slice(0, 5);
  res.json({
    success: true,
    data: {
      totalLinks: navData.links.length,
      totalClicks,
      totalCategories: navData.categories.length,
      topLinks
    }
  });
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));