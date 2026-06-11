const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.hasOwn(value, key);

const readVector = (value: unknown, label: string): number[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed embedding response: ${label} is not an array.`);
  }

  const vector = value.map((item, index) => {
    if (!isFiniteNumber(item)) {
      throw new Error(
        `Malformed embedding response: ${label}[${index}] is not a finite number.`
      );
    }
    return item;
  });

  return vector;
};

const readMatrix = (value: unknown, label: string): number[][] => {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed embedding response: ${label} is not an array.`);
  }

  return value.map((item, index) => readVector(item, `${label}[${index}]`));
};

const readObjectEmbeddingArray = (
  value: unknown,
  label: string
): number[][] => {
  if (!Array.isArray(value)) {
    throw new Error(`Malformed embedding response: ${label} is not an array.`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `Malformed embedding response: ${label}[${index}] is not an object.`
      );
    }

    if (!hasOwn(item, "embedding")) {
      throw new Error(
        `Malformed embedding response: ${label}[${index}].embedding is missing.`
      );
    }

    return readVector(item.embedding, `${label}[${index}].embedding`);
  });
};

const readDataEmbedding = (
  item: Record<string, unknown>,
  label: string
): number[] => {
  if (hasOwn(item, "embedding")) {
    return readVector(item.embedding, `${label}.embedding`);
  }

  const embeddings = item.embeddings;
  if (isRecord(embeddings) && hasOwn(embeddings, "float")) {
    return readVector(embeddings.float, `${label}.embeddings.float`);
  }

  throw new Error(
    `Malformed embedding response: ${label} does not contain an embedding vector.`
  );
};

const sortDataEntries = (
  entries: Array<{ item: Record<string, unknown>; originalIndex: number }>
): Array<{ item: Record<string, unknown>; originalIndex: number }> => {
  const indexedEntries = entries
    .filter((entry) => isFiniteNumber(entry.item.index))
    .sort((a, b) => {
      const indexA = a.item.index as number;
      const indexB = b.item.index as number;
      return indexA - indexB || a.originalIndex - b.originalIndex;
    });
  let indexedEntryIndex = 0;

  return entries.map((entry) => {
    if (!isFiniteNumber(entry.item.index)) {
      return entry;
    }

    const sortedEntry = indexedEntries[indexedEntryIndex];
    indexedEntryIndex += 1;
    return sortedEntry ?? entry;
  });
};

export const extractEmbeddingsFromResponse = (json: unknown): number[][] => {
  if (!isRecord(json)) {
    return [];
  }

  const { embeddings } = json;
  if (Array.isArray(embeddings)) {
    if (embeddings.length === 0) {
      return [];
    }

    if (Array.isArray(embeddings[0])) {
      return readMatrix(embeddings, "embeddings");
    }

    if (isRecord(embeddings[0]) && hasOwn(embeddings[0], "embedding")) {
      return readObjectEmbeddingArray(embeddings, "embeddings");
    }

    throw new Error(
      "Malformed embedding response: embeddings array has an unsupported item shape."
    );
  }

  if (isRecord(embeddings) && hasOwn(embeddings, "float")) {
    return readMatrix(embeddings.float, "embeddings.float");
  }

  const { data } = json;
  if (Array.isArray(data)) {
    const entries = data.map((item, originalIndex) => {
      if (!isRecord(item)) {
        throw new Error(
          `Malformed embedding response: data[${originalIndex}] is not an object.`
        );
      }

      return { item, originalIndex };
    });

    return sortDataEntries(entries).map(({ item, originalIndex }) =>
      readDataEmbedding(item, `data[${originalIndex}]`)
    );
  }

  return [];
};

export const validateEmbeddingDimensions = (
  embeddings: number[][],
  expectedDimensions: number,
  label = "Embedding response"
): void => {
  if (!Number.isFinite(expectedDimensions) || expectedDimensions <= 0) {
    return;
  }

  for (let index = 0; index < embeddings.length; index += 1) {
    const embedding = embeddings[index];
    if (!embedding) {
      continue;
    }

    if (embedding.length !== expectedDimensions) {
      throw new Error(
        `${label} dimension mismatch at index ${index}: expected ${expectedDimensions}, received ${embedding.length}.`
      );
    }
  }
};
