"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import { Delaunay } from "d3-delaunay";
import type { WordCorrelationResult } from "~/server/api/routers/yc-companies";
import { calculateSlope } from "./correlationUtils";

interface CorrelationChartProps {
  data: WordCorrelationResult;
  processingTime: number | null;
}

export function CorrelationChart({ data, processingTime }: CorrelationChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous chart

    const margin = { top: 20, right: 30, bottom: 60, left: 90 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(data.decimalYears) as [number, number])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data.ratios)!])
      .range([height, 0]);

    // Line generator
    const line = d3.line<number>()
      .x((d, i) => xScale(data.decimalYears[i] ?? 0))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("fill", "white");

    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format(".1%")))
      .selectAll("text")
      .style("fill", "white");

    // Style axis lines and ticks
    g.selectAll(".domain")
      .style("stroke", "white");
    
    g.selectAll(".tick line")
      .style("stroke", "white");

    // Add axis labels
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 20)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text(`Ratio of YC companies described with "${data.word}"(%)`);

    g.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .style("fill", "white")
      .text("Year");

    // Add the line
    g.append("path")
      .datum(data.ratios)
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add data points
    g.selectAll(".dot")
      .data(data.ratios)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => xScale(data.decimalYears[i] ?? 0))
      .attr("cy", (d) => yScale(d))
      .attr("r", 4)
      .attr("fill", "white")
      .on("mouseover", function(event, d) {
        const i = data.ratios.indexOf(d);
        const tooltip = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("opacity", 0);

        tooltip.transition()
          .duration(200)
          .style("opacity", .9);

        tooltip.html(`${data.batchLabels[i]}<br/>Frequency: ${(d * 100).toFixed(1)}%`)
          .style("left", ((event as MouseEvent).pageX + 10) + "px")
          .style("top", ((event as MouseEvent).pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.selectAll(".tooltip").remove();
      });

    // Add trend line (always show if there's data)
    if (data.ratios.length > 1) {
      const trendLine = d3.line<[number, number]>()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

      const minYear = d3.min(data.decimalYears)!;
      const maxYear = d3.max(data.decimalYears)!;
      const meanX = d3.mean(data.decimalYears)!;
      const meanY = d3.mean(data.ratios)!;
      
      // Calculate slope for trendline
      const slope = data.slope || calculateSlope(data.decimalYears, data.ratios);
      
      const trendData: [number, number][] = [
        [minYear, meanY + slope * (minYear - meanX)],
        [maxYear, meanY + slope * (maxYear - meanX)]
      ];

      g.append("path")
        .datum(trendData)
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", trendLine)
    }


  }, [data, processingTime]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Statistics Legend */}
      <div className="mb-4 text-center">
        <div className="text-white text-sm">
          <div className="flex justify-center space-x-8">
            <span><strong>Correlation:</strong> {data.correlation.toFixed(3)}</span>
            <span><strong>P-Value:</strong> {data.pValue < 0.001 ? '<0.001' : data.pValue.toFixed(3)}</span>
            <span><strong>Max Frequency:</strong> {(data.maxRatio * 100).toFixed(1)}%</span>
            <span><strong>Processing Time:</strong> {processingTime !== null ? `${processingTime.toFixed(1)}ms` : 'N/A'}</span>
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <svg ref={svgRef} width="800" height="400" className="bg-transparent rounded-lg"></svg>
    </div>
  );
}
