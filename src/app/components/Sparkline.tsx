"use client";

import { useRef, useEffect } from "react";

interface SparklineProps {
    data: Array<{ time: string; mid: number }>;
    color: string;
    width: number;
    height: number;
}

// Canvas API can't use CSS variables — resolve to hex
function resolveColor(color: string): string {
    const map: Record<string, string> = {
        "var(--gain)": "#00c853",
        "var(--loss)": "#ff1744",
        "var(--neutral)": "#9494a8",
        "var(--brand)": "#8b4fc0",
    };
    return map[color] || color;
}

export default function Sparkline({ data, color, width, height }: SparklineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const hex = resolveColor(color);

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const values = data.map((d) => d.mid);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const padding = 2;

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = hex;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        values.forEach((v, i) => {
            const x = (i / (values.length - 1)) * (width - padding * 2) + padding;
            const y = height - padding - ((v - min) / range) * (height - padding * 2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw area gradient
        ctx.lineTo(width - padding, height);
        ctx.lineTo(padding, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, hex + "30");
        gradient.addColorStop(1, hex + "05");
        ctx.fillStyle = gradient;
        ctx.fill();
    }, [data, color, width, height]);

    if (data.length < 2) {
        return <div style={{ width, height }} />;
    }

    return (
        <canvas
            ref={canvasRef}
            style={{ width, height, display: "block" }}
        />
    );
}
