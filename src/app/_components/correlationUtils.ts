// Function to perform Pearson correlation test (moved from server)
export function performCorrelationTest(x: number[], y: number[]): { correlation: number; pValue: number; isSignificant: boolean } {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return { correlation: 0, pValue: 1, isSignificant: false };
  }
  
  const n = x.length;
  if (n < 3) {
    return { correlation: 0, pValue: 1, isSignificant: false };
  }
  
  // Calculate means
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  // Calculate correlation coefficient
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = x[i]! - meanX;
    const yDiff = y[i]! - meanY;
    numerator += xDiff * yDiff;
    sumXSquared += xDiff * xDiff;
    sumYSquared += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  
  // Simple t-test approximation for p-value
  const t = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
  // Rough approximation: p < 0.05 when |t| > 2.0 for reasonable sample sizes
  const pValue = t > 2.0 ? 0.01 : 0.5;
  const isSignificant = pValue < 0.05;
  
  return { correlation, pValue, isSignificant };
}

// Function to calculate linear regression slope (moved from server)
export function calculateSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const denominator = n * sumXX - sumX * sumX;
  return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
}
