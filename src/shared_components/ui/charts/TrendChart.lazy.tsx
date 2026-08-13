"use client";

import dynamic from "next/dynamic";

/**
 * Import THIS, not TrendChart directly.
 *
 * recharts drags in d3-scale, d3-shape and friends — roughly 300–400 KB before
 * compression. Loading it eagerly puts that on the first paint of every route that
 * happens to render a chart below the fold. `ssr: false` also sidesteps recharts'
 * width-measuring on the server, which renders at zero width and then reflows.
 *
 * The skeleton reserves the same height the chart will occupy, so nothing below it
 * jumps when the bundle lands.
 */
const TrendChart = dynamic(() => import("./TrendChart"), {
    ssr: false,
    loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-muted" />,
});

export default TrendChart;
