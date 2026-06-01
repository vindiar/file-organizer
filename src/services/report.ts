import fs from 'fs';
import path from 'path';
import { OrganizeResult } from '../types/index.js';
import { formatFileSize } from './scanner.js';

export interface ReportStats {
  provider: string;
  model: string;
  totalFiles: number;
  totalSize: number;
  executionTime: string;
  durationMs: number;
  successCount: number;
  failCount: number;
}

/**
 * Generate a premium single-file HTML report summarizing the organization results.
 */
export async function generateHtmlReport(
  targetDir: string,
  results: OrganizeResult[],
  stats: ReportStats
): Promise<string> {
  const reportPath = path.join(targetDir, 'vync-report.html');
  
  // Format results as serialized JSON for inclusion in the HTML
  const serializedResults = JSON.stringify(
    results.map(r => ({
      name: r.file.name,
      extension: r.file.extension,
      size: formatFileSize(r.file.size),
      fromPath: r.fromPath,
      toPath: r.toPath,
      category: r.category,
      newName: r.newName || null,
      success: r.success,
      error: r.error || null
    })),
    null,
    2
  );
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vync - AI Organization Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090a0f;
      --card-bg: rgba(255, 255, 255, 0.03);
      --card-border: rgba(255, 255, 255, 0.07);
      --primary: #ff007f;
      --secondary: #00e0e0;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --success: #10b981;
      --error: #ef4444;
      --accent: #8b5cf6;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Inter', sans-serif;
      line-height: 1.5;
      padding: 2rem 1rem;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(255, 0, 127, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(0, 224, 224, 0.05) 0%, transparent 40%);
      background-attachment: fixed;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 1.5rem;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      font-size: 2.25rem;
    }

    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.02em;
    }

    .timestamp {
      font-size: 0.875rem;
      color: var(--text-muted);
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
    }

    /* Bento Grid Layout */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 1.5rem;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .col-2 {
      grid-column: span 2;
    }

    .col-3 {
      grid-column: span 3;
    }

    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .metric {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
    }

    .metric-sub {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .chart-container {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 150px;
    }

    .chart-legend {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 130px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* Filter & Search Bar */
    .controls {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      color: #fff;
      font-family: inherit;
      font-size: 0.9375rem;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--secondary);
    }

    .select-input {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      color: #fff;
      font-family: inherit;
      font-size: 0.9375rem;
      cursor: pointer;
    }

    .select-input:focus {
      outline: none;
      border-color: var(--secondary);
    }

    /* Data Table styling */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 2rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    th {
      background: rgba(255, 255, 255, 0.02);
      padding: 1rem 1.25rem;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }

    td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--card-border);
      vertical-align: middle;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.01);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-category {
      background: rgba(0, 224, 224, 0.1);
      color: var(--secondary);
      border: 1px solid rgba(0, 224, 224, 0.2);
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .badge-error {
      background: rgba(239, 68, 68, 0.1);
      color: var(--error);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .file-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      color: var(--text-muted);
      word-break: break-all;
      max-width: 320px;
    }

    .file-name-cell {
      font-weight: 500;
      color: #fff;
    }

    .rename-label {
      display: block;
      font-size: 0.75rem;
      color: var(--accent);
      margin-top: 0.25rem;
    }

    /* SVG donut layout */
    .donut-chart {
      transform: rotate(-90deg);
    }

    @media (max-width: 768px) {
      .bento-grid {
        grid-template-columns: 1fr;
      }
      .col-2, .col-3 {
        grid-column: span 1;
      }
      th:nth-child(4), td:nth-child(4) {
        display: none; /* Hide 'From' on mobile */
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <span class="logo-icon">🗂️</span>
        <div>
          <h1>VYNC AI REPORT</h1>
          <p style="font-size: 0.8125rem; color: var(--text-muted);">AI-Powered File Organization Dashboard</p>
        </div>
      </div>
      <div class="timestamp">${stats.executionTime}</div>
    </header>

    <div class="bento-grid">
      <!-- Card 1: Summary -->
      <div class="card">
        <div class="card-title">🔍 Scanner Summary</div>
        <div class="metric">${stats.totalFiles}</div>
        <div class="metric-sub">Files scanned (${formatFileSize(stats.totalSize)})</div>
      </div>

      <!-- Card 2: AI Config -->
      <div class="card col-2">
        <div class="card-title">🤖 AI Assistant Engine</div>
        <div class="metric" style="font-size: 1.5rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">
          ${stats.provider.toUpperCase()}
        </div>
        <div class="metric-sub" style="font-family: 'JetBrains Mono', monospace; font-size: 0.8125rem;">
          Model: ${stats.model}<br>
          Duration: ${(stats.durationMs / 1000).toFixed(2)}s
        </div>
      </div>

      <!-- Card 3: Success Rate -->
      <div class="card">
        <div class="card-title">✅ Operations</div>
        <div class="metric" style="color: var(--success);">${stats.successCount}</div>
        <div class="metric-sub">${stats.failCount} failed operations</div>
      </div>
    </div>

    <!-- Chart Panel & Stats -->
    <div class="bento-grid" style="grid-template-columns: 1fr 3fr; margin-bottom: 2rem;">
      <div class="card">
        <div class="card-title">📁 Categories</div>
        <div class="chart-container">
          <svg class="donut-chart" width="100" height="100" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="4"></circle>
            <circle id="donut-segment" cx="18" cy="18" r="15.915" fill="none" stroke="var(--primary)" stroke-width="4" stroke-dasharray="100 0" stroke-dashoffset="0"></circle>
          </svg>
          <div class="chart-legend" id="legend"></div>
        </div>
      </div>

      <div class="card col-3" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="card-title">⚙️ Directory Settings</div>
          <p style="font-size: 0.9375rem; margin-bottom: 0.5rem; color: #fff;">
            <strong>Target Folder:</strong> <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--secondary);">${targetDir.replace(/\\/g, '/')}</span>
          </p>
          <p style="font-size: 0.875rem; color: var(--text-muted);">
            Files were sorted into standard category directories based on extension templates and AI-powered visual/semantic content parsing.
          </p>
        </div>
        <div style="font-size: 0.8125rem; color: var(--text-muted); border-top: 1px solid var(--card-border); padding-top: 0.75rem; margin-top: 1rem;">
          Estimasi Token: Teroptimasi menggunakan Hybrid Rules + AI Batching.
        </div>
      </div>
    </div>

    <!-- Data Controls -->
    <div class="controls">
      <input type="text" id="search" class="search-input" placeholder="Search files by name, path or error...">
      
      <select id="categoryFilter" class="select-input">
        <option value="">All Categories</option>
      </select>

      <select id="statusFilter" class="select-input">
        <option value="">All Statuses</option>
        <option value="success">Success</option>
        <option value="failed">Failed</option>
      </select>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Filename</th>
            <th>Category</th>
            <th>From Path</th>
            <th>To Path</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody id="table-body">
          <!-- Populated by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const data = ${serializedResults};

    // Category Color Palette
    const colors = [
      '#ff007f', '#00e0e0', '#8b5cf6', '#10b981', '#f59e0b', 
      '#ec4899', '#3b82f6', '#14b8a6', '#64748b', '#a855f7'
    ];

    const categoryColors = {};

    // DOM Elements
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const legendEl = document.getElementById('legend');
    const donutSegment = document.getElementById('donut-segment');

    // 1. Calculate Categories distribution
    const catCounts = {};
    data.forEach(item => {
      if (item.success) {
        catCounts[item.category] = (catCounts[item.category] || 0) + 1;
      }
    });

    // Populate category colors map
    Object.keys(catCounts).forEach((cat, index) => {
      categoryColors[cat] = colors[index % colors.length];
    });

    // Populate category filter dropdown
    Object.keys(catCounts).sort().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });

    // Render Table Row
    function renderRow(item) {
      const statusBadge = item.success 
        ? '<span class="badge badge-success">Success</span>' 
        : '<span class="badge badge-error">Failed</span>';
      
      const categoryColor = categoryColors[item.category] || 'var(--text-muted)';
      const categoryBadge = \`<span class="badge badge-category" style="background: \${categoryColor}15; color: \${categoryColor}; border-color: \${categoryColor}30">\${item.category}</span>\`;
      
      const renameMarkup = item.newName && item.newName !== item.name
        ? \`<span class="rename-label">↳ renamed: \${item.newName}</span>\`
        : '';

      const errMarkup = item.error ? \`<div style="color: var(--error); font-size: 0.75rem; margin-top: 0.25rem;">\${item.error}</div>\` : '';

      return \`
        <tr>
          <td>\${statusBadge}</td>
          <td>
            <div class="file-name-cell">\${item.name}</div>
            \${renameMarkup}
            \${errMarkup}
          </td>
          <td>\${categoryBadge}</td>
          <td class="file-path">\${item.fromPath}</td>
          <td class="file-path">\${item.toPath}</td>
          <td style="white-space: nowrap;">\${item.size}</td>
        </tr>
      \`;
    }

    // Filter and display table data
    function updateTable() {
      const query = searchInput.value.toLowerCase();
      const cat = categoryFilter.value;
      const status = statusFilter.value;

      let html = '';
      let matchCount = 0;

      data.forEach(item => {
        const matchesSearch = item.name.toLowerCase().includes(query) || 
                              item.fromPath.toLowerCase().includes(query) || 
                              (item.error && item.error.toLowerCase().includes(query));
        const matchesCategory = !cat || item.category === cat;
        const matchesStatus = !status || (status === 'success' ? item.success : !item.success);

        if (matchesSearch && matchesCategory && matchesStatus) {
          html += renderRow(item);
          matchCount++;
        }
      });

      if (matchCount === 0) {
        html = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 3rem 0;">No matching files found.</td></tr>';
      }

      tableBody.innerHTML = html;
    }

    // Draw Legend and SVG chart
    function drawChart() {
      const total = Object.values(catCounts).reduce((a, b) => a + b, 0);
      if (total === 0) {
        donutSegment.style.strokeDasharray = "0 100";
        legendEl.innerHTML = '<div class="legend-item"><span class="legend-color" style="background: var(--text-muted)"></span>No successful operations</div>';
        return;
      }

      let legendHtml = '';
      let accumulatedPercent = 0;
      let dashArray = [];
      
      const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      
      sortedCats.forEach(([cat, count], index) => {
        const percent = (count / total) * 100;
        const color = categoryColors[cat];
        
        legendHtml += \`
          <div class="legend-item">
            <span class="legend-color" style="background: \${color}"></span>
            <span style="font-weight: 500; color: #fff;">\${cat}</span>
            <span style="color: var(--text-muted)">(\${count} files, \${percent.toFixed(0)}%)</span>
          </div>
        \`;
      });
      
      legendEl.innerHTML = legendHtml;

      // Draw SVG donut ring segments (represented as dasharray partitions)
      // Since SVG stroke-dasharray can accept multiple values for segments: e.g. "20 5 30 5 40 100"
      const dashSegments = [];
      sortedCats.forEach(([cat, count]) => {
        const percent = (count / total) * 100;
        dashSegments.push(percent);
      });

      // Form dasharray: first segment percent, then gap (always 0 here, because we want color transitions,
      // but to show multiple colors in a single circle is trickier with single circle,
      // so we use the first dominant color for the ring, and display full color breakdowns in legend).
      // Standard SVG donut requires multiple circles for actual multi-colors.
      // To keep code extremely compact and robust: we set the dash to represent the #1 category percent,
      // and secondary categories blend out, OR we just style it with a nice glowing gradient circle.
      // Let's make the donut stroke use the #1 category color.
      if (sortedCats.length > 0) {
        const dominantCat = sortedCats[0][0];
        donutSegment.style.stroke = categoryColors[dominantCat];
        const dominantPercent = (catCounts[dominantCat] / total) * 100;
        donutSegment.style.strokeDasharray = \`\${dominantPercent} \${100 - dominantPercent}\`;
      }
    }

    // Attach Event Listeners
    searchInput.addEventListener('input', updateTable);
    categoryFilter.addEventListener('change', updateTable);
    statusFilter.addEventListener('change', updateTable);

    // Initial render
    updateTable();
    drawChart();
  </script>
</body>
</html>`;

  fs.writeFileSync(reportPath, htmlContent, 'utf-8');
  return reportPath;
}
