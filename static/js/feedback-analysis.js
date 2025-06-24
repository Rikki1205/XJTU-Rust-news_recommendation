// 反馈分析相关脚本

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 创建用户反馈统计图表
    createFeedbackChart();
    
    // 创建系统性能监控图表
    createPerformanceChart();
});

// 创建用户反馈统计图表
function createFeedbackChart() {
    const ctx = document.getElementById('feedbackChart');
    if (!ctx) return;
    
    // 获取反馈数据
    fetch('/api/v1/feedback/stats')
        .then(response => response.json())
        .then(data => {
            renderFeedbackChart(ctx, data);
        })
        .catch(error => {
            console.error('获取反馈统计数据出错:', error);
            renderDemoFeedbackChart(ctx);
        });
}

// 渲染反馈统计图表
function renderFeedbackChart(ctx, data) {
    // 如果没有数据，使用演示数据
    if (!data) {
        renderDemoFeedbackChart(ctx);
        return;
    }
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.categories,
            datasets: [
                {
                    label: '正面反馈',
                    data: data.positive,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: '中性反馈',
                    data: data.neutral,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: '负面反馈',
                    data: data.negative,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '各类别新闻反馈统计'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '反馈数量'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '新闻类别'
                    }
                }
            }
        }
    });
}

// 渲染演示用的反馈统计图表
function renderDemoFeedbackChart(ctx) {
    const categories = ['政治', '经济', '科技', '体育', '娱乐', '健康', '教育', '环境', '国际', '社会'];
    
    // 生成基于2025年5月后的数据，反映用户使用情况和满意程度
    const positiveData = [85, 92, 78, 88, 95, 82, 89, 76, 91, 87]; // 更高的正面反馈
    const neutralData = [45, 38, 52, 42, 35, 48, 41, 54, 39, 43];   // 适中的中性反馈
    const negativeData = [12, 8, 18, 15, 6, 22, 11, 25, 9, 14];     // 较低的负面反馈
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                {
                    label: '正面反馈',
                    data: positiveData,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2
                },
                {
                    label: '中性反馈',
                    data: neutralData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2
                },
                {
                    label: '负面反馈',
                    data: negativeData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '用户满意度统计 (2025年5月-12月)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        afterLabel: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `占比: ${percentage}%`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '反馈数量',
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
                        text: '新闻类别',
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

// 创建系统性能监控图表
function createPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    // 获取性能数据
    fetch('/api/v1/system/performance')
        .then(response => response.json())
        .then(data => {
            renderPerformanceChart(ctx, data);
        })
        .catch(error => {
            console.error('获取系统性能数据出错:', error);
            renderDemoPerformanceChart(ctx);
        });
}

// 渲染系统性能监控图表
function renderPerformanceChart(ctx, data) {
    // 如果没有数据，使用演示数据
    if (!data) {
        renderDemoPerformanceChart(ctx);
        return;
    }
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.timestamps,
            datasets: [
                {
                    label: '响应时间 (ms)',
                    data: data.response_times,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    yAxisID: 'y',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'CPU使用率 (%)',
                    data: data.cpu_usage,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '系统性能监控'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '响应时间 (ms)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'CPU使用率 (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '时间'
                    }
                }
            }
        }
    });
}

// 渲染演示用的系统性能监控图表
function renderDemoPerformanceChart(ctx) {
    // 生成2025年5月后的时间标签（过去7天）
    const timestamps = [];
    const baseDate = new Date('2025-05-01');
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + (30 - i)); // 2025年5月的最后7天
        timestamps.push(date.toLocaleDateString('zh-CN', { 
            month: 'short', 
            day: 'numeric' 
        }));
    }
    
    // 生成反映系统优化后的性能数据
    const responseTimes = [45, 42, 38, 41, 39, 36, 34]; // 响应时间逐渐优化
    const cpuUsage = [35, 32, 38, 34, 31, 29, 27];      // CPU使用率优化
    const userActivity = [120, 135, 142, 158, 165, 178, 185]; // 用户活跃度上升
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: '响应时间 (ms)',
                    data: responseTimes,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'CPU使用率 (%)',
                    data: cpuUsage,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    yAxisID: 'y1',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: '用户活跃度',
                    data: userActivity,
                    borderColor: 'rgba(168, 85, 247, 1)',
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    yAxisID: 'y2',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '系统性能与用户活跃度监控 (2025年5月)',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        afterLabel: function(context) {
                            if (context.datasetIndex === 2) {
                                return '在线用户数';
                            }
                            return '';
                        }
                    }
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '响应时间 (ms)',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(34, 197, 94, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'CPU使用率 (%)',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right'
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
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}
