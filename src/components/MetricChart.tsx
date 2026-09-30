import { useRef, useEffect } from 'react';

interface MetricChartProps {
  data: { label: string; value: number }[];
  color: string;
  unit: string;
  maxValue?: number;
}

export default function MetricChart({ data, color, unit, maxValue }: MetricChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 10, bottom: 24, left: 38 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    if (data.length < 2) {
      ctx.fillStyle = '#475569';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting data...', w / 2, h / 2);
      return;
    }

    const values = data.map((d) => d.value);
    const max = maxValue ?? Math.max(...values, 1) * 1.1;
    const min = 0;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const val = max - ((max - min) / gridLines) * i;
      ctx.fillText(val.toFixed(0), padding.left - 6, y + 3);
    }

    // X labels (first and last)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText(data[0].label, padding.left, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText(data[data.length - 1].label, padding.left + chartW, h - 8);

    // Line
    const stepX = chartW / (data.length - 1);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartH - (d.value / max) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Fill area under line
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + chartH - (d.value / max) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Last point dot
    const lastX = padding.left + stepX * (data.length - 1);
    const lastY = padding.top + chartH - (data[data.length - 1].value / max) * chartH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [data, color, maxValue, unit]);

  return <canvas ref={canvasRef} className="w-full h-40" />;
}
