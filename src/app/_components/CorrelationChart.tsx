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

    // Stats data to display
    const statsData = [
      { label: "Correlation", value: data.correlation.toFixed(3) },
      { label: "P-Value", value: data.pValue < 0.001 ? '<0.001' : data.pValue.toFixed(3) },
      { label: "Max Frequency", value: `${(data.maxRatio * 100).toFixed(1)}%` },
      { label: "Processing Time", value: processingTime !== null ? `${processingTime.toFixed(1)}ms` : 'N/A' }
    ];

    // Collision radius - single source of truth
    const collisionRadius = 65;

    // Create initial positions for labels (scattered around the chart)
    const initialPositions = [
      [width * 0.2, height * 0.2],
      [width * 0.8, height * 0.2],
      [width * 0.2, height * 0.8],
      [width * 0.8, height * 0.8]
    ];

    // Create data points for line collision detection
    const dataPoints: [number, number][] = data.ratios.map((ratio, i) => [
      xScale(data.decimalYears[i] ?? 0),
      yScale(ratio)
    ]);

    // Create interpolated points along the graph line for better collision detection
    const interpolatedPoints: [number, number][] = [];
    const numInterpolations = 20; // Number of points to interpolate between each data point
    
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];
      if (!p1 || !p2) continue;
      
      for (let j = 0; j <= numInterpolations; j++) {
        const t = j / numInterpolations;
        const x = p1[0] + t * (p2[0] - p1[0]);
        const y = p1[1] + t * (p2[1] - p1[1]);
        interpolatedPoints.push([x, y]);
      }
    }

    // Combine original data points with interpolated points
    const allLinePoints = [...dataPoints, ...interpolatedPoints];

    // Function to check if a point is too close to any line point (including interpolated)
    const isTooCloseToLine = (x: number, y: number, minDistance: number = 40) => {
      for (const linePoint of allLinePoints) {
        const dx = x - linePoint[0];
        const dy = y - linePoint[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
          return true;
        }
      }
      return false;
    };

    // Create force simulation for label positioning
    const simulation = d3.forceSimulation(statsData.map((_, i) => ({
      id: i,
      x: initialPositions[i]?.[0] ?? width * 0.5,
      y: initialPositions[i]?.[1] ?? height * 0.5,
      vx: 0,
      vy: 0,
      fx: null as number | null,
      fy: null as number | null
    })))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(collisionRadius).strength(0.9).iterations(5))
      .force("x", d3.forceX().strength(0.05))
      .force("y", d3.forceY().strength(0.05))
      .force("avoidEdges", () => {
        const margin = 60; // Distance from edges
        simulation.nodes().forEach(node => {
          // Constrain to chart boundaries
          if (node.x < margin) {
            node.vx += (margin - node.x) * 0.1;
            node.x = Math.max(node.x, margin);
          }
          if (node.x > width - margin) {
            node.vx += (width - margin - node.x) * 0.1;
            node.x = Math.min(node.x, width - margin);
          }
          if (node.y < margin) {
            node.vy += (margin - node.y) * 0.1;
            node.y = Math.max(node.y, margin);
          }
          if (node.y > height - margin) {
            node.vy += (height - margin - node.y) * 0.1;
            node.y = Math.min(node.y, height - margin);
          }
        });
      })
      .force("avoidLines", () => {
        simulation.nodes().forEach(node => {
          if (isTooCloseToLine(node.x, node.y, 50)) {
            // Push away from the line with stronger force
            const centerX = width / 2;
            const centerY = height / 2;
            const dx = node.x - centerX;
            const dy = node.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              node.fx = node.x + (dx / distance) * 40; // Increased from 20 to 40
              node.fy = node.y + (dy / distance) * 40; // Increased from 20 to 40
            }
          } else {
            node.fx = null;
            node.fy = null;
          }
        });
      })
      .force("repelLinePoints", () => {
        const lineRepelStrength = 0.8; // Strong repulsion from line points
        const repelDistance = 60; // Distance at which repulsion starts
        
        simulation.nodes().forEach(node => {
          allLinePoints.forEach(linePoint => {
            const dx = node.x - linePoint[0];
            const dy = node.y - linePoint[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < repelDistance && distance > 0) {
              // Strong repulsion force away from line points
              const force = (repelDistance - distance) / repelDistance;
              node.vx += (dx / distance) * force * lineRepelStrength;
              node.vy += (dy / distance) * force * lineRepelStrength;
            }
          });
        });
      })
      .force("repelEdges", () => {
        const edgeRepelStrength = 0.3;
        const edgeMargin = 80;
        
        simulation.nodes().forEach(node => {
          // Repel from left edge
          if (node.x < edgeMargin) {
            node.vx += (edgeMargin - node.x) * edgeRepelStrength;
          }
          // Repel from right edge
          if (node.x > width - edgeMargin) {
            node.vx += (width - edgeMargin - node.x) * edgeRepelStrength;
          }
          // Repel from top edge
          if (node.y < edgeMargin) {
            node.vy += (edgeMargin - node.y) * edgeRepelStrength;
          }
          // Repel from bottom edge
          if (node.y > height - edgeMargin) {
            node.vy += (height - edgeMargin - node.y) * edgeRepelStrength;
          }
        });
      })
      .stop();

    // Run simulation to completion before displaying
    for (let i = 0; i < 500; ++i) simulation.tick();

    // Get final positions and apply final boundary constraints
    const nodes = simulation.nodes();
    
    // Final constraint to ensure labels stay within chart boundaries
    const finalMargin = 50;
    nodes.forEach(node => {
      node.x = Math.max(finalMargin, Math.min(width - finalMargin, node.x));
      node.y = Math.max(finalMargin, Math.min(height - finalMargin, node.y));
    });

    // Add interpolated line points visualization (optional - for debugging)
    g.selectAll(".interpolated-point")
      .data(interpolatedPoints)
      .enter()
      .append("circle")
      .attr("class", "interpolated-point")
      .attr("cx", d => d[0])
      .attr("cy", d => d[1])
      .attr("r", 1)
      .attr("fill", "rgba(255, 255, 255, 0.1)")
      .attr("stroke", "none");

    // Add collision circles visualization (optional - can be removed)
    g.selectAll(".collision-circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "collision-circle")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", collisionRadius) // Same radius as collision force
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.2)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "5,5");

    // Add stats labels and values using final positions
    statsData.forEach((stat, i) => {
      const node = nodes[i];
      if (node && stat) {
        // Label
        g.append("text")
          .attr("x", node.x)
          .attr("y", node.y - 10)
          .attr("text-anchor", "middle")
          .style("fill", "white")
          .style("font-size", "14px")
          .style("font-weight", "500")
          .text(stat.label);

        // Value
        g.append("text")
          .attr("x", node.x)
          .attr("y", node.y + 10)
          .attr("text-anchor", "middle")
          .style("fill", "white")
          .style("font-size", "16px")
          .style("font-weight", "bold")
          .text(stat.value);
      }
    });

  }, [data, processingTime]);

  return (
    <div className="w-full flex justify-center">
      <svg ref={svgRef} width="800" height="400" className="bg-transparent rounded-lg"></svg>
    </div>
  );
}
