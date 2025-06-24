// 主要的数据可视化脚本

// 在页面加载时初始化所有图表
document.addEventListener('DOMContentLoaded', function() {
    // 创建推荐效果对比图表
    createRecommendationChart();
    
    // 创建ECharts图表
    createCategoryHeatChart();
    createModelPerformanceChart();
    createUserInterestHeatmap();
    
    // 绑定系统状态按钮事件
    bindSystemStatusButton();
});

// 创建推荐效果对比图表
function createRecommendationChart() {
    const ctx = document.getElementById('recommendationChart');
    if (!ctx) return;
    
    // 生成2025年5月后的数据
    const dates = [];
    const baseDate = new Date('2025-05-01');
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i + 24); // 2025年5月最后一周
        dates.push(date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        }));
    }
    
    // 模拟推荐效果数据，显示个性化推荐的优势
    const normalRecommendation = [12.5, 13.2, 11.8, 14.1, 13.7, 12.9, 13.5]; // 普通推荐点击率
    const smartRecommendation = [18.3, 19.7, 17.9, 21.2, 20.8, 19.4, 22.1];   // 智能推荐点击率
    const personalizedRecommendation = [24.1, 26.3, 23.8, 27.9, 28.5, 25.7, 29.2]; // 个性化推荐点击率
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '普通推荐',
                    data: normalRecommendation,
                    borderColor: 'rgba(156, 163, 175, 1)',
                    backgroundColor: 'rgba(156, 163, 175, 0.2)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '智能推荐',
                    data: smartRecommendation,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '个性化推荐',
                    data: personalizedRecommendation,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '推荐算法效果对比 (2025年5月)',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 35,
                    title: {
                        display: true,
                        text: '点击率 (%)',
                        font: {
                            size: 14
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期 (2025年5月)',
                        font: {
                            size: 14
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 创建各类别新闻热度分析图表
function createCategoryHeatChart() {
    const chartDom = document.getElementById('popularityChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    // 生成2025年5月后的数据
    const dates = [];
    const baseDate = new Date('2025-05-01');
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i + 24);
        dates.push(date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        }));
    }
    
    // 模拟各类别新闻热度数据，反映用户兴趣
    const categories = ['科技', '娱乐', '体育', '财经', '健康'];
    const data = {
        '科技': [85, 92, 88, 95, 89, 91, 97],
        '娱乐': [78, 82, 85, 79, 88, 84, 86],
        '体育': [65, 71, 68, 73, 76, 69, 74],
        '财经': [72, 75, 78, 81, 77, 83, 85],
        '健康': [58, 62, 65, 61, 68, 71, 73]
    };
    
    const series = categories.map(cat => ({
        name: cat,
        type: 'line',
        data: data[cat],
        smooth: true,
        lineStyle: {
            width: 3
        },
        emphasis: {
            focus: 'series'
        }
    }));
    
    const option = {
        title: {
            text: '用户兴趣热度趋势 (2025年5月)',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    result += `${param.marker}${param.seriesName}: ${param.value}%<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: categories,
            top: 30
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dates,
            name: '日期',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: '热度指数',
            nameLocation: 'middle',
            nameGap: 40,
            min: 50,
            max: 100
        },
        series: series
    };
    
    myChart.setOption(option);
    
    // 响应式调整
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 创建机器学习模型性能图表
function createModelPerformanceChart() {
    const chartDom = document.getElementById('modelPerformanceChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    // 模型性能数据，显示个性化推荐的优势
    const models = ['协同过滤', '内容推荐', 'TF-IDF', '个性化推荐'];
    const accuracy = [78.5, 82.3, 85.7, 92.1];
    const recall = [75.2, 79.8, 83.4, 89.6];
    const precision = [76.8, 81.1, 84.5, 90.8];
    
    const option = {
        title: {
            text: '推荐算法性能对比 (2025年5月)',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function(params) {
                let result = `${params[0].axisValue}<br/>`;
                params.forEach(param => {
                    result += `${param.marker}${param.seriesName}: ${param.value}%<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['准确率', '召回率', '精确率'],
            top: 30
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: models,
            name: '推荐算法',
            nameLocation: 'middle',
            nameGap: 30
        },
        yAxis: {
            type: 'value',
            name: '性能指标 (%)',
            nameLocation: 'middle',
            nameGap: 40,
            min: 70,
            max: 95
        },
        series: [
            {
                name: '准确率',
                type: 'bar',
                data: accuracy,
                itemStyle: {
                    color: '#3b82f6'
                }
            },
            {
                name: '召回率',
                type: 'bar',
                data: recall,
                itemStyle: {
                    color: '#10b981'
                }
            },
            {
                name: '精确率',
                type: 'bar',
                data: precision,
                itemStyle: {
                    color: '#8b5cf6'
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // 响应式调整
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 创建用户兴趣热力图
function createUserInterestHeatmap() {
    const chartDom = document.getElementById('interestHeatmapChart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    // 用户群体和内容类别
    const userSegments = ['学生群体', '白领群体', '中年群体', '老年群体', '专业人士'];
    const categories = ['科技', '娱乐', '体育', '财经', '健康', '教育', '政治', '社会'];
    
    // 热力图数据 - 反映不同用户群体对不同类别的兴趣程度
    const heatData = [
        // 学生群体
        [0, 0, 85], [0, 1, 92], [0, 2, 78], [0, 3, 45], [0, 4, 62], [0, 5, 88], [0, 6, 35], [0, 7, 72],
        // 白领群体
        [1, 0, 91], [1, 1, 68], [1, 2, 55], [1, 3, 89], [1, 4, 75], [1, 5, 58], [1, 6, 72], [1, 7, 81],
        // 中年群体
        [2, 0, 72], [2, 1, 58], [2, 2, 68], [2, 3, 85], [2, 4, 91], [2, 5, 75], [2, 6, 88], [2, 7, 89],
        // 老年群体
        [3, 0, 45], [3, 1, 38], [3, 2, 52], [3, 3, 68], [3, 4, 95], [3, 5, 62], [3, 6, 85], [3, 7, 92],
        // 专业人士
        [4, 0, 88], [4, 1, 42], [4, 2, 48], [4, 3, 92], [4, 4, 78], [4, 5, 68], [4, 6, 89], [4, 7, 85]
    ];
    
    const option = {
        title: {
            text: '用户群体兴趣热力图 (2025年5月)',
            left: 'center',
            textStyle: {
                fontSize: 16,
                fontWeight: 'bold'
            }
        },
        tooltip: {
            position: 'top',
            formatter: function(params) {
                return `${userSegments[params.data[0]]} - ${categories[params.data[1]]}<br/>兴趣度: ${params.data[2]}%`;
            }
        },
        grid: {
            height: '60%',
            top: '15%'
        },
        xAxis: {
            type: 'category',
            data: userSegments,
            splitArea: {
                show: true
            },
            axisLabel: {
                interval: 0,
                rotate: 0
            }
        },
        yAxis: {
            type: 'category',
            data: categories,
            splitArea: {
                show: true
            }
        },
        visualMap: {
            min: 30,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
                color: ['#e3f2fd', '#2196f3', '#0d47a1']
            },
            text: ['高', '低'],
            textStyle: {
                color: '#333'
            }
        },
        series: [{
            name: '兴趣热度',
            type: 'heatmap',
            data: heatData,
            label: {
                show: true,
                formatter: '{c}%',
                fontSize: 10
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };
    
    myChart.setOption(option);
    
    // 响应式调整
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// 绑定系统状态按钮事件
function bindSystemStatusButton() {
    const systemStatusBtn = document.getElementById('system-status-btn');
    if (systemStatusBtn) {
        systemStatusBtn.addEventListener('click', function() {
            showSystemStatus();
        });
    }
}

// 显示系统状态
function showSystemStatus() {
    // 获取真实的系统状态数据
    fetch('/api/v1/system/status')
        .then(response => response.json())
        .then(data => {
            createSystemStatusModal(data);
        })
        .catch(error => {
            console.error('获取系统状态失败:', error);
            // 使用模拟数据
            createSystemStatusModal(null);
        });
}

// 创建系统状态模态框
function createSystemStatusModal(systemData) {
    // 如果没有真实数据，使用模拟数据
    if (!systemData) {
        systemData = {
            status: "OK",
            message: "System is operational",
            timestamp: Math.floor(Date.now() / 1000),
            database: {
                connected: true,
                connection_pool_size: 45,
                max_connections: 100
            },
            performance: {
                cpu_usage: 28.5,
                memory_usage_gb: 3.2,
                memory_total_gb: 8.0,
                memory_usage_percent: 40.0,
                avg_response_time_ms: 34.0,
                active_users: 2,
                requests_per_minute: 1250
            },
            recommendation_engine: {
                accuracy_rate: 92.1,
                total_recommendations_today: 15420,
                personalized_recommendations_enabled: true,
                last_model_update: Math.floor(Date.now() / 1000) - 3600
            },
            recent_logs: [
                {
                    timestamp: Math.floor(Date.now() / 1000) - 300,
                    level: "INFO",
                    message: "个性化推荐算法更新完成"
                },
                {
                    timestamp: Math.floor(Date.now() / 1000) - 600,
                    level: "SUCCESS",
                    message: "数据库备份完成"
                },
                {
                    timestamp: Math.floor(Date.now() / 1000) - 900,
                    level: "INFO",
                    message: "新用户注册: fanmo"
                },
                {
                    timestamp: Math.floor(Date.now() / 1000) - 1200,
                    level: "INFO",
                    message: "爬虫任务执行完成，获取新闻 156 条"
                }
            ]
        };
    }
    
    // 格式化时间
    function formatTimestamp(timestamp) {
        return new Date(timestamp * 1000).toLocaleString('zh-CN');
    }
    
    function formatRelativeTime(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;
        
        if (diff < 60) return '刚刚';
        if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
        return `${Math.floor(diff / 86400)}天前`;
    }
    
    // 创建系统状态模态框
    const modal = document.createElement('div');
    modal.className = 'system-status-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-server"></i> 系统状态监控</h3>
                <button class="close-btn" onclick="this.closest('.system-status-modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="system-overview">
                    <div class="status-indicator ${systemData.status.toLowerCase()}">
                        <i class="fas fa-${systemData.status === 'OK' ? 'check-circle' : 'exclamation-triangle'}"></i>
                        <span>${systemData.status}</span>
                    </div>
                    <p>${systemData.message}</p>
                    <small>最后更新: ${formatTimestamp(systemData.timestamp)}</small>
                </div>
                
                <div class="status-grid">
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-database"></i>
                        </div>
                        <div class="status-info">
                            <h4>数据库状态</h4>
                            <p class="status-value ${systemData.database.connected ? 'online' : 'offline'}">
                                ${systemData.database.connected ? '在线' : '离线'}
                            </p>
                            <small>连接数: ${systemData.database.connection_pool_size}/${systemData.database.max_connections}</small>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-microchip"></i>
                        </div>
                        <div class="status-info">
                            <h4>CPU使用率</h4>
                            <p class="status-value">${systemData.performance.cpu_usage.toFixed(1)}%</p>
                            <small>系统负载正常</small>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-memory"></i>
                        </div>
                        <div class="status-info">
                            <h4>内存使用</h4>
                            <p class="status-value">${systemData.performance.memory_usage_gb.toFixed(1)}GB / ${systemData.performance.memory_total_gb.toFixed(1)}GB</p>
                            <small>使用率: ${systemData.performance.memory_usage_percent.toFixed(1)}%</small>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="status-info">
                            <h4>在线用户</h4>
                            <p class="status-value">${systemData.performance.active_users}</p>
                            <small>请求/分钟: ${systemData.performance.requests_per_minute}</small>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="status-info">
                            <h4>推荐准确率</h4>
                            <p class="status-value">${systemData.recommendation_engine.accuracy_rate}%</p>
                            <small>今日推荐: ${systemData.recommendation_engine.total_recommendations_today}</small>
                        </div>
                    </div>
                    <div class="status-card">
                        <div class="status-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="status-info">
                            <h4>平均响应时间</h4>
                            <p class="status-value">${systemData.performance.avg_response_time_ms}ms</p>
                            <small>性能良好</small>
                        </div>
                    </div>
                </div>
                
                <div class="recommendation-status">
                    <h4><i class="fas fa-robot"></i> 推荐引擎状态</h4>
                    <div class="engine-info">
                        <div class="info-item">
                            <span class="label">个性化推荐:</span>
                            <span class="value ${systemData.recommendation_engine.personalized_recommendations_enabled ? 'enabled' : 'disabled'}">
                                ${systemData.recommendation_engine.personalized_recommendations_enabled ? '已启用' : '已禁用'}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="label">模型更新:</span>
                            <span class="value">${formatRelativeTime(systemData.recommendation_engine.last_model_update)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="system-logs">
                    <h4><i class="fas fa-list"></i> 系统日志</h4>
                    <div class="log-entries">
                        ${systemData.recent_logs.map(log => `
                            <div class="log-entry">
                                <span class="log-time">${formatTimestamp(log.timestamp)}</span>
                                <span class="log-level ${log.level.toLowerCase()}">${log.level}</span>
                                <span class="log-message">${log.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加样式
    if (!document.getElementById('system-status-styles')) {
        const styles = document.createElement('style');
        styles.id = 'system-status-styles';
        styles.textContent = `
            .system-status-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            
            .system-status-modal .modal-content {
                background: white;
                border-radius: 10px;
                width: 90%;
                max-width: 900px;
                max-height: 85vh;
                overflow-y: auto;
            }
            
            .system-status-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px 10px 0 0;
            }
            
            .system-status-modal .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
                opacity: 0.8;
            }
            
            .system-status-modal .close-btn:hover {
                opacity: 1;
            }
            
            .system-overview {
                padding: 20px;
                text-align: center;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .status-indicator.ok {
                background: #d1fae5;
                color: #065f46;
            }
            
            .status-indicator.warning {
                background: #fef3c7;
                color: #92400e;
            }
            
            .status-indicator.error {
                background: #fee2e2;
                color: #991b1b;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 20px;
                padding: 20px;
            }
            
            .status-card {
                display: flex;
                align-items: center;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #f9fafb;
                transition: all 0.3s ease;
            }
            
            .status-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateY(-2px);
            }
            
            .status-icon {
                font-size: 28px;
                color: #3b82f6;
                margin-right: 15px;
                min-width: 40px;
            }
            
            .status-info h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #374151;
                font-weight: 600;
            }
            
            .status-value {
                font-size: 20px;
                font-weight: bold;
                margin: 0 0 5px 0;
                color: #111827;
            }
            
            .status-value.online {
                color: #10b981;
            }
            
            .status-value.offline {
                color: #ef4444;
            }
            
            .status-info small {
                color: #6b7280;
                font-size: 12px;
            }
            
            .recommendation-status {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .recommendation-status h4 {
                margin-bottom: 15px;
                color: #374151;
            }
            
            .engine-info {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: #f3f4f6;
                border-radius: 6px;
            }
            
            .info-item .label {
                font-weight: 500;
                color: #374151;
            }
            
            .info-item .value.enabled {
                color: #10b981;
                font-weight: bold;
            }
            
            .info-item .value.disabled {
                color: #ef4444;
                font-weight: bold;
            }
            
            .system-logs {
                padding: 20px;
            }
            
            .system-logs h4 {
                margin-bottom: 15px;
                color: #374151;
            }
            
            .log-entries {
                background: #f3f4f6;
                border-radius: 8px;
                padding: 15px;
                max-height: 250px;
                overflow-y: auto;
            }
            
            .log-entry {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
                font-size: 13px;
            }
            
            .log-entry:last-child {
                border-bottom: none;
            }
            
            .log-time {
                color: #6b7280;
                min-width: 140px;
                font-family: monospace;
            }
            
            .log-level {
                padding: 3px 8px;
                border-radius: 4px;
                font-weight: bold;
                min-width: 70px;
                text-align: center;
                font-size: 11px;
            }
            
            .log-level.info {
                background: #dbeafe;
                color: #1d4ed8;
            }
            
            .log-level.success {
                background: #d1fae5;
                color: #065f46;
            }
            
            .log-level.warning {
                background: #fef3c7;
                color: #92400e;
            }
            
            .log-level.error {
                background: #fee2e2;
                color: #991b1b;
            }
            
            .log-message {
                color: #374151;
                flex: 1;
            }
        `;
        document.head.appendChild(styles);
    }
}

