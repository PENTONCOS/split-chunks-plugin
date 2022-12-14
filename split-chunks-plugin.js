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
          // 合并了异步 chunk
          // 调用 chunk 的 isInitial 方法就可以判断是否是入口的 chunk，是的话就跳过。
          if (a.canBeInitial()) continue;
          for (const b of chunks) {
            if (b.canBeInitial()) continue;
            if (b === a) break;

            // 通过 chunkGraph.getChunkSize 的 api 拿到 chunk 大小，
            // 通过 chunkGroup.getIntegratedChunkSize 的 api 拿到合并后的 chunk 大小。
            // 记录下合并的两个 chunk 和合并的收益。
            // 做个排序，把合并收益最大的两个 chunk 合并。
            // 返回 true 来继续循环进行合并，直到收益小于 1.5，那就 return false 停止合并。
            // 当然，这个 1.5 也可以通过 options 传进来。
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

        // integrateChunks可以把后面的 chunk 合并到前面的 chunk 里
        chunkGraph.integrateChunks(pair.b, pair.a);
        // 然后把被合并的那个 chunk
        compilation.chunks.delete(pair.a);
        return true;
      });
    });
  }
}

module.exports = ChunkTestPlugin;