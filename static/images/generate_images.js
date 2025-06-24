// 生成新闻图片的脚本
const fs = require('fs');
const path = require('path');

// 定义新闻类别和对应的颜色
const categories = [
  { name: '政治', color: '#4361ee' },
  { name: '经济', color: '#3a0ca3' },
  { name: '科技', color: '#f72585' },
  { name: '体育', color: '#4cc9f0' },
  { name: '娱乐', color: '#7209b7' },
  { name: '健康', color: '#4f772d' },
  { name: '教育', color: '#90be6d' },
  { name: '环境', color: '#43aa8b' },
  { name: '国际', color: '#f94144' },
  { name: '社会', color: '#f8961e' }
];

// 生成20张新闻图片
for (let i = 1; i <= 20; i++) {
  // 随机选择一个类别
  const categoryIndex = Math.floor(Math.random() * categories.length);
  const category = categories[categoryIndex];
  
  // 创建SVG内容
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <!-- 背景 -->
  <rect width="800" height="450" fill="${category.color}20" rx="10" ry="10"/>
  
  <!-- 装饰图形 -->
  <rect x="20" y="20" width="760" height="410" fill="white" opacity="0.1" rx="10" ry="10"/>
  
  <!-- 类别标记 -->
  <rect x="30" y="30" width="120" height="40" fill="${category.color}" rx="5" ry="5"/>
  <text x="90" y="55" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="white">${category.name}</text>
  
  <!-- 随机图形装饰 -->
  ${generateRandomShapes(category.color)}
  
  <!-- 新闻编号 -->
  <text x="750" y="420" font-family="Arial" font-size="24" font-weight="bold" text-anchor="end" fill="${category.color}">#${i}</text>
</svg>`;
  
  // 保存文件
  fs.writeFileSync(path.join(__dirname, `news_${i}.svg`), svgContent);
}

// 生成随机装饰图形
function generateRandomShapes(color) {
  let shapes = '';
  
  // 生成5-15个随机图形
  const numShapes = 5 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < numShapes; i++) {
    const shapeType = Math.floor(Math.random() * 3); // 0: 圆形, 1: 矩形, 2: 多边形
    
    if (shapeType === 0) {
      // 圆形
      const cx = 100 + Math.floor(Math.random() * 600);
      const cy = 100 + Math.floor(Math.random() * 250);
      const r = 10 + Math.floor(Math.random() * 50);
      shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${0.1 + Math.random() * 0.2}"/>`;
    } else if (shapeType === 1) {
      // 矩形
      const x = 100 + Math.floor(Math.random() * 600);
      const y = 100 + Math.floor(Math.random() * 250);
      const width = 20 + Math.floor(Math.random() * 100);
      const height = 20 + Math.floor(Math.random() * 60);
      shapes += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" opacity="${0.1 + Math.random() * 0.2}" rx="5" ry="5"/>`;
    } else {
      // 多边形 (三角形)
      const x1 = 100 + Math.floor(Math.random() * 600);
      const y1 = 100 + Math.floor(Math.random() * 250);
      const x2 = x1 + (-30 + Math.floor(Math.random() * 60));
      const y2 = y1 + (20 + Math.floor(Math.random() * 40));
      const x3 = x1 + (20 + Math.floor(Math.random() * 40));
      const y3 = y2;
      shapes += `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3}" fill="${color}" opacity="${0.1 + Math.random() * 0.2}"/>`;
    }
  }
  
  return shapes;
}

console.log('已生成20张新闻图片！');
