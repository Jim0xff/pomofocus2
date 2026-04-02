export function percentile(values, percentileRank) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const clampedPercentile = Math.min(Math.max(percentileRank, 0), 100);
  const index = Math.ceil((clampedPercentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(index, 0)];
}

export function stageTargets(stages) {
  const timeline = [];
  let previousTarget = 0;

  for (const stage of stages) {
    for (let second = 1; second <= stage.durationSeconds; second += 1) {
      const progress = second / stage.durationSeconds;
      const target = Math.round(
        previousTarget + ((stage.targetConcurrency - previousTarget) * progress),
      );

      timeline.push({
        second: timeline.length + 1,
        targetConcurrency: target,
      });
    }

    previousTarget = stage.targetConcurrency;
  }

  return timeline;
}

export function summarizeScenario({
  name,
  targetConcurrency,
  stages,
  startedRequests,
  completedRequests,
  successCount,
  unexpected5xxCount,
  errorCount,
  latenciesMs,
  statusCounts,
  dbRowsBefore = null,
  dbRowsAfter = null,
}) {
  const p95LatencyMs = percentile(latenciesMs, 95);
  const unexpected5xxRate = completedRequests === 0
    ? 0
    : Number((unexpected5xxCount / completedRequests).toFixed(4));

  const summary = {
    name,
    targetConcurrency,
    stages,
    startedRequests,
    completedRequests,
    successCount,
    unexpected5xxCount,
    unexpected5xxRate,
    errorCount,
    p95LatencyMs,
    statusCounts,
  };

  if (dbRowsBefore !== null && dbRowsAfter !== null) {
    summary.dbRowsBefore = dbRowsBefore;
    summary.dbRowsAfter = dbRowsAfter;
    summary.dbInsertedRows = dbRowsAfter - dbRowsBefore;
    summary.dbInsertMatchesSuccessCount = summary.dbInsertedRows === successCount;
  }

  return summary;
}
