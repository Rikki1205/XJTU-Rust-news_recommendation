use plotters::backend::BitMapBackend;
use plotters::prelude::*;
use std::collections::HashMap;

/// 绘制模型性能指标柱状图。
///
/// # Arguments
///
/// * `metrics` - HashMap<String, f64>，键为指标名称，值为指标数值
/// * `save_path` - 输出图片保存路径
pub fn plot_metrics(metrics: &HashMap<String, f64>, save_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let root = BitMapBackend::new(save_path, (800, 600)).into_drawing_area();
    root.fill(&WHITE)?;

    let names: Vec<_> = metrics.keys().cloned().collect();
    let values: Vec<_> = metrics.values().cloned().collect();
    let max_value = values.iter().cloned().fold(0.0, f64::max);

    let mut chart = ChartBuilder::on(&root)
        // 使用字体名称和大小的元组来生成字体
        .caption("Model Performance Metrics", ("sans-serif", 24).into_font())
        .margin(20)
        .x_label_area_size(50)
        .y_label_area_size(60)
        .build_cartesian_2d(0..names.len(), 0.0..(max_value * 1.2))?;

    chart
        .configure_mesh()
        .disable_mesh()
        .x_labels(names.len())
        .x_label_formatter(&|idx| names[*idx].clone())
        .x_desc("Metric")
        .y_desc("Value")
        .draw()?;

    for (i, &v) in values.iter().enumerate() {
        chart.draw_series(std::iter::once(
            Rectangle::new(
                [(i, 0.0), (i + 1, v)],
                BLUE.filled(),
            ),
        ))?;
    }

    Ok(())
}

/// 绘制 ROC 曲线。
///
/// # Arguments
///
/// * `y_true` - 实际标签向量
/// * `y_score` - 预测概率向量
/// * `save_path` - 输出图片保存路径
pub fn plot_roc_curve(
    y_true: &[u32],
    y_score: &[f64],
    save_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: 这里示例 FPR/TPR 数据，建议使用正确的方法计算
    let fpr = vec![0.0, 0.5, 1.0];
    let tpr = vec![0.0, 0.8, 1.0];

    let root = BitMapBackend::new(save_path, (800, 600)).into_drawing_area();
    root.fill(&WHITE)?;

    let mut chart = ChartBuilder::on(&root)
        // 使用字体名称和大小的元组来生成字体
        .caption("ROC Curve", ("sans-serif", 24).into_font())
        .margin(20)
        .x_label_area_size(50)
        .y_label_area_size(60)
        .build_cartesian_2d(0.0..1.0, 0.0..1.0)?;

    chart.configure_mesh().draw()?;

    chart.draw_series(LineSeries::new(
        fpr.iter().cloned().zip(tpr.iter().cloned()),
        &RED,
    ))?;
    chart.draw_series(LineSeries::new(vec![(0.0, 0.0), (1.0, 1.0)], &BLACK))?;

    Ok(())
}
