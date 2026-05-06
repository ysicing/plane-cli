function stringifyValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function printKeyValue(data) {
  const entries = Object.entries(data);
  if (!entries.length) {
    console.log("(empty)");
    return;
  }

  const width = Math.max(...entries.map(([key]) => key.length));
  for (const [key, value] of entries) {
    console.log(`${key.padEnd(width, " ")}  ${stringifyValue(value)}`);
  }
}

export function printTable(rows, columns) {
  if (!rows.length) {
    console.log("(empty)");
    return;
  }

  const widths = columns.map((column) => {
    const headerWidth = column.label.length;
    const valueWidth = Math.max(...rows.map((row) => stringifyValue(column.get(row)).length));
    return Math.max(headerWidth, valueWidth);
  });

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index], " "))
    .join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    const line = columns
      .map((column, index) => stringifyValue(column.get(row)).padEnd(widths[index], " "))
      .join("  ");
    console.log(line);
  }
}

export function printData(data, options = {}) {
  if (options.format === "json") {
    printJson(data);
    return;
  }

  if (typeof options.render === "function") {
    options.render(data);
    return;
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      console.log("(empty)");
      return;
    }

    if (data.every(isPlainObject)) {
      const objectKeys = [...new Set(data.flatMap((item) => Object.keys(item)))];
      printTable(
        data,
        objectKeys.map((key) => ({
          label: key,
          get: (row) => row[key],
        }))
      );
      return;
    }

    for (const item of data) {
      console.log(`- ${stringifyValue(item)}`);
    }
    return;
  }

  if (isPlainObject(data)) {
    printKeyValue(data);
    return;
  }

  console.log(stringifyValue(data));
}
