class ChunkTestPlugin {
  constructor(options) {
    this.options = options || {};
  }

  apply(compiler) {
    const options = this.options;
    const minSizeReduce = options.minSizeReduce || 1.5;

    compiler.hooks.compilation.tap("ChunkTestPlugin", compilation => {
      compilation.hooks.optimizeChunks.tap("ChunkTestPlugin", chunks => {
        const chunkGraph = compilation.chunkGraph;

        let combinations = [];
        for (const a of chunks) {
          if (a.canBeInitial()) continue;
          for (const b of chunks) {
            if (b.canBeInitial()) continue;
            if (b === a) break;

            const aSize = chunkGraph.getChunkSize(b, {
              chunkOverhead: 0
            });
            const bSize = chunkGraph.getChunkSize(a, {
              chunkOverhead: 0
            });
            const abSize = chunkGraph.getIntegratedChunksSize(b, a, {
              chunkOverhead: 0
            });
            const improvement = (aSize + bSize) / abSize;

            combinations.push({
              a,
              b,
              improvement
            });
          }
        }

        combinations.sort((a, b) => {
          return b.improvement - a.improvement;
        });

        const pair = combinations[0];

        if (!pair) return;
        if (pair.improvement < minSizeReduce) return;

        chunkGraph.integrateChunks(pair.b, pair.a);
        compilation.chunks.delete(pair.a);
        return true;
      });
    });
  }
}

module.exports = ChunkTestPlugin;